"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, CreditCard, ShoppingCartIcon as Paypal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { jobAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export default function PaymentModal({ isOpen, onClose, jobId, providerId, providerName, amount, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Update the handlePayment function to properly handle both payment methods
  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const totalAmount = amount * 1.1 // Include the 10% service fee

    try {
      // Use the correct API method for payment processing
      const response = await jobAPI.processPayment(jobId, providerId, paymentMethod)

      if (response.success) {
        // For PayPal, redirect to the approval URL
        if (paymentMethod === "paypal" && response.payment?.approvalUrl) {
          window.location.href = response.payment.approvalUrl
          return // Don't close modal or show success yet
        }

        // For Stripe, redirect to the checkout URL
        if (paymentMethod === "card" && response.payment?.checkoutUrl) {
          window.location.href = response.payment.checkoutUrl
          return // Don't close modal or show success yet
        }

        // Generic success case
        toast({
          title: "Provider hired",
          description: response.message || `You have hired ${providerName}.`,
        })
        onSuccess(response.job)
        onClose()
      } else {
        throw new Error(response.message || "Payment failed")
      }
    } catch (error) {
      console.error("Payment error:", error)

      let errorMessage = "There was a problem processing your payment."

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      })

      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
          <AlertDialogDescription>
            A 10% service fee will be added to your job budget for platform services.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Job Budget:</span>
              <span>${amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Fee (10%):</span>
              <span>${(amount * 0.1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>${(amount * 1.1).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium mb-2">Select Payment Method:</p>

            <div
              className={`border rounded-lg p-4 cursor-pointer flex items-center ${paymentMethod === "card" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
              onClick={() => setPaymentMethod("card")}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              <span>Credit or Debit Card</span>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer flex items-center ${paymentMethod === "paypal" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
              onClick={() => setPaymentMethod("paypal")}
            >
              <Paypal className="h-5 w-5 mr-2" />
              <span>PayPal</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePayment} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${(amount * 1.1).toFixed(2)}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
