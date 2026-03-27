import API_BASE from './apiConfig';
const API_URL = API_BASE;
// ThÃªm chi phÃ­ dá»c Ä‘Æ°á»ng
export const addDriverExpense = async (data) => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};

// Láº¥y chi phÃ­ theo tÃ i xáº¿
export const getExpensesByDriver = async (driverId) => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses/driver/${driverId}`);
        return await res.json();
    } catch (e) { return []; }
};

// Láº¥y táº¥t cáº£ chi phÃ­ (Káº¿ toÃ¡n)
export const getAllExpenses = async () => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses`);
        return await res.json();
    } catch (e) { return []; }
};

// Duyá»‡t chi phÃ­
export const updateExpenseStatus = async (id, status) => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};

