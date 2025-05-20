import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import { capturePayPalPayment } from "../../../../../lib/payment"
import { handleProtectedRoute } from "../../../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { paymentId, payerId, jobId } = await req.json()

    // Validate input
    if (!paymentId || !payerId || !jobId) {
      return NextResponse.json(
        { success: false, message: "Please provide paymentId, payerId, and jobId" },
        { status: 400 },
      )
    }

    // Capture payment
    const result = await capturePayPalPayment(paymentId)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Payment captured successfully",
      transaction: result.transaction,
      job: result.job,
    })
  } catch (error) {
    console.error("PayPal capture error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
