// ============================================
// pages/user/HistoryPage.jsx — Riwayat Deteksi
// ============================================

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHistory, fetchHistoryDetail, clearDetail } from '../../store/slices/historySlice';
import Table from '../../components/shared/Table';
import Modal from '../../components/shared/Modal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import ConfidenceBar from '../../components/user/ConfidenceBar';
import SimilarNewsList from '../../components/user/SimilarNewsList';
import { formatDate, truncateText } from '../../utils/formatters';
import { FiSearch, FiEye, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function HistoryPage() {
  const dispatch = useDispatch();
  const { items, total, page, pages, detail, loading } = useSelector(s => s.history);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchHistory({ page: currentPage, search }));
  }, [dispatch, currentPage, search]);

  const handleView = (id) => dispatch(fetchHistoryDetail(id));

  const columns = [
    { key: 'input_text', label: 'Teks', render: (v) => truncateText(v, 60) },
    { key: 'predicted_label', label: 'Hasil', render: (v) => (
      <span className={`badge ${v === 'HOAKS' ? 'badge-hoaks' : 'badge-valid'}`}>{v}</span>
    )},
    { key: 'confidence', label: 'Keyakinan', align: 'center', render: (v) => `${v}%` },
    { key: 'input_type', label: 'Tipe', align: 'center', render: (v) => (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{v}</span>
    )},
    { key: 'created_at', label: 'Waktu', render: (v) => formatDate(v) },
    { key: 'id', label: '', align: 'center', render: (_, row) => (
      <button onClick={() => handleView(row.id)} className="btn btn-ghost btn-sm"><FiEye size={15} /></button>
    )},
  ];

  return (
    <div className="page">
      <h1 className="page-title"><FiClock style={{ marginRight: 8 }} />Riwayat Deteksi</h1>
      <p className="page-subtitle">Semua hasil deteksi yang pernah dilakukan</p>

      {/* Search */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Cari berdasarkan teks berita..."
            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <LoadingSpinner text="Memuat riwayat..." /> :
          items.length === 0 ? <EmptyState title="Belum ada riwayat" message="Mulai deteksi berita untuk melihat riwayat di sini" /> :
          <Table columns={columns} data={items} />}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
            <FiChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Halaman {currentPage} dari {pages} ({total} data)
          </span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage >= pages} onClick={() => setCurrentPage(p => p + 1)}>
            Next <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => dispatch(clearDetail())} title="Detail Deteksi" maxWidth={650}>
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <p className="label">Teks Input</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{detail.input_text}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <p className="label">Hasil</p>
                <span className={`badge ${detail.predicted_label === 'HOAKS' ? 'badge-hoaks' : 'badge-valid'}`} style={{ fontSize: '1rem', padding: '6px 16px' }}>
                  {detail.predicted_label}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <p className="label">Keyakinan</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{detail.confidence}%</p>
              </div>
            </div>
            <ConfidenceBar hoaxScore={detail.hoax_score} validScore={detail.valid_score} />
            {detail.similar_news?.length > 0 && <SimilarNewsList items={detail.similar_news} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
