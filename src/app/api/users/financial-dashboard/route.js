import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Transaction from "../../../../models/Transaction"
import { handleProtectedRoute } from "../../../../lib/auth"
import User from "../../../../models/User"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: authResult.status || 401 })
    }

    const userId = authResult.user._id
    const userType = authResult.user.userType

    // Get user data with financial totals
    const user = await User.findById(userId).select("totalEarnings totalSpending balance")

    // Get all transactions for this user
    const transactions = await Transaction.find({
      $or: [{ customer: userId }, { provider: userId }],
    })
      .populate("job", "title category")
      .sort({ createdAt: -1 })
      .limit(50)

    // Calculate financial metrics from actual transactions
    let availableBalance = 0
    let totalEarnings = 0
    let totalSpending = 0
    const recentTransactions = []
    const spendingByCategory = {}
    const earningsByMonth = {}

    transactions.forEach((transaction) => {
      const isEarning = transaction.provider?.toString() === userId.toString()
      const isSpending = transaction.customer?.toString() === userId.toString()

      // Calculate actual amounts from transactions
      if (isEarning && transaction.status === "released") {
        // For sellers: earnings from completed jobs
        const providerAmount = transaction.amount - (transaction.serviceFee || 0)
        totalEarnings += providerAmount
        availableBalance += providerAmount
      }

      if (isSpending && (transaction.status === "released" || transaction.status === "in_escrow")) {
        // For buyers: total amount paid (including service fees)
        totalSpending += transaction.amount
      }

      // Recent transactions with correct amounts
      recentTransactions.push({
        id: transaction._id,
        jobTitle: transaction.job?.title || "Unknown Job",
        description: `${isEarning ? "Earned from" : "Paid for"} ${transaction.job?.title || "service"}`,
        amount: isEarning ? transaction.amount - (transaction.serviceFee || 0) : transaction.amount,
        type: isEarning ? "job_earning" : "job_payment",
        status: transaction.status,
        date: transaction.createdAt,
        category: transaction.job?.category || "General",
      })

      // Spending by category (for buyers)
      if (isSpending && (transaction.status === "released" || transaction.status === "in_escrow")) {
        const category = transaction.job?.category || "General"
        spendingByCategory[category] = (spendingByCategory[category] || 0) + transaction.amount
      }

      // Earnings by month (for sellers)
      if (isEarning && transaction.status === "released") {
        const month = new Date(transaction.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
        const providerAmount = transaction.amount - (transaction.serviceFee || 0)
        earningsByMonth[month] = (earningsByMonth[month] || 0) + providerAmount
      }
    })

    // Update user's financial totals in database if they don't match
    if (
      user.totalEarnings !== totalEarnings ||
      user.totalSpending !== totalSpending ||
      user.balance !== availableBalance
    ) {
      await User.findByIdAndUpdate(userId, {
        totalEarnings,
        totalSpending,
        balance: availableBalance,
      })
    }

    // Format spending by category
    const spendingByCategoryArray = Object.entries(spendingByCategory).map(([category, amount]) => ({
      category,
      amount,
    }))

    // Format earnings trend
    const earningsTrend = Object.entries(earningsByMonth)
      .map(([month, amount]) => ({
        month,
        amount,
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))

    const financialData = {
      availableBalance,
      totalEarnings,
      totalSpending,
      recentTransactions: recentTransactions.slice(0, 20), // Limit to 20 most recent
      spendingByCategory: spendingByCategoryArray,
      earningsTrend,
    }

    return NextResponse.json({
      success: true,
      financialData,
    })
  } catch (error) {
    console.error("Financial dashboard error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch financial data",
      },
      { status: 500 },
    )
  }
}
