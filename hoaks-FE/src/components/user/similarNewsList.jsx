import { FiBookOpen } from 'react-icons/fi';
import { truncateText } from '../../utils/formatters';

export default function SimilarNewsList({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="card animate-slide-up" style={{ animationDelay: '0.15s' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FiBookOpen size={18} /> Berita Serupa dari Dataset
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: 'var(--space-md)', background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${item.label === 'HOAKS' ? 'var(--danger)' : 'var(--success)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className={`badge ${item.label === 'HOAKS' ? 'badge-hoaks' : 'badge-valid'}`}>
                #{item.rank} — {item.label}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Kemiripan: {item.similarity}%
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {truncateText(item.text, 200)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
