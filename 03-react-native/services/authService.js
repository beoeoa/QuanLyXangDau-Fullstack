import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential
} from 'firebase/auth'
import { auth } from './firebaseConfig'
import { Platform, NativeModules, Alert } from 'react-native'

// Tự động nhận diện IP LAN của máy tính đang chạy Expo
const getApiUrl = () => {
  const envUrl = typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_URL : null
  if (envUrl && typeof envUrl === 'string') return envUrl

  // Luôn trả về URL Render cho môi trường Production/Staging trên điện thoại thật
  return 'https://quanlyxangdau-fullstack.onrender.com/api'
}

const API_URL = getApiUrl()

// Helper để parse JSON an toàn tuyệt đối
const safeParseJSON = async (res) => {
  try {
    const text = await res.text().catch(() => "");
    if (!text || text.trim() === "") {
      console.log(`[API] Response body is empty (Status: ${res.status})`);
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn(`[API] Invalid JSON received (Status: ${res.status}):`, text.substring(0, 100));
      return null;
    }
  } catch (err) {
    console.error('[API] Error in safeParseJSON:', err.message);
    return null;
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

const getOrCreateUserDoc = async (user, additionalData = {}) => {
  if (!user || !user.uid) return null;

  try {
    const url = `${API_URL}/users/get-or-create?t=${Date.now()}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        fullname: user.displayName || 'Người Dùng',
        photoURL: user.photoURL || null,
        ...additionalData
      })
    });

    const text = await res.text().catch(() => "");
    
    if (!res.ok) {
      console.warn(`[API] Server error ${res.status}: ${text}`);
      throw new Error(`Lỗi Server (${res.status})`);
    }

    if (!text || text.trim() === "") {
      throw new Error("Server trả về phản hồi rỗng.");
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("[DEBUG] Dữ liệu lỗi JSON:", text);
      // Hiển thị Alert để anh chụp màn hình lỗi cho em xem
      Alert.alert("Lỗi dữ liệu API", "Server trả về nội dung không phải JSON: " + text.substring(0, 50));
      throw new Error("Dữ liệu từ Server bị lỗi định dạng JSON.");
    }
  } catch (err) {
    console.error('[API] getOrCreateUserDoc Error:', err.message);
    throw err;
  }
}

// ✅ Đăng ký với Email/Password
export const registerWithEmail = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    try {
      const res = await fetchWithTimeout(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: email,
          fullname: userData.fullname,
          role: 'pending',
          photoURL: userData.photoURL || null,
          phone: userData.phone || '',
          address: userData.address || '',
          isApproved: false
        })
      })
      
      const result = await safeParseJSON(res);

      if (!res.ok || !result?.success) {
        return {
          success: true,
          userId: user.uid,
          message: '⚠️ Đăng ký Auth OK nhưng LỖI lưu dữ liệu: ' + (result?.message || `HTTP ${res.status}`)
        }
      }
    } catch (apiErr) {
      console.error('❌ Backend save error:', apiErr.message)
      return {
        success: true,
        userId: user.uid,
        message: '⚠️ Đăng ký Auth OK nhưng LỖI API: ' + apiErr.message
      }
    }

    return {
      success: true,
      userId: user.uid,
      message: 'Đăng ký thành công, vui lòng chờ Admin duyệt.'
    }
  } catch (error) {
    console.error('❌ Register error:', error)
    let message = error.message || 'Lỗi đăng ký'
    if (error.code === 'auth/email-already-in-use') message = 'Email đã được sử dụng'
    else if (error.code === 'auth/weak-password') message = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)'
    else if (error.code === 'auth/invalid-email') message = 'Email không hợp lệ'

    return { success: false, message }
  }
}

// ✅ Đăng nhập với Email/Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    const userData = await getOrCreateUserDoc(user)

    return {
      success: true,
      userId: userData.uid || user.uid,
      email: userData.email || user.email,
      name: userData.fullname,
      role: userData.role,
      isApproved: userData.isApproved,
      isProfileUpdated: !!(userData.phone && userData.address && userData.cccd),
      message: 'Đăng nhập thành công'
    }
  } catch (error) {
    console.error('❌ Login error FULL:', error)
    if (error?.name === 'AbortError') {
      return { success: false, message: 'Kết nối Backend bị timeout (do Render đang khởi động). Vui lòng thử lại sau 10 giây.' }
    }
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return { success: false, message: 'Không thể kết nối Backend API. Kiểm tra mạng hoặc IP server.' }
    }

    let message = error.message || 'Đăng nhập thất bại (Lỗi hệ thống)'
    if (error.code === 'auth/user-not-found') message = 'Email không tồn tại'
    else if (error.code === 'auth/wrong-password') message = 'Mật khẩu không chính xác'
    else if (error.code === 'auth/invalid-email') message = 'Email không hợp lệ'
    else if (error.code === 'auth/invalid-credential') message = 'Thông tin đăng nhập không chính xác'

    return { success: false, message: error.code ? message : error.message }
  }
}

// ✅ Đăng nhập bằng Social (Google / Facebook)
export const loginWithSocial = async (idToken, providerType) => {
  try {
    let credential;
    if (providerType === 'google') {
      credential = GoogleAuthProvider.credential(idToken);
    } else if (providerType === 'facebook') {
      credential = FacebookAuthProvider.credential(idToken);
    } else {
      throw new Error('Loại xác thực không hỗ trợ');
    }

    // 1. Đăng nhập vào Firebase bằng Credential
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    // 2. Lấy hoặc Tạo User Document trên Backend
    const userData = await getOrCreateUserDoc(user);

    return {
      success: true,
      userId: userData?.uid || user.uid,
      email: userData?.email || user.email,
      name: userData?.fullname || user.displayName,
      role: userData?.role || 'pending',
      isApproved: userData?.isApproved || false,
      message: 'Đăng nhập Social thành công'
    };
  } catch (error) {
    console.error(`❌ Social Login (${providerType}) error:`, error);
    return { 
      success: false, 
      message: error.message || 'Lỗi khi kết nối với mạng xã hội' 
    };
  }
};

// ✅ Đăng xuất
export const logout = async () => {
  try {
    await signOut(auth)
    return { success: true, message: 'Đăng xuất thành công' }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, message: error.message }
  }
}

// ✅ Quên mật khẩu
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email)
    return { success: true, message: 'Đường dẫn đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư email.' }
  } catch (error) {
    console.error('Reset password error:', error)
    let message = 'Lỗi hệ thống khi gửi email đặt lại mật khẩu.'
    if (error.code === 'auth/user-not-found') message = 'Email không tồn tại trong hệ thống.'
    return { success: false, message }
  }
}

// ✅ Lắng nghe thay đổi trạng thái
export const onAuthStateChangedListener = (callback) => {
  return auth.onAuthStateChanged(callback)
}

// ✅ Xác nhận role
export const verifyUserRole = async (userId, expectedRole) => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/users/verify-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, expectedRole })
    })
    return await safeParseJSON(res) || { success: false, message: 'Lỗi phản hồi' };
  } catch (error) {
    console.error('Verify role error:', error)
    return { success: false, message: 'Lỗi kiểm tra vai trò' }
  }
}
