// ============================================
// App.jsx — Main Application Router
// ============================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import DetectionPage from './pages/user/DetectionPage';
import HistoryPage from './pages/user/HistoryPage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import DataCollectionPage from './pages/admin/DataCollectionPage';
import PreProcessingPage from './pages/admin/PreProcessingPage';
import IndoBERTPage from './pages/admin/IndoBERTPage';
import GATPage from './pages/admin/ProcessingPage';
import TestingPage from './pages/admin/TestingPage';
import EvaluationPage from './pages/admin/EvaluationPage';

function ProtectedRoute({ children }) {
  const { token } = useSelector((state) => state.auth);
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      {/* User Routes */}
      <Route element={<Layout type="user" />}>
        <Route path="/" element={<DetectionPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>

      {/* Admin Login (tanpa layout) */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Admin Routes (protected) */}
      <Route element={
        <ProtectedRoute>
          <Layout type="admin" />
        </ProtectedRoute>
      }>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/datasets" element={<DataCollectionPage />} />
        <Route path="/admin/preprocessing" element={<PreProcessingPage />} />
        <Route path="/admin/indobert" element={<IndoBERTPage />} />
        <Route path="/admin/gat" element={<GATPage />} />
        <Route path="/admin/testing" element={<TestingPage />} />
        <Route path="/admin/evaluation" element={<EvaluationPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
