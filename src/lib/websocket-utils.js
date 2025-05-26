// WebSocket utilities for real-time communication
const wsConnections = new Map()

// Send notification via WebSocket
export const sendNotification = (userId, notification) => {
  try {
    console.log(`Sending notification to user ${userId}:`, notification)

    // In a real implementation, you would send this through your WebSocket server
    // For now, we'll just log it and store it for the user
    const userConnection = wsConnections.get(userId)
    if (userConnection && userConnection.readyState === WebSocket.OPEN) {
      userConnection.send(
        JSON.stringify({
          type: "notification",
          data: notification,
        }),
      )
    }
  } catch (error) {
    console.error("Error sending notification:", error)
  }
}

// Broadcast job update via WebSocket
export const broadcastJobUpdate = (jobId, updateData) => {
  try {
    console.log(`Broadcasting job update for job ${jobId}:`, updateData)

    // Broadcast to all connected clients interested in this job
    wsConnections.forEach((connection, userId) => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(
          JSON.stringify({
            type: "job_update",
            jobId,
            data: updateData,
          }),
        )
      }
    })
  } catch (error) {
    console.error("Error broadcasting job update:", error)
  }
}

// Add WebSocket connection
export const addConnection = (userId, connection) => {
  wsConnections.set(userId, connection)
}

// Remove WebSocket connection
export const removeConnection = (userId) => {
  wsConnections.delete(userId)
}

// Get connection count
export const getConnectionCount = () => {
  return wsConnections.size
}

// Notify about job update (alias for broadcastJobUpdate for compatibility)
export const notifyJobUpdate = (jobId, data) => {
  broadcastJobUpdate(jobId, data)
}

// Send message to a specific user
export const sendMessage = (userId, message) => {
  try {
    console.log(`Sending message to user ${userId}:`, message)
    const userConnection = wsConnections.get(userId)
    if (userConnection && userConnection.readyState === WebSocket.OPEN) {
      userConnection.send(
        JSON.stringify({
          type: "message",
          data: message,
        }),
      )
    }
  } catch (error) {
    console.error("Send message error:", error)
  }
}

// Broadcast system message to all connected users
export const broadcastSystemMessage = (message) => {
  try {
    console.log("Broadcasting system message:", message)
    wsConnections.forEach((connection, userId) => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(
          JSON.stringify({
            type: "system_message",
            data: message,
          }),
        )
      }
    })
  } catch (error) {
    console.error("Broadcast system message error:", error)
  }
}
