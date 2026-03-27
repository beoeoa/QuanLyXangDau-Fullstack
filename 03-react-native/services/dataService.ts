import { Platform } from 'react-native';

const LAN_IP = '192.168.1.33'; // <-- IP LAN máy tính, sửa khi đổi mạng

const getApiUrl = () => {
  // Allow override via env (Expo): EXPO_PUBLIC_API_URL=http://<ip>:8080/api
  const envUrl = (process?.env as any)?.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string') return envUrl;

  if (__DEV__) {
    // Luôn dùng IP LAN để cả Emulator lẫn Thiết bị thật đều kết nối được
    return `http://${LAN_IP}:8080/api`;
  }
  return 'https://api.yourbackend.com/api';
};

const API_URL = getApiUrl();

// 1️⃣ Lấy Danh sách Lệnh Đi Đường Của Một Tài Xế
export const fetchDriverOrders = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/driver/${driverId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu Chuyến Đi:', error);
    return null;
  }
};

// 2️⃣ Lấy Danh sách Xe Bồn cho Admin
export const fetchFleetVehicles = async () => {
  try {
    const res = await fetch(`${API_URL}/fleet-vehicles`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Lỗi khi tải Danh sách Xe bồn:', error);
    return [];
  }
};

// 2.5️⃣ Lấy Tổng Thống kê dành cho Admin
export const fetchAllStats = async () => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/all-stats`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu Thống kê Admin:', error);
    return null;
  }
};

// 3️⃣ Gửi Tọa độ GPS Lên Mạng
export const pushLocationToBackend = async (orderId: string, lat: number, lng: number) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/${orderId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    if (!res.ok) console.warn('[NET] Lỗi Server khi đẩy GPS');
    else console.log(`[NET] Đã cập nhật GPS. Lệnh ID: ${orderId}`);
  } catch (error) {
    console.error('[NET] Mất mạng! Không đẩy được GPS:', error);
  }
};

// 4️⃣ Lấy lịch sử chuyến đi (Nhật ký)
export const fetchDeliveryLogs = async () => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Lỗi tải Nhật ký:', error);
    return [];
  }
};

// 4.5️⃣ Lấy tất cả Orders (để tính đơn giá giống web)
export const fetchOrders = async () => {
  try {
    const res = await fetch(`${API_URL}/orders`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Lỗi tải Orders:', error);
    return [];
  }
};

// 4.6️⃣ Lấy tất cả chi phí tài xế (AP)
export const fetchAllDriverExpenses = async () => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Lỗi tải Driver Expenses:', error);
    return [];
  }
};

// 4.7️⃣ Lấy tất cả transactions (phiếu nhập/xuất/chi...)
export const fetchTransactions = async () => {
  try {
    const res = await fetch(`${API_URL}/transactions`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Lỗi tải Transactions:', error);
    return [];
  }
};

// 5️⃣ Lấy Danh sách Khách Hàng / Đại Lý
export const fetchCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/customers`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

// 6️⃣ Lấy Danh sách Nhà Cung Cấp
export const fetchSuppliers = async () => {
  try {
    const res = await fetch(`${API_URL}/suppliers`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

// =======================================
// 🆘 SOS REPORTS (Báo cáo sự cố)
// =======================================
export const createSOSReport = async (data: {
  driverId: string;
  driverName: string;
  type: string;
  description: string;
  lat?: number;
  lng?: number;
  orderId?: string;
}) => {
  try {
    const res = await fetch(`${API_URL}/sos-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error('[SOS] Lỗi gửi báo cáo:', error);
    return { success: false };
  }
};

export const fetchDriverSOS = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/sos-reports/driver/${driverId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

// =======================================
// 🔔 NOTIFICATIONS (Thông báo)
// =======================================
export const fetchNotifications = async (userId: string) => {
  try {
    const res = await fetch(`${API_URL}/notifications/user/${userId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const markNotificationRead = async (id: string) => {
  try {
    await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
  } catch (error) {
    console.error('[NOTIF] Lỗi đánh dấu đã đọc:', error);
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  try {
    await fetch(`${API_URL}/notifications/read-all/${userId}`, { method: 'PUT' });
  } catch (error) {
    console.error('[NOTIF] Lỗi đánh dấu tất cả:', error);
  }
};

// =======================================
// 💰 DRIVER EXPENSES (Chi phí dọc đường)
// =======================================
export const createDriverExpense = async (data: {
  driverId: string;
  driverName: string;
  orderId?: string;
  type: string;
  amount: number;
  description: string;
}) => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error('[EXPENSE] Lỗi gửi chi phí:', error);
    return { success: false };
  }
};

export const fetchDriverExpenses = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses/driver/${driverId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

// =======================================
// 📅 DRIVER SCHEDULES (Lịch trình)
// =======================================
export const fetchDriverSchedules = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/driver-schedules/driver/${driverId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

// =======================================
// 🚛 TRIP STATUS & STATS
// =======================================
export const updateTripStatus = async (orderId: string, status: string) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (error) {
    console.error('[TRIP] Lỗi cập nhật trạng thái:', error);
    return { success: false };
  }
};

export const fetchDriverStats = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/driver-stats/${driverId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('[STATS] Lỗi tải thống kê:', error);
    return null;
  }
};

export const uploadTripDocuments = async (orderId: string, documents: any) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/${orderId}/documents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents }),
    });
    return await res.json();
  } catch (error) {
    console.error('[DOCS] Lỗi upload tài liệu:', error);
    return { success: false };
  }
};
