import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please add a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    userType: {
      type: String,
      enum: ["Buyer", "Seller", "Admin"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    jobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    quotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quote",
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    balance: {
      type: Number,
      default: 0,
    },
    paypalEmail: {
      type: String,
      default: null,
    },
    conversations: [
      {
        with: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        job: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
          required: true,
        },
        lastMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
        unreadCount: {
          type: Number,
          default: 0,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  },
)

// Create indexes for better performance
userSchema.index({ email: 1 })
userSchema.index({ userType: 1 })
userSchema.index({ "conversations.with": 1, "conversations.job": 1 })

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Export the model
const User = mongoose.models.User || mongoose.model("User", userSchema)

export default User
