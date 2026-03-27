import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushLocationToBackend } from './dataService';

// Tên định danh cho Nhiệm vụ chạy nền
const LOCATION_TASK_NAME = 'background-location-task';

// --- ĐỊNH NGHĨA TASK CHẠY NGẦM DÙNG CHUNG TOÀN APP ---
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Lỗi Background Location:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const latestLocation = locations[0];
    const { latitude, longitude } = latestLocation.coords;
    
    try {
      // 1. Lấy orderId từ Storage (do Thread ngầm không có State)
      const activeOrderId = await AsyncStorage.getItem('activeOrderId');
      if (activeOrderId) {
        // 2. Bắn tọa độ thật lên Server cho Admin xem
        await pushLocationToBackend(activeOrderId, latitude, longitude);
      } else {
        console.log(`[GPS] Có tọa độ LAT ${latitude}, LNG ${longitude} nhưng thiếu Order ID`);
      }
    } catch (e) {
      console.error('Lỗi gửi GPS ngầm:', e);
    }
  }
});

// --- HÀM BẬT CHẾ ĐỘ RÌNH RẬP GPS (Dùng khi tài xế bấm nút BẮT ĐẦU CHẠY) ---
export const startBackgroundTracking = async (orderId: string) => {
  await AsyncStorage.setItem('activeOrderId', orderId.toString());

  // 1. Xin quyền khi mở App
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Từ chối quyền vị trí Foreground');
    return;
  }

  // 2. Xin đặc quyền chạy Nền (Always Allow) bắt buộc cho Logistics
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Từ chối quyền vị trí Background');
    return;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Tối ưu pin, lấy sai số khoảng 5-10m là đủ theo dõi xe tải
      distanceInterval: 50, // DYNAMIC TRACKING: Chỉ bắn tín hiệu khi xe ĐÃ DI CHUYỂN quá 50 mét
      deferredUpdatesInterval: 3 * 60 * 1000, // BATCHING: Đợi 3 phút gom 1 cục tọa độ bắn đi để tiết kiệm 3G
      showsBackgroundLocationIndicator: true, // Hiện icon GPS trên cùng thanh trượt điện thoại
      foregroundService: {
        notificationTitle: 'Hệ thống Quản Lý Xăng Dầu',
        notificationBody: 'Đang bảo vệ trạng thái chuyến đi bằng định vị GPS...',
        notificationColor: '#ffb703',
      },
    });
    console.log('✅ Đã kích hoạt radar theo dõi GPS chạy ngầm thành công!');
  }
};

// --- HÀM TẮT CHẾ ĐỘ (Dùng khi tài xế bấm HOÀN THÀNH) ---
export const stopBackgroundTracking = async () => {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    await AsyncStorage.removeItem('activeOrderId');
    console.log('🛑 Đã tắt radar theo dõi ngầm.');
  }
};

// --- FOREGROUND WATCH: Theo dõi GPS realtime cho bản đồ (chỉ khi app đang mở) ---
export const startForegroundWatch = async (
  callback: (location: Location.LocationObject) => void
): Promise<Location.LocationSubscription | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('Từ chối quyền vị trí Foreground');
    return null;
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,     // Cập nhật mỗi 5 mét
      timeInterval: 3000,      // Hoặc mỗi 3 giây
    },
    callback
  );

  console.log('📍 Đã bật theo dõi GPS foreground cho bản đồ');
  return subscription;
};

// --- LẤY VỊ TRÍ HIỆN TẠI 1 LẦN ---
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  return await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
};
