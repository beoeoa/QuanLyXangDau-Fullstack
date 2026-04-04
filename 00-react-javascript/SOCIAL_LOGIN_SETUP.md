# 🔐 Hướng Dẫn Thiết Lập Đăng Nhập Google & Facebook

## 📋 Bước 1: Tạo Firebase Project

1. Truy cập **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Tạo Project"** (Create Project)
   - Nhập tên Project (ví dụ: `my-auth-app`)
   - Click **Tiếp tục** → Tắt Google Analytics → **Tạo Project**
3. Đợi project được tạo, sau đó click **Tiếp tục**

## 🌐 Bước 2: Đăng Ký Ứng Dụng Web

1. Trên trang Overview, click biểu tượng **Web** `</>` để thêm Web app
2. Nhập tên ứng dụng (ví dụ: `My React App`)
3. Click **Đăng ký ứng dụng**
4. **Copy** phần `firebaseConfig` (cải tạo từ từng dòng)

## 🔑 Bước 3: Cập Nhật firebase.js

Thay thế nội dung `src/firebase.js` bằng config của bạn:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

> 💡 Bạn sẽ thấy config này trên Firebase Console trang cài đặt ứng dụng

## 🔵 Bước 4: Bật Google Sign-In

1. Trên sidebar Firebase, click **Xác thực** (Authentication)
2. Chuyển sang tab **Phương pháp đăng nhập** (Sign-in method)
3. Tìm **Google** và click nút toggle để **bật lên**
4. Chọn email từ dropdown
5. Click **Lưu** (Save)

## 📘 Bước 5: Bật Facebook Login

### 5.1 Tại Facebook Developers

1. Truy cập **[Meta Developers](https://developers.facebook.com/)**
2. Đăng nhập với tài khoản Facebook hoặc tạo mới
3. Click **Tạo Ứng Dụng** → Chọn **Consumer** → Next
4. Điền thông tin:
   - Tên ứng dụng: `My React App`
   - Email: Nhập email của bạn
   - Click **Tạo ID Ứng Dụng**
5. Chọn **Facebook Login** → **Cài Đặt**
6. Trên **Cài đặt Facebook Login**:
   - URI chuyển hướng OAuth hợp lệ: `https://your-project.firebaseapp.com/__/auth/handler`
   - URL trang web: `https://your-project.firebaseapp.com/`
   - Lưu thay đổi
7. Sau đó đi tới **Cài đặt > Thông tin cơ bản**
   - Copy **ID Ứng Dụng** (App ID)

### 5.2 Tại Firebase Console

1. Quay lại Firebase Console → **Xác thực**
2. Tìm **Facebook** và click toggle **bật lên**
3. Dán **App ID** và **App Secret** (từ Facebook Developers)
4. Copy **URI chuyển hướng OAuth** được cung cấp
5. Quay lại Facebook Developers → dán URL này vào
6. Click **Lưu** trên Firebase

## 🚀 Bước 6: Chạy Ứng Dụng

```bash
npm start
```

Bây giờ bạn có thể:
- ✅ Click nút **Google** để đăng nhập bằng tài khoản Google
- ✅ Click nút **Facebook** để đăng nhập bằng tài khoản Facebook

## 🐛 Gỡ Lỗi

### Lỗi: "Firebase config not initialized"
→ Kiểm tra `firebase.js` đã có config chưa

### Lỗi: "popup_closed_by_user"
→ Pop-up bị chặn, cho phép pop-up để đăng nhập

### Lỗi trên Facebook
→ Đảm bảo:
- App đang ở chế độ **Development** hoặc **Live**
- Domain được thêm vào Valid OAuth Redirect URIs
- App Secret được sao chép chính xác

## 📝 Lưu Ý An Toàn

> ⚠️ **KHÔNG** commit file `firebase.js` có config thực vào Git
> 
> Tạo file `.env.local`:
> ```
> VITE_API_KEY=YOUR_API_KEY
> VITE_AUTH_DOMAIN=your-project.firebaseapp.com
> ...
> ```
> 
> Cập nhật `firebase.js`:
> ```javascript
> const firebaseConfig = {
>   apiKey: import.meta.env.VITE_API_KEY,
>   authDomain: import.meta.env.VITE_AUTH_DOMAIN,
>   ...
> }
> ```

## ✅ Xong!

Bây giờ đăng nhập bằng Google và Facebook đã hoạt động! 🎉
