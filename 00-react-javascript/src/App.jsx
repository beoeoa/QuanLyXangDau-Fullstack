import { useState } from 'react'
import './App.css'
import Login from './components/Login'
import Register from './components/Register'
import AdminDashboard from './components/AdminDashboard'
import DriverDashboard from './components/DriverDashboard'
import SalesDashboard from './components/SalesDashboard'
import AccountantDashboard from './components/AccountantDashboard'

function App() {
  // Đọc user đã lưu từ localStorage khi mở trang (persist login)
  const savedUser = localStorage.getItem('user')
  const initialUser = savedUser ? JSON.parse(savedUser) : null

  const [screen, setScreen] = useState(initialUser ? 'dashboard' : 'login')
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialUser)
  const [user, setUser] = useState(initialUser)

  // Xử lý khi nhấn chuyển đến register
  const handleSwitchToRegister = () => {
    setScreen('register')
  }

  // Xử lý khi nhấn chuyển đến login
  const handleSwitchToLogin = () => {
    setScreen('login')
  }

  // Xử lý đăng nhập thành công
  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
    setScreen('dashboard')
    localStorage.setItem('user', JSON.stringify(userData)) // Lưu phiên đăng nhập
  }

  // Xử lý đăng ký thành công
  const handleRegisterSuccess = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
    setScreen('dashboard')
  }

  // Xử lý đăng xuất
  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setScreen('login')
    localStorage.removeItem('user') // Xóa phiên đăng nhập
    sessionStorage.clear() // Xóa các cờ alert đã hiển thị
  }

  // Render Dashboard dựa trên role
  const renderDashboard = () => {
    if (!user) return null

    switch (user.role) {
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />
      case 'driver':
        return <DriverDashboard user={user} onLogout={handleLogout} />
      case 'sales':
        return <SalesDashboard user={user} onLogout={handleLogout} />
      case 'accountant':
        return <AccountantDashboard user={user} onLogout={handleLogout} />
      default:
        return (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2>Chào mừng, {user.name || user.email}</h2>
            <p>Vai trò: <strong>{user.role}</strong></p>
            <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
              Đăng xuất
            </button>
          </div>
        )
    }
  }

  // Render các màn hình
  if (screen === 'login') {
    return (
      <Login
        onSwitchToRegister={handleSwitchToRegister}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  }

  if (screen === 'register') {
    return (
      <Register
        onSwitchToLogin={handleSwitchToLogin}
        onRegisterSuccess={handleRegisterSuccess}
      />
    )
  }

  if (screen === 'dashboard' && isLoggedIn) {
    return renderDashboard()
  }
}

export default App
