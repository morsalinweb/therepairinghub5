"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function WithdrawalModal({ isOpen, onClose, onWithdraw, amount, userPaypalEmail = "" }) {
  const [paypalEmail, setPaypalEmail] = useState(userPaypalEmail || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate email
    if (!paypalEmail || !paypalEmail.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
      setError("Please enter a valid PayPal email address")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      await onWithdraw(amount, paypalEmail)
      onClose()
    } catch (error) {
      setError(error.message || "Failed to process withdrawal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw to PayPal</DialogTitle>
          <DialogDescription>
            Enter your PayPal email address to receive ${Number.parseFloat(amount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="paypal-email">PayPal Email Address</Label>
            <Input
              id="paypal-email"
              type="email"
              placeholder="your-email@example.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <div className="flex justify-between mb-2">
              <span>Amount:</span>
              <span className="font-medium">${Number.parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>PayPal Fee:</span>
              <span>${(Number.parseFloat(amount) * 0.029 + 0.3).toFixed(2)}</span>
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between font-medium">
              <span>You'll Receive:</span>
              <span>${(Number.parseFloat(amount) - (Number.parseFloat(amount) * 0.029 + 0.3)).toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw Funds"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
