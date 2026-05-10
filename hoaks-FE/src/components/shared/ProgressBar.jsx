export default function ProgressBar({ value = 0, color = 'var(--primary)', height = 8, showLabel = true }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div style={{
        width: '100%', height, background: 'var(--bg-input)',
        borderRadius: 'var(--radius-full)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${clamped}%`, height: '100%', background: color,
          borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease',
        }} />
      </div>
      {showLabel && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
          {clamped.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
