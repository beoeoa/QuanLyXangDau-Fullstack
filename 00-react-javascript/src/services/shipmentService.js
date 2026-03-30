import API_BASE from './apiConfig';
const API_URL = API_BASE;

export const getAllShipments = async () => {
    try {
        const res = await fetch(`${API_URL}/shipments`);
        return await res.json();
    } catch (error) { return []; }
};

export const createShipment = async (data) => {
    try {
        const res = await fetch(`${API_URL}/shipments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) { return { success: false, message: error.message }; }
};

export const updateShipment = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/shipments/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) { return { success: false, message: error.message }; }
};

export const deleteShipment = async (id) => {
    try {
        const res = await fetch(`${API_URL}/shipments/${id}`, { method: 'DELETE' });
        return await res.json();
    } catch (error) { return { success: false, message: error.message }; }
};

export const getGovWarehouses = async () => {
    try {
        const res = await fetch(`${API_URL}/shipments/warehouses`);
        return await res.json();
    } catch (error) { return []; }
};

export const getAIDispatchSuggestions = async (quantity, destination) => {
    try {
        const res = await fetch(`${API_URL}/shipments/ai-dispatch?quantity=${quantity}&destination=${encodeURIComponent(destination)}`);
        return await res.json();
    } catch (error) { return []; }
};
