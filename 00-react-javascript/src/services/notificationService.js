const API_URL = 'http://localhost:8080/api';

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
