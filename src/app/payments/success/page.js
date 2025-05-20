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
  const [error, setError] = useState(null)
  const [jobDetails, setJobDetails] = useState(null)

  useEffect(() => {
    const capturePayment = async () => {
      try {
        const jobId = searchParams.get("jobId")
        const paymentId = searchParams.get("paymentId")
        const payerId = searchParams.get("PayerID")

        if (!jobId) {
          setError("Missing job information")
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
          console.log("Capturing PayPal payment:", { paymentId, payerId, jobId })
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
            setError(data.message || "Failed to capture payment")
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
        } else {
          // For Stripe payments or when returning to this page, manually trigger webhook for testing
          if (process.env.NODE_ENV === "development") {
            console.log("Manually triggering webhook for testing in development")
            try {
              // Fetch job details to display
              const jobResponse = await fetch(`/api/jobs/${jobId}`)
              const jobData = await jobResponse.json()

              if (jobData.success) {
                setJobDetails(jobData.job)

                // Manually trigger webhook processing for the job
                const webhookResponse = await fetch(`/api/payments/webhook/manual-trigger`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ jobId }),
                })

                const webhookData = await webhookResponse.json()
                console.log("Manual webhook trigger response:", webhookData)
              }
            } catch (err) {
              console.error("Error fetching job details or triggering webhook:", err)
            }
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Payment capture error:", error)
        setError("There was a problem processing your payment")
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
          ) : error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Thank you for your payment. The service provider has been notified and will begin work on your job.
              </p>
              {jobDetails && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h3 className="font-medium">{jobDetails.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Status: {jobDetails.status === "in_progress" ? "In Progress" : jobDetails.status}
                  </p>
                </div>
              )}
            </div>
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
