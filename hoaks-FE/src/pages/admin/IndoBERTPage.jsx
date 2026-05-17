import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDatasets } from '../../store/slices/adminSlice';
import {
  startIndoBERTFinetune, fetchIndoBERTStatus, clearIndoBERTState,
} from '../../store/slices/trainingSlice';
import ProgressBar from '../../components/shared/ProgressBar';
import EmptyState from '../../components/shared/EmptyState';
import { formatPercent } from '../../utils/formatters';
import { POLLING_INTERVAL, DEFAULT_INDOBERT_PARAMS } from '../../utils/constants';
import { FiCpu, FiPlay, FiLoader, FiLock, FiUnlock, FiInfo, FiRefreshCw } from 'react-icons/fi';

const BERT_LAYERS = Array.from({ length: 12 }, (_, i) => i);

export default function IndoBERTPage() {
  const dispatch = useDispatch();
  const { datasets } = useSelector(s => s.admin);
  const { indoBERTStatus, indoBERTLoading } = useSelector(s => s.training);

  const [datasetId, setDatasetId] = useState('');
  const [unfreezeLayers, setUnfreezeLayers] = useState([8, 9, 10, 11]);
  const [maxLength, setMaxLength] = useState(DEFAULT_INDOBERT_PARAMS.max_length);
  const [batchSize, setBatchSize] = useState(DEFAULT_INDOBERT_PARAMS.batch_size);
  const [lr, setLr] = useState(DEFAULT_INDOBERT_PARAMS.learning_rate);
  const [epochs, setEpochs] = useState(DEFAULT_INDOBERT_PARAMS.epochs);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { dispatch(fetchDatasets()); }, [dispatch]);

  useEffect(() => {
    if (!indoBERTStatus?.session_id || indoBERTStatus?.status === 'completed' || indoBERTStatus?.status === 'failed') return;
    const iv = setInterval(() => dispatch(fetchIndoBERTStatus(indoBERTStatus.session_id)), POLLING_INTERVAL);
    return () => clearInterval(iv);
  }, [dispatch, indoBERTStatus?.session_id, indoBERTStatus?.status]);

  const toggleLayer = (layer) => {
    setUnfreezeLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer].sort()
    );
  };

  const handleStart = () => {
    if (!datasetId) return;
    dispatch(startIndoBERTFinetune({
      dataset_id: parseInt(datasetId),
      unfreeze_layers: unfreezeLayers,
      max_length: parseInt(maxLength),
      batch_size: parseInt(batchSize),
      learning_rate: parseFloat(lr),
      epochs: parseInt(epochs),
    }));
  };

  const isRunning = indoBERTStatus?.status === 'running';
  const isCompleted = indoBERTStatus?.status === 'completed';
  const isFailed = indoBERTStatus?.status === 'failed';

  // Hitung parameter yang dilatih
  const totalParams = 124645632; // IndoBERT base
  const layerParams = 7087872;  // ~per transformer layer
  const trainableParams = unfreezeLayers.length * layerParams + 590592; // + classifier
  const trainablePct = ((trainableParams / totalParams) * 100).toFixed(1);

  return (
    <div className="page">
      <h1 className="page-title"><FiCpu style={{ marginRight: 8 }} />IndoBERT Training</h1>
      <p className="page-subtitle">Fine-tuning IndoBERT per-layer untuk ekstraksi fitur berita</p>

      {/* ===== ARSITEKTUR LAYER-BY-LAYER ===== */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Arsitektur IndoBERT (indobert-base-p1)</h3>
          <button onClick={() => setShowDetail(!showDetail)} className="btn btn-ghost btn-sm">
            <FiInfo size={14} /> {showDetail ? 'Ringkas' : 'Detail'}
          </button>
        </div>

        {/* Model info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 'var(--space-md)' }}>
          {[
            { label: 'Total Parameter', value: '124.6M' },
            { label: 'Dilatih', value: `${(trainableParams / 1e6).toFixed(1)}M (${trainablePct}%)` },
            { label: 'Difreeze', value: `${((totalParams - trainableParams) / 1e6).toFixed(1)}M` },
            { label: 'Hidden Size', value: '768' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700 }}>{s.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Layer Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Embedding Layer (always frozen) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', opacity: 0.7,
          }}>
            <FiLock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Embedding Layer</p>
              {showDetail && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Token Embedding (30522→768) + Position Embedding (512→768) + LayerNorm
                </p>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🔒 Freeze</span>
          </div>

          {/* 12 Transformer Layers */}
          {BERT_LAYERS.map(i => {
            const isFrozen = !unfreezeLayers.includes(i);
            return (
              <div key={i} onClick={() => toggleLayer(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all var(--transition-fast)',
                border: `1px solid ${isFrozen ? 'var(--border)' : 'var(--primary)'}`,
                background: isFrozen ? 'var(--bg-input)' : 'var(--primary-light)',
                opacity: isFrozen ? 0.6 : 1,
              }}>
                {isFrozen
                  ? <FiLock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  : <FiUnlock size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Transformer Layer {i + 1}</p>
                  {showDetail && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Self-Attention (768, 12 heads) → FFN (768→3072→768) → LayerNorm + Dropout
                    </p>
                  )}
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: isFrozen ? 'var(--bg-card)' : 'var(--primary)',
                  color: isFrozen ? 'var(--text-muted)' : 'white',
                }}>
                  {isFrozen ? '🔒 Freeze' : '🔓 Unfreeze'}
                </span>
              </div>
            );
          })}

          {/* Pooler Layer (always trained) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--success-light)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--success)',
          }}>
            <FiUnlock size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--success)' }}>Pooler + Classifier</p>
              {showDetail && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Linear (768→768) + Tanh → Linear (768→2) — Output: CLS Embedding (768-dim)
                </p>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>🔓 Selalu dilatih</span>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          Klik layer untuk toggle freeze/unfreeze. Layer yang di-unfreeze akan dilatih ulang.
        </p>
      </div>

      {/* ===== KONFIGURASI FINE-TUNING ===== */}
      {!isRunning && !isCompleted && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Konfigurasi Fine-tuning</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="label">Dataset</label>
              <select className="input" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
                <option value="">Pilih dataset...</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.filename} ({d.total_rows})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Epoch</label>
              <input className="input" type="number" min="1" max="10" value={epochs} onChange={e => setEpochs(e.target.value)} />
            </div>
            <div>
              <label className="label">Learning Rate</label>
              <input className="input" type="number" step="0.00001" value={lr} onChange={e => setLr(e.target.value)} />
            </div>
            <div>
              <label className="label">Max Length</label>
              <input className="input" type="number" min="64" max="512" value={maxLength} onChange={e => setMaxLength(e.target.value)} />
            </div>
            <div>
              <label className="label">Batch Size</label>
              <input className="input" type="number" min="4" max="64" value={batchSize} onChange={e => setBatchSize(e.target.value)} />
            </div>
          </div>

          {/* Info box */}
          <div style={{ padding: 'var(--space-md)', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.8rem', color: 'var(--warning)' }}>
            ⚠️ Fine-tuning IndoBERT di CPU sangat lambat (~30 menit per epoch untuk 1000 data). Untuk dataset besar, gunakan Google Colab dengan GPU.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleStart} className="btn btn-primary btn-lg" disabled={indoBERTLoading || !datasetId}>
              {indoBERTLoading ? <><FiLoader className="animate-spin" /> Memulai...</> : <><FiPlay /> Mulai Fine-tuning</>}
            </button>
          </div>
        </div>
      )}

      {/* ===== PROGRESS ===== */}
      {indoBERTStatus && (isRunning || isCompleted || isFailed) && (
        <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            {isRunning ? 'Fine-tuning Berjalan...' : isCompleted ? 'Fine-tuning Selesai!' : 'Fine-tuning Gagal'}
          </h3>
          <ProgressBar value={indoBERTStatus.progress || 0} color={isCompleted ? 'var(--success)' : isFailed ? 'var(--danger)' : 'var(--primary)'} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>{indoBERTStatus.current_step}</p>

          {/* Epoch Results */}
          {indoBERTStatus.epoch_results?.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    {['Epoch', 'Train Loss', 'Val Accuracy', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {indoBERTStatus.epoch_results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: 600 }}>{r.epoch}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace' }}>{r.loss?.toFixed(4)}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace', color: 'var(--success)', fontWeight: 600 }}>
                        {formatPercent((r.val_accuracy || 0) * 100)}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        {r.is_best ? <span style={{ color: 'var(--success)' }}>★ Terbaik</span> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isCompleted && indoBERTStatus.best_val_accuracy && (
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>
                ★ Best Validation Accuracy: {formatPercent(indoBERTStatus.best_val_accuracy * 100)}
              </p>
            </div>
          )}

          {(isCompleted || isFailed) && (
            <button onClick={() => dispatch(clearIndoBERTState())} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-md)' }}>
              <FiRefreshCw size={14} /> Fine-tuning Baru
            </button>
          )}
        </div>
      )}

      {/* Pipeline Info */}
      <div className="card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Alur Pipeline IndoBERT</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1', label: 'Load Dataset', desc: 'Muat dataset yang sudah diupload', color: 'var(--primary)' },
            { step: '2', label: 'Tokenisasi', desc: 'Konversi teks → token dengan AutoTokenizer', color: 'var(--info)' },
            { step: '3', label: 'Fine-tune', desc: 'Latih layer yang di-unfreeze dengan data training', color: 'var(--warning)' },
            { step: '4', label: 'Validasi', desc: 'Monitor akurasi per epoch di validation set', color: 'var(--success)' },
            { step: '5', label: 'Simpan Model', desc: 'Simpan model terbaik (best val accuracy)', color: 'var(--danger)' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{s.step}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.label}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
