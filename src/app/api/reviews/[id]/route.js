import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Review from "../../../../models/Review"
import { handleProtectedRoute } from "../../../../lib/auth"

// Get a specific review
export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    const reviewId = params.id

    // Find review
    const review = await Review.findById(reviewId)
      .populate("reviewer", "name avatar")
      .populate("reviewee", "name avatar")
      .populate("job", "title")

    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Get review error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Update a review
export async function PUT(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const reviewId = params.id
    const { rating, comment } = await req.json()

    // Validate input
    if (!rating || !comment) {
      return NextResponse.json({ success: false, message: "Please provide both rating and comment" }, { status: 400 })
    }

    // Find review
    const review = await Review.findById(reviewId)
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found" }, { status: 404 })
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== authResult.user._id.toString()) {
      return NextResponse.json({ success: false, message: "Not authorized to update this review" }, { status: 403 })
    }

    // Update review
    review.rating = rating
    review.comment = comment
    review.updatedAt = new Date()
    await review.save()

    // Populate review
    await review.populate("reviewer", "name avatar")
    await review.populate("reviewee", "name avatar")
    await review.populate("job", "title")

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Update review error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Delete a review
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const reviewId = params.id

    // Find review
    const review = await Review.findById(reviewId)
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found" }, { status: 404 })
    }

    // Check if user is the reviewer or admin
    if (review.reviewer.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to delete this review" }, { status: 403 })
    }

    // Delete review
    await Review.findByIdAndDelete(reviewId)

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
