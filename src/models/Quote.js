import mongoose from "mongoose"

// Check if the model is already registered
const QuoteSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job is required"],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider is required"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    message: {
      type: String,
      required: [true, "Please add a message"],
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better performance
QuoteSchema.index({ job: 1, provider: 1 }, { unique: true })
QuoteSchema.index({ job: 1 })
QuoteSchema.index({ provider: 1 })
QuoteSchema.index({ status: 1 })

// Use mongoose.models to check if the model exists already
const Quote = mongoose.models.Quote || mongoose.model("Quote", QuoteSchema)

export default Quote
