import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import { handleProtectedRoute } from "../../../../lib/auth"
import { getEscrowPeriodMinutes, updateEscrowPeriod } from "../../../../lib/payment"

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

    // Get current settings
    const settings = {
      escrowPeriodMinutes: getEscrowPeriodMinutes(),
      // Add other settings here as needed
    }

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error("Get settings error:", error)
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

    const { escrowPeriodMinutes } = await req.json()
    const updatedSettings = {}

    // Update escrow period if provided
    if (escrowPeriodMinutes !== undefined) {
      if (isNaN(escrowPeriodMinutes) || escrowPeriodMinutes < 1) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid escrow period in minutes (minimum 1)" },
          { status: 400 },
        )
      }

      const result = await updateEscrowPeriod(Number.parseInt(escrowPeriodMinutes, 10))
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 400 })
      }

      updatedSettings.escrowPeriodMinutes = result.escrowPeriodMinutes
    }

    return NextResponse.json({
      success: true,
      settings: {
        escrowPeriodMinutes: getEscrowPeriodMinutes(),
        // Add other settings here as needed
      },
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
