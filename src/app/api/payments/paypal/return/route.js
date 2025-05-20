import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import { capturePayPalPayment } from "../../../../lib/payment"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Get the PayPal order ID from the query parameters
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(`${process.env.FRONTEND_URL || "/"}/payment-error?error=missing_token`)
    }

    // Capture the payment
    const captureResult = await capturePayPalPayment(token)

    if (!captureResult.success) {
      return NextResponse.redirect(
        `${process.env.FRONTEND_URL || "/"}/payment-error?error=${encodeURIComponent(captureResult.error)}`,
      )
    }

    // Get the job ID from the transaction
    const transaction = captureResult.transaction
    if (!transaction || !transaction.job) {
      return NextResponse.redirect(`${process.env.FRONTEND_URL || "/"}/payment-error?error=transaction_not_found`)
    }

    // Redirect to the job page
    return NextResponse.redirect(`${process.env.FRONTEND_URL || "/"}/jobs/${transaction.job}`)
  } catch (error) {
    console.error("PayPal return error:", error)
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL || "/"}/payment-error?error=${encodeURIComponent(error.message)}`,
    )
  }
}
