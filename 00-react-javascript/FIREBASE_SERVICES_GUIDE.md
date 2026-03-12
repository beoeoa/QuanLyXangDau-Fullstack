rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if true;
      allow update: if request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if true;
      allow update: if request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}# 🚀 Hướng Dẫn Sử Dụng Firebase Services

## 📁 Cấu Trúc Files

```
src/
├── services/
│   ├── userService.js         # Quản lý dữ liệu users
│   ├── authService.js         # Firebase Auth
│   └── orderService.js        # (Tương lai: quản lý orders)
├── firebase.js                # Config Firebase
├── components/
│   ├── Login.jsx              # (Cập nhật để dùng services)
│   ├── Register.jsx           # (Cập nhật để dùng services)
│   └── ...
└── App.jsx
```

---

## 📌 Sử Dụng Trong Register.jsx

### ✅ Cách 1: Dùng Firebase Auth (Recommend)

```javascript
import { registerWithEmail } from '../services/authService'

const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!validateForm()) {
    return
  }

  setIsLoading(true)

  // Gọi Firebase Auth
  const result = await registerWithEmail(
    formData.email,
    formData.password,
    {
      fullname: formData.fullname,
      role: role,
      phone: formData.phone || '',
      address: formData.address || ''
    }
  )

  if (result.success) {
    setIsLoading(false)
    // Đăng ký thành công
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

**Ưu điểm:**
- ✅ Password được hash tự động bởi Firebase
- ✅ Bảo mật cao nhất
- ✅ Firebase quản lý session

---

### ✅ Cách 2: Dùng Firestore trực tiếp

```javascript
import { registerUser } from '../services/userService'

const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!validateForm()) {
    return
  }

  setIsLoading(true)

  // Gọi Firestore
  const result = await registerUser({
    email: formData.email,
    fullname: formData.fullname,
    password: formData.password, // ⚠️ KHÔNG được dùng plaintext!
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

**Nhược điểm:**
- ❌ Phải tự hash password
- ❌ Bảo mật thấp hơn

---

## 📌 Sử Dụng Trong Login.jsx

### ✅ Cách 1: Firebase Auth (Recommend)

```javascript
import { loginWithEmail } from '../services/authService'
import { getUserById } from '../services/userService'

const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)

  // Đăng nhập Firebase
  const authResult = await loginWithEmail(email, password)

  if (!authResult.success) {
    setError(authResult.message)
    setIsLoading(false)
    return
  }

  // Lấy dữ liệu từ Firestore
  const userData = await getUserById(authResult.userId)

  if (!userData) {
    setError('Không tìm thấy thông tin người dùng')
    setIsLoading(false)
    return
  }

  // Kiểm tra role khớp
  if (userData.role !== role) {
    setError(`Bạn đã đăng ký với vai trò: ${userData.role}`)
    setIsLoading(false)
    return
  }

  setIsLoading(false)
  onLoginSuccess({
    email: userData.email,
    name: userData.fullname,
    role: userData.role,
    userId: userData.id,
    photoURL: userData.photoURL || null
  })
}
```

---

### ✅ Cách 2: Dùng Firestore trực tiếp

```javascript
import { getUserByEmail } from '../services/userService'

const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)

  // Lấy user từ Firestore
  const user = await getUserByEmail(email)

  if (!user) {
    setError('Email không tồn tại')
    setIsLoading(false)
    return
  }

  // Kiểm tra password
  if (user.password !== password) { // ⚠️ Không nên so sánh plaintext!
    setError('Mật khẩu không chính xác')
    setIsLoading(false)
    return
  }

  // Kiểm tra role
  if (user.role !== role) {
    setError(`Vai trò không khớp. Hãy chọn: ${user.role}`)
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

## 📌 Sử Dụng Trong Dashboard

### Admin: Quản lý nhân viên

```javascript
import { getAllUsers, deleteUser } from '../services/userService'

// Lấy tất cả nhân viên
const [employees, setEmployees] = useState([])

useEffect(() => {
  const fetchEmployees = async () => {
    const data = await getAllUsers()
    setEmployees(data)
  }
  fetchEmployees()
}, [])

// Xóa nhân viên
const handleDeleteEmployee = async (employeeId) => {
  const result = await deleteUser(employeeId)
  if (result.success) {
    setEmployees(employees.filter(e => e.id !== employeeId))
  }
}
```

### Sales: Xem doanh số cá nhân

```javascript
import { getOrdersByUser } from '../services/orderService'

const [myOrders, setMyOrders] = useState([])

useEffect(() => {
  const fetchOrders = async () => {
    const orders = await getOrdersByUser(user.userId)
    setMyOrders(orders)
  }
  fetchOrders()
}, [user.userId])
```

### Driver: Xem đơn giao hôm nay

```javascript
import { getTodayDeliveries } from '../services/deliveryService'

const [deliveries, setDeliveries] = useState([])

useEffect(() => {
  const fetchDeliveries = async () => {
    const data = await getTodayDeliveries(user.userId)
    setDeliveries(data)
  }
  fetchDeliveries()
}, [user.userId])
```

---

## 🔑 Các Hàm Implement Được

### userService.js
```javascript
registerUser(userData)              // Đăng ký user
getUserByEmail(email)               // Lấy user theo email
getUserById(userId)                 // Lấy user theo ID
updateUser(userId, updateData)      // Cập nhật user
deleteUser(userId)                  // Xóa user
getUsersByRole(role)                // Lấy all users của một role
getAllUsers()                       // Lấy tất cả users
searchUsers(field, value)           // Tìm users
countUsers()                        // Đếm tổng users
countUsersByRole(role)              // Đếm users theo role
```

### authService.js
```javascript
registerWithEmail(email, password, userData)    // Đăng ký Firebase
loginWithEmail(email, password)                 // Đăng nhập Firebase
logout()                                        // Đăng xuất
updateUserProfile(userId, name, photoURL)      // Update profile
getCurrentUser()                                // Lấy user hiện tại
onAuthStateChanged(callback)                    // Lắng nghe auth changes
```

---

## 🎯 Best Practices

### ✅ NÊN LÀM
```javascript
// Dùng async/await
const result = await registerWithEmail(email, password, data)
if (result.success) {
  // Xử lý thành công
} else {
  // Xử lý lỗi
}

// Kiểm tra duplicate trước khi thêm
const existing = await getUserByEmail(email)
if (existing) {
  throw new Error('Email đã tồn tại')
}

// Lưu errors vào state
const [errors, setErrors] = useState({})
```

### ❌ KHÔNG NÊN LÀM
```javascript
// Không bắt lỗi
const data = await getUserByEmail(email) // Có thể crash!

// Không kiểm tra null
const user = await getUserById(id)
console.log(user.email) // Crash nếu user null

// Không xác thực trước lưu
await registerUser({ email, password }) // Không kiểm tra validate
```

---

## 🔒 Bảo Mật

### Password Hashing
```bash
npm install bcryptjs
```

**Trong backend:**
```javascript
const bcrypt = require('bcryptjs')

const hashedPassword = await bcrypt.hash(password, 10)
// Lưu hashedPassword vào database

// Khi login:
const isPasswordValid = await bcrypt.compare(password, storedHashedPassword)
```

### Role-based Access Control
```javascript
// Middleware kiểm tra role (backend)
const checkRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Không có quyền' })
    }
    next()
  }
}

// Sử dụng
app.delete('/api/users/:id', checkRole('admin'), deleteUserController)
```

---

## 📊 Tạo Collections Thêm (Tương Lai)

### orders Collection
```javascript
// src/services/orderService.js
export const createOrder = async (orderData) => {
  const ordersRef = collection(db, 'orders')
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    createdAt: new Date(),
    status: 'pending'
  })
  return docRef.id
}

export const getOrdersByUser = async (userId) => {
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}
```

### deliveries Collection
```javascript
export const createDelivery = async (deliveryData) => {
  const deliveryRef = collection(db, 'deliveries')
  const docRef = await addDoc(deliveryRef, {
    ...deliveryData,
    createdAt: new Date(),
    status: 'pending'
  })
  return docRef.id
}

export const getTodayDeliveries = async (driverId) => {
  const deliveryRef = collection(db, 'deliveries')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const q = query(
    deliveryRef,
    where('driverId', '==', driverId),
    where('createdAt', '>=', today)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}
```

---

## 📞 Hỗ Trợ

Nếu có lỗi:
1. Check console.log để xem error
2. Verify Firestore rules đúng không
3. Kiểm tra collection/document IDs đúng không
4. Xem network tab để kiểm tra API calls

**Happy Coding!** 🎉
