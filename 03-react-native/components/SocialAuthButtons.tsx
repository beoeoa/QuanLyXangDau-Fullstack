import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image, Platform } from 'react-native';

type SocialAuthProps = {
  onAuthSuccess: (result: any) => void;
  onError: (msg: string) => void;
  disabled: boolean;
};

let GoogleSignin: any;
let LoginManager: any;
let AccessToken: any;

if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  const fbsdk = require('react-native-fbsdk-next');
  LoginManager = fbsdk.LoginManager;
  AccessToken = fbsdk.AccessToken;

  GoogleSignin.configure({
    webClientId: '610440909699-8gbo0neolfv7ahg2du7csgeucdqn5gtj.apps.googleusercontent.com',
  });
}

// Nút đăng nhập MXH với màu sắc và phong cách giống Web
export default function SocialAuthButtons({ onAuthSuccess, onError, disabled }: SocialAuthProps) {

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      onError('Đăng nhập Google Native không hỗ trợ chạy trên Web. Vui lòng test trên máy ảo Android/iOS.');
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      // SỬA DÒNG NÀY: Dùng cú pháp bóc tách { data } mới của thư viện
      const { data } = await GoogleSignin.signIn();

      // SỬA DÒNG NÀY: Truy cập vào data.user.email để tránh lỗi undefined
      onAuthSuccess({
        email: data?.user?.email || 'N/A',
        isApproved: true,
        role: 'user',
        message: 'Google success demo'
      });
    } catch (error: any) {
      onError('Lỗi đăng nhập Google: ' + error.message);
    }
  };

  const handleFacebookLogin = async () => {
    if (Platform.OS === 'web') {
      onError('Đăng nhập Facebook Native không hỗ trợ chạy trên Web. Vui lòng test trên máy ảo Android/iOS.');
      return;
    }
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        onError('Người dùng đã hủy đăng nhập Facebook.');
        return;
      }
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        onError('Không thể lấy Facebook Access Token.');
        return;
      }
      onAuthSuccess({ email: 'fb_demo@example.com', isApproved: true, role: 'user', message: 'FB success demo' });
    } catch (error: any) {
      onError('Lỗi đăng nhập Facebook: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.googleBtn, disabled && styles.disabled]}
        onPress={handleGoogleLogin}
        disabled={disabled}
      >
        {/* Placeholder cho icon */}
        <Text style={styles.googleText}>G</Text>
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.fbBtn, disabled && styles.disabled]}
        onPress={handleFacebookLogin}
        disabled={disabled}
      >
        <Text style={styles.fbIcon}>f</Text>
        <Text style={[styles.btnText, styles.fbText]}>Tiếp tục với Facebook</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
  },
  fbBtn: {
    backgroundColor: '#1877f2', // Màu xanh đặc trưng của fb
    borderColor: '#1877f2',
  },
  disabled: {
    opacity: 0.6,
  },
  googleText: {
    marginRight: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#de5246',
  },
  fbIcon: {
    marginRight: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fbText: {
    color: '#ffffff',
  }
});
