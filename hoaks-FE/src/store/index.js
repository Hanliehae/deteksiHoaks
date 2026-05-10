// ============================================
// store/index.js — Redux Store
// ============================================

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import predictReducer from './slices/predictSlice';
import historyReducer from './slices/historySlice';
import adminReducer from './slices/adminSlice';
import trainingReducer from './slices/trainingSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    predict: predictReducer,
    history: historyReducer,
    admin: adminReducer,
    training: trainingReducer,
  },
});

export default store;
