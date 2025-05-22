import mongoose from "mongoose"

const QuoteSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    message: {
      type: String,
      required: [true, "Please add a message"],
      maxlength: [500, "Message cannot be more than 500 characters"],
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

export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema)
