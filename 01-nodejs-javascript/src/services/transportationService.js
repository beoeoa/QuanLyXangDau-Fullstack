const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const VEHICLES_COLLECTION = 'vehicles';
const DELIVERY_ORDERS_COLLECTION = 'deliveryOrders';

// === VEHICLES ===
const getAllVehicles = async () => {
    const snapshot = await db.collection(VEHICLES_COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const addVehicle = async (vehicleData) => {
    const docRef = await db.collection(VEHICLES_COLLECTION).add({
        ...vehicleData,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

// === DELIVERY ORDERS ===

// Tạo lệnh điều động
const createDeliveryOrder = async (orderData) => {
    const docRef = await db.collection(DELIVERY_ORDERS_COLLECTION).add({
        ...orderData,
        status: 'pending',
        statusHistory: [{ status: 'pending', timestamp: new Date() }],
        documents: {}, // seal, deliveryReceipt, lossReport, exportSlip
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

// Lấy đơn theo tài xế
const getOrdersByDriver = async (driverId) => {
    const snapshot = await db.collection(DELIVERY_ORDERS_COLLECTION)
        .where('assignedDriverId', '==', driverId)
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
    });
};

// Lấy TẤT CẢ đơn (Admin / Sale xem)
const getAllDeliveryOrders = async () => {
    const snapshot = await db.collection(DELIVERY_ORDERS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
    });
};

// Cập nhật trạng thái 5 bước + lưu history
const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    const docRef = db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId);
    const doc = await docRef.get();
    const currentHistory = doc.data()?.statusHistory || [];

    await docRef.update({
        status: newStatus,
        ...extraData,
        statusHistory: [...currentHistory, { status: newStatus, timestamp: new Date() }],
        updatedAt: new Date()
    });
    return { success: true };
};

// Lấy 1 đơn theo ID
const getOrderById = async (orderId) => {
    const doc = await db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return { id: doc.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt, updatedAt: data.updatedAt?.toDate?.() || data.updatedAt };
};

// Xóa lệnh điều động
const deleteDeliveryOrder = async (orderId) => {
    const docRef = db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId);
    await docRef.delete();
    return { success: true };
};


// Cập nhật chứng từ (ảnh seal, biên bản, phiếu...)
const updateOrderDocuments = async (orderId, documents) => {
    const docRef = db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId);
    await docRef.update({
        documents,
        updatedAt: new Date()
    });
    return { success: true };
};

// Cập nhật mã seal
const updateOrderSeal = async (orderId, sealCode) => {
    const docRef = db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId);
    await docRef.update({
        sealCode,
        updatedAt: new Date()
    });
    return { success: true };
};

// ===========================
// DRIVER STATS / TRIPS
// ===========================
const getDriverTripStats = async (driverId) => {
    // Chỉ lấy những đơn "completed"
    const snapshot = await db.collection(DELIVERY_ORDERS_COLLECTION)
        .where('assignedDriverId', '==', driverId)
        .where('status', '==', 'completed')
        .get();
        
    const trips = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
    });
    return trips;
};

const getAllDriverTripStats = async () => {
    const snapshot = await db.collection(DELIVERY_ORDERS_COLLECTION)
        .where('status', '==', 'completed')
        .get();
        
    const trips = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
    });
    return trips;
};

// Cập nhật tọa độ GPS (Real-time Tracking)
const updateOrderLocation = async (orderId, lat, lng) => {
    const coords = { lat: Number(lat), lng: Number(lng), timestamp: new Date() };
    await db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId).update({
        currentLocation: { lat: Number(lat), lng: Number(lng) },
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
        locationHistory: FieldValue.arrayUnion(coords)
    });
    return { success: true };
};

// Kế toán phê duyệt (Maker-Checker)
const updateOrderApproval = async (orderId, approvalStatus, approvalNote = '') => {
    await db.collection(DELIVERY_ORDERS_COLLECTION).doc(orderId).update({
        approvalStatus,
        approvalNote,
        approvedAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true };
};

module.exports = {
    getAllVehicles,
    addVehicle,
    createDeliveryOrder,
    getOrdersByDriver,
    getOrderById,
    getAllDeliveryOrders,
    updateOrderStatus,
    updateOrderDocuments,
    updateOrderSeal,
    updateOrderLocation,
    getDriverTripStats,
    getAllDriverTripStats,
    updateOrderApproval,
    deleteDeliveryOrder
};
