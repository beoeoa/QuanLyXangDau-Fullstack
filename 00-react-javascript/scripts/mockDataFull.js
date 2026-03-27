/**
 * Script Tự Động Tạo Dữ Liệu Ảo Đầy Đủ (Mock Data Full v2)
 * Cho toàn bộ các phòng ban: Sale, Kế Toán, Vận Tải (Admin), Tài xế
 * Yêu cầu: Node.js version 18+
 * Chạy lệnh: node scripts/mockDataFull.js
 */

const API_URL = 'https://quanlyxangdau-fullstack.onrender.com/api';

// Hàm helper để tạo ngày ngẫu nhiên trong khoảng {days} ngày gần đây
const randomDate = (daysAgo) => new Date(Date.now() - Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000)).toISOString();

const MOCK_DATA = {
    // ==========================================
    // 👤 NGƯỜI DÙNG CHUNG (Tài xế, Sale, Kế toán, Admin)
    // ==========================================
    users: [
        { uid: 'mock_sale_1', email: 'sale1@xangdau.com', fullname: 'Trần Thị Bích', role: 'sales', phone: '0901', isApproved: true },
        { uid: 'mock_sale_2', email: 'sale2@xangdau.com', fullname: 'Lê Ngọc Mỹ', role: 'sales', phone: '0902', isApproved: true },
        { uid: 'mock_ketoan_1', email: 'ketoan1@xangdau.com', fullname: 'Phạm Thanh Kế', role: 'accountant', phone: '0903', isApproved: true },
        { uid: 'mock_ketoan_2', email: 'ketoan2@xangdau.com', fullname: 'Nguyễn Tài Chính', role: 'accountant', phone: '0904', isApproved: true },
        { uid: 'mock_admin_1', email: 'vanchuyen@xangdau.com', fullname: 'Trần Điều Vận', role: 'admin', phone: '0905', isApproved: true },
        { uid: 'mock_driver_1', email: 'taixe1@xangdau.com', fullname: 'Nguyễn Văn Đạt', role: 'driver', phone: '0911', isApproved: true, licenseClass: 'FC' },
        { uid: 'mock_driver_2', email: 'taixe2@xangdau.com', fullname: 'Trần Khoa', role: 'driver', phone: '0912', isApproved: true, licenseClass: 'C' },
        { uid: 'mock_driver_3', email: 'taixe3@xangdau.com', fullname: 'Lê Bình', role: 'driver', phone: '0913', isApproved: true, licenseClass: 'FC' },
    ],

    // ==========================================
    // 🏢 DỮ LIỆU DANH MỤC GỐC (Hàng, Đối tác, Xe)
    // ==========================================
    customers: [
        { id: 'CUST001', name: 'Đại lý Petrolimex Hải Hà', address: 'Quảng Yên, Quảng Ninh', phone: '0981234567', type: 'Đại lý lớn' },
        { id: 'CUST002', name: 'Trạm Xăng Miền Tây', address: 'Ninh Kiều, Cần Thơ', phone: '0977665544', type: 'Cửa hàng lẻ' },
        { id: 'CUST003', name: 'Nhà Máy Điện Khí', address: 'Bà Rịa', phone: '0912334455', type: 'KCN/Nhà máy' }
    ],
    products: [
        { name: 'Xăng RON 95-V', category: 'petrol', unit: 'Lít', price: 23500 },
        { name: 'Dầu Diesel 0.05S (DO)', category: 'diesel', unit: 'Lít', price: 20200 },
        { name: 'Dầu Hỏa (KO)', category: 'kerosene', unit: 'Lít', price: 20500 }
    ],
    vehicles: [
        { brand: 'Hyundai HD320', plateNumber: '15C-123.45', totalCapacity: 24000, status: 'available', yearOfManufacture: 2022, driverId: 'mock_driver_1', driverName: 'Nguyễn Văn Đạt' },
        { brand: 'Hino 500', plateNumber: '29H-888.88', totalCapacity: 18000, status: 'on_trip', yearOfManufacture: 2023, driverId: 'mock_driver_2', driverName: 'Trần Khoa' },
        { brand: 'Isuzu Giga', plateNumber: '51D-456.78', totalCapacity: 28000, status: 'maintenance', yearOfManufacture: 2021, driverId: 'mock_driver_3', driverName: 'Lê Bình' },
    ],

    // ==========================================
    // 🛒 DỮ LIỆU CỦA PHÒNG SALE (Đơn hàng CRM)
    // ==========================================
    orders: [
        { customerName: 'Đại lý Petrolimex Hải Hà', product: 'Xăng RON 95-V', quantity: 24000, status: 'pending', requestDate: randomDate(2), createdBy: 'Trần Thị Bích', notes: 'Giao gấp trước 10h sáng' },
        { customerName: 'Trạm Xăng Miền Tây', product: 'Dầu Diesel 0.05S (DO)', quantity: 18000, status: 'approved', requestDate: randomDate(5), createdBy: 'Lê Ngọc Mỹ', notes: 'Đã xuất hóa đơn' },
        { customerName: 'Nhà Máy Điện Khí', product: 'Dầu Hỏa (KO)', quantity: 10000, status: 'completed', requestDate: randomDate(10), createdBy: 'Trần Thị Bích', notes: 'Hợp đồng dài hạn' }
    ],

    // ==========================================
    // 🚛 DỮ LIỆU CỦA ĐIỀU VẬN ADMIN (Lệnh đi đường, Nhật ký)
    // ==========================================
    deliveryOrders: [
        { vehiclePlate: '15C-123.45', assignedDriverId: 'mock_driver_1', assignedDriverName: 'Nguyễn Văn Đạt', product: 'Xăng RON 95-V', amount: 24000, sourceWarehouse: 'Kho Tổng Đình Vũ', destination: 'Đại lý Petrolimex Hải Hà', status: 'pending', createdAt: new Date().toISOString() },
        { vehiclePlate: '29H-888.88', assignedDriverId: 'mock_driver_2', assignedDriverName: 'Trần Khoa', product: 'Dầu Diesel 0.05S (DO)', amount: 18000, sourceWarehouse: 'Kho xăng dầu B12', destination: 'Trạm Xăng Miền Tây', status: 'moving', createdAt: randomDate(1) },
    ],
    driverSchedules: [
        { driverId: 'mock_driver_1', driverName: 'Nguyễn Văn Đạt', vehiclePlate: '15C-123.45', dateRecorded: randomDate(7), routeName: 'Hải Phòng -> Hà Nội', distanceKm: 120, status: 'completed', notes: 'Chuyến đi an toàn' },
        { driverId: 'mock_driver_3', driverName: 'Lê Bình', vehiclePlate: '51D-456.78', dateRecorded: randomDate(3), routeName: 'TPHCM -> Vũng Tàu', distanceKm: 105, status: 'completed', notes: 'Đường kẹt xe nhẹ' },
    ],
    auditLogs: [
        { userId: 'mock_admin_1', userName: 'Trần Điều Vận', action: 'CREATE_DELIVERY_ORDER', details: 'Tạo lệnh đi cho xe 15C-123.45', timestamp: new Date().toISOString() },
        { userId: 'mock_sale_1', userName: 'Trần Thị Bích', action: 'APPROVE_ORDER', details: 'Duyệt đơn hàng Đại lý Hải Hà', timestamp: randomDate(1) },
    ],

    // ==========================================
    // 💰 DỮ LIỆU CỦA KẾ TOÁN (Giao dịch, Chi phí tài xế)
    // ==========================================
    transactions: [
        { type: 'income', amount: 564000000, description: 'Đại lý Petrolimex Hải Hà TT lô Xăng', date: randomDate(2), createdBy: 'Phạm Thanh Kế', status: 'completed', referenceId: 'INV-001' },
        { type: 'income', amount: 363600000, description: 'Trạm Xăng Miền Tây ứng trước 50%', date: randomDate(5), createdBy: 'Nguyễn Tài Chính', status: 'completed', referenceId: 'INV-002' },
        { type: 'expense', amount: 15000000, description: 'Thanh toán phí bảo trì xe 51D-456.78', date: randomDate(10), createdBy: 'Phạm Thanh Kế', status: 'completed', referenceId: 'MAINT-21' },
        { type: 'expense', amount: 120000000, description: 'Trả lương tài xế tháng trước', date: randomDate(12), createdBy: 'Nguyễn Tài Chính', status: 'completed', referenceId: 'PAY-09' },
    ],

    // ==========================================
    // 🛣️ DỮ LIỆU CỦA TÀI XẾ (Chi phí dọc đường, Cứu hộ SOS)
    // ==========================================
    driverExpenses: [
        { driverId: 'mock_driver_1', driverName: 'Nguyễn Văn Đạt', vehiclePlate: '15C-123.45', expenseType: 'Toll Fee', amount: 250000, description: 'Vé trạm thu phí QL5', date: randomDate(2), status: 'approved' },
        { driverId: 'mock_driver_2', driverName: 'Trần Khoa', vehiclePlate: '29H-888.88', expenseType: 'Repair', amount: 1200000, description: 'Vá lốp cao tốc', date: randomDate(4), status: 'pending' },
        { driverId: 'mock_driver_3', driverName: 'Lê Bình', vehiclePlate: '51D-456.78', expenseType: 'Parking', amount: 50000, description: 'Bến bãi chờ giao hàng', date: randomDate(6), status: 'rejected' },
    ],
    sosReports: [
        { driverId: 'mock_driver_3', driverName: 'Lê Bình', vehiclePlate: '51D-456.78', issueType: 'Hỏng động cơ', severity: 'high', location: 'Trạm thu phí Long Thành', description: 'Đang chạy báo đèn đỏ động cơ, phải dừng xe khẩn cấp.', status: 'resolved', reportDate: randomDate(15) },
        { driverId: 'mock_driver_2', driverName: 'Trần Khoa', vehiclePlate: '29H-888.88', issueType: 'Tai nạn nhẹ', severity: 'medium', location: 'IC3 Cần Thơ', description: 'Va quẹt xe máy xước sơn, đã đền bù.', status: 'pending', reportDate: randomDate(1) },
    ]
};

// Hàm gửi request
const postData = async (endpoint, data) => {
    try {
        const res = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok || result.error) throw new Error(result.error || result.message || 'Lỗi server');
        return result;
    } catch (error) {
        console.warn(`[Cảnh báo] Mảng ${endpoint} lỗi (có thể do API chưa làm hoặc lỗi validation):`, error.message);
        return null;
    }
};

const runSeed = async () => {
    console.log('🚀 ĐANG CHẠY SCRIPT TẠO DỮ LIỆU ẢO TOÀN DIỆN...\\n');

    const seedCollection = async (label, endpoint, dataArray) => {
        console.log(`👉 Đang tạo [${label}]...`);
        let count = 0;
        for (const item of dataArray) {
            const res = await postData(endpoint, item);
            if (res) count++;
        }
        console.log(`✅ Hoàn tất [${label}]: ${count}/${dataArray.length} bản ghi.\\n`);
    };

    // 1. CHUNG
    await seedCollection('Người Dùng (Auth/Tài xế/Kế toán/Sale)', 'users/get-or-create', MOCK_DATA.users);
    await seedCollection('Khách hàng (CRM)', 'customers', MOCK_DATA.customers);
    await seedCollection('Sản phẩm Xăng dầu', 'inventory', MOCK_DATA.products);
    await seedCollection('Danh sách Xe Bồn', 'fleet-vehicles', MOCK_DATA.vehicles);

    // 2. PHÒNG SALE
    await seedCollection('Hồ sơ Đơn hàng (Sale)', 'orders', MOCK_DATA.orders);

    // 3. ĐIỀU VẬN ADMIN
    await seedCollection('Lệnh Đi Đường (Tracking Map)', 'delivery-orders', MOCK_DATA.deliveryOrders);
    await seedCollection('Nhật ký làm việc Tài xế', 'driver-schedules', MOCK_DATA.driverSchedules);
    await seedCollection('Nhật ký Hệ thống (Audit Logs)', 'audit-logs', MOCK_DATA.auditLogs);

    // 4. KẾ TOÁN
    await seedCollection('Sổ Quỹ Giao Dịch (Kế toán)', 'transactions', MOCK_DATA.transactions);

    // 5. TÀI XẾ
    await seedCollection('Đề xuất Chi Phí Dọc Đường', 'driver-expenses', MOCK_DATA.driverExpenses);
    await seedCollection('Báo Cáo Sự Cố Khẩn Cấp (SOS)', 'sos-reports', MOCK_DATA.sosReports);

    console.log('🎉================================================🎉');
    console.log('🎉             TẠO MOCK DATA FULL THÀNH CÔNG!     🎉');
    console.log('🎉  Vào từng Dashboard (Kế Toán, Sale, Admin...)  🎉');
    console.log('🎉         để xem biểu đồ và bảng dữ liệu         🎉');
    console.log('🎉================================================🎉');
};

runSeed();
