import { useState, useEffect } from 'react'
import './Dashboard.css'
import { verifyUserRole } from '../services/authService'
import OverviewDashboard from './admin/OverviewDashboard'
import SupplierManager from './admin/SupplierManager'
import CustomerManager from './admin/CustomerManager'
import EmployeeManager from './admin/EmployeeManager'
import VehicleManager from './admin/VehicleManager'
import AuditLogManager from './admin/AuditLogManager'
import PriceManager from './admin/PriceManager'
import DriverScheduleManager from './admin/DriverScheduleManager' // Cập nhật module mới
import Profile from './Profile'
import NotificationBell from './NotificationBell'
import { getAllFleetVehicles } from '../services/fleetVehicleService'
import { getAllUsers } from '../services/userService'

function AdminDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])

  // Kiểm tra role admin
  useEffect(() => {
    const checkRole = async () => {
      const result = await verifyUserRole(user.userId, 'admin')
      if (!result.success) {
        console.error('❌ Role verification failed:', result.message)
        alert('Lỗi xác minh quyền truy cập. Vui lòng đăng nhập lại.')
        onLogout()
      }
    }

    if (user?.userId) {
      checkRole()

      // Load vehicles + drivers cho ShipmentManager (now DriverScheduleManager might not need them, but keeping for context if needed elsewhere)
      Promise.all([getAllFleetVehicles(), getAllUsers()]).then(([v, u]) => {
        setVehicles(Array.isArray(v) ? v : [])
        setDrivers(Array.isArray(u) ? u.filter(usr => usr.role === 'driver') : [])
      })

      if (user.isProfileUpdated === false && !sessionStorage.getItem('profileAlertShown_Admin')) {
        alert('⚠️ Yêu cầu bắt buộc: Vui lòng cập nhật đầy đủ thông tin cá nhân (SĐT, Địa chỉ...) để hồ sơ hoàn tất!')
        setActiveMenu('profile')
        sessionStorage.setItem('profileAlertShown_Admin', 'true')
      }
    }
  }, [user?.userId, onLogout])

  const renderContent = () => {
    switch (activeMenu) {
      case 'overview': return <OverviewDashboard />
      case 'profile': return <Profile currentUser={user} />
      case 'suppliers': return <SupplierManager />
      case 'customers': return <CustomerManager />
      case 'employees': return <EmployeeManager />
      case 'fleet': return <VehicleManager />
      case 'prices': return <PriceManager />
      case 'driver-schedules': return <DriverScheduleManager />
      case 'auditlog': return <AuditLogManager />
      default: return <OverviewDashboard />
    }
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h2>👑 Hệ Thống Vận Tải Xăng Dầu 88</h2>
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
            <li className="menu-section-title" style={{ fontSize: '11px', color: '#aaa', padding: '10px 15px 5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tổng quan</li>
            <li className={`menu-item ${activeMenu === 'overview' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('overview'); setSidebarOpen(false) }}>📊 Dashboard</li>

            <li className="menu-section-title" style={{ fontSize: '11px', color: '#aaa', padding: '10px 15px 5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kinh doanh</li>
            <li className={`menu-item ${activeMenu === 'prices' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('prices'); setSidebarOpen(false) }}>💰 Bảng Giá Xăng Dầu</li>
            <li className={`menu-item ${activeMenu === 'driver-schedules' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('driver-schedules'); setSidebarOpen(false) }}>🗓️ Nhật ký làm việc</li>

            <li className="menu-section-title" style={{ fontSize: '11px', color: '#aaa', padding: '10px 15px 5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Đối tác</li>
            <li className={`menu-item ${activeMenu === 'suppliers' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('suppliers'); setSidebarOpen(false) }}>🏭 Nhà Cung Cấp</li>
            <li className={`menu-item ${activeMenu === 'customers' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('customers'); setSidebarOpen(false) }}>👤 Khách Hàng</li>

            <li className="menu-section-title" style={{ fontSize: '11px', color: '#aaa', padding: '10px 15px 5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vận hành</li>
            <li className={`menu-item ${activeMenu === 'fleet' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('fleet'); setSidebarOpen(false) }}>🚛 Quản Lý Xe Bồn</li>
            <li className={`menu-item ${activeMenu === 'employees' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('employees'); setSidebarOpen(false) }}>👥 Nhân Viên & Quyền</li>

            <li className="menu-section-title" style={{ fontSize: '11px', color: '#aaa', padding: '10px 15px 5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hệ thống</li>
            <li className={`menu-item ${activeMenu === 'auditlog' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('auditlog'); setSidebarOpen(false) }}>📋 Nhật Ký Hệ Thống</li>
          </ul>
        </div>

        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
