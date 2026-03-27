import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Láº¥y táº¥t cáº£ báº£ng giÃ¡
export const getAllPrices = async () => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices`);
        return await res.json();
    } catch (error) {
        console.error('Get prices error:', error);
        return [];
    }
};

// ThÃªm giÃ¡ má»›i
export const addPrice = async (data) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// Cáº­p nháº­t giÃ¡
export const updatePrice = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// XÃ³a giÃ¡
export const deletePrice = async (id) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices/${id}`, { method: 'DELETE' });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// Láº¥y giÃ¡ hiá»‡n hÃ nh theo sáº£n pháº©m
export const getCurrentPrice = async (product) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices/current/${encodeURIComponent(product)}`);
        return await res.json();
    } catch (error) {
        return null;
    }
};

