import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import { getAllDeliveryOrders } from '../services/transportationService'
import { getAllExpenses, updateExpenseStatus } from '../services/driverExpenseService'
import { getAllOrders } from '../services/orderService'
import { getAllCustomers } from '../services/customerService'
import { getAllUsers } from '../services/userService'
import Profile from './Profile'
import NotificationBell from './NotificationBell'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function AccountantDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')  // Bộ lọc tháng cho báo cáo

  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [drivers, setDrivers] = useState([])

  useEffect(() => {
    const check = async () => {
      const res = await verifyUserRole(user.userId, 'accountant')
      if (!res.success) { alert('Lỗi xác minh quyền!'); onLogout() }
    }
    if (user?.userId) {
      check()
      loadAll()

      if (user.isProfileUpdated === false && !sessionStorage.getItem('profileAlertShown_Acc')) {
        alert('⚠️ Yêu cầu bắt buộc: Vui lòng cập nhật đầy đủ thông tin cá nhân (SĐT, Địa chỉ...) để hồ sơ hoàn tất!')
        setActiveMenu('profile')
        sessionStorage.setItem('profileAlertShown_Acc', 'true')
      }
    }
  }, [user?.userId])

  const loadAll = async () => {
    setLoading(true)
    const [dels, exps, ords, custs, usrs] = await Promise.all([
      getAllDeliveryOrders(), getAllExpenses(), getAllOrders(), getAllCustomers(), getAllUsers()
    ])
    setDeliveryOrders(Array.isArray(dels) ? dels : [])
    setExpenses(Array.isArray(exps) ? exps : [])
    setOrders(Array.isArray(ords) ? ords : [])
    setCustomers(Array.isArray(custs) ? custs : [])
    setDrivers(Array.isArray(usrs) ? usrs.filter(u => u.role === 'driver') : [])
    setLoading(false)
  }

  // ===============================
  // XUẤT PHIẾU NHẬP KHO (Ảnh 2)
  // ===============================
  const handleExportImportSlip = (order) => {
    const customer = customers.find(c => c.id === order.customerId)
    const now = new Date()

    const quantity = Number(order.quantity || 0)
    const price = 20181.8182 // Giá trước thuế (để khớp ảnh 10.000 * 20.181,8182 = 201.818.182)
    const total = quantity * price
    const vat = total * 0.1
    const grandTotal = total + vat

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Phiếu Nhập Kho</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 0; padding: 20px; color: #000; }
  
  .header-table { width: 100%; border: none; margin-bottom: 20px; }
  .header-table td { border: none; vertical-align: top; padding: 0; }
  
  .company-name { font-weight: bold; font-size: 12px; text-transform: uppercase; }
  .company-addr { font-size: 11px; }

  .form-code { font-weight: bold; text-align: right; font-size: 12px; }
  .form-note { text-align: right; font-style: italic; font-size: 11px; }

  .title-section { text-align: center; margin: 20px 0; position: relative; }
  .title-section h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
  .title-section p { font-style: italic; margin: 5px 0 0; }

  .acc-table { position: absolute; top: 0; right: 0; font-size: 11px; }
  .acc-table td { border: none; padding: 2px 10px; text-align: right; }
  .acc-table td:first-child { font-weight: bold; }

  .info-section { line-height: 1.6; margin-bottom: 15px; }

  table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.data-table th, table.data-table td { border: 1px solid #000; padding: 5px; text-align: center; }
  table.data-table th { background: #fff; font-weight: normal; }

  .sum-row { font-style: italic; margin-bottom: 30px; }
  
  .signatures { display: flex; justify-content: space-between; text-align: center; }
  .signatures > div { width: 25%; }
  .sig-title { font-weight: bold; margin-bottom: 5px; }
  .sig-note { font-style: italic; margin-bottom: 70px; }

  .stamp { display: inline-block; border-radius: 50%; width: 90px; height: 90px; border: 2px solid red; color: red; transform: rotate(-20deg); font-size: 9px; font-weight: bold; padding-top: 25px; box-sizing: border-box; position: absolute; top: -10px; left: 30%; }
</style>
</head><body>

  <table class="header-table">
    <tr>
      <td width="50%">
        <div class="company-name">CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88</div>
        <div class="company-addr">đường Trực Cát 2, P.Vĩnh Niệm, Q.Lê Chân, Tp.Hải Phòng</div>
      </td>
      <td width="50%">
        <div class="form-code">Mẫu số: 01-VT</div>
        <div class="form-note">(Ban hành theo T.tư số 200/2014/TT-BTC<br>ngày 22/12/2014 của Bộ Tài chính)</div>
      </td>
    </tr>
  </table>

  <div class="title-section">
    <div class="stamp">
      M.S.D.N: 0202133771<br>CÔNG TY TNHH<br>DỊCH VỤ THƯƠNG MẠI<br>VẬN TẢI 88<br>THÀNH PHỐ HẢI PHÒNG
    </div>
    <h1>PHIẾU NHẬP KHO</h1>
    <p>Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}<br>Số: PNK-562</p>

    <table class="acc-table">
      <tr><td>Nợ</td><td>1561:<br>1331:</td><td>${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}<br>${vat.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td></tr>
      <tr><td>Có</td><td>331:</td><td>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td></tr>
    </table>
  </div>

  <div class="info-section">
    Họ tên người giao hàng: <strong>CÔNG TY CỔ PHẦN BK ENERGY</strong><br>
    Theo HĐ số 00000610 ngày 04 tháng 10 năm 2022 của: CÔNG TY CỔ PHẦN BK ENERGY<br>
    Nhập tại kho: HH - Kho hàng hóa &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Địa điểm:
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" width="5%">STT</th>
        <th rowspan="2" width="30%">Tên, nhãn hiệu, quy cách phẩm chất<br>vật tư, dụng cụ sản phẩm, hàng hóa</th>
        <th rowspan="2" width="10%">Mã số</th>
        <th rowspan="2" width="10%">Đơn<br>vị tính</th>
        <th colspan="2" width="20%">Số lượng</th>
        <th rowspan="2" width="10%">Đơn giá</th>
        <th rowspan="2" width="15%">Thành tiền</th>
      </tr>
      <tr>
        <th>Chứng từ</th>
        <th>Thực nhập</th>
      </tr>
      <tr style="font-weight: bold; background: #f9f9f9;">
        <td>A</td><td>B</td><td>C</td><td>D</td><td>1</td><td>2</td><td>3</td><td>4</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td style="text-align: left;">${order.product}</td>
        <td>DO</td>
        <td>Lít</td>
        <td>${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td></td>
        <td>${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
        <td style="text-align: right;">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
      </tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="font-weight: bold;">
        <td colspan="7" style="text-align: left;">Cộng tiền hàng</td>
        <td style="text-align: right;">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="sum-row">
    Tổng số tiền (viết bằng chữ): Chuyển đổi thành chữ (Ví dụ: Hai trăm lẻ một triệu...)<br>
    Số chứng từ gốc kèm theo:
  </div>

  <div style="text-align: right; font-style: italic; margin-bottom: 15px;">
    Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}
  </div>

  <div class="signatures">
    <div>
      <div class="sig-title">Người lập phiếu</div>
      <div class="sig-note">(Ký, họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Người giao hàng</div>
      <div class="sig-note">(Ký, họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Thủ kho</div>
      <div class="sig-note">(Ký, họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Kế Toán</div>
      <div class="sig-note">(Ký, họ tên)</div>
    </div>
  </div>

</body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  // ===============================
  // XUẤT HÓA ĐƠN GTGT (Ảnh 3)
  // ===============================
  const handleExportVATInvoice = (order) => {
    const customer = customers.find(c => c.id === order.customerId)
    const now = new Date()

    const quantity = Number(order.quantity || 0)
    const price = 20181.8182
    const total = quantity * price
    const vat = total * 0.1
    const grandTotal = total + vat

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Hóa Đơn Giá Trị Gia Tăng</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 0; padding: 20px; color: #000; position: relative; }
  
  .watermark { position: absolute; top: 30%; left: 10%; width: 80%; opacity: 0.05; z-index: -1; text-align: center; }
  
  .header-left { width: 65%; float: left; margin-bottom: 20px; }
  .header-right { width: 35%; float: left; margin-bottom: 20px; text-align: right; }
  .clear { clear: both; }

  .company-name { font-weight: bold; font-size: 14px; text-transform: uppercase; color: #333; }
  .company-info { font-size: 11px; line-height: 1.5; color: #444; }

  .title-section { text-align: center; margin-bottom: 20px; }
  .title-section h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; color: #B31B1B; } /* Màu đỏ gạch giống mẫu HĐĐT */
  .title-section p { font-style: italic; margin: 5px 0 0; font-size: 12px; }

  .form-info { font-size: 11px; line-height: 1.4; text-align: right; margin-bottom: 10px; }

  .buyer-section { line-height: 1.6; margin-bottom: 15px; font-size: 12px; }

  table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  table.data-table th, table.data-table td { border: 1px solid #777; padding: 6px; text-align: center; font-size: 12px; }
  table.data-table th { background: #f0f0f0; font-weight: bold; }

  .total-section { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  .total-section td { border: 1px solid #777; padding: 6px; }

  .sum-text { font-style: italic; font-weight: bold; padding: 10px; border: 1px solid #777; border-top: none; font-size: 12px; margin-bottom: 30px; }
  
  .signatures { display: flex; justify-content: space-between; text-align: center; margin-bottom: 50px; }
  .signatures > div { width: 50%; }
  .sig-title { font-weight: bold; margin-bottom: 5px; }
  .sig-note { font-style: italic; margin-bottom: 10px; font-size: 11px; }

  .digital-sig { border: 2px solid #B31B1B; padding: 10px; border-radius: 5px; display: inline-block; text-align: left; background: rgba(255, 255, 255, 0.9); }
  .digital-sig .check { color: #B31B1B; font-size: 24px; font-weight: bold; padding-right: 10px; float: left; }
  .digital-sig .content { float: left; font-size: 11px; line-height: 1.4; }

  .footer-search { font-size: 11px; text-align: center; font-style: italic; color: #555; padding-top: 10px; border-top: 1px dashed #ccc; }
</style>
</head><body>

  <div class="watermark">
    <h1 style="font-size: 100px; margin:0">BK PETROLAND</h1>
  </div>

  <div class="header-left">
    <div class="company-name">CÔNG TY CỔ PHẦN BK ENERGY</div>
    <div class="company-info">
      Mã số thuế: 0315970509<br>
      Địa chỉ: 47 Tân Hương, Phường Tân Quý, Quận Tân Phú, Thành phố Hồ Chí Minh, Việt Nam<br>
      Điện thoại: 0866766189<br>
      Website: thegioixangdau.com<br>
      Số tài khoản: 18085888 - tại Ngân hàng TMCP Á Châu - Chi nhánh Gò Mây, TP Hồ Chí Minh
    </div>
  </div>
  <div class="header-right">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=VAT-INVOICE-${order.id}" alt="QR" style="margin-bottom: 10px;"/>
  </div>
  <div class="clear"></div>

  <div class="title-section">
    <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
    <p>Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}</p>
    <p>Mã CQT: 000A9A757E67D74E1B9F767CE1E1F3CB73</p>
  </div>

  <div class="form-info">
    Ký hiệu: 1C22TBE<br>
    Số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00000610
  </div>

  <div class="buyer-section">
    Họ tên người mua hàng:<br>
    Tên đơn vị: <strong>CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88</strong><br>
    Mã số thuế: 0202133771<br>
    Địa chỉ: Số 40 đường Trực Cát 2, Phường Vĩnh Niệm, Quận Lê Chân, Thành phố Hải Phòng, Việt Nam<br>
    Hình thức thanh toán: TM/CK
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th width="5%">STT</th>
        <th width="35%">Tên hàng hóa, dịch vụ</th>
        <th width="10%">Đơn vị tính</th>
        <th width="15%">Số lượng</th>
        <th width="15%">Đơn giá</th>
        <th width="20%">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td style="text-align: left;">${order.product}</td>
        <td>Lít</td>
        <td style="text-align: right;">${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
        <td style="text-align: right;">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
      </tr>
      <tr><td style="padding:15px"></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td style="padding:15px"></td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <table class="total-section">
    <tr>
      <td width="70%" style="text-align: right; border-right: none; border-top: none;">Cộng tiền hàng:</td>
      <td width="30%" style="text-align: right; border-left: none; border-top: none;">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
    </tr>
    <tr>
      <td style="text-align: right; border-right: none;">Thuế suất GTGT: 10% &nbsp;&nbsp;&nbsp; Tiền thuế GTGT:</td>
      <td style="text-align: right; border-left: none;">${vat.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
    </tr>
    <tr>
      <td style="text-align: right; font-weight: bold; border-right: none;">Tổng tiền thanh toán:</td>
      <td style="text-align: right; font-weight: bold; border-left: none;">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
    </tr>
  </table>

  <div class="sum-text">
    Số tiền viết bằng chữ: Chuyển đổi thành chữ (Ví dụ: Hai trăm hai mươi hai triệu đồng chẵn.)
  </div>

  <div class="signatures">
    <div>
      <div class="sig-title">Người mua hàng</div>
      <div class="sig-note">(Ký, ghi rõ họ, tên)</div>
    </div>
    <div>
      <div class="sig-title">Người bán hàng</div>
      <div class="sig-note">(Ký, ghi rõ họ, tên)</div>
      
      <div class="digital-sig">
        <div class="check">✓</div>
        <div class="content">
          <strong>Signature Valid</strong><br>
          Ký bởi: CÔNG TY CỔ PHẦN BK ENERGY<br>
          Ký ngày: ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}
        </div>
      </div>
    </div>
  </div>

  <div class="footer-search">
    Tra cứu tại Website: https://www.meinvoice.vn/tra-cuu - Mã tra cứu hóa đơn: 5XIWCXPBGZ_<br>
    (Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)<br>
    Phát hành bởi phần mềm MISA meInvoice - Công ty Cổ phần MISA (www.misa.vn) - MST 0101243150
  </div>

</body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  // ==== TỔNG QUAN ====
  const renderOverview = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')
    const totalRevenue = completed.reduce((s, o) => s + (Number(o.amount) || 0) * 20000, 0) // Giả định giá 20k/L
    const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const pendingExpenses = expenses.filter(e => e.status === 'pending')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2>📊 Tổng Quan Tài Chính</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 15 }}>
          {[
            { icon: '💰', label: 'Doanh thu dự kiến', value: `${totalRevenue.toLocaleString()}₫`, color: '#27ae60' },
            { icon: '💸', label: 'Tổng chi phí', value: `${totalExpense.toLocaleString()}₫`, color: '#e74c3c' },
            { icon: '📊', label: 'Lợi nhuận gộp', value: `${(totalRevenue - totalExpense).toLocaleString()}₫`, color: '#3498db' },
            { icon: '⏳', label: 'Chi phí chờ duyệt', value: pendingExpenses.length, color: '#f39c12' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'white', padding: 20, borderRadius: 8, textAlign: 'center',
              borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Biểu đồ doanh thu vs chi phí */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>📊 Doanh Thu & Chi Phí Theo Tháng</h3>
            {(() => {
              const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
              const monthlyRev = new Array(12).fill(0)
              const monthlyCost = new Array(12).fill(0)
              completed.forEach(o => {
                const d = o.updatedAt || o.createdAt
                if (d) {
                  const dt = new Date(d?._seconds ? d._seconds * 1000 : d)
                  if (!isNaN(dt)) monthlyRev[dt.getMonth()] += (Number(o.amount) || 0) * 20000
                }
              })
              expenses.filter(e => e.status === 'approved').forEach(e => {
                const d = e.date || e.createdAt
                if (d) {
                  const dt = new Date(d?._seconds ? d._seconds * 1000 : d)
                  if (!isNaN(dt)) monthlyCost[dt.getMonth()] += Number(e.amount) || 0
                }
              })
              return <Bar data={{
                labels: months,
                datasets: [
                  { label: 'Doanh thu', data: monthlyRev, backgroundColor: 'rgba(46,204,113,0.7)' },
                  { label: 'Chi phí', data: monthlyCost, backgroundColor: 'rgba(231,76,60,0.7)' }
                ]
              }} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => (v / 1000000).toFixed(0) + 'tr' } } } }} />
            })()}
          </div>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>📈 Cơ cấu Chi phí</h3>
            {(() => {
              const typeMap = {}
              expenses.forEach(e => { typeMap[e.type || 'Khác'] = (typeMap[e.type || 'Khác'] || 0) + Number(e.amount || 0) })
              const labels = Object.keys(typeMap)
              const data = Object.values(typeMap)
              if (labels.length === 0) return <p style={{ color: '#999' }}>Chưa có dữ liệu</p>
              return <Doughnut data={{
                labels,
                datasets: [{ data, backgroundColor: ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#2c3e50'] }]
              }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            })()}
          </div>
        </div>
      </div>
    )
  }

  // ==== CÔNG NỢ PHẢI THU (AR) ====
  const renderAR = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>💰 Công Nợ Phải Thu (AR)</h2>
        <p style={{ color: '#666' }}>Các chuyến đã giao thành công — chờ xuất hóa đơn và thu tiền.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead><tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th><th>Hàng</th><th>Lít</th><th>Ước tính (₫)</th><th>Xe</th><th>Tài xế</th><th>Hành động</th>
          </tr></thead>
          <tbody>
            {completed.map(o => {
              // Tìm dữ liệu order gốc để lấy thông tin giá/quantity chính xác nếu cần (hiện tại lấy từ deliveryOrder info)
              const originalOrder = orders.find(ord => ord.id === o.orderId) || { customerId: o.destination, product: o.product, quantity: o.amount }
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 10 }}><strong>{o.destination}</strong></td>
                  <td style={{ textAlign: 'center' }}>{o.product}</td>
                  <td style={{ textAlign: 'center' }}>{Number(o.amount).toLocaleString()}</td>
                  <td style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>{(Number(o.amount || 0) * 20000).toLocaleString()}₫</td>
                  <td style={{ textAlign: 'center' }}>{o.vehiclePlate}</td>
                  <td style={{ textAlign: 'center' }}>{o.assignedDriverName || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleExportImportSlip(originalOrder)}
                      style={{ padding: '4px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }} title="In Phiếu nhập kho (Theo mẫu 01-VT)">
                      📄 Nhập Kho
                    </button>
                    <button onClick={() => handleExportVATInvoice(originalOrder)}
                      style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }} title="In Hóa đơn Giá trị gia tăng (Điện tử)">
                      📄 Hóa Đơn GTGT
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: 15, background: '#eafaf1', borderRadius: 8, fontWeight: 'bold', textAlign: 'right' }}>
          Tổng AR: {completed.reduce((s, o) => s + (Number(o.amount || 0) * 20000), 0).toLocaleString()}₫
        </div>
      </div>
    )
  }

  // ==== CHI PHÍ VẬN HÀNH (AP) ====
  const handleApproveExpense = async (id, status) => {
    await updateExpenseStatus(id, status)
    loadAll()
  }

  const renderAP = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>💸 Chi Phí Vận Hành & Phải Trả (AP)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: 10, textAlign: 'left' }}>Tài xế</th><th>Loại</th><th>Mô tả</th><th>Tiền (₫)</th><th>Ảnh</th><th>Trạng thái</th><th>Duyệt</th>
        </tr></thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: 10 }}>{e.driverName}</td>
              <td style={{ textAlign: 'center' }}>{e.type}</td>
              <td style={{ textAlign: 'center' }}>{e.description || '-'}</td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{Number(e.amount).toLocaleString()}</td>
              <td style={{ textAlign: 'center' }}>
                {e.receiptImage ? <img src={e.receiptImage} alt="receipt" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4 }} /> : '-'}
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{
                  padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                  background: e.status === 'approved' ? '#d4edda' : e.status === 'rejected' ? '#f8d7da' : '#fff3cd'
                }}>{e.status === 'approved' ? '✅' : e.status === 'rejected' ? '❌' : '⏳'} {e.status}</span>
              </td>
              <td style={{ textAlign: 'center' }}>
                {e.status === 'pending' && (
                  <>
                    <button onClick={() => handleApproveExpense(e.id, 'approved')}
                      style={{ padding: '3px 8px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }}>✅ Duyệt</button>
                    <button onClick={() => handleApproveExpense(e.id, 'rejected')}
                      style={{ padding: '3px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>❌ Từ chối</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ==== LƯƠNG ====
  const renderPayroll = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')
    const payrollData = drivers.map(d => {
      const trips = completed.filter(o => o.assignedDriverId === d.id)
      const tripCount = trips.length
      const totalKm = trips.reduce((s, o) => s + (Number(o.distance) || 0), 0)
      const baseSalary = tripCount * 500000 // 500k/chuyến
      const fuelBonus = trips.reduce((s, o) => {
        const loss = Number(o.fuelLoss) || 0
        const allowed = Number(o.allowedLoss) || 0.5 // % cho phép
        if (loss > allowed) return s - (loss - allowed) * 100000 // Phạt
        if (loss < allowed) return s + (allowed - loss) * 50000 // Thưởng
        return s
      }, 0)
      return { ...d, tripCount, totalKm, baseSalary, fuelBonus, total: baseSalary + fuelBonus }
    }).filter(d => d.tripCount > 0)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>💳 Tính Lương & Thưởng/Phạt Tài Xế</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead><tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Tài xế</th><th>Số chuyến</th><th>Tổng km</th><th>Lương (₫)</th><th>Thưởng/Phạt</th><th>Tổng</th>
          </tr></thead>
          <tbody>
            {payrollData.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có dữ liệu.</td></tr>
            ) : payrollData.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 10 }}><strong>{d.fullname || d.email}</strong></td>
                <td style={{ textAlign: 'center' }}>{d.tripCount}</td>
                <td style={{ textAlign: 'center' }}>{d.totalKm.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>{d.baseSalary.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: d.fuelBonus >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                  {d.fuelBonus >= 0 ? '+' : ''}{d.fuelBonus.toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2980b9' }}>{d.total.toLocaleString()}₫</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ==== ĐỐI SOÁT ====
  const renderReconciliation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>📄 Đối Soát Chứng Từ</h2>
      <p style={{ color: '#666' }}>So sánh Lệnh điều động vs Biên bản giao nhận thực tế (chứng từ do tài xế upload)</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th><th>Xe</th><th>Seal</th><th>Biên bản</th><th>Phiếu hao hụt</th><th>Phiếu XK</th><th>Trạng thái</th>
        </tr></thead>
        <tbody>
          {deliveryOrders.filter(o => o.status === 'completed').map(o => {
            const docs = o.documents || {}
            const hasAll = docs.deliveryReceipt && docs.lossReport && docs.exportSlip
            return (
              <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 10 }}>{o.destination}</td>
                <td style={{ textAlign: 'center' }}>{o.vehiclePlate}</td>
                <td style={{ textAlign: 'center' }}>{o.sealCode || '❓'}</td>
                <td style={{ textAlign: 'center' }}>{docs.deliveryReceipt ? <img src={docs.deliveryReceipt} alt="" style={{ width: 35, height: 28, objectFit: 'cover', borderRadius: 4 }} /> : '❌'}</td>
                <td style={{ textAlign: 'center' }}>{docs.lossReport ? <img src={docs.lossReport} alt="" style={{ width: 35, height: 28, objectFit: 'cover', borderRadius: 4 }} /> : '❌'}</td>
                <td style={{ textAlign: 'center' }}>{docs.exportSlip ? <img src={docs.exportSlip} alt="" style={{ width: 35, height: 28, objectFit: 'cover', borderRadius: 4 }} /> : '❌'}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                    background: hasAll ? '#d4edda' : '#f8d7da',
                    color: hasAll ? '#155724' : '#721c24'
                  }}>{hasAll ? '✅ Đủ' : '⚠️ Thiếu'}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // ==== BÁO CÁO TÀI CHÍNH ====
  const renderFinancialReport = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')
    const approvedExpenses = expenses.filter(e => e.status === 'approved')

    // Theo xe
    const byVehicle = {}
    completed.forEach(o => {
      if (!byVehicle[o.vehiclePlate]) byVehicle[o.vehiclePlate] = { trips: 0, revenue: 0 }
      byVehicle[o.vehiclePlate].trips++
      byVehicle[o.vehiclePlate].revenue += (Number(o.amount) || 0) * 20000
    })

    // Theo khách
    const byCustomer = {}
    completed.forEach(o => {
      const name = o.destination || 'Chưa rõ'
      if (!byCustomer[name]) byCustomer[name] = { trips: 0, revenue: 0 }
      byCustomer[name].trips++
      byCustomer[name].revenue += (Number(o.amount) || 0) * 20000
    })

    const totalRev = completed.reduce((s, o) => s + (Number(o.amount) || 0) * 20000, 0)
    const totalExp = approvedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    // Export CSV
    const handleExportCSV = () => {
      let csv = 'Loại,Tên,Số chuyến,Doanh thu\n'
      Object.entries(byVehicle).forEach(([plate, d]) => csv += `Xe,${plate},${d.trips},${d.revenue}\n`)
      Object.entries(byCustomer).forEach(([name, d]) => csv += `Khách,${name},${d.trips},${d.revenue}\n`)
      csv += `\nTổng doanh thu,,, ${totalRev}\nTổng chi phí,,, ${totalExp}\nLợi nhuận,,, ${totalRev - totalExp}\n`
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'bao_cao_tai_chinh.csv'; a.click()
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>📈 Báo Cáo Tài Chính</h2>
          <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>📥 Xuất CSV</button>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 15 }}>
          <div style={{ background: '#eafaf1', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#27ae60' }}>{totalRev.toLocaleString()}₫</div>
            <div>Tổng Doanh Thu</div>
          </div>
          <div style={{ background: '#fce4e4', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e74c3c' }}>{totalExp.toLocaleString()}₫</div>
            <div>Tổng Chi Phí</div>
          </div>
          <div style={{ background: '#eaf2f8', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2980b9' }}>{(totalRev - totalExp).toLocaleString()}₫</div>
            <div>Lợi Nhuận Gộp</div>
          </div>
        </div>

        {/* Theo xe */}
        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>🚛 Doanh Thu Theo Đầu Xe</h3>
          {Object.keys(byVehicle).length === 0 ? <p style={{ color: '#999' }}>Chưa có dữ liệu.</p> :
            Object.entries(byVehicle).map(([plate, d]) => (
              <div key={plate} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>🚛 <strong>{plate}</strong> — {d.trips} chuyến</span>
                <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{d.revenue.toLocaleString()}₫</span>
              </div>
            ))
          }
        </div>

        {/* Theo khách */}
        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>👤 Doanh Thu Theo Khách Hàng</h3>
          {Object.keys(byCustomer).length === 0 ? <p style={{ color: '#999' }}>Chưa có dữ liệu.</p> :
            Object.entries(byCustomer).map(([name, d]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>🏪 <strong>{name}</strong> — {d.trips} chuyến</span>
                <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{d.revenue.toLocaleString()}₫</span>
              </div>
            ))
          }
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'overview': return renderOverview()
      case 'ar': return renderAR()
      case 'ap': return renderAP()
      case 'payroll': return renderPayroll()
      case 'reconcile': return renderReconciliation()
      case 'report': return renderFinancialReport()
      case 'profile': return <Profile currentUser={user} />
      default: return renderOverview()
    }
  }

  if (loading && activeMenu === 'overview') return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h2>📒 Kế Toán Dashboard</h2>
        </div>
        <div className="navbar-menu">
          <NotificationBell userId={user.userId} />
          <span className="user-info">{user.name}</span>
          <button className="btn-logout" onClick={onLogout}>Đăng xuất</button>
        </div>
      </nav>

      {sidebarOpen && <div className="sidebar-overlay show" onClick={() => setSidebarOpen(false)} />}
      <div className="dashboard-content">
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul className="menu">
            {[['overview', '📊 Tổng Quan'], ['ar', '💰 Công Nợ Phải Thu'], ['ap', '💸 Chi Phí Vận Hành'], ['payroll', '💳 Lương & Thưởng/Phạt'], ['reconcile', '📄 Đối Soát Chứng Từ'], ['report', '📈 Báo Cáo Tài Chính'], ['profile', '👤 Hồ Sơ']].map(([key, label]) => (
              <li key={key} className={`menu-item ${activeMenu === key ? 'active' : ''}`}
                onClick={() => { setActiveMenu(key); setSidebarOpen(false) }}>{label}</li>
            ))}
          </ul>
        </div>
        <div className="main-content">{renderContent()}</div>
      </div>
    </div>
  )
}

export default AccountantDashboard
