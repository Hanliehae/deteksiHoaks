export default function LoadingSpinner({ size = 24, text = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
      <div className="animate-spin" style={{
        width: size, height: size, border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)', borderRadius: '50%',
      }} />
      {text && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{text}</p>}
    </div>
  );
}
