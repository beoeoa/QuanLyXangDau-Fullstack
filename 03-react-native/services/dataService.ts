import { Platform, NativeModules } from 'react-native';

const getApiUrl = () => {
  const envUrl = (process?.env as any)?.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string') return envUrl;

  if (__DEV__) {
    return 'http://10.0.2.2:3001/api';
  }

  return 'https://quanlyxangdau-fullstack.onrender.com/api';
};

const safeParseJSON = async (res: Response) => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn('[API] Phản hồi không phải JSON:', res.url);
    return null;
  }
};

const API_URL = getApiUrl();

// ─── Firebase Storage Upload ────────────────────────────────────────────────
let _storageReady = false;
let _storageRef: any = null;
let _uploadBytes: any = null;
let _getDownloadURL: any = null;

const initStorage = async () => {
  if (_storageReady) return true;
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const cfg = {
      apiKey: (process.env as any).EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: (process.env as any).EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: (process.env as any).EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: (process.env as any).EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: (process.env as any).EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: (process.env as any).EXPO_PUBLIC_FIREBASE_APP_ID || '',
    };
    const app = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
    const storage = getStorage(app);
    _storageRef = (path: string) => ref(storage, path);
    _uploadBytes = uploadBytes;
    _getDownloadURL = getDownloadURL;
    _storageReady = true;
    return true;
  } catch (e) {
    console.warn('[STORAGE] Firebase Storage chưa cấu hình:', e);
    return false;
  }
};

/**
 * Upload ảnh từ localUri (file://) lên Firebase Storage.
 * Trả về download URL để lưu vào Firestore.
 */
export const uploadImageToFirebase = async (localUri: string, path: string): Promise<string> => {
  const ok = await initStorage();
  if (!ok) throw new Error('Firebase Storage chưa khởi tạo');
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = _storageRef(path);
  await _uploadBytes(storageRef, blob);
  return await _getDownloadURL(storageRef);
};



export const fetchDriverOrders = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/driver/${driverId}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return null;
    return await safeParseJSON(res);
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu Chuyến Đi:', error);
    return null;
  }
};

export const fetchFleetVehicles = async () => {
  try {
    const res = await fetch(`${API_URL}/fleet-vehicles`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi khi tải Danh sách Xe bồn:', error);
    return [];
  }
};

export const fetchAllStats = async () => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/all-stats`);
    if (!res.ok) return null;
    return await safeParseJSON(res);
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu Thống kê Admin:', error);
    return null;
  }
};

export const pushLocationToBackend = async (orderId: string, lat: number, lng: number) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/${orderId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    if (!res.ok) console.warn('[NET] Lỗi Server khi đẩy GPS');
    else console.log(`[NET] Đã cập nhật GPS thành công. Lệnh ID: ${orderId}`);
  } catch (error) {
    console.error('[NET] Mất mạng! Không đẩy được GPS:', error);
  }
};

export const fetchDeliveryLogs = async () => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi tải Nhật ký:', error);
    return [];
  }
};

export const fetchOrders = async () => {
  try {
    const res = await fetch(`${API_URL}/orders`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi tải Orders:', error);
    return [];
  }
};

export const fetchAllDriverExpenses = async () => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi tải Driver Expenses:', error);
    return [];
  }
};

export const fetchTransactions = async () => {
  try {
    const res = await fetch(`${API_URL}/transactions`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi tải Transactions:', error);
    return [];
  }
};

export const fetchUsers = async () => {
  try {
    const res = await fetch(`${API_URL}/users`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) {
    console.error('Lỗi tải Users:', error);
    return [];
  }
};

export const fetchCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/customers`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) { return []; }
};

export const fetchSuppliers = async () => {
  try {
    const res = await fetch(`${API_URL}/suppliers`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) { return []; }
};

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
    return await safeParseJSON(res) || { success: false };
  } catch (error) {
    console.error('[SOS] Lỗi gửi báo cáo:', error);
    return { success: false };
  }
};

export const fetchDriverSOS = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/sos-reports/driver/${driverId}`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) { return []; }
};

export const fetchNotifications = async (userId: string) => {
  try {
    const res = await fetch(`${API_URL}/notifications/user/${userId}`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
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
    return await safeParseJSON(res) || { success: false };
  } catch (error) {
    console.error('[EXPENSE] Lỗi gửi chi phí:', error);
    return { success: false };
  }
};

export const fetchDriverExpenses = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses/driver/${driverId}`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) { return []; }
};

export const fetchDriverSchedules = async (driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/driver-schedules/driver/${driverId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const updateTripStatus = async (orderId: string, status: string, extraData: any = {}) => {
  try {
    const res = await fetch(`${API_URL}/delivery-orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extraData }),
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

export const fetchFuelPrices = async () => {
  try {
    const res = await fetch(`${API_URL}/fuel-prices`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const fetchContracts = async () => {
  try {
    const res = await fetch(`${API_URL}/contracts`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const fetchAllSchedules = async () => {
  try {
    const res = await fetch(`${API_URL}/driver-schedules`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const fetchAuditLogs = async () => {
  try {
    const res = await fetch(`${API_URL}/audit-logs`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const updateExpenseStatus = async (id: string, status: string, rejectionReason?: string) => {
  try {
    const res = await fetch(`${API_URL}/driver-expenses/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });
    return await res.json();
  } catch (error) {
    return { success: false };
  }
};

export const fetchSOSReports = async () => {
  try {
    const res = await fetch(`${API_URL}/sos-reports`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) { return []; }
};

export const updateSOSStatus = async (id: string, status: string) => {
  try {
    const res = await fetch(`${API_URL}/sos-reports/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (error) { return { success: false }; }
};

export const fetchInventory = async () => {
  try {
    const res = await fetch(`${API_URL}/inventory`);
    if (!res.ok) return [];
    return await safeParseJSON(res) || [];
  } catch (error) { return []; }
};

export const fetchMonthlyRevenue = async () => {
  try {
    const [orders, expenses, salesOrders] = await Promise.all([
      fetch(`${API_URL}/delivery-orders`).then(r => r.ok ? safeParseJSON(r) : []),
      fetch(`${API_URL}/driver-expenses`).then(r => r.ok ? safeParseJSON(r) : []),
      fetch(`${API_URL}/orders`).then(r => r.ok ? safeParseJSON(r) : []),
    ]);

    const now = new Date();
    const months: { label: string; rev: number; exp: number }[] = [];

    const getPricing = (orderId: string, product: string) => {
      const o = (salesOrders as any[]).find(so => so.id === orderId) || {};
      const i = (o.items || []).find((it: any) => it.product === product) || { costPrice: 20000, margin: 500, freight: 200 };
      const cost = Number(i.costPrice || 0);
      const margin = Number(i.margin || 0);
      const freight = Number(i.freight || 0);
      return { cost, totalUnit: (cost + margin + freight) || 20700 };
    };

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `T${d.getMonth() + 1}`;

      const mOrders = (orders as any[]).filter((o: any) => {
        const t = o.updatedAt?._seconds ? new Date(o.updatedAt._seconds * 1000) : new Date(o.updatedAt || o.createdAt || 0);
        return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear() && o.status === 'completed';
      });

      const mExp = (expenses as any[]).filter((e: any) => {
        const t = new Date(e.date || e.createdAt || 0);
        return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear() && e.status === 'approved';
      });

      let rev = 0;
      let costGoods = 0;
      mOrders.forEach(o => {
        const p = getPricing(o.orderId, o.product);
        const qty = Number(o.amount) || 0;
        rev += qty * p.totalUnit;
        costGoods += qty * p.cost;
      });

      const driverExp = mExp.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      months.push({ label, rev, exp: costGoods + driverExp });
    }
    return months;
  } catch (error) {
    console.error('[STATS] Lỗi tính toán lợi nhuận tháng:', error);
    return [];
  }
};
