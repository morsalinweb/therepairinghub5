// lib/redux/slices/jobSlice.js
import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  jobs: [],
  currentJob: null,
  loading: false,
  error: null,
}

export const jobSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state, action) => {
      state.jobs = action.payload
      state.loading = false
      state.error = null
    },
    setCurrentJob: (state, action) => {
      state.currentJob = action.payload
      state.loading = false
      state.error = null
    },
    updateJob: (state, action) => {
      // Update current job if it matches
      if (state.currentJob && state.currentJob._id === action.payload._id) {
        state.currentJob = action.payload
      }

      // Update job in jobs array
      const index = state.jobs.findIndex((job) => job._id === action.payload._id)
      if (index !== -1) {
        state.jobs[index] = action.payload
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

export const { setJobs, setCurrentJob, updateJob, setLoading, setError } = jobSlice.actions

export default jobSlice.reducer
