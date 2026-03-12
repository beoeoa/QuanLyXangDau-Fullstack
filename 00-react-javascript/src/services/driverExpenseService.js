const API_URL = 'http://localhost:8080/api';

// Thêm chi phí dọc đường
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

// Lấy chi phí theo tài xế
export const getExpensesByDriver = async (driverId) => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses/driver/${driverId}`);
        return await res.json();
    } catch (e) { return []; }
};

// Lấy tất cả chi phí (Kế toán)
export const getAllExpenses = async () => {
    try {
        const res = await fetch(`${API_URL}/driver-expenses`);
        return await res.json();
    } catch (e) { return []; }
};

// Duyệt chi phí
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
