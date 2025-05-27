import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Transaction from "../../../../../models/Transaction"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get("paymentId")
    const PayerID = searchParams.get("PayerID")
    const token = searchParams.get("token")

    if (!paymentId || !PayerID) {
      return NextResponse.redirect(new URL("/payments/cancel", req.url))
    }

    // Find the transaction
    const transaction = await Transaction.findOne({
      paypalPaymentId: paymentId,
      status: "pending",
    }).populate("job")

    if (!transaction) {
      console.error("Transaction not found for PayPal payment:", paymentId)
      return NextResponse.redirect(new URL("/payments/cancel", req.url))
    }

    // Update transaction status
    transaction.status = "in_escrow"
    transaction.paypalPayerId = PayerID
    await transaction.save()

    // Update job status to in_progress and set escrow end time
    const job = await Job.findById(transaction.job._id)
    if (job) {
      job.status = "in_progress"
      job.escrowEndTime = new Date(Date.now() + 60 * 1000) // 1 minute from now
      await job.save()

      // Update provider's balance
      const provider = await User.findById(job.hiredProvider)
      if (provider) {
        const providerAmount = transaction.amount - (transaction.serviceFee || 0)
        provider.availableBalance = (provider.availableBalance || 0) + providerAmount
        await provider.save()
      }
    }

    // Redirect to success page
    return NextResponse.redirect(new URL(`/payments/success?transactionId=${transaction._id}`, req.url))
  } catch (error) {
    console.error("PayPal return error:", error)
    return NextResponse.redirect(new URL("/payments/cancel", req.url))
  }
}
