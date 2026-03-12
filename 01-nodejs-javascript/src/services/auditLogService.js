const { db } = require('../config/firebase');

const AUDIT_COLLECTION = 'audit_logs';

// Ghi nhật ký hệ thống
const logAction = async (userId, userName, action, details) => {
    const logEntry = {
        userId,
        userName: userName || 'Hệ thống',
        action, // 'CREATE', 'UPDATE', 'DELETE'
        details, // Mô tả chi tiết hành động
        timestamp: new Date(),
        createdAt: new Date()
    };
    const docRef = await db.collection(AUDIT_COLLECTION).add(logEntry);
    return { success: true, id: docRef.id };
};

// Lấy danh sách logs (mới nhất trước)
const getAuditLogs = async (limit = 100) => {
    const snapshot = await db.collection(AUDIT_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || data.timestamp
        };
    });
};

module.exports = { logAction, getAuditLogs };
