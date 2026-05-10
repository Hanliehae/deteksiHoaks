// ============================================
// utils/formatters.js — Formatting Utilities
// ============================================

/**
 * Format tanggal ISO ke format Indonesia.
 * @param {string} isoDate - ISO date string
 * @returns {string} "7 Mei 2026, 20:30"
 */
export function formatDate(isoDate) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format tanggal singkat.
 * @param {string} isoDate
 * @returns {string} "7 Mei 2026"
 */
export function formatDateShort(isoDate) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format angka persentase.
 * @param {number} value - Angka (0-100)
 * @param {number} decimals - Jumlah desimal
 * @returns {string} "98.52%"
 */
export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return '-';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format angka desimal.
 * @param {number} value
 * @param {number} decimals
 * @returns {string} "0.9852"
 */
export function formatDecimal(value, decimals = 4) {
  if (value == null || isNaN(value)) return '-';
  return Number(value).toFixed(decimals);
}

/**
 * Truncate teks panjang.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format split ratio untuk display.
 * @param {number} ratio - 0.7
 * @returns {string} "70:30"
 */
export function formatRatio(ratio) {
  if (!ratio) return '-';
  const train = Math.round(ratio * 100);
  const test = 100 - train;
  return `${train}:${test}`;
}

/**
 * Format label ke warna badge class.
 * @param {string} label - "HOAKS" atau "VALID"
 * @returns {string} CSS class name
 */
export function getLabelClass(label) {
  if (!label) return '';
  return label.toUpperCase() === 'HOAKS' ? 'badge-hoaks' : 'badge-valid';
}

/**
 * Format status training ke badge class.
 * @param {string} status
 * @returns {string} CSS class name
 */
export function getStatusClass(status) {
  const map = {
    pending: 'badge-pending',
    running: 'badge-running',
    completed: 'badge-completed',
    failed: 'badge-failed',
  };
  return map[status] || '';
}
