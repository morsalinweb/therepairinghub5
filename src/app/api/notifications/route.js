import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import Notification from "@/models/Notification"
import { handleProtectedRoute } from "@/lib/auth"

// Get notifications for the current user
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 })
    }

    // Get notifications
    const notifications = await Notification.find({ recipient: authResult.user._id })
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(50)

    // Count unread notifications
    const unreadCount = notifications.filter((notification) => !notification.read).length

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
