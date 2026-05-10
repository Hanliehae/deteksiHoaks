// ============================================
// components/user/InputForm.jsx — Form Input Deteksi
// ============================================

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { predictHoax, scrapeUrl, clearResult, clearScraped } from '../../store/slices/predictSlice';
import { FiLink, FiFileText, FiSearch, FiLoader, FiX } from 'react-icons/fi';

export default function InputForm() {
  const dispatch = useDispatch();
  const { loading, scraping, scraped } = useSelector(s => s.predict);
  const [mode, setMode] = useState('text');
  const [url, setUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [content, setContent] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) return;
    const result = await dispatch(scrapeUrl(url)).unwrap();
    if (result) {
      setHeadline(result.headline || '');
      setContent(result.content || '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearResult());
    if (mode === 'url' && url.trim()) {
      dispatch(predictHoax({ url }));
    } else if (content.trim() || headline.trim()) {
      dispatch(predictHoax({ headline, content }));
    }
  };

  const handleClear = () => {
    setUrl(''); setHeadline(''); setContent('');
    dispatch(clearResult());
    dispatch(clearScraped());
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        {[{ key: 'text', icon: FiFileText, label: 'Teks' }, { key: 'url', icon: FiLink, label: 'URL' }].map(t => (
          <button key={t.key} type="button" onClick={() => setMode(t.key)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600,
            background: mode === t.key ? 'var(--primary)' : 'transparent',
            color: mode === t.key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* URL input */}
      {mode === 'url' && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label className="label">URL Berita</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input className="input" placeholder="https://www.detik.com/berita/..." value={url}
              onChange={e => setUrl(e.target.value)} />
            <button type="button" onClick={handleScrape} className="btn btn-outline" disabled={scraping || !url.trim()}>
              {scraping ? <FiLoader className="animate-spin" size={16} /> : 'Ekstrak'}
            </button>
          </div>
        </div>
      )}

      {/* Text inputs */}
      {(mode === 'text' || scraped) && (
        <>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label className="label">Judul Berita (opsional)</label>
            <input className="input" placeholder="Masukkan judul berita..." value={headline}
              onChange={e => setHeadline(e.target.value)} />
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label className="label">Isi Berita</label>
            <textarea className="textarea" placeholder="Paste atau ketik isi berita di sini..." value={content}
              onChange={e => setContent(e.target.value)} rows={6} />
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
        {(url || headline || content) && (
          <button type="button" onClick={handleClear} className="btn btn-ghost">
            <FiX size={16} /> Bersihkan
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || (!content.trim() && !headline.trim() && !url.trim())}>
          {loading ? <><FiLoader className="animate-spin" size={18} /> Menganalisis...</> : <><FiSearch size={18} /> Deteksi Sekarang</>}
        </button>
      </div>
    </form>
  );
}
