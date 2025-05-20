import mongoose from "mongoose"

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["message", "quote", "job_posted", "job_updated", "job_completed", "payment", "review", "system"],
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
      enum: ["Job", "Quote", "Message", "Review", "Transaction"],
    },
  },
  { timestamps: true },
)

// Create indexes for better performance
NotificationSchema.index({ recipient: 1, read: 1 })
NotificationSchema.index({ recipient: 1, createdAt: -1 })

// Export the model
const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)

export default Notification
