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

export default { getAuditLogs, createAuditLog };
