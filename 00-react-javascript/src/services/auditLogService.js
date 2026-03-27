import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Láº¥y danh sÃ¡ch audit logs
export const getAuditLogs = async (limit = 100) => {
    try {
        const res = await fetch(`${API_URL}/audit-logs?limit=${limit}`);
        return await res.json();
    } catch (error) {
        console.error('Get audit logs error:', error);
        return [];
    }
};

// Ghi audit log má»›i
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

// HÃ m tiá»‡n Ã­ch: tá»± Ä‘á»™ng láº¥y user tá»« localStorage
export const logAudit = async (action, details) => {
    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userName = user ? (user.name || user.email || 'NgÆ°á»i dÃ¹ng') : 'Há»‡ thá»‘ng';

        await createAuditLog({
            action,
            details,
            userName,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('Lá»—i khi ghi Audit Log:', e);
    }
};

export default { getAuditLogs, createAuditLog, logAudit };

