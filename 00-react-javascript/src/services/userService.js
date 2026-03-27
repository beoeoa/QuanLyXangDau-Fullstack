import API_BASE from './apiConfig';
const API_URL = API_BASE;
// Láº¥y táº¥t cáº£ users
export const getAllUsers = async () => {
  try {
    const res = await fetch(`${API_URL}/users`);
    return await res.json();
  } catch (error) {
    console.error('Get all users error:', error);
    return [];
  }
};

// Láº¥y user theo ID
export const getUserById = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/users/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
};

// Láº¥y user theo email
export const getUserByEmail = async (email) => {
  try {
    const res = await fetch(`${API_URL}/users/email?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// ÄÄƒng kÃ½ user (lÆ°u vÃ o Firestore qua backend)
export const registerUser = async (userData) => {
  try {
    const res = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, message: error.message || 'Lá»—i Ä‘Äƒng kÃ½' };
  }
};

// Cáº­p nháº­t user
export const updateUser = async (userId, updateData) => {
  try {
    const res = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    return await res.json();
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, message: error.message };
  }
};

// XÃ³a user
export const deleteUser = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, message: error.message };
  }
};

// Láº¥y users theo role
export const getUsersByRole = async (role) => {
  try {
    const res = await fetch(`${API_URL}/users/role/${role}`);
    return await res.json();
  } catch (error) {
    console.error('Get users by role error:', error);
    return [];
  }
};

// TÃ¬m users
export const searchUsers = async (searchField, searchValue) => {
  try {
    const res = await fetch(`${API_URL}/users/search?field=${searchField}&value=${encodeURIComponent(searchValue)}`);
    return await res.json();
  } catch (error) {
    console.error('Search users error:', error);
    return [];
  }
};

// Äáº¿m tá»•ng users
export const countUsers = async () => {
  try {
    const users = await getAllUsers();
    return users.length;
  } catch (error) {
    console.error('Count users error:', error);
    return 0;
  }
};

// Äáº¿m users theo role
export const countUsersByRole = async (role) => {
  try {
    const users = await getUsersByRole(role);
    return users.length;
  } catch (error) {
    console.error('Count users by role error:', error);
    return 0;
  }
};

export default {
  registerUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole,
  getAllUsers,
  searchUsers,
  countUsers,
  countUsersByRole
};

