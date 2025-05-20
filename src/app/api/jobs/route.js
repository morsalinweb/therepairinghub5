import { NextResponse } from "next/server"
import connectToDatabase from "../../../lib/db"
import Job from "../../../models/Job"
import { handleProtectedRoute } from "../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = authResult.user._id
    const jobData = await req.json()

    console.log("Received job data:", jobData)

    // Validate required fields
    const requiredFields = ["title", "description", "category", "price"]
    const missingFields = requiredFields.filter((field) => !jobData[field])

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields)
      return NextResponse.json(
        { success: false, message: `Please provide all required fields: ${missingFields.join(", ")}` },
        { status: 400 },
      )
    }

    // Create job
    const job = await Job.create({
      ...jobData,
      postedBy: userId,
      status: "active",
    })

    return NextResponse.json({
      success: true,
      message: "Job created successfully",
      job,
    })
  } catch (error) {
    console.error("Create job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Build query
    const query = {}

    if (category) {
      query.category = category
    }

    if (status) {
      query.status = status
    } else {
      // By default, only show active jobs
      query.status = "active"
    }

    if (userId) {
      query.postedBy = userId
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    // Get jobs
    const jobs = await Job.find(query)
      .populate({
        path: "postedBy",
        select: "name email profileImage",
      })
      .populate({
        path: "hiredProvider",
        select: "name email profileImage",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Job.countDocuments(query)

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get jobs error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
