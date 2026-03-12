const API_URL = 'http://localhost:8080/api';

export const getAllDriverSchedules = async () => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi lấy danh sách lịch trình:", error);
        return [];
    }
};

export const getDriverSchedulesByDriver = async (driverId) => {
    try {
        const response = await fetch(`${API_URL}/driver-schedules/driver/${driverId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi lấy lịch trình của tài xế:", error);
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
        console.error("Lỗi khi tạo lịch trình:", error);
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
        console.error("Lỗi khi cập nhật lịch trình:", error);
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
        console.error("Lỗi khi xóa lịch trình:", error);
        return { success: false, message: error.message };
    }
};

export const getAutomatedDriverTripStats = async (driverId) => {
    try {
        const response = await fetch(`${API_URL}/delivery-orders/driver-stats/${driverId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi lấy thống kê chuyến đi tự động:", error);
        return [];
    }
};

export const getAllAutomatedDriverTripStats = async () => {
    try {
        const response = await fetch(`${API_URL}/delivery-orders/all-stats`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi lấy tất cả thống kê chuyến đi tự động:", error);
        return [];
    }
};
