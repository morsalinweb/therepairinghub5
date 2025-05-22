import mongoose from "mongoose"

const TransactionSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      // Making job field optional for withdrawals
      required: false,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Please add an amount"],
    },
    serviceFee: {
      type: Number,
      required: [true, "Please add a service fee"],
    },
    type: {
      type: String,
      enum: ["job_payment", "withdrawal", "refund"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "paypal"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "in_escrow", "released"],
      default: "pending",
    },
    paymentId: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    paypalBatchId: {
      type: String,
      default: null,
    },
    paypalPayoutItemId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema)
