import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  startTraining, fetchTrainingStatus, fetchTrainingResults,
  fetchTrainingHistory, fetchTrainedModels, activateModel,
} from '../../store/slices/trainingSlice';
import { fetchDatasets } from '../../store/slices/adminSlice';
import ProgressBar from '../../components/shared/ProgressBar';
import Table from '../../components/shared/Table';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatPercent, formatRatio } from '../../utils/formatters';
import { POLLING_INTERVAL, DEFAULT_GAT_PARAMS } from '../../utils/constants';
import { FiCpu, FiPlay, FiCheck, FiLoader, FiRefreshCw, FiInfo } from 'react-icons/fi';

export default function ProcessingPage() {
  const dispatch = useDispatch();
  const { activeSessionId, status, results, sessions, models, loading } = useSelector(s => s.training);
  const { datasets } = useSelector(s => s.admin);
  const [datasetId, setDatasetId] = useState('');
  const [splitRatios, setSplitRatios] = useState('0.7, 0.8, 0.9');
  const [epochs, setEpochs] = useState('10, 20, 30');
  const [lr, setLr] = useState(0.001);
  const [modelName, setModelName] = useState('');
  const [gatHeads, setGatHeads] = useState(DEFAULT_GAT_PARAMS.heads);
  const [gatHidden, setGatHidden] = useState(DEFAULT_GAT_PARAMS.hidden_dim);
  const [gatDropout, setGatDropout] = useState(DEFAULT_GAT_PARAMS.dropout);
  const [tab, setTab] = useState('train');
  const [showArch, setShowArch] = useState(false);

  useEffect(() => {
    dispatch(fetchDatasets());
    dispatch(fetchTrainingHistory());
    dispatch(fetchTrainedModels());
  }, [dispatch]);

  useEffect(() => {
    if (!activeSessionId) return;
    dispatch(fetchTrainingStatus(activeSessionId));
    const iv = setInterval(() => dispatch(fetchTrainingStatus(activeSessionId)), POLLING_INTERVAL);
    return () => clearInterval(iv);
  }, [dispatch, activeSessionId]);

  useEffect(() => {
    if (status?.status === 'completed') {
      dispatch(fetchTrainingResults(activeSessionId));
      dispatch(fetchTrainedModels());
    }
  }, [status?.status]);

  const handleStart = () => {
    dispatch(startTraining({
      dataset_id: parseInt(datasetId),
      split_ratios: splitRatios.split(',').map(s => parseFloat(s.trim())),
      epochs: epochs.split(',').map(s => parseInt(s.trim())),
      learning_rate: parseFloat(lr),
      model_name: modelName || `Model_${new Date().toISOString().slice(0,10)}`,
      gat_params: { heads: parseInt(gatHeads), hidden_dim: parseInt(gatHidden), dropout: parseFloat(gatDropout) },
    }));
  };

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';

  const tabs = [
    { key: 'train', label: 'Training' },
    { key: 'models', label: 'Models' },
    { key: 'history', label: 'Riwayat' },
  ];

  return (
    <div className="page">
      <h1 className="page-title"><FiCpu style={{ marginRight: 8 }} />Processing</h1>
      <p className="page-subtitle">Model Training — Re-train GAT dengan dataset dan parameter custom</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 4, maxWidth: 400 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
            fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--primary)' : 'transparent',
            color: tab === t.key ? 'white' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'train' && (
        <>
          {/* Architecture Info Toggle */}
          <button onClick={() => setShowArch(!showArch)} className="btn btn-outline btn-sm" style={{ marginBottom: 'var(--space-md)' }}>
            <FiInfo size={14} /> {showArch ? 'Sembunyikan' : 'Lihat'} Arsitektur Model
          </button>

          {showArch && (
            <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Arsitektur IndoBERT + GAT</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 'var(--space-md)', alignItems: 'center' }}>
                {/* IndoBERT */}
                <div style={{ padding: 'var(--space-md)', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>IndoBERT</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Feature Extractor</p>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <p>• Model: indobert-base-p1</p>
                    <p>• Input: Teks berita</p>
                    <p>• Output: Embedding 768-dim</p>
                    <p>• Max Length: 128 tokens</p>
                  </div>
                </div>
                {/* Arrow */}
                <div style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--text-muted)' }}>→</div>
                {/* GAT */}
                <div style={{ padding: 'var(--space-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>GAT</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Graph Classifier</p>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <p>• Input Layer: 768-dim</p>
                    <p>• Hidden Layer: {gatHidden}-dim × {gatHeads} heads</p>
                    <p>• Output Layer: 2 kelas (Valid/Hoaks)</p>
                    <p>• Dropout: {gatDropout}</p>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                Teks → IndoBERT (embedding CLS) → Cosine Similarity → k-NN Graph → GAT → Prediksi
              </p>
            </div>
          )}

          {!isRunning && !isCompleted && (
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Konfigurasi Training</h3>

              {/* Model Name */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="label">Nama Model</label>
                <input className="input" value={modelName} onChange={e => setModelName(e.target.value)}
                  placeholder="Contoh: GAT_v1_hoaks_politik" />
              </div>

              {/* Dataset + Split */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                  <label className="label">Dataset</label>
                  <select className="input" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
                    <option value="">Pilih dataset...</option>
                    {datasets.map(d => <option key={d.id} value={d.id}>{d.filename} ({d.total_rows})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Split Ratios (Train:Test)</label>
                  <input className="input" value={splitRatios} onChange={e => setSplitRatios(e.target.value)} placeholder="0.7, 0.8, 0.9" />
                </div>
                <div>
                  <label className="label">Epochs</label>
                  <input className="input" value={epochs} onChange={e => setEpochs(e.target.value)} placeholder="10, 20, 30" />
                </div>
                <div>
                  <label className="label">Learning Rate</label>
                  <input className="input" type="number" step="0.0001" value={lr} onChange={e => setLr(e.target.value)} />
                </div>
              </div>

              {/* GAT Parameters */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Parameter GAT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                  <label className="label">Attention Heads</label>
                  <input className="input" type="number" min="1" max="16" value={gatHeads} onChange={e => setGatHeads(e.target.value)} />
                </div>
                <div>
                  <label className="label">Hidden Dimension</label>
                  <input className="input" type="number" min="32" max="512" value={gatHidden} onChange={e => setGatHidden(e.target.value)} />
                </div>
                <div>
                  <label className="label">Dropout</label>
                  <input className="input" type="number" step="0.05" min="0" max="0.9" value={gatDropout} onChange={e => setGatDropout(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleStart} className="btn btn-primary btn-lg" disabled={loading || !datasetId}>
                  {loading ? <><FiLoader className="animate-spin" /> Memulai...</> : <><FiPlay /> Mulai Training</>}
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          {status && (isRunning || isCompleted) && (
            <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                {isRunning ? 'Proses Training Berjalan...' : 'Training Selesai!'}
              </h3>
              <ProgressBar value={status.progress} color={isCompleted ? 'var(--success)' : 'var(--primary)'} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>{status.current_step}</p>
              {isCompleted && status.best_f1 && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600 }}>
                    ★ Rasio Terbaik: {formatRatio(status.best_ratio)} — F1: {formatPercent(status.best_f1 * 100)} (Epoch {status.best_epoch})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {results?.results?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Hasil Rasio Data Split</h3>
              </div>
              <Table columns={[
                { key: 'split_ratio', label: 'Rasio', render: v => formatRatio(v) },
                { key: 'epoch', label: 'Epoch', align: 'center' },
                { key: 'accuracy', label: 'Accuracy', align: 'center', render: v => formatPercent(v * 100) },
                { key: 'precision', label: 'Precision', align: 'center', render: v => formatPercent(v * 100) },
                { key: 'recall', label: 'Recall', align: 'center', render: v => formatPercent(v * 100) },
                { key: 'f1_score', label: 'F1-Score', align: 'center', render: (v, row) => (
                  <span style={{ fontWeight: row.is_best ? 700 : 400, color: row.is_best ? 'var(--success)' : 'inherit' }}>
                    {formatPercent(v * 100)} {row.is_best && '★'}
                  </span>
                )},
              ]} data={results.results} />
            </div>
          )}
        </>
      )}

      {tab === 'models' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Trained Models</h3>
            <button onClick={() => dispatch(fetchTrainedModels())} className="btn btn-ghost btn-sm"><FiRefreshCw size={14} /></button>
          </div>
          {models.length === 0 ? <EmptyState title="Belum ada model" message="Lakukan training untuk membuat model baru" /> :
            <Table columns={[
              { key: 'model_name', label: 'Nama Model' },
              { key: 'f1_score', label: 'F1-Score', align: 'center', render: v => formatPercent((v||0) * 100) },
              { key: 'is_active', label: 'Status', align: 'center', render: v => <span className={`badge ${v ? 'badge-completed' : 'badge-pending'}`}>{v ? 'AKTIF' : '-'}</span> },
              { key: 'created_at', label: 'Dibuat', render: v => formatDate(v) },
              { key: 'id', label: '', render: (_, row) => !row.is_active && (
                <button onClick={() => dispatch(activateModel(row.id))} className="btn btn-outline btn-sm"><FiCheck size={14} /> Aktifkan</button>
              )},
            ]} data={models} />}
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Riwayat Training</h3>
          </div>
          {sessions.length === 0 ? <EmptyState title="Belum ada riwayat" /> :
            <Table columns={[
              { key: 'id', label: 'ID', align: 'center' },
              { key: 'model_name', label: 'Nama Model' },
              { key: 'status', label: 'Status', render: v => <span className={`badge badge-${v}`}>{v}</span> },
              { key: 'best_f1', label: 'Best F1', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'started_at', label: 'Waktu', render: v => formatDate(v) },
            ]} data={sessions} />}
        </div>
      )}
    </div>
  );
}
