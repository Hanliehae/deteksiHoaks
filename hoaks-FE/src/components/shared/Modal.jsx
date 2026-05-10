import { FiX } from 'react-icons/fi';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 500 }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-overlay)', padding: 'var(--space-lg)',
    }}>
      <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth, maxHeight: '85vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <FiX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
