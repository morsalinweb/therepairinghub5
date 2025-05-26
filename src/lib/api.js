// lib/api.js

import axios from "axios"

// Configure axios
axios.defaults.withCredentials = true

// Add authorization header to all requests if token exists in localStorage
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Handle API errors
const handleApiError = (error) => {
  console.error("API Error:", error)

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error("Response data:", error.response.data)
    console.error("Response status:", error.response.status)

    return {
      success: false,
      message: error.response.data.message || "An error occurred",
      status: error.response.status,
    }
  } else if (error.request) {
    // The request was made but no response was received
    console.error("No response received:", error.request)
    return {
      success: false,
      message: "No response from server. Please check your connection.",
    }
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error("Request error:", error.message)
    return {
      success: false,
      message: error.message,
    }
  }
}

// Auth API
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await axios.post("/api/auth/register", userData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Login a user
  login: async (credentials) => {
    try {
      const response = await axios.post("/api/auth/login", credentials)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Logout a user
  logout: async () => {
    try {
      const response = await axios.post("/api/auth/logout")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await axios.get("/api/auth/me")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Job API
export const jobAPI = {
  // Get all jobs with optional filters
  getJobs: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams()

      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      const response = await axios.get(`/api/jobs?${queryParams.toString()}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get a single job by ID
  getJob: async (jobId) => {
    try {
      const response = await axios.get(`/api/jobs/${jobId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Create a new job
  createJob: async (jobData) => {
    try {
      console.log("Creating job with data:", jobData)
      const response = await axios.post("/api/jobs", jobData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Update a job
  updateJob: async (jobId, jobData) => {
    try {
      const response = await axios.put(`/api/jobs/${jobId}`, jobData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Delete a job
  deleteJob: async (jobId) => {
    try {
      const response = await axios.delete(`/api/jobs/${jobId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Hire a provider for a job
  hireProvider: async (jobId, providerId, paymentMethod) => {
    try {
      const response = await axios.post(`/api/jobs/${jobId}/hire`, {
        providerId,
        paymentMethod,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Complete a job
  completeJob: async (jobId) => {
    try {
      const response = await axios.post(`/api/jobs/${jobId}/complete`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Process payment for a job
  processPayment: async (jobId, providerId, paymentMethod) => {
    try {
      const response = await axios.post(`/api/jobs/${jobId}/payment`, {
        providerId,
        paymentMethod,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Quote API
export const quoteAPI = {
  // Get quotes for a job
  getQuotes: async (jobId) => {
    try {
      const response = await axios.get(`/api/quotes?job=${jobId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Submit a quote
  submitQuote: async (quoteData) => {
    try {
      console.log("Submitting quote with data:", quoteData)
      const response = await axios.post("/api/quotes", quoteData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// User API
export const userAPI = {
  // Get user profile
  getProfile: async (userId) => {
    try {
      const response = await axios.get(`/api/users/${userId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      // Get user ID from auth token or localStorage
      const token = localStorage.getItem("auth_token")
      if (!token) {
        return {
          success: false,
          message: "No authentication token found. Please log in again.",
        }
      }

      // Decode JWT to get user ID
      const payload = JSON.parse(atob(token.split(".")[1]))
      const userId = payload.userId || payload.id || payload._id

      if (!userId) {
        return {
          success: false,
          message: "User ID not found in token. Please log in again.",
        }
      }

      const response = await axios.put(`/api/users/${userId}`, profileData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get provider details
  getProviderDetails: async (providerId) => {
    try {
      const response = await axios.get(`/api/users/${providerId}?includeReviews=true`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Review API
export const reviewAPI = {
  // Get reviews for a user
  getReviews: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString()
      const response = await axios.get(`/api/reviews?${queryParams}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Submit a review
  createReview: async (reviewData) => {
    try {
      const response = await axios.post("/api/reviews", reviewData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Update a review
  updateReview: async (reviewId, reviewData) => {
    try {
      const response = await axios.put(`/api/reviews/${reviewId}`, reviewData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Delete a review
  deleteReview: async (reviewId) => {
    try {
      const response = await axios.delete(`/api/reviews/${reviewId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Message API
export const messageAPI = {
  // Get messages for a job and user
  getMessages: async (jobId, userId) => {
    try {
      const response = await axios.get(`/api/messages?job=${jobId}&user=${userId}`)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Send a message
  sendMessage: async (messageData) => {
    try {
      console.log("Sending message with data:", messageData)
      const response = await axios.post("/api/messages", messageData)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Notification API
export const notificationAPI = {
  // Get notifications
  getNotifications: async () => {
    try {
      const response = await axios.get("/api/notifications")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.put(`/api/notifications/${notificationId}`, {
        read: true,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await axios.put("/api/notifications/mark-all-read")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Payment API
export const paymentAPI = {
  // Process withdrawal
  processWithdrawal: async (amount) => {
    try {
      const response = await axios.post("/api/payments/withdraw", { amount })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Admin API
export const adminAPI = {
  // Get all users
  getUsers: async () => {
    try {
      const response = await axios.get("/api/admin/users")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get all jobs
  getJobs: async () => {
    try {
      const response = await axios.get("/api/admin/jobs")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get all transactions
  getTransactions: async () => {
    try {
      const response = await axios.get("/api/admin/transactions")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Get dashboard stats
  getStats: async () => {
    try {
      const response = await axios.get("/api/admin/stats")
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Update site settings
  updateSettings: async (settings) => {
    try {
      const response = await axios.put("/api/admin/settings", settings)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}
