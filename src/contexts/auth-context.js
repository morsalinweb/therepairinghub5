"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useClerk, useUser } from "@clerk/nextjs"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { signOut } = useClerk()
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser()

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // First check if user is signed in with Clerk
        if (clerkLoaded) {
          if (isSignedIn && clerkUser) {
            console.log("User is signed in with Clerk, syncing with database...")
            // Sync Clerk user with our database and get JWT token
            const { success, user, token } = await authAPI.syncAuth()

            if (success && user) {
              console.log("Sync successful, user:", user)
              setUser(user)

              // Store token in localStorage for API requests
              if (token) {
                localStorage.setItem("auth_token", token)
              }

              setLoading(false)
              return
            } else {
              console.error("Sync failed")
              // If sync fails but user is signed in with Clerk, try again after a delay
              setTimeout(() => {
                if (isSignedIn && clerkUser) {
                  checkAuthStatus()
                }
              }, 2000)
            }
          } else {
            console.log("Not signed in with Clerk, trying JWT fallback")
            // Not signed in with Clerk, try JWT fallback
            const { success, user } = await authAPI.getCurrentUser()
            if (success && user) {
              console.log("JWT auth successful, user:", user)
              setUser(user)
            } else {
              console.log("JWT auth failed, not authenticated")
              // Clear any stale tokens
              localStorage.removeItem("auth_token")
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error)
        // User is not logged in, that's okay
        localStorage.removeItem("auth_token")
      } finally {
        setLoading(false)
      }
    }

    checkAuthStatus()
  }, [clerkLoaded, isSignedIn, clerkUser])

  // Register a new user
  const register = async (userData) => {
    setLoading(true)
    try {
      const { success, user, token } = await authAPI.register(userData)
      if (success && user) {
        setUser(user)

        // Store token in localStorage for API requests
        if (token) {
          localStorage.setItem("auth_token", token)
        }

        toast({
          title: "Registration successful!",
          description: "Your account has been created.",
        })
        router.push("/profile")
        return true
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

        // Store token in localStorage for API requests
        if (token) {
          localStorage.setItem("auth_token", token)
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
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Invalid email or password.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  // Logout user
  const logout = async () => {
    setLoading(true)
    try {
      // Sign out from Clerk if using Clerk
      if (isSignedIn) {
        await signOut()
      }

      // Also sign out from our JWT system
      await authAPI.logout()

      // Remove token from localStorage
      localStorage.removeItem("auth_token")

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

  // Update user profile
  const updateProfile = async (userId, profileData) => {
    setLoading(true)
    try {
      const { success, user: updatedUser } = await authAPI.updateProfile(userId, profileData)
      if (success) {
        setUser((prevUser) => ({
          ...prevUser,
          ...updatedUser,
        }))
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
        // Sign out from Clerk if using Clerk
        if (isSignedIn) {
          await signOut()
        }

        // Remove token from localStorage
        localStorage.removeItem("auth_token")

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
        deleteAccount,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
