import React, { useState, useContext, useEffect } from 'react';
import axios from './axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from './UserContext';
import './Login.css';
import pipIntelLogo from './assets/NamibiaPIPIntelLogo.png'; // Place your logo in src/assets/pipintel-logo.png

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New: Loading state
  const { user, setUser, loading } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // MFA States
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Redirect only when user is authenticated
  useEffect(() => {
    if (!loading && user && user.authenticated) {
      navigate('/Pips/pips');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (location.search.includes('expired=1')) {
      setErrorMsg('Session expired. Please log in again.');
    }
  }, [location]);

  const handleInitialLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await axios.post('/auth/login/init', {
        email,
        password,
      });

      if (res.data.requiresVerification) {
        setShowVerification(true);
        setUserId(res.data.userId);
        setVerificationEmail(res.data.email);
        setErrorMsg('✅ Verification code sent to your email.');
      } else if (res.data.token && res.data.user) {
        // 2FA disabled: immediate login
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, authenticated: true }));
        if (user && user.email) {
          localStorage.setItem('userEmail', user.email);
        }
        setUser({ ...user, authenticated: true });
        window.dispatchEvent(new Event('pip-login-success'));
        navigate('/Pips/pips');
      }
    } catch (err) {
      const error = err.response?.data?.error || 'Server error. Please try again.';
      if (error.includes('inactive')) {
        setErrorMsg('❌ Your account is disabled. Contact an administrator.');
      } else if (error.includes('Invalid credentials')) {
        setErrorMsg('❌ Invalid email or password.');
      } else {
        setErrorMsg('❌ ' + error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await axios.post('/auth/login/verify', {
        userId,
        verificationCode,
      });

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...user, authenticated: true }));
      if (user && user.email) {
        localStorage.setItem('userEmail', user.email);
      }
      
      setUser({ ...user, authenticated: true });
      window.dispatchEvent(new Event('pip-login-success'));

      navigate('/Pips/pips');
    } catch (err) {
      const error = err.response?.data?.error || 'Verification failed. Please try again.';
      if (error.includes('Invalid code') || error.includes('expired')) {
        setErrorMsg('❌ Invalid or expired verification code. Please try again or resend the code.');
      } else {
        setErrorMsg('❌ ' + error);
      }
      // Ensure verification screen persists
      setShowVerification(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      await axios.post('/auth/login/init', {
        email,
        password,
      });
      
      setErrorMsg('✅ Verification code resent to your email.');
      setVerificationCode(''); // Clear previous code
    } catch (err) {
      setErrorMsg('❌ Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo at the top, centered */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img
            src={pipIntelLogo}
            alt="PIP Intel Logo"
            style={{ maxWidth: 100, maxHeight: 100, objectFit: 'contain' }}
          />
        </div>
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            {showVerification ? 'Enter your verification code' : 'Log in to your PIP account'}
          </p>
        </div>

        {errorMsg && (
          <div className={`error-message ${errorMsg.includes('✅') ? 'success-message' : ''}`}>
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              {errorMsg.includes('✅') ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            {errorMsg}
          </div>
        )}

        {!showVerification ? (
          <form onSubmit={handleInitialLogin} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                className={`form-input ${errorMsg.includes('email') ? 'input-error' : ''}`}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isLoading}
              />
              {errorMsg.includes('email') && (
                <span className="field-error">{errorMsg}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`form-input ${errorMsg.includes('password') ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L3 3" />
                    </svg>
                  ) : (
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errorMsg.includes('password') && (
                <span className="field-error">{errorMsg}</span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerification} className="login-form" noValidate>
            <div className="verification-info">
              <p>
                A verification code has been sent to <strong>{verificationEmail}</strong>.
                Please check your inbox or spam folder.
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="verification-code" className="form-label">
                Verification Code
              </label>
              <input
                type="text"
                id="verification-code"
                name="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.trim())}
                className={`form-input verification-input ${errorMsg.includes('code') ? 'input-error' : ''}`}
                placeholder="Enter 6-digit code"
                maxLength="6"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
            
            <div className="resend-code">
              <button
                type="button"
                className="resend-button"
                onClick={resendVerificationCode}
                disabled={isLoading}
              >
                Resend code
              </button>
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setShowVerification(false);
                  setVerificationCode('');
                  setErrorMsg('');
                }}
                disabled={isLoading}
              >
                Back to login
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p className="footer-text">
            Don't have an account? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;