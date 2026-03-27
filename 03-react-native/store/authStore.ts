import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface UserInfo {
  userId: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
  token?: string; // JWT token nếu có từ backend
}

interface AuthState {
  user: UserInfo | null;
  isHydrated: boolean; 
  login: (userInfo: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  
  login: async (userInfo) => {
    // Bảo mật: Mã hóa và lưu thông tin đăng nhập vào Secure Store (Không dùng AsyncStorage hớ hênh)
    await SecureStore.setItemAsync('user_session', JSON.stringify(userInfo));
    set({ user: userInfo });
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('user_session');
    set({ user: null });
  },
  
  hydrate: async () => {
    // Offline-First: Khi vừa mở App lên, đọc từ Secure Store xem có phiên cũ không
    try {
      const sessionStr = await SecureStore.getItemAsync('user_session');
      if (sessionStr) {
        const user = JSON.parse(sessionStr);
        set({ user });
      }
    } catch (e) {
      console.log('Lỗi đọc session từ SecureStore:', e);
    } finally {
      set({ isHydrated: true });
    }
  }
}));
