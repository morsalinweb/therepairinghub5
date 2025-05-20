// WebSocket client utilities

// Event emitter for real-time updates
export const eventEmitter = {
  events: {},
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback)
    }
  },
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data))
    }
  },
}

// Real-time updates utility
export const useRealTimeUpdates = () => {
  // Get WebSocket instance
  const getWebSocket = () => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") return null

    // Get token from localStorage
    const token = localStorage.getItem("auth_token")
    if (!token) return null

    // Create WebSocket URL with token
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`

    // Create and return WebSocket instance
    return new WebSocket(wsUrl)
  }

  // Send message through WebSocket
  const sendMessage = async (jobId, recipientId, content) => {
    try {
      // First send through REST API
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          jobId,
          receiverId: recipientId,
          content,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Emit event for local state update
        eventEmitter.emit("new_message", data.message)
        return true
      }

      return false
    } catch (error) {
      console.error("Error sending message:", error)
      return false
    }
  }

  // Subscribe to job updates
  const subscribeToJobUpdates = (jobId, callback) => {
    if (!jobId) return () => {}

    // Create WebSocket if needed
    const ws = getWebSocket()

    if (ws) {
      // Subscribe to job updates when WebSocket is open
      const onOpen = () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            channel: `job:${jobId}:updates`,
          }),
        )
      }

      // Handle WebSocket open event
      if (ws.readyState === WebSocket.OPEN) {
        onOpen()
      } else {
        ws.addEventListener("open", onOpen)
      }

      // Handle WebSocket messages
      const onMessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.channel === `job:${jobId}:updates`) {
            callback(data.payload)
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      ws.addEventListener("message", onMessage)

      // Return cleanup function
      return () => {
        ws.removeEventListener("message", onMessage)

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "unsubscribe",
              channel: `job:${jobId}:updates`,
            }),
          )
        }
      }
    }

    // Register event listener as fallback
    return eventEmitter.on(`job:${jobId}:updates`, callback)
  }

  // Start polling for messages
  const startMessagePolling = (jobId, recipientId) => {
    if (!jobId || !recipientId) return

    // Create WebSocket if needed
    const ws = getWebSocket()

    if (ws) {
      // Subscribe to message updates when WebSocket is open
      const onOpen = () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            channel: `job:${jobId}:messages:${recipientId}`,
          }),
        )
      }

      // Handle WebSocket open event
      if (ws.readyState === WebSocket.OPEN) {
        onOpen()
      } else {
        ws.addEventListener("open", onOpen)
      }
    }
  }

  // Stop polling for messages
  const stopMessagePolling = () => {
    // This is handled by the WebSocket connection closing
    // or by unsubscribing from specific channels
  }

  return {
    eventEmitter,
    sendMessage,
    subscribeToJobUpdates,
    startMessagePolling,
    stopMessagePolling,
  }
}
