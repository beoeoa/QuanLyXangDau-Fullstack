const API_URL = 'http://localhost:8080/api';

// Thêm khách hàng
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

// Lấy tất cả khách hàng
export const getAllCustomers = async () => {
    try {
        const res = await fetch(`${API_URL}/customers`);
        return await res.json();
    } catch (error) {
        console.error('Get customers error:', error);
        return [];
    }
};

// Cập nhật khách hàng
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

// Xóa khách hàng
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
