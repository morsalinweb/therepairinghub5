const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const cron = require("node-cron")

const app = express()
const server = http.createServer(app)

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(cors())
app.use(express.json())

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Join job-specific room
  socket.on("join_job", (jobId) => {
    socket.join(`job_${jobId}`)
    console.log(`User ${socket.id} joined job room: job_${jobId}`)
  })

  // Handle new messages
  socket.on("new_message", (data) => {
    console.log("New message received:", data)
    // Broadcast to job room
    socket.to(`job_${data.jobId}`).emit("message_received", data)
  })

  // Handle job updates
  socket.on("job_update", (data) => {
    console.log("Job update received:", data)
    // Broadcast to job room
    socket.to(`job_${data.jobId}`).emit("job_updated", data)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// Auto-complete jobs cron job - runs every minute
cron.schedule("* * * * *", async () => {
  try {
    console.log("Running auto-complete job check...")

    const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/api/jobs/auto-complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auto-complete": "true",
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log("Auto-complete check result:", result)

      // Notify clients about completed jobs
      if (result.completedJobs && result.completedJobs.length > 0) {
        result.completedJobs.forEach((job) => {
          io.to(`job_${job._id}`).emit("job_updated", {
            action: "completed",
            job: job,
          })
        })
      }
    }
  } catch (error) {
    console.error("Auto-complete cron job error:", error)
  }
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})

module.exports = { app, server, io }
