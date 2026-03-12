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
        const result = await userService.createOrGetUserDoc(uid, userData);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
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

const updateOrderStatus = async (req, res) => {
    try {
        const { status, ...extraData } = req.body;
        const result = await transportationService.updateOrderStatus(req.params.id, status, extraData);
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

const updateOrderSeal = async (req, res) => {
    try {
        const result = await transportationService.updateOrderSeal(req.params.id, req.body.sealCode);
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
    catch (e) { res.status(500).json({ error: e.message }); }
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
    catch (e) { res.status(500).json({ error: e.message }); }
};

// ===========================
// CONTRACTS (Hợp đồng)
// ===========================
const getContractsCtrl = async (req, res) => {
    try { res.json(await contractService.getAllContracts()); }
    catch (e) { res.status(500).json({ error: e.message }); }
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
    catch (e) { res.status(500).json({ error: e.message }); }
};
const getNotifByRoleCtrl = async (req, res) => {
    try { res.json(await notificationService.getNotificationsByRole(req.params.role)); }
    catch (e) { res.status(500).json({ error: e.message }); }
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
    catch (e) { res.status(500).json({ error: e.message }); }
};

// ===========================
// SHIPMENTS (Chuyến hàng)
// ===========================
const getShipmentsCtrl = async (req, res) => {
    try { res.json(await shipmentService.getAllShipments()); }
    catch (e) { res.status(500).json({ error: e.message }); }
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
    catch (e) { res.status(500).json({ error: e.message }); }
};
const getGovWarehousesCtrl = async (req, res) => {
    res.json(shipmentService.GOV_WAREHOUSES);
};

// ===========================
// DRIVER SCHEDULES (Nhật ký làm việc tài xế)
// ===========================
const getDriverSchedulesCtrl = async (req, res) => {
    try { res.json(await driverScheduleService.getAllSchedules()); }
    catch (e) { res.status(500).json({ error: e.message }); }
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
    catch (e) { res.status(500).json({ error: e.message }); }
};

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
    getAllDeliveryOrdersCtrl, updateOrderDocuments, updateOrderSeal,
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
    getShipmentsCtrl, createShipmentCtrl, updateShipmentCtrl, deleteShipmentCtrl, getShipmentsByDriverCtrl, getGovWarehousesCtrl,
    // Driver Schedules
    getDriverSchedulesCtrl, addDriverScheduleCtrl, updateDriverScheduleCtrl, deleteDriverScheduleCtrl, getSchedulesByDriverCtrl
};
