import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'

// ============================================================
// FIREBASE CONFIG - Chỉ giữ Auth cho Frontend
// Mọi thao tác Firestore đã được chuyển sang Backend API
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBKpmlQ8f4VkkyzGftw7a0Qy_z11fkXe-8",
  authDomain: "quanlyxangdau-3fa49.firebaseapp.com",
  projectId: "quanlyxangdau-3fa49",
  storageBucket: "quanlyxangdau-3fa49.firebasestorage.app",
  messagingSenderId: "255173081788",
  appId: "1:255173081788:web:70cd57d9ed5b4ff38a2eb9",
  measurementId: "G-DZFEET01S9"
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
