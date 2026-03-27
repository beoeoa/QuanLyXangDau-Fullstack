# Hướng Dẫn Sử Dụng và Vận Hành Hệ Thống Quản Lý Vận Tải Xăng Dầu 88

Hệ thống Quản lý Vận tải Xăng dầu 88 là nền tảng quản trị toàn diện dành cho doanh nghiệp vận tải xăng dầu, bao gồm 4 phân hệ chính cho các vai trò: **Quản trị viên (Admin), Kinh doanh (Sales), Kế toán (Accountant), và Tài xế (Driver)**. Dưới đây là hướng dẫn chi tiết về cách sử dụng và quy trình vận hành hệ thống.

---

## 📌 1. Đăng Nhập & Hồ Sơ Cá Nhân

- **Đăng nhập:** Truy cập trang chủ hệ thống, sử dụng Email và Mật khẩu hoặc đăng nhập nhanh qua Google/Facebook.
- **Phê duyệt tài khoản:** Tài khoản đăng ký mới ở các vai trò Nhân viên/Tài xế sẽ cần Admin duyệt trước khi có thể hoạt động.
- **Cập nhật hồ sơ:** Ngay sau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu người dùng vào mục **Hồ sơ (Profile)** để cập nhật số điện thoại, địa chỉ và thông tin liên lạc.

---

## 👑 2. Hướng Dẫn Dành Cho Quản Trị Viên (Admin)
*Vai trò: Giám sát toàn bộ hoạt động, quản lý cấu hình và nhân sự.*

**Các tính năng chính:**
1. **Tổng quan (Dashboard):** Xem các biểu đồ khái quát về doanh số, số lượng đơn hàng và xe bồn đang hoạt động.
2. **Kinh doanh:**
   - **Bảng Giá Xăng Dầu:** Theo dõi giá xăng dầu. Hỗ trợ lấy dữ liệu tự động hoặc cập nhật thủ công.
   - **Nhật ký làm việc:** Xem nhật ký điều hành và lịch trình làm việc của tài xế.
3. **Đối tác:**
   - Quản lý danh sách **Nhà Cung Cấp** và **Khách Hàng**.
4. **Vận hành:**
   - **Quản lý Xe bồn:** Thêm, sửa, xóa thông tin xe (biển số, dung tích, số hầm).
   - **Cấp quyền tài khoản:** Cấp quyền cho nhân viên (Sales, Accountant, Driver) và duyệt tài khoản đăng ký mới.
5. **Hệ thống:** Xem **Nhật ký hệ thống** để tra cứu lịch sử thay đổi dữ liệu của người dùng.

---

## 💼 3. Hướng Dẫn Dành Cho Nhân Viên Kinh Doanh (Sales)
*Vai trò: Chăm sóc khách hàng, chốt đơn và lên lệnh điều xe.*

**Các tính năng chính:**
1. **Quản lý Đại lý (CRM):** 
   - Thêm mới, chỉnh sửa khách hàng.
   - **Import Excel** danh sách khách hàng hoặc **Quét ảnh GPĐKKD (OCR)** để trích xuất tự động thông tin.
   - Hỗ trợ xuất và in **Hợp Đồng Nguyên Tắc**.
2. **Quản lý Đơn hàng:**
   - Lập đơn đặt hàng mới: Chọn khách hàng, loại xăng/dầu, số lượng, ngày yêu cầu.
   - Hỗ trợ xuất **Biên Bản Giao Hàng (kiêm Phiếu XK)** và **Phiếu Đề Nghị Cấp Xăng Dầu**.
3. **Lệnh Điều Động (Dispatching):**
   - Từ đơn hàng mới, thực hiện *Ghép Đơn → Xe → Tài xế*.
   - Hỗ trợ quét OCR đơn hàng, Import Excel.
   - Chọn kho xuất hàng, đại lý nhận, gán cho xe bồn phù hợp và chọn tài xế đang "Rảnh". Đơn hàng sau đó sẽ gửi thẳng về app/dashboard của Tài xế.

---

## 🚚 4. Hướng Dẫn Dành Cho Tài Xế (Driver)
*Vai trò: Vận chuyển, cập nhật trạng thái thời gian thực và báo cáo chi phí.*

**Các tính năng chính:**
1. **Lệnh Điều Động:**
   - Nhận chuyến được phân công từ Sales.
   - Thực hiện cập nhật 5 bước trạng thái: `Chờ nhận hàng` ➔ `Đã nhận hàng` ➔ `Đang di chuyển` ➔ `Đã đến điểm giao` ➔ `Đang xả hàng` ➔ `Hoàn thành`.
   - Xem bản đồ định tuyến hành trình tối ưu.
   - Nhập **số lít thực giao** và ghi nhận **hao hụt** khi xả hàng.
   - Nhập **mã Seal (kẹp chì)** và **Chụp/Upload hình ảnh** các giấy tờ (Biên bản giao nhận, Phiếu xuất kho, BB hao hụt) gửi về cho Kế toán.
2. **Báo cáo Chi Phí & OCR:**
   - Ghi nhận chi phí dọc đường (Vé BOT, Vá lốp, Sửa chữa, Đổ dầu).
   - Có thể dùng tính năng **Quét biên lai (OCR)** để hệ thống tự đọc số tiền.
3. **Báo Cáo Khẩn Cấp (SOS):** 
   - Nếu gặp Kẹt xe, Tai nạn, Rò rỉ, xe hỏng... tài xế có thể ấn gửi SOS để báo ngay về tuyến trên.
4. **Thống Kê:** Xem tổng số chuyến, tổng km và **Lương dự kiến**.

---

## 💰 5. Hướng Dẫn Dành Cho Kế Toán (Accountant)
*Vai trò: Theo dõi dòng tiền, chốt công nợ, đối soát hao hụt và tính lương.*

**Các tính năng chính:**
1. **Công Nợ Phải Thu (AR):**
   - Quản lý các chuyến đã giao xong.
   - Hỗ trợ xuất/in **Phiếu Nhập Kho** và **Hóa Đơn GTGT**.
   - In Bảng Kê Đòi Nợ (ĐNTT) và hỗ trợ Quét ảnh UNC Ngân hàng.
2. **Chi Phí Vận Hành (AP):**
   - Xét duyệt (Approved/Rejected) các chi phí dọc đường mà tài xế gửi lên. 
   - Sau khi duyệt, có thể in **Phiếu Chi**. 
   - Hỗ trợ **Quét Hóa Đơn VAT mua xăng** tự động bằng OCR.
3. **Lương Thưởng Tài xế:**
   - Tính lương tự động dựa trên chuyến đi và **phạt/thưởng hao hụt**. (Định mức hao hụt xăng dầu cho phép là 0.5%).
   - Xuất Bảng lương tổng hợp.
4. **Đối Soát (Reconciliation):**
   - Khớp lệnh chứng từ giấy (Biên bản giao hàng, phiếu XK) với dữ liệu hệ thống.
   - Cảnh báo đỏ nếu hao hụt > 0.5%.
   - Kế toán sẽ xem xét và nhấn **Duyệt (Chốt công nợ)**. Nếu từ chối, phải ghi rõ lý do. Tích hợp in **Biên Bản Hao Hụt**.

---

## 🔄 6. QUY TRÌNH VẬN HÀNH TIÊU CHUẨN (STANDARD WORKFLOW)

Để hệ thống hoạt động trơn tru, nhân sự các phòng ban phối hợp theo luồng công việc sau:

1. **Tạo Đơn Hàng (Sales):** 
   - Khách hàng yêu cầu nhập xăng dầu. Nhân viên Sales lên đơn hàng mới vào hệ thống.
2. **Điều Phối Xe & Tài Xế (Sales / Điều hành):** 
   - Sales vào mục **Lệnh Điều Động**, chọn đơn hàng, chọn **Xe bồn** phù hợp và **Tài xế** đang trống để ghép lại thành 1 Lệnh.
3. **Thực Hiện Vận Chuyển (Driver):**
   - Tài xế nhìn thấy Lệnh trong Dashboard, xem địa chỉ và bản đồ.
   - Tới kho nhận hàng, nhập mã Kẹp chì (Seal). Đổi trạng thái lịch trình đến khi Xả hàng xong.
   - Lúc giao hàng, nhập số lượng thực giao để hệ thống tự tính hao hụt.
   - Chụp ảnh giấy tờ (phiếu giao, biên bản có chữ ký) gửi thẳng lên app.
4. **Ghi Nhận Phát Sinh (Driver):** 
   - Nếu có phí cầu đường, vá lốp thì tài xế chụp bill nhập chi phí. Nếu có sự cố thì ấn SOS.
5. **Đối Soát & Duyệt Lương (Accountant):**
   - Kế toán vào đối chiếu số hao hụt. Nếu đầy đủ giấy tờ và hợp lệ sẽ ấn **Duyệt**.
   - Xem chi phí dọc đường tài xế báo, đối chiếu ảnh bill để **Duyệt chi phí**.
6. **Thanh Toán & Hóa Đơn (Accountant):**
   - Xuất hóa đơn GTGT, Phiếu nhập kho và in Bảng đòi nợ gửi cho Khách hàng để thu tiền.
   - Cuối tháng hệ thống gộp số lượng chuyến và hao hụt để xuất trọn bộ **Bảng Lương Tài Xế**.

---
*Lưu ý: Nếu có bất kỳ sự cố phần mềm nào trong lúc vận hành, xin vui lòng kiểm tra Thông báo (Notification Bell) hoặc xem Nhật Ký Hệ Thống để biết chi tiết thao tác lỗi.*
