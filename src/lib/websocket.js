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

    // Store temporary connection
    const tempId = Date.now().toString()
    clients.set(tempId, ws)
    ws.tempId = tempId

    // Handle incoming messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString())
        console.log(`Received message:`, data)

        // Handle authentication
        if (data.type === "auth") {
          const userId = data.userId

          if (userId) {
            // Remove temporary connection
            clients.delete(ws.tempId)

            // Store authenticated connection
            clients.set(userId.toString(), ws)
            ws.userId = userId.toString()

            console.log(`WebSocket client authenticated: ${userId}`)

            // Send confirmation
            ws.send(
              JSON.stringify({
                type: "auth_success",
                userId: userId.toString(),
              }),
            )
          }
        }
        // Handle JWT authentication
        else if (data.type === "auth_token" && token) {
          try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const userId = decoded.id

            // Remove temporary connection
            clients.delete(ws.tempId)

            // Store authenticated connection
            clients.set(userId.toString(), ws)
            ws.userId = userId.toString()

            console.log(`WebSocket client authenticated with JWT: ${userId}`)

            // Send confirmation
            ws.send(
              JSON.stringify({
                type: "auth_success",
                userId: userId.toString(),
              }),
            )
          } catch (error) {
            console.error("WebSocket JWT authentication error:", error)
            ws.send(
              JSON.stringify({
                type: "auth_error",
                message: "Invalid token",
              }),
            )
          }
        }
        // Handle job room subscription
        else if (data.type === "join_job") {
          if (!jobSubscriptions.has(data.jobId)) {
            jobSubscriptions.set(data.jobId, new Set())
          }

          // Add user to job room
          if (ws.userId) {
            jobSubscriptions.get(data.jobId).add(ws.userId)
            console.log(`User ${ws.userId} joined job room: ${data.jobId}`)
          } else {
            jobSubscriptions.get(data.jobId).add(ws.tempId)
            console.log(`Temporary user ${ws.tempId} joined job room: ${data.jobId}`)
          }

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
      const userId = ws.userId || ws.tempId

      if (userId) {
        clients.delete(userId)

        // Remove from job subscriptions
        for (const [jobId, subscribers] of jobSubscriptions.entries()) {
          subscribers.delete(userId)
          if (subscribers.size === 0) {
            jobSubscriptions.delete(jobId)
          }
        }

        console.log(`WebSocket client disconnected: ${userId}`)
      }
    })

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "Connected to WebSocket server",
      }),
    )
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
