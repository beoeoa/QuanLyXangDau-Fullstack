import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Láº¥y táº¥t cáº£ sáº£n pháº©m
export const getAllProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        return await res.json();
    } catch (error) {
        console.error('Get products error:', error);
        return [];
    }
};

// ThÃªm sáº£n pháº©m má»›i
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

// Láº¥y sáº£n pháº©m theo ID
export const getProductById = async (id) => {
    try {
        const products = await getAllProducts();
        return products.find(p => p.id === id) || null;
    } catch (error) {
        console.error('Get product error:', error);
        return null;
    }
};

// Cáº­p nháº­t sáº£n pháº©m
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

// XÃ³a sáº£n pháº©m
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

// Cáº­p nháº­t tá»“n kho (gá»i giÃ¡n tiáº¿p qua transaction)
export const updateStock = async (id, quantityChange) => {
    // HÃ m nÃ y giá» Ä‘Æ°á»£c xá»­ lÃ½ bá»Ÿi backend khi táº¡o transaction
    // Giá»¯ láº¡i Ä‘á»ƒ khÃ´ng pháº£i sá»­a code component
    console.warn('updateStock nÃªn Ä‘Æ°á»£c gá»i qua createTransaction thay vÃ¬ trá»±c tiáº¿p');
    return { success: true };
};

