const { db } = require('../config/firebase');

const COLLECTION = 'suppliers';

const addSupplier = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        note: data.note || '',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
};

const getAllSuppliers = async () => {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const updateSupplier = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({ ...data, updatedAt: new Date() });
    return { success: true };
};

const deleteSupplier = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

module.exports = { addSupplier, getAllSuppliers, updateSupplier, deleteSupplier };
