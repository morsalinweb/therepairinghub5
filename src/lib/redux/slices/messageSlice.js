import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  messages: [],
  loading: false,
  error: null,
  currentJobId: null,
  currentRecipientId: null,
}

export const messageSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload
      state.loading = false
      state.error = null
    },
    addMessage: (state, action) => {
      // Check if message already exists to prevent duplicates
      const exists = state.messages.some((msg) => msg._id === action.payload._id)
      if (!exists) {
        state.messages.push(action.payload)
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },
    setCurrentConversation: (state, action) => {
      state.currentJobId = action.payload.jobId
      state.currentRecipientId = action.payload.recipientId
    },
    clearMessages: (state) => {
      state.messages = []
      state.currentJobId = null
      state.currentRecipientId = null
    },
  },
})

export const { setMessages, addMessage, setLoading, setError, setCurrentConversation, clearMessages } =
  messageSlice.actions

export default messageSlice.reducer
