const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'shipments';

// Danh sách kho Nhà nước (nguồn hàng)
const GOV_WAREHOUSES = [
    'Kho Đình Vũ - Hải Phòng',
    'Kho B12 - Quảng Ninh',
    'Kho Vân Phong - Khánh Hòa',
    'Kho Nhà Bè - TP.HCM',
    'Kho Thị Vải - Bà Rịa',
    'Kho K131 - Hải Phòng'
];

// Lấy tất cả chuyến hàng
const getAllShipments = async () => {
    const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Tạo chuyến hàng mới
const createShipment = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        status: data.status || 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật chuyến hàng
const updateShipment = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
};

// Xóa chuyến hàng
const deleteShipment = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

// Lấy chuyến theo tài xế
const getShipmentsByDriver = async (driverId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
    getAllShipments, createShipment, updateShipment, deleteShipment,
    getShipmentsByDriver, GOV_WAREHOUSES
};
