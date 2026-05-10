// ============================================
// components/layout/NavBar.jsx
// ============================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { FiShield, FiLogOut, FiSettings, FiUser } from 'react-icons/fi';
import { APP_NAME } from '../../utils/constants';
import './Layout.css';

export default function NavBar({ type }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  return (
    <nav className="navbar">
      <Link to={type === 'admin' ? '/admin' : '/'} className="navbar-brand">
        <div className="navbar-logo">
          <FiShield size={24} />
        </div>
        <span className="navbar-title">{APP_NAME}</span>
        {type === 'admin' && <span className="navbar-badge">ADMIN</span>}
      </Link>

      <div className="navbar-actions">
        {type === 'user' ? (
          <Link to="/admin/login" className="btn btn-ghost btn-sm">
            <FiSettings size={16} />
            Admin
          </Link>
        ) : (
          <div className="navbar-user">
            <span className="navbar-user-name">
              <FiUser size={14} />
              {user?.username || 'Admin'}
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
              <FiLogOut size={16} />
              Keluar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
