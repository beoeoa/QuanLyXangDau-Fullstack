const API_URL = 'http://localhost:8080/api';

// Lấy danh sách audit logs
export const getAuditLogs = async (limit = 100) => {
    try {
        const res = await fetch(`${API_URL}/audit-logs?limit=${limit}`);
        return await res.json();
    } catch (error) {
        console.error('Get audit logs error:', error);
        return [];
    }
};

// Ghi audit log mới
export const createAuditLog = async (logData) => {
    try {
        const res = await fetch(`${API_URL}/audit-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        return await res.json();
    } catch (error) {
        console.error('Create audit log error:', error);
        return { success: false, message: error.message };
    }
};

// Hàm tiện ích: tự động lấy user từ localStorage
export const logAudit = async (action, details) => {
    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userName = user ? (user.name || user.email || 'Người dùng') : 'Hệ thống';

        await createAuditLog({
            action,
            details,
            userName,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('Lỗi khi ghi Audit Log:', e);
    }
};

export default { getAuditLogs, createAuditLog, logAudit };
