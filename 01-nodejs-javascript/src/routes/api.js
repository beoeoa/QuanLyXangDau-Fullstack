const express = require('express');
const routerAPI = express.Router();

// Route kiểm tra trạng thái API tại /api
routerAPI.get('/', (req, res) => {
    res.json({ message: 'Logistics API is active and ready!' });
});

const {
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
    // Transportation
    getVehicles, addVehicle, createDeliveryOrder,
    getOrdersByDriver, updateOrderStatus,
    getAllDeliveryOrdersCtrl, updateOrderDocuments, updateOrderLocationCtrl, updateOrderSeal, updateOrderApproval, deleteDeliveryOrderCtrl,
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
    // Driver Trip Stats (Automated)
    getDriverTripStatsCtrl, getAllDriverTripStatsCtrl,
    // Routes
    saveRouteCtrl, getRouteCtrl, getUserRoutesCtrl, deleteRouteCtrl,
    // Image Upload
    uploadImageCtrl
} = require('../controllers/apiController');

// ===========================
// USERS / AUTH
// ===========================
routerAPI.get('/users', getUsers);
routerAPI.get('/users/search', searchUsersCtrl);
routerAPI.get('/users/email', getUserByEmail);
routerAPI.get('/users/role/:role', getUsersByRole);
routerAPI.get('/users/:id', getUserById);
routerAPI.post('/users/register', registerUser);
routerAPI.post('/users/get-or-create', createOrGetUserDoc);
routerAPI.post('/users/verify-role', verifyUserRole);
routerAPI.put('/users/:id', updateUser);
routerAPI.delete('/users/:id', deleteUser);

// ===========================
// INVENTORY (Sản phẩm)
// ===========================
routerAPI.get('/inventory', getProducts);
routerAPI.post('/inventory', addProduct);
routerAPI.put('/inventory/:id', updateProduct);
routerAPI.delete('/inventory/:id', deleteProduct);

// ===========================
// CUSTOMERS (Khách hàng)
// ===========================
routerAPI.get('/customers', getCustomers);
routerAPI.post('/customers', addCustomer);
routerAPI.put('/customers/:id', updateCustomer);
routerAPI.delete('/customers/:id', deleteCustomer);

// ===========================
// SUPPLIERS (Nhà cung cấp)
// ===========================
routerAPI.get('/suppliers', getSuppliers);
routerAPI.post('/suppliers', addSupplier);
routerAPI.put('/suppliers/:id', updateSupplier);
routerAPI.delete('/suppliers/:id', deleteSupplier);

// ===========================
// TRANSACTIONS (Giao dịch)
// ===========================
routerAPI.get('/transactions', getTransactions);
routerAPI.post('/transactions', createTransaction);
routerAPI.delete('/transactions/:id', deleteTransaction);

// ===========================
// TRANSPORTATION (Vận tải)
// ===========================
routerAPI.get('/vehicles', getVehicles);
routerAPI.post('/vehicles', addVehicle);
routerAPI.get('/delivery-orders', getAllDeliveryOrdersCtrl);
routerAPI.post('/delivery-orders', createDeliveryOrder);
routerAPI.get('/delivery-orders/driver/:driverId', getOrdersByDriver);
routerAPI.put('/delivery-orders/:id/status', updateOrderStatus);
routerAPI.put('/delivery-orders/:id/location', updateOrderLocationCtrl);
routerAPI.put('/delivery-orders/:id/documents', updateOrderDocuments);
routerAPI.put('/delivery-orders/:id/seal', updateOrderSeal);
routerAPI.put('/delivery-orders/:id/approval', updateOrderApproval);
routerAPI.delete('/delivery-orders/:id', deleteDeliveryOrderCtrl);
routerAPI.get('/delivery-orders/driver-stats/:driverId', getDriverTripStatsCtrl);
routerAPI.get('/delivery-orders/all-stats', getAllDriverTripStatsCtrl);

// ===========================
// AUDIT LOGS (Nhật ký)
// ===========================
routerAPI.get('/audit-logs', getAuditLogsCtrl);
routerAPI.post('/audit-logs', createAuditLog);

// ===========================
// FLEET VEHICLES (Quản lý xe bồn)
// ===========================
routerAPI.get('/fleet-vehicles', getFleetVehicles);
routerAPI.post('/fleet-vehicles', addFleetVehicle);
routerAPI.put('/fleet-vehicles/:id', updateFleetVehicle);
routerAPI.delete('/fleet-vehicles/:id', deleteFleetVehicle);

// ===========================
// DRIVER EXPENSES (Chi phí tài xế)
// ===========================
routerAPI.post('/driver-expenses', addDriverExpense);
routerAPI.get('/driver-expenses', getAllDriverExpenses);
routerAPI.get('/driver-expenses/driver/:driverId', getDriverExpenses);
routerAPI.put('/driver-expenses/:id/status', updateDriverExpenseStatus);

// ===========================
// SOS REPORTS (Báo cáo khẩn cấp)
// ===========================
routerAPI.post('/sos-reports', createSOS);
routerAPI.get('/sos-reports', getAllSOS);
routerAPI.get('/sos-reports/driver/:driverId', getDriverSOS);
routerAPI.put('/sos-reports/:id/status', updateSOSStatusCtrl);

// ===========================
// ORDERS (Đơn hàng)
// ===========================
routerAPI.get('/orders', getOrdersCtrl);
routerAPI.post('/orders', createOrderCtrl);
routerAPI.put('/orders/:id', updateOrderCtrl);
routerAPI.delete('/orders/:id', deleteOrderCtrl);


// ===========================
// FUEL PRICES (Bảng giá xăng dầu)
// ===========================
routerAPI.get('/fuel-prices', getPricesCtrl);
routerAPI.post('/fuel-prices', addPriceCtrl);
routerAPI.put('/fuel-prices/:id', updatePriceCtrl);
routerAPI.delete('/fuel-prices/:id', deletePriceCtrl);
routerAPI.get('/fuel-prices/current/:product', getCurrentPriceCtrl);

// ===========================
// CONTRACTS (Hợp đồng)
// ===========================
routerAPI.get('/contracts', getContractsCtrl);
routerAPI.post('/contracts', addContractCtrl);
routerAPI.put('/contracts/:id', updateContractCtrl);
routerAPI.delete('/contracts/:id', deleteContractCtrl);

// ===========================
// NOTIFICATIONS (Thông báo)
// ===========================
routerAPI.post('/notifications', createNotifCtrl);
routerAPI.get('/notifications/user/:userId', getNotifByUserCtrl);
routerAPI.get('/notifications/role/:role', getNotifByRoleCtrl);
routerAPI.put('/notifications/:id/read', markNotifReadCtrl);
routerAPI.put('/notifications/read-all/:userId', markAllNotifReadCtrl);

// ===========================
// FUEL PRICE AUTO SYNC
// ===========================
routerAPI.post('/fuel-prices/sync', syncFuelPricesCtrl);
routerAPI.get('/fuel-prices/sync-meta', getSyncMetaCtrl);

// ===========================
// SHIPMENTS (Chuyến hàng)
// ===========================
routerAPI.get('/shipments', getShipmentsCtrl);
routerAPI.post('/shipments', createShipmentCtrl);
routerAPI.put('/shipments/:id', updateShipmentCtrl);
routerAPI.delete('/shipments/:id', deleteShipmentCtrl);
routerAPI.get('/shipments/driver/:driverId', getShipmentsByDriverCtrl);
routerAPI.get('/shipments/warehouses', getGovWarehousesCtrl);
routerAPI.get('/shipments/ai-dispatch', getAIDispatchSuggestionsCtrl);

// ===========================
// DRIVER SCHEDULES (Nhật ký làm việc tài xế)
// ===========================
routerAPI.get('/driver-schedules', getDriverSchedulesCtrl);
routerAPI.post('/driver-schedules', addDriverScheduleCtrl);
routerAPI.put('/driver-schedules/:id', updateDriverScheduleCtrl);
routerAPI.delete('/driver-schedules/:id', deleteDriverScheduleCtrl);
routerAPI.get('/driver-schedules/driver/:driverId', getSchedulesByDriverCtrl);

// ===========================
// ROUTES (Đường đi)
// ===========================
routerAPI.post('/routes', saveRouteCtrl);
routerAPI.get('/routes/:id', getRouteCtrl);
routerAPI.get('/routes/user/:userId', getUserRoutesCtrl);
routerAPI.delete('/routes/:id', deleteRouteCtrl);

// ===========================
// IMAGE UPLOAD (via Firebase Admin SDK)
// ===========================
routerAPI.post('/upload/image', uploadImageCtrl);

module.exports = routerAPI;