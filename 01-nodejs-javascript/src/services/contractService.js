const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'contracts';

// Lấy tất cả hợp đồng
const getAllContracts = async () => {
    const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Thêm hợp đồng mới
const addContract = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật hợp đồng
const updateContract = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
};

// Xóa hợp đồng
const deleteContract = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

module.exports = { getAllContracts, addContract, updateContract, deleteContract };
