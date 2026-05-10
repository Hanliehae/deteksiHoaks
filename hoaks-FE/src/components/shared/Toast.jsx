import { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from 'react-icons/fi';

const icons = { success: FiCheckCircle, error: FiXCircle, info: FiInfo };
const colors = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--primary)' };

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(true);
  const Icon = icons[type] || FiInfo;

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px', background: 'var(--bg-card)',
      border: `1px solid ${colors[type]}40`, borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)', minWidth: 280,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.3s ease',
    }}>
      <Icon size={18} style={{ color: colors[type], flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
        <FiX size={14} />
      </button>
    </div>
  );
}
