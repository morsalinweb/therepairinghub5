import { NextResponse } from "next/server"
import connectToDatabase from "../../../lib/db"
import Notification from "../../../models/Notification"
import { handleProtectedRoute } from "../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Get notifications for the current user
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
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

// Mark notification as read
export async function PUT(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { notificationId } = await req.json()

    // Check if notification exists and belongs to the user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: authResult.user._id,
    })

    if (!notification) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 })
    }

    // Mark as read
    notification.read = true
    await notification.save()

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    })
  } catch (error) {
    console.error("Mark notification error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
