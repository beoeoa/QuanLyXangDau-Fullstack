import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import { getAllDeliveryOrders, updateOrderApproval } from '../services/transportationService'
import { getAllExpenses, updateExpenseStatus } from '../services/driverExpenseService'
import { getAllTransactions, createTransaction } from '../services/transactionService'
import { getAllOrders } from '../services/orderService'
import { getAllCustomers } from '../services/customerService'
import { getAllUsers, updateUser } from '../services/userService'
import Profile from './Profile'
import NotificationBell from './NotificationBell'
import { logAudit } from '../services/auditLogService'
import { notifyRole, sendAppNotification } from '../services/notificationService'
import { LayoutDashboard, Receipt, Wallet, CreditCard, FileCheck, BarChart3, UserCheck, Menu, DollarSign, Package, Truck, TrendingUp, AlertCircle } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

import DateRangeFilter, { filterByDate } from './shared/DateRangeFilter'
import { exportPhieuChi, exportBangLuong, exportBienBanHaoHut, exportDeNghiThanhToan, exportUyNhiemChi, exportPnLExcel } from './shared/ExportTemplates'

// Khởi tạo Map để cache data orders (giải quyết lỗi chậm/đơ web do O(N*M))
const ordersCache = new WeakMap();

const getPricing = (orderId, product, reqOrders) => {
  if (!reqOrders) return { cost: 0, margin: 0, freight: 0, totalUnit: 20700 };
  let map = ordersCache.get(reqOrders);
  if (!map) {
    map = new Map();
    for (let i = 0; i < reqOrders.length; i++) {
        map.set(reqOrders[i].id, reqOrders[i]);
    }
    ordersCache.set(reqOrders, map);
  }
  const o = map.get(orderId) || {};
  const i = (o.items || []).find(it => it.product === product) || { costPrice: 20000, margin: 500, freight: 200 };
  return {
    cost: Number(i.costPrice || 0),
    margin: Number(i.margin || 0),
    freight: Number(i.freight || 0),
    totalUnit: Number(i.costPrice || 20000) + Number(i.margin || 500) + Number(i.freight || 200)
  };
}

import ImportDataModal from './shared/ImportDataModal'
import ARConfirmPaymentModal from './shared/ARConfirmPaymentModal'

function AccountantDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [filterFrom, setFilterFrom] = useState(null)
  const [filterTo, setFilterTo] = useState(null)
  const [showImportExpenses, setShowImportExpenses] = useState(false)
  const [showConfirmAR, setShowConfirmAR] = useState(false)
  const [confirmARTrip, setConfirmARTrip] = useState(null)

  // Lương cứng (baseSalary) của tài xế: dùng updateUser để thêm/sửa/xóa
  const [payrollEditorOpen, setPayrollEditorOpen] = useState(false)
  const [payrollEditorMode, setPayrollEditorMode] = useState('add') // add | edit
  const [payrollEditorDriverId, setPayrollEditorDriverId] = useState('')
  const [payrollEditorBaseSalary, setPayrollEditorBaseSalary] = useState('')

  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [transactions, setTransactions] = useState([])

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
    const [dels, exps, ords, custs, usrs, trans] = await Promise.all([
      getAllDeliveryOrders(), getAllExpenses(), getAllOrders(), getAllCustomers(), getAllUsers(), getAllTransactions()
    ])
    setDeliveryOrders(Array.isArray(dels) ? dels : [])
    setExpenses(Array.isArray(exps) ? exps : [])
    setOrders(Array.isArray(ords) ? ords : [])
    setCustomers(Array.isArray(custs) ? custs : [])
    setDrivers(Array.isArray(usrs) ? usrs.filter(u => u.role === 'driver') : [])
    setTransactions(Array.isArray(trans) ? trans : [])
    setLoading(false)
  }

  // ===============================
  // XUẤT PHIẾU NHẬP KHO (Ảnh 2)
  // ===============================
  const handleExportImportSlip = (order) => {
    const customer = customers.find(c => c.id === order.customerId)
    const now = new Date()

    const quantity = Number(order.quantity || 0)
    const item = order.items && order.items.length > 0 ? order.items[0] : { costPrice: 20000, margin: 500, freight: 200 }
    const unitPriceVAT = Number(item.costPrice || 0) + Number(item.margin || 0) + Number(item.freight || 0) || 22000
    const price = unitPriceVAT / 1.1 // Giá trước thuế
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
    const item = order.items && order.items.length > 0 ? order.items[0] : { costPrice: 20000, margin: 500, freight: 200 }
    const unitPriceVAT = Number(item.costPrice || 0) + Number(item.margin || 0) + Number(item.freight || 0) || 22000
    const price = unitPriceVAT / 1.1 // Giá trước thuế
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
      
      <div style="border:1px dashed #777; padding:10px; border-radius:6px; font-size:11px; text-align:left; background:#fff;">
        <strong>Lưu ý:</strong> File này là bản PDF/Print theo template nội bộ để đối chiếu, không tích hợp chữ ký số.
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
    const filteredDeliveries = filterByDate(deliveryOrders, 'updatedAt', filterFrom, filterTo)
    const completed = filteredDeliveries.filter(o => o.status === 'completed')
    const filteredExpenses = filterByDate(expenses, 'date', filterFrom, filterTo)

    let totalRev = 0; let totalCostGoods = 0; let totalFreightRev = 0; let totalMarginRev = 0;
    completed.forEach(o => {
      const p = getPricing(o.orderId, o.product, orders);
      const qty = Number(o.amount) || 0;
      totalRev += qty * p.totalUnit;
      totalCostGoods += qty * p.cost;
      totalFreightRev += qty * p.freight;
      totalMarginRev += qty * p.margin;
    })

    const totalExpense = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    // Lợi nhuận ròng = (Lợi nhuận gộp TM + Doanh thu cước) - Tổng chi phí AP
    const netProfit = (totalMarginRev + totalFreightRev) - totalExpense;

    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng Quan Tài Chính</h2>
          <DateRangeFilter compact onFilter={(from, to) => { setFilterFrom(from); setFilterTo(to) }} />
        </div>

        {/* --- KPI Cards (premium stats-grid) --- */}
        <div className="stats-grid">
          <div className="stat-card" style={{ borderLeft: '4px solid #27ae60' }}>
            <div className="stat-icon" style={{ color: '#27ae60' }}><DollarSign size={24} /></div>
            <div className="stat-info">
              <h3>Doanh thu</h3>
              <p className="stat-number">{totalRev.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #8e44ad' }}>
            <div className="stat-icon" style={{ color: '#8e44ad' }}><Package size={24} /></div>
            <div className="stat-info">
              <h3>Giá vốn hàng</h3>
              <p className="stat-number">{totalCostGoods.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #f39c12' }}>
            <div className="stat-icon" style={{ color: '#f39c12' }}><Truck size={24} /></div>
            <div className="stat-info">
              <h3>DT Vận tải</h3>
              <p className="stat-number">{totalFreightRev.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}>
            <div className="stat-icon" style={{ color: '#e74c3c' }}><Wallet size={24} /></div>
            <div className="stat-info">
              <h3>Chi phí vận hành</h3>
              <p className="stat-number">{totalExpense.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#3498db' : '#e74c3c'}` }}>
            <div className="stat-icon" style={{ color: netProfit >= 0 ? '#3498db' : '#e74c3c' }}><TrendingUp size={24} /></div>
            <div className="stat-info">
              <h3>Lợi Nhuận Ròng</h3>
              <p className="stat-number" style={{ color: netProfit >= 0 ? '#3498db' : '#e74c3c' }}>{netProfit.toLocaleString()}đ</p>
            </div>
          </div>
        </div>


        {/* Biểu đồ doanh thu vs chi phí */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>Doanh Thu &amp; Chi Phí Theo Tháng</h3>
            {(() => {
              const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
              const monthlyRev = new Array(12).fill(0)
              const monthlyCost = new Array(12).fill(0)

              // Doanh thu: lấy từ chuyến hoàn thành theo ngày hoàn thành
              completed.forEach(o => {
                const d = o.updatedAt || o.createdAt
                if (d) {
                  const p = getPricing(o.orderId, o.product, orders)
                  const qty = Number(o.amount) || 0
                  const dt = new Date(d?._seconds ? d._seconds * 1000 : d)
                  if (!isNaN(dt)) {
                    monthlyRev[dt.getMonth()] += qty * p.totalUnit
                    // Chi phí giá vốn theo tháng giao hàng
                    monthlyCost[dt.getMonth()] += qty * p.cost
                  }
                }
              })

              // Chi phí vận hành AP (đã duyệt) theo tháng
              filteredExpenses.filter(e => e.status === 'approved').forEach(e => {
                const d = e.date || e.createdAt
                if (d) {
                  const dt = new Date(d?._seconds ? d._seconds * 1000 : d)
                  if (!isNaN(dt)) monthlyCost[dt.getMonth()] += Number(e.amount) || 0
                }
              })

              return (
                <Bar
                  data={{
                    labels: months,
                    datasets: [
                      { label: 'Doanh thu (Xuất)', data: monthlyRev, backgroundColor: 'rgba(46, 204, 113, 0.7)', borderColor: '#27ae60', borderWidth: 1 },
                      { label: 'Chi phí (Nhập + AP)', data: monthlyCost, backgroundColor: 'rgba(231, 76, 60, 0.7)', borderColor: '#c0392b', borderWidth: 1 }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + 'đ' } } }
                  }}
                />
              )
            })()}
          </div>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>Cơ cấu Chi Phí</h3>
            {(() => {
              // Xây dựng cơ cấu chi phí từ dữ liệu thực
              const costMap = {}

              // Tổng lương cứng của tất cả tài xế
              const totalBaseSalary = drivers.reduce((sum, d) => sum + Number(d.baseSalary || 0), 0);
              let totalFuelBonus = 0;
              let totalHaoHut = 0;

              completed.forEach(o => {
                let fuelBonus = 0;
                const loss = Number(o.fuelLoss) || 0;
                const allowed = Number(o.allowedLoss) || 0.5;
                if (loss > allowed) fuelBonus = - (loss - allowed) * 100000;
                else if (loss < allowed) fuelBonus = (allowed - loss) * 50000;
                totalFuelBonus += fuelBonus;

                const p = getPricing(o.orderId, o.product, orders);
                const xuatKho = Number(o.amount || 0);
                const thucGiao = Number(o.deliveredQuantity || o.amount || 0);
                const haoHutLt = xuatKho - thucGiao;
                if (haoHutLt > 0) {
                  totalHaoHut += haoHutLt * p.cost;
                }
              })

              if (totalCostGoods > 0) costMap['Giá vốn nhập hàng'] = totalCostGoods;
              if ((totalBaseSalary + totalFuelBonus) > 0) costMap['Nhân sự (Lương/Thưởng)'] = totalBaseSalary + totalFuelBonus;
              if (totalHaoHut > 0) costMap['Hao hụt hàng hóa'] = totalHaoHut;

              let vehicleCost = 0;
              let otherCost = 0;

              filteredExpenses.filter(e => e.status === 'approved').forEach(e => {
                const t = (e.type || '').toLowerCase();
                const d = (e.description || '').toLowerCase();

                if (t.includes('xăng') || t.includes('dầu') || t.includes('cầu') || t.includes('đường') || t.includes('bot') || t.includes('sửa') || t.includes('bảo dưỡng') || t.includes('xe') || d.includes('xe') || t.includes('phạt')) {
                  vehicleCost += Number(e.amount || 0);
                }
                else if (t.includes('lương') || t.includes('thưởng')) {
                  costMap['Nhân sự (Lương/Thưởng)'] = (costMap['Nhân sự (Lương/Thưởng)'] || 0) + Number(e.amount || 0);
                }
                else {
                  otherCost += Number(e.amount || 0);
                }
              })

              if (vehicleCost > 0) costMap['Chi phí Xe (Xăng, Cầu đường, Sửa chữa)'] = vehicleCost;
              if (otherCost > 0) costMap['Chi phí Khác'] = otherCost;

              const labels = Object.keys(costMap)
              const data = Object.values(costMap)

              if (labels.length === 0) return <p style={{ color: '#999' }}>Chưa có dữ liệu chi phí</p>

              return (
                <Doughnut
                  data={{
                    labels,
                    datasets: [{
                      data,
                      backgroundColor: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#2c3e50', '#27ae60']
                    }]
                  }}
                  options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                />
              )
            })()}
          </div>
        </div>

      </div>
    )
  }


  // ==== CÔNG NỢ PHẢI THU (AR) ====
  const renderAR = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')

    const getTripARAmount = (trip) => {
      const p = getPricing(trip.orderId, trip.product, orders)
      return (Number(trip.amount || 0) * p.totalUnit) || 0
    }

    const getTripInvoiceStatus = (trip) => {
      const issued = transactions.some(t => t.type === 'ar_invoice_issued' && t.tripId === trip.id)
      if (!issued) return { status: 'Draft', color: '#64748b' }
      const total = getTripARAmount(trip)
      const paid = transactions
        .filter(t => t.type === 'ar_payment' && t.tripId === trip.id)
        .reduce((s, t) => s + (Number(t.amount || t.totalAmount || 0) || 0), 0)
      if (paid <= 0) return { status: 'Issued', color: '#1d4ed8' }
      if (paid < total) return { status: 'Partially Paid', color: '#f59e0b' }
      return { status: 'Paid', color: '#059669' }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>💰 Công Nợ Phải Thu (AR)</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => {
            const custName = prompt('Nhập tên khách hàng để in Bảng Kê Đòi Nợ:')
            if (!custName) return
            const cust = customers.find(c => c.name?.toLowerCase().includes(custName.toLowerCase()))
            const trips = deliveryOrders.filter(o => o.status === 'completed' && (o.destination?.toLowerCase().includes(custName.toLowerCase())))
            exportDeNghiThanhToan(cust || { name: custName }, trips)
          }} style={{ padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            📄 In Bảng Kê Đòi Nợ (ĐNTT)
          </button>
        </div>
        <p style={{ color: '#666' }}>Các chuyến đã giao thành công — chờ xuất hóa đơn và thu tiền.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead><tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th><th>Hàng</th><th>Lít</th><th>Ước tính (₫)</th><th>Trạng thái</th><th>Xe</th><th>Tài xế</th><th>Hành động</th>
          </tr></thead>
          <tbody>
            {completed.map(o => {
              // Tìm dữ liệu order gốc để lấy thông tin giá/quantity chính xác nếu cần (hiện tại lấy từ deliveryOrder info)
              const originalOrder = orders.find(ord => ord.id === o.orderId) || { customerId: o.destination, product: o.product, quantity: o.amount }
              const p = getPricing(o.orderId, o.product, orders)
              const expectedAr = Number(o.amount || 0) * p.totalUnit
              const inv = getTripInvoiceStatus(o)
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 10 }}><strong>{o.destination}</strong></td>
                  <td style={{ textAlign: 'center' }}>{o.product}</td>
                  <td style={{ textAlign: 'center' }}>{Number(o.amount).toLocaleString()}</td>
                  <td style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>{expectedAr.toLocaleString()}₫</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: 'white', background: inv.color }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{o.vehiclePlate}</td>
                  <td style={{ textAlign: 'center' }}>{o.assignedDriverName || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleExportImportSlip(originalOrder)}
                      style={{ padding: '4px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }} title="In Phiếu nhập kho (Theo mẫu 01-VT)">
                      📄 Nhập Kho
                    </button>
                    <button onClick={async () => {
                      handleExportVATInvoice(originalOrder)
                      await createTransaction({
                        type: 'ar_invoice_issued',
                        tripId: o.id,
                        orderId: o.orderId,
                        customerName: o.destination || originalOrder.customerName || '',
                        amount: expectedAr,
                        issuedAt: new Date().toISOString(),
                      })
                      await logAudit('CREATE', `Xuất hóa đơn AR (Issued) cho chuyến ID: ${o.id}`)
                      loadAll()
                    }}
                      style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }} title="In Hóa đơn Giá trị gia tăng (Điện tử)">
                      📄 Hóa Đơn GTGT
                    </button>
                    <button onClick={() => { setConfirmARTrip(o); setShowConfirmAR(true) }}
                      style={{ padding: '4px 8px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginLeft: 6 }} title="Split-screen: ảnh UNC + nhập tay">
                      ✅ Xác nhận thu
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: 15, background: '#eafaf1', borderRadius: 8, fontWeight: 'bold', textAlign: 'right' }}>
          Tổng AR: {completed.reduce((s, o) => {
            const p = getPricing(o.orderId, o.product, orders);
            return s + (Number(o.amount || 0) * p.totalUnit);
          }, 0).toLocaleString()}₫
        </div>
      </div>
    )
  }

  // ==== CHI PHÍ VẬN HÀNH (AP) ====
  const handleApproveExpense = async (id, status) => {
    const exp = expenses.find(e => e.id === id)
    await updateExpenseStatus(id, status)
    await logAudit('UPDATE', `Kế toán ${status === 'approved' ? 'duyệt' : 'từ chối'} chi phí ID: ${id}`)
    if (exp && exp.driverId) {
      await sendAppNotification({ userId: exp.driverId, title: 'Cập nhật phê duyệt Chi phí', message: `Chi phí "${exp.description}" của bạn đã ${status === 'approved' ? 'được duyệt' : 'bị từ chối'}.`, type: 'expense' })
    }
    loadAll()
  }

  const renderAP = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>💸 Chi Phí Vận Hành & Phải Trả (AP)</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowImportExpenses(true)}
            style={{ padding: '6px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            📥 Import Excel
          </button>
        </div>
      </div>
      <DateRangeFilter compact onFilter={(from, to) => { setFilterFrom(from); setFilterTo(to) }} />
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
                {e.status === 'approved' && (
                  <button onClick={() => exportPhieuChi(e)}
                    style={{ padding: '3px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginTop: 4 }}>
                    📄 In Phiếu Chi
                  </button>
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
      const baseSalary = Number(d.baseSalary || 0) // Lương cứng từ hồ sơ Admin điền
      const fuelBonus = trips.reduce((s, o) => {
        const loss = Number(o.fuelLoss) || 0
        const allowed = Number(o.allowedLoss) || 0.5 // % cho phép
        if (loss > allowed) return s - (loss - allowed) * 100000 // Phạt
        if (loss < allowed) return s + (allowed - loss) * 50000 // Thưởng
        return s
      }, 0)
      return { ...d, tripCount, totalKm, baseSalary, fuelBonus, total: baseSalary + fuelBonus }
    }).filter(d => Boolean(d.baseSalary) || d.tripCount > 0)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>💳 Tính Lương & Thưởng/Phạt Tài Xế</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => {
            exportBangLuong(payrollData)
          }}
            style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            📄 In Bảng Lương
          </button>
          <button onClick={() => {
            if (!drivers.length) return alert('Chưa có tài xế.')
            setPayrollEditorMode('add')
            setPayrollEditorDriverId(drivers[0].id)
            setPayrollEditorBaseSalary(String(drivers[0].baseSalary || 0))
            setPayrollEditorOpen(true)
          }}
            style={{ padding: '8px 16px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            ➕ Thêm
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead><tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Tài xế</th><th>Số chuyến</th><th>Tổng km</th><th>Lương (₫)</th><th>Thưởng/Phạt</th><th>Tổng</th><th>Hành động</th>
          </tr></thead>
          <tbody>
            {payrollData.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có dữ liệu.</td></tr>
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
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setPayrollEditorMode('edit')
                        setPayrollEditorDriverId(d.id)
                        setPayrollEditorBaseSalary(String(d.baseSalary || 0))
                        setPayrollEditorOpen(true)
                      }}
                      style={{ padding: '4px 8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                      Sửa
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Xóa cấu hình lương cứng của ${d.fullname || d.email}? (Sẽ đặt baseSalary về 0)`)) return
                        const res = await updateUser(d.id, { baseSalary: 0 })
                        if (res?.success) {
                          await logAudit('UPDATE', `Xóa lương cứng (baseSalary) tài xế ID: ${d.id}`)
                          await loadAll()
                        } else {
                          alert('Lỗi: ' + (res?.message || 'Không rõ'))
                        }
                      }}
                      style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ==== ĐỐI SOÁT ====
  const handleApproveTrip = async (id, status) => {
    let note = ''
    if (status === 'rejected') {
      note = prompt('Nhập lý do từ chối:')
      if (!note) return
    } else {
      if (!window.confirm('Xác nhận CỨNG dữ liệu chuyến này vào Công nợ?')) return
    }

    const trip = deliveryOrders.find(o => o.id === id)
    await updateOrderApproval(id, status, note)
    await logAudit('UPDATE', `Kế toán ${status === 'approved' ? 'ghi nhận' : 'từ chối'} đối soát chuyến ID: ${id}`)

    if (trip) {
      await notifyRole('admin', { title: 'Đối soát chuyến hoàn tất', message: `Chuyến xe ${trip.vehiclePlate} đã được Kế toán chốt đối soát ${status}.`, type: 'system' })
      if (trip.assignedDriverId) {
        await sendAppNotification({ userId: trip.assignedDriverId, title: 'Chốt đối soát', message: `Chuyến hàng ${trip.vehiclePlate} của bạn đã được Kế toán chốt dữ liệu.`, type: 'system' })
      }
    }

    loadAll()
  }

  const renderReconciliation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>📄 Đối Soát Lượng Giao & Chứng Từ</h2>
      <p style={{ color: '#666' }}>Kế toán kiểm tra chứng từ tài xế đưa lên. Định mức hao hụt 0.5%.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 1000, borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead><tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th>
            <th>Cấu trúc P&L (Lít giao x Đơn giá)</th>
            <th>Hao hụt (L)</th><th>Tỷ lệ</th>
            <th>Chứng từ</th><th>Duyệt (Kế toán)</th><th>In phiếu</th>
          </tr></thead>
          <tbody>
            {deliveryOrders.filter(o => o.status === 'completed' || o.approvalStatus).map(o => {
              const docs = o.documents || {}
              const hasAll = docs.deliveryReceipt && docs.lossReport && docs.exportSlip
              const xuatKho = Number(o.amount || 0)
              const thucGiao = Number(o.deliveredQuantity || o.amount || 0)
              const haoHutLt = xuatKho - thucGiao
              const tyLeHaoHut = xuatKho > 0 ? (haoHutLt / xuatKho) * 100 : 0
              const isOverLimit = tyLeHaoHut > 0.5
              const p = getPricing(o.orderId, o.product, orders);

              // Tính toán P&L chuyến
              const doanhThuLoiNhuan = thucGiao * p.margin;
              const doanhThuCuoc = thucGiao * p.freight;
              // Chi phí mềm: phí đường bộ, cầu phà... của riêng chuyến do tài xế up lên
              const tripExpenses = expenses.filter(e => e.type !== 'Lương' && e.description?.includes(o.id) && e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);
              const luongTai = 500000;
              const haoHutCost = haoHutLt > 0 ? haoHutLt * p.cost : 0;
              const netTripProfit = doanhThuLoiNhuan + (doanhThuCuoc - tripExpenses - luongTai) - haoHutCost;

              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0', background: o.approvalStatus === 'approved' ? '#f8fff9' : o.approvalStatus === 'rejected' ? '#fffafa' : 'white' }}>
                  <td style={{ padding: 10, minWidth: 150 }}><strong>{o.destination}</strong><br /><span style={{ fontSize: 11, color: '#666' }}>Xe: {o.vehiclePlate}</span></td>
                  <td style={{ textAlign: 'left', minWidth: 350, fontSize: 13, lineHeight: '1.6' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#f8f9fa', padding: 8, borderRadius: 6 }}>
                        <div style={{ color: '#2980b9' }}><b>Lãi Gộp:</b> {doanhThuLoiNhuan.toLocaleString()}₫</div>
                        <div style={{ color: '#27ae60' }}><b>Cước Vận Tải:</b> {doanhThuCuoc.toLocaleString()}₫</div>
                        <div style={{ color: '#8e44ad' }}><b>Tiền Hàng:</b> {(thucGiao * p.cost).toLocaleString()}₫</div>
                      </div>
                      <div style={{ background: '#fff5f5', padding: 8, borderRadius: 6 }}>
                        <div style={{ color: '#c0392b' }}><b>Lương tài xe:</b> -{luongTai.toLocaleString()}₫</div>
                        <div style={{ color: '#d35400' }}><b>Chi phí khác:</b> -{tripExpenses.toLocaleString()}₫</div>
                        <div style={{ color: '#c0392b' }}><b>Phạt Hao hụt:</b> -{haoHutCost.toLocaleString()}₫</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, textAlign: 'center', fontWeight: 'bold', color: netTripProfit >= 0 ? '#27ae60' : '#c0392b', borderTop: '1px solid #eee', paddingTop: 6 }}>
                      Lợi Nhuận Ròng Chuyến: {netTripProfit > 0 ? '+' : ''}{netTripProfit.toLocaleString()}₫
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: haoHutLt > 0 ? '#e67e22' : '#333' }}>
                    {xuatKho.toLocaleString()} {'->'} <b style={{ color: '#1a237e' }}>{thucGiao.toLocaleString()}</b><br />
                    Hao: {haoHutLt.toLocaleString()} L
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '3px 6px', borderRadius: 4, fontWeight: 'bold', background: isOverLimit ? '#fee2e2' : '#eafaf1', color: isOverLimit ? '#dc2626' : '#27ae60' }}>
                      {tyLeHaoHut.toFixed(2)}%
                    </span>
                    {isOverLimit && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>Vượt định mức 0.5%!</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {docs.exportSlip ? <span title="Phiếu XK">📝</span> : <span title="Thiếu Phiếu XK">⚠️</span>}
                      {docs.deliveryReceipt ? <span title="Biên bản giao">📝</span> : <span title="Thiếu Biên bản">⚠️</span>}
                      {docs.lossReport ? <span title="BB Hao hụt">📝</span> : <span title="Thiếu BB Hao hụt">⚠️</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {o.approvalStatus === 'approved' ? (
                      <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ Đã chốt</span>
                    ) : o.approvalStatus === 'rejected' ? (
                      <span style={{ color: '#c0392b', fontWeight: 'bold' }}>❌ Từ chối</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => handleApproveTrip(o.id, 'approved')} disabled={!hasAll}
                          style={{ padding: '4px 8px', background: hasAll ? '#27ae60' : '#bdc3c7', color: 'white', border: 'none', borderRadius: 4, cursor: hasAll ? 'pointer' : 'not-allowed', fontSize: 11 }}>✔️ Duyệt</button>
                        <button onClick={() => handleApproveTrip(o.id, 'rejected')}
                          style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>❌ Từ chối</button>
                      </div>
                    )}
                    {o.approvalNote && <div style={{ fontSize: 10, color: '#c0392b', fontStyle: 'italic', marginTop: 4 }}>Lý do: {o.approvalNote}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => exportBienBanHaoHut(o)} style={{ padding: '4px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>📄 BB Hao hụt</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ==== BÁO CÁO TÀI CHÍNH ====
  const renderFinancialReport = () => {
    const completed = deliveryOrders.filter(o => o.status === 'completed')
    const approvedExpenses = expenses.filter(e => e.status === 'approved')

    // Theo xe
    const byVehicle = {}
    completed.forEach(o => {
      const p = getPricing(o.orderId, o.product, orders);
      if (!byVehicle[o.vehiclePlate]) byVehicle[o.vehiclePlate] = { trips: 0, revenue: 0 }
      byVehicle[o.vehiclePlate].trips++
      byVehicle[o.vehiclePlate].revenue += (Number(o.amount) || 0) * p.totalUnit
    })

    // Theo khách
    const byCustomer = {}
    completed.forEach(o => {
      const p = getPricing(o.orderId, o.product, orders);
      const name = o.destination || 'Chưa rõ'
      if (!byCustomer[name]) byCustomer[name] = { trips: 0, revenue: 0 }
      byCustomer[name].trips++
      byCustomer[name].revenue += (Number(o.amount) || 0) * p.totalUnit
    })

    const totalRev = completed.reduce((s, o) => {
      const p = getPricing(o.orderId, o.product, orders);
      return s + (Number(o.amount) || 0) * p.totalUnit;
    }, 0)
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>📥 Xuất CSV</button>
            <button onClick={() => {
              const totalRevenue = completed.reduce((s, o) => {
                const p = getPricing(o.orderId, o.product, orders);
                return s + (Number(o.amount) || 0) * p.totalUnit;
              }, 0)
              const expByType = {}
              approvedExpenses.forEach(e => {
                const t = e.type === 'BOT' ? 'bot' : e.type === 'fuel' ? 'fuel' : e.type === 'repair' ? 'repair' : 'other'
                expByType[t] = (expByType[t] || 0) + Number(e.amount || 0)
              })
              exportPnLExcel(totalRevenue, expByType)
            }} style={{ padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>📊 Xuất P&L Excel</button>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Receipt size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>Kế Toán</h2>
          </div>
        </div>
        <div className="navbar-menu">
          <NotificationBell userId={user.userId} />
          <span className="user-info">{user.name}</span>
          <button className="btn-logout" onClick={onLogout}>Đăng xuất</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="sidebar">
          <ul className="menu">
            <li className="menu-section-title">Tài chính</li>
            <li className={`menu-item ${activeMenu === 'overview' ? 'active' : ''}`} onClick={() => setActiveMenu('overview')}><LayoutDashboard size={18} /> Tổng Quan</li>
            <li className={`menu-item ${activeMenu === 'ar' ? 'active' : ''}`} onClick={() => setActiveMenu('ar')}><Receipt size={18} /> Công Nợ Phải Thu</li>
            <li className={`menu-item ${activeMenu === 'ap' ? 'active' : ''}`} onClick={() => setActiveMenu('ap')}><Wallet size={18} /> Chi Phí Vận Hành</li>
            <li className={`menu-item ${activeMenu === 'payroll' ? 'active' : ''}`} onClick={() => setActiveMenu('payroll')}><CreditCard size={18} /> Lương & Thưởng/Phạt</li>

            <li className="menu-section-title">Đối soát & Báo cáo</li>
            <li className={`menu-item ${activeMenu === 'reconcile' ? 'active' : ''}`} onClick={() => setActiveMenu('reconcile')}><FileCheck size={18} /> Đối Soát Chứng Từ</li>
            <li className={`menu-item ${activeMenu === 'report' ? 'active' : ''}`} onClick={() => setActiveMenu('report')}><BarChart3 size={18} /> Báo Cáo Tài Chính</li>

            <li className="menu-section-title">Tài khoản</li>
            <li className={`menu-item ${activeMenu === 'profile' ? 'active' : ''}`} onClick={() => setActiveMenu('profile')}><UserCheck size={18} /> Hồ Sơ</li>
          </ul>
        </div>
        <div className="main-content">{renderContent()}</div>
      </div>

      <ImportDataModal isOpen={showImportExpenses} onClose={() => setShowImportExpenses(false)} title="Chi Phí"
        columns={[
          { key: 'driverName', label: 'Tài xế', required: true },
          { key: 'type', label: 'Loại', required: true },
          { key: 'amount', label: 'Số tiền', required: true },
          { key: 'description', label: 'Mô tả' },
        ]}
        templateData={[{ driverName: 'Nguyễn Văn A', type: 'BOT', amount: 150000, description: 'Trạm Pháp Vân' }]}
        onImport={async (rows) => { alert('Đã import ' + rows.length + ' dòng!'); loadAll() }}
      />
      {/* Modal thêm/sửa lương cứng (baseSalary) */}
      {payrollEditorOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
          zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14
        }}>
          <div style={{
            width: 'min(760px, 96vw)', background: 'white', borderRadius: 14,
            boxShadow: '0 16px 50px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {payrollEditorMode === 'add' ? '➕ Thêm lương cứng' : '✏️ Sửa lương cứng'}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Lương cứng được lưu trong `drivers.baseSalary` và bảng lương sẽ tự tính lại.
                </div>
              </div>
              <button
                onClick={() => setPayrollEditorOpen(false)}
                style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: 20, color: '#64748b' }}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Tài xế</div>
                <select
                  value={payrollEditorDriverId}
                  onChange={(e) => setPayrollEditorDriverId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 10px', borderRadius: 10,
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13
                  }}
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullname || d.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Lương cứng (VNĐ)</div>
                <input
                  value={payrollEditorBaseSalary}
                  onChange={(e) => setPayrollEditorBaseSalary(e.target.value)}
                  inputMode="numeric"
                  style={{
                    width: '100%', padding: '10px 10px', borderRadius: 10,
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13
                  }}
                  placeholder="VD: 8000000"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  onClick={() => setPayrollEditorOpen(false)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#0f172a', fontWeight: 800 }}
                >
                  Hủy
                </button>
                <button
                  onClick={async () => {
                    const n = Number(String(payrollEditorBaseSalary).replace(/\./g, '').replace(/,/g, '.')) || 0
                    if (!payrollEditorDriverId) return alert('Chưa chọn tài xế.')
                    const res = await updateUser(payrollEditorDriverId, { baseSalary: n })
                    if (!res?.success) return alert('Lỗi cập nhật: ' + (res?.message || 'Không rõ'))

                    const driver = drivers.find(d => d.id === payrollEditorDriverId)
                    await logAudit(
                      'UPDATE',
                      `${payrollEditorMode === 'add' ? 'Thêm' : 'Sửa'} lương cứng (baseSalary=${n}) - tài xế ID: ${payrollEditorDriverId}`
                    )

                    // Optionally notify driver (nếu hệ thống của bạn đã bật)
                    if (driver?.id) {
                      await sendAppNotification({
                        userId: driver.id,
                        title: 'Cập nhật lương cứng',
                        message: `Lương cứng baseSalary của bạn đã được cập nhật: ${n.toLocaleString()} VNĐ.`,
                        type: 'payroll',
                      }).catch(() => {})
                    }

                    setPayrollEditorOpen(false)
                    await loadAll()
                  }}
                  style={{ flex: 2, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#059669', color: 'white', fontWeight: 900 }}
                >
                  ✅ Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ARConfirmPaymentModal
        isOpen={showConfirmAR}
        trip={confirmARTrip}
        onClose={() => { setShowConfirmAR(false); setConfirmARTrip(null) }}
        onConfirm={async ({ amount, sender, content, receiptImage }) => {
          if (!confirmARTrip) return
          await createTransaction({
            type: 'ar_payment',
            tripId: confirmARTrip.id,
            orderId: confirmARTrip.orderId,
            customerName: confirmARTrip.destination || '',
            amount: Number(amount || 0),
            sender: sender || '',
            content: content || '',
            receiptImage: receiptImage || '',
            paidAt: new Date().toISOString(),
          })
          await logAudit('CREATE', `Xác nhận thu AR cho chuyến ID: ${confirmARTrip.id} — ${Number(amount || 0).toLocaleString()}đ`)
          setShowConfirmAR(false)
          setConfirmARTrip(null)
          loadAll()
        }}
      />
    </div>
  )
}

export default AccountantDashboard
