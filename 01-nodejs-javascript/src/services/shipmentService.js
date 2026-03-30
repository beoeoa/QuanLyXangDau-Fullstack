const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'shipments';

// Danh sách kho Nhà nước (nguồn hàng)
const GOV_WAREHOUSES = [
    'Kho Đình Vũ - Hải Phòng',
    'Kho B12 - Quảng Ninh',
    'Kho Vân Phong - Khánh Hòa',
    'Kho Nhà Bè - TP.HCM',
    'Kho Thị Vải - Bà Rịa',
    'Kho K131 - Hải Phòng'
];

// Lấy tất cả chuyến hàng
const getAllShipments = async () => {
    const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Tạo chuyến hàng mới
const createShipment = async (data) => {
    const docRef = await db.collection(COLLECTION).add({
        ...data,
        status: data.status || 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
};

// Cập nhật chuyến hàng
const updateShipment = async (id, data) => {
    await db.collection(COLLECTION).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
};

// Xóa chuyến hàng
const deleteShipment = async (id) => {
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true };
};

// Lấy chuyến theo tài xế
const getShipmentsByDriver = async (driverId) => {
    const snapshot = await db.collection(COLLECTION)
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Lấy lấy danh sách gợi ý phân bổ xe (AI Dispatching)
const getAIDispatchSuggestions = async (quantity, destination) => {
    // 1. Lấy tất cả shipments đang chạy (busy)
    const busyShipments = await db.collection(COLLECTION)
        .where('status', 'not-in', ['delivered', 'completed'])
        .get();
    
    const busyDriverIds = new Set();
    const busyVehiclePlates = new Set();
    
    busyShipments.forEach(doc => {
        const d = doc.data();
        if (d.driverId) busyDriverIds.add(d.driverId);
        if (d.vehiclePlate) busyVehiclePlates.add(d.vehiclePlate);
    });

    // 2. Lấy toàn bộ Users (Drivers)
    const usersSnap = await db.collection('users').where('role', '==', 'driver').get();
    const availableDrivers = [];
    usersSnap.forEach(doc => {
        if (!busyDriverIds.has(doc.id)) {
            availableDrivers.push({ id: doc.id, ...doc.data() });
        }
    });

    // 3. Lấy toàn bộ Xe bồn (Vehicles)
    const vehiclesSnap = await db.collection('vehicles').get();
    const availableVehicles = [];
    vehiclesSnap.forEach(doc => {
        const v = doc.data();
        // Giả sử xe có mác plateNumber hoặc id là biển số
        const plate = v.plateNumber || doc.id;
        if (!busyVehiclePlates.has(plate) && v.status !== 'maintenance') {
            availableVehicles.push({ id: doc.id, plate, ...v });
        }
    });

    // 4. Chấm điểm (Scoring & Matching)
    const recommendations = [];
    // Ghép cặp (giả lập AI chấm điểm theo thời gian nhàn rỗi và thể tích xe nếu có)
    
    for (const vehicle of availableVehicles) {
        for (const driver of availableDrivers) {
            let score = 100;
            let reasons = [];

            // Nếu xe có capacity, ép xem có đủ chứa không
            const cap = Number(vehicle.capacity || 0);
            if (cap > 0) {
                if (cap < quantity) {
                    continue; // Loại thẳng xe nhỏ hơn đơn
                } else if (cap - quantity < 2000) {
                    score += 20; // Điểm cộng nếu xe vừa vặn tốn ít chi phí chạy không tải
                    reasons.push('Tải trọng xe khớp hoàn hảo (>90%)');
                } else {
                    reasons.push(`Xe trống nhiều (${cap}L)`);
                }
            } else {
                reasons.push('Đề xuất xe rảnh');
            }

            // Drivers (ai rảnh lâu hơn thì điểm cao hơn) - Random factor to simulate advanced idle-time checking
            // Thực tế sẽ dùng lastTripEndTime
            const idleScore = Math.floor(Math.random() * 20); 
            score += idleScore;
            
            if(idleScore > 10) reasons.push('Tài xế có thời gian nghỉ ngơi tốt');
            
            recommendations.push({
                driverId: driver.id,
                driverName: driver.fullname || driver.name || 'Tài xế',
                vehiclePlate: vehicle.plate,
                vehicleCapacity: cap,
                score,
                reason: reasons.join(', ')
            });
        }
    }

    // Sắp xếp điểm từ cao xuống thấp
    recommendations.sort((a, b) => b.score - a.score);

    // Trả về top 3
    return recommendations.slice(0, 3);
};

module.exports = {
    getAllShipments, createShipment, updateShipment, deleteShipment,
    getShipmentsByDriver, GOV_WAREHOUSES, getAIDispatchSuggestions
};
