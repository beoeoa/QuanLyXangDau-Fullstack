import API_BASE from './apiConfig';
const API_URL = API_BASE;
// ThÃªm nhÃ  cung cáº¥p
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

// Láº¥y táº¥t cáº£ nhÃ  cung cáº¥p
export const getAllSuppliers = async () => {
    try {
        const res = await fetch(`${API_URL}/suppliers`);
        return await res.json();
    } catch (error) {
        console.error('Get suppliers error:', error);
        return [];
    }
};

// Cáº­p nháº­t nhÃ  cung cáº¥p
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

// XÃ³a nhÃ  cung cáº¥p
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

