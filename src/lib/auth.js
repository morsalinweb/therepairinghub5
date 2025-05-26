// lib/auth.js
import jwt from "jsonwebtoken"
import { serialize } from "cookie"
import { NextResponse } from "next/server"
import connectToDatabase from "./db"
import User from "../models/User"

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  })
}

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

// Set token cookie
export const setTokenCookie = (res, token) => {
  const cookie = serialize("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  res.headers.set("Set-Cookie", cookie);
};



// Handle protected routes
export async function handleProtectedRoute(req, allowedUserTypes = []) {
  try {
    await connectToDatabase()

    // Get token from Authorization header
    const authHeader = req.headers.get("Authorization")
    const headerToken = authHeader ? authHeader.split(" ")[1] : null

    // Get token from cookie
    const cookieToken = req.cookies.get("token")?.value

    // Use token from header or cookie
    const token = headerToken || cookieToken || ""

    if (!token) {
      return NextResponse.json({ success: false, message: "Not authorized - No token" }, { status: 401 })
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: "Not authorized - Invalid token" }, { status: 401 })
    }

    // Get user
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return NextResponse.json({ success: false, message: "No user found" }, { status: 404 })
    }

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.json({ success: false, message: "Account is inactive" }, { status: 403 })
    }

    // Check user type
    if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user.userType)) {
      return NextResponse.json(
        { success: false, message: "Not authorized - Insufficient user rights" },
        { status: 403 },
      )
    }

    return { success: true, user }
  } catch (error) {
    console.error("Protected route error:", error)
    return NextResponse.json({ success: false, message: "Not authorized - Token is invalid" }, { status: 401 })
  }
}
