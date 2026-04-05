const userService = require('../services/userService');
const inventoryService = require('../services/inventoryService');
const customerService = require('../services/customerService');
const supplierService = require('../services/supplierService');
const transactionService = require('../services/transactionService');
const transportationService = require('../services/transportationService');
const auditLogService = require('../services/auditLogService');
const vehicleService = require('../services/vehicleService');
const driverExpenseService = require('../services/driverExpenseService');
const sosReportService = require('../services/sosReportService');
const orderService = require('../services/orderService');
const priceService = require('../services/priceService');
const contractService = require('../services/contractService');
const notificationService = require('../services/notificationService');
const fuelPriceScraper = require('../services/fuelPriceScraper');
const shipmentService = require('../services/shipmentService');
const driverScheduleService = require('../services/driverScheduleService');
const routeService = require('../services/routeService');

// ===========================
// AUTH / USERS
// ===========================
const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const user = await userService.getUserByEmail(req.query.email);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { uid, ...userData } = req.body;
        const result = await userService.registerUser(uid, userData);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const createOrGetUserDoc = async (req, res) => {
    try {
        const { uid, ...userData } = req.body;
        console.log(`[API] get-or-create hit for UID: ${uid || 'UNDEFINED'}`);
        
        if (!uid) {
            console.error("[API] Error: Missing UID in request body");
            return res.status(400).json({ success: false, message: 'Thiếu UID người dùng' });
        }

        const result = await userService.createOrGetUserDoc(uid, userData);
        
        if (!result) {
            console.error(`[API] userService returned NULL for UID: ${uid}`);
            return res.status(404).json({ success: false, message: 'User not found or created' });
        }

        console.log(`[API] Found/Created User: ${result.fullname || 'No Name'}, Role: ${result.role}`);
        return res.status(200).json(result);
    } catch (e) {
        console.error(`[API] get-or-create FATAL:`, e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const result = await userService.updateUser(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const getUsersByRole = async (req, res) => {
    try {
        const users = await userService.getUsersByRole(req.params.role);
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const searchUsersCtrl = async (req, res) => {
    try {
        const { field, value } = req.query;
        const users = await userService.searchUsers(field, value);
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const verifyUserRole = async (req, res) => {
    try {
        const { userId, expectedRole } = req.body;
        const user = await userService.getUserById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
        }

        if (!user.isApproved && user.role !== 'admin') {
            return res.json({ success: false, message: 'Tài khoản chưa được duyệt', isApproved: false });
        }

        if (user.role !== expectedRole) {
            return res.json({
                success: false,
                message: `Vai trò không khớp. Vai trò thực tế: ${user.role}`,
                actualRole: user.role,
                isApproved: true
            });
        }

        return res.json({ success: true, actualRole: user.role, isApproved: true, message: 'Vai trò hợp lệ' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Lỗi kiểm tra vai trò' });
    }
};

// ===========================
// INVENTORY
// ===========================
const getProducts = async (req, res) => {
    try {
        const products = await inventoryService.getAllProducts();
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addProduct = async (req, res) => {
    try {
        const result = await inventoryService.addProduct(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const result = await inventoryService.updateProduct(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const result = await inventoryService.deleteProduct(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// CUSTOMERS
// ===========================
const getCustomers = async (req, res) => {
    try {
        const customers = await customerService.getAllCustomers();
        res.json(customers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addCustomer = async (req, res) => {
    try {
        const result = await customerService.addCustomer(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const result = await customerService.updateCustomer(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const result = await customerService.deleteCustomer(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// SUPPLIERS
// ===========================
const getSuppliers = async (req, res) => {
    try {
        const suppliers = await supplierService.getAllSuppliers();
        res.json(suppliers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addSupplier = async (req, res) => {
    try {
        const result = await supplierService.addSupplier(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const result = await supplierService.updateSupplier(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const result = await supplierService.deleteSupplier(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// TRANSACTIONS
// ===========================
const getTransactions = async (req, res) => {
    try {
        const { type } = req.query;
        let transactions;
        if (type) {
            transactions = await transactionService.getTransactionsByType(type);
        } else {
            transactions = await transactionService.getAllTransactions();
        }
        res.json(transactions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createTransaction = async (req, res) => {
    try {
        const result = await transactionService.createTransaction(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const result = await transactionService.deleteTransaction(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// TRANSPORTATION
// ===========================
const getVehicles = async (req, res) => {
    try {
        const vehicles = await transportationService.getAllVehicles();
        res.json(vehicles);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getDriverTripStatsCtrl = async (req, res) => {
    try {
        const driverId = req.params.driverId;
        const trips = await transportationService.getDriverTripStats(driverId);
        res.json(trips);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const getAllDriverTripStatsCtrl = async (req, res) => {
    try {
        const trips = await transportationService.getAllDriverTripStats();
        res.json(trips);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const addVehicle = async (req, res) => {
    try {
        const result = await transportationService.addVehicle(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const createDeliveryOrder = async (req, res) => {
    try {
        const result = await transportationService.createDeliveryOrder(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const getOrdersByDriver = async (req, res) => {
    try {
        const orders = await transportationService.getOrdersByDriver(req.params.driverId);
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteDeliveryOrderCtrl = async (req, res) => {
    try {
        const result = await transportationService.deleteDeliveryOrder(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status, ...extraData } = req.body;
        const result = await transportationService.updateOrderStatus(req.params.id, status, extraData);

        // ======================================================
        // TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI XE BỒN THEO QUY TRÌNH
        // ======================================================
        // Lấy thông tin đơn hàng để biết biển số xe
        try {
            const order = await transportationService.getOrderById(req.params.id);
            if (order && order.vehiclePlate) {
                // Tìm xe theo biển số trong fleet-vehicles
                const allVehicles = await vehicleService.getAllVehicles();
                const vehicle = allVehicles.find(v =>
                    (v.plateNumber || '').toLowerCase() === (order.vehiclePlate || '').toLowerCase()
                );
                if (vehicle) {
                    let newVehicleStatus = null;

                    // Xe BẮT ĐẦU LÀM VIỆC khi tài xế bấm "Đang di chuyển"
                    if (status === 'moving' || status === 'received' || status === 'arrived' || status === 'unloading') {
                        newVehicleStatus = 'on_trip'; // 🚚 Đang làm việc
                    }
                    // Xe VỀ BÃI khi tài xế bấm "Hoàn thành"
                    else if (status === 'completed') {
                        newVehicleStatus = 'available'; // 💤 Sẵn sàng / Nằm bãi
                    }

                    if (newVehicleStatus) {
                        await vehicleService.updateVehicle(vehicle.id, { status: newVehicleStatus });
                        console.log(`[AUTO] Xe ${order.vehiclePlate} → trạng thái: ${newVehicleStatus}`);
                    }
                }
            }
        } catch (vehicleErr) {
            // Không để lỗi xe ảnh hưởng đến kết quả cập nhật đơn hàng
            console.warn('[AUTO] Lỗi cập nhật trạng thái xe tự động:', vehicleErr.message);
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// AUDIT LOGS
// ===========================
const getAuditLogsCtrl = async (req, res) => {
    try {
        const logs = await auditLogService.getAuditLogs(parseInt(req.query.limit) || 100);
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createAuditLog = async (req, res) => {
    try {
        const { userId, userName, action, details } = req.body;
        const result = await auditLogService.logAction(userId, userName, action, details);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// VEHICLE MANAGEMENT (Quản lý xe bồn)
// ===========================
const getFleetVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getAllVehicles();
        res.json(vehicles);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addFleetVehicle = async (req, res) => {
    try {
        const result = await vehicleService.addVehicle(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateFleetVehicle = async (req, res) => {
    try {
        const result = await vehicleService.updateVehicle(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteFleetVehicle = async (req, res) => {
    try {
        const result = await vehicleService.deleteVehicle(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// DELIVERY ORDERS - Mở rộng
// ===========================
const getAllDeliveryOrdersCtrl = async (req, res) => {
    try {
        const orders = await transportationService.getAllDeliveryOrders();
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateOrderDocuments = async (req, res) => {
    try {
        const result = await transportationService.updateOrderDocuments(req.params.id, req.body.documents);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateOrderLocationCtrl = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const result = await transportationService.updateOrderLocation(req.params.id, lat, lng);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateOrderSeal = async (req, res) => {
    try {
        const result = await transportationService.updateOrderSeal(req.params.id, req.body.sealCode);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateOrderApproval = async (req, res) => {
    try {
        const result = await transportationService.updateOrderApproval(req.params.id, req.body.approvalStatus, req.body.approvalNote);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// DRIVER EXPENSES
// ===========================
const addDriverExpense = async (req, res) => {
    try {
        const result = await driverExpenseService.addExpense(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const getDriverExpenses = async (req, res) => {
    try {
        const expenses = await driverExpenseService.getExpensesByDriver(req.params.driverId);
        res.json(expenses);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllDriverExpenses = async (req, res) => {
    try {
        const expenses = await driverExpenseService.getAllExpenses();
        res.json(expenses);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateDriverExpenseStatus = async (req, res) => {
    try {
        const result = await driverExpenseService.updateExpenseStatus(req.params.id, req.body.status);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// SOS REPORTS
// ===========================
const createSOS = async (req, res) => {
    try {
        const result = await sosReportService.createSOSReport(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const getDriverSOS = async (req, res) => {
    try {
        const reports = await sosReportService.getSOSByDriver(req.params.driverId);
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllSOS = async (req, res) => {
    try {
        const reports = await sosReportService.getAllSOSReports();
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateSOSStatusCtrl = async (req, res) => {
    try {
        const result = await sosReportService.updateSOSStatus(req.params.id, req.body.status);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// ORDERS (Đơn hàng)
// ===========================
const getOrdersCtrl = async (req, res) => {
    try {
        const orders = await orderService.getAllOrders();
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createOrderCtrl = async (req, res) => {
    try {
        const result = await orderService.createOrder(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const updateOrderCtrl = async (req, res) => {
    try {
        const result = await orderService.updateOrder(req.params.id, req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteOrderCtrl = async (req, res) => {
    try {
        const result = await orderService.deleteOrder(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// FUEL PRICES (Bảng giá xăng dầu)
// ===========================
const getPricesCtrl = async (req, res) => {
    try { res.json(await priceService.getAllPrices()); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const addPriceCtrl = async (req, res) => {
    try { res.json(await priceService.addPrice(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const updatePriceCtrl = async (req, res) => {
    try { res.json(await priceService.updatePrice(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const deletePriceCtrl = async (req, res) => {
    try { res.json(await priceService.deletePrice(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getCurrentPriceCtrl = async (req, res) => {
    try { res.json(await priceService.getCurrentPrice(req.params.product)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};

// ===========================
// CONTRACTS (Hợp đồng)
// ===========================
const getContractsCtrl = async (req, res) => {
    try { res.json(await contractService.getAllContracts()); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const addContractCtrl = async (req, res) => {
    try { res.json(await contractService.addContract(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const updateContractCtrl = async (req, res) => {
    try { res.json(await contractService.updateContract(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const deleteContractCtrl = async (req, res) => {
    try { res.json(await contractService.deleteContract(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ===========================
// NOTIFICATIONS (Thông báo)
// ===========================
const createNotifCtrl = async (req, res) => {
    try { res.json(await notificationService.createNotification(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getNotifByUserCtrl = async (req, res) => {
    try { res.json(await notificationService.getNotificationsByUser(req.params.userId)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const getNotifByRoleCtrl = async (req, res) => {
    try { res.json(await notificationService.getNotificationsByRole(req.params.role)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const markNotifReadCtrl = async (req, res) => {
    try { res.json(await notificationService.markAsRead(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const markAllNotifReadCtrl = async (req, res) => {
    try { res.json(await notificationService.markAllAsRead(req.params.userId)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ===========================
// FUEL PRICE AUTO SYNC
// ===========================
const syncFuelPricesCtrl = async (req, res) => {
    try { res.json(await fuelPriceScraper.syncPricesToFirestore()); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getSyncMetaCtrl = async (req, res) => {
    try { res.json(await fuelPriceScraper.getSyncMeta()); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};

// ===========================
// SHIPMENTS (Chuyến hàng)
// ===========================
const getShipmentsCtrl = async (req, res) => {
    try { res.json(await shipmentService.getAllShipments()); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const createShipmentCtrl = async (req, res) => {
    try { res.json(await shipmentService.createShipment(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const updateShipmentCtrl = async (req, res) => {
    try { res.json(await shipmentService.updateShipment(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const deleteShipmentCtrl = async (req, res) => {
    try { res.json(await shipmentService.deleteShipment(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getShipmentsByDriverCtrl = async (req, res) => {
    try { res.json(await shipmentService.getShipmentsByDriver(req.params.driverId)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const getGovWarehousesCtrl = async (req, res) => {
    res.json(shipmentService.GOV_WAREHOUSES);
};
const getAIDispatchSuggestionsCtrl = async (req, res) => {
    try {
        const quantity = Number(req.query.quantity) || 0;
        const destination = req.query.destination || '';
        const suggestions = await shipmentService.getAIDispatchSuggestions(quantity, destination);
        res.json(suggestions);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ===========================
// DRIVER SCHEDULES (Nhật ký làm việc tài xế)
// ===========================
const getDriverSchedulesCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.getAllSchedules()); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};
const addDriverScheduleCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.createSchedule(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const updateDriverScheduleCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.updateSchedule(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const deleteDriverScheduleCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.deleteSchedule(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getSchedulesByDriverCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.getSchedulesByDriver(req.params.driverId)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};

// ===========================
// ROUTES (Đường đi)
// ===========================
const saveRouteCtrl = async (req, res) => {
    try { res.json(await routeService.saveRoute(req.body)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getRouteCtrl = async (req, res) => {
    try {
        const route = await routeService.getRouteById(req.params.id);
        if (!route) return res.status(404).json({ error: 'Không tìm thấy đường đi' });
        res.json(route);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getUserRoutesCtrl = async (req, res) => {
    try { res.json(await routeService.getRoutesByUserId(req.params.userId)); }
    catch (e) {
        console.error('Error in getNotifByUserCtrl:', e);
        res.status(500).json({ error: e.message });
    }
};

const deleteRouteCtrl = async (req, res) => {
    try { res.json(await routeService.deleteRoute(req.params.id)); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ===========================
// IMAGE UPLOAD (Firebase Admin SDK + Multer)
// - Nhận file ảnh multipart từ app mobile
// - Upload lên Firebase Storage bằng Admin SDK (không bị chặn bởi Security Rules)
// ===========================
const multer = require('multer');
const { storage } = require('../config/firebase');

// Dùng memory storage — không ghi ra đĩa, xử lý trong RAM
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const uploadImageCtrl = [
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Không nhận được file ảnh' });
            }
            const storagePath = req.body.path;
            if (!storagePath) {
                return res.status(400).json({ success: false, message: 'Thiếu đường dẫn lưu trữ' });
            }

            const bucket = storage.bucket();
            const file = bucket.file(storagePath);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype || 'image/jpeg' },
            });

            // Cấp quyền public read
            await file.makePublic();

            // URL công khai chuẩn của Firebase Storage
            const encodedPath = encodeURIComponent(storagePath);
            const bucketName = bucket.name;
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;

            res.json({ success: true, url: publicUrl });
        } catch (e) {
            console.error('[UPLOAD] Lỗi upload ảnh:', e.message);
            res.status(500).json({ success: false, message: e.message });
        }
    }
];


module.exports = {
    // Users
    getUsers, getUserById, getUserByEmail, registerUser,
    createOrGetUserDoc, updateUser, deleteUser,
    getUsersByRole, searchUsersCtrl, verifyUserRole,
    // Inventory
    getProducts, addProduct, updateProduct, deleteProduct,
    // Customers
    getCustomers, addCustomer, updateCustomer, deleteCustomer,
    // Suppliers
    getSuppliers, addSupplier, updateSupplier, deleteSupplier,
    // Transactions
    getTransactions, createTransaction, deleteTransaction,
    getVehicles, addVehicle, createDeliveryOrder,
    getOrdersByDriver, updateOrderStatus,
    getAllDeliveryOrdersCtrl, updateOrderDocuments, updateOrderLocationCtrl, updateOrderSeal, updateOrderApproval, deleteDeliveryOrderCtrl,
    getDriverTripStatsCtrl, getAllDriverTripStatsCtrl,
    // Audit Logs
    getAuditLogsCtrl, createAuditLog,
    // Fleet Vehicles
    getFleetVehicles, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle,
    // Driver Expenses
    addDriverExpense, getDriverExpenses, getAllDriverExpenses, updateDriverExpenseStatus,
    // SOS Reports
    createSOS, getDriverSOS, getAllSOS, updateSOSStatusCtrl,
    // Orders
    getOrdersCtrl, createOrderCtrl, updateOrderCtrl, deleteOrderCtrl,
    // Fuel Prices
    getPricesCtrl, addPriceCtrl, updatePriceCtrl, deletePriceCtrl, getCurrentPriceCtrl,
    // Contracts
    getContractsCtrl, addContractCtrl, updateContractCtrl, deleteContractCtrl,
    // Notifications
    createNotifCtrl, getNotifByUserCtrl, getNotifByRoleCtrl, markNotifReadCtrl, markAllNotifReadCtrl,
    // Fuel Price Sync
    syncFuelPricesCtrl, getSyncMetaCtrl,
    // Shipments
    getShipmentsCtrl, createShipmentCtrl, updateShipmentCtrl, deleteShipmentCtrl, getShipmentsByDriverCtrl, getGovWarehousesCtrl, getAIDispatchSuggestionsCtrl,
    // Driver Schedules
    getDriverSchedulesCtrl, addDriverScheduleCtrl, updateDriverScheduleCtrl, deleteDriverScheduleCtrl, getSchedulesByDriverCtrl,
    // Routes
    saveRouteCtrl, getRouteCtrl, getUserRoutesCtrl, deleteRouteCtrl,
    // Image Upload
    uploadImageCtrl
};
