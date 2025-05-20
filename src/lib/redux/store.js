// lib/redux/store.js
import { configureStore } from "@reduxjs/toolkit"
import jobReducer from "./slices/jobSlice"
import messageReducer from "./slices/messageSlice"
import quoteReducer from "./slices/quoteSlice"
import notificationReducer from "./slices/notificationSlice"

export const store = configureStore({
  reducer: {
    jobs: jobReducer,
    messages: messageReducer,
    quotes: quoteReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allows non-serializable values in state
    }),
})

export default store
