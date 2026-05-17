// ============================================
// utils/constants.js — Application Constants
// ============================================

export const APP_NAME = 'HoaxPoliticsID';
export const APP_DESCRIPTION = 'Sistem Deteksi Hoaks Politik Berbasis IndoBERT dan GAT';

export const LABELS = {
  HOAKS: 'HOAKS',
  VALID: 'VALID',
};

export const INPUT_TYPES = {
  URL: 'url',
  HEADLINE: 'headline',
  FULL: 'full',
};

export const TRAINING_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const DEFAULT_SPLIT_RATIOS = [0.7, 0.8, 0.9];
export const DEFAULT_EPOCHS = [10, 20, 30];
export const DEFAULT_LEARNING_RATE = 0.001;
export const DEFAULT_GAT_PARAMS = {
  heads: 4,
  hidden_dim: 128,
  dropout: 0.3,
};

export const POLLING_INTERVAL = 3000; // 3 detik

export const NAV_USER = [
  { path: '/', label: 'Deteksi', icon: 'search' },
  { path: '/history', label: 'Riwayat', icon: 'history' },
];

export const NAV_ADMIN = [
  { path: '/admin', label: 'Beranda', icon: 'dashboard' },
  { path: '/admin/datasets', label: 'Data Collection', icon: 'data' },
  { path: '/admin/preprocessing', label: 'Pre-Processing', icon: 'preprocessing' },
  { path: '/admin/indobert', label: 'IndoBERT', icon: 'indobert' },
  { path: '/admin/gat', label: 'GAT', icon: 'gat' },
  { path: '/admin/testing', label: 'Testing', icon: 'testing' },
  { path: '/admin/evaluation', label: 'Evaluasi', icon: 'evaluation' },
];

export const DEFAULT_INDOBERT_PARAMS = {
  unfreeze_layers: [8, 9, 10, 11],
  max_length: 256,
  batch_size: 16,
  learning_rate: 2e-5,
  epochs: 3,
  weight_decay: 0.01,
  warmup_ratio: 0.1,
};
