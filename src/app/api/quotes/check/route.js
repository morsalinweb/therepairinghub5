import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Quote from "../../../../models/Quote"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Job ID is required" }, { status: 400 })
    }

    // Check if user has already submitted a quote for this job
    const existingQuote = await Quote.findOne({
      job: jobId,
      provider: authResult.user._id,
    })

    return NextResponse.json({
      success: true,
      hasQuote: !!existingQuote,
      quote: existingQuote,
    })
  } catch (error) {
    console.error("Check quote error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
