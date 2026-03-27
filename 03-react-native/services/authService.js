import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from './firebaseConfig'
import { Platform, NativeModules } from 'react-native'

// Tự động nhận diện IP LAN của máy tính đang chạy Expo
const getLocalIp = () => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/http:\/\/([^:]+):/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {}
  return '192.168.1.33';
};

const LAN_IP = getLocalIp();

const getApiUrl = () => {
  const envUrl = typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_URL : null
  if (envUrl && typeof envUrl === 'string') return envUrl

  if (__DEV__) {
    // URL cố định của backend trên Render (production)
    return 'https://quanlyxangdau-fullstack.onrender.com/api'
  }
  return 'https://api.yourbackend.com/api'
}

const API_URL = getApiUrl()

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

const getOrCreateUserDoc = async (user, additionalData = {}) => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/users/get-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        fullname: user.displayName || 'Người Dùng',
        photoURL: user.photoURL || null,
        ...additionalData
      })
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.message || errData.error || 'Lỗi từ Backend')
    }
    return await res.json()
  } catch (err) {
    throw err
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
      const result = await res.json()

      if (!result.success) {
        return {
          success: true,
          userId: user.uid,
          message: '⚠️ Đăng ký Auth OK nhưng LỖI lưu dữ liệu: ' + (result.message || '')
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
    console.error('❌ Login error:', error)
    if (error?.name === 'AbortError') {
      return { success: false, message: 'Kết nối Backend bị timeout. Kiểm tra API URL (EXPO_PUBLIC_API_URL) hoặc mạng.' }
    }
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return { success: false, message: 'Không thể kết nối Backend API. Kiểm tra mạng hoặc IP server.' }
    }

    let message = 'Email hoặc mật khẩu không chính xác'
    if (error.code === 'auth/user-not-found') message = 'Email không tồn tại'
    else if (error.code === 'auth/wrong-password') message = 'Mật khẩu không chính xác'
    else if (error.code === 'auth/invalid-email') message = 'Email không hợp lệ'
    else if (error.code === 'auth/invalid-credential') message = 'Thông tin đăng nhập không chính xác'

    return { success: false, message: error.code ? message : error.message }
  }
}

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
    return await res.json()
  } catch (error) {
    console.error('Verify role error:', error)
    return { success: false, message: 'Lỗi kiểm tra vai trò' }
  }
}
