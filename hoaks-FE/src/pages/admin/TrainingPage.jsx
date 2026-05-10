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
import { POLLING_INTERVAL } from '../../utils/constants';
import { FiCpu, FiPlay, FiCheck, FiLoader, FiRefreshCw } from 'react-icons/fi';

export default function TrainingPage() {
  const dispatch = useDispatch();
  const { activeSessionId, status, results, sessions, models, loading } = useSelector(s => s.training);
  const { datasets } = useSelector(s => s.admin);
  const [datasetId, setDatasetId] = useState('');
  const [splitRatios, setSplitRatios] = useState('0.7, 0.8, 0.9');
  const [epochs, setEpochs] = useState('10, 20, 30');
  const [lr, setLr] = useState(0.001);
  const [tab, setTab] = useState('train');

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
      <h1 className="page-title"><FiCpu style={{ marginRight: 8 }} />Training Model</h1>
      <p className="page-subtitle">Re-train GAT dengan dataset dan parameter custom</p>

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
          {!isRunning && !isCompleted && (
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Konfigurasi</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">Dataset</label>
                  <select className="input" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
                    <option value="">Pilih dataset...</option>
                    {datasets.map(d => <option key={d.id} value={d.id}>{d.filename} ({d.total_rows})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Split Ratios</label>
                  <input className="input" value={splitRatios} onChange={e => setSplitRatios(e.target.value)} />
                </div>
                <div>
                  <label className="label">Epochs</label>
                  <input className="input" value={epochs} onChange={e => setEpochs(e.target.value)} />
                </div>
                <div>
                  <label className="label">Learning Rate</label>
                  <input className="input" type="number" step="0.0001" value={lr} onChange={e => setLr(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleStart} className="btn btn-primary btn-lg" disabled={loading || !datasetId}>
                  {loading ? <><FiLoader className="animate-spin" /> Memulai...</> : <><FiPlay /> Mulai Training</>}
                </button>
              </div>
            </div>
          )}

          {status && (isRunning || isCompleted) && (
            <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                {isRunning ? 'Training Berjalan...' : 'Selesai!'}
              </h3>
              <ProgressBar value={status.progress} color={isCompleted ? 'var(--success)' : 'var(--primary)'} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>{status.current_step}</p>
              {isCompleted && status.best_f1 && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600 }}>
                    Best F1: {formatPercent(status.best_f1 * 100)} (Rasio {formatRatio(status.best_ratio)}, Epoch {status.best_epoch})
                  </p>
                </div>
              )}
            </div>
          )}

          {results?.results?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Hasil Training</h3>
              </div>
              <Table columns={[
                { key: 'split_ratio', label: 'Rasio', render: v => formatRatio(v) },
                { key: 'epoch', label: 'Epoch', align: 'center' },
                { key: 'accuracy', label: 'Acc', align: 'center', render: v => formatPercent(v * 100) },
                { key: 'f1_score', label: 'F1', align: 'center', render: (v, row) => (
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
          {models.length === 0 ? <EmptyState title="Belum ada model" /> :
            <Table columns={[
              { key: 'model_name', label: 'Model' },
              { key: 'f1_score', label: 'F1', align: 'center', render: v => formatPercent((v||0) * 100) },
              { key: 'is_active', label: 'Status', align: 'center', render: v => <span className={`badge ${v ? 'badge-completed' : 'badge-pending'}`}>{v ? 'AKTIF' : '-'}</span> },
              { key: 'id', label: '', render: (_, row) => !row.is_active && (
                <button onClick={() => dispatch(activateModel(row.id))} className="btn btn-outline btn-sm"><FiCheck size={14} /> Aktifkan</button>
              )},
            ]} data={models} />}
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {sessions.length === 0 ? <EmptyState title="Belum ada riwayat" /> :
            <Table columns={[
              { key: 'id', label: 'ID', align: 'center' },
              { key: 'status', label: 'Status', render: v => <span className={`badge badge-${v}`}>{v}</span> },
              { key: 'best_f1', label: 'F1', align: 'center', render: v => v ? formatPercent(v * 100) : '-' },
              { key: 'started_at', label: 'Waktu', render: v => formatDate(v) },
            ]} data={sessions} />}
        </div>
      )}
    </div>
  );
}
