"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch } from "@/lib/redux/hooks"
import { addMessage } from "@/lib/redux/slices/messageSlice"
import { addNotification } from "@/lib/redux/slices/notificationSlice"

export function useWebSocket() {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const reconnectTimeoutRef = useRef(null)
  const jobSubscriptionsRef = useRef(new Set())

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const connectWebSocket = () => {
      try {
        console.log(
          "Connecting to WebSocket:",
          `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`,
        )
        const ws = new WebSocket(
          `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`,
        )

        ws.onopen = () => {
          console.log("WebSocket connection established")
          setIsConnected(true)
          setSocket(ws)

          // Resubscribe to job updates
          jobSubscriptionsRef.current.forEach((jobId) => {
            ws.send(JSON.stringify({ type: "join_job", jobId }))
          })
        }

        ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason)
          setIsConnected(false)
          setSocket(null)

          // Attempt to reconnect after delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...")
            connectWebSocket()
          }, 3000)
        }

        ws.onerror = (error) => {
          console.error("WebSocket error:", error)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log("WebSocket message received:", data)

            // Handle different message types
            switch (data.type) {
              case "new_message":
                handleNewMessage(data)
                break
              case "job_update":
                handleJobUpdate(data)
                break
              case "notification":
                handleNotification(data)
                break
              default:
                console.log("Unknown message type:", data.type)
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error)
          }
        }

        return ws
      } catch (error) {
        console.error("Error creating WebSocket connection:", error)
        return null
      }
    }

    const ws = connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (ws) {
        ws.close()
      }
    }
  }, [isAuthenticated, user, dispatch])

  // Handle new message
  const handleNewMessage = useCallback(
    (data) => {
      if (data.message) {
        dispatch(addMessage(data.message))

        // Dispatch custom event for real-time updates
        window.dispatchEvent(
          new CustomEvent("message-received", {
            detail: data.message,
          }),
        )

        // Show toast notification if the message is for the current user
        if (data.message.recipient && data.message.recipient._id === user?._id) {
          toast({
            title: `New message from ${data.message.sender?.name || "User"}`,
            description: data.message.message?.substring(0, 50) + (data.message.message?.length > 50 ? "..." : ""),
          })
        }
      }

      if (data.notification) {
        dispatch(addNotification(data.notification))

        // Dispatch custom event for notification updates
        window.dispatchEvent(
          new CustomEvent("notification-update", {
            type: "notification/addNotification",
            payload: data.notification,
          }),
        )
      }
    },
    [dispatch, toast, user],
  )

  // Handle job update
  const handleJobUpdate = useCallback((data) => {
    // Dispatch custom event for job updates
    window.dispatchEvent(
      new CustomEvent("job-update", {
        detail: data,
      }),
    )
  }, [])

  // Handle notification
  const handleNotification = useCallback(
    (data) => {
      if (data.notification) {
        dispatch(addNotification(data.notification))

        toast({
          title: "New Notification",
          description: data.notification.message,
        })
      }
    },
    [dispatch, toast],
  )

  // Subscribe to job updates
  const subscribeToJobUpdates = useCallback(
    (jobId, callback) => {
      if (!jobId) return () => {}

      jobSubscriptionsRef.current.add(jobId)

      if (socket && isConnected) {
        socket.send(JSON.stringify({ type: "join_job", jobId }))
      }

      // Add event listener for job updates
      const handleJobEvent = (event) => {
        if (event.detail && event.detail.jobId === jobId) {
          callback(event.detail)
        }
      }

      window.addEventListener("job-update", handleJobEvent)

      return () => {
        jobSubscriptionsRef.current.delete(jobId)
        window.removeEventListener("job-update", handleJobEvent)
      }
    },
    [socket, isConnected],
  )

  // Send a message through WebSocket
  const sendMessage = useCallback(
    (data) => {
      if (socket && isConnected) {
        socket.send(JSON.stringify(data))
        return true
      }
      return false
    },
    [socket, isConnected],
  )

  return {
    socket,
    isConnected,
    sendMessage,
    subscribeToJobUpdates,
  }
}
