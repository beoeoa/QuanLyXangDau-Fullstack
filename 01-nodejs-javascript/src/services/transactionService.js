const { db } = require('../config/firebase');
const { updateStock } = require('./inventoryService');

const COLLECTION = 'transactions';

const createTransaction = async (transactionData) => {
    const docRef = await db.collection(COLLECTION).add({
        type: transactionData.type,
        productId: transactionData.productId,
        productName: transactionData.productName,
        quantity: Number(transactionData.quantity),
        unitPrice: Number(transactionData.unitPrice) || 0,
        totalAmount: Number(transactionData.quantity) * Number(transactionData.unitPrice),
        partnerId: transactionData.partnerId || '',
        partnerName: transactionData.partnerName || '',
        note: transactionData.note || '',
        createdBy: transactionData.createdBy || '',
        createdAt: new Date()
    });

    // Cập nhật tồn kho tự động
    const quantityChange = transactionData.type === 'import'
        ? Number(transactionData.quantity)
        : -Number(transactionData.quantity);

    const stockResult = await updateStock(transactionData.productId, quantityChange);
    if (!stockResult.success) {
        await db.collection(COLLECTION).doc(docRef.id).delete();
        return { success: false, message: stockResult.message };
    }

    return { success: true, id: docRef.id };
};

const getAllTransactions = async () => {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
        });
};

const getTransactionsByType = async (type) => {
    const snapshot = await db.collection(COLLECTION).where('type', '==', type).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const deleteTransaction = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

module.exports = {
    createTransaction,
    getAllTransactions,
    getTransactionsByType,
    deleteTransaction
};
