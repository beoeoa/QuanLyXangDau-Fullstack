import API_BASE from './apiConfig';
const API_URL = API_BASE;
export const getAllDriverSchedules = async () => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi láº¥y danh sÃ¡ch lá»‹ch trÃ¬nh:", error);
        return [];
    }
};

export const getDriverSchedulesByDriver = async (driverId) => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules/driver/${driverId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi láº¥y lá»‹ch trÃ¬nh cá»§a tÃ i xáº¿:", error);
        return [];
    }
};

export const createDriverSchedule = async (scheduleData) => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData),
        });
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi táº¡o lá»‹ch trÃ¬nh:", error);
        return { success: false, message: error.message };
    }
};

export const updateDriverSchedule = async (id, scheduleData) => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData),
        });
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi cáº­p nháº­t lá»‹ch trÃ¬nh:", error);
        return { success: false, message: error.message };
    }
};

export const deleteDriverSchedule = async (id) => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules/${id}`, {
            method: 'DELETE',
        });
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi xÃ³a lá»‹ch trÃ¬nh:", error);
        return { success: false, message: error.message };
    }
};

export const getAutomatedDriverTripStats = async (driverId) => {
    try {
        const response = await fetch(`${API_URL}/delivery-orders/driver-stats/${driverId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi láº¥y thá»‘ng kÃª chuyáº¿n Ä‘i tá»± Ä‘á»™ng:", error);
        return [];
    }
};

export const getAllAutomatedDriverTripStats = async () => {
    try {
        const response = await fetch(`${API_URL}/delivery-orders/all-stats`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lá»—i khi láº¥y táº¥t cáº£ thá»‘ng kÃª chuyáº¿n Ä‘i tá»± Ä‘á»™ng:", error);
        return [];
    }
};

