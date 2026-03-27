import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Táº¡o phiáº¿u nháº­p/xuáº¥t
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

// Láº¥y táº¥t cáº£ giao dá»‹ch
export const getAllTransactions = async () => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        return await res.json();
    } catch (error) {
        console.error('Get transactions error:', error);
        return [];
    }
};

// Láº¥y giao dá»‹ch theo loáº¡i
export const getTransactionsByType = async (type) => {
    try {
        const res = await fetch(`${API_URL}/transactions?type=${type}`);
        return await res.json();
    } catch (error) {
        console.error('Get transactions by type error:', error);
        return [];
    }
};

// XÃ³a giao dá»‹ch
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

