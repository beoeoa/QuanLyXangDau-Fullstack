# 🔥 Hướng Dẫn Kết Nối Firebase Database

## 📋 Bước 1: Tạo Firestore Database

### 1.1 Vào Firebase Console
1. Truy cập: **https://console.firebase.google.com/**
2. Chọn project của bạn
3. Sidebar trái → **Build** → **Firestore Database**
4. Click **Create Database**

### 1.2 Cấu hình Database
```
- Location: asia-southeast1 (Hà Nội) - gần Việt Nam
- Security Rules: Chọn "Start in test mode" (sau sẽ cập nhật rules)
- Click "Create"
```

Đợi database khởi tạo xong (vài giây).

---

## 📦 Bước 2: Tạo Collections

Firestore dùng collections (như tables SQL). Tạo structure sau:

### 2.1 Collection "users"
```
users/
  ├── userId_1/
  │   ├── email: "admin@company.com"
  │   ├── fullname: "Nguyễn Admin"
  │   ├── role: "admin"
  │   ├── password: (hashed - backend)
  │   ├── photoURL: "..."
  │   ├── phone: "0123456789"
  │   └── createdAt: 2026-03-01
  │
  └── userId_2/
      ├── email: "sales@company.com"
      ├── fullname: "Nguyễn Bán"
      ├── role: "sales"
      └── ...
```

**Cách tạo:**
1. Firestore Console → Click **"+ Start Collection"**
2. Tên collection: `users`
3. Click **Next**
4. Tạo document đầu tiên (để test):
   - Document ID: `test_user_001`
   - Thêm fields dưới dạng form

---

## 💾 Bước 3: Cập Nhật firebase.js

Cập nhật file `src/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)  // ← Thêm dòng này

export default app
```

---

## 🔧 Bước 4: Tạo UserService

Tạo file `src/services/userService.js` để quản lý Firestore:

```javascript
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../firebase'

const USERS_COLLECTION = 'users'

// ✅ Đăng ký người dùng mới
export const registerUser = async (userData) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION)
    
    // Kiểm tra email đã tồn tại chưa
    const q = query(usersRef, where('email', '==', userData.email))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      throw new Error('Email đã được đăng ký')
    }

    // Thêm user mới
    const docRef = await addDoc(usersRef, {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return {
      success: true,
      userId: docRef.id,
      message: 'Đăng ký thành công'
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// ✅ Lấy user theo email
export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION)
    const q = query(usersRef, where('email', '==', email))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data()
    }
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// ✅ Lấy user theo ID
export const getUserById = async (userId) => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId)
    const userSnapshot = await getDoc(userDoc)

    if (!userSnapshot.exists()) {
      return null
    }

    return {
      id: userSnapshot.id,
      ...userSnapshot.data()
    }
  } catch (error) {
    console.error('Get user by ID error:', error)
    return null
  }
}

// ✅ Cập nhật user
export const updateUser = async (userId, updateData) => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId)
    await updateDoc(userDoc, {
      ...updateData,
      updatedAt: new Date()
    })

    return {
      success: true,
      message: 'Cập nhật thành công'
    }
  } catch (error) {
    console.error('Update user error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// ✅ Xóa user
export const deleteUser = async (userId) => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId)
    await deleteDoc(userDoc)

    return {
      success: true,
      message: 'Xóa thành công'
    }
  } catch (error) {
    console.error('Delete user error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// ✅ Lấy tất cả users có role cụ thể
export const getUsersByRole = async (role) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION)
    const q = query(usersRef, where('role', '==', role))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Get users by role error:', error)
    return []
  }
}

// ✅ Lấy tất cả users
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION)
    const querySnapshot = await getDocs(usersRef)

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Get all users error:', error)
    return []
  }
}
```

---

## 📝 Bước 5: Cập nhật Register.jsx

Tích hợp userService vào đăng ký:

```javascript
import { registerUser } from '../services/userService'

// Trong handleSubmit:
const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!validateForm()) {
    return
  }

  setIsLoading(true)

  // Gọi Firebase để đăng ký
  const result = await registerUser({
    email: formData.email,
    fullname: formData.fullname,
    password: formData.password, // ⚠️ Hash ở backend!
    role: role
  })

  if (result.success) {
    setIsLoading(false)
    onRegisterSuccess({
      email: formData.email,
      name: formData.fullname,
      role: role,
      userId: result.userId,
      photoURL: null
    })
  } else {
    setError(result.message)
    setIsLoading(false)
  }
}
```

---

## 🔑 Bước 6: Cập nhật Login.jsx

```javascript
import { getUserByEmail } from '../services/userService'

// Trong handleSubmit:
const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)

  // Kiểm tra user từ Firebase
  const user = await getUserByEmail(email)

  if (!user) {
    setError('Email không tồn tại')
    setIsLoading(false)
    return
  }

  // ⚠️ Kiểm tra password (backend sẽ hash)
  if (user.password !== password) { // Không nên so sánh plaintext!
    setError('Mật khẩu không chính xác')
    setIsLoading(false)
    return
  }

  // Kiểm tra role khớp
  if (user.role !== role) {
    setError(`Bạn đã đăng ký với vai trò khác: ${user.role}`)
    setIsLoading(false)
    return
  }

  setIsLoading(false)
  onLoginSuccess({
    email: user.email,
    name: user.fullname,
    role: user.role,
    userId: user.id,
    photoURL: user.photoURL || null
  })
}
```

---

## 🔒 Bước 7: Cập Nhật Security Rules

> ⚠️ **QUAN TRỌNG:** Test mode cho phép ai cũng đọc/ghi. Phải cập nhật rules!

### Vào Firestore Console:
1. **Firestore Database** → **Rules** tab
2. Replace toàn bộ rules bằng:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Đọc: User chỉ đọc dữ liệu của họ hoặc Admin đọc tất cả
      allow read: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Ghi: User tạo profile hoặc Admin ghi
      allow create: if true; // Cho phép công khai đăng ký
      allow update: if request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Xóa: Chỉ Admin
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Các collections khác
    match /{document=**} {
      allow read, write: if false; // Từ chối tất cả mặc định
    }
  }
}
```

3. Click **Publish**

---

## 🧪 Bước 8: Test Kết Nối

### Cách 1: Console Firestore
1. Tạo document test trong `users` collection
2. Xem dữ liệu hiển thị

### Cách 2: Firestore Emulator (Tùy chọn)
```bash
npm install -g firebase-tools
firebase emulators:start
```

---

## 🎯 Cấu Trúc Database Schema

### Collection: users
```
{
  "email": "user@example.com",
  "fullname": "Nguyễn Văn A",
  "role": "sales",
  "password": "hashed_password_here",
  "phone": "0987654321",
  "address": "123 Đường ABC",
  "photoURL": "https://...",
  "isActive": true,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### Collection: orders (tùy chọn)
```
{
  "userId": "user_id_here",
  "productName": "Sản phẩm A",
  "quantity": 10,
  "price": 1000000,
  "status": "completed",
  "createdAt": Timestamp
}
```

### Collection: deliveries (tùy chọn)
```
{
  "driverId": "driver_id",
  "orderId": "order_id",
  "location": "Hà Nội",
  "status": "in_transit",
  "createdAt": Timestamp
}
```

---

## ⚠️ Những Điều Quan Trọng

### 🔐 Bảo Mật
- ❌ **KHÔNG** lưu password plaintext
- ✅ **NÊN** hash password (bcryptjs)
- ✅ **NÊN** dùng Firebase Auth cho authentication
- ✅ **NÊN** có security rules chặt

### 🚀 Performance
- Dùng indexes cho query hay dùng
- Batch operations cho bulk updates
- Pagination cho tập dữ liệu lớn

### 💾 Data Structure
- Tránh nested documents quá sâu
- Denormalize khi cần query nhanh
- Organize collections thành từng loại

---

## 📚 Tài Liệu Liên Quan

- Firestore Docs: https://firebase.google.com/docs/firestore
- Query Examples: https://firebase.google.com/docs/firestore/query-data/queries
- Security Rules: https://firebase.google.com/docs/firestore/security/get-started

---

## ❓ Troubleshooting

### Lỗi: "You don't have permission"
→ Check security rules, hoặc được authenticated chưa

### Lỗi: "Document not found"
→ Collection/document ID không đúng

### Slow queries
→ Dùng indexes, hoặc restructure database

---

## 🎉 Next Steps

1. ✅ Setup Firestore Database
2. ✅ Tạo userService.js
3. ✅ Cập nhật Register.jsx + Login.jsx
4. ✅ Cập nhật Security Rules
5. ✅ Test đăng ký/đăng nhập
6. ⭐ Thêm hash password (bcryptjs)
7. ⭐ Tạo collections cho orders, deliveries, etc.

**Bạn sẵn sàng triển khai!** 🚀
