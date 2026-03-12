import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '../firebase'

// ============================================================
// AUTH SERVICE - Xác thực người dùng
// Firebase Auth vẫn chạy ở Frontend (xác thực)
// Firestore data => gọi qua Backend API
// ============================================================

const API_URL = 'http://localhost:8080/api'

const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()

// Helper: Tạo hoặc lấy user doc qua Backend
const getOrCreateUserDoc = async (user, additionalData = {}) => {
  const res = await fetch(`${API_URL}/users/get-or-create`, {
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
}

// ✅ Đăng ký với Email/Password
export const registerWithEmail = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    try {
      const res = await fetch(`${API_URL}/users/register`, {
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
    } catch (firestoreErr) {
      console.error('❌ Backend save error:', firestoreErr.message)
      return {
        success: true,
        userId: user.uid,
        message: '⚠️ Đăng ký Auth OK nhưng LỖI lưu dữ liệu: ' + firestoreErr.message
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
    console.error('❌ Login error:', error.code, error.message, error)

    // Nếu lỗi do mất API backend (TypeError: Failed to fetch)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: 'Không thể kết nối với Backend Server (Failed to fetch). Hãy kiểm tra Server Node.js đã chạy trên port 8888 chưa.' }
    }

    // Nếu lỗi kết nối API Database báo về
    if (!error.code) {
      return { success: false, message: `Lỗi Backend API: ${error.message}` }
    }

    let message = 'Email hoặc mật khẩu không chính xác'
    if (error.code === 'auth/user-not-found') message = 'Email không tồn tại'
    else if (error.code === 'auth/wrong-password') message = 'Mật khẩu không chính xác'
    else if (error.code === 'auth/invalid-email') message = 'Email không hợp lệ'
    else if (error.code === 'auth/invalid-credential') message = 'Thông tin đăng nhập không chính xác'

    return { success: false, message }
  }
}

// ✅ Đăng nhập với Google
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    const userData = await getOrCreateUserDoc(user)

    return {
      success: true,
      userId: userData.uid || user.uid,
      email: userData.email || user.email,
      name: userData.fullname,
      role: userData.role,
      isApproved: userData.isApproved,
      isProfileUpdated: !!(userData.phone && userData.address && userData.cccd),
      message: 'Đăng nhập Google thành công'
    }
  } catch (error) {
    console.error('Google login error:', error)
    return { success: false, message: error.message }
  }
}

// ✅ Đăng nhập với Facebook
export const loginWithFacebook = async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider)
    const user = result.user

    const userData = await getOrCreateUserDoc(user)

    return {
      success: true,
      userId: userData.uid || user.uid,
      email: userData.email || user.email,
      name: userData.fullname,
      role: userData.role,
      isApproved: userData.isApproved,
      isProfileUpdated: !!(userData.phone && userData.address && userData.cccd),
      message: 'Đăng nhập Facebook thành công'
    }
  } catch (error) {
    console.error('Facebook login error:', error)
    return { success: false, message: error.message }
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
    return { success: true, message: 'Đường dẫn đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư đến (và mục Spam) của email: ' + email }
  } catch (error) {
    console.error('Reset password error:', error)
    let message = 'Lỗi hệ thống khi gửi email đặt lại mật khẩu.'
    if (error.code === 'auth/user-not-found') message = 'Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại.'
    else if (error.code === 'auth/invalid-email') message = 'Định dạng email không hợp lệ.'
    return { success: false, message }
  }
}

// ✅ Lắng nghe thay đổi auth state
export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback)
}

// ✅ Kiểm tra role của user qua Backend API
export const verifyUserRole = async (userId, expectedRole) => {
  try {
    const res = await fetch(`${API_URL}/users/verify-role`, {
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
