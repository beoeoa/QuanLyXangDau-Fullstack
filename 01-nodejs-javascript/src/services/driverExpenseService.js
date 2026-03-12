const { db } = require('../config/firebase');

const EXPENSES_COLLECTION = 'driver_expenses';

// Thêm chi phí dọc đường
const addExpense = async (expenseData) => {
    const docRef = await db.collection(EXPENSES_COLLECTION).add({
        ...expenseData,
        createdAt: new Date(),
        status: 'pending' // pending → approved → rejected
    });
    return { success: true, id: docRef.id };
};

// Lấy chi phí theo tài xế
const getExpensesByDriver = async (driverId) => {
    const snapshot = await db.collection(EXPENSES_COLLECTION)
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt };
    });
};

// Lấy tất cả chi phí (cho Kế toán duyệt)
const getAllExpenses = async () => {
    const snapshot = await db.collection(EXPENSES_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt };
    });
};

// Duyệt / Từ chối chi phí (Kế toán)
const updateExpenseStatus = async (expenseId, status) => {
    await db.collection(EXPENSES_COLLECTION).doc(expenseId).update({
        status,
        reviewedAt: new Date()
    });
    return { success: true };
};

module.exports = { addExpense, getExpensesByDriver, getAllExpenses, updateExpenseStatus };
