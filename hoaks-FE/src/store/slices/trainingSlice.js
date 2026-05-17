// ============================================
// store/slices/trainingSlice.js
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// IndoBERT Fine-tuning
export const startIndoBERTFinetune = createAsyncThunk(
  'training/indoBERT',
  async (config, { rejectWithValue }) => {
    try {
      const res = await api.post('/training/indobert', config);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Fine-tuning gagal');
    }
  }
);

export const fetchIndoBERTStatus = createAsyncThunk(
  'training/indoBERTStatus',
  async (sessionId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/training/indobert/status/${sessionId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat status');
    }
  }
);

// TAHAP A: Eksperimen rasio
export const experimentRatios = createAsyncThunk(
  'training/experiment',
  async ({ dataset_id, ratios, gat_params }, { rejectWithValue }) => {
    try {
      const res = await api.post('/training/experiment', { dataset_id, ratios, gat_params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Eksperimen gagal');
    }
  }
);

// TAHAP B: Training final
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
    // IndoBERT
    indoBERTStatus: null,
    indoBERTLoading: false,
    // Tahap A: Eksperimen rasio
    experimentResults: null,
    experimentLoading: false,
    selectedRatio: null,
    // Tahap B: Training final
    activeSessionId: null,
    status: null,
    results: null,
    // Riwayat & model
    sessions: [],
    models: [],
    loading: false,
    error: null,
  },
  reducers: {
    setActiveSession(state, action) {
      state.activeSessionId = action.payload;
    },
    setSelectedRatio(state, action) {
      state.selectedRatio = action.payload;
    },
    clearExperiment(state) {
      state.experimentResults = null;
      state.selectedRatio = null;
    },
    clearTrainingState(state) {
      state.status = null;
      state.results = null;
      state.activeSessionId = null;
    },
    clearIndoBERTState(state) {
      state.indoBERTStatus = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Eksperimen rasio
      .addCase(experimentRatios.pending, (state) => {
        state.experimentLoading = true;
        state.error = null;
        state.experimentResults = null;
      })
      .addCase(experimentRatios.fulfilled, (state, action) => {
        state.experimentLoading = false;
        state.experimentResults = action.payload;
        // Auto-select rasio terbaik
        if (action.payload.ranking?.length > 0) {
          state.selectedRatio = action.payload.ranking[0].ratio;
        }
      })
      .addCase(experimentRatios.rejected, (state, action) => {
        state.experimentLoading = false;
        state.error = action.payload;
      })
      // Training
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
      })
      // IndoBERT
      .addCase(startIndoBERTFinetune.pending, (state) => { state.indoBERTLoading = true; state.error = null; })
      .addCase(startIndoBERTFinetune.fulfilled, (state, action) => {
        state.indoBERTLoading = false;
        state.indoBERTStatus = action.payload;
      })
      .addCase(startIndoBERTFinetune.rejected, (state, action) => {
        state.indoBERTLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchIndoBERTStatus.fulfilled, (state, action) => {
        state.indoBERTStatus = action.payload;
      });
  },
});

export const {
  setActiveSession, setSelectedRatio, clearExperiment,
  clearTrainingState, clearIndoBERTState, clearError,
} = trainingSlice.actions;
export default trainingSlice.reducer;
