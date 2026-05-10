// ============================================
// components/layout/Layout.jsx
// ============================================

import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import SideBar from './SideBar';
import './Layout.css';

export default function Layout({ type = 'user' }) {
  return (
    <div className="layout">
      <NavBar type={type} />
      <div className="layout-body">
        <SideBar type={type} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
