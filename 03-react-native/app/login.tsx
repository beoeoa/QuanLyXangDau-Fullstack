import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { loginWithEmail, resetPassword } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const setLogin = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    const result = await loginWithEmail(email, password);
    setIsLoading(false);

    if (result.success) {
      if (!result.isApproved && result.role !== 'admin') {
        Alert.alert('Thông báo', 'Tài khoản của bạn đang chờ Admin duyệt. Xin vui lòng đợi.');
        return;
      }
      if (!result.role || result.role === 'pending') {
        Alert.alert('Thông báo', 'Tài khoản chưa được phân quyền. Vui lòng liên hệ Admin.');
        return;
      }

      // Đăng nhập thành công -> Lưu vào Secure Store (Offline-First)
      await setLogin({
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        isApproved: result.isApproved,
      });

      Alert.alert('Thành công', result.message);

      // Chặn các role không phải admin/driver trên mobile
      if (result.role === 'admin') {
        router.replace('/(admin)');
      } else if (result.role === 'driver') {
        router.replace('/(driver)');
      } else {
        setIsLoading(false);
        Alert.alert('Thất bại', 'Vui lòng sử dụng Web cho vai trò của bạn.');
        return;
      }
    } else {
      Alert.alert('Đăng nhập thất bại', result.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ Email của bạn lên ô bên trên để Đặt lại mật khẩu.');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Thành công', result.message);
    } else {
      Alert.alert('Thất bại', result.message);
    }
  };

  const handleSocialError = (msg: string) => {
    Alert.alert('Thông báo', msg);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Đăng Nhập</Text>
          <Text style={styles.subtitle}>Chào mừng bạn quay lại hệ thống</Text>
        </View>

        {/* Form Đăng Nhập */}
        <View style={styles.formContainer}>

          <SocialAuthButtons
            onAuthSuccess={async (result) => {
              if (result.success) {
                // Xử lý giống hệt login Email thành công
                if (!result.isApproved && result.role !== 'admin') {
                  Alert.alert('Thông báo', 'Tài khoản của bạn đang chờ Admin duyệt.');
                  return;
                }
                
                await setLogin({
                  userId: result.userId,
                  email: result.email,
                  name: result.name,
                  role: result.role,
                  isApproved: result.isApproved,
                });

                if (result.role === 'admin') router.replace('/(admin)');
                else if (result.role === 'driver') router.replace('/(driver)');
              } else {
                Alert.alert('Thất bại', result.message);
              }
            }}
            onError={handleSocialError}
            disabled={isLoading}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>hoặc đăng nhập bằng email</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotPassBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotPassText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSubmit, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Đăng Nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.linkText}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { marginHorizontal: 10, color: '#aaa', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  forgotPassBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPassText: { color: '#0070f3', fontSize: 14, fontWeight: '500' },
  btnSubmit: { backgroundColor: '#0070f3', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#666', fontSize: 14 },
  linkText: { color: '#0070f3', fontSize: 14, fontWeight: 'bold' }
});
