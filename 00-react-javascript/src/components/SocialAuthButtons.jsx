import React from 'react'
import { loginWithGoogle, loginWithFacebook } from '../services/authService'
import './Auth.css'

function SocialAuthButtons({ onAuthSuccess, onError, disabled }) {
    const handleGoogleLogin = async () => {
        const result = await loginWithGoogle()
        if (result.success) {
            onAuthSuccess(result)
        } else {
            onError(result.message)
        }
    }

    const handleFacebookLogin = async () => {
        const result = await loginWithFacebook()
        if (result.success) {
            onAuthSuccess(result)
        } else {
            onError(result.message)
        }
    }

    return (
        <div className="social-login">
            <button
                type="button"
                className="btn-social"
                onClick={handleGoogleLogin}
                disabled={disabled}
            >
                <span>G</span> Google
            </button>
            <button
                type="button"
                className="btn-social"
                onClick={handleFacebookLogin}
                disabled={disabled}
            >
                <span>f</span> Facebook
            </button>
        </div>
    )
}

export default SocialAuthButtons
