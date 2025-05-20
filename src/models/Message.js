import mongoose from "mongoose"

// Define the Message schema
const MessageSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job is required"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better performance
MessageSchema.index({ job: 1 })
MessageSchema.index({ sender: 1 })
MessageSchema.index({ recipient: 1 })
MessageSchema.index({ createdAt: 1 })
MessageSchema.index({ job: 1, sender: 1, recipient: 1 })

// Use mongoose.models to check if the model exists already
const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema)

export default Message
