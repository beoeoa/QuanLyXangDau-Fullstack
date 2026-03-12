# Đồ án: Hệ thống Quản lý Đại lý Xăng dầu (Fullstack)

Chào mừng bạn đến với dự án! Đây là kho chứa toàn bộ mã nguồn cho cả phần Frontend (Giao diện) và Backend (Máy chủ/Cơ sở dữ liệu) của hệ thống.

Để bắt đầu làm việc, vui lòng đọc kỹ hướng dẫn cài đặt và các quy tắc làm việc nhóm dưới đây để tránh lỗi đồng bộ code.

## 📂 Cấu trúc dự án
Dự án được chia làm 2 thư mục chính:
* `00-react-javascript/`: Chứa mã nguồn Frontend (ReactJS).
* `01-nodejs-javascript/`: Chứa mã nguồn Backend (Node.js & cấu hình kết nối Firebase).

---

## ⚙️ Hướng dẫn Cài đặt (Dành cho thành viên mới)

### 1. Yêu cầu hệ thống
Trước khi kéo code về máy, hãy đảm bảo máy tính của bạn đã cài đặt:
* **Node.js** (Phiên bản LTS): Tải tại [nodejs.org](https://nodejs.org/)
* **Git**: Tải tại [git-scm.com](https://git-scm.com/)

*(Lưu ý cho người dùng Windows mới: Nếu bị lỗi không chạy được lệnh `npm` trong PowerShell, hãy mở PowerShell dưới quyền Admin và chạy lệnh: `Set-ExecutionPolicy RemoteSigned` -> Nhấn `Y` để cấp quyền).*

### 2. Tải mã nguồn về máy
Mở Terminal ở thư mục bạn muốn lưu dự án và gõ lệnh:
```bash
git clone [https://github.com/beoeoa/QuanLyXangDau-Fullstack.git](https://github.com/beoeoa/QuanLyXangDau-Fullstack.git)
cd QuanLyXangDau-Fullstack
Bạn cần cài đặt thư viện riêng biệt cho cả Frontend và Backend.

Cài Backend:

Bash
cd 01-nodejs-javascript
npm install
Cài Frontend:

Bash
cd ..
cd 00-react-javascript
npm install
⚠️ BẮT BUỘC: Cấu hình khóa bảo mật
Dự án sử dụng các biến môi trường và khóa kết nối Firebase được bảo mật (không đẩy lên GitHub). Code của bạn sẽ bị Crash (sập) nếu thiếu 2 file này.

Vui lòng nhắn tin cho Phúc Đoàn (Chủ kho lưu trữ) để xin 2 file sau:

File .env: Đặt vào thư mục 00-react-javascript/ (và thư mục Backend nếu có).

File serviceAccountKey.json: Đặt chính xác vào đường dẫn 01-nodejs-javascript/src/config/.
