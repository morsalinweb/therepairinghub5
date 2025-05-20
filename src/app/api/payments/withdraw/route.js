import { NextResponse } from "next/server"
import axios from "axios"
import connectToDatabase from "../../../../lib/db"
import Transaction from "../../../../models/Transaction"
import User from "../../../../models/User"
import Notification from "../../../../models/Notification"
import { handleProtectedRoute } from "../../../../lib/auth"
import { sendNotification } from "../../../../lib/socket"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = authResult.user._id
    const { amount, paypalEmail } = await req.json()

    // Validate input
    if (!amount || isNaN(amount) || Number.parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, message: "Please provide a valid withdrawal amount" }, { status: 400 })
    }

    if (!paypalEmail || !paypalEmail.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid PayPal email address" },
        { status: 400 },
      )
    }

    // Get user with available balance
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    console.log(
      `User ${userId} attempting to withdraw ${amount} to PayPal email: ${paypalEmail}, available balance: ${user.availableBalance}`,
    )

    // Check if user has enough balance
    if (Number.parseFloat(amount) > user.availableBalance) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient funds for withdrawal. Available balance: $${user.availableBalance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Calculate service fee (2.9% + $0.30 for PayPal standard fee)
    const serviceFee = Number.parseFloat(amount) * 0.029 + 0.3
    const netAmount = Number.parseFloat(amount) - serviceFee

    // Create withdrawal transaction (initially pending)
    const withdrawal = await Transaction.create({
      customer: userId,
      provider: userId,
      job: null,
      amount: Number.parseFloat(amount),
      serviceFee,
      type: "withdrawal",
      paymentMethod: "paypal",
      status: "pending",
      description: `Withdrawal to PayPal account (${paypalEmail})`,
    })

    try {
      // Get PayPal access token
      const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64")
      const tokenResponse = await axios.post(
        `${process.env.PAYPAL_API_URL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
        },
      )

      const accessToken = tokenResponse.data.access_token

      // Create a unique batch ID
      const batchId = `BATCH-${Date.now()}-${userId.toString().substring(0, 8)}`

      // Create PayPal payout
      const payoutResponse = await axios.post(
        `${process.env.PAYPAL_API_URL}/v1/payments/payouts`,
        {
          sender_batch_header: {
            sender_batch_id: batchId,
            email_subject: "You have a payment from Repairing Hub",
            email_message: "You have received a payment from Repairing Hub. Thank you for your service!",
          },
          items: [
            {
              recipient_type: "EMAIL",
              amount: {
                value: netAmount.toFixed(2),
                currency: "USD",
              },
              note: "Thank you for your service!",
              receiver: paypalEmail,
              sender_item_id: `PAYOUT-${withdrawal._id}`,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      // Update transaction with PayPal info
      withdrawal.paypalBatchId = payoutResponse.data.batch_header.payout_batch_id
      withdrawal.paymentId = payoutResponse.data.batch_header.payout_batch_id
      withdrawal.status = "completed" // PayPal processes these immediately
      await withdrawal.save()

      // Update user's available balance
      user.availableBalance -= Number.parseFloat(amount)

      // Save PayPal email for future withdrawals
      if (!user.paypalEmail) {
        user.paypalEmail = paypalEmail
      }

      await user.save()

      // Create notification
      const notification = await Notification.create({
        recipient: userId,
        type: "payment",
        message: `Your withdrawal of $${amount} has been sent to your PayPal account (${paypalEmail}).`,
        relatedId: withdrawal._id,
        onModel: "Transaction",
      })

      // Send real-time notification
      sendNotification(userId, notification)

      return NextResponse.json({
        success: true,
        message: `Withdrawal of $${amount} has been sent to your PayPal account (${paypalEmail}).`,
        withdrawal,
        newBalance: user.availableBalance,
      })
    } catch (paypalError) {
      console.error("PayPal payout error:", paypalError.response?.data || paypalError)

      // Update transaction to failed
      withdrawal.status = "failed"
      withdrawal.description += " - Failed: " + (paypalError.response?.data?.message || paypalError.message)
      await withdrawal.save()

      return NextResponse.json(
        {
          success: false,
          message:
            paypalError.response?.data?.message ||
            "Failed to process PayPal withdrawal. Please try again later or contact support.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Withdrawal error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
