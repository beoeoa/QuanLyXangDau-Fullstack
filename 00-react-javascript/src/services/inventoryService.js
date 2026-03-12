const API_URL = 'http://localhost:8080/api';

// Lấy tất cả sản phẩm
export const getAllProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        return await res.json();
    } catch (error) {
        console.error('Get products error:', error);
        return [];
    }
};

// Thêm sản phẩm mới
export const addProduct = async (productData) => {
    try {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        return await res.json();
    } catch (error) {
        console.error('Add product error:', error);
        return { success: false, message: error.message };
    }
};

// Lấy sản phẩm theo ID
export const getProductById = async (id) => {
    try {
        const products = await getAllProducts();
        return products.find(p => p.id === id) || null;
    } catch (error) {
        console.error('Get product error:', error);
        return null;
    }
};

// Cập nhật sản phẩm
export const updateProduct = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Update product error:', error);
        return { success: false, message: error.message };
    }
};

// Xóa sản phẩm
export const deleteProduct = async (id) => {
    try {
        const res = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('Delete product error:', error);
        return { success: false, message: error.message };
    }
};

// Cập nhật tồn kho (gọi gián tiếp qua transaction)
export const updateStock = async (id, quantityChange) => {
    // Hàm này giờ được xử lý bởi backend khi tạo transaction
    // Giữ lại để không phải sửa code component
    console.warn('updateStock nên được gọi qua createTransaction thay vì trực tiếp');
    return { success: true };
};
