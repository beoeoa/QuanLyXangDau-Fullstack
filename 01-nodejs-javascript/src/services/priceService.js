const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'fuel_prices';

// Lấy tất cả bảng giá
const getAllPrices = async () => {
    const snapshot = await db.collection(COLLECTION).orderBy('effectiveDate', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Thêm giá mới
const addPrice = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật giá
const updatePrice = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
};

// Xóa giá
const deletePrice = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

// Lấy giá hiện hành theo loại sản phẩm (giá mới nhất với effectiveDate <= hôm nay)
const getCurrentPrice = async (product) => {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db.collection(COLLECTION)
        .where('product', '==', product)
        .where('effectiveDate', '<=', today)
        .orderBy('effectiveDate', 'desc')
        .limit(1)
        .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

module.exports = { getAllPrices, addPrice, updatePrice, deletePrice, getCurrentPrice };
