import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { demoPreprocess, clearPreprocess } from '../../store/slices/adminSlice';
import { FiFilter, FiPlay, FiArrowRight, FiCode, FiLoader } from 'react-icons/fi';
import api from '../../services/api';

export default function PreProcessingPage() {
  const dispatch = useDispatch();
  const { preprocessResult } = useSelector(s => s.admin);
  const [text, setText] = useState('');
  const [tokenResult, setTokenResult] = useState(null);
  const [tokenizing, setTokenizing] = useState(false);

  const handleDemo = () => {
    if (!text.trim()) return;
    dispatch(demoPreprocess(text));
    setTokenResult(null);
  };

  const handleTokenize = async () => {
    if (!preprocessResult?.final) return;
    setTokenizing(true);
    try {
      const res = await api.post('/admin/tokenize', { text: preprocessResult.final });
      setTokenResult(res.data);
    } catch (err) {
      setTokenResult({ error: err.response?.data?.error || 'Tokenisasi gagal' });
    }
    setTokenizing(false);
  };

  const handleClear = () => {
    setText('');
    dispatch(clearPreprocess());
    setTokenResult(null);
  };

  return (
    <div className="page">
      <h1 className="page-title"><FiFilter style={{ marginRight: 8 }} />Pre-Processing</h1>
      <p className="page-subtitle">Demo pipeline preprocessing teks — lihat setiap tahap transformasi</p>

      {/* Input */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <label className="label">Input Teks Mentah</label>
        <textarea className="textarea" rows={4} value={text} onChange={e => setText(e.target.value)}
          placeholder="Contoh: CEK FAKTA: Jokowi @detikcom menyatakan #hoax bahwa http://google.com ini HOAKS!!!" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          {text && <button onClick={handleClear} className="btn btn-ghost">Bersihkan</button>}
          <button onClick={handleDemo} className="btn btn-primary" disabled={!text.trim()}>
            <FiPlay size={16} /> Jalankan Preprocessing
          </button>
        </div>
      </div>

      {/* Results */}
      {preprocessResult && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
            Pipeline Preprocessing (6 Tahap)
          </h3>

          {/* Step-by-step */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {preprocessResult.steps?.map((step) => (
              <div key={step.step} style={{
                padding: 'var(--space-md)', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>{step.step}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{step.name}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>{step.description}</p>
                <p style={{
                  fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px 12px',
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                  fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {step.result || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(kosong)</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Final result */}
          <div style={{
            marginTop: 'var(--space-lg)', padding: 'var(--space-md)',
            background: 'var(--success-light)', borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--success)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FiArrowRight size={16} style={{ color: 'var(--success)' }} />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Hasil Akhir Preprocessing</span>
            </div>
            <p style={{
              fontSize: '0.9rem', color: 'var(--text-primary)', padding: '8px 12px',
              background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace',
            }}>
              {preprocessResult.final || '(kosong)'}
            </p>
          </div>

          {/* Tokenize Button */}
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleTokenize} className="btn btn-outline" disabled={tokenizing || !preprocessResult.final}>
              {tokenizing ? <><FiLoader className="animate-spin" size={14} /> Tokenisasi...</> : <><FiCode size={14} /> Tokenisasi IndoBERT</>}
            </button>
          </div>
        </div>
      )}

      {/* Tokenization Result */}
      {tokenResult && !tokenResult.error && (
        <div className="card animate-slide-up">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCode size={18} /> Tokenisasi IndoBERT
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Model: {tokenResult.model_name} | Vocab: {tokenResult.vocab_size?.toLocaleString()}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div style={{ padding: '8px 16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{tokenResult.total_tokens}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Token</p>
            </div>
          </div>

          {/* Token Display */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tokenResult.tokens?.map((t, i) => (
              <span key={i} style={{
                padding: '4px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                background: t.is_special ? 'var(--warning-light)' : 'var(--bg-input)',
                color: t.is_special ? 'var(--warning)' : 'var(--text-secondary)',
                border: `1px solid ${t.is_special ? 'var(--warning)' : 'var(--border)'}`,
              }}>
                {t.token} <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>[{t.id}]</span>
              </span>
            ))}
          </div>

          {/* Token IDs */}
          <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <p className="label">Token IDs</p>
            <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              [{tokenResult.token_ids?.join(', ')}]
            </p>
          </div>
        </div>
      )}

      {tokenResult?.error && (
        <div className="card" style={{ background: 'var(--danger-light)', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{tokenResult.error}</p>
        </div>
      )}
    </div>
  );
}
