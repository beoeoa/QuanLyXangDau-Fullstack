# 🏢 Hệ Thống Quản Lý Doanh Nghiệp - Hướng Dẫn

## 📋 Giới thiệu

Hệ thống này hỗ trợ 4 vai trò khác nhau, mỗi vai trò có:
- ✅ Trang đăng nhập/đăng ký riêng
- ✅ Dashboard tùy chỉnh theo chức năng
- ✅ Menu điều hướng riêng biệt
- ✅ Quyền hạn khác nhau

---

## 👥 Các Vai Trò

### 1. 👑 **Admin** (Quản lý)
**Quyền hạn:**
- Quản lý nhân viên (thêm, xóa, chỉnh sửa)
- Quản lý sản phẩm
- Xem báo cáo tài chính toàn công ty
- Cài đặt hệ thống
- Xem all doanh số

**Dashboard bao gồm:**
- Tổng quan ngắn gọn
- Quản lý nhân viên
- Quản lý sản phẩm
- Quản lý tài chính
- Báo cáo doanh số

---

### 2. 💰 **Nhân viên Bán Hàng** (Sales)
**Quyền hạn:**
- Tạo đơn hàng mới
- Xem doanh số cá nhân
- Quản lý danh sách khách hàng
- Theo dõi đơn hàng

**Dashboard bao gồm:**
- Doanh số hôm nay
- Số đơn hàng tháng
- Khách hàng mới
- Hạng BXH của nhân viên

---

### 3. 🚚 **Nhân viên Lái Xe** (Driver)
**Quyền hạn:**
- Xem danh sách đơn hàng cần giao
- Cập nhật trạng thái giao hàng
- Theo dõi vị trí GPS
- Quản lý xe, tiêu thụ xăng

**Dashboard bao gồm:**
- Đơn hàng chưa giao
- Lịch sử giao hàng
- Tiêu thụ xăng
- Quãng đường di chuyển

---

### 4. 📊 **Nhân viên Kế Toán** (Accountant)
**Quyền hạn:**
- Quản lý hóa đơn
- Xem doanh thu/chi phí
- Quản lý thanh toán
- Theo dõi nợ

**Dashboard bao gồm:**
- Tổng doanh thu
- Tổng chi phí
- Lợi nhuận
- Tiền nợ

---

## 🔄 Luồng Hoạt Động

```
┌─────────────────────┐
│  Chọn Vai Trò      │
│ (RoleSelector)     │
└──────────┬──────────┘
           │
      [Chọn vai trò]
           │
    ┌──────┴──────┐
    │             │
┌───▼──────┐  ┌──▼────────┐
│ Đăng Nhập│  │ Đăng Ký   │
│ (Login)  │  │(Register) │
└───┬──────┘  └──┬────────┘
    └──────┬─────┘
           │
    [Xác thực thành công]
           │
    ┌──────▼────────────────────┐
    │   Dashboard (dựa trên role)│
    │ ├─ AdminDashboard         │
    │ ├─ SalesDashboard         │
    │ ├─ DriverDashboard        │
    │ └─ AccountantDashboard    │
    └──────┬────────────────────┘
           │
      [Đăng xuất]
           │
      (Quay về chọn vai trò)
```

---

## 📁 Cấu Trúc File

```
src/
├── components/
│   ├── RoleSelector.jsx          # Chọn vai trò
│   ├── RoleSelector.css
│   ├── Login.jsx                 # Đăng nhập (nhận role)
│   ├── Register.jsx              # Đăng ký (nhận role)
│   ├── SocialAuthButtons.jsx     # Google/Facebook login
│   ├── Auth.css                  # CSS cho Login/Register
│   ├── AdminDashboard.jsx        # Dashboard Admin
│   ├── SalesDashboard.jsx        # Dashboard Bán Hàng
│   ├── DriverDashboard.jsx       # Dashboard Lái Xe
│   ├── AccountantDashboard.jsx   # Dashboard Kế Toán
│   └── Dashboard.css             # CSS chung cho dashboards
├── firebase.js                   # Config Firebase
├── App.jsx                       # Component chính (quản lý flow)
├── App.css                       # CSS App
└── main.jsx
```

---

## 🚀 Cách Sử Dụng

### 1️⃣ **Chạy ứng dụng**
```bash
npm start
```

### 2️⃣ **Chọn vai trò**
- Bạn sẽ thấy 4 tùy chọn vai trò
- Click chọn vai trò của bạn
- Chọn "Đăng Nhập" hoặc "Đăng Ký"

### 3️⃣ **Đăng Nhập/Đăng Ký**
- **Đăng nhập:** Email + Mật khẩu (hoặc Google/Facebook)
- **Đăng ký:** Tên + Email + Mật khẩu + Xác nhận mật khẩu
- Vai trò sẽ được tự động ghi nhận

### 4️⃣ **Sử dụng Dashboard**
- Dashboard sẽ thay đổi dựa trên vai trò
- Menu sidebar hiển thị các tính năng của vai trò đó
- Stats cards hiển thị dữ liệu tương ứng

### 5️⃣ **Đăng Xuất**
- Click nút "Đăng Xuất" → quay về chọn vai trò

---

## 🔐 Bảo Mật

### Các điểm cần cái thiện cho production:

1. **Backend Authentication**
   - Hiện tại dùng fake auth
   - Cần tích hợp API thực để:
     - Lưu user + role vào database
     - Hash password
     - Tạo JWT token

2. **Role-based Access Control (RBAC)**
   - Kiểm tra role trước khi render component
   - Server-side validation cho mỗi API call

3. **Firebase Integration**
   - Lưu role vào Firestore
   - Custom claims để xác định role
   - Security rules cho mỗi role

---

## 📝 Ví Dụ Đăng Nhập

### Admin
```
Email: admin@company.com
Password: admin123
```

### Sales
```
Email: sales@company.com
Password: sales123
```

### Driver
```
Email: driver@company.com
Password: driver123
```

### Accountant
```
Email: accountant@company.com
Password: acc123
```

> **Lưu ý:** Hiện tại chỉ cần email + password hợp lệ, không có xác thực thực tế

---

## 🛠️ Mở Rộng Tương Lai

### Thêm vai trò mới
1. Tạo `NewRoleDashboard.jsx`
2. Thêm role vào `RoleSelector.jsx`
3. Thêm case trong `renderDashboard()` ở `App.jsx`

### Thêm tính năng
- Tạo component mới trong dashboard
- Import vào dashboard tương ứng
- Thêm menu item trong sidebar

### Tích hợp API thực
- Tạo `services/authService.js`
- Tạo `services/apiClient.js`
- Replace fake auth bằng API calls thực

---

## ❓ FAQs

**Q: Làm sao để thêm vai trò mới?**
A: Edit `RoleSelector.jsx` → thêm object role mới vào array `roles` → tạo dashboard component mới → cập nhật `App.jsx`

**Q: Vai trò có thể thay đổi sau khi đăng ký?**
A: Hiện tại không. Bạn sẽ phải logout → chọn vai trò khác → đăng ký lại

**Q: Dữ liệu có được lưu không?**
A: Hiện tại không. Reload page là mất hết. Hãy tích hợp Firebase/backend để lưu.

**Q: Làm sao để test các role khác nhau?**
A: Logout → chọn vai trò khác → đăng nhập email khác → trong dashboard sẽ là role đó

---

## 📞 Hỗ Trợ

Nếu cần giúp đỡ, hãy:
1. Check console log để xem error
2. Kiểm tra role được pass đúng chưa
3. Xem thứ tự render trong App.jsx

Chúc bạn thành công! 🎉
