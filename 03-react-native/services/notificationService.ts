import { Platform } from 'react-native';
import { db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export async function registerForPushNotificationsAsync(userId: string): Promise<string | undefined> {
  // 🟢 FIXED: Expo Go không hỗ trợ expo-device & notifications token nên bị Crash App (InternalBytecode.js/ExpoDevice.js) 
  // Vì vậy trong môi trường Dev/Expo Go, code này sẽ không import chúng để tránh crash.
  // Khi triển khai file APK/AAB bằng EAS Build, có thể bật lại.
  console.log('[Push] Notification bị vô hiệu hóa tạm thời để tránh crash trên Expo Go.');
  return undefined;
}
