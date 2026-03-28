import API_BASE from './apiConfig';
const API_URL = API_BASE;
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
  });

  const textBody = await res.text().catch(() => "");

  // Xử lý khi Backend báo lỗi (4xx, 5xx)
  if (!res.ok) {
    let errData = { error: 'Unknown server error' };
    if (textBody) {
      try { errData = JSON.parse(textBody); } catch (e) { errData.error = textBody; }
    }
    const errMsg = errData.message || errData.error || `Lỗi từ Backend (${res.status})`;
    throw new Error(errMsg);
  }

  // Xử lý khi phản hồi rỗng (Status 200 nhưng không có body)
  if (!textBody || textBody.trim() === "") {
    console.warn('[Backend] Received empty response body for get-or-create');
    // Fallback: Nếu là Admin đăng nhập thì cũng cần lấy role từ Backend, 
    // Trả về dữ liệu tối thiểu và cảnh báo lỗi.
    throw new Error("Máy chủ trả về dữ liệu trống. Vui lòng thử lại.");
  }

  try {
    return JSON.parse(textBody);
  } catch (e) {
    console.error('[Backend] JSON Parse Error:', e.message, textBody);
    throw new Error('Dữ liệu từ máy chủ không đúng định dạng JSON.');
  }
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
        message: '⚠️ Đăng ký Auth OK nhưng LỖI API: ' + firestoreErr.message
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

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: 'Không thể kết nối với Backend Server (Failed to fetch).' }
    }

    return { success: false, message: error.message }
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
    return { success: true, message: 'Đường dẫn đặt lại mật khẩu đã được gửi!' }
  } catch (error) {
    console.error('Reset password error:', error)
    return { success: false, message: 'Lỗi khi gửi email đặt lại mật khẩu.' }
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
