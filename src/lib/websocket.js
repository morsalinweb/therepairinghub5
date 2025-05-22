// WebSocket server implementation for Next.js
const WebSocket = require("ws")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")

let wss = null
const clients = new Map()
const jobSubscriptions = new Map()

function initializeWebSocketServer(server) {
  // Create WebSocket server
  wss = new WebSocket.Server({
    noServer: true,
    path: "/ws",
  })

  // Handle upgrade requests
  server.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  // Handle connections
  wss.on("connection", (ws, request) => {
    console.log("WebSocket connection established")

    // Extract cookies from request
    const cookies = cookie.parse(request.headers.cookie || "")
    const token = cookies.token

    // Authenticate user
    if (!token) {
      ws.close(1008, "Authentication failed - no token")
      return
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const userId = decoded.id

      // Store client connection with userId
      clients.set(userId.toString(), ws)
      ws.userId = userId.toString()

      console.log(`WebSocket client connected: ${userId}`)

      // Handle incoming messages
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString())
          console.log(`Received message from ${userId}:`, data)

          // Handle different message types
          if (data.type === "join_job") {
            // Join a job room for updates
            if (!jobSubscriptions.has(data.jobId)) {
              jobSubscriptions.set(data.jobId, new Set())
            }
            jobSubscriptions.get(data.jobId).add(userId.toString())
            console.log(`User ${userId} joined job room: ${data.jobId}`)

            // Send confirmation
            ws.send(
              JSON.stringify({
                type: "joined_job",
                jobId: data.jobId,
              }),
            )
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error)
        }
      })

      // Handle disconnection
      ws.on("close", () => {
        clients.delete(userId.toString())

        // Remove from job subscriptions
        for (const [jobId, subscribers] of jobSubscriptions.entries()) {
          subscribers.delete(userId.toString())
          if (subscribers.size === 0) {
            jobSubscriptions.delete(jobId)
          }
        }

        console.log(`WebSocket client disconnected: ${userId}`)
      })

      // Send initial connection confirmation
      ws.send(
        JSON.stringify({
          type: "connected",
          userId: userId.toString(),
        }),
      )
    } catch (error) {
      console.error("WebSocket authentication error:", error)
      ws.close(1008, "Authentication failed - invalid token")
    }
  })

  console.log("WebSocket server initialized")
  return wss
}

// Send a message to a specific user
function sendWebSocketMessage(userId, data) {
  const client = clients.get(userId.toString())
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data))
    return true
  }
  return false
}

// Broadcast a message to all clients in a job room
function broadcastToJob(jobId, data, excludeUserId = null) {
  let recipientCount = 0

  const subscribers = jobSubscriptions.get(jobId)
  if (subscribers) {
    for (const userId of subscribers) {
      if (userId !== excludeUserId) {
        const client = clients.get(userId)
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data))
          recipientCount++
        }
      }
    }
  }

  return recipientCount
}

// Close all connections
function closeAllConnections() {
  if (wss) {
    wss.clients.forEach((client) => {
      client.close()
    })
  }
}

module.exports = {
  initializeWebSocketServer,
  sendWebSocketMessage,
  broadcastToJob,
  closeAllConnections,
}
