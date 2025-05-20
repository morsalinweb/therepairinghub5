import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import Transaction from "@/models/Transaction"
import User from "@/models/User"
import Job from "@/models/Job"
import { handleProtectedRoute } from "@/lib/auth"
import mongoose from "mongoose"

export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 })
    }

    const userId = params.id
    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    console.log(`Getting financial dashboard for user ${userId}, type: ${user.userType}`)

    // Initialize financial data
    const financialData = {
      availableBalance: user.availableBalance || 0,
      totalEarnings: user.totalEarnings || 0,
      totalSpending: user.totalSpending || 0,
      recentTransactions: [],
      spendingByCategory: [],
      earningsTrend: [],
    }

    console.log(`Initial financial data: ${JSON.stringify(financialData)}`)

    // Get recent transactions
    let transactionQuery = {}
    if (user.userType === "Buyer") {
      transactionQuery = { customer: userId }
    } else if (user.userType === "Seller") {
      transactionQuery = { provider: userId }
    }

    console.log(`Transaction query: ${JSON.stringify(transactionQuery)}`)

    const recentTransactions = await Transaction.find(transactionQuery).sort({ createdAt: -1 }).limit(10).populate({
      path: "job",
      select: "title category",
    })

    console.log(`Found ${recentTransactions.length} recent transactions`)

    // Format transactions
    financialData.recentTransactions = recentTransactions.map((transaction) => {
      return {
        id: transaction._id,
        date: transaction.createdAt,
        amount: transaction.amount,
        status: transaction.status,
        type: user.userType === "Buyer" ? "job_payment" : "job_earning",
        jobTitle: transaction.job?.title || "Job payment",
        category: transaction.job?.category || "Service",
        description: transaction.description || "Transaction",
      }
    })

    // Get spending by category (for buyers)
    if (user.userType === "Buyer") {
      const categorySpending = await Transaction.aggregate([
        { $match: { customer: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "jobDetails",
          },
        },
        { $unwind: { path: "$jobDetails", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$jobDetails.category",
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
      ])

      console.log(`Found ${categorySpending.length} category spending records`)

      financialData.spendingByCategory = categorySpending.map((item) => ({
        category: item._id || "Other",
        amount: item.amount,
      }))
    }

    // Get earnings trend (for sellers)
    if (user.userType === "Seller") {
      // Get current date
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      // Generate last 6 months (including current)
      const months = []
      for (let i = 0; i < 6; i++) {
        const month = (currentMonth - i + 12) % 12
        const year = currentYear - Math.floor((i - currentMonth) / 12)
        months.push({ month, year })
      }

      console.log(`Generated ${months.length} months for earnings trend`)

      // Get earnings for each month
      const earningsTrend = []
      for (const { month, year } of months.reverse()) {
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59)

        console.log(
          `Checking earnings for ${month + 1}/${year}: ${startDate.toISOString()} to ${endDate.toISOString()}`,
        )

        // Find all transactions for this month where user is the provider
        const monthTransactions = await Transaction.find({
          provider: userId,
          status: "released",
          createdAt: { $gte: startDate, $lte: endDate },
        })

        // Calculate total amount
        let monthlyAmount = 0
        for (const tx of monthTransactions) {
          monthlyAmount += tx.amount - (tx.serviceFee || 0)
        }

        console.log(`Found ${monthTransactions.length} transactions for ${month + 1}/${year}, total: ${monthlyAmount}`)

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]

        earningsTrend.push({
          month: `${monthNames[month]} ${year}`,
          amount: monthlyAmount,
        })
      }

      financialData.earningsTrend = earningsTrend
    }

    // Update existing transactions that are still in escrow but should be released
    // This is to fix any transactions that weren't properly released
    const jobsToCheck = await Job.find({
      status: "completed",
      paymentStatus: "in_escrow",
      hiredProvider: userId,
    }).populate("transactionId")

    console.log(`Found ${jobsToCheck.length} jobs to check for payment release`)

    for (const job of jobsToCheck) {
      if (job.transactionId) {
        const transaction = job.transactionId

        // Update transaction status
        transaction.status = "released"
        transaction.provider = job.hiredProvider
        await transaction.save()

        // Update job payment status
        job.paymentStatus = "released"
        await job.save()

        // Calculate provider amount (minus service fee)
        const providerAmount = transaction.amount - (transaction.serviceFee || 0)

        // Update provider's available balance and total earnings
        await User.findByIdAndUpdate(job.hiredProvider, {
          $inc: {
            availableBalance: providerAmount,
            totalEarnings: providerAmount,
          },
        })

        console.log(`Fixed transaction ${transaction._id} for job ${job._id}`)
      }
    }

    return NextResponse.json({
      success: true,
      financialData,
    })
  } catch (error) {
    console.error("Financial dashboard error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
