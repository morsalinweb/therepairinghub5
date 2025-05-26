import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import User from "../../../../models/User"
import Transaction from "../../../../models/Transaction"
import Notification from "../../../../models/Notification"

export async function POST(req) {
    try {
        await connectToDatabase()

        console.log("Checking for jobs to auto-complete...")

        // Find jobs that are in progress and past their escrow end date
        const now = new Date()
        const jobsToComplete = await Job.find({
            status: "in_progress",
            escrowEndDate: { $lte: now },
        })
            .populate("postedBy", "name email")
            .populate("hiredProvider", "name email")

        console.log(`Found ${jobsToComplete.length} jobs to auto-complete`)

        const completedJobs = []

        for (const job of jobsToComplete) {
            try {
                // Update job status to completed
                const updatedJob = await Job.findByIdAndUpdate(
                    job._id,
                    {
                        status: "completed",
                        completedAt: new Date(),
                    },
                    { new: true },
                )
                    .populate("postedBy", "name email avatar")
                    .populate("hiredProvider", "name email avatar")

                // Release payment to provider
                if (job.hiredProvider) {
                    await User.findByIdAndUpdate(job.hiredProvider._id, {
                        $inc: {
                            availableBalance: job.price,
                            totalEarnings: job.price,
                        },
                    })

                    // Update transaction status
                    await Transaction.findOneAndUpdate({ job: job._id, type: "job_payment" }, { status: "completed" })

                    // Create notification for provider
                    await Notification.create({
                        recipient: job.hiredProvider._id,
                        sender: job.postedBy._id,
                        type: "job_completed",
                        message: `Job auto-completed: ${job.title}. Payment has been released.`,
                        relatedId: job._id,
                        onModel: "Job",
                    })

                    // Create notification for job poster
                    await Notification.create({
                        recipient: job.postedBy._id,
                        sender: job.hiredProvider._id,
                        type: "job_completed",
                        message: `Job auto-completed: ${job.title}. Escrow period has ended.`,
                        relatedId: job._id,
                        onModel: "Job",
                    })
                }

                completedJobs.push(updatedJob)
                console.log(`Auto-completed job: ${job.title}`)
            } catch (error) {
                console.error(`Error auto-completing job ${job._id}:`, error)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Auto-completed ${completedJobs.length} jobs`,
            completedJobs,
        })
    } catch (error) {
        console.error("Auto-complete jobs error:", error)
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
