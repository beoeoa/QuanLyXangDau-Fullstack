const API_URL = 'http://localhost:8080/api';

// Tạo SOS
export const createSOSReport = async (data) => {
    try {
        const res = await fetch(`${API_URL}/sos-reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};

// Lấy SOS theo tài xế
export const getSOSByDriver = async (driverId) => {
    try {
        const res = await fetch(`${API_URL}/sos-reports/driver/${driverId}`);
        return await res.json();
    } catch (e) { return []; }
};

// Lấy tất cả SOS
export const getAllSOSReports = async () => {
    try {
        const res = await fetch(`${API_URL}/sos-reports`);
        return await res.json();
    } catch (e) { return []; }
};

// Cập nhật SOS
export const updateSOSStatus = async (id, status) => {
    try {
        const res = await fetch(`${API_URL}/sos-reports/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
};
