"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PaymentSuccess() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [jobId, setJobId] = useState(null)

  useEffect(() => {
    const capturePayment = async () => {
      try {
        const jobId = searchParams.get("jobId")
        const paymentId = searchParams.get("paymentId")
        const payerId = searchParams.get("PayerID")

        if (!jobId) {
          toast({
            title: "Error",
            description: "Missing job information",
            variant: "destructive",
          })
          router.push("/profile")
          return
        }

        setJobId(jobId)

        // If this is a PayPal return with PayerID, we need to capture the payment
        if (paymentId && payerId) {
          const response = await fetch(`/api/payments/paypal/capture`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              paymentId,
              payerId,
              jobId,
            }),
          })

          const data = await response.json()

          if (!data.success) {
            toast({
              title: "Payment Error",
              description: data.message || "Failed to capture payment",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Payment Successful",
              description: "Your payment has been processed successfully",
            })
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Payment capture error:", error)
        toast({
          title: "Payment Error",
          description: "There was a problem processing your payment",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    capturePayment()
  }, [searchParams, router, toast])

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>Your payment has been processed successfully</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for your payment. The service provider has been notified and will begin work on your job.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {jobId && (
            <Button asChild>
              <Link href={`/jobs/${jobId}`}>View Job Details</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/profile">Go to Profile</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
