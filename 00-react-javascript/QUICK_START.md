# ⚡ Quick Start: Kết Nối Firebase Database

## 🎯 Các Bước Nhanh

### Bước 1: Setup Firestore Database (5 phút)
1. Vào **Firebase Console**: https://console.firebase.google.com/
2. Chọn project → **Firestore Database**
3. **Create Database** → Location: `asia-southeast1` → **Create**
4. Tạo collection: **users** (Firebase tự động tạo document sau)

### Bước 2: Cập nhật firebase.js (1 phút)
Đã có sẵn file `src/firebase.js` với config cơ bản.

**Chỉ cần thay YOUR_XXX bằng config từ Firebase Console:**
```javascript
// Vào Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "project.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123:web:abc..."
}
```

### Bước 3: Bật Firebase Services (2 phút)

#### Option A: Dùng Firebase Auth (Recommend ⭐)
**Ưu điểm:** Password hash tự động, bảo mật cao nhất

1. **src/components/Register.jsx** - Uncomment Option 1:
```javascript
// Dòng 8-9: Uncomment 2 import
import { registerWithEmail } from '../services/authService'
import { registerUser } from '../services/userService'

// Dòng 61-92: Uncomment Option 1 (registerWithEmail)
// Comment lại Option 3 (demo)
```

2. **src/components/Login.jsx** - Uncomment Option 1:
```javascript
// Dòng 8-9: Uncomment 2 import
import { loginWithEmail } from '../services/authService'
import { getUserById } from '../services/userService'

// Dòng 37-70: Uncomment Option 1 (loginWithEmail)
// Comment lại Option 3 (demo)
```

#### Option B: Dùng Firestore Trực Tiếp
**Nhược điểm:** Phải tự hash password (không recommend)

1. **Register.jsx** - Uncomment Option 2 (registerUser)
2. **Login.jsx** - Uncomment Option 2 (getUserByEmail)

### Bước 4: Cập nhật Security Rules (2 phút)
**Firestore Console → Rules tab:**

```
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
}
```

Click **Publish**

### Bước 5: Test (1 phút)
```bash
npm start
```

1. Chọn role → **Đăng Ký mới**
2. Nhập email + mật khẩu → Click **Đăng Ký**
3. Xem Firestore Console → users collection → có document mới hay không?
4. Logout → **Đăng Nhập** với email + password vừa đăng ký

---

## 📂 Files Đã Tạo

```
✅ src/firebase.js                      # Config Firebase (sửa config)
✅ src/services/authService.js          # Firebase Auth service
✅ src/services/userService.js          # Firestore user service
✅ src/components/Register.jsx          # (Sửa: uncomment options)
✅ src/components/Login.jsx             # (Sửa: uncomment options)
📖 FIREBASE_DATABASE_GUIDE.md           # Hướng dẫn chi tiết
📖 FIREBASE_SERVICES_GUIDE.md           # Hướng dẫn sử dụng services
📖 QUICK_START.md                       # File này
```

---

## 🔍 Kiểm Tra

### Xem dữ liệu đã lưu
1. **Firestore Console**
2. **users** collection
3. Click document → xem fields: `email`, `fullname`, `role`, `createdAt`, etc.

### Debug lỗi
```javascript
// Mở DevTools Console (F12)
// Bạn sẽ thấy logs:
// - "Register error: ..."
// - "Login error: ..."
// - "Get user error: ..."
```

### Network Request
1. F12 → **Network** tab
2. Refresh page → thấy các request tới `firebaseapp.com`
3. Nếu không thấy → Firebase không connect

---

## ❌ Troubleshooting

### "Permission denied on project.firestore"
→ Security rules sai, check lại rules

### "Firebase not initialized"
→ Config trong firebase.js sai, kiểm tra lại YOUR_XXX

### "addDoc is not defined"
→ Chưa import từ firebase/firestore
```javascript
import { addDoc, collection } from 'firebase/firestore'
```

### "Cannot read property 'email' of null"
→ User không tồn tại trong Firestore, check email đúng không

### Password không match
→ Nếu dùng Firestore plaintext, check capital case (email@EMAIL vs email@email)

---

## 🚀 Next Steps

Sau khi setup xong:

1. **Thêm collections khác:**
   - `orders` - lưu đơn hàng
   - `deliveries` - lưu thông tin giao hàng
   - `transactions` - lưu giao dịch tài chính

2. **Thêm features:**
   - Upload avatar (Firebase Storage)
   - Real-time updates (Firestore listeners)
   - Pagination (getDocs with limit)

3. **Bảo mật:**
   - Hash password (bcryptjs)
   - JWT tokens (nếu có backend)
   - Two-factor authentication

---

## 📞 Tips

- **Lần đầu?** Theo Option A (Firebase Auth) - bảo mật nhất
- **Muốn test nhanh?** Giữ Option 3 (demo) - không cần setup
- **Có bugs?** Xem console log → search Google + lỗi code
- **Cần giúp?** Xem `FIREBASE_DATABASE_GUIDE.md` hoặc `FIREBASE_SERVICES_GUIDE.md`

---

## ✨ That's it!

Bây giờ bạn có:
- ✅ Full authentication system
- ✅ Database lưu trữ
- ✅ Role-based dashboards
- ✅ Security rules

**Tiếp theo là xây dựng features business logic của bạn!** 🎉
