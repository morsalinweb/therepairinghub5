"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSignIn } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

// Email form validation schema
const emailFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
})

// OTP form validation schema
const otpFormSchema = z.object({
  otp: z.string().min(6, { message: "Please enter the verification code" }),
})

// Password reset form validation schema
const resetPasswordFormSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export default function ForgotPassword() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLoaded, signIn } = useSignIn()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState("email") // email -> otp -> reset
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  const emailForm = useForm({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
  })

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const handleEmailSubmit = async (data) => {
    if (!isLoaded) return

    setIsSubmitting(true)
    setUserEmail(data.email)

    try {
      // Start the password reset process with Clerk
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.email,
      })

      // Show the OTP verification modal
      setVerifyModalOpen(true)
      setStep("otp")

      toast({
        title: "Verification code sent",
        description: "We've sent a verification code to your email",
      })
    } catch (error) {
      console.error("Password reset request error:", error)
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "An error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyOtp = async () => {
    if (!isLoaded || !signIn) return

    setVerifying(true)

    try {
      // Attempt to verify the email with the provided code
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: otpCode,
      })

      if (result.status !== "needs_new_password") {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: "The code you entered is incorrect or has expired",
        })
        return
      }

      // Close modal and show password reset form
      setVerifyModalOpen(false)
      setStep("reset")

      toast({
        title: "Verification successful",
        description: "Please set your new password",
      })
    } catch (error) {
      console.error("Verification error:", error)
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "An error occurred during verification",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleResetPassword = async (data) => {
    if (!isLoaded || !signIn) return

    setIsSubmitting(true)

    try {
      // Reset the password
      const result = await signIn.resetPassword({
        password: data.password,
      })

      if (result.status === "complete") {
        // Set the user session as active
        await signIn.setActive({ session: result.createdSessionId })

        toast({
          title: "Password reset successful",
          description: "Your password has been reset successfully",
        })

        // Redirect to profile page
        router.push("/profile")
      } else {
        toast({
          variant: "destructive",
          title: "Password reset failed",
          description: "An error occurred. Please try again.",
        })
      }
    } catch (error) {
      console.error("Password reset error:", error)
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: error.message || "An error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "reset" && "Enter your new password"}
          </CardDescription>
        </CardHeader>

        {step === "email" && (
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...emailForm.register("email")} />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send verification code"
                )}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" {...resetPasswordForm.register("password")} />
                {resetPasswordForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{resetPasswordForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" {...resetPasswordForm.register("confirmPassword")} />
                {resetPasswordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      {/* OTP Verification Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>Enter the verification code sent to {userEmail}.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input id="otp" placeholder="Enter code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="sm:justify-between flex flex-col-reverse sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="sm:w-auto w-full">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" className="sm:w-auto w-full" onClick={verifyOtp} disabled={verifying || !otpCode}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
