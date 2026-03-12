const API_URL = 'http://localhost:8080/api';

// Thêm nhà cung cấp
export const addSupplier = async (data) => {
    try {
        const res = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Add supplier error:', error);
        return { success: false, message: error.message };
    }
};

// Lấy tất cả nhà cung cấp
export const getAllSuppliers = async () => {
    try {
        const res = await fetch(`${API_URL}/suppliers`);
        return await res.json();
    } catch (error) {
        console.error('Get suppliers error:', error);
        return [];
    }
};

// Cập nhật nhà cung cấp
export const updateSupplier = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Update supplier error:', error);
        return { success: false, message: error.message };
    }
};

// Xóa nhà cung cấp
export const deleteSupplier = async (id) => {
    try {
        const res = await fetch(`${API_URL}/suppliers/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('Delete supplier error:', error);
        return { success: false, message: error.message };
    }
};
