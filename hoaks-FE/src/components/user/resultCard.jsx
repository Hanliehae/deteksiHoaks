import { FiAlertTriangle, FiCheckCircle, FiPercent } from 'react-icons/fi';
import ConfidenceBar from './ConfidenceBar';

export default function ResultCard({ result }) {
  if (!result) return null;

  const isHoax = result.label === 'HOAKS';
  const color = isHoax ? 'var(--danger)' : 'var(--success)';
  const Icon = isHoax ? FiAlertTriangle : FiCheckCircle;

  return (
    <div className="card animate-slide-up" style={{ borderColor: `${color}40`, borderWidth: 2 }}>
      {/* Label besar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--space-md)' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-lg)',
          background: `${color}15`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, flexShrink: 0,
        }}>
          <Icon size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color, letterSpacing: '-0.3px' }}>
            {result.label}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Tingkat keyakinan: <strong style={{ color }}>{result.confidence}%</strong>
          </p>
        </div>
      </div>

      {/* Confidence Bar */}
      <ConfidenceBar hoaxScore={result.hoax_score} validScore={result.valid_score} />

      {/* Preprocessed text */}
      {result.preprocessed_text && (
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <p className="label">Teks Setelah Preprocessing</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {result.preprocessed_text}
          </p>
        </div>
      )}
    </div>
  );
}
