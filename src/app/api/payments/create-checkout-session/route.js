// api/payments/create-checkout-session/route.js
import { NextResponse } from "next/server"
import Stripe from "stripe"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import { handleProtectedRoute } from "../../../../lib/auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  try {
    await connectToDatabase()

    const authResult = await handleProtectedRoute(req, ["Buyer", "Admin"])
    if (!authResult.success) {
      return authResult
    }

    const { jobId, providerId } = await req.json()

    if (!jobId || !providerId) {
      return NextResponse.json({ success: false, message: "Job ID and provider ID are required" }, { status: 400 })
    }

    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized" }, { status: 403 })
    }

    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Job must be active" }, { status: 400 })
    }

    const serviceFee = Math.round(job.price * 0.1 * 100) / 100
    const totalAmount = job.price + serviceFee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Hire for: ${job.title}`,
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        jobId,
        providerId,
        postedBy: authResult.user._id.toString(),
        serviceFee: serviceFee.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?jobId=${job._id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/cancel`,
    })

    return NextResponse.json({
      success: true,
      payment: {
        checkoutUrl: session.url,
      },
    })
  } catch (error) {
    console.error("Create checkout session error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
