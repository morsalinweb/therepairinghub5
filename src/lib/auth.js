import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import User from "@/models/User"

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  })
}

// Set JWT token in cookie
export const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  }

  res.cookies.set("token", token, cookieOptions)
  return res
}

// Handle protected routes
export const handleProtectedRoute = async (req, allowedRoles = []) => {
  try {
    // First try to get the token from the cookie
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    // If no token in cookie, try to get from Authorization header
    const authHeader = req.headers.get("Authorization")
    const headerToken = authHeader ? authHeader.split(" ")[1] : null

    // Use token from cookie or header
    const finalToken = token || headerToken

    if (!finalToken) {
      return {
        success: false,
        message: "Not authenticated",
      }
    }

    // Verify token
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET)

    // Find user
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return {
        success: false,
        message: "User not found",
      }
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.userType)) {
      return {
        success: false,
        message: "Not authorized to access this resource",
      }
    }

    // Return success with user
    return {
      success: true,
      user,
    }
  } catch (error) {
    console.error("Auth error:", error)
    return {
      success: false,
      message: "Not authenticated",
    }
  }
}

// Middleware to check if user is authenticated with Clerk
export const withClerkAuth = async (req) => {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    // Find user in our database
    const user = await User.findOne({ clerkId: userId })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Generate JWT token for our API
    const token = generateToken(user._id)

    // Set token in cookie
    const response = NextResponse.next()
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    })

    return { success: true, user, response }
  } catch (error) {
    console.error("Clerk auth error:", error)
    return NextResponse.json({ success: false, message: "Authentication error" }, { status: 500 })
  }
}
