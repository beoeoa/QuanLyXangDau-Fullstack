const { db } = require('../config/firebase');

const ORDERS_COLLECTION = 'orders';

// Tạo đơn hàng
const createOrder = async (orderData) => {
    const docRef = await db.collection(ORDERS_COLLECTION).add({
        ...orderData,
        status: 'new', // new → confirmed → dispatched → delivering → completed → invoiced
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

// Lấy tất cả đơn hàng
const getAllOrders = async () => {
    const snapshot = await db.collection(ORDERS_COLLECTION)
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

// Cập nhật đơn hàng
const updateOrder = async (orderId, updateData) => {
    await db.collection(ORDERS_COLLECTION).doc(orderId).update({
        ...updateData,
        updatedAt: new Date()
    });
    return { success: true };
};

// Xóa đơn hàng
const deleteOrder = async (orderId) => {
    await db.collection(ORDERS_COLLECTION).doc(orderId).delete();
    return { success: true };
};

module.exports = { createOrder, getAllOrders, updateOrder, deleteOrder };
