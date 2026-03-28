import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, isHydrated, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Khôi phục Session khi mở App (Offline first)
  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Đăng ký Push Token khi đã có User
    if (user) {
      registerForPushNotificationsAsync(user.userId);
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Chưa đăng nhập -> chuyển sang login
      router.replace('/login');
    } else if (user) {
      // Đã đăng nhập -> Kiểm tra Role phân luồng
      if (user.role === 'admin') {
        if (segments[0] !== '(admin)') router.replace('/(admin)');
      } else {
        // Mặc định tài xế hoặc user
        if (segments[0] !== '(driver)') router.replace('/(driver)');
      }
    }
  }, [user, isHydrated, segments]);

  if (!isHydrated) return null; // Hoặc một màn hình loading màu nguyên khối

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
