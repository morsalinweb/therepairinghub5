import mongoose from "mongoose"

const DeletedUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["Buyer", "Seller", "Admin"],
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    clerkId: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
)

// Create model if it doesn't exist already
const DeletedUser = mongoose.models.DeletedUser || mongoose.model("DeletedUser", DeletedUserSchema)

export default DeletedUser
