import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDatasets, uploadDataset, deleteDataset } from '../../store/slices/adminSlice';
import Table from '../../components/shared/Table';
import Modal from '../../components/shared/Modal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate } from '../../utils/formatters';
import { FiDatabase, FiUpload, FiTrash2, FiEye, FiBarChart } from 'react-icons/fi';
import api from '../../services/api';

export default function DataCollectionPage() {
  const dispatch = useDispatch();
  const { datasets, uploading } = useSelector(s => s.admin);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => { dispatch(fetchDatasets()); }, [dispatch]);

  const handleUpload = (file) => { if (file) dispatch(uploadDataset(file)); };
  const handleFileInput = (e) => { handleUpload(e.target.files[0]); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files[0]); };

  const handlePreview = async (id) => {
    try {
      const res = await api.get(`/admin/datasets/${id}/preview`);
      setPreviewData(res.data);
      setShowPreview(true);
    } catch { setPreviewData(null); }
  };

  const handleStats = async (id) => {
    try {
      const res = await api.get(`/admin/datasets/${id}/stats`);
      setStatsData(res.data);
      setShowStats(true);
    } catch { setStatsData(null); }
  };

  const columns = [
    { key: 'id', label: 'ID', align: 'center', render: v => `#D${String(v).padStart(2, '0')}` },
    { key: 'filename', label: 'Nama File' },
    { key: 'total_rows', label: 'Jumlah Data', align: 'center' },
    { key: 'hoax_count', label: 'Hoaks', align: 'center', render: v => <span style={{ color: 'var(--danger)' }}>{v}</span> },
    { key: 'valid_count', label: 'Valid', align: 'center', render: v => <span style={{ color: 'var(--success)' }}>{v}</span> },
    { key: 'uploaded_at', label: 'Tanggal', render: v => formatDate(v) },
    { key: 'id', label: 'Aksi', align: 'center', render: (_, row) => (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        <button onClick={() => handlePreview(row.id)} className="btn btn-ghost btn-sm" title="Preview"><FiEye size={15} /></button>
        <button onClick={() => handleStats(row.id)} className="btn btn-ghost btn-sm" title="Statistik"><FiBarChart size={15} /></button>
        <button onClick={() => dispatch(deleteDataset(row.id))} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} title="Hapus"><FiTrash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <h1 className="page-title"><FiDatabase style={{ marginRight: 8 }} />Data Collection</h1>
      <p className="page-subtitle">Upload dan kelola dataset untuk training model</p>

      {/* Upload Zone */}
      <div className="card" onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)} onDrop={handleDrop}
        style={{ textAlign: 'center', padding: 'var(--space-2xl)',
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
          background: dragActive ? 'var(--primary-light)' : 'var(--bg-card)',
          transition: 'all var(--transition-fast)', marginBottom: 'var(--space-lg)', cursor: 'pointer',
        }}
        onClick={() => document.getElementById('file-input').click()}>
        <input id="file-input" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInput} style={{ display: 'none' }} />
        {uploading ? <LoadingSpinner text="Mengupload dataset..." /> : (
          <>
            <FiUpload size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Drag & drop file dataset di sini</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>atau klik untuk memilih file (CSV, Excel)</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>
              Harus memiliki kolom: <code style={{ color: 'var(--primary)' }}>teks</code> dan <code style={{ color: 'var(--primary)' }}>label</code>
            </p>
          </>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {datasets.length === 0 ? <EmptyState title="Belum ada dataset" message="Upload file CSV untuk memulai" /> :
          <Table columns={columns} data={datasets} />}
      </div>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Preview Dataset" maxWidth={700}>
        {previewData && (
          <div style={{ overflowX: 'auto' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              Menampilkan {previewData.preview?.length || 0} baris pertama dari {previewData.total_rows} data
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem' }}>No</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Teks</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Label</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview?.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.teks || row.text || row.content || '-'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <span className={`badge ${(row.label === 1 || row.label === '1' || row.label === 'HOAKS') ? 'badge-hoaks' : 'badge-valid'}`}>
                        {row.label === 1 || row.label === '1' || row.label === 'HOAKS' ? 'HOAKS' : 'VALID'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Stats Modal */}
      <Modal isOpen={showStats} onClose={() => setShowStats(false)} title="Analisis Dataset" maxWidth={600}>
        {statsData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Label Distribution */}
            {statsData.label_distribution && (
              <div>
                <p className="label">Distribusi Label</p>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  {Object.entries(statsData.label_distribution).map(([k, v]) => (
                    <div key={k} className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--space-md)' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: (k === '1' || k === 'HOAKS') ? 'var(--danger)' : 'var(--success)' }}>{v}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{k === '1' || k === 'HOAKS' ? 'Hoaks' : 'Valid'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Length Stats */}
            {statsData.text_length && (
              <div>
                <p className="label">Panjang Teks (kata)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[{l:'Rata-rata', v:statsData.text_length.mean}, {l:'Median', v:statsData.text_length.median}, {l:'Min', v:statsData.text_length.min}, {l:'Max', v:statsData.text_length.max}].map(s => (
                    <div key={s.l} style={{ textAlign: 'center', padding: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s.v}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 20 Words */}
            {statsData.top_words && (
              <div>
                <p className="label">Top 20 Kata Paling Sering</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {statsData.top_words.map((w, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-full)',
                      background: i < 5 ? 'var(--primary-light)' : 'var(--bg-input)',
                      color: i < 5 ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: i < 5 ? 600 : 400,
                    }}>
                      {w.word} <span style={{ opacity: 0.6 }}>({w.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
