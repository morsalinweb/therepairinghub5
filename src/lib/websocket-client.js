"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

// Create a global event emitter for real-time updates
class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
    return () => this.off(event, listener)
  }

  off(event, listener) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter((l) => l !== listener)
  }

  emit(event, ...args) {
    if (!this.events[event]) return
    this.events[event].forEach((listener) => listener(...args))
  }
}

// Create a singleton instance
export const eventEmitter =
  typeof window !== "undefined" ? window.eventEmitter || new EventEmitter() : new EventEmitter()

// Assign to window in browser environment
if (typeof window !== "undefined") {
  window.eventEmitter = eventEmitter
}

// Hook for real-time updates
export function useRealTimeUpdates() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [isPolling, setIsPolling] = useState(false)
  const [lastMessageTime, setLastMessageTime] = useState(Date.now())
  const [currentJobId, setCurrentJobId] = useState(null)
  const [currentRecipientId, setCurrentRecipientId] = useState(null)

  // Start polling for new messages
  const startMessagePolling = useCallback(
    (jobId, recipientId) => {
      if (!jobId || !recipientId || !isAuthenticated) return

      setCurrentJobId(jobId)
      setCurrentRecipientId(recipientId)
      setIsPolling(true)
    },
    [isAuthenticated],
  )

  // Stop polling
  const stopMessagePolling = useCallback(() => {
    setIsPolling(false)
    setCurrentJobId(null)
    setCurrentRecipientId(null)
  }, [])

  // Poll for new messages
  useEffect(() => {
    if (!isPolling || !currentJobId || !currentRecipientId || !isAuthenticated) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/messages?job=${currentJobId}&user=${currentRecipientId}&since=${lastMessageTime}`,
          {
            credentials: "include",
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages && data.messages.length > 0) {
            // Update last message time
            const newestMessage = data.messages.reduce(
              (newest, msg) =>
                new Date(msg.createdAt).getTime() > new Date(newest.createdAt).getTime() ? msg : newest,
              data.messages[0],
            )

            setLastMessageTime(new Date(newestMessage.createdAt).getTime())

            // Emit event for new messages
            data.messages.forEach((message) => {
              eventEmitter.emit("new_message", message)
            })
          }
        }
      } catch (error) {
        console.error("Error polling for messages:", error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [isPolling, currentJobId, currentRecipientId, lastMessageTime, isAuthenticated])

  // Subscribe to job updates
  const subscribeToJobUpdates = useCallback((jobId, callback) => {
    if (!jobId) return () => {}

    // Set up event listener
    const unsubscribe = eventEmitter.on(`job_update_${jobId}`, callback)

    // Start polling for this job
    setCurrentJobId(jobId)

    return unsubscribe
  }, [])

  // Send a message
  const sendMessage = useCallback(
    async (jobId, receiverId, content) => {
      if (!jobId || !receiverId || !content || !isAuthenticated) return false

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            jobId,
            receiverId,
            content,
          }),
        })

        const data = await response.json()

        if (data.success && data.message) {
          // Emit event for the new message
          eventEmitter.emit("new_message", data.message)
          return true
        }

        return false
      } catch (error) {
        console.error("Error sending message:", error)
        return false
      }
    },
    [isAuthenticated],
  )

  return {
    startMessagePolling,
    stopMessagePolling,
    subscribeToJobUpdates,
    sendMessage,
    isPolling,
  }
}
