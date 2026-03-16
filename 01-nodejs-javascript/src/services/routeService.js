const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'routes';

/**
 * Lưu thông tin đường đi mới
 */
const saveRoute = async (routeData) => {
    const docRef = await db.collection(COLLECTION).add({
        ...routeData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

/**
 * Lấy thông tin đường đi theo ID (để chia sẻ)
 */
const getRouteById = async (id) => {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
};

/**
 * Lấy danh sách đường đi của một người dùng
 */
const getRoutesByUserId = async (userId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Xóa đường đi
 */
const deleteRoute = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

module.exports = {
    saveRoute,
    getRouteById,
    getRoutesByUserId,
    deleteRoute
};
