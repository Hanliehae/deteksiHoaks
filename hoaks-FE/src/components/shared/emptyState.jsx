import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ title = 'Belum ada data', message = '', icon: Icon = FiInbox }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 60, color: 'var(--text-muted)', textAlign: 'center',
    }}>
      <Icon size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</p>
      {message && <p style={{ fontSize: '0.85rem', marginTop: 6, maxWidth: 300 }}>{message}</p>}
    </div>
  );
}
