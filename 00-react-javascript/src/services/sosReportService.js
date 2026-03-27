import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Táº¡o SOS
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

// Láº¥y SOS theo tÃ i xáº¿
export const getSOSByDriver = async (driverId) => {
    try {
        const res = await fetch(`${API_URL}/sos-reports/driver/${driverId}`);
        return await res.json();
    } catch (e) { return []; }
};

// Láº¥y táº¥t cáº£ SOS
export const getAllSOSReports = async () => {
    try {
        const res = await fetch(`${API_URL}/sos-reports`);
        return await res.json();
    } catch (e) { return []; }
};

// Cáº­p nháº­t SOS
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

