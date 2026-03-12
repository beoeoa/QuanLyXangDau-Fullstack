/**
 * Bộ Công Thương công bố giá xăng dầu ~ 2 tuần/lần (15h ngày điều chỉnh).
 * Module này tự động lấy giá mới nhất từ nguồn công khai và đồng bộ vào Firestore.
 * 
 * Nguồn: Sử dụng API công khai từ tygia.com/json/fuel.json
 * Fallback: Dữ liệu mẫu theo giá Bộ Công Thương mới nhất
 */

const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'fuel_prices';
const SYNC_META = 'fuel_price_sync_meta';

// Map tên sản phẩm chuẩn hóa
const PRODUCT_MAP = {
    'E5 RON 92': 'Xăng E5 RON 92',
    'RON 95-III': 'Xăng RON 95-III',
    'RON 95': 'Xăng RON 95-III',
    'DO 0.05S': 'Dầu Diesel 0.05S',
    'DO 0.001S': 'Dầu Diesel 0.001S',
    'Dầu hỏa': 'Dầu KO',
    'KO': 'Dầu KO',
    'Mazut': 'Dầu Mazut',
};

// Giá cơ sở mặc định — theo Bộ Công Thương kỳ điều hành 22h ngày 11/3/2026
const DEFAULT_PRICES = [
    { product: 'Xăng E5 RON 92', retailPrice: 22950, wholesalePrice: 22400 },
    { product: 'Xăng RON 95-III', retailPrice: 25240, wholesalePrice: 24700 },
    { product: 'Dầu Diesel 0.05S', retailPrice: 18050, wholesalePrice: 17550 },
    { product: 'Dầu Diesel 0.001S', retailPrice: 18310, wholesalePrice: 17810 },
    { product: 'Dầu KO', retailPrice: 17860, wholesalePrice: 17360 },
    { product: 'Dầu Mazut', retailPrice: 15600, wholesalePrice: 15100 },
];

/**
 * Fetch giá xăng dầu từ API công khai
 */
const fetchLatestPrices = async () => {
    try {
        // Thử API tygia.com (public, miễn phí)
        const response = await fetch('https://tygia.com/json/fuel.json', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data && Array.isArray(data.data || data)) {
            const items = data.data || data;
            const prices = [];

            items.forEach(item => {
                const name = item.name || item.ten || '';
                const price = Number(item.price || item.gia || item.retail_price || 0);

                // Tìm tên chuẩn hóa
                let mappedName = null;
                for (const [key, val] of Object.entries(PRODUCT_MAP)) {
                    if (name.includes(key) || name.toLowerCase().includes(key.toLowerCase())) {
                        mappedName = val;
                        break;
                    }
                }

                if (mappedName && price > 0) {
                    prices.push({
                        product: mappedName,
                        retailPrice: price,
                        wholesalePrice: Math.round(price * 0.975), // Giá buôn ~97.5% giá lẻ
                        source: 'api'
                    });
                }
            });

            if (prices.length >= 2) {
                console.log(`✅ Fetched ${prices.length} fuel prices from API`);
                return prices;
            }
        }

        throw new Error('Không parse được data từ API');
    } catch (err) {
        console.log(`⚠️ API fetch failed: ${err.message}. Using fallback prices.`);
        return DEFAULT_PRICES.map(p => ({ ...p, source: 'fallback' }));
    }
};

/**
 * Đồng bộ giá vào Firestore
 */
const syncPricesToFirestore = async () => {
    try {
        const prices = await fetchLatestPrices();
        const today = new Date().toISOString().split('T')[0];
        const batch = db.batch();

        for (const p of prices) {
            // Kiểm tra xem đã có giá cho sản phẩm này với ngày hôm nay chưa
            const existing = await db.collection(COLLECTION)
                .where('product', '==', p.product)
                .where('effectiveDate', '==', today)
                .where('isGovPrice', '==', true)
                .limit(1)
                .get();

            if (existing.empty) {
                // Thêm mới
                const newRef = db.collection(COLLECTION).doc();
                batch.set(newRef, {
                    product: p.product,
                    retailPrice: p.retailPrice,
                    wholesalePrice: p.wholesalePrice,
                    discount: 0,
                    effectiveDate: today,
                    isGovPrice: true,
                    source: p.source,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Cập nhật giá nếu khác
                const doc = existing.docs[0];
                if (doc.data().retailPrice !== p.retailPrice) {
                    batch.update(doc.ref, {
                        retailPrice: p.retailPrice,
                        wholesalePrice: p.wholesalePrice,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        // Lưu metadata sync
        batch.set(db.collection(SYNC_META).doc('latest'), {
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            priceCount: prices.length,
            source: prices[0]?.source || 'unknown'
        });

        await batch.commit();
        console.log(`✅ Synced ${prices.length} fuel prices to Firestore (${today})`);
        return { success: true, count: prices.length, date: today, source: prices[0]?.source };
    } catch (err) {
        console.error('❌ Sync fuel prices failed:', err.message);
        return { success: false, message: err.message };
    }
};

/**
 * Lấy thông tin sync gần nhất
 */
const getSyncMeta = async () => {
    try {
        const doc = await db.collection(SYNC_META).doc('latest').get();
        if (!doc.exists) return null;
        return doc.data();
    } catch (err) {
        return null;
    }
};

/**
 * Bắt đầu scheduled sync — chạy mỗi 2 giờ
 */
let syncInterval = null;
const startScheduledSync = () => {
    // Sync ngay khi khởi động
    syncPricesToFirestore();

    // Sau đó sync mỗi 2 giờ (7200000ms)
    syncInterval = setInterval(() => {
        syncPricesToFirestore();
    }, 2 * 60 * 60 * 1000);

    console.log('⏰ Scheduled fuel price sync: every 2 hours');
};

const stopScheduledSync = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};

module.exports = {
    fetchLatestPrices,
    syncPricesToFirestore,
    getSyncMeta,
    startScheduledSync,
    stopScheduledSync
};
