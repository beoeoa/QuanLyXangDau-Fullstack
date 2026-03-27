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
import DriverScheduleManager from './admin/DriverScheduleManager'
import ContractManager from './admin/ContractManager'
import OrderManager from './admin/OrderManager'
import LiveTrackingMap from './shared/LiveTrackingMap'
import Profile from './Profile'
import NotificationBell from './NotificationBell'
import { getAllFleetVehicles } from '../services/fleetVehicleService'
import { getAllUsers } from '../services/userService'
import {
  LayoutDashboard, ShoppingCart, BadgeDollarSign, FileSignature,
  CalendarClock, Factory, Users, Map, Truck, ShieldCheck, ClipboardList, Menu
} from 'lucide-react'

function AdminDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
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
      case 'contracts': return <ContractManager />
      case 'orders': return <OrderManager />
      case 'prices': return <PriceManager />
      case 'driver-schedules': return <DriverScheduleManager />
      case 'tracking': return <LiveTrackingMap />
      case 'auditlog': return <AuditLogManager />
      default: return <OverviewDashboard />
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
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>VẬN TẢI 88</h2>
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
            <li className="menu-section-title">Tổng quan</li>
            <li className={`menu-item ${activeMenu === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveMenu('overview')}><LayoutDashboard size={18} /> Dashboard</li>

            <li className="menu-section-title">Kinh doanh</li>
            <li className={`menu-item ${activeMenu === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveMenu('orders')}><ShoppingCart size={18} /> Quản Lý Đơn Hàng</li>
            <li className={`menu-item ${activeMenu === 'prices' ? 'active' : ''}`}
              onClick={() => setActiveMenu('prices')}><BadgeDollarSign size={18} /> Bảng Giá Xăng Dầu</li>
            <li className={`menu-item ${activeMenu === 'contracts' ? 'active' : ''}`}
              onClick={() => setActiveMenu('contracts')}><FileSignature size={18} /> Quản Lý Hợp Đồng</li>
            <li className={`menu-item ${activeMenu === 'driver-schedules' ? 'active' : ''}`}
              onClick={() => setActiveMenu('driver-schedules')}><CalendarClock size={18} /> Nhật ký làm việc</li>

            <li className="menu-section-title">Đối tác</li>
            <li className={`menu-item ${activeMenu === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveMenu('suppliers')}><Factory size={18} /> Nhà Cung Cấp</li>
            <li className={`menu-item ${activeMenu === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveMenu('customers')}><Users size={18} /> Khách Hàng</li>

            <li className="menu-section-title">Vận hành</li>
            <li className={`menu-item ${activeMenu === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveMenu('tracking')}><Map size={18} /> Giám Sát Hành Trình</li>
            <li className={`menu-item ${activeMenu === 'fleet' ? 'active' : ''}`}
              onClick={() => setActiveMenu('fleet')}><Truck size={18} /> Quản Lý Xe Bồn</li>
            <li className={`menu-item ${activeMenu === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveMenu('employees')}><ShieldCheck size={18} /> Nhân Viên & Quyền</li>

            <li className="menu-section-title">Hệ thống</li>
            <li className={`menu-item ${activeMenu === 'auditlog' ? 'active' : ''}`}
              onClick={() => setActiveMenu('auditlog')}><ClipboardList size={18} /> Nhật Ký Hệ Thống</li>
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
