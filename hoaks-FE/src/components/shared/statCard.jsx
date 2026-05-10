export default function StatCard({ icon: Icon, label, value, sub, color = 'var(--primary)' }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-md)',
        background: `${color}20`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color, flexShrink: 0,
      }}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value ?? '-'}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}
