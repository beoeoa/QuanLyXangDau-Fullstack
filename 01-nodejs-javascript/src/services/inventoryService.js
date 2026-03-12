const { db } = require('../config/firebase');

const COLLECTION = 'inventory';

// Thêm sản phẩm
const addProduct = async (productData) => {
    const docRef = await db.collection(COLLECTION).add({
        ...productData,
        quantity: Number(productData.quantity) || 0,
        importPrice: Number(productData.importPrice) || 0,
        exportPrice: Number(productData.exportPrice) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

// Lấy tất cả sản phẩm
const getAllProducts = async () => {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Lấy sản phẩm theo ID
const getProductById = async (id) => {
    const docRef = db.collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() };
};

// Cập nhật sản phẩm
const updateProduct = async (id, data) => {
    const docRef = db.collection(COLLECTION).doc(id);
    await docRef.update({
        ...data,
        quantity: Number(data.quantity) || 0,
        importPrice: Number(data.importPrice) || 0,
        exportPrice: Number(data.exportPrice) || 0,
        updatedAt: new Date()
    });
    return { success: true };
};

// Xóa sản phẩm
const deleteProduct = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

// Cập nhật tồn kho
const updateStock = async (id, quantityChange) => {
    const product = await getProductById(id);
    if (!product) return { success: false, message: 'Sản phẩm không tồn tại' };

    const newQuantity = (product.quantity || 0) + quantityChange;
    if (newQuantity < 0) return { success: false, message: 'Số lượng tồn không đủ' };

    await db.collection(COLLECTION).doc(id).update({
        quantity: newQuantity,
        updatedAt: new Date()
    });
    return { success: true, newQuantity };
};

module.exports = {
    addProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    updateStock
};
