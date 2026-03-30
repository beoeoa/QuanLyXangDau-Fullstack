import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'

// ============================================================
// FIREBASE CONFIG - Sử dụng biến môi trường (Environment Variables)
// Bảo mật API Key và đồng bộ với cấu hình .env
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig)

// Khởi tạo Auth (vẫn giữ ở Frontend)
export const auth = getAuth(app)

// Khởi tạo Google Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Khởi tạo Facebook Provider
export const facebookProvider = new FacebookAuthProvider()
facebookProvider.addScope('public_profile')
facebookProvider.addScope('email')

export default app
