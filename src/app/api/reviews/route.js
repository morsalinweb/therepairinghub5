import { NextResponse } from "next/server"
import connectToDatabase from "../../../lib/db"
import User from "../../../models/User"
import Job from "../../../models/Job"
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
    let reviews = []

    if (userId) {
      // Get reviews for a specific user
      const user = await User.findById(userId)
        .populate("reviewsReceived.reviewer", "name avatar")
        .populate("reviewsReceived.job", "title")
        .select("reviewsReceived")

      if (user) {
        reviews = user.reviewsReceived

        if (jobId) {
          // Filter by job if specified
          reviews = reviews.filter((review) => review.job._id.toString() === jobId)
        }
      }
    } else if (jobId) {
      // Get all reviews for a specific job
      const job = await Job.findById(jobId)
      if (!job) {
        return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
      }

      // Get reviews from both buyer and provider
      const buyerReviews = await User.findOne(
        {
          _id: job.postedBy,
          "reviewsGiven.job": jobId,
        },
        { "reviewsGiven.$": 1 },
      ).populate("reviewsGiven.reviewer", "name avatar")

      const providerReviews = await User.findOne(
        {
          _id: job.hiredProvider,
          "reviewsGiven.job": jobId,
        },
        { "reviewsGiven.$": 1 },
      ).populate("reviewsGiven.reviewer", "name avatar")

      if (buyerReviews && buyerReviews.reviewsGiven.length > 0) {
        reviews = reviews.concat(buyerReviews.reviewsGiven)
      }

      if (providerReviews && providerReviews.reviewsGiven.length > 0) {
        reviews = reviews.concat(providerReviews.reviewsGiven)
      }
    }

    // Sort by creation date (newest first)
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedReviews = reviews.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      count: paginatedReviews.length,
      total: reviews.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(reviews.length / limit),
      },
      reviews: paginatedReviews,
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
    if (!jobId || !revieweeId || !rating || !comment) {
      return NextResponse.json({ success: false, message: "Please provide all required fields" }, { status: 400 })
    }

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
    const isJobPoster = job.postedBy.toString() === authResult.user._id.toString()
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

    // Check if user has already submitted a review
    const reviewer = await User.findById(authResult.user._id)
    const existingReview = reviewer.reviewsGiven.find(
      (review) => review.job.toString() === jobId && review.reviewee.toString() === revieweeId,
    )

    if (existingReview) {
      return NextResponse.json(
        { success: false, message: "You have already submitted a review for this job" },
        { status: 400 },
      )
    }

    // Create review object
    const reviewData = {
      job: jobId,
      reviewer: authResult.user._id,
      reviewee: revieweeId,
      rating,
      comment,
      createdAt: new Date(),
    }

    // Add review to reviewer's reviewsGiven array
    await User.updateOne({ _id: authResult.user._id }, { $push: { reviewsGiven: reviewData } })

    // Add review to reviewee's reviewsReceived array
    await User.updateOne({ _id: revieweeId }, { $push: { reviewsReceived: reviewData } })

    // Create notification for reviewee
    await User.updateOne(
      { _id: revieweeId },
      {
        $push: {
          notifications: {
            type: "review",
            message: `${authResult.user.name} left you a review for job: ${job.title}`,
            sender: authResult.user._id,
            relatedId: job._id,
            onModel: "Job",
            read: false,
            createdAt: new Date(),
          },
        },
      },
    )

    // Get the populated review to return
    const populatedReview = {
      ...reviewData,
      reviewer: {
        _id: authResult.user._id,
        name: authResult.user.name,
        avatar: authResult.user.avatar,
      },
      job: {
        _id: job._id,
        title: job.title,
      },
    }

    return NextResponse.json({
      success: true,
      review: populatedReview,
    })
  } catch (error) {
    console.error("Create review error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
