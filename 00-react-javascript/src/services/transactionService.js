const API_URL = 'http://localhost:8080/api';

// Tạo phiếu nhập/xuất
export const createTransaction = async (transactionData) => {
    try {
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        return await res.json();
    } catch (error) {
        console.error('Create transaction error:', error);
        return { success: false, message: error.message };
    }
};

// Lấy tất cả giao dịch
export const getAllTransactions = async () => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        return await res.json();
    } catch (error) {
        console.error('Get transactions error:', error);
        return [];
    }
};

// Lấy giao dịch theo loại
export const getTransactionsByType = async (type) => {
    try {
        const res = await fetch(`${API_URL}/transactions?type=${type}`);
        return await res.json();
    } catch (error) {
        console.error('Get transactions by type error:', error);
        return [];
    }
};

// Xóa giao dịch
export const deleteTransaction = async (id) => {
    try {
        const res = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('Delete transaction error:', error);
        return { success: false, message: error.message };
    }
};
