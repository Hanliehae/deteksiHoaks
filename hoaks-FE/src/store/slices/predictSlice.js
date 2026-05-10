// ============================================
// store/slices/predictSlice.js
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const predictHoax = createAsyncThunk(
  'predict/detect',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/predict', payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Deteksi gagal');
    }
  }
);

export const scrapeUrl = createAsyncThunk(
  'predict/scrape',
  async (url, { rejectWithValue }) => {
    try {
      const res = await api.post('/scrape', { url });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal mengekstrak URL');
    }
  }
);

const predictSlice = createSlice({
  name: 'predict',
  initialState: {
    result: null,
    scraped: null,
    loading: false,
    scraping: false,
    error: null,
  },
  reducers: {
    clearResult(state) {
      state.result = null;
      state.error = null;
    },
    clearScraped(state) {
      state.scraped = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(predictHoax.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.result = null;
      })
      .addCase(predictHoax.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(predictHoax.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(scrapeUrl.pending, (state) => {
        state.scraping = true;
      })
      .addCase(scrapeUrl.fulfilled, (state, action) => {
        state.scraping = false;
        state.scraped = action.payload;
      })
      .addCase(scrapeUrl.rejected, (state, action) => {
        state.scraping = false;
        state.error = action.payload;
      });
  },
});

export const { clearResult, clearScraped } = predictSlice.actions;
export default predictSlice.reducer;
