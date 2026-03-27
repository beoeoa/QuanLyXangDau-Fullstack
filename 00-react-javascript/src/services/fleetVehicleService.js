import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Láº¥y táº¥t cáº£ xe bá»“n (fleet)
export const getAllFleetVehicles = async () => {
    try {
        const res = await fetch(`${API_URL}/fleet-vehicles`);
        return await res.json();
    } catch (error) {
        console.error('Get fleet vehicles error:', error);
        return [];
    }
};

// ThÃªm xe bá»“n
export const addFleetVehicle = async (vehicleData) => {
    try {
        const res = await fetch(`${API_URL}/fleet-vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vehicleData)
        });
        return await res.json();
    } catch (error) {
        console.error('Add fleet vehicle error:', error);
        return { success: false, message: error.message };
    }
};

// Cáº­p nháº­t xe bá»“n
export const updateFleetVehicle = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/fleet-vehicles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Update fleet vehicle error:', error);
        return { success: false, message: error.message };
    }
};

// XÃ³a xe bá»“n
export const deleteFleetVehicle = async (id) => {
    try {
        const res = await fetch(`${API_URL}/fleet-vehicles/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('Delete fleet vehicle error:', error);
        return { success: false, message: error.message };
    }
};

export default { getAllFleetVehicles, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle };

