// ============================================
// store/slices/adminSlice.js
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchDashboard = createAsyncThunk(
  'admin/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/admin/dashboard');
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat dashboard');
    }
  }
);

export const fetchDatasets = createAsyncThunk(
  'admin/fetchDatasets',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/admin/datasets');
      return res.data.datasets;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat datasets');
    }
  }
);

export const uploadDataset = createAsyncThunk(
  'admin/uploadDataset',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/admin/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Upload gagal');
    }
  }
);

export const deleteDataset = createAsyncThunk(
  'admin/deleteDataset',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/datasets/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Hapus gagal');
    }
  }
);

export const demoPreprocess = createAsyncThunk(
  'admin/preprocess',
  async (text, { rejectWithValue }) => {
    try {
      const res = await api.post('/admin/preprocess', { text });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Preprocessing gagal');
    }
  }
);

export const fetchMetrics = createAsyncThunk(
  'admin/fetchMetrics',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/evaluation/metrics');
      return res.data;  // {metrics, comparison, is_overfit}
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat metrik');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboard: null,
    datasets: [],
    preprocessResult: null,
    metrics: null,
    loading: false,
    uploading: false,
    error: null,
  },
  reducers: {
    clearPreprocess(state) { state.preprocessResult = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.loading = true; })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.datasets = action.payload;
      })
      .addCase(uploadDataset.pending, (state) => { state.uploading = true; })
      .addCase(uploadDataset.fulfilled, (state, action) => {
        state.uploading = false;
        state.datasets.unshift(action.payload.dataset);
      })
      .addCase(uploadDataset.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })
      .addCase(deleteDataset.fulfilled, (state, action) => {
        state.datasets = state.datasets.filter(d => d.id !== action.payload);
      })
      .addCase(demoPreprocess.fulfilled, (state, action) => {
        state.preprocessResult = action.payload;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      });
  },
});

export const { clearPreprocess, clearError } = adminSlice.actions;
export default adminSlice.reducer;
