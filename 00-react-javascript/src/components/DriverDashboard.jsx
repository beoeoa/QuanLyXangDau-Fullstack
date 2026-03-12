import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import { getOrdersByDriver, updateOrderStatus, updateOrderDocuments, updateOrderSeal } from '../services/transportationService'
import { addDriverExpense, getExpensesByDriver } from '../services/driverExpenseService'
import { createSOSReport, getSOSByDriver } from '../services/sosReportService'
import Profile from './Profile'
import RouteMap from './driver/RouteMap'
import NotificationBell from './NotificationBell'

// Trạng thái 5 bước
const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ nhận hàng', icon: '📋' },
  { key: 'received', label: 'Đã nhận hàng', icon: '✅' },
  { key: 'moving', label: 'Đang di chuyển', icon: '🚚' },
  { key: 'arrived', label: 'Đã đến điểm giao', icon: '📍' },
  { key: 'unloading', label: 'Đang xả hàng', icon: '⛽' },
  { key: 'completed', label: 'Hoàn thành', icon: '🏁' }
]

const getNextStatus = (current) => {
  const idx = STATUS_STEPS.findIndex(s => s.key === current)
  if (idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1].key
  return null
}

const getStatusLabel = (status) => {
  const s = STATUS_STEPS.find(st => st.key === status)
  return s ? `${s.icon} ${s.label}` : status
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

  // State quản lý việc hiển thị map cho order nào
  const [showMapForOrderId, setShowMapForOrderId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

      // Bắt buộc cập nhật hồ sơ nếu chưa có đủ thông tin
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

  // === HANDLER: Cập nhật trạng thái bước tiếp theo ===
  const handleNextStatus = async (orderId, currentStatus) => {
    const next = getNextStatus(currentStatus)
    if (!next) return

    // Khi hoàn thành (unloading → completed), hỏi lít thực giao để tính hao hụt
    if (currentStatus === 'unloading' && next === 'completed') {
      const order = orders.find(o => o.id === orderId)
      const originalAmount = Number(order?.amount || 0)
      const input = prompt(`Nhập số lít THỰC GIAO (xuất: ${originalAmount.toLocaleString()} Lít):`)
      if (input === null) return // Hủy
      const delivered = Number(input)
      if (isNaN(delivered) || delivered <= 0) { alert('Số liệu không hợp lệ!'); return }

      const loss = originalAmount - delivered
      const lossPercent = originalAmount > 0 ? ((loss / originalAmount) * 100).toFixed(2) : 0

      if (window.confirm(`Xác nhận hoàn thành:\n- Xuất: ${originalAmount.toLocaleString()} L\n- Giao: ${delivered.toLocaleString()} L\n- Hao hụt: ${loss.toLocaleString()} L (${lossPercent}%)`)) {
        await updateOrderStatus(orderId, next, { deliveredQuantity: delivered, loss, lossPercent: Number(lossPercent) })
        loadAllData()
      }
    } else {
      if (window.confirm(`Xác nhận cập nhật: ${getStatusLabel(next)}?`)) {
        await updateOrderStatus(orderId, next)
        loadAllData()
      }
    }
  }

  // === HANDLER: Upload ảnh chứng từ ===
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

  // === HANDLER: Nhập mã seal ===
  const handleSealSubmit = async (orderId) => {
    const code = sealInput[orderId]
    if (code) {
      await updateOrderSeal(orderId, code)
      setSealInput(prev => ({ ...prev, [orderId]: '' }))
      loadAllData()
    }
  }

  // === HANDLER: Thêm chi phí ===
  const handleAddExpense = async (e) => {
    e.preventDefault()
    const result = await addDriverExpense({
      ...expenseForm,
      driverId: user.userId,
      driverName: user.name || user.email,
      amount: Number(expenseForm.amount)
    })
    if (result.success) {
      alert('✅ Đã ghi nhận chi phí!')
      setExpenseForm({ type: 'BOT', amount: '', description: '', receiptImage: '' })
      loadAllData()
    }
  }

  // === HANDLER: Upload ảnh hóa đơn chi phí ===
  const handleExpenseImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setExpenseForm(prev => ({ ...prev, receiptImage: reader.result }))
      reader.readAsDataURL(file)
    }
  }

  // === HANDLER: Gửi SOS ===
  const handleSendSOS = async (e) => {
    e.preventDefault()
    const result = await createSOSReport({
      ...sosForm,
      driverId: user.userId,
      driverName: user.name || user.email
    })
    if (result.success) {
      alert('🆘 Đã gửi báo cáo SOS đến điều phối!')
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
        <h2 style={{ margin: 0 }}>📦 Lệnh Điều Động</h2>

        {loading ? <p>Đang tải...</p> : activeOrders.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', background: '#f9f9f9', borderRadius: 8 }}>
            <p style={{ fontSize: 16 }}>Bạn chưa có lệnh điều động nào đang hoạt động.</p>
          </div>
        ) : activeOrders.map(order => (
          <div key={order.id} style={{
            background: 'white', borderRadius: 10, padding: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderLeft: '4px solid #3498db'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>📍 {order.destination || 'Chưa rõ'}</h3>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                background: order.status === 'moving' ? '#fff3cd' : order.status === 'unloading' ? '#d1ecf1' : '#e8f5e9',
                color: '#333'
              }}>{getStatusLabel(order.status)}</span>
            </div>

            {/* Chi tiết */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, marginBottom: 12 }}>
              <div>🚛 Xe: <strong>{order.vehiclePlate || '-'}</strong></div>
              <div>⛽ Hàng: <strong>{order.product || '-'} ({order.amount || 0}L)</strong></div>
              <div>🏭 Kho xuất: <strong>{order.sourceWarehouse || '-'}</strong></div>
              <div>🏪 Đại lý: <strong>{order.destination || '-'}</strong></div>
            </div>

            {/* Progress bar 5 bước */}
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

            {/* Mã Seal */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🔒 Seal: <strong>{order.sealCode || 'Chưa nhập'}</strong></span>
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

            {/* Upload chứng từ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'deliveryReceipt', label: '📄 Biên bản giao nhận' },
                { key: 'lossReport', label: '📊 Phiếu hao hụt' },
                { key: 'exportSlip', label: '📋 Phiếu xuất kho' },
                { key: 'otherDoc', label: '📎 Chứng từ khác' }
              ].map(doc => (
                <div key={doc.key} style={{ fontSize: 13 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>{doc.label}</label>
                  <input type="file" accept="image/*" onChange={e => handleDocUpload(order.id, doc.key, e)}
                    style={{ fontSize: 12 }} />
                  {order.documents?.[doc.key] && (
                    <img src={order.documents[doc.key]} alt={doc.label} style={{ width: 50, height: 40, objectFit: 'cover', borderRadius: 4, marginTop: 4 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Nút chuyển bước */}
            {getNextStatus(order.status) && (
              <button onClick={() => handleNextStatus(order.id, order.status)}
                style={{
                  width: '100%', padding: '12px', background: '#27ae60', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10
                }}>
                ▶ Chuyển sang: {getStatusLabel(getNextStatus(order.status))}
              </button>
            )}

            {/* Nút xem bản đồ tĩnh OpenStreetMap */}
            <button onClick={() => setShowMapForOrderId(showMapForOrderId === order.id ? null : order.id)}
              style={{
                width: '100%', padding: '10px', background: '#2980b9', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', marginBottom: 10
              }}>
              🗺️ {showMapForOrderId === order.id ? 'Đóng Bản Đồ Chuyến Đi' : 'Xem Đường Đi Tối Ưu Mới Nhất'}
            </button>

            {/* Khung hiển thị RouteMap nội bộ (Miễn phí 100%) */}
            {showMapForOrderId === order.id && (
              <RouteMap origin={order.sourceWarehouse || 'Hải Phòng, Việt Nam'} destination={order.destination || 'Hải Phòng, Việt Nam'} />
            )}
          </div>
        ))}

        {/* Lịch sử đã hoàn thành */}
        {completedOrders.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <h3>✅ Đã hoàn thành ({completedOrders.length})</h3>
            {completedOrders.slice(0, 5).map(o => (
              <div key={o.id} style={{
                padding: '10px 15px', background: '#f0f0f0', borderRadius: 6, marginBottom: 6, fontSize: 14
              }}>
                📍 {o.destination} — {o.product} ({o.amount}L) ✅
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderExpenses = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0 }}>💰 Báo Cáo Chi Phí Dọc Đường</h2>

      <form onSubmit={handleAddExpense} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8 }}>
        <h4 style={{ marginTop: 0 }}>➕ Thêm chi phí mới</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Loại chi phí</label>
            <select value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="BOT">🛣️ Vé BOT / Cầu đường</option>
              <option value="tire">🔧 Vá/Thay lốp</option>
              <option value="repair">🔩 Sửa chữa lặt vặt</option>
              <option value="fuel">⛽ Đổ dầu chạy xe</option>
              <option value="other">📎 Chi phí khác</option>
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
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>📸 Ảnh hóa đơn</label>
            <input type="file" accept="image/*" onChange={handleExpenseImageUpload} />
          </div>
          {expenseForm.receiptImage && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={expenseForm.receiptImage} alt="receipt" style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 4 }} />
              <span style={{ marginLeft: 8, color: 'green', fontSize: 12 }}>✓ Đã chọn</span>
            </div>
          )}
        </div>
        <button type="submit" style={{
          marginTop: 12, padding: '10px 24px', background: '#27ae60', color: 'white',
          border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'
        }}>💾 Ghi nhận chi phí</button>
      </form>

      {/* Lịch sử chi phí */}
      <h3>📋 Lịch sử chi phí</h3>
      {expenses.length === 0 ? <p style={{ color: '#999' }}>Chưa có khoản chi phí nào.</p> :
        expenses.map(exp => (
          <div key={exp.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', background: 'white', borderRadius: 6,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${exp.status === 'approved' ? '#27ae60' : exp.status === 'rejected' ? '#e74c3c' : '#f39c12'}`
          }}>
            <div>
              <strong>{exp.type === 'BOT' ? '🛣️' : exp.type === 'fuel' ? '⛽' : exp.type === 'tire' ? '🔧' : exp.type === 'repair' ? '🔩' : '📎'} {exp.description || exp.type}</strong>
              <div style={{ fontSize: 12, color: '#888' }}>{exp.createdAt ? new Date(exp.createdAt).toLocaleString('vi-VN') : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{Number(exp.amount).toLocaleString()}đ</div>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 'bold',
                background: exp.status === 'approved' ? '#d4edda' : exp.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                color: exp.status === 'approved' ? '#155724' : exp.status === 'rejected' ? '#721c24' : '#856404'
              }}>
                {exp.status === 'approved' ? '✅ Đã duyệt' : exp.status === 'rejected' ? '❌ Từ chối' : '⏳ Chờ duyệt'}
              </span>
            </div>
          </div>
        ))
      }
    </div>
  )

  const renderSOS = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, color: '#e74c3c' }}>🆘 Báo Cáo Sự Cố Khẩn Cấp</h2>

      <form onSubmit={handleSendSOS} style={{
        background: '#fff5f5', padding: 20, borderRadius: 8, border: '2px solid #e74c3c'
      }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 'bold' }}>Loại sự cố</label>
            <select value={sosForm.type} onChange={e => setSOSForm({ ...sosForm, type: e.target.value })}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
              <option value="traffic_jam">🚗 Kẹt xe nghiêm trọng</option>
              <option value="accident">💥 Tai nạn giao thông</option>
              <option value="breakdown">🔧 Xe hỏng / Không thể tiếp tục</option>
              <option value="fuel_leak">⚠️ Rò rỉ nhiên liệu</option>
              <option value="other">📎 Sự cố khác</option>
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
          border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer'
        }}>🆘 GỬI BÁO CÁO KHẨN CẤP</button>
      </form>

      {/* Lịch sử SOS */}
      <h3>📋 Lịch sử báo cáo</h3>
      {sosReports.length === 0 ? <p style={{ color: '#999' }}>Chưa có báo cáo SOS nào.</p> :
        sosReports.map(sos => (
          <div key={sos.id} style={{
            padding: '12px 16px', background: 'white', borderRadius: 6,
            borderLeft: `4px solid ${sos.status === 'resolved' ? '#27ae60' : sos.status === 'acknowledged' ? '#f39c12' : '#e74c3c'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              {sos.type === 'traffic_jam' ? '🚗' : sos.type === 'accident' ? '💥' : sos.type === 'breakdown' ? '🔧' : sos.type === 'fuel_leak' ? '⚠️' : '📎'} {sos.description}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {sos.createdAt ? new Date(sos.createdAt).toLocaleString('vi-VN') : ''} —
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontWeight: 'bold',
                background: sos.status === 'resolved' ? '#d4edda' : sos.status === 'acknowledged' ? '#fff3cd' : '#f8d7da',
                color: sos.status === 'resolved' ? '#155724' : sos.status === 'acknowledged' ? '#856404' : '#721c24'
              }}>
                {sos.status === 'resolved' ? '✅ Đã xử lý' : sos.status === 'acknowledged' ? '👁️ Đã tiếp nhận' : '🔴 Đang chờ'}
              </span>
            </div>
          </div>
        ))
      }
    </div>
  )

  const renderStats = () => {
    const completedOrders = orders.filter(o => o.status === 'completed')
    const totalKm = completedOrders.reduce((sum, o) => sum + (Number(o.distance) || 0), 0)
    const totalExpenseApproved = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const estimatedSalary = completedOrders.length * 500000 // Ước tính 500k/chuyến

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>📊 Thống Kê Cá Nhân</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
          <div style={{ background: '#eaf2f8', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2980b9' }}>{completedOrders.length}</div>
            <div>Chuyến đã hoàn thành</div>
          </div>
          <div style={{ background: '#eafaf1', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#27ae60' }}>{totalKm.toLocaleString()} km</div>
            <div>Tổng quãng đường</div>
          </div>
          <div style={{ background: '#fef9e7', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f39c12' }}>{estimatedSalary.toLocaleString()}đ</div>
            <div>Dự kiến thù lao</div>
          </div>
        </div>

        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>💸 Chi phí đã được duyệt</h3>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#e74c3c' }}>{totalExpenseApproved.toLocaleString()}đ</p>
        </div>

        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>📅 Lịch sử chuyến gần đây</h3>
          {completedOrders.length === 0 ? <p style={{ color: '#999' }}>Chưa có.</p> :
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Điểm giao</th>
                  <th>Hàng</th>
                  <th>Lít</th>
                  <th>Xe</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 8 }}>{o.destination}</td>
                    <td style={{ textAlign: 'center' }}>{o.product}</td>
                    <td style={{ textAlign: 'center' }}>{Number(o.amount).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>{o.vehiclePlate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h2>🚚 Tài Xế Dashboard</h2>
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
            {[['orders', '📦 Lệnh Điều Động'], ['expenses', '💰 Chi Phí Đường'], ['sos', '🆘 Báo Cáo SOS'], ['stats', '📊 Thống Kê'], ['profile', '👤 Hồ Sơ']].map(([key, label]) => (
              <li key={key} className={`menu-item ${activeMenu === key ? 'active' : ''}`}
                onClick={() => { setActiveMenu(key); setSidebarOpen(false) }}>{label}</li>
            ))}
          </ul>
        </div>
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
