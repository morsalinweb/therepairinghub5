import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import { handleProtectedRoute } from "../../../../lib/auth"
import { updateEscrowPeriod, getEscrowPeriodMinutes } from "../../../../lib/payment"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Admin"])
    if (!authResult.success) {
      return authResult
    }

    const escrowPeriodMinutes = getEscrowPeriodMinutes()

    return NextResponse.json({
      success: true,
      escrowPeriodMinutes,
    })
  } catch (error) {
    console.error("Get escrow period error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Admin"])
    if (!authResult.success) {
      return authResult
    }

    const { minutes } = await req.json()

    if (!minutes || isNaN(minutes) || minutes < 1) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid escrow period in minutes (minimum 1)" },
        { status: 400 },
      )
    }

    const result = await updateEscrowPeriod(Number.parseInt(minutes, 10))

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      escrowPeriodMinutes: result.escrowPeriodMinutes,
      message: `Escrow period updated to ${result.escrowPeriodMinutes} minutes`,
    })
  } catch (error) {
    console.error("Update escrow period error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
