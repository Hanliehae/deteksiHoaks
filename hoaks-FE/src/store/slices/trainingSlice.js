// ============================================
// store/slices/trainingSlice.js
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const startTraining = createAsyncThunk(
  'training/start',
  async (config, { rejectWithValue }) => {
    try {
      const res = await api.post('/training/start', config);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memulai training');
    }
  }
);

export const fetchTrainingStatus = createAsyncThunk(
  'training/fetchStatus',
  async (sessionId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/training/status/${sessionId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat status');
    }
  }
);

export const fetchTrainingResults = createAsyncThunk(
  'training/fetchResults',
  async (sessionId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/training/results/${sessionId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat hasil');
    }
  }
);

export const fetchTrainingHistory = createAsyncThunk(
  'training/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/training/history');
      return res.data.sessions;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat riwayat');
    }
  }
);

export const fetchTrainedModels = createAsyncThunk(
  'training/fetchModels',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/training/models');
      return res.data.models;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat model');
    }
  }
);

export const activateModel = createAsyncThunk(
  'training/activateModel',
  async (modelId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/training/models/${modelId}/activate`);
      return { modelId, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal mengaktifkan model');
    }
  }
);

const trainingSlice = createSlice({
  name: 'training',
  initialState: {
    activeSessionId: null,
    status: null,
    results: null,
    sessions: [],
    models: [],
    loading: false,
    error: null,
  },
  reducers: {
    setActiveSession(state, action) {
      state.activeSessionId = action.payload;
    },
    clearTrainingState(state) {
      state.status = null;
      state.results = null;
      state.activeSessionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTraining.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(startTraining.fulfilled, (state, action) => {
        state.loading = false;
        state.activeSessionId = action.payload.session_id;
      })
      .addCase(startTraining.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTrainingStatus.fulfilled, (state, action) => {
        state.status = action.payload;
      })
      .addCase(fetchTrainingResults.fulfilled, (state, action) => {
        state.results = action.payload;
      })
      .addCase(fetchTrainingHistory.fulfilled, (state, action) => {
        state.sessions = action.payload;
      })
      .addCase(fetchTrainedModels.fulfilled, (state, action) => {
        state.models = action.payload;
      })
      .addCase(activateModel.fulfilled, (state, action) => {
        state.models = state.models.map(m => ({
          ...m,
          is_active: m.id === action.payload.modelId,
        }));
      });
  },
});

export const { setActiveSession, clearTrainingState } = trainingSlice.actions;
export default trainingSlice.reducer;
