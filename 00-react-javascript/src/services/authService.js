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
// AUTH SERVICE - XÃ¡c thá»±c ngÆ°á»i dÃ¹ng
// Firebase Auth váº«n cháº¡y á»Ÿ Frontend (xÃ¡c thá»±c)
// Firestore data => gá»i qua Backend API
// ============================================================



const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()

// Helper: Táº¡o hoáº·c láº¥y user doc qua Backend
const getOrCreateUserDoc = async (user, additionalData = {}) => {
  const res = await fetch(`${API_URL}/users/get-or-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      fullname: user.displayName || 'NgÆ°á»i DÃ¹ng',
      photoURL: user.photoURL || null,
      ...additionalData
    })
  })
  if (!res.ok) {
    const errData = await res.json()
    throw new Error(errData.message || errData.error || 'Lá»—i tá»« Backend')
  }
  return await res.json()
}

// âœ… ÄÄƒng kÃ½ vá»›i Email/Password
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
          message: 'âš ï¸ ÄÄƒng kÃ½ Auth OK nhÆ°ng Lá»–I lÆ°u dá»¯ liá»‡u: ' + (result.message || '')
        }
      }
    } catch (firestoreErr) {
      console.error('âŒ Backend save error:', firestoreErr.message)
      return {
        success: true,
        userId: user.uid,
        message: 'âš ï¸ ÄÄƒng kÃ½ Auth OK nhÆ°ng Lá»–I lÆ°u dá»¯ liá»‡u: ' + firestoreErr.message
      }
    }

    return {
      success: true,
      userId: user.uid,
      message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng, vui lÃ²ng chá» Admin duyá»‡t.'
    }
  } catch (error) {
    console.error('âŒ Register error:', error)
    let message = error.message || 'Lá»—i Ä‘Äƒng kÃ½'
    if (error.code === 'auth/email-already-in-use') message = 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng'
    else if (error.code === 'auth/weak-password') message = 'Máº­t kháº©u quÃ¡ yáº¿u (tá»‘i thiá»ƒu 6 kÃ½ tá»±)'
    else if (error.code === 'auth/invalid-email') message = 'Email khÃ´ng há»£p lá»‡'

    return { success: false, message }
  }
}

// âœ… ÄÄƒng nháº­p vá»›i Email/Password
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
      message: 'ÄÄƒng nháº­p thÃ nh cÃ´ng'
    }
  } catch (error) {
    console.error('âŒ Login error:', error.code, error.message, error)

    // Náº¿u lá»—i do máº¥t API backend (TypeError: Failed to fetch)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: 'KhÃ´ng thá»ƒ káº¿t ná»‘i vá»›i Backend Server (Failed to fetch). HÃ£y kiá»ƒm tra Server Node.js Ä‘Ã£ cháº¡y trÃªn port 8888 chÆ°a.' }
    }

    // Náº¿u lá»—i káº¿t ná»‘i API Database bÃ¡o vá»
    if (!error.code) {
      return { success: false, message: `Lá»—i Backend API: ${error.message}` }
    }

    let message = 'Email hoáº·c máº­t kháº©u khÃ´ng chÃ­nh xÃ¡c'
    if (error.code === 'auth/user-not-found') message = 'Email khÃ´ng tá»“n táº¡i'
    else if (error.code === 'auth/wrong-password') message = 'Máº­t kháº©u khÃ´ng chÃ­nh xÃ¡c'
    else if (error.code === 'auth/invalid-email') message = 'Email khÃ´ng há»£p lá»‡'
    else if (error.code === 'auth/invalid-credential') message = 'ThÃ´ng tin Ä‘Äƒng nháº­p khÃ´ng chÃ­nh xÃ¡c'

    return { success: false, message }
  }
}

// âœ… ÄÄƒng nháº­p vá»›i Google
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
      message: 'ÄÄƒng nháº­p Google thÃ nh cÃ´ng'
    }
  } catch (error) {
    console.error('Google login error:', error)
    return { success: false, message: error.message }
  }
}

// âœ… ÄÄƒng nháº­p vá»›i Facebook
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
      message: 'ÄÄƒng nháº­p Facebook thÃ nh cÃ´ng'
    }
  } catch (error) {
    console.error('Facebook login error:', error)
    return { success: false, message: error.message }
  }
}

// âœ… ÄÄƒng xuáº¥t
export const logout = async () => {
  try {
    await signOut(auth)
    return { success: true, message: 'ÄÄƒng xuáº¥t thÃ nh cÃ´ng' }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, message: error.message }
  }
}

// âœ… QuÃªn máº­t kháº©u
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email)
    return { success: true, message: 'ÄÆ°á»ng dáº«n Ä‘áº·t láº¡i máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c gá»­i! Vui lÃ²ng kiá»ƒm tra há»™p thÆ° Ä‘áº¿n (vÃ  má»¥c Spam) cá»§a email: ' + email }
  } catch (error) {
    console.error('Reset password error:', error)
    let message = 'Lá»—i há»‡ thá»‘ng khi gá»­i email Ä‘áº·t láº¡i máº­t kháº©u.'
    if (error.code === 'auth/user-not-found') message = 'Email khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng. Vui lÃ²ng kiá»ƒm tra láº¡i.'
    else if (error.code === 'auth/invalid-email') message = 'Äá»‹nh dáº¡ng email khÃ´ng há»£p lá»‡.'
    return { success: false, message }
  }
}

// âœ… Láº¯ng nghe thay Ä‘á»•i auth state
export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback)
}

// âœ… Kiá»ƒm tra role cá»§a user qua Backend API
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
    return { success: false, message: 'Lá»—i kiá»ƒm tra vai trÃ²' }
  }
}

