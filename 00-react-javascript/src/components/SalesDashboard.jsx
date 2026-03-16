import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import { getAllCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/customerService'
import { createOrder, getAllOrders, updateOrder, deleteOrder } from '../services/orderService'
import { getAllDeliveryOrders, createDeliveryOrder } from '../services/transportationService'
import { getAllFleetVehicles } from '../services/fleetVehicleService'
import { getAllUsers } from '../services/userService'
import Profile from './Profile'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

import ContractManager from './sales/ContractManager'
import NotificationBell from './NotificationBell'
import DriverScheduleManager from './admin/DriverScheduleManager'
import DateRangeFilter, { filterByDate } from './shared/DateRangeFilter'
import { exportPhieuXuatKho, exportLenhDieuXe, exportHopDongNguyenTac } from './shared/ExportTemplates'
import ImportDataModal from './shared/ImportDataModal'
import OCRScanner from './shared/OCRScanner'

function SalesDashboard({ user, onLogout }) {
    const [activeMenu, setActiveMenu] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [filterDateFrom, setFilterDateFrom] = useState(null)
    const [filterDateTo, setFilterDateTo] = useState(null)

    // Import & OCR states
    const [showImportOrders, setShowImportOrders] = useState(false)
    const [showImportCustomers, setShowImportCustomers] = useState(false)
    const [showOCR, setShowOCR] = useState(false)
    const [showOCRGPDKKD, setShowOCRGPDKKD] = useState(false)

    // Data states
    const [customers, setCustomers] = useState([])
    const [orders, setOrders] = useState([])
    const [deliveryOrders, setDeliveryOrders] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [drivers, setDrivers] = useState([])

    // Form states
    const [showCustForm, setShowCustForm] = useState(false)
    const [editingCust, setEditingCust] = useState(null)
    const [custForm, setCustForm] = useState({ name: '', address: '', contact: '', phone: '' })

    const [showOrderForm, setShowOrderForm] = useState(false)
    const [editingOrder, setEditingOrder] = useState(null)
    const [orderForm, setOrderForm] = useState({ customerId: '', customerName: '', product: '', quantity: '', requestDate: '', notes: '' })

    const [showDispatchForm, setShowDispatchForm] = useState(false)
    const [dispatchForm, setDispatchForm] = useState({ orderId: '', vehiclePlate: '', assignedDriverId: '', assignedDriverName: '', sourceWarehouse: '', destination: '', product: '', amount: '' })

    useEffect(() => {
        const check = async () => {
            const result = await verifyUserRole(user.userId, 'sales')
            if (!result.success) { alert('Lỗi xác minh quyền!'); onLogout() }
        }
        if (user?.userId) {
            check()
            loadAll()

            if (user.isProfileUpdated === false && !sessionStorage.getItem('profileAlertShown_Sales')) {
                alert('⚠️ Yêu cầu bắt buộc: Vui lòng cập nhật đầy đủ thông tin cá nhân (SĐT, Địa chỉ...) để hồ sơ hoàn tất!')
                setActiveMenu('profile')
                sessionStorage.setItem('profileAlertShown_Sales', 'true')
            }
        }
    }, [user?.userId])

    const loadAll = async () => {
        setLoading(true)
        const [custs, ords, delOrds, vehs, usrs] = await Promise.all([
            getAllCustomers(), getAllOrders(), getAllDeliveryOrders(),
            getAllFleetVehicles(), getAllUsers()
        ])
        setCustomers(Array.isArray(custs) ? custs : [])
        setOrders(Array.isArray(ords) ? ords : [])
        setDeliveryOrders(Array.isArray(delOrds) ? delOrds : [])
        setVehicles(Array.isArray(vehs) ? vehs : [])
        setDrivers(Array.isArray(usrs) ? usrs.filter(u => u.role === 'driver' && u.isApproved !== false) : [])
        setLoading(false)
    }

    // ===============================
    // XUẤT BIÊN BẢN GIAO HÀNG (Ảnh 1 cũ)
    // ===============================
    const handleExportDeliveryReceipt = (order) => {
        const delOrder = deliveryOrders.find(d => d.orderId === order.id || (d.destination === order.customerName && d.product === order.product))
        const customer = customers.find(c => c.id === order.customerId)
        const now = new Date()

        const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Biên Bản Giao Hàng</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 14px; margin: 0; padding: 20px; color: #000; }
  .header { text-align: center; margin-bottom: 10px; }
  .company-name { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #1a237e; }
  .company-info { font-size: 12px; color: #333; }
  .title { text-align: center; margin: 20px 0 5px; }
  .title h1 { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
  .title p { font-size: 13px; font-style: italic; margin: 2px 0 0; }
  .date-line { text-align: right; font-style: italic; margin-bottom: 15px; }
  .info-section { margin: 10px 0; line-height: 1.8; }
  .info-section .row { display: flex; gap: 20px; }
  .info-section .row span { flex: 1; }
  .info-label { font-weight: bold; }
  .dotted { border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 150px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { border: 1px solid #000; padding: 8px 10px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  td:first-child { width: 40px; }
  td:nth-child(2) { text-align: left; }
  .note-section { margin: 15px 0; font-size: 13px; line-height: 1.6; }
  .sample-line { margin: 10px 0; }
  .legal-text { font-size: 12px; font-style: italic; margin: 10px 0; line-height: 1.5; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
  .signatures div { width: 45%; }
  .signatures .sig-title { font-weight: bold; margin-bottom: 60px; }
  .signatures .sig-note { font-size: 12px; font-style: italic; }
</style>
</head><body>
  <div class="header">
    <div class="company-name">CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88</div>
    <div class="company-info">Địa chỉ: Số 81 Trực Cát, Phường Vĩnh Niệm, Quận Lê Chân, Tp. Hải Phòng</div>
    <div class="company-info">Tel: 0986.611.755 / Email: daukhi88@gmail.com</div>
  </div>

  <div class="date-line">Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</div>

  <div class="title">
    <h1>BIÊN BẢN GIAO HÀNG</h1>
    <p>(KIÊM PHIẾU XUẤT KHO)</p>
  </div>

  <div class="info-section">
    <p>– <span class="info-label">Bên giao hàng:</span> Công Ty TNHH Dịch Vụ Thương Mại Vận Tải 88</p>
    <div class="row">
      <span>Đại diện: <span class="dotted">${delOrder?.assignedDriverName || '.............................'}</span></span>
      <span>Phương tiện: <span class="dotted">${delOrder?.vehiclePlate || '.............................'}</span></span>
    </div>
    <p>– <span class="info-label">Bên nhận hàng:</span> <span class="dotted">${order.customerName || customer?.name || '.............................'}</span></p>
    <div class="row">
      <span>Địa chỉ: <span class="dotted">${customer?.address || '.............................'}</span></span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Tên hàng hoá</th>
        <th>ĐVT</th>
        <th>Số lượng</th>
        <th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td style="text-align:left">${order.product || ''}</td>
        <td>Lít</td>
        <td>${order.quantity ? Number(order.quantity).toLocaleString() : ''}</td>
        <td>${order.notes || ''}</td>
      </tr>
      <tr><td>2</td><td></td><td>Lít</td><td></td><td></td></tr>
      <tr><td>3</td><td></td><td>Lít</td><td></td><td></td></tr>
    </tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:left; font-weight:bold">TỔNG</td></tr>
    </tfoot>
  </table>

  <div class="sample-line">– Chai mẫu đi kèm (giao khách hàng): ...............................</div>

  <div class="legal-text">
    Hai bên đã thống nhất hàng giao đúng chủng loại và số lượng như trên. 
    Biên bản này được lập thành 02 bản, mỗi bên giữ 01 bản và có giá trị pháp lý như nhau, 
    là cơ sở pháp lý để bên nhận hàng (bên mua) thanh toán cho bên giao hàng (bên bán).
  </div>

  <div class="signatures">
    <div>
      <div class="sig-title">Đại diện Bên giao hàng</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Đại diện Bên nhận hàng</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
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
    // XUẤT PHIẾU ĐỀ NGHỊ CẤP XĂNG DẦU (Ảnh 1 mới)
    // ===============================
    const handleExportSupplyRequest = (order) => {
        const customer = customers.find(c => c.id === order.customerId)
        const now = new Date()

        const randomSo = `04102201/VT88-BK/2022` // Fake số HD cho giống ảnh hoặc lấy ngẫu nhiên

        const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Phiếu Đề Nghị Cấp Xăng Dầu</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 0; padding: 20px; color: #000; }
  .header-left { position: absolute; top: 0; left: 0; font-size: 11px; line-height: 1.4; }
  .header-right { position: absolute; top: 0; right: 0; font-style: italic; }
  .title { text-align: center; margin-top: 50px; margin-bottom: 20px; }
  .title h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
  .title p { margin: 5px 0 0; }
  
  .kinh-gui { font-weight: bold; font-size: 14px; margin: 15px 0; }
  .noi-dung { margin-bottom: 15px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #000; padding: 8px; text-align: center; }
  th { font-weight: bold; background: #fff; }

  .notes-section { font-size: 12px; font-style: italic; line-height: 1.6; margin-bottom: 40px; }

  .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 20px; }
  .signatures > div { width: 33%; }
  .sig-title { font-weight: bold; margin-bottom: 80px; text-transform: uppercase; }
  .stamp { margin-top: -60px; margin-bottom: 60px; display: inline-block; border-radius: 50%; width: 100px; height: 100px; border: 2px solid red; color: red; transform: rotate(-15deg); font-size: 10px; font-weight: bold; padding-top: 25px; box-sizing: border-box; }
</style>
</head><body>
  <div class="header-left">
    <strong>CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88</strong><br/>
    Địa chỉ: Số 81 đường Trực Cát, Phường Vĩnh Niệm, Quận Lê Chân, Thành phố Hải Phòng
  </div>
  <div class="header-right">
    Hải Phòng, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}
  </div>

  <div class="title">
    <h1>PHIẾU ĐỀ NGHỊ CẤP XĂNG DẦU</h1>
    <p>Số: ${randomSo}</p>
  </div>

  <div class="kinh-gui">
    Kính gửi: ${order.customerName || customer?.name || '..............................................'}
  </div>
  
  <div class="noi-dung">
    Căn cứ vào nhu cầu CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88 đề nghị cấp Xăng - Dầu với nội dung như sau:
  </div>

  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Tên hàng hóa</th>
        <th>ĐVT</th>
        <th>Số Lượng<br>(lít)</th>
        <th>Giá bán lẻ<br>(đồng/lít)</th>
        <th>Chiết khấu<br>(đồng/lít)</th>
        <th>Giá thanh toán<br>(đồng/lít)</th>
        <th>Thành tiền</th>
        <th>Địa điểm nhận hàng</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${order.product}</td>
        <td>Lít</td>
        <td>${Number(order.quantity || 0).toLocaleString()}</td>
        <td>22.200</td>
        <td>-</td>
        <td>22.200</td>
        <td style="font-weight: bold;">${(Number(order.quantity || 0) * 22200).toLocaleString()}</td>
        <td>${customer?.address || ''}</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Vận chuyển</td>
        <td>Chuyến</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style="font-weight: bold;">3.500.000</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="7" style="font-weight: bold; text-align: center;">TỔNG</td>
        <td style="font-weight: bold; font-size: 15px;">${((Number(order.quantity || 0) * 22200) + 3500000).toLocaleString()}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes-section">
    * Đơn giá là giá đã bao gồm thuế VAT, vận chuyển và thuế môi trường (nếu có).<br>
    * Ngày nhận hàng: ${order.requestDate || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`}<br>
    * Thời hạn thanh toán trong ngày: Thanh toán sau khi giao hàng<br>
    Bản fax, email, chụp zalo, chụp màn hình gửi qua zalo, tin nhắn SMS có giá trị như bản chính và là cơ sở cho việc xác nhận đặt hàng.
  </div>

  <div class="signatures">
    <div>
      <div class="sig-title">CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88</div>
      <div>Giám Đốc</div>
    </div>
    <div></div>
    <div>
      <div class="sig-title">ĐẠI DIỆN BÊN NHẬN HÀNG</div>
      <div>(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
</body></html>`

        const printWindow = window.open('', '_blank')
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
    }

    // ==== OVERVIEW ====
    const renderOverview = () => {
        const newOrders = orders.filter(o => o.status === 'new').length
        const activeDeliveries = deliveryOrders.filter(o => o.status !== 'completed').length
        const completedDeliveries = deliveryOrders.filter(o => o.status === 'completed').length
        const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status === 'Hoạt động').length

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2>📊 Tổng Quan Kinh Doanh</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 15 }}>
                    {[
                        { icon: '📋', label: 'Đơn mới', value: newOrders, color: '#3498db' },
                        { icon: '🚚', label: 'Đang giao', value: activeDeliveries, color: '#f39c12' },
                        { icon: '✅', label: 'Đã giao', value: completedDeliveries, color: '#27ae60' },
                        { icon: '🚛', label: 'Xe hoạt động', value: `${activeVehicles}/${vehicles.length}`, color: '#8e44ad' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: 'white', padding: 20, borderRadius: 8, textAlign: 'center',
                            borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ fontSize: 28 }}>{s.icon}</div>
                            <div style={{ fontSize: 28, fontWeight: 'bold', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Biểu đồ doanh số theo sản phẩm */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                    <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0 }}>📊 Doanh số theo sản phẩm (Lít)</h3>
                        {(() => {
                            const productMap = {}
                            orders.forEach(o => {
                                const p = o.product || 'Khác'
                                productMap[p] = (productMap[p] || 0) + Number(o.quantity || 0)
                            })
                            const labels = Object.keys(productMap)
                            const data = Object.values(productMap)
                            if (labels.length === 0) return <p style={{ color: '#999' }}>Chưa có đơn hàng</p>
                            return <Bar data={{
                                labels,
                                datasets: [{ label: 'Số lượng (L)', data, backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'] }]
                            }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
                        })()}
                    </div>
                    <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0 }}>📈 Trạng thái đơn hàng</h3>
                        {(() => {
                            const statusMap = {}
                            orders.forEach(o => { statusMap[o.status || 'new'] = (statusMap[o.status || 'new'] || 0) + 1 })
                            const labels = Object.keys(statusMap)
                            const data = Object.values(statusMap)
                            if (labels.length === 0) return <p style={{ color: '#999' }}>Không có</p>
                            return <Doughnut data={{
                                labels,
                                datasets: [{ data, backgroundColor: ['#3498db', '#f39c12', '#27ae60', '#e74c3c'] }]
                            }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                        })()}
                    </div>
                </div>

                {/* Top Khách hàng */}
                <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0 }}>🏆 Top Khách Hàng Theo Sản Lượng</h3>
                    {(() => {
                        const custMap = {}
                        orders.forEach(o => {
                            const name = o.customerName || 'N/A'
                            custMap[name] = (custMap[name] || 0) + Number(o.quantity || 0)
                        })
                        const sorted = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
                        return sorted.length === 0 ? <p style={{ color: '#999' }}>Chưa có dữ liệu</p> : (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {sorted.map(([name, qty], i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: i === 0 ? '#fff8e1' : '#f9f9f9', borderRadius: 6, borderLeft: `4px solid ${['#f39c12', '#3498db', '#27ae60', '#9b59b6', '#e74c3c'][i]}` }}>
                                        <span><strong>{i + 1}. {name}</strong></span>
                                        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{qty.toLocaleString()} L</span>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}
                </div>

                <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0 }}>📋 Đơn hàng gần nhất</h3>
                    {orders.slice(0, 5).map(o => (
                        <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span><strong>{o.customerName}</strong> — {o.product} ({o.quantity}L)</span>
                            <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                                background: o.status === 'new' ? '#cce5ff' : o.status === 'dispatched' ? '#fff3cd' : '#d4edda'
                            }}>{o.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ==== CRM ====
    const handleCustSubmit = async (e) => {
        e.preventDefault()
        if (editingCust) {
            await updateCustomer(editingCust, custForm)
        } else {
            await addCustomer(custForm)
        }
        setShowCustForm(false)
        setEditingCust(null)
        setCustForm({ name: '', address: '', contact: '', phone: '' })
        loadAll()
    }

    const handleEditCust = (c) => {
        setCustForm({ name: c.name || '', address: c.address || '', contact: c.contact || '', phone: c.phone || '' })
        setEditingCust(c.id)
        setShowCustForm(true)
    }

    const handleDeleteCust = async (id) => {
        if (window.confirm('Bạn chắc chắn muốn xóa khách hàng này?')) {
            await deleteCustomer(id)
            loadAll()
        }
    }

    const renderCRM = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h2>👤 Quản Lý Khách Hàng (CRM)</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowImportCustomers(true)}
                        style={{ padding: '8px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        📥 Import Excel
                    </button>
                    <button onClick={() => setShowOCRGPDKKD(true)}
                        style={{ padding: '8px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        📸 Quét GPĐKKD
                    </button>
                    <button onClick={() => { setShowCustForm(!showCustForm); setEditingCust(null); setCustForm({ name: '', address: '', contact: '', phone: '' }) }}
                        style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {showCustForm ? '✕ Đóng' : '+ Thêm Đại lý'}
                    </button>
                </div>
            </div>

            {showCustForm && (
                <form onSubmit={handleCustSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8 }}>
                    <h4 style={{ marginTop: 0 }}>{editingCust ? '✏️ Sửa thông tin đại lý' : '➕ Thêm đại lý mới'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { name: 'name', label: 'Tên đại lý *', req: true },
                            { name: 'contact', label: 'Người liên hệ' },
                            { name: 'phone', label: 'Số điện thoại' },
                            { name: 'address', label: 'Địa chỉ' },
                        ].map(f => (
                            <div key={f.name}>
                                <label style={{ fontWeight: 'bold', fontSize: 13 }}>{f.label}</label>
                                <input type="text" required={f.req} value={custForm[f.name]}
                                    onChange={e => setCustForm({ ...custForm, [f.name]: e.target.value })}
                                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                            </div>
                        ))}
                    </div>
                    <button type="submit" style={{ marginTop: 12, padding: '8px 20px', background: editingCust ? '#f39c12' : '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {editingCust ? '💾 Cập nhật' : '💾 Lưu'}
                    </button>
                    {editingCust && (
                        <button type="button" onClick={() => { setShowCustForm(false); setEditingCust(null) }}
                            style={{ marginLeft: 8, padding: '8px 20px', background: '#777', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
                    )}
                </form>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th>
                        <th>Liên hệ</th>
                        <th>SĐT</th>
                        <th>Địa chỉ</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 10 }}><strong>{c.name}</strong></td>
                            <td style={{ textAlign: 'center' }}>{c.contact || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{c.phone || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{c.address || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleEditCust(c)}
                                    style={{ padding: '4px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>✏️ Sửa</button>
                                <button onClick={() => exportHopDongNguyenTac(c)}
                                    style={{ padding: '4px 10px', background: '#1a237e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>📄 HĐNT</button>
                                <button onClick={() => handleDeleteCust(c.id)}
                                    style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🗑️ Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    // ==== ĐƠN HÀNG ====
    const handleOrderSubmit = async (e) => {
        e.preventDefault()
        if (editingOrder) {
            await updateOrder(editingOrder, orderForm)
        } else {
            await createOrder({ ...orderForm, createdBy: user.userId, createdByName: user.name })
        }
        setShowOrderForm(false)
        setEditingOrder(null)
        setOrderForm({ customerId: '', customerName: '', product: '', quantity: '', requestDate: '', notes: '' })
        loadAll()
    }

    const handleEditOrder = (o) => {
        setOrderForm({
            customerId: o.customerId || '',
            customerName: o.customerName || '',
            product: o.product || '',
            quantity: o.quantity || '',
            requestDate: o.requestDate || '',
            notes: o.notes || ''
        })
        setEditingOrder(o.id)
        setShowOrderForm(true)
    }

    const renderOrders = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h2>📋 Quản Lý Đơn Hàng</h2>
                <button onClick={() => { setShowOrderForm(!showOrderForm); setEditingOrder(null); setOrderForm({ customerId: '', customerName: '', product: '', quantity: '', requestDate: '', notes: '' }) }}
                    style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    {showOrderForm ? '✕ Đóng' : '+ Tạo đơn mới'}
                </button>
            </div>

            {/* Bộ lọc thời gian */}
            <div className="date-filter-bar">
                <label>📅 Lọc theo ngày:</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                <span>→</span>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                    style={{ background: '#e74c3c', color: 'white' }}>Xóa lọc</button>
            </div>

            {showOrderForm && (
                <form onSubmit={handleOrderSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8 }}>
                    <h4 style={{ marginTop: 0 }}>{editingOrder ? '✏️ Sửa Đơn Hàng' : '➕ Tạo Đơn Mới'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Khách hàng *</label>
                            <select required value={orderForm.customerId}
                                onChange={e => {
                                    const c = customers.find(cu => cu.id === e.target.value)
                                    setOrderForm({ ...orderForm, customerId: e.target.value, customerName: c?.name || '' })
                                }}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
                                <option value="">-- Chọn --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Loại hàng *</label>
                            <select required value={orderForm.product}
                                onChange={e => setOrderForm({ ...orderForm, product: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
                                <option value="">-- Chọn --</option>
                                <option value="Xăng RON 95-III">Xăng RON 95-III</option>
                                <option value="Xăng RON 95-V">Xăng RON 95-V</option>
                                <option value="Xăng E5 RON 92">Xăng E5 RON 92</option>
                                <option value="Dầu Diesel 0.05S">Dầu Diesel 0.05S</option>
                                <option value="Dầu Diesel 0.001S">Dầu Diesel 0.001S</option>
                                <option value="Dầu KO">Dầu KO</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Số lượng (Lít) *</label>
                            <input type="number" required value={orderForm.quantity}
                                onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Ngày yêu cầu giao</label>
                            <input type="date" value={orderForm.requestDate}
                                onChange={e => setOrderForm({ ...orderForm, requestDate: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Ghi chú</label>
                            <input type="text" value={orderForm.notes}
                                onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: 12, padding: '8px 20px', background: editingOrder ? '#f39c12' : '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {editingOrder ? '💾 Cập nhật đơn' : '✅ Tạo đơn'}
                    </button>
                    {editingOrder && (
                        <button type="button" onClick={() => { setShowOrderForm(false); setEditingOrder(null) }}
                            style={{ marginLeft: 8, padding: '8px 20px', background: '#777', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
                    )}
                </form>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <thead><tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>Khách</th>
                    <th>Hàng</th><th>SL (L)</th><th>Ngày YC</th><th>Trạng thái</th><th>Hành động</th>
                </tr></thead>
                <tbody>
                    {orders.filter(o => {
                        if (!filterDateFrom && !filterDateTo) return true;
                        const d = o.requestDate || '';
                        if (filterDateFrom && d < filterDateFrom) return false;
                        if (filterDateTo && d > filterDateTo) return false;
                        return true;
                    }).map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 10 }}><strong>{o.customerName}</strong></td>
                            <td style={{ textAlign: 'center' }}>{o.product}</td>
                            <td style={{ textAlign: 'center' }}>{Number(o.quantity).toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>{o.requestDate || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                                    background: o.status === 'new' ? '#cce5ff' : o.status === 'dispatched' ? '#fff3cd' : '#d4edda'
                                }}>{o.status}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleExportDeliveryReceipt(o)}
                                    style={{ padding: '4px 6px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }} title="Biên bản giao hàng kiêm Phiếu XK">
                                    📄 Biên Bản GH
                                </button>
                                <button onClick={() => handleExportSupplyRequest(o)}
                                    style={{ padding: '4px 6px', background: '#2980b9', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }} title="Phiếu đề nghị cấp xăng dầu">
                                    📄 Phiếu ĐN Cấp Xăng
                                </button>
                                {o.status === 'new' && (
                                    <button onClick={() => {
                                        const cust = customers.find(c => c.id === o.customerId)
                                        setDispatchForm({
                                            orderId: o.id,
                                            destination: cust?.name || o.customerName,
                                            product: o.product,
                                            amount: o.quantity,
                                            vehiclePlate: '',
                                            assignedDriverId: '',
                                            assignedDriverName: '',
                                            sourceWarehouse: 'Kho Đình Vũ - Hải Phòng'
                                        })
                                        setShowDispatchForm(true)
                                        setActiveMenu('dispatch')
                                    }} style={{ padding: '4px 6px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }}>
                                        🚛 Lên lệnh
                                    </button>
                                )}
                                <button onClick={() => handleEditOrder(o)}
                                    style={{ padding: '4px 6px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }}>✏️</button>
                                <button onClick={async () => { if (window.confirm('Xóa đơn này?')) { await deleteOrder(o.id); loadAll() } }}
                                    style={{ padding: '4px 6px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    // ==== LỆNH ĐIỀU ĐỘNG ====
    const handleDispatch = async (e) => {
        e.preventDefault()
        const result = await createDeliveryOrder({
            ...dispatchForm,
            createdBy: user.userId,
            createdByName: user.name
        })
        if (result.success) {
            if (dispatchForm.orderId) {
                await updateOrder(dispatchForm.orderId, { status: 'dispatched' })
            }
            alert('✅ Đã lên lệnh điều động thành công!')
            setShowDispatchForm(false)
            setDispatchForm({ orderId: '', vehiclePlate: '', assignedDriverId: '', assignedDriverName: '', sourceWarehouse: '', destination: '', product: '', amount: '' })
            loadAll()
        }
    }

    const renderDispatch = () => {
        const active = deliveryOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled')

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>🚛 Lệnh Điều Động (Dispatching)</h2>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setShowDispatchForm(!showDispatchForm)}
                    style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    {showDispatchForm ? '✕ Đóng' : '+ Tạo lệnh mới'}
                </button>
                <button onClick={() => setShowImportOrders(true)}
                    style={{ padding: '8px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    📥 Import Đơn hàng Excel
                </button>
                <button onClick={() => setShowOCR(true)}
                    style={{ padding: '8px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    🔬 Quét OCR
                </button>
            </div>

            {showDispatchForm && (
                <form onSubmit={handleDispatch} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8 }}>
                    <h4 style={{ marginTop: 0 }}>Ghép đơn → Xe → Tài xế</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Kho xuất hàng *</label>
                            <input type="text" required value={dispatchForm.sourceWarehouse}
                                onChange={e => setDispatchForm({ ...dispatchForm, sourceWarehouse: e.target.value })}
                                placeholder="Vd: Kho Đình Vũ - HP" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Đại lý nhận *</label>
                            <input type="text" required value={dispatchForm.destination}
                                onChange={e => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Xe bồn *</label>
                            <select required value={dispatchForm.vehiclePlate}
                                onChange={e => setDispatchForm({ ...dispatchForm, vehiclePlate: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
                                <option value="">-- Chọn --</option>
                                {vehicles.filter(v => v.status === 'active' || v.status === 'Hoạt động').map(v =>
                                    <option key={v.id} value={v.plateNumber}>{v.plateNumber} ({v.totalCapacity}L - {v.compartments} hầm)</option>
                                )}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Tài xế *</label>
                            <select required value={dispatchForm.assignedDriverId}
                                onChange={e => {
                                    const d = drivers.find(dr => dr.id === e.target.value)
                                    setDispatchForm({ ...dispatchForm, assignedDriverId: e.target.value, assignedDriverName: d?.fullname || '' })
                                }}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
                                <option value="">-- Chọn --</option>
                                {drivers
                                    .filter(d => !active.some(o => o.assignedDriverId === d.id))
                                    .map(d => <option key={d.id} value={d.id}>{d.fullname} (Rảnh)</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Loại hàng</label>
                            <input type="text" value={dispatchForm.product}
                                onChange={e => setDispatchForm({ ...dispatchForm, product: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Khối lượng (L)</label>
                            <input type="number" value={dispatchForm.amount}
                                onChange={e => setDispatchForm({ ...dispatchForm, amount: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: 12, padding: '10px 24px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>🚀 Xuất lệnh điều động</button>
                </form>
            )}

            <h3>📋 Danh sách lệnh điều động</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <thead><tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>Đại lý</th>
                    <th>Xe</th><th>Tài xế</th><th>Hàng</th><th>Trạng thái</th>
                </tr></thead>
                <tbody>
                    {deliveryOrders.map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 10 }}>{o.destination}</td>
                            <td style={{ textAlign: 'center' }}>{o.vehiclePlate}</td>
                            <td style={{ textAlign: 'center' }}>{o.assignedDriverName || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{o.product} ({o.amount}L)</td>
                            <td style={{ textAlign: 'center' }}>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                                    background: o.status === 'completed' ? '#d4edda' : o.status === 'moving' ? '#fff3cd' : '#cce5ff'
                                }}>{o.status}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        )
    }

    // ==== THEO DÕI ====
    const renderTracking = () => {
        const active = deliveryOrders.filter(o => o.status !== 'completed')
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2>🗺️ Theo Dõi Tiến Độ Đơn Hàng</h2>
                {active.length === 0 ? <p style={{ color: '#999' }}>Không có xe nào đang trên đường.</p> :
                    active.map(o => (
                        <div key={o.id} style={{
                            background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            borderLeft: `4px solid ${o.status === 'moving' ? '#f39c12' : o.status === 'arrived' ? '#3498db' : '#27ae60'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong>🚛 {o.vehiclePlate} → 📍 {o.destination}</strong>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                                    background: o.status === 'moving' ? '#fff3cd' : o.status === 'unloading' ? '#d1ecf1' : '#cce5ff'
                                }}>{o.status}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#666' }}>
                                Tài xế: {o.assignedDriverName || '-'} | Hàng: {o.product} ({o.amount}L) | Seal: {o.sealCode || 'N/A'}
                            </div>
                        </div>
                    ))
                }
            </div>
        )
    }

    const renderContent = () => {
        switch (activeMenu) {
            case 'overview': return renderOverview()
            case 'crm': return renderCRM()
            case 'orders': return renderOrders()
            case 'dispatch': return renderDispatch()
            case 'tracking': return renderTracking()
            case 'driver-schedules': return <DriverScheduleManager />
            case 'contracts': return <ContractManager />
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
                    <h2>🛒 Sale / Điều Vận Dashboard</h2>
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
                        {[['overview', '📊 Tổng Quan'], ['crm', '👤 CRM Khách Hàng'], ['orders', '📋 Đơn Hàng'], ['contracts', '📝 Hợp Đồng'], ['dispatch', '🚛 Lệnh Điều Động'], ['tracking', '🗺️ Theo Dõi'], ['driver-schedules', '🗓️ Nhật Ký'], ['profile', '👤 Hồ Sơ']].map(([key, label]) => (
                            <li key={key} className={`menu-item ${activeMenu === key ? 'active' : ''}`}
                                onClick={() => { setActiveMenu(key); setSidebarOpen(false) }}>{label}</li>
                        ))}
                    </ul>
                </div>
                <div className="main-content">{renderContent()}</div>
            </div>

            {/* Import Đơn hàng Modal */}
            <ImportDataModal
                isOpen={showImportOrders}
                onClose={() => setShowImportOrders(false)}
                title="Đơn Hàng"
                columns={[
                    { key: 'customerName', label: 'Tên khách hàng', required: true },
                    { key: 'product', label: 'Sản phẩm', required: true },
                    { key: 'quantity', label: 'Số lượng (Lít)', required: true },
                    { key: 'requestDate', label: 'Ngày yêu cầu' },
                    { key: 'notes', label: 'Ghi chú' },
                ]}
                templateData={[{ customerName: 'Đại lý ABC', product: 'Dầu Diesel 0.05S', quantity: 10000, requestDate: '2024-01-15', notes: 'Giao gấp' }]}
                onImport={async (rows) => {
                    for (const row of rows) {
                        const cust = customers.find(c => c.name === row.customerName)
                        await createOrder({ customerId: cust?.id || '', customerName: row.customerName, product: row.product, quantity: row.quantity, requestDate: row.requestDate, notes: row.notes, status: 'pending' })
                    }
                    alert(`✅ Đã import ${rows.length} đơn hàng!`)
                    loadAll()
                }}
            />

            {/* Import Khách hàng Modal */}
            <ImportDataModal
                isOpen={showImportCustomers}
                onClose={() => setShowImportCustomers(false)}
                title="Khách Hàng"
                columns={[
                    { key: 'name', label: 'Tên khách hàng', required: true },
                    { key: 'address', label: 'Địa chỉ' },
                    { key: 'contact', label: 'Người liên hệ' },
                    { key: 'phone', label: 'Số điện thoại' },
                ]}
                templateData={[{ name: 'Đại lý Petrolimex Hải Phòng', address: '123 Lạch Tray', contact: 'Nguyễn Văn A', phone: '0912345678' }]}
                onImport={async (rows) => {
                    for (const row of rows) { await addCustomer(row) }
                    alert(`✅ Đã import ${rows.length} khách hàng!`)
                    loadAll()
                }}
            />

            {/* OCR Scanner */}
            <OCRScanner
                isOpen={showOCR}
                onClose={() => setShowOCR(false)}
                mode="order"
                onResult={(data) => {
                    setOrderForm(prev => ({
                        ...prev,
                        customerName: data.customerName || prev.customerName,
                        product: data.product || prev.product,
                        quantity: data.quantity || prev.quantity,
                        notes: data.description || prev.notes,
                    }))
                    setShowOrderForm(true)
                    alert('✅ Đã điền dữ liệu từ OCR! Vui lòng kiểm tra và lưu.')
                }}
            />

            {/* OCR GPĐKKD Scanner */}
            <OCRScanner
                isOpen={showOCRGPDKKD}
                onClose={() => setShowOCRGPDKKD(false)}
                mode="gpdkkd"
                onResult={(data) => {
                    setCustForm(prev => ({
                        ...prev,
                        name: data.companyName || prev.name,
                        address: data.address || prev.address,
                        phone: data.phone || prev.phone,
                        contact: data.representative || prev.contact,
                    }))
                    setShowCustForm(true)
                    alert('✅ Đã điền thông tin từ GPĐKKD! Vui lòng kiểm tra và lưu.')
                }}
            />
        </div>
    )
}

export default SalesDashboard
