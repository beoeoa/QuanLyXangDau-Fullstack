const { db } = require('../config/firebase');

const SOS_COLLECTION = 'sos_reports';

// Tạo báo cáo SOS
const createSOSReport = async (reportData) => {
    const docRef = await db.collection(SOS_COLLECTION).add({
        ...reportData,
        createdAt: new Date(),
        status: 'open' // open → acknowledged → resolved
    });
    return { success: true, id: docRef.id };
};

// Lấy SOS theo tài xế
const getSOSByDriver = async (driverId) => {
    const snapshot = await db.collection(SOS_COLLECTION)
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt };
    });
};

// Lấy tất cả SOS (Admin/Điều vận)
const getAllSOSReports = async () => {
    const snapshot = await db.collection(SOS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();
        
    const usersSnap = await db.collection('users').get();
    const usersMap = {};
    usersSnap.docs.forEach(d => { usersMap[d.id] = d.data() });

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const driverId = data.driverId;
        const driverInfo = driverId ? usersMap[driverId] : null;

        return { 
            id: doc.id, 
            ...data, 
            driverPhone: data.driverPhone || (driverInfo ? driverInfo.phone : null),
            createdAt: data.createdAt?.toDate?.() || data.createdAt 
        };
    });
};

// Cập nhật trạng thái SOS
const updateSOSStatus = async (sosId, status) => {
    await db.collection(SOS_COLLECTION).doc(sosId).update({
        status,
        updatedAt: new Date()
    });
    return { success: true };
};

module.exports = { createSOSReport, getSOSByDriver, getAllSOSReports, updateSOSStatus };
