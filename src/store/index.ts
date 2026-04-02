import { configureStore } from '@reduxjs/toolkit';
import tcpReducer from './tcpSlice';
import routingReducer from './routingSlice';

export const store = configureStore({
  reducer: {
    tcp: tcpReducer,
    routing: routingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
