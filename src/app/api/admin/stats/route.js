import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import Job from "../../../../models/Job"
import Transaction from "../../../../models/Transaction"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Get admin dashboard stats
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Admin"])
    if (!authResult.success) {
      return authResult
    }

    // Get total users count
    const totalUsers = await User.countDocuments()
    const buyerCount = await User.countDocuments({ userType: "Buyer" })
    const sellerCount = await User.countDocuments({ userType: "Seller" })

    // Get jobs stats
    const totalJobs = await Job.countDocuments()
    const activeJobs = await Job.countDocuments({ status: "active" })
    const completedJobs = await Job.countDocuments({ status: "completed" })
    const inProgressJobs = await Job.countDocuments({ status: "in_progress" })

    // Get transaction stats
    const totalTransactions = await Transaction.countDocuments()

    // Calculate total revenue
    const revenueStats = await Transaction.aggregate([
      { $match: { type: "job_payment", status: { $in: ["in_escrow", "released"] } } },
      { $group: { _id: null, total: { $sum: "$serviceFee" } } },
    ])

    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0

    // Get monthly revenue for the current year
    const currentYear = new Date().getFullYear()
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          type: "job_payment",
          status: { $in: ["in_escrow", "released"] },
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$serviceFee" },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Format monthly revenue
    const monthlyRevenueData = Array(12).fill(0)
    monthlyRevenue.forEach((item) => {
      monthlyRevenueData[item._id - 1] = item.revenue
    })

    // Get recent users
    const recentUsers = await User.find().select("name email userType createdAt").sort({ createdAt: -1 }).limit(5)

    // Get recent jobs
    const recentJobs = await Job.find()
      .populate("postedBy", "name")
      .select("title price status createdAt postedBy")
      .sort({ createdAt: -1 })
      .limit(5)

    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .populate("customer", "name")
      .populate("provider", "name")
      .populate("job", "title")
      .select("amount serviceFee type status createdAt")
      .sort({ createdAt: -1 })
      .limit(5)

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          buyers: buyerCount,
          sellers: sellerCount,
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          completed: completedJobs,
          inProgress: inProgressJobs,
        },
        transactions: {
          total: totalTransactions,
          revenue: totalRevenue,
          monthlyRevenue: monthlyRevenueData,
        },
      },
      recent: {
        users: recentUsers,
        jobs: recentJobs,
        transactions: recentTransactions,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
