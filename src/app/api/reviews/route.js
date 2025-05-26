import { NextResponse } from "next/server"
import connectToDatabase from "../../../lib/db"
import Review from "../../../models/Review"
import Job from "../../../models/Job"
import Notification from "../../../models/Notification"
import User from "../../../models/User"
import { handleProtectedRoute } from "../../../lib/auth"

// Get reviews
export async function GET(req) {
  try {
    await connectToDatabase()

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user")
    const jobId = searchParams.get("job")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query
    const query = {}
    if (userId) query.reviewee = userId
    if (jobId) query.job = jobId

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get reviews
    const reviews = await Review.find(query)
      .populate("reviewer", "name avatar")
      .populate("reviewee", "name avatar")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Review.countDocuments(query)

    return NextResponse.json({
      success: true,
      count: reviews.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      reviews,
    })
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Create a review
export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { jobId, revieweeId, rating, comment } = await req.json()

    // Validate input
    if (!revieweeId || !rating || !comment) {
      return NextResponse.json({ success: false, message: "Please provide all required fields" }, { status: 400 })
    }

    // If jobId is provided, validate the job relationship
    if (jobId) {
      // Find job
      const job = await Job.findById(jobId)
      if (!job) {
        return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
      }

      // Check if job is completed
      if (job.status !== "completed") {
        return NextResponse.json({ success: false, message: "Can only review completed jobs" }, { status: 400 })
      }

      // Check if user is involved in the job
      const isJobPoster = job.postedBy && job.postedBy.toString() === authResult.user._id.toString()
      const isProvider = job.hiredProvider && job.hiredProvider.toString() === authResult.user._id.toString()

      if (!isJobPoster && !isProvider) {
        return NextResponse.json({ success: false, message: "You are not involved in this job" }, { status: 403 })
      }

      // Check if user is reviewing the correct party
      if (isJobPoster && revieweeId !== job.hiredProvider.toString()) {
        return NextResponse.json({ success: false, message: "You can only review the hired provider" }, { status: 400 })
      }

      if (isProvider && revieweeId !== job.postedBy.toString()) {
        return NextResponse.json({ success: false, message: "You can only review the job poster" }, { status: 400 })
      }

      // Check if user has already submitted a review for this job
      const existingJobReview = await Review.findOne({
        job: jobId,
        reviewer: authResult.user._id,
      })

      if (existingJobReview) {
        return NextResponse.json(
          { success: false, message: "You have already submitted a review for this job" },
          { status: 400 },
        )
      }
    } else {
      // For general reviews (not job-specific), check if user has already reviewed this person
      const existingReview = await Review.findOne({
        reviewer: authResult.user._id,
        reviewee: revieweeId,
        job: { $exists: false },
      })

      if (existingReview) {
        return NextResponse.json(
          { success: false, message: "You have already submitted a review for this user" },
          { status: 400 },
        )
      }
    }

    // Create review
    const reviewData = {
      reviewer: authResult.user._id,
      reviewee: revieweeId,
      rating,
      comment,
    }

    if (jobId) {
      reviewData.job = jobId
    }

    const review = await Review.create(reviewData)

    // Populate review
    await review.populate("reviewer", "name avatar")
    await review.populate("reviewee", "name avatar")
    if (jobId) {
      await review.populate("job", "title")
    }

    // Update reviewee's rating and review count
    const reviewee = await User.findById(revieweeId)
    if (reviewee) {
      const allReviews = await Review.find({ reviewee: revieweeId })
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
      const averageRating = totalRating / allReviews.length

      await User.findByIdAndUpdate(revieweeId, {
        rating: averageRating,
        reviewCount: allReviews.length,
      })
    }

    // Create notification for reviewee
    try {
      await Notification.create({
        recipient: revieweeId,
        sender: authResult.user._id,
        type: "review",
        message: `${authResult.user.name} left you a review${jobId ? ` for a job` : ""}`,
        relatedId: review._id,
        onModel: "Review",
      })
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError)
      // Don't fail the review creation if notification fails
    }

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Create review error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
