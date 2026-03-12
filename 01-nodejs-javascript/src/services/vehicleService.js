const { db } = require('../config/firebase');

const VEHICLES_COLLECTION = 'vehicles';

// Lấy tất cả xe bồn
const getAllVehicles = async () => {
    const snapshot = await db.collection(VEHICLES_COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Thêm xe bồn mới
const addVehicle = async (vehicleData) => {
    const docRef = await db.collection(VEHICLES_COLLECTION).add({
        ...vehicleData,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật xe bồn
const updateVehicle = async (vehicleId, updateData) => {
    const docRef = db.collection(VEHICLES_COLLECTION).doc(vehicleId);
    await docRef.update({ ...updateData, updatedAt: new Date() });
    return { success: true };
};

// Xóa xe bồn
const deleteVehicle = async (vehicleId) => {
    const docRef = db.collection(VEHICLES_COLLECTION).doc(vehicleId);
    await docRef.delete();
    return { success: true };
};

module.exports = { getAllVehicles, addVehicle, updateVehicle, deleteVehicle };
