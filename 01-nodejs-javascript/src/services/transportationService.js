const { db } = require('../config/firebase');

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

module.exports = {
    getAllVehicles,
    addVehicle,
    createDeliveryOrder,
    getOrdersByDriver,
    getAllDeliveryOrders,
    updateOrderStatus,
    updateOrderDocuments,
    updateOrderSeal,
    getDriverTripStats,
    getAllDriverTripStats
};
