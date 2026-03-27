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
        const axios = require('axios');
        const cheerio = require('cheerio');

        // Lấy mã HTML từ WebGia
        const response = await axios.get('https://webgia.com/gia-xang-dau/petrolimex/', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Bóc tách bảng giá vùng 1 bằng cheerio
        const prices = [];
        
        $('table.table tbody tr').each((i, row) => {
            const nameRaw = $(row).find('th').text().trim();
            const priceRaw = $(row).find('td').eq(0).text().trim().replace(/[^0-9]/g, '');
            
            if (nameRaw && priceRaw) {
                const price = parseInt(priceRaw, 10);
                if (price > 10000) { // Lọc rác
                    let mappedName = null;
                    for (const [key, val] of Object.entries(PRODUCT_MAP)) {
                        if (nameRaw.includes(key) || nameRaw.toLowerCase().includes(key.toLowerCase())) {
                            mappedName = val;
                            break;
                        }
                    }
                    
                    if (mappedName && !prices.find(p => p.product === mappedName)) {
                        prices.push({
                            product: mappedName,
                            retailPrice: price,
                            wholesalePrice: Math.round(price * 0.975), // Giá buôn giảm 2.5%
                            source: 'webgia'
                        });
                    }
                }
            }
        });

        if (prices.length >= 2) {
            console.log(`✅ Fetched ${prices.length} fuel prices from WebGia`);
            return prices; // Trả về nếu bóc tách thành công
        }

        // Nếu regex không tìm thấy (Cấu trúc web thay đổi), fallback đến giá cứng gần đúng
        throw new Error('Không phân tích (Parse) được Data Bảng giá');
    } catch (err) {
        console.log(`⚠️ Crawl failed: ${err.message}. Using updated fallback prices.`);
        // Fallback hiện tại (Tương đối update 2024-2025)
        const FALLBACK_PRICES = [
            { product: 'Xăng RON 95-III', retailPrice: 24810, wholesalePrice: Math.round(24810 * 0.975) },
            { product: 'Xăng E5 RON 92', retailPrice: 23620, wholesalePrice: Math.round(23620 * 0.975) },
            { product: 'Dầu Diesel 0.05S', retailPrice: 21540, wholesalePrice: Math.round(21540 * 0.975) },
            { product: 'Dầu Diesel 0.001S', retailPrice: 22100, wholesalePrice: Math.round(22100 * 0.975) },
            { product: 'Dầu KO', retailPrice: 21450, wholesalePrice: Math.round(21450 * 0.975) },
            { product: 'Dầu Mazut', retailPrice: 16900, wholesalePrice: Math.round(16900 * 0.975) }
        ];
        return FALLBACK_PRICES.map(p => ({ ...p, source: 'fallback' }));
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
 * Bắt đầu scheduled sync — 15h00 Thứ Năm hàng tuần
 */
const cron = require('node-cron');
let syncTask = null;

const startScheduledSync = () => {
    // Sync ngay 1 lần khi khởi động để lấy data mới nhất
    syncPricesToFirestore();

    // Lên lịch: 15h00 phút, thứ Năm (4) hàng tuần
    syncTask = cron.schedule('0 15 * * 4', async () => {
        console.log('⏰ Bắt đầu đồng bộ giá xăng dầu (Lịch định kỳ: 15h Thứ Năm)');
        await syncPricesToFirestore();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    console.log('⏰ Scheduled fuel price sync: 15:00 every Thursday');
};

const stopScheduledSync = () => {
    if (syncTask) {
        syncTask.stop();
        syncTask = null;
    }
};

module.exports = {
    fetchLatestPrices,
    syncPricesToFirestore,
    getSyncMeta,
    startScheduledSync,
    stopScheduledSync
};
