// ============================================
// pages/admin/DashboardPage.jsx
// ============================================

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../../store/slices/adminSlice';
import StatCard from '../../components/shared/StatCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { FiDatabase, FiSearch, FiCpu, FiZap } from 'react-icons/fi';
import { formatDate } from '../../utils/formatters';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { dashboard, loading } = useSelector(s => s.admin);

  useEffect(() => { dispatch(fetchDashboard()); }, [dispatch]);

  if (loading && !dashboard) return <div className="page"><LoadingSpinner text="Memuat dashboard..." /></div>;

  const d = dashboard || {};

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Ringkasan sistem deteksi hoaks</p>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={FiDatabase} label="Total Dataset" value={d.total_datasets} color="var(--primary)" />
        <StatCard icon={FiSearch} label="Total Deteksi" value={d.total_detections} color="var(--success)" />
        <StatCard icon={FiCpu} label="Total Training" value={d.total_trainings} color="var(--warning)" />
        <StatCard icon={FiZap} label="Model Aktif" value={d.active_model?.name || 'Belum ada'} color="var(--info)"
          sub={d.active_model ? `F1: ${d.active_model.f1_score}` : 'Belum dilatih'} />
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {/* Active Model */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Model Aktif</h3>
          {d.active_model ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nama</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.active_model.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Accuracy</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.active_model.accuracy ?? '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>F1-Score</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.active_model.f1_score ?? '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Diaktifkan</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(d.active_model.activated_at)}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada model yang diaktifkan. Lakukan training terlebih dahulu.
            </p>
          )}
        </div>

        {/* Last Training */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Training Terakhir</h3>
          {d.last_training ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</span>
                <span className={`badge badge-${d.last_training.status}`}>{d.last_training.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Best F1</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.last_training.best_f1 ?? '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waktu</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(d.last_training.started_at)}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum pernah melakukan training.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
