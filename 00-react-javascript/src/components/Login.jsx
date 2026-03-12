import { useState } from 'react'
import './Auth.css'
import SocialAuthButtons from './SocialAuthButtons'
import { loginWithEmail, resetPassword } from '../services/authService'

function Login({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const processLoginResult = (result) => {
    if (!result.success) {
      setError(result.message)
      return
    }

    if (!result.isApproved && result.role !== 'admin') {
      setError('Tài khoản của bạn đang chờ Admin duyệt. Xin vui lòng đợi.')
      return
    }

    if (!result.role || result.role === 'pending') {
      setError('Tài khoản chưa được phân quyền. Vui lòng liên hệ Admin.')
      return
    }

    // Login thành công
    onLoginSuccess({
      email: result.email,
      name: result.name || result.email?.split('@')[0] || 'User',
      role: result.role,
      userId: result.userId,
      isProfileUpdated: result.isProfileUpdated,
      photoURL: null
    })
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('⚠️ Vui lòng nhập địa chỉ Email của bạn vào ô bên trên rồi nhấn Quên mật khẩu!')
      return
    }
    setError('')
    setIsLoading(true)
    const result = await resetPassword(email)
    setIsLoading(false)

    if (result.success) {
      alert('✅ ' + result.message)
    } else {
      setError(result.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const authResult = await loginWithEmail(email, password)
    processLoginResult(authResult)

    setIsLoading(false)
  }

  const handleSocialSuccess = (result) => {
    setError('')
    processLoginResult(result)
  }

  const handleSocialError = (message) => {
    setError(message)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Đăng Nhập</h1>
          <p>Chào mừng bạn quay lại hệ thống</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <SocialAuthButtons
          onAuthSuccess={handleSocialSuccess}
          onError={handleSocialError}
          disabled={isLoading}
        />

        <div className="auth-divider">
          <span>hoặc đăng nhập bằng email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="forgot-password">
            <a href="#forget" onClick={handleForgotPassword}>Quên mật khẩu?</a>
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Chưa có tài khoản?
            <button type="button" onClick={onSwitchToRegister} className="switch-link">
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
