export default function ConfidenceBar({ hoaxScore = 0, validScore = 0 }) {
  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600 }}>
        <span style={{ color: 'var(--success)' }}>VALID {validScore}%</span>
        <span style={{ color: 'var(--danger)' }}>HOAKS {hoaxScore}%</span>
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 'var(--radius-full)', overflow: 'hidden', background: 'var(--bg-input)' }}>
        <div style={{ width: `${validScore}%`, background: 'var(--success)', transition: 'width 0.8s ease' }} />
        <div style={{ width: `${hoaxScore}%`, background: 'var(--danger)', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}
