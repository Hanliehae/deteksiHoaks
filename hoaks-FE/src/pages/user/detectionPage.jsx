// ============================================
// pages/user/DetectionPage.jsx — Halaman Deteksi Hoaks
// ============================================

import { useSelector } from 'react-redux';
import InputForm from '../../components/user/InputForm';
import ResultCard from '../../components/user/ResultCard';
import SimilarNewsList from '../../components/user/SimilarNewsList';
import { FiShield, FiAlertCircle } from 'react-icons/fi';

export default function DetectionPage() {
  const { result, error } = useSelector(s => s.predict);

  return (
    <div className="page">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, var(--primary), #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-md)', boxShadow: '0 8px 30px rgba(59,130,246,0.3)',
          }}>
            <FiShield size={30} color="white" />
          </div>
          <h1 className="page-title" style={{ textAlign: 'center' }}>Deteksi Berita Hoaks</h1>
          <p className="page-subtitle" style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
            Analisis berita politik menggunakan model hybrid IndoBERT + Graph Attention Network
          </p>
        </div>

        {/* Input Form */}
        <InputForm />

        {/* Error */}
        {error && (
          <div className="card animate-fade-in" style={{
            borderColor: 'var(--danger)', background: 'var(--danger-light)',
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-md)',
          }}>
            <FiAlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <ResultCard result={result} />
            <SimilarNewsList items={result.similar_news} />
          </div>
        )}
      </div>
    </div>
  );
}
