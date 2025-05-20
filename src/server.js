const express = require("express")
const next = require("next")
const { createServer } = require("http")
const { initializeWebSocketServer } = require("./lib/websocket")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const cors = require("cors")
require("dotenv").config()

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000

app.prepare().then(() => {
  const server = express()

  // Middleware
  server.use(cookieParser())
  server.use(express.json({ limit: "50mb" }))
  server.use(
    cors({
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    }),
  )

  // Create HTTP server
  const httpServer = createServer(server)

  // Initialize WebSocket server
  initializeWebSocketServer(httpServer)

  // Handle all Next.js requests
  server.all("*", (req, res) => {
    return handle(req, res)
  })

  // Connect to MongoDB
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err))

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})
