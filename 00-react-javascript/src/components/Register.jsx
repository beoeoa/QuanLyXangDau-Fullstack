import { useState } from 'react'
import './Auth.css'
import SocialAuthButtons from './SocialAuthButtons'
import { registerWithEmail } from '../services/authService'

function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullname.trim()) newErrors.fullname = 'Vui lòng nhập họ tên'

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại'
    } else if (!/^(0[0-9]{9,10})$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0901234567)'
    }

    if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ'

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp'
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Vui lòng đồng ý với điều khoản'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    // Đăng ký với role pending mặc định ẩn bên trong service
    const result = await registerWithEmail(
      formData.email,
      formData.password,
      {
        fullname: formData.fullname,
        phone: formData.phone,
        address: formData.address
        // role và isApproved sẽ được set trong service
      }
    )

    setIsLoading(false)

    if (result.success) {
      alert('✅ Đăng ký thành công! Vui lòng chờ Quản trị viên duyệt tài khoản của bạn.')
      onSwitchToLogin() // Chuyển sang màn hình đăng nhập
    } else {
      console.error('Register failed:', result)
      const errorMsg = result.message
      setErrors(prev => ({ ...prev, submit: errorMsg }))
    }
  }

  const handleSocialSuccess = (result) => {
    if (!result.isApproved) {
      alert('Tài khoản đang chờ duyệt. Vui lòng liên hệ Admin.')
      onSwitchToLogin()
    } else {
      // Đã duyệt (VD: login lần sau)
      onRegisterSuccess({
        email: result.email,
        name: result.email.split('@')[0],
        role: result.role,
        userId: result.userId,
        photoURL: null
      })
    }
  }

  const handleSocialError = (message) => {
    setErrors(prev => ({ ...prev, submit: message }))
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Đăng Ký</h1>
          <p>Tạo tài khoản hệ thống mới</p>
        </div>

        <SocialAuthButtons
          onAuthSuccess={handleSocialSuccess}
          onError={handleSocialError}
          disabled={isLoading}
        />

        <div className="auth-divider">
          <span>hoặc đăng ký bằng email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.submit && (
            <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#ffebee', color: '#c00', borderRadius: '4px', border: '1px solid #f5a6a6' }}>
              ❌ {errors.submit}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="fullname">Họ và tên</label>
            <input id="fullname" type="text" name="fullname" placeholder="Nguyễn Văn A" value={formData.fullname} onChange={handleChange} />
            {errors.fullname && <span className="error-text">{errors.fullname}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input id="phone" type="tel" name="phone" placeholder="0901234567" value={formData.phone} onChange={handleChange} />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Địa chỉ</label>
            <input id="address" type="text" name="address" placeholder="123 Đường ABC..." value={formData.address} onChange={handleChange} />
            {errors.address && <span className="error-text">{errors.address}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input id="password" type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input id="confirmPassword" type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group checkbox">
            <input id="agreeTerms" type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
            <label htmlFor="agreeTerms">
              Tôi đồng ý với <a href="#terms">điều khoản dịch vụ</a>
            </label>
            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {isLoading ? 'Đang đăng ký...' : 'Đăng Ký'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Đã có tài khoản? <button type="button" onClick={onSwitchToLogin} className="switch-link">Đăng nhập</button></p>
        </div>
      </div>
    </div>
  )
}

export default Register
