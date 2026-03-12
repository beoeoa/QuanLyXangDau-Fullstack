const API_URL = 'http://localhost:8080/api';

export const createOrder = async (data) => {
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};

export const getAllOrders = async () => {
    try {
        const res = await fetch(`${API_URL}/orders`);
        return await res.json();
    } catch (e) { return []; }
};

export const updateOrder = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};

export const deleteOrder = async (id) => {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};
