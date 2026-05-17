import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  experimentRatios, startTraining, fetchTrainingStatus,
  fetchTrainingResults, fetchTrainingHistory, fetchTrainedModels,
  activateModel, setSelectedRatio, clearExperiment, clearTrainingState,
} from '../../store/slices/trainingSlice';
import { fetchDatasets } from '../../store/slices/adminSlice';
import ProgressBar from '../../components/shared/ProgressBar';
import Table from '../../components/shared/Table';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatPercent, formatRatio } from '../../utils/formatters';
import { POLLING_INTERVAL, DEFAULT_GAT_PARAMS } from '../../utils/constants';
import {
  FiCpu, FiPlay, FiCheck, FiLoader, FiRefreshCw,
  FiInfo, FiPlus, FiTrash2, FiEdit2, FiAward, FiZap,
} from 'react-icons/fi';

export default function ProcessingPage() {
  const dispatch = useDispatch();
  const {
    activeSessionId, status, results, sessions, models, loading,
    experimentResults, experimentLoading, selectedRatio,
  } = useSelector(s => s.training);
  const { datasets } = useSelector(s => s.admin);

  const [datasetId, setDatasetId] = useState('');
  const [tab, setTab] = useState('experiment');

  // Tahap A: Rasio management
  const [ratioList, setRatioList] = useState([
    { train: 50, test: 50 },
    { train: 60, test: 40 },
    { train: 70, test: 30 },
  ]);
  const [newTrain, setNewTrain] = useState(80);
  const [editIdx, setEditIdx] = useState(null);

  // Tahap B: Training params
  const [epochs, setEpochs] = useState(30);
  const [lr, setLr] = useState(0.001);
  const [modelName, setModelName] = useState('');
  const [gatHeads, setGatHeads] = useState(DEFAULT_GAT_PARAMS.heads);
  const [gatHidden, setGatHidden] = useState(DEFAULT_GAT_PARAMS.hidden_dim);
  const [gatDropout, setGatDropout] = useState(DEFAULT_GAT_PARAMS.dropout);
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
      dispatch(fetchTrainingHistory());
    }
  }, [status?.status]);

  // --- Tahap A handlers ---
  const handleAddRatio = () => {
    const t = parseInt(newTrain);
    if (t < 10 || t > 95) return;
    if (ratioList.some(r => r.train === t)) return;
    if (editIdx !== null) {
      const updated = [...ratioList];
      updated[editIdx] = { train: t, test: 100 - t };
      setRatioList(updated);
      setEditIdx(null);
    } else {
      setRatioList([...ratioList, { train: t, test: 100 - t }]);
    }
    setNewTrain(80);
  };

  const handleDeleteRatio = (idx) => {
    setRatioList(ratioList.filter((_, i) => i !== idx));
  };

  const handleEditRatio = (idx) => {
    setNewTrain(ratioList[idx].train);
    setEditIdx(idx);
  };

  const handleExperiment = () => {
    if (!datasetId || ratioList.length === 0) return;
    const ratios = ratioList.map(r => r.train / 100);
    dispatch(experimentRatios({
      dataset_id: parseInt(datasetId),
      ratios,
      gat_params: { heads: parseInt(gatHeads), hidden_dim: parseInt(gatHidden), dropout: parseFloat(gatDropout) },
    }));
  };

  // --- Tahap B handlers ---
  const handleStartTraining = () => {
    if (!datasetId || !selectedRatio) return;
    dispatch(startTraining({
      dataset_id: parseInt(datasetId),
      split_ratio: selectedRatio,
      epochs: parseInt(epochs),
      learning_rate: parseFloat(lr),
      model_name: modelName || `Model_${new Date().toISOString().slice(0, 10)}`,
      gat_params: { heads: parseInt(gatHeads), hidden_dim: parseInt(gatHidden), dropout: parseFloat(gatDropout) },
    }));
  };

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';

  const tabs = [
    { key: 'experiment', label: 'Eksperimen Rasio' },
    { key: 'train', label: 'Training' },
    { key: 'history', label: 'Riwayat' },
    { key: 'models', label: 'Models' },
  ];

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      <h1 className="page-title"><FiCpu style={{ marginRight: 8 }} />GAT Training</h1>
      <p className="page-subtitle">Training Graph Attention Network — eksperimen rasio & training model</p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 4, maxWidth: 550 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
            fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--primary)' : 'transparent',
            color: tab === t.key ? 'white' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ============ TAB: EKSPERIMEN RASIO (Tahap A) ============ */}
      {tab === 'experiment' && (
        <>
          {/* Dataset Selection */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Pilih Dataset</h3>
            <select className="input" value={datasetId} onChange={e => setDatasetId(e.target.value)} style={{ maxWidth: 400 }}>
              <option value="">Pilih dataset...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.filename} ({d.total_rows} data)</option>)}
            </select>
          </div>

          {/* Tabel Rasio Interaktif */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              <FiZap style={{ marginRight: 6 }} />Daftar Rasio Data Split
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              Tambahkan rasio yang ingin diuji, kemudian klik "Test Semua Rasio"
            </p>

            {/* Input rasio baru */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
              <div style={{ flex: 1, maxWidth: 120 }}>
                <label className="label">Train (%)</label>
                <input className="input" type="number" min="10" max="95" value={newTrain}
                  onChange={e => setNewTrain(e.target.value)} />
              </div>
              <div style={{ flex: 1, maxWidth: 120 }}>
                <label className="label">Test (%)</label>
                <input className="input" type="number" value={100 - parseInt(newTrain || 0)} disabled
                  style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }} />
              </div>
              <button onClick={handleAddRatio} className="btn btn-outline btn-sm" style={{ marginBottom: 2 }}>
                {editIdx !== null ? <><FiEdit2 size={14} /> Ubah</> : <><FiPlus size={14} /> Tambah</>}
              </button>
            </div>

            {/* Tabel rasio */}
            {ratioList.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', maxWidth: 450 }}>
                  <thead>
                    <tr>
                      {['Train', 'Test', 'Aksi'].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border)',
                          fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
                          textAlign: h === 'Aksi' ? 'center' : 'left',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ratioList.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.train}%</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>{r.test}%</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button onClick={() => handleEditRatio(i)} className="btn btn-ghost btn-sm"><FiEdit2 size={14} /></button>
                            <button onClick={() => handleDeleteRatio(i)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tombol Test */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
              <button onClick={handleExperiment} className="btn btn-primary"
                disabled={experimentLoading || !datasetId || ratioList.length === 0}>
                {experimentLoading ? <><FiLoader className="animate-spin" /> Menguji semua rasio...</> : <><FiPlay /> Test Semua Rasio</>}
              </button>
            </div>
          </div>

          {/* Ranking Hasil Eksperimen */}
          {experimentResults?.ranking && (
            <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                <FiAward style={{ marginRight: 6 }} />Ranking Rasio Terbaik
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                Diurutkan berdasarkan F1-Score tertinggi. Klik rasio untuk memilih.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 350, overflowY: 'auto' }}>
                {experimentResults.ranking.map((r, i) => (
                  <div key={i} onClick={() => { dispatch(setSelectedRatio(r.ratio)); setTab('train'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                      padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: `2px solid ${selectedRatio === r.ratio ? 'var(--primary)' : 'var(--border)'}`,
                      background: selectedRatio === r.ratio ? 'var(--primary-light)' : 'var(--bg-card)',
                      transition: 'all var(--transition-fast)',
                    }}>
                    <span style={{ fontSize: '1.5rem', minWidth: 36, textAlign: 'center' }}>{medals[i] || `${i + 1}.`}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.train_pct}:{r.test_pct}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Train: {r.train_count} data · Test: {r.test_count} data
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem', color: i === 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                        F1: {formatPercent((r.f1 || 0) * 100)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Acc: {formatPercent((r.accuracy || 0) * 100)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: 'var(--space-md)', fontWeight: 600 }}>
                ⭐ Klik rasio terbaik, lalu buka tab "Training" untuk memulai training final.
              </p>
            </div>
          )}
        </>
      )}

      {/* ============ TAB: TRAINING (Tahap B) ============ */}
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
                <div style={{ padding: 'var(--space-md)', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>IndoBERT</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Feature Extractor</p>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <p>• Model: indobert-base-p1</p><p>• Output: Embedding 768-dim</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--text-muted)' }}>→</div>
                <div style={{ padding: 'var(--space-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>GAT</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Graph Classifier</p>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <p>• Hidden: {gatHidden}-dim × {gatHeads} heads</p><p>• Output: 2 kelas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Config Form */}
          {!isRunning && !isCompleted && (
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Konfigurasi Training Final</h3>

              {/* Selected ratio display */}
              {selectedRatio ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                  <FiCheck size={18} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--primary)' }}>Rasio terpilih: {formatRatio(selectedRatio)}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dari hasil eksperimen. Ubah di tab "Eksperimen Rasio".</p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-md)', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--warning)' }}>
                  ⚠️ Belum ada rasio terpilih. Jalankan eksperimen di tab "Eksperimen Rasio" terlebih dahulu.
                </div>
              )}

              {/* Model Name */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="label">Nama Model</label>
                <input className="input" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Contoh: GAT_v1_hoaks_politik" />
              </div>

              {/* Epoch + LR */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                  <label className="label">Epoch</label>
                  <input className="input" type="number" min="5" max="200" value={epochs} onChange={e => setEpochs(e.target.value)} />
                </div>
                <div>
                  <label className="label">Learning Rate</label>
                  <input className="input" type="number" step="0.0001" value={lr} onChange={e => setLr(e.target.value)} />
                </div>
              </div>

              {/* GAT Parameters */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Parameter GAT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div><label className="label">Attention Heads</label><input className="input" type="number" min="1" max="16" value={gatHeads} onChange={e => setGatHeads(e.target.value)} /></div>
                <div><label className="label">Hidden Dimension</label><input className="input" type="number" min="32" max="512" value={gatHidden} onChange={e => setGatHidden(e.target.value)} /></div>
                <div><label className="label">Dropout</label><input className="input" type="number" step="0.05" min="0" max="0.9" value={gatDropout} onChange={e => setGatDropout(e.target.value)} /></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleStartTraining} className="btn btn-primary btn-lg" disabled={loading || !datasetId || !selectedRatio}>
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
                    ★ Rasio {formatRatio(status.best_ratio)} — F1: {formatPercent(status.best_f1 * 100)} (Epoch {status.best_epoch})
                  </p>
                </div>
              )}
              {isCompleted && (
                <button onClick={() => { dispatch(clearTrainingState()); }} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-md)' }}>
                  <FiRefreshCw size={14} /> Training Baru
                </button>
              )}
            </div>
          )}

          {/* Results Table */}
          {results?.results?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Hasil Training per Epoch</h3>
              </div>
              <Table columns={[
                { key: 'epoch', label: 'Epoch', align: 'center' },
                { key: 'split_ratio', label: 'Rasio', render: v => formatRatio(v) },
                { key: 'accuracy', label: 'Accuracy', align: 'center', render: v => formatPercent((v||0) * 100) },
                { key: 'precision', label: 'Precision', align: 'center', render: v => formatPercent((v||0) * 100) },
                { key: 'recall', label: 'Recall', align: 'center', render: v => formatPercent((v||0) * 100) },
                { key: 'f1_score', label: 'F1-Score', align: 'center', render: (v, row) => (
                  <span style={{ fontWeight: row.is_best ? 700 : 400, color: row.is_best ? 'var(--success)' : 'inherit' }}>
                    {formatPercent((v||0) * 100)} {row.is_best && '★'}
                  </span>
                )},
              ]} data={results.results} />
            </div>
          )}
        </>
      )}

      {/* ============ TAB: RIWAYAT ============ */}
      {tab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Riwayat Training</h3>
          </div>
          {sessions.length === 0 ? <EmptyState title="Belum ada riwayat" /> :
            <Table columns={[
              { key: 'started_at', label: 'Tanggal', render: v => formatDate(v) },
              { key: 'model_name', label: 'Nama Model', render: v => v || '-' },
              { key: 'accuracy', label: 'Accuracy', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'precision', label: 'Precision', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'recall', label: 'Recall', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'f1_score', label: 'F1-Score', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'status', label: 'Status', align: 'center', render: v => <span className={`badge badge-${v}`}>{v}</span> },
            ]} data={sessions} />}
        </div>
      )}

      {/* ============ TAB: MODELS ============ */}
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
    </div>
  );
}
