// ============================================
// store/slices/historySlice.js
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchHistory = createAsyncThunk(
  'history/fetchAll',
  async ({ page = 1, perPage = 10, search = '' }, { rejectWithValue }) => {
    try {
      const res = await api.get('/history', {
        params: { page, per_page: perPage, search },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat riwayat');
    }
  }
);

export const fetchHistoryDetail = createAsyncThunk(
  'history/fetchDetail',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/history/${id}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Gagal memuat detail');
    }
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    detail: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearDetail(state) {
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state) => { state.loading = true; })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchHistoryDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
      });
  },
});

export const { clearDetail } = historySlice.actions;
export default historySlice.reducer;
