import API_BASE from './apiConfig';
const API_URL = API_BASE;
export const createNotification = async (data) => {
    try {
        const res = await fetch(`${API_URL}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getNotificationsByUser = async (userId) => {
    try {
        const res = await fetch(`${API_URL}/notifications/user/${userId}`);
        return await res.json();
    } catch (error) {
        return [];
    }
};

export const getNotificationsByRole = async (role) => {
    try {
        const res = await fetch(`${API_URL}/notifications/role/${role}`);
        return await res.json();
    } catch (error) {
        return [];
    }
};

export const markAsRead = async (id) => {
    try {
        const res = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
        return await res.json();
    } catch (error) {
        return { success: false };
    }
};

export const markAllAsRead = async (userId) => {
    try {
        const res = await fetch(`${API_URL}/notifications/read-all/${userId}`, { method: 'PUT' });
        return await res.json();
    } catch (error) {
        return { success: false };
    }
};

// HÃ m tiá»‡n Ã­ch gá»­i thÃ´ng bÃ¡o
export const sendAppNotification = async ({ userId, title, message, type = 'system', isRead = false }) => {
    try {
        await createNotification({ userId, title, message, type, isRead, createdAt: new Date().toISOString() });
    } catch (e) {
        console.error('Lá»—i khi gá»­i thÃ´ng bÃ¡o:', e);
    }
};

// Gá»­i thÃ´ng bÃ¡o cho toÃ n bá»™ User thuá»™c 1 Role
export const notifyRole = async (roleName, { title, message, type = 'system' }) => {
    try {
        const res = await fetch(`${API_URL}/users`);
        if (res.ok) {
            const users = await res.json();
            const targets = users.filter(u => u.role === roleName && u.id);
            for (const target of targets) {
                await sendAppNotification({ userId: target.id, title, message, type });
            }
        }
    } catch (e) {
        console.error(`Lá»—i gá»­i thÃ´ng bÃ¡o cho ${roleName}:`, e);
    }
};

