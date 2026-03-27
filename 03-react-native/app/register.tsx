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
import { registerWithEmail } from '../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.fullname.trim()) return 'Vui lòng nhập họ tên';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Email không hợp lệ';
    if (!formData.phone.trim() || !/^(0[0-9]{9,10})$/.test(formData.phone.replace(/\s/g, ''))) return 'Số điện thoại không hợp lệ (VD: 0901234567)';
    if (!formData.address.trim()) return 'Vui lòng nhập địa chỉ';
    if (!formData.password || formData.password.length < 6) return 'Mật khẩu phải từ 6 ký tự';
    if (formData.password !== formData.confirmPassword) return 'Mật khẩu xác nhận không khớp';
    return null; // OK
  };

  const handleRegister = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert('Lỗi', errorMsg);
      return;
    }

    setIsLoading(true);
    const result = await registerWithEmail(
      formData.email,
      formData.password,
      {
        fullname: formData.fullname,
        phone: formData.phone,
        address: formData.address
      }
    );
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Thành công', result.message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Đăng Ký</Text>
          <Text style={styles.subtitle}>Tạo tài khoản hệ thống mới</Text>
        </View>

        <View style={styles.formContainer}>
          
          <SocialAuthButtons 
            onAuthSuccess={() => {}} 
            onError={handleSocialError} 
            disabled={isLoading} 
          />
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>hoặc đăng ký bằng email</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.label}>Họ và tên</Text>
          <TextInput style={styles.input} placeholder="Nguyễn Văn A" value={formData.fullname} onChangeText={(val) => handleChange('fullname', val)} />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="you@example.com" value={formData.email} onChangeText={(val) => handleChange('email', val)} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} placeholder="0901234567" value={formData.phone} onChangeText={(val) => handleChange('phone', val)} keyboardType="phone-pad" />

          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} placeholder="123 Đường ABC..." value={formData.address} onChangeText={(val) => handleChange('address', val)} />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput style={styles.input} placeholder="••••••••" value={formData.password} onChangeText={(val) => handleChange('password', val)} secureTextEntry />

          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <TextInput style={styles.input} placeholder="••••••••" value={formData.confirmPassword} onChangeText={(val) => handleChange('confirmPassword', val)} secureTextEntry />

          <TouchableOpacity style={[styles.btnSubmit, isLoading && styles.btnDisabled]} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Đăng Ký</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 15 },
  backText: { color: '#0070f3', fontSize: 16, fontWeight: '600' },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { marginHorizontal: 10, color: '#aaa', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  btnSubmit: { backgroundColor: '#0070f3', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#666', fontSize: 14 },
  linkText: { color: '#0070f3', fontSize: 14, fontWeight: 'bold' }
});
