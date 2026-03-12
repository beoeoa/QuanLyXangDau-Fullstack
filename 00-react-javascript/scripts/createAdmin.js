// ============================================================
// Script tạo tài khoản Admin
// Chạy: node scripts/createAdmin.js
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBKpmlQ8f4VkkyzGftw7a0Qy_z11fkXe-8",
    authDomain: "quanlyxangdau-3fa49.firebaseapp.com",
    projectId: "quanlyxangdau-3fa49",
    storageBucket: "quanlyxangdau-3fa49.firebasestorage.app",
    messagingSenderId: "255173081788",
    appId: "1:255173081788:web:70cd57d9ed5b4ff38a2eb9",
    measurementId: "G-DZFEET01S9"
}

// ============================================================
// ⚙️ THAY ĐỔI THÔNG TIN ADMIN TẠI ĐÂY
// ============================================================
const ADMIN_EMAIL = 'admin@quanlyxangdau.com'
const ADMIN_PASSWORD = 'admin123456'
const ADMIN_FULLNAME = 'Quản Trị Viên'
const ADMIN_PHONE = '0900000000'
const ADMIN_ADDRESS = 'Văn phòng quản lý'
// ============================================================

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createAdmin() {
    try {
        console.log('🔄 Đang tạo tài khoản Admin...')
        console.log(`📧 Email: ${ADMIN_EMAIL}`)
        console.log(`🔑 Password: ${ADMIN_PASSWORD}`)

        // Tạo user trong Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
        const user = userCredential.user
        console.log('✅ Firebase Auth user created:', user.uid)

        // Lưu role vào displayName
        await updateProfile(user, { displayName: 'admin' })
        console.log('✅ Role saved to Auth metadata')

        // Lưu vào Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: ADMIN_EMAIL,
            fullname: ADMIN_FULLNAME,
            role: 'admin',
            phone: ADMIN_PHONE,
            address: ADMIN_ADDRESS,
            photoURL: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        })
        console.log('✅ Firestore user data saved')

        console.log('')
        console.log('🎉 ========================================')
        console.log('🎉 TẠO ADMIN THÀNH CÔNG!')
        console.log('🎉 ========================================')
        console.log(`📧 Email: ${ADMIN_EMAIL}`)
        console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
        console.log(`👤 Tên: ${ADMIN_FULLNAME}`)
        console.log(`🔐 Role: admin`)
        console.log('🎉 ========================================')

        process.exit(0)
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.error('❌ Email đã tồn tại! Hãy dùng email khác hoặc xóa tài khoản cũ.')
        } else {
            console.error('❌ Lỗi:', error.message)
        }
        process.exit(1)
    }
}

createAdmin()
