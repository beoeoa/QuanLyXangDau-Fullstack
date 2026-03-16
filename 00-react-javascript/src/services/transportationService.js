const API_URL = 'http://localhost:8080/api';

// ============================================================
// VEHICLE MANAGEMENT
// ============================================================

export const getAllVehicles = async () => {
    try {
        const res = await fetch(`${API_URL}/vehicles`);
        return await res.json();
    } catch (error) {
        console.error('Error getting vehicles:', error);
        return [];
    }
};

export const addVehicle = async (vehicleData) => {
    try {
        const res = await fetch(`${API_URL}/vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vehicleData)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// ============================================================
// DELIVERY ORDER MANAGEMENT
// ============================================================

export const createDeliveryOrder = async (orderData) => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getOrdersByDriver = async (driverId) => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders/driver/${driverId}`);
        return await res.json();
    } catch (error) {
        console.error('Error getting driver orders:', error);
        return [];
    }
};

export const getAllDeliveryOrders = async () => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders`);
        return await res.json();
    } catch (error) {
        console.error('Error getting all orders:', error);
        return [];
    }
};

export const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, ...extraData })
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateOrderDocuments = async (orderId, documents) => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders/${orderId}/documents`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents })
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateOrderSeal = async (orderId, sealCode) => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders/${orderId}/seal`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sealCode })
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateOrderApproval = async (orderId, approvalStatus, approvalNote = '') => {
    try {
        const res = await fetch(`${API_URL}/delivery-orders/${orderId}/approval`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvalStatus, approvalNote })
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export default {
    getAllVehicles,
    addVehicle,
    createDeliveryOrder,
    getOrdersByDriver,
    getAllDeliveryOrders,
    updateOrderStatus,
    updateOrderDocuments,
    updateOrderSeal,
    updateOrderApproval
};
