// ============================================
// components/layout/SideBar.jsx
// ============================================

import { NavLink } from 'react-router-dom';
import { NAV_USER, NAV_ADMIN } from '../../utils/constants';
import {
  FiSearch, FiClock, FiGrid, FiDatabase,
  FiFilter, FiCpu, FiBarChart2, FiPlay
} from 'react-icons/fi';
import './Layout.css';

const iconMap = {
  search: FiSearch,
  history: FiClock,
  dashboard: FiGrid,
  data: FiDatabase,
  preprocessing: FiFilter,
  training: FiCpu,
  testing: FiPlay,
  evaluation: FiBarChart2,
};

export default function SideBar({ type }) {
  const items = type === 'admin' ? NAV_ADMIN : NAV_USER;

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <span className="sidebar-label">
          {type === 'admin' ? 'Menu Admin' : 'Menu'}
        </span>
        <ul className="sidebar-nav">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || FiGrid;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/' || item.path === '/admin'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      {type === 'user' && (
        <div className="sidebar-footer">
          <p className="sidebar-info">
            Powered by<br />
            <strong>IndoBERT + GAT</strong>
          </p>
        </div>
      )}
    </aside>
  );
}
