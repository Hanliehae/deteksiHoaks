// ============================================
// pages/admin/LoginPage.jsx
// ============================================

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, clearError } from '../../store/slices/authSlice';
import { FiShield, FiUser, FiLock, FiLogIn, FiLoader } from 'react-icons/fi';
import { APP_NAME } from '../../utils/constants';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector(s => s.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) navigate('/admin');
  }, [token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(loginAdmin({ username, password }));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-base) 0%, #1a1a3e 50%, var(--bg-base) 100%)',
      padding: 'var(--space-lg)',
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-2xl)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary), #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-md)', boxShadow: 'var(--shadow-glow)',
          }}>
            <FiShield size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{APP_NAME}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Admin Panel Login</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 'var(--space-md)', background: 'var(--danger-light)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
            color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center',
          }}>{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <label className="label"><FiUser size={12} style={{ marginRight: 4 }} />Username</label>
            <input className="input" placeholder="admin" value={username}
              onChange={e => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label"><FiLock size={12} style={{ marginRight: 4 }} />Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-sm)' }} disabled={loading}>
            {loading ? <><FiLoader className="animate-spin" size={18} /> Masuk...</> : <><FiLogIn size={18} /> Masuk</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-lg)' }}>
          Kembali ke <a href="/" style={{ color: 'var(--primary)' }}>halaman deteksi</a>
        </p>
      </div>
    </div>
  );
}
