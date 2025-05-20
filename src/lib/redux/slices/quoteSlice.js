import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  quotes: [],
  loading: false,
  error: null,
}

export const quoteSlice = createSlice({
  name: "quotes",
  initialState,
  reducers: {
    setQuotes: (state, action) => {
      state.quotes = action.payload
      state.loading = false
      state.error = null
    },
    addQuote: (state, action) => {
      // Check if quote already exists to prevent duplicates
      const exists = state.quotes.some((quote) => quote._id === action.payload._id)
      if (!exists) {
        state.quotes.push(action.payload)
      }
    },
    updateQuote: (state, action) => {
      const index = state.quotes.findIndex((quote) => quote._id === action.payload._id)
      if (index !== -1) {
        state.quotes[index] = action.payload
      }
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

export const { setQuotes, addQuote, updateQuote, setLoading, setError } = quoteSlice.actions

export default quoteSlice.reducer
