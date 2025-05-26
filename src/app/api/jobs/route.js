import { NextResponse } from "next/server"
import connectToDatabase from "../../../lib/db"
import Job from "../../../models/Job"
import { handleProtectedRoute } from "../../../lib/auth"

// Get all jobs
export async function GET(req) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const location = searchParams.get("location")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query
    const query = {}

    if (status) {
      query.status = status
    }

    if (category) {
      query.category = category
    }

    if (location) {
      query.location = { $regex: location, $options: "i" }
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number.parseFloat(minPrice)
      if (maxPrice) query.price.$lte = Number.parseFloat(maxPrice)
    }

    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    console.log("Jobs query:", query)
    console.log("Skip:", skip, "Limit:", limit)

    // Get jobs with populated fields, sorted by newest first
    const jobs = await Job.find(query)
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count for pagination
    const total = await Job.countDocuments(query)

    console.log(`Found ${jobs.length} jobs out of ${total} total`)

    return NextResponse.json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      jobs,
    })
  } catch (error) {
    console.error("Get jobs error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Create a new job
export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { title, description, category, location, price, date } = await req.json()

    // Validate required fields
    if (!title || !description || !category || !location || !price || !date) {
      return NextResponse.json({ success: false, message: "Please provide all required fields" }, { status: 400 })
    }

    // Validate price
    if (isNaN(Number.parseFloat(price)) || Number.parseFloat(price) <= 0) {
      return NextResponse.json({ success: false, message: "Please provide a valid price" }, { status: 400 })
    }

    // Create job
    const job = await Job.create({
      title,
      description,
      category,
      location,
      price: Number.parseFloat(price),
      date: new Date(date),
      postedBy: authResult.user._id,
      status: "active",
    })

    // Populate the job with user details
    await job.populate("postedBy", "name email avatar")

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error) {
    console.error("Create job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
