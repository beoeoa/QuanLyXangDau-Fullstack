import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import { getOrdersByDriver, updateOrderStatus, updateOrderDocuments, updateOrderSeal } from '../services/transportationService'
import { addDriverExpense, getExpensesByDriver } from '../services/driverExpenseService'
import { createSOSReport, getSOSByDriver } from '../services/sosReportService'
import Profile from './Profile'
import RouteMap from './driver/RouteMap'
import NotificationBell from './NotificationBell'
import OCRScanner from './shared/OCRScanner'
import { logAudit } from '../services/auditLogService'
import { notifyRole } from '../services/notificationService'
import { Package, Wallet, AlertTriangle, BarChart3, UserCheck, Truck, ClipboardList, CheckCircle, MapPin, Fuel, Flag, SearchCheck, CheckCircle2, Lock, Flame, Info, FileText, TrendingDown, Paperclip, ArrowRight, Eye, Camera, Save, ScanSearch, Map, List, Wrench, Settings, AlertCircle, Car, EyeOff, Menu, Factory, Store, BarChart2, Calendar } from 'lucide-react'

// Trạng thái 5 bước
const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ nhận hàng', icon: <ClipboardList size={16} style={{ marginRight: 4 }} /> },
  { key: 'received', label: 'Đã nhận hàng', icon: <CheckCircle size={16} style={{ marginRight: 4 }} /> },
  { key: 'moving', label: 'Đang di chuyển', icon: <Truck size={16} style={{ marginRight: 4 }} /> },
  { key: 'arrived', label: 'Đã đến điểm giao', icon: <MapPin size={16} style={{ marginRight: 4 }} /> },
  { key: 'unloading', label: 'Đang xả hàng', icon: <Fuel size={16} style={{ marginRight: 4 }} /> },
  { key: 'completed', label: 'Hoàn thành', icon: <Flag size={16} style={{ marginRight: 4 }} /> }
]

const getNextStatus = (current) => {
  const idx = STATUS_STEPS.findIndex(s => s.key === current)
  if (idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1].key
  return null
}

const getStatusLabel = (status) => {
  const s = STATUS_STEPS.find(st => st.key === status)
  return s ? <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon} {s.label}</span> : status
}

function DriverDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('orders')
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [sosReports, setSOSReports] = useState([])
  const [loading, setLoading] = useState(true)

  // === Form states ===
  const [sealInput, setSealInput] = useState({})
  const [expenseForm, setExpenseForm] = useState({
    type: 'BOT', amount: '', description: '', receiptImage: ''
  })
  const [sosForm, setSOSForm] = useState({ type: 'traffic_jam', description: '', orderId: '' })

  const [showMapForOrderId, setShowMapForOrderId] = useState(null)
  const [showOCR, setShowOCR] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const result = await verifyUserRole(user.userId, 'driver')
      if (!result.success) {
        alert('Lỗi xác minh quyền truy cập.')
        onLogout()
      }
    }
    if (user?.userId) {
      checkRole()
      loadAllData()

      if (user.isProfileUpdated === false && !sessionStorage.getItem('profileAlertShown')) {
        alert('⚠️ Yêu cầu bắt buộc: Vui lòng cập nhật đầy đủ thông tin cá nhân (Số điện thoại, Địa chỉ, CCCD...) đễ hồ sơ hoàn tất!')
        setActiveMenu('profile')
        sessionStorage.setItem('profileAlertShown', 'true')
      }
    }
  }, [user?.userId])

  const loadAllData = async () => {
    setLoading(true)
    const [ordersData, expensesData, sosData] = await Promise.all([
      getOrdersByDriver(user.userId),
      getExpensesByDriver(user.userId),
      getSOSByDriver(user.userId)
    ])
    setOrders(Array.isArray(ordersData) ? ordersData : [])
    setExpenses(Array.isArray(expensesData) ? expensesData : [])
    setSOSReports(Array.isArray(sosData) ? sosData : [])
    setLoading(false)
  }

  const handleNextStatus = async (orderId, currentStatus) => {
    const next = getNextStatus(currentStatus)
    if (!next) return

    if (currentStatus === 'unloading' && next === 'completed') {
      const order = orders.find(o => o.id === orderId)
      const originalAmount = Number(order?.amount || 0)
      const input = prompt(`Nhập số lít THỰC GIAO (xuất: ${originalAmount.toLocaleString()} Lít):`)
      if (input === null) return
      const delivered = Number(input)
      if (isNaN(delivered) || delivered <= 0) { alert('Số liệu không hợp lệ!'); return }

      const loss = originalAmount - delivered
      const lossPercent = originalAmount > 0 ? ((loss / originalAmount) * 100).toFixed(2) : 0

      if (window.confirm(`Xác nhận hoàn thành:\n- Xuất: ${originalAmount.toLocaleString()} L\n- Giao: ${delivered.toLocaleString()} L\n- Hao hụt: ${loss.toLocaleString()} L (${lossPercent}%)`)) {
        await updateOrderStatus(orderId, next, { deliveredQuantity: delivered, loss, lossPercent: Number(lossPercent) })
        await logAudit('UPDATE', `Tài xế hoàn thành chuyến xe, ID: ${orderId}`)
        await notifyRole('accountant', { title: 'Chuyến xe hoàn thành', message: `Tài xế ${user.name || user.email} vừa giao hàng xong. Vui lòng đối soát.`, type: 'delivery' })
        loadAllData()
      }
    } else {
      if (window.confirm(`Xác nhận cập nhật: ${getStatusLabel(next)}?`)) {
        await updateOrderStatus(orderId, next)
        await logAudit('UPDATE', `Tài xế cập nhật trạng thái chuyến: ${getStatusLabel(next)}`)
        loadAllData()
      }
    }
  }

  const handleDocUpload = (orderId, docType, e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const order = orders.find(o => o.id === orderId)
        const docs = { ...(order?.documents || {}), [docType]: reader.result }
        await updateOrderDocuments(orderId, docs)
        loadAllData()
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSealSubmit = async (orderId) => {
    const code = sealInput[orderId]
    if (code) {
      await updateOrderSeal(orderId, code)
      setSealInput(prev => ({ ...prev, [orderId]: '' }))
      loadAllData()
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    const result = await addDriverExpense({
      ...expenseForm,
      driverId: user.userId,
      driverName: user.name || user.email,
      amount: Number(expenseForm.amount)
    })
    if (result.success) {
      await logAudit('CREATE', `Tài xế báo cáo chi phí dọc đường: ${expenseForm.amount} VND`)
      await notifyRole('accountant', { title: 'Chi phí mới', message: `Tài xế ${user.name || user.email} vừa gửi chi phí dọc đường cần thanh toán.`, type: 'expense' })
      alert('Đã ghi nhận chi phí!')
      setExpenseForm({ type: 'BOT', amount: '', description: '', receiptImage: '' })
      loadAllData()
    }
  }

  const handleExpenseImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setExpenseForm(prev => ({ ...prev, receiptImage: reader.result }))
      reader.readAsDataURL(file)
    }
  }

  const handleSendSOS = async (e) => {
    e.preventDefault()
    const result = await createSOSReport({
      ...sosForm,
      driverId: user.userId,
      driverName: user.name || user.email
    })
    if (result.success) {
      await logAudit('CREATE', `Tài xế gửi báo cáo sự cố SOS: ${sosForm.type}`)
      await notifyRole('admin', { title: 'SOS KHẨN CẤP', message: `Tài xế ${user.name || user.email} vừa nhấn cảnh báo SOS trên đường!`, type: 'system' })
      alert('Đã gửi báo cáo SOS đến điều phối!')
      setSOSForm({ type: 'traffic_jam', description: '', orderId: '' })
      loadAllData()
    }
  }

  // ==============================
  // RENDER TABS
  // ==============================

  const renderOrders = () => {
    const activeOrders = orders.filter(o => o.status !== 'completed')
    const completedOrders = orders.filter(o => o.status === 'completed')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Package size={24} className="text-blue-600" /> Lệnh Điều Động</h2>

        {loading ? <p>Đang tải...</p> : activeOrders.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', background: '#f9f9f9', borderRadius: 8 }}>
            <p style={{ fontSize: 16 }}>Bạn chưa có lệnh điều động nào đang hoạt động.</p>
          </div>
        ) : activeOrders.map(order => (
          <div key={order.id} style={{
            background: 'white', borderRadius: 10, padding: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderLeft: '4px solid #3498db'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={20} className="text-blue-500" /> {order.destination || 'Chưa rõ'}</h3>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                background: order.status === 'moving' ? '#fff3cd' : order.status === 'unloading' ? '#d1ecf1' : '#e8f5e9',
                color: '#333'
              }}>{getStatusLabel(order.status)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Truck size={16} className="text-slate-500" /> Xe: <strong>{order.vehiclePlate || '-'}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Fuel size={16} className="text-slate-500" /> Hàng: <strong>{order.product || '-'} ({order.amount || 0}L)</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Factory size={16} className="text-slate-500" /> Kho xuất: <strong>{order.sourceWarehouse || '-'}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Store size={16} className="text-slate-500" /> Đại lý: <strong>{order.destination || '-'}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 15 }}>
              {STATUS_STEPS.map((step, i) => {
                const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
                return (
                  <div key={step.key} style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: i <= currentIdx ? '#27ae60' : '#e0e0e0'
                  }} title={step.label} />
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={16} className="text-slate-500" /> Seal: <strong>{order.sealCode || 'Chưa nhập'}</strong></span>
              {!order.sealCode && (
                <>
                  <input type="text" placeholder="Nhập mã kẹp chì"
                    value={sealInput[order.id] || ''}
                    onChange={e => setSealInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: 140 }}
                  />
                  <button onClick={() => handleSealSubmit(order.id)}
                    style={{ padding: '4px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Lưu
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'deliveryReceipt', label: 'Biên bản giao nhận', icon: <FileText size={16} /> },
                { key: 'lossReport', label: 'Phiếu hao hụt', icon: <TrendingDown size={16} /> },
                { key: 'exportSlip', label: 'Phiếu xuất kho', icon: <ClipboardList size={16} /> },
                { key: 'otherDoc', label: 'Chứng từ khác', icon: <Paperclip size={16} /> }
              ].map(doc => (
                <div key={doc.key} style={{ fontSize: 13 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontWeight: 'bold' }}>{doc.icon} {doc.label}</label>
                  <input type="file" accept="image/*" onChange={e => handleDocUpload(order.id, doc.key, e)}
                    style={{ fontSize: 12 }} />
                  {order.documents?.[doc.key] && (
                    <img src={order.documents[doc.key]} alt={doc.label} style={{ width: 50, height: 40, objectFit: 'cover', borderRadius: 4, marginTop: 4 }} />
                  )}
                </div>
              ))}
            </div>

            {getNextStatus(order.status) && (
              <button onClick={() => handleNextStatus(order.id, order.status)}
                style={{
                  width: '100%', padding: '12px', background: '#27ae60', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                <ArrowRight size={18} /> Chuyển sang: {getStatusLabel(getNextStatus(order.status))}
              </button>
            )}

            <button onClick={() => setShowMapForOrderId(showMapForOrderId === order.id ? null : order.id)}
              style={{
                width: '100%', padding: '10px', background: '#2980b9', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              {showMapForOrderId === order.id ? <><EyeOff size={18} /> Đóng Bản Đồ Chuyến Đi</> : <><Map size={18} /> Xem Đường Đi Tối Ưu Mới Nhất</>}
            </button>

            {showMapForOrderId === order.id && (
              <RouteMap origin={order.sourceWarehouse || 'Hải Phòng, Việt Nam'} destination={order.destination || 'Hải Phòng, Việt Nam'} />
            )}
          </div>
        ))}

        {completedOrders.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} className="text-green-600" /> Đã hoàn thành ({completedOrders.length})</h3>
            {completedOrders.slice(0, 5).map(o => (
              <div key={o.id} style={{
                padding: '10px 15px', background: '#f0f0f0', borderRadius: 6, marginBottom: 6, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <MapPin size={16} className="text-slate-500" /> {o.destination} — {o.product} ({o.amount}L) <CheckCircle size={16} className="text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderExpenses = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={24} className="text-amber-500" /> Báo Cáo Chi Phí Dọc Đường</h2>

      <form onSubmit={handleAddExpense} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8 }}>
        <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={18} /> Thêm chi phí mới</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Loại chi phí</label>
            <select value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="BOT">Vé BOT / Cầu đường</option>
              <option value="tire">Vá/Thay lốp</option>
              <option value="repair">Sửa chữa lặt vặt</option>
              <option value="fuel">Đổ dầu chạy xe</option>
              <option value="other">Chi phí khác</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Số tiền (VNĐ)</label>
            <input type="number" value={expenseForm.amount} required
              onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="Vd: 150000" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Mô tả</label>
            <input type="text" value={expenseForm.description}
              onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="Vd: BOT Pháp Vân-Cầu Giẽ" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold', marginBottom: 4 }}><Camera size={16} /> Ảnh hóa đơn</label>
            <input type="file" accept="image/*" onChange={handleExpenseImageUpload} />
          </div>
          {expenseForm.receiptImage && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={expenseForm.receiptImage} alt="receipt" style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 4 }} />
              <span style={{ marginLeft: 8, color: 'green', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> Đã chọn</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" style={{
            padding: '10px 24px', background: '#27ae60', color: 'white',
            border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}><Save size={18} /> Ghi nhận chi phí</button>
          <button type="button" onClick={() => setShowOCR(true)} style={{
            padding: '10px 24px', background: '#7c3aed', color: 'white',
            border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}><ScanSearch size={18} /> Quét ảnh biên lai (OCR)</button>
        </div>
      </form>

      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><List size={20} /> Lịch sử chi phí</h3>
      {expenses.length === 0 ? <p style={{ color: '#999' }}>Chưa có khoản chi phí nào.</p> :
        expenses.map(exp => (
          <div key={exp.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', background: 'white', borderRadius: 6,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${exp.status === 'approved' ? '#27ae60' : exp.status === 'rejected' ? '#e74c3c' : '#f39c12'}`
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ color: '#64748b' }}>
                {exp.type === 'BOT' ? <Map size={20} /> : exp.type === 'fuel' ? <Fuel size={20} /> : exp.type === 'tire' ? <Wrench size={20} /> : exp.type === 'repair' ? <Settings size={20} /> : <Paperclip size={20} />}
              </div>
              <div>
                <strong>{exp.description || exp.type}</strong>
                <div style={{ fontSize: 12, color: '#888' }}>{exp.createdAt ? new Date(exp.createdAt).toLocaleString('vi-VN') : ''}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{Number(exp.amount).toLocaleString()}đ</div>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                background: exp.status === 'approved' ? '#d4edda' : exp.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                color: exp.status === 'approved' ? '#155724' : exp.status === 'rejected' ? '#721c24' : '#856404'
              }}>
                {exp.status === 'approved' ? <><CheckCircle2 size={12} /> Đã duyệt</> : exp.status === 'rejected' ? <><AlertCircle size={12} /> Từ chối</> : <><SearchCheck size={12} /> Chờ duyệt</>}
              </span>
            </div>
          </div>
        ))
      }
    </div>
  )

  const renderSOS = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={24} /> Báo Cáo Sự Cố Khẩn Cấp</h2>

      <form onSubmit={handleSendSOS} style={{
        background: '#fff5f5', padding: 20, borderRadius: 8, border: '2px solid #e74c3c'
      }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 'bold' }}>Loại sự cố</label>
            <select value={sosForm.type} onChange={e => setSOSForm({ ...sosForm, type: e.target.value })}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
              <option value="traffic_jam">Kẹt xe nghiêm trọng</option>
              <option value="accident">Tai nạn giao thông</option>
              <option value="breakdown">Xe hỏng / Không thể tiếp tục</option>
              <option value="fuel_leak">Rò rỉ nhiên liệu</option>
              <option value="other">Sự cố khác</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 'bold' }}>Mô tả tình huống</label>
            <textarea value={sosForm.description}
              onChange={e => setSOSForm({ ...sosForm, description: e.target.value })}
              required rows={3} placeholder="Mô tả ngắn tình huống..."
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
        </div>
        <button type="submit" style={{
          marginTop: 12, padding: '14px', width: '100%', background: '#e74c3c', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}><AlertCircle size={20} /> GỬI BÁO CÁO KHẨN CẤP</button>
      </form>

      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={20} /> Lịch sử báo cáo</h3>
      {sosReports.length === 0 ? <p style={{ color: '#999' }}>Chưa có báo cáo SOS nào.</p> :
        sosReports.map(sos => (
          <div key={sos.id} style={{
            padding: '12px 16px', background: 'white', borderRadius: 6,
            borderLeft: `4px solid ${sos.status === 'resolved' ? '#27ae60' : sos.status === 'acknowledged' ? '#f39c12' : '#e74c3c'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'flex-start'
          }}>
            <div style={{ color: '#64748b', marginTop: 2 }}>
              {sos.type === 'traffic_jam' ? <Car size={18} /> : sos.type === 'accident' ? <Flame size={18} /> : sos.type === 'breakdown' ? <Wrench size={18} /> : sos.type === 'fuel_leak' ? <AlertTriangle size={18} /> : <Paperclip size={18} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{sos.description}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                {sos.createdAt ? new Date(sos.createdAt).toLocaleString('vi-VN') : ''}
                <span style={{
                  padding: '4px 10px', borderRadius: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4,
                  background: sos.status === 'resolved' ? '#d4edda' : sos.status === 'acknowledged' ? '#fff3cd' : '#f8d7da',
                  color: sos.status === 'resolved' ? '#155724' : sos.status === 'acknowledged' ? '#856404' : '#721c24'
                }}>
                  {sos.status === 'resolved' ? <><CheckCircle2 size={12} /> Đã xử lý</> : sos.status === 'acknowledged' ? <><Eye size={12} /> Đã tiếp nhận</> : <><SearchCheck size={12} /> Đang chờ</>}
                </span>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )

  const renderStats = () => {
    const completed = orders.filter(o => o.status === 'completed')
    const totalTrips = completed.length
    const totalKm = completed.reduce((s, o) => s + (Number(o.distance) || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const approvedExpenses = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const estimatedSalary = totalTrips * 500000

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={24} className="text-purple-600" /> Thống Kê Cá Nhân</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: <Truck size={28} />, label: 'Tổng số chuyến', value: totalTrips, color: '#3498db' },
            { icon: <Map size={28} />, label: 'Tổng km', value: totalKm.toLocaleString() + ' km', color: '#27ae60' },
            { icon: <Wallet size={28} />, label: 'Lương dự kiến', value: estimatedSalary.toLocaleString() + '₫', color: '#f39c12' },
            { icon: <TrendingDown size={28} />, label: 'Tổng chi phí', value: totalExpenses.toLocaleString() + '₫', color: '#e74c3c' },
            { icon: <CheckCircle2 size={28} />, label: 'Chi phí đã duyệt', value: approvedExpenses.toLocaleString() + '₫', color: '#2ecc71' },
            { icon: <ClipboardList size={28} />, label: 'Báo cáo SOS', value: sosReports.length, color: '#9b59b6' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'white', padding: 18, borderRadius: 10, textAlign: 'center',
              borderLeft: '4px solid ' + s.color, boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={20} /> Lịch Sử Chuyến Gần Đây</h3>
          {completed.length === 0 ? <p style={{ color: '#999' }}>Chưa hoàn thành chuyến nào.</p> :
            completed.slice(-10).reverse().map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <MapPin size={20} className="text-slate-400" />
                  <div>
                    <strong>{o.destination}</strong>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{o.product} — {Number(o.amount).toLocaleString()}L</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><Truck size={14} /> {o.vehiclePlate}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    <CheckCircle size={12} className="text-green-500" /> {o.completedAt ? new Date(o.completedAt).toLocaleDateString('vi-VN') : 'Hoàn thành'}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'orders': return renderOrders()
      case 'expenses': return renderExpenses()
      case 'sos': return renderSOS()
      case 'stats': return renderStats()
      case 'profile': return <Profile currentUser={user} />
      default: return renderOrders()
    }
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Truck size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>Tài Xế</h2>
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
            <li className="menu-section-title">Vận hành</li>
            <li className={`menu-item ${activeMenu === 'orders' ? 'active' : ''}`} onClick={() => setActiveMenu('orders')}><Package size={18} /> Lệnh Điều Động</li>
            <li className={`menu-item ${activeMenu === 'expenses' ? 'active' : ''}`} onClick={() => setActiveMenu('expenses')}><Wallet size={18} /> Chi Phí Đường</li>
            <li className={`menu-item ${activeMenu === 'sos' ? 'active' : ''}`} onClick={() => setActiveMenu('sos')}><AlertTriangle size={18} /> Báo Cáo SOS</li>
            <li className={`menu-item ${activeMenu === 'stats' ? 'active' : ''}`} onClick={() => setActiveMenu('stats')}><BarChart3 size={18} /> Thống Kê</li>

            <li className="menu-section-title">Tài khoản</li>
            <li className={`menu-item ${activeMenu === 'profile' ? 'active' : ''}`} onClick={() => setActiveMenu('profile')}><UserCheck size={18} /> Hồ Sơ</li>
          </ul>
        </div>
        <div className="main-content">
          {renderContent()}
        </div>
      </div>

      <OCRScanner isOpen={showOCR} onClose={() => setShowOCR(false)} mode="receipt"
        onResult={(data) => {
          setExpenseForm(prev => ({
            ...prev,
            type: data.type || prev.type,
            amount: data.amount || data.total || prev.amount,
            description: data.description || prev.description,
          }))
          setActiveMenu('expenses')
          alert('✅ Đã điền dữ liệu từ OCR vào form chi phí!')
        }}
      />
    </div>
  )
}

export default DriverDashboard
