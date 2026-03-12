const API_URL = 'http://localhost:8080/api';

// Lấy tất cả bảng giá
export const getAllPrices = async () => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices`);
        return await res.json();
    } catch (error) {
        console.error('Get prices error:', error);
        return [];
    }
};

// Thêm giá mới
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

// Cập nhật giá
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

// Xóa giá
export const deletePrice = async (id) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices/${id}`, { method: 'DELETE' });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// Lấy giá hiện hành theo sản phẩm
export const getCurrentPrice = async (product) => {
    try {
        const res = await fetch(`${API_URL}/fuel-prices/current/${encodeURIComponent(product)}`);
        return await res.json();
    } catch (error) {
        return null;
    }
};
