import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "message",
        "quote_received",
        "quote_accepted",
        "quote_rejected",
        "job_update",
        "job_completed",
        "payment_received",
        "review_received",
        "hired",
        "system",
        "reminder",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "onModel",
    },
    onModel: {
      type: String,
      enum: ["Job", "Quote", "Message", "Review", "User"],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index({ read: 1 })

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema)

export default Notification
