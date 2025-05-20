"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { notificationAPI } from "@/lib/api"
import { useAuth } from "./auth-context"
import { useWebSocket } from "@/hooks/use-websocket"

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { connected, sendMessage, subscribe, unsubscribe } = useWebSocket()

  // Fetch notifications on initial load
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      fetchNotifications()

      // Subscribe to user-specific notification channel
      subscribe(`user:${user._id}:notifications`, handleNewNotification)

      return () => {
        // Unsubscribe when component unmounts
        unsubscribe(`user:${user._id}:notifications`)
      }
    }
  }, [isAuthenticated, user, subscribe, unsubscribe])

  // Handle new notifications from WebSocket
  const handleNewNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev])
    setUnreadCount((prev) => prev + 1)
  }, [])

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const { success, notifications, unreadCount } = await notificationAPI.getUserNotifications()
      if (success) {
        setNotifications(notifications || [])
        setUnreadCount(unreadCount || 0)
      }
    } catch (error) {
      console.error("Fetch notifications error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { success } = await notificationAPI.markAsRead(notificationId)
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        // Inform server via WebSocket that notification was read
        if (connected && user?._id) {
          sendMessage({
            type: "notification_read",
            userId: user._id,
            notificationId,
          })
        }
      }
    } catch (error) {
      console.error("Mark notification error:", error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { success } = await notificationAPI.markAllAsRead()
      if (success) {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        setUnreadCount(0)

        // Inform server via WebSocket that all notifications were read
        if (connected && user?._id) {
          sendMessage({
            type: "notifications_read_all",
            userId: user._id,
          })
        }
      }
    } catch (error) {
      console.error("Mark all notifications error:", error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        connected: connected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
