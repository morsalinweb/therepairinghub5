import mongoose from "mongoose"

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a job title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a job description"],
    },
    category: {
      type: String,
      required: [true, "Please provide a job category"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a job price"],
    },
    location: {
      type: String,
      default: "Remote",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hiredProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "pending_payment", "in_escrow", "in_progress", "completed", "cancelled"],
      default: "active",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "in_escrow", "released", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    escrowEndDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Check if model exists before creating
const Job = mongoose.models.Job || mongoose.model("Job", jobSchema)

export default Job
