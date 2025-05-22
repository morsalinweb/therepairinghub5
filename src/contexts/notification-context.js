"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { notificationAPI } from "@/lib/api"
import { useAuth } from "./auth-context"
import { eventEmitter } from "@/lib/websocket-client"

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()

  // Fetch notifications on auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
    }
  }, [isAuthenticated])

  // Listen for new notifications
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return

    // Use our event emitter for notifications
    const unsubscribe = eventEmitter.on(`notification_${user._id}`, (notification) => {
      if (notification.recipient === user._id) {
        setNotifications((prev) => [notification, ...prev])
        setUnreadCount((prev) => prev + 1)
      }
    })

    return unsubscribe
  }, [isAuthenticated, user])

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      const { success, notifications } = await notificationAPI.getNotifications()

      if (success) {
        setNotifications(notifications || [])
        setUnreadCount(notifications.filter((n) => !n.read).length || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { success } = await notificationAPI.markAsRead(notificationId)

      if (success) {
        setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { success } = await notificationAPI.markAllAsRead()

      if (success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const { success } = await notificationAPI.deleteNotification(notificationId)

      if (success) {
        const notification = notifications.find((n) => n._id === notificationId)
        const wasUnread = notification && !notification.read

        setNotifications((prev) => prev.filter((n) => n._id !== notificationId))

        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
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
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
