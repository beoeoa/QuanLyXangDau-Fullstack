const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'notifications';

// Tạo thông báo
const createNotification = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Lấy thông báo theo userId
const getNotificationsByUser = async (userId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Lấy thông báo theo role (broadcast)
const getNotificationsByRole = async (role) => {
    const snapshot = await db.collection(COLLECTION)
        .where('targetRole', '==', role)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Đánh dấu đã đọc
const markAsRead = async (id) => {
    await db.collection(COLLECTION).doc(id).update({ isRead: true });
    return { success: true };
};

// Đánh dấu tất cả đã đọc
const markAllAsRead = async (userId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
    return { success: true };
};

module.exports = { createNotification, getNotificationsByUser, getNotificationsByRole, markAsRead, markAllAsRead };
