// /lib/payment.js
import Stripe from "stripe"
import axios from "axios"
import Transaction from "../models/Transaction"
import Job from "../models/Job"
import User from "../models/User"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Create Stripe checkout session
// Updated createStripeCheckoutSession function
export const createStripeCheckoutSession = async ({
  jobId,
  providerId,
  amount,
  customerEmail,
  customerName,
  customerId,
}) => {
  try {
    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1 * 100) / 100
    const totalAmount = amount + serviceFee

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Payment for job #${jobId}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        jobId: jobId.toString(),
        providerId: providerId.toString(),
        serviceFee: serviceFee.toString(),
      },
      customer_email: customerEmail,
      success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/success?jobId=${jobId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/cancel`,
    })

    // Create transaction record with both user and customer fields
    const transaction = await Transaction.create({
      job: jobId,
      user: customerId || customerEmail, // Store customer ID if available, otherwise email
      customer: customerId || customerEmail, // Added customer field to match schema requirements
      provider: providerId,
      amount: totalAmount,
      serviceFee,
      type: "job_payment",
      paymentMethod: "stripe",
      status: "pending",
      paymentId: session.id,
      description: `Payment for job #${jobId}`,
    })

    return {
      id: session.id,
      url: session.url,
      transaction,
    }
  } catch (error) {
    console.error("Stripe checkout error:", error)
    throw error
  }
}

// Updated processStripePayment function
export const processStripePayment = async (amount, jobId, customerId, description) => {
  try {
    // Get customer from database
    const customer = await User.findById(customerId)
    if (!customer) {
      throw new Error("Customer not found")
    }

    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1 * 100) / 100
    const totalAmount = amount + serviceFee

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Payment for job: ${description}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        jobId: jobId.toString(),
        customerId: customerId.toString(),
        serviceFee: serviceFee.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/success?jobId=${jobId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/cancel`,
    })

    // Create transaction record with both user and customer fields
    const transaction = await Transaction.create({
      job: jobId,
      user: customerId,
      customer: customerId, // Added customer field to match schema requirements
      amount: totalAmount,
      serviceFee,
      type: "job_payment",
      paymentMethod: "card",
      status: "pending",
      paymentId: session.id,
    })

    return {
      success: true,
      checkoutUrl: session.url,
      transaction,
    }
  } catch (error) {
    console.error("Stripe payment error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Process payment with PayPal

// Updated processPayPalPayment function
export const processPayPalPayment = async (amount, jobId, customerId, description) => {
  try {
    // Get customer from database
    const customer = await User.findById(customerId)
    if (!customer) {
      throw new Error("Customer not found")
    }

    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1 * 100) / 100
    const totalAmount = amount + serviceFee

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

    // Create PayPal order
    const orderResponse = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: totalAmount.toFixed(2),
            },
            description: `Payment for job: ${description}`,
          },
        ],
        application_context: {
          brand_name: "Repairing Hub",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/success?jobId=${jobId}`,
          cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/payments/cancel`,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    // Create transaction record with both user and customer fields
    const transaction = await Transaction.create({
      job: jobId,
      user: customerId,
      customer: customerId, // Added customer field to match schema requirements
      amount: totalAmount,
      serviceFee,
      type: "job_payment",
      paymentMethod: "paypal",
      status: "pending",
      paymentId: orderResponse.data.id,
    })

    return {
      success: true,
      paypalOrderId: orderResponse.data.id,
      approvalUrl: orderResponse.data.links.find((link) => link.rel === "approve").href,
      transaction,
    }
  } catch (error) {
    console.error("PayPal payment error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Capture PayPal payment
export const capturePayPalPayment = async (orderId) => {
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

    // Capture the payment
    const captureResponse = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    // Update transaction status
    const transaction = await Transaction.findOneAndUpdate(
      { paymentId: orderId },
      { status: "in_escrow" },
      { new: true },
    )

    if (!transaction) {
      throw new Error("Transaction not found")
    }

    // Update job payment status
    const job = await Job.findByIdAndUpdate(
      transaction.job,
      {
        status: "in_progress",
        paymentStatus: "in_escrow",
        transactionId: transaction._id,
        escrowEndDate: new Date(Date.now() +  10000), // Default 1 minute
      },
      { new: true },
    )

    return {
      success: true,
      transaction,
      job,
    }
  } catch (error) {
    console.error("PayPal capture error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Release payment to provider
export const releasePayment = async (jobId) => {
  try {
    // Get job with transaction
    const job = await Job.findById(jobId)
    if (!job) {
      throw new Error("Job not found")
    }

    if (!job.hiredProvider) {
      throw new Error("No provider hired for this job")
    }

    if (job.paymentStatus !== "in_escrow") {
      throw new Error("Payment is not in escrow")
    }

    // Get transaction
    const transaction = await Transaction.findById(job.transactionId)
    if (!transaction) {
      throw new Error("Transaction not found")
    }

    // Update transaction
    transaction.provider = job.hiredProvider
    transaction.status = "released"
    await transaction.save()

    // Update job
    job.paymentStatus = "released"
    job.status = "completed"
    job.completedAt = new Date()
    await job.save()

    // Update provider's available balance
    const providerAmount = transaction.amount - transaction.serviceFee
    await User.findByIdAndUpdate(job.hiredProvider, {
      $inc: {
        availableBalance: providerAmount,
        totalEarnings: providerAmount,
      },
    })

    return {
      success: true,
      transaction,
      job,
    }
  } catch (error) {
    console.error("Payment release error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Process withdrawal to PayPal
export const processWithdrawal = async (providerId, amount) => {
  try {
    // Get provider from database
    const provider = await User.findById(providerId)
    if (!provider) {
      throw new Error("Provider not found")
    }

    if (provider.userType !== "Seller") {
      throw new Error("Only service providers can withdraw funds")
    }

    if (provider.availableBalance < amount) {
      throw new Error("Insufficient funds for withdrawal")
    }

    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1 * 100) / 100
    const withdrawalAmount = amount - serviceFee

    // In a real app, you would integrate with PayPal Payouts API here
    // For demo purposes, we'll just create a transaction record

    // Create transaction record
    const transaction = await Transaction.create({
      job: null, // Withdrawal is not tied to a specific job
      user: null,
      provider: providerId,
      amount: withdrawalAmount,
      serviceFee,
      type: "withdrawal",
      paymentMethod: "paypal",
      status: "completed",
      paymentId: `WD-${Date.now()}`,
    })

    // Update provider's available balance
    await User.findByIdAndUpdate(providerId, { $inc: { availableBalance: -amount } })

    return {
      success: true,
      transaction,
      newBalance: provider.availableBalance - amount,
    }
  } catch (error) {
    console.error("Withdrawal error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Get escrow period in minutes
export const getEscrowPeriodMinutes = () => {
  return Number.parseInt(process.env.ESCROW_PERIOD_MINUTES || "1", 10)
}

// Update escrow period
export const updateEscrowPeriod = async (minutes) => {
  try {
    // In a real app, you would update this in your database or environment variables
    // For this demo, we'll just return success
    process.env.ESCROW_PERIOD_MINUTES = minutes.toString()

    return {
      success: true,
      escrowPeriodMinutes: minutes,
    }
  } catch (error) {
    console.error("Update escrow period error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}
