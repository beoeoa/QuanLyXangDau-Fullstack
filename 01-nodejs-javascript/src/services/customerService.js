const { db } = require('../config/firebase');

const COLLECTION = 'customers';

const addCustomer = async (data) => {
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

const getAllCustomers = async () => {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const updateCustomer = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({ ...data, updatedAt: new Date() });
    return { success: true };
};

const deleteCustomer = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

module.exports = { addCustomer, getAllCustomers, updateCustomer, deleteCustomer };