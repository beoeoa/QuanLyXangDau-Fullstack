const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'driver_schedules';

// Lấy tất cả lịch trình
const getAllSchedules = async () => {
    const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Tạo lịch trình mới
const createSchedule = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật lịch trình
const updateSchedule = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
};

// Xóa lịch trình
const deleteSchedule = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

// Lấy lịch trình theo tài xế
const getSchedulesByDriver = async (driverId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
    getAllSchedules, createSchedule, updateSchedule, deleteSchedule,
    getSchedulesByDriver
};
