import API_BASE from './apiConfig';
const API_URL = API_BASE;
import axios from 'axios';



/**
 * LÆ°u lá»™ trÃ¬nh má»›i
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
 * Láº¥y lá»™ trÃ¬nh theo ID
 */
export const getRouteById = async (id) => {
    try {
        const res = await axios.get(`${API_URL}/${id}`);
        return res.data;
    } catch (e) {
        console.error('Lá»—i khi láº¥y lá»™ trÃ¬nh:', e);
        return null;
    }
};

/**
 * Láº¥y danh sÃ¡ch lá»™ trÃ¬nh cá»§a ngÆ°á»i dÃ¹ng
 */
export const getUserRoutes = async (userId) => {
    try {
        const res = await axios.get(`${API_URL}/user/${userId}`);
        return res.data;
    } catch (e) {
        console.error('Lá»—i khi láº¥y danh sÃ¡ch lá»™ trÃ¬nh:', e);
        return [];
    }
};

/**
 * XÃ³a lá»™ trÃ¬nh
 */
export const deleteRoute = async (id) => {
    try {
        const res = await axios.delete(`${API_URL}/${id}`);
        return res.data;
    } catch (e) {
        return { success: false, message: e.response?.data?.message || e.message };
    }
};

