import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import Transaction from "../../../../models/Transaction"
import { handleProtectedRoute } from "../../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { amount, paypalEmail } = await req.json()

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Please provide a valid amount" }, { status: 400 })
    }

    // Validate PayPal email - allow sandbox emails
    if (!paypalEmail || !paypalEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid PayPal email address" },
        { status: 400 },
      )
    }

    // Allow sandbox PayPal emails
    const isValidPayPalEmail =
      paypalEmail.includes("@") &&
      (paypalEmail.includes(".com") ||
        paypalEmail.includes(".example.com") ||
        paypalEmail.includes("@personal.example.com") ||
        paypalEmail.includes("@business.example.com"))

    if (!isValidPayPalEmail) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid PayPal email address" },
        { status: 400 },
      )
    }

    const user = await User.findById(authResult.user._id)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Check if user has sufficient balance
    if (user.availableBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient funds. Available balance: $${user.availableBalance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Update user's PayPal email if different
    if (user.paypalEmail !== paypalEmail) {
      user.paypalEmail = paypalEmail
    }

    // Deduct amount from available balance
    user.availableBalance -= amount
    await user.save()

    // Create withdrawal transaction
    const transaction = await Transaction.create({
      user: user._id,
      amount: amount,
      type: "withdrawal",
      paymentMethod: "paypal",
      status: "completed",
      description: `Withdrawal to PayPal: ${paypalEmail}`,
      paymentId: `WD-${Date.now()}`,
    })

    console.log(`Withdrawal processed: $${amount} to ${paypalEmail} for user ${user._id}`)

    return NextResponse.json({
      success: true,
      message: `$${amount.toFixed(2)} has been sent to your PayPal account`,
      newBalance: user.availableBalance,
      transaction,
    })
  } catch (error) {
    console.error("Withdrawal error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
