import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { predictHoax, clearResult } from '../../store/slices/predictSlice';
import { fetchHistory } from '../../store/slices/historySlice';
import Table from '../../components/shared/Table';
import EmptyState from '../../components/shared/EmptyState';
import ConfidenceBar from '../../components/user/ConfidenceBar';
import { formatDate, truncateText } from '../../utils/formatters';
import { FiPlay, FiFileText, FiUpload, FiLoader, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';

export default function TestingPage() {
  const dispatch = useDispatch();
  const { result, loading, error } = useSelector(s => s.predict);
  const { items: historyItems } = useSelector(s => s.history);
  const [text, setText] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    // Fetch trained models
    api.get('/training/models').then(res => {
      setModels(res.data.models || []);
    }).catch(() => {});
    // Fetch recent test history
    dispatch(fetchHistory({ page: 1, perPage: 10 }));
  }, [dispatch]);

  const handleTest = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch(clearResult());
    dispatch(predictHoax({ content: text }));
  };

  const handleClear = () => {
    setText('');
    dispatch(clearResult());
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const isHoax = result?.label === 'HOAKS';
  const resultColor = isHoax ? 'var(--danger)' : 'var(--success)';
  const ResultIcon = isHoax ? FiAlertTriangle : FiCheckCircle;

  const historyColumns = [
    { key: 'input_text', label: 'Teks', render: v => truncateText(v, 60) },
    { key: 'predicted_label', label: 'Hasil', render: v => (
      <span className={`badge ${v === 'HOAKS' ? 'badge-hoaks' : 'badge-valid'}`}>{v}</span>
    )},
    { key: 'confidence', label: 'Keyakinan', align: 'center', render: v => `${v}%` },
    { key: 'created_at', label: 'Tgl Pengujian', render: v => formatDate(v) },
  ];

  return (
    <div className="page">
      <h1 className="page-title"><FiPlay style={{ marginRight: 8 }} />Testing</h1>
      <p className="page-subtitle">Uji prediksi berita baru menggunakan model yang sudah dilatih</p>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          {/* Model Selection */}
          <div>
            <label className="label">Pilih Model</label>
            <select className="input" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              <option value="">Model Aktif (default)</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.model_name} {m.is_active ? '(Aktif)' : ''} — F1: {((m.f1_score || 0) * 100).toFixed(1)}%
                </option>
              ))}
            </select>
          </div>
          {/* Upload File */}
          <div>
            <label className="label">Atau Upload File</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <input id="test-file" type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button onClick={() => document.getElementById('test-file').click()} className="btn btn-outline" style={{ flex: 1 }}>
                <FiUpload size={15} /> Pilih File (.txt)
              </button>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label className="label">Input Teks Berita</label>
          <textarea className="textarea" rows={5} value={text} onChange={e => setText(e.target.value)}
            placeholder="Paste atau ketik isi berita yang ingin diuji di sini..." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          {text && (
            <button onClick={handleClear} className="btn btn-ghost"><FiX size={16} /> Bersihkan</button>
          )}
          <button onClick={handleTest} className="btn btn-primary btn-lg" disabled={loading || !text.trim()}>
            {loading ? <><FiLoader className="animate-spin" size={18} /> Memproses...</> : <><FiPlay size={18} /> Proses</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card animate-fade-in" style={{
          borderColor: 'var(--danger)', background: 'var(--danger-light)',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-lg)',
        }}>
          <FiAlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card animate-slide-up" style={{ borderColor: `${resultColor}40`, borderWidth: 2, marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--space-md)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: `${resultColor}15`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: resultColor, flexShrink: 0,
            }}>
              <ResultIcon size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: resultColor }}>{result.label}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Tingkat keyakinan: <strong style={{ color: resultColor }}>{result.confidence}%</strong>
              </p>
            </div>
          </div>
          <ConfidenceBar hoaxScore={result.hoax_score} validScore={result.valid_score} />
          {result.preprocessed_text && (
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <p className="label">Teks Setelah Preprocessing</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.preprocessed_text}</p>
            </div>
          )}
        </div>
      )}

      {/* Test History */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Riwayat Testing</h3>
        </div>
        {historyItems.length === 0 ? (
          <EmptyState title="Belum ada riwayat testing" message="Lakukan prediksi untuk melihat riwayat di sini" />
        ) : (
          <Table columns={historyColumns} data={historyItems} />
        )}
      </div>
    </div>
  );
}
