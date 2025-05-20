"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { messageAPI } from "@/lib/api"
import { useSocket } from "@/hooks/use-socket"

export default function MessagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    fetchConversations()
  }, [isAuthenticated])

  // Listen for new messages
  useEffect(() => {
    if (socket && isConnected && user) {
      const handleNewMessage = (newMsg) => {
        setConversations((prevConversations) => {
          // Find if we already have a conversation with this user for this job
          const existingConvIndex = prevConversations.findIndex(
            (conv) =>
              conv.jobId === newMsg.job &&
              ((conv.otherUserId === newMsg.sender._id && newMsg.recipient._id === user._id) ||
                (conv.otherUserId === newMsg.recipient._id && newMsg.sender._id === user._id)),
          )

          if (existingConvIndex >= 0) {
            // Update existing conversation
            const updatedConversations = [...prevConversations]
            const conv = updatedConversations[existingConvIndex]

            // If the message is from the other user, increment unread count
            if (newMsg.sender._id !== user._id) {
              conv.unreadCount = (conv.unreadCount || 0) + 1
            }

            conv.lastMessage = newMsg.message
            conv.lastMessageTime = new Date().toISOString()

            // Move this conversation to the top
            updatedConversations.splice(existingConvIndex, 1)
            updatedConversations.unshift(conv)

            return updatedConversations
          } else if (newMsg.sender._id === user._id || newMsg.recipient._id === user._id) {
            // Add new conversation
            const otherUser = newMsg.sender._id === user._id ? newMsg.recipient : newMsg.sender
            const newConv = {
              jobId: newMsg.job,
              otherUserId: otherUser._id,
              otherUserName: otherUser.name || otherUser.email,
              otherUserAvatar: otherUser.avatar,
              lastMessage: newMsg.message,
              lastMessageTime: new Date().toISOString(),
              unreadCount: newMsg.sender._id === user._id ? 0 : 1,
            }

            return [newConv, ...prevConversations]
          }

          return prevConversations
        })
      }

      socket.on("new_message", handleNewMessage)

      return () => {
        socket.off("new_message", handleNewMessage)
      }
    }
  }, [socket, isConnected, user])

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const { success, conversations } = await messageAPI.getConversations()

      if (success) {
        setConversations(conversations)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenConversation = (jobId, userId) => {
    // Navigate to the job page with the messages tab open
    router.push(`/jobs/${jobId}?tab=messages&user=${userId}`)

    // Mark messages as read
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv.jobId === jobId && conv.otherUserId === userId) {
          return { ...conv, unreadCount: 0 }
        }
        return conv
      })
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return <div className="container py-10"></div>

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card
              key={`${conversation.jobId}-${conversation.otherUserId}`}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                conversation.unreadCount > 0 ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
              onClick={() => handleOpenConversation(conversation.jobId, conversation.otherUserId)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={conversation.otherUserAvatar || "/placeholder.svg?height=48&width=48"}
                      alt={conversation.otherUserName}
                    />
                    <AvatarFallback>
                      {conversation.otherUserName
                        ? conversation.otherUserName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{conversation.otherUserName}</h3>
                        <p className="text-sm text-gray-500">Job: {conversation.jobTitle}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(conversation.lastMessageTime).toLocaleDateString()} at{" "}
                        {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[80%]">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-blue-500">{conversation.unreadCount}</Badge>
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
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No messages yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't exchanged any messages yet</p>
          <Button asChild>
            <Link href="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
