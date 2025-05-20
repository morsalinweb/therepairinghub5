"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"

// Create an event emitter for WebSocket events
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

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const { user, isAuthenticated } = useAuth()
  const socket = useRef(null)
  const subscriptions = useRef(new Set())
  const reconnectTimeout = useRef(null)
  const maxReconnectAttempts = 5

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!isAuthenticated || !user?._id) return

    // Get token from localStorage
    const token = localStorage.getItem("auth_token")
    if (!token) return

    // Close existing connection if any
    if (socket.current && socket.current.readyState !== WebSocket.CLOSED) {
      socket.current.close()
    }

    // Create new WebSocket connection with auth token
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`

    socket.current = new WebSocket(wsUrl)

    socket.current.onopen = () => {
      console.log("WebSocket connected")
      setConnected(true)
      setReconnectAttempts(0)

      // Resubscribe to all channels
      subscriptions.current.forEach((channel) => {
        sendMessage({
          type: "subscribe",
          channel,
        })
      })
    }

    socket.current.onclose = (event) => {
      console.log("WebSocket disconnected", event)
      setConnected(false)

      // Attempt to reconnect if not closed intentionally
      if (event.code !== 1000) {
        attemptReconnect()
      }
    }

    socket.current.onerror = (error) => {
      console.error("WebSocket error:", error)
      setConnected(false)
    }

    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle different message types
        switch (data.type) {
          case "notification":
            eventEmitter.emit("notification", data.payload)
            break
          case "message":
            eventEmitter.emit("new_message", data.payload)
            break
          case "job_update":
            eventEmitter.emit("job_update", data.payload)
            break
          default:
            // If the message has a channel, emit event for that channel
            if (data.channel) {
              eventEmitter.emit(data.channel, data.payload)
            }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    return () => {
      if (socket.current) {
        socket.current.close(1000, "Component unmounted")
      }
    }
  }, [isAuthenticated, user])

  // Attempt to reconnect with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log("Max reconnect attempts reached")
      return
    }

    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`)

    clearTimeout(reconnectTimeout.current)
    reconnectTimeout.current = setTimeout(() => {
      setReconnectAttempts((prev) => prev + 1)
      connect()
    }, delay)
  }, [reconnectAttempts, connect])

  // Connect on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      connect()
    }

    return () => {
      clearTimeout(reconnectTimeout.current)
      if (socket.current) {
        socket.current.close(1000, "Component unmounted")
      }
    }
  }, [isAuthenticated, user, connect])

  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected")
      return false
    }

    socket.current.send(JSON.stringify(data))
    return true
  }, [])

  // Subscribe to a channel
  const subscribe = useCallback(
    (channel, callback) => {
      if (!channel) return () => {}

      // Add to subscriptions set
      subscriptions.current.add(channel)

      // Subscribe on server if connected
      if (connected && socket.current) {
        sendMessage({
          type: "subscribe",
          channel,
        })
      }

      // Register event listener
      return eventEmitter.on(channel, callback)
    },
    [connected, sendMessage],
  )

  // Unsubscribe from a channel
  const unsubscribe = useCallback(
    (channel) => {
      if (!channel) return

      // Remove from subscriptions set
      subscriptions.current.delete(channel)

      // Unsubscribe on server if connected
      if (connected && socket.current) {
        sendMessage({
          type: "unsubscribe",
          channel,
        })
      }
    },
    [connected, sendMessage],
  )

  // Real-time updates for jobs
  const subscribeToJobUpdates = useCallback(
    (jobId, callback) => {
      if (!jobId) return () => {}

      const channel = `job:${jobId}:updates`
      return subscribe(channel, callback)
    },
    [subscribe],
  )

  // Start polling for messages
  const startMessagePolling = useCallback(
    (jobId, recipientId) => {
      if (!jobId || !recipientId) return

      const channel = `job:${jobId}:messages:${recipientId}`
      subscriptions.current.add(channel)

      if (connected && socket.current) {
        sendMessage({
          type: "subscribe",
          channel,
        })
      }
    },
    [connected, sendMessage],
  )

  // Stop polling for messages
  const stopMessagePolling = useCallback(() => {
    // We'll handle this through the unsubscribe mechanism
    // when specific channels are provided
  }, [])

  return {
    connected,
    sendMessage,
    subscribe,
    unsubscribe,
    subscribeToJobUpdates,
    startMessagePolling,
    stopMessagePolling,
    reconnectAttempts,
    maxReconnectAttempts,
  }
}
