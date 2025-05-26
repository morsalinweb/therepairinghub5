"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token in localStorage
        const token = localStorage.getItem("auth_token")
        if (!token) {
          setLoading(false)
          return
        }

        // Verify the token with the server
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUser(data.user)
            // Store user data in localStorage for persistence
            localStorage.setItem("user", JSON.stringify(data.user))
          }
        } else {
          // Token is invalid, remove it
          localStorage.removeItem("auth_token")
          localStorage.removeItem("user")
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        // Clear invalid tokens
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Register a new user
  const register = async (userData) => {
    setLoading(true)
    try {
      const { success, user, token } = await authAPI.register(userData)
      if (success && user) {
        setUser(user)

        // Store token and user data in localStorage
        if (token) {
          localStorage.setItem("auth_token", token)
          localStorage.setItem("user", JSON.stringify(user))
        }

        toast({
          title: "Registration successful!",
          description: "Your account has been created.",
        })
        router.push("/profile")
        return true
      } else {
        toast({
          title: "Registration failed",
          description: "There was a problem creating your account.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "There was a problem creating your account.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  // Login user
  const login = async (credentials) => {
    setLoading(true)
    try {
      const { success, user, token } = await authAPI.login(credentials)
      if (success && user) {
        setUser(user)

        // Store token and user data in localStorage
        if (token) {
          localStorage.setItem("auth_token", token)
          localStorage.setItem("user", JSON.stringify(user))
        }

        toast({
          title: "Login successful!",
          description: "You have been logged in to your account.",
        })

        // Redirect based on user type
        if (user.userType === "Admin") {
          router.push("/admin")
        } else {
          router.push("/profile")
        }
        return true
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password.",
          variant: "destructive",
        })
        setLoading(false)
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Invalid email or password.",
        variant: "destructive",
      })
      setLoading(false)
      return false
    }
  }

  // Logout user
  const logout = async () => {
    setLoading(true)
    try {
      await authAPI.logout()

      // Remove token and user data from localStorage
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user")

      setUser(null)
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      })
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)

      // Still remove token and user state even if API call fails
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user")
      setUser(null)

      toast({
        title: "Logout failed",
        description: "There was a problem logging out.",
        variant: "destructive",
      })
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  // Update user data in context
  const updateUserData = (updatedUser) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updatedUser,
    }))
    // Update localStorage as well
    localStorage.setItem("user", JSON.stringify({ ...user, ...updatedUser }))
  }

  // Update user profile
  const updateProfile = async (userId, profileData) => {
    setLoading(true)
    try {
      const { success, user: updatedUser } = await authAPI.updateProfile(userId, profileData)
      if (success) {
        updateUserData(updatedUser)
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        })
        return true
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: error.response?.data?.message || "There was a problem updating your profile.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  // Delete user account
  const deleteAccount = async (userId) => {
    setLoading(true)
    try {
      const { success } = await authAPI.deleteAccount(userId)
      if (success) {
        // Remove token and user data from localStorage
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user")

        setUser(null)
        toast({
          title: "Account deleted",
          description: "Your account has been deleted successfully.",
        })
        router.push("/")
        return true
      }
    } catch (error) {
      console.error("Account deletion error:", error)
      toast({
        title: "Deletion failed",
        description: error.response?.data?.message || "There was a problem deleting your account.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        updateProfile,
        updateUserData,
        deleteAccount,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
