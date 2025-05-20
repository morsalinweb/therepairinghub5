import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
}

export const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload
      state.unreadCount = action.payload.filter((n) => !n.read).length
      state.loading = false
      state.error = null
    },
    addNotification: (state, action) => {
      // Check if notification already exists to prevent duplicates
      const exists = state.notifications.some((n) => n._id === action.payload._id)
      if (!exists) {
        state.notifications.unshift(action.payload) // Add to beginning of array
        if (!action.payload.read) {
          state.unreadCount += 1
        }
      }
    },
    markAsRead: (state, action) => {
      const ids = Array.isArray(action.payload) ? action.payload : [action.payload]

      state.notifications = state.notifications.map((notification) => {
        if (ids.includes(notification._id) && !notification.read) {
          state.unreadCount -= 1
          return { ...notification, read: true }
        }
        return notification
      })
    },
    markAllAsRead: (state) => {
      state.notifications = state.notifications.map((notification) => ({
        ...notification,
        read: true,
      }))
      state.unreadCount = 0
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },
  },
})

export const { setNotifications, addNotification, markAsRead, markAllAsRead, setLoading, setError } =
  notificationSlice.actions

export default notificationSlice.reducer
