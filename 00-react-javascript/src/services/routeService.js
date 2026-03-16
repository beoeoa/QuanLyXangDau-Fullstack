import axios from 'axios';

const API_URL = 'http://localhost:8080/api/routes';

/**
 * Lưu lộ trình mới
 */
export const saveRoute = async (routeData) => {
    try {
        const res = await axios.post(API_URL, routeData);
        return res.data;
    } catch (e) {
        return { success: false, message: e.response?.data?.message || e.message };
    }
};

/**
 * Lấy lộ trình theo ID
 */
export const getRouteById = async (id) => {
    try {
        const res = await axios.get(`${API_URL}/${id}`);
        return res.data;
    } catch (e) {
        console.error('Lỗi khi lấy lộ trình:', e);
        return null;
    }
};

/**
 * Lấy danh sách lộ trình của người dùng
 */
export const getUserRoutes = async (userId) => {
    try {
        const res = await axios.get(`${API_URL}/user/${userId}`);
        return res.data;
    } catch (e) {
        console.error('Lỗi khi lấy danh sách lộ trình:', e);
        return [];
    }
};

/**
 * Xóa lộ trình
 */
export const deleteRoute = async (id) => {
    try {
        const res = await axios.delete(`${API_URL}/${id}`);
        return res.data;
    } catch (e) {
        return { success: false, message: e.response?.data?.message || e.message };
    }
};
