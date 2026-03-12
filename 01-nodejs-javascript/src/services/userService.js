const { db } = require('../config/firebase');

const USERS_COLLECTION = 'users';

// Lấy tất cả users và đảm bảo có cấp employeeId tự động
const getAllUsers = async () => {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Tự động cấp Mã nhân viên (Employee ID) cho những user chưa có
    let maxIdNumber = 0;

    // 1. Tìm số thứ tự lớn nhất hiện có
    users.forEach(u => {
        if (u.employeeId && u.employeeId.startsWith('NV')) {
            const num = parseInt(u.employeeId.replace('NV', ''), 10);
            if (!isNaN(num) && num > maxIdNumber) {
                maxIdNumber = num;
            }
        }
    });

    // 2. Cấp mới cho user thiếu Employee ID (thường là user đã verify)
    let needsUpdate = false;
    for (let user of users) {
        if (!user.employeeId && user.role !== 'pending' && user.role !== 'admin') {
            maxIdNumber++;
            const newEmployeeId = `NV${maxIdNumber.toString().padStart(3, '0')}`;
            user.employeeId = newEmployeeId;

            // Cập nhật ngầm vào Database
            await db.collection(USERS_COLLECTION).doc(user.id).update({
                employeeId: newEmployeeId
            });
            needsUpdate = true;
        }
    }

    return users;
};

// Lấy user theo ID
const getUserById = async (userId) => {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() };
};

// Lấy user theo email
const getUserByEmail = async (email) => {
    const snapshot = await db.collection(USERS_COLLECTION)
        .where('email', '==', email)
        .limit(1)
        .get();
    if (snapshot.empty) return null;
    let doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

// Tạo/Lưu user document (dùng cho auth)
const createOrGetUserDoc = async (uid, userData) => {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        const newUser = {
            uid,
            email: userData.email,
            fullname: userData.fullname || 'Người Dùng',
            role: 'pending',
            photoURL: userData.photoURL || null,
            phone: userData.phone || '',
            address: userData.address || '',
            isActive: true,
            isApproved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...userData
        };
        await docRef.set(newUser);
        return { ...newUser, isNewUser: true };
    }

    return { ...docSnap.data(), isNewUser: false };
};

// Đăng ký user mới (lưu vào Firestore)
const registerUser = async (uid, userData) => {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.set({
        uid,
        email: userData.email,
        fullname: userData.fullname,
        role: userData.role || 'pending',
        photoURL: userData.photoURL || null,
        phone: userData.phone || '',
        address: userData.address || '',
        isActive: true,
        isApproved: userData.isApproved || false,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, userId: uid };
};

// Cập nhật user
const updateUser = async (userId, updateData) => {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);

    // Nếu chuyển role sang admin, đảm bảo không có mã NV
    if (updateData.role === 'admin') {
        updateData.employeeId = '';
    } else if (updateData.isApproved === true && updateData.role && updateData.role !== 'admin' && updateData.role !== 'pending') {
        // Nếu Admin đang duyệt tài khoản, hãy kích hoạt việc tự động tạo NVxxx bằng cách gọi getAllUsers sau đó hoặc frontend tự load lại
    }

    await docRef.update({ ...updateData, updatedAt: new Date() });
    return { success: true };
};

// Xóa user
const deleteUser = async (userId) => {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    await docRef.delete();
    return { success: true };
};

// Lấy users theo role
const getUsersByRole = async (role) => {
    const snapshot = await db.collection(USERS_COLLECTION)
        .where('role', '==', role)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Tìm users
const searchUsers = async (searchField, searchValue) => {
    const snapshot = await db.collection(USERS_COLLECTION)
        .where(searchField, '==', searchValue)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
    getAllUsers,
    getUserById,
    getUserByEmail,
    createOrGetUserDoc,
    registerUser,
    updateUser,
    deleteUser,
    getUsersByRole,
    searchUsers
};
