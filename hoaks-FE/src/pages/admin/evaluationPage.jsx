import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMetrics } from '../../store/slices/adminSlice';
import EmptyState from '../../components/shared/EmptyState';
import { FiBarChart2, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { formatPercent } from '../../utils/formatters';

export default function EvaluationPage() {
  const dispatch = useDispatch();
  const { metrics } = useSelector(s => s.admin);

  useEffect(() => { dispatch(fetchMetrics()); }, [dispatch]);

  // Ambil comparison dan is_overfit dari response baru
  const comparison = metrics?.comparison || [];
  const isOverfit = metrics?.is_overfit || false;
  const rawMetrics = metrics?.metrics || metrics;

  // Confusion matrix
  const cm = rawMetrics?.confusion_matrix;

  // 4 card metrik utama
  const baseMetrics = rawMetrics ? [
    { label: 'Accuracy', value: rawMetrics.accuracy, color: 'var(--primary)' },
    { label: 'Precision', value: rawMetrics.precision, color: 'var(--info)' },
    { label: 'Recall', value: rawMetrics.recall, color: 'var(--warning)' },
    { label: 'F1-Score', value: rawMetrics.f1_score, color: 'var(--success)' },
  ] : [];

  if (!metrics) {
    return (
      <div className="page">
        <h1 className="page-title"><FiBarChart2 style={{ marginRight: 8 }} />Evaluasi Performa Model</h1>
        <div className="card"><EmptyState title="Metrics belum tersedia" message="Copy metrics.json ke folder artifacts/ atau lakukan training" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title"><FiBarChart2 style={{ marginRight: 8 }} />Evaluasi Performa Model</h1>
      <p className="page-subtitle">Analisis metrik performa dan deteksi overfitting</p>

      {/* 4 Main Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {baseMetrics.map(m => (
          <div key={m.label} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{m.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: m.color }}>{formatPercent((m.value || 0) * 100)}</p>
            <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', marginTop: 12 }}>
              <div style={{ width: `${(m.value || 0) * 100}%`, height: '100%', background: m.color, borderRadius: 'var(--radius-full)', transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ===== TABEL 4 KOLOM: Training vs Testing vs Selisih ===== */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Perbandingan Training vs Testing</h3>

        {comparison.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Data perbandingan belum tersedia. Pastikan metrics.json memiliki <code>train_metrics</code> dan <code>test_metrics</code>.
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Metrik', 'Training', 'Testing', 'Selisih'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', borderBottom: '2px solid var(--border)',
                        fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)',
                        textAlign: h === 'Metrik' ? 'left' : 'center',
                        background: 'var(--bg-input)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(r => {
                    const isMccOrAuc = r.key === 'mcc' || r.key === 'roc_auc';
                    const formatVal = (v) => {
                      if (v == null) return '-';
                      return isMccOrAuc ? v.toFixed(4) : formatPercent(v * 100);
                    };
                    const formatGap = (g) => {
                      if (g == null) return '-';
                      return isMccOrAuc ? g.toFixed(4) : formatPercent(g * 100);
                    };
                    return (
                      <tr key={r.key} style={{ background: r.is_overfit ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.label}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace' }}>
                          {formatVal(r.train)}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace' }}>
                          {formatVal(r.test)}
                        </td>
                        <td style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center',
                          color: r.is_overfit ? 'var(--danger)' : 'var(--success)', fontWeight: 700, fontFamily: 'monospace',
                        }}>
                          {formatGap(r.gap)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overfitting Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 'var(--space-lg)',
              padding: 'var(--space-md) var(--space-lg)',
              background: isOverfit ? 'var(--danger-light)' : 'var(--success-light)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isOverfit ? 'var(--danger)' : 'var(--success)'}`,
            }}>
              {isOverfit
                ? <FiAlertTriangle size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                : <FiCheckCircle size={22} style={{ color: 'var(--success)', flexShrink: 0 }} />
              }
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: isOverfit ? 'var(--danger)' : 'var(--success)' }}>
                  {isOverfit ? '⚠️ OVERFIT DETECTED' : '✅ TIDAK OVERFIT'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {isOverfit
                    ? 'Selisih > 5% pada satu atau lebih metrik. Pertimbangkan menambah data atau meningkatkan dropout.'
                    : 'Semua selisih Training vs Testing < 5%. Model menggeneralisasi dengan baik.'
                  }
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confusion Matrix */}
      {cm && (
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Confusion Matrix</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 4, maxWidth: 350 }}>
            <div />
            <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8 }}>Pred Valid</div>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8 }}>Pred Hoaks</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8, display: 'flex', alignItems: 'center' }}>Act Valid</div>
            {cm[0]?.map((v, j) => (
              <div key={`0-${j}`} style={{
                textAlign: 'center', padding: 16, fontWeight: 700, fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                background: j === 0 ? 'var(--success-light)' : 'var(--danger-light)',
                color: j === 0 ? 'var(--success)' : 'var(--danger)',
              }}>{v}</div>
            ))}
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8, display: 'flex', alignItems: 'center' }}>Act Hoaks</div>
            {cm[1]?.map((v, j) => (
              <div key={`1-${j}`} style={{
                textAlign: 'center', padding: 16, fontWeight: 700, fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                background: j === 1 ? 'var(--success-light)' : 'var(--danger-light)',
                color: j === 1 ? 'var(--success)' : 'var(--danger)',
              }}>{v}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
