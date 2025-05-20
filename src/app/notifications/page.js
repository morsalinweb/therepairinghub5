"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bell, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"

export default function NotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login")
        return
      }

      setIsLoading(false)
    }
  }, [user, isAuthenticated, authLoading, router])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    toast({
      title: "All notifications marked as read",
      description: "Your notifications have been updated.",
    })
  }

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "job_posted":
        return "📝"
      case "quote_received":
        return "💼"
      case "hired":
        return "🎉"
      case "job_completed":
        return "✅"
      case "payment_received":
        return "💰"
      case "message_received":
        return "💬"
      default:
        return "🔔"
    }
  }

  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case "job_posted":
      case "quote_received":
      case "hired":
      case "job_completed":
        return `/jobs/${notification.job?._id}`
      case "message_received":
        return `/jobs/${notification.job?._id}?tab=messages`
      case "payment_received":
        return `/profile?tab=earnings`
      default:
        return "#"
    }
  }

  if (authLoading || isLoading || notificationsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`transition-colors ${!notification.read ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-2xl">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        {!notification.read && <Badge className="mt-1 bg-blue-500">New</Badge>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <Link href={getNotificationLink(notification)}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="text-blue-600"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No notifications</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have any notifications at the moment.</p>
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
