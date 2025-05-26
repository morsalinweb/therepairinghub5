import mongoose from "mongoose"

const ReviewSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, "Please add a rating between 1 and 5"],
    },
    comment: {
      type: String,
      required: [true, "Please add a comment"],
      maxlength: [500, "Comment cannot be more than 500 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent user from submitting more than one review per reviewee (across all jobs)
ReviewSchema.index({ reviewer: 1, reviewee: 1 }, { unique: true })

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema)
