const API_URL = 'http://localhost:8080/api';

export const getAllContracts = async () => {
    try {
        const res = await fetch(`${API_URL}/contracts`);
        return await res.json();
    } catch (error) {
        console.error('Get contracts error:', error);
        return [];
    }
};

export const addContract = async (data) => {
    try {
        const res = await fetch(`${API_URL}/contracts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateContract = async (id, data) => {
    try {
        const res = await fetch(`${API_URL}/contracts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const deleteContract = async (id) => {
    try {
        const res = await fetch(`${API_URL}/contracts/${id}`, { method: 'DELETE' });
        return await res.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
};
