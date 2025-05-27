import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Transaction from "../../../../models/Transaction"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Get all transactions (admin only)
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Admin"])
    if (!authResult.success) {
      return authResult
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query
    const query = {}
    if (type) query.type = type
    if (status) query.status = status

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate("customer", "name email")
      .populate("provider", "name email")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Transaction.countDocuments(query)

    // Calculate platform revenue
    const totalRevenue = await Transaction.aggregate([
      { $match: { type: "job_payment", status: { $in: ["in_escrow", "released"] } } },
      { $group: { _id: null, total: { $sum: "$serviceFee" } } },
    ])

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0

    return NextResponse.json({
      success: true,
      count: transactions.length,
      total,
      revenue,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      transactions,
    })
  } catch (error) {
    console.error("Admin get transactions error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
