"use client"

import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock } from "lucide-react"

export default function CountdownTimer({ endDate, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())
  const [isComplete, setIsComplete] = useState(false)

  function calculateTimeLeft() {
    const difference = new Date(endDate) - new Date()

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
      }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    }
  }

  useEffect(() => {
    if (isComplete) return

    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)

      if (newTimeLeft.total <= 0 && !isComplete) {
        setIsComplete(true)
        if (onComplete) onComplete()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, isComplete, onComplete, endDate])

  const formatTime = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
    } else {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`
    }
  }

  if (isComplete) {
    return <div className="text-sm text-gray-500">Time expired</div>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
          <Clock className="h-4 w-4" />
          <span>{formatTime()}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>The job will be marked as complete automatically after this time ends</p>
          <p className="text-xs mt-1">Auto-completion: {new Date(endDate).toLocaleString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
