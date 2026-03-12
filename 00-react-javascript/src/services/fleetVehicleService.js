const API_URL = 'http://localhost:8080/api';

// Lấy tất cả xe bồn (fleet)
export const getAllFleetVehicles = async () => {
    try {
        const res = await fetch(`${API_URL}/fleet-vehicles`);
        return await res.json();
    } catch (error) {
        console.error('Get fleet vehicles error:', error);
        return [];
    }
};

// Thêm xe bồn
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

// Cập nhật xe bồn
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

// Xóa xe bồn
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
