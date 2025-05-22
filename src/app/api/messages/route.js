import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import Message from "@/models/Message"
import Job from "@/models/Job"
import User from "@/models/User"
import Quote from "@/models/Quote"
import Notification from "@/models/Notification"
import { handleProtectedRoute } from "@/lib/auth"
import mongoose from "mongoose"

// Get messages for a job
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job")
    const otherUserId = searchParams.get("user")
    const since = searchParams.get("since") // Optional timestamp for polling

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Job ID is required" }, { status: 400 })
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Build query
    const query = { job: jobId }

    // If otherUserId is provided, get messages between current user and other user
    if (otherUserId) {
      query.$or = [
        { sender: authResult.user._id, recipient: otherUserId },
        { sender: otherUserId, recipient: authResult.user._id },
      ]
    }

    // If since timestamp is provided, only get messages after that time
    if (since) {
      query.createdAt = { $gt: new Date(Number.parseInt(since)) }
    }

    // Check if the current user is part of the conversation
    const isJobPoster = job.postedBy.toString() === authResult.user._id.toString()
    const isProvider = job.hiredProvider && job.hiredProvider.toString() === authResult.user._id.toString()

    // If not job poster or provider, check if user has submitted a quote
    let hasSubmittedQuote = false
    if (!isJobPoster && !isProvider) {
      // Check if user has submitted a quote for this job
      const quote = await Quote.findOne({
        job: jobId,
        provider: authResult.user._id,
      })

      hasSubmittedQuote = !!quote
    }

    if (!isJobPoster && !isProvider && !hasSubmittedQuote && authResult.user.userType !== "Admin") {
      return NextResponse.json(
        { success: false, message: "You are not authorized to view these messages" },
        { status: 403 },
      )
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name email avatar userType")
      .populate("recipient", "name email avatar userType")

    // Mark messages as read
    if (messages.length > 0) {
      await Message.updateMany({ recipient: authResult.user._id, read: false }, { read: true })

      // Update conversation unread count
      if (otherUserId) {
        const user = await User.findById(authResult.user._id)
        if (user && user.conversations) {
          const conversationIndex = user.conversations.findIndex(
            (conv) => conv.with && conv.with.toString() === otherUserId && conv.job && conv.job.toString() === jobId,
          )

          if (conversationIndex !== -1) {
            user.conversations[conversationIndex].unreadCount = 0
            await user.save()
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages,
    })
  } catch (error) {
    console.error("Get messages error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Send a message
export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { jobId, receiverId, content } = await req.json()

    // Validate input
    if (!jobId || !receiverId || !content) {
      return NextResponse.json({ success: false, message: "Please provide all required fields" }, { status: 400 })
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Find receiver
    const receiver = await User.findById(receiverId)
    if (!receiver) {
      return NextResponse.json({ success: false, message: "Receiver not found" }, { status: 404 })
    }

    // Check if the current user is part of the conversation
    const isJobPoster = job.postedBy.toString() === authResult.user._id.toString()
    const isProvider = job.hiredProvider && job.hiredProvider.toString() === authResult.user._id.toString()

    // Check if the receiver is the job poster or hired provider
    const isReceiverJobPoster = receiverId === job.postedBy.toString()
    const isReceiverProvider = job.hiredProvider && receiverId === job.hiredProvider.toString()

    // Check if the current user has submitted a quote for this job
    let hasSubmittedQuote = false
    if (!isJobPoster && !isProvider) {
      const quote = await Quote.findOne({
        job: jobId,
        provider: authResult.user._id,
      })

      hasSubmittedQuote = !!quote
    }

    console.log({
      isJobPoster,
      isProvider,
      isReceiverJobPoster,
      isReceiverProvider,
      hasSubmittedQuote,
      userType: authResult.user.userType,
    })

    // Authorization logic:
    // 1. Job posters can message any provider who submitted a quote or the hired provider
    // 2. Hired providers can message the job poster
    // 3. Providers who submitted quotes can message the job poster
    // 4. Admins can message anyone

    let isAuthorized = false

    if (authResult.user.userType === "Admin") {
      isAuthorized = true
    } else if (isJobPoster) {
      // Job poster can message any provider who submitted a quote or the hired provider
      if (isReceiverProvider) {
        isAuthorized = true
      } else {
        // Check if receiver has submitted a quote
        const receiverQuote = await Quote.findOne({
          job: jobId,
          provider: receiverId,
        })

        isAuthorized = !!receiverQuote
      }
    } else if (isProvider || hasSubmittedQuote) {
      // Providers can only message the job poster
      isAuthorized = isReceiverJobPoster
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to send messages for this job" },
        { status: 403 },
      )
    }

    // Create message
    const message = await Message.create({
      job: jobId,
      sender: authResult.user._id,
      recipient: receiverId,
      message: content,
    })

    // Populate sender and recipient info
    await message.populate("sender", "name email avatar userType")
    await message.populate("recipient", "name email avatar userType")

    // Update or create conversation for sender
    await updateConversation(authResult.user._id, receiverId, jobId, message._id)

    // Update or create conversation for recipient
    await updateConversation(receiverId, authResult.user._id, jobId, message._id, true)

    // Create notification for receiver
    const notification = await Notification.create({
      recipient: receiverId,
      sender: authResult.user._id,
      type: "message",
      message: `New message from ${authResult.user.name || "a user"} regarding job: ${job.title}`,
      relatedId: message._id,
      onModel: "Message",
    })

    // Add notification to receiver's notifications array
    await User.findByIdAndUpdate(receiverId, {
      $push: { notifications: notification._id },
    })

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Helper function to update or create a conversation
async function updateConversation(userId, withUserId, jobId, messageId, incrementUnread = false) {
  try {
    const user = await User.findById(userId)
    if (!user) return

    // Initialize conversations array if it doesn't exist
    if (!user.conversations) {
      user.conversations = []
    }

    // Find existing conversation
    const conversationIndex = user.conversations.findIndex(
      (conv) =>
        conv.with &&
        conv.with.toString() === withUserId.toString() &&
        conv.job &&
        conv.job.toString() === jobId.toString(),
    )

    if (conversationIndex !== -1) {
      // Update existing conversation
      user.conversations[conversationIndex].lastMessage = messageId
      user.conversations[conversationIndex].updatedAt = new Date()

      if (incrementUnread) {
        user.conversations[conversationIndex].unreadCount = (user.conversations[conversationIndex].unreadCount || 0) + 1
      }
    } else {
      // Create new conversation
      user.conversations.push({
        with: new mongoose.Types.ObjectId(withUserId),
        job: new mongoose.Types.ObjectId(jobId),
        lastMessage: new mongoose.Types.ObjectId(messageId),
        unreadCount: incrementUnread ? 1 : 0,
        updatedAt: new Date(),
      })
    }

    await user.save()
  } catch (error) {
    console.error("Error updating conversation:", error)
  }
}
