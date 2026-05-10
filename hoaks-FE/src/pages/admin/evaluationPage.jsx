import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMetrics } from '../../store/slices/adminSlice';
import { fetchTrainedModels } from '../../store/slices/trainingSlice';
import EmptyState from '../../components/shared/EmptyState';
import { FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import { formatPercent } from '../../utils/formatters';

export default function EvaluationPage() {
  const dispatch = useDispatch();
  const { metrics } = useSelector(s => s.admin);
  const { models } = useSelector(s => s.training);
  const [tab, setTab] = useState('metrics');

  useEffect(() => {
    dispatch(fetchMetrics());
    dispatch(fetchTrainedModels());
  }, [dispatch]);

  // Baseline metrics from metrics.json
  const baseMetrics = metrics ? [
    { label: 'Accuracy', value: metrics.accuracy, color: 'var(--primary)' },
    { label: 'Precision', value: metrics.precision, color: 'var(--info)' },
    { label: 'Recall', value: metrics.recall, color: 'var(--warning)' },
    { label: 'F1-Score', value: metrics.f1_score, color: 'var(--success)' },
  ] : [];

  // Extended metrics
  const extendedMetrics = metrics ? [
    { label: 'MCC', value: metrics.mcc, desc: 'Matthews Correlation Coefficient' },
    { label: 'ROC-AUC', value: metrics.roc_auc, desc: 'Area Under ROC Curve' },
    { label: 'Macro Avg', value: metrics.macro_avg, desc: 'Rata-rata metrik per kelas' },
    { label: 'Weighted Avg', value: metrics.weighted_avg, desc: 'Rata-rata berbobot' },
  ].filter(m => m.value != null) : [];

  // Train vs Test comparison
  const trainMetrics = metrics?.train_metrics;
  const testMetrics = metrics?.test_metrics || metrics;

  const comparisonRows = trainMetrics ? [
    { label: 'Accuracy', train: trainMetrics.accuracy, test: testMetrics?.accuracy },
    { label: 'Precision', train: trainMetrics.precision, test: testMetrics?.precision },
    { label: 'Recall', train: trainMetrics.recall, test: testMetrics?.recall },
    { label: 'F1-Score', train: trainMetrics.f1_score, test: testMetrics?.f1_score },
    { label: 'MCC', train: trainMetrics.mcc, test: testMetrics?.mcc },
  ].filter(r => r.train != null || r.test != null) : [];

  const tabs = [
    { key: 'metrics', label: 'Metrik' },
    { key: 'comparison', label: 'Training vs Testing' },
    { key: 'models', label: 'Model Comparison' },
  ];

  return (
    <div className="page">
      <h1 className="page-title"><FiBarChart2 style={{ marginRight: 8 }} />Evaluasi Performa Model</h1>
      <p className="page-subtitle">Analisis metrik performa dan deteksi overfitting</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 4, maxWidth: 500 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
            fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--primary)' : 'transparent',
            color: tab === t.key ? 'white' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {!metrics && tab !== 'models' ? (
        <div className="card"><EmptyState title="Metrics belum tersedia" message="Copy metrics.json ke folder artifacts/ atau lakukan training" /></div>
      ) : (
        <>
          {/* Metrics Tab */}
          {tab === 'metrics' && metrics && (
            <>
              {/* 4 Main Metrics */}
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

              {/* Extended Metrics */}
              {extendedMetrics.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                  {extendedMetrics.map(m => (
                    <div key={m.label} className="card" style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatPercent((m.value || 0) * 100)}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Confusion Matrix */}
              {metrics.confusion_matrix && (
                <div className="card">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Confusion Matrix</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 4, maxWidth: 350 }}>
                    <div />
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8 }}>Pred Valid</div>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8 }}>Pred Hoaks</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8, display: 'flex', alignItems: 'center' }}>Act Valid</div>
                    {metrics.confusion_matrix[0]?.map((v, j) => (
                      <div key={`0-${j}`} style={{
                        textAlign: 'center', padding: 16, fontWeight: 700, fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                        background: j === 0 ? 'var(--success-light)' : 'var(--danger-light)',
                        color: j === 0 ? 'var(--success)' : 'var(--danger)',
                      }}>{v}</div>
                    ))}
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: 8, display: 'flex', alignItems: 'center' }}>Act Hoaks</div>
                    {metrics.confusion_matrix[1]?.map((v, j) => (
                      <div key={`1-${j}`} style={{
                        textAlign: 'center', padding: 16, fontWeight: 700, fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                        background: j === 1 ? 'var(--success-light)' : 'var(--danger-light)',
                        color: j === 1 ? 'var(--success)' : 'var(--danger)',
                      }}>{v}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Training vs Testing Comparison */}
          {tab === 'comparison' && (
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Perbandingan Training vs Testing</h3>
              {comparisonRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Data perbandingan belum tersedia. Pastikan metrics.json memiliki field <code>train_metrics</code> dan <code>test_metrics</code>.
                </p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Metrik', 'Training', 'Testing', 'Selisih (Gap)', 'Status'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: h === 'Metrik' ? 'left' : 'center' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map(r => {
                          const gap = r.train != null && r.test != null ? Math.abs(r.train - r.test) : null;
                          const isOverfit = gap != null && gap > 0.05;
                          return (
                            <tr key={r.label}>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.label}</td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                {r.train != null ? formatPercent(r.train * 100) : '-'}
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                {r.test != null ? formatPercent(r.test * 100) : '-'}
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', color: isOverfit ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                                {gap != null ? formatPercent(gap * 100) : '-'}
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                {gap != null && (
                                  <span className={`badge ${isOverfit ? 'badge-hoaks' : 'badge-valid'}`}>
                                    {isOverfit ? 'Overfit' : 'OK'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {comparisonRows.some(r => {
                    const gap = r.train != null && r.test != null ? Math.abs(r.train - r.test) : 0;
                    return gap > 0.05;
                  }) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)' }}>
                      <FiAlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                      <p style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>
                        <strong>Peringatan Overfitting:</strong> Selisih &gt;5% antara training dan testing menunjukkan model mungkin overfit. Pertimbangkan menambah data atau meningkatkan dropout.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Model Comparison Tab */}
          {tab === 'models' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Perbandingan Model</h3>
              </div>
              {models.length === 0 ? <EmptyState title="Belum ada model" /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Nama Model', 'Accuracy', 'F1-Score', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: h === 'Nama Model' ? 'left' : 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {models.map(m => (
                        <tr key={m.id} style={{ background: m.is_active ? 'var(--primary-light)' : 'transparent' }}>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{m.model_name}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{formatPercent((m.accuracy || 0) * 100)}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{formatPercent((m.f1_score || 0) * 100)}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                            <span className={`badge ${m.is_active ? 'badge-completed' : 'badge-pending'}`}>{m.is_active ? 'AKTIF' : '-'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
