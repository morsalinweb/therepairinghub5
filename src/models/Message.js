import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  {
    timestamps: true,
  },
)

// Create a compound index for conversations
messageSchema.index({ job: 1, sender: 1, recipient: 1 })

// Export the model
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema)

export default Message
