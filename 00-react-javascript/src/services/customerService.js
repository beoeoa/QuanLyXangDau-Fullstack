import API_BASE from './apiConfig';
const API_URL = API_BASE;
// ThÃªm khÃ¡ch hÃ ng
export const addCustomer = async (data) => {
    try {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Add customer error:', error);
        return { success: false, message: error.message };
    }
};

// Láº¥y táº¥t cáº£ khÃ¡ch hÃ ng
export const getAllCustomers = async () => {
    try {
        const res = await fetch(`${API_URL}/customers`);
        return await res.json();
    } catch (error) {
        console.error('Get customers error:', error);
        return [];
    }
};

// Cáº­p nháº­t khÃ¡ch hÃ ng
export const updateCustomer = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Update customer error:', error);
        return { success: false, message: error.message };
    }
};

// XÃ³a khÃ¡ch hÃ ng
export const deleteCustomer = async (id) => {
    try {
        const res = await fetch(`${API_URL}/customers/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('Delete customer error:', error);
        return { success: false, message: error.message };
    }
};

