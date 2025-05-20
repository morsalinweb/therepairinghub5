"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSignUp } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

// Form validation schema
const formSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string().min(10, { message: "Phone number must be at least 10 characters" }),
    userType: z.string().min(1, { message: "Please select a user type" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export default function Register() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLoaded, signUp, setActive } = useSignUp()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [userData, setUserData] = useState(null)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      userType: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data) => {
    if (!isLoaded) return

    setIsSubmitting(true)

    try {
      // Store user data for later database save
      setUserData({
        name: data.name,
        email: data.email,
        phone: data.phone,
        userType: data.userType,
        password: data.password,
      })

      // Start the sign-up process with Clerk (passwordless flow)
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
        unsafeMetadata: {
          name: data.name,
          userType: data.userType,
          phoneNumber: data.phone,
        },
      })

      // Prepare verification
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      })

      // Show the OTP verification modal
      setVerifyModalOpen(true)

      toast({
        title: "OTP Sent",
        description: "We've sent a verification code to your email",
      })
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyOtp = async () => {
    if (!isLoaded || !signUp.status) return

    setVerifying(true)

    try {
      // Attempt to verify the email with the provided code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: otpCode,
      })

      if (completeSignUp.status !== "complete") {
        // Handle verification errors
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: "The code you entered is incorrect or has expired",
        })
        return
      }

      // Set the user session as active
      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId })
      }

      // Save user to our database
      if (userData) {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            userType: userData.userType,
            password: userData.password,
            clerkId: completeSignUp.createdUserId,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          console.error("Failed to save user to database:", data.message)
        }
      }

      toast({
        title: "Account created",
        description: "Your account has been successfully created",
      })

      // Close modal and redirect
      setVerifyModalOpen(false)
      // Force a hard navigation to profile page to ensure proper state refresh
      window.location.href = "/profile"
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

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="(123) 456-7890" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">I want to</Label>
              <Select onValueChange={(value) => form.setValue("userType", value)}>
                <SelectTrigger id="userType">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buyer">Hire for Services</SelectItem>
                  <SelectItem value="Seller">Offer Services</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.userType && (
                <p className="text-sm text-red-500">{form.formState.errors.userType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </CardFooter>
        </form>
        <div className="px-8 pb-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </Card>

      {/* OTP Verification Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>Enter the verification code sent to your email.</DialogDescription>
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
                "Complete Sign Up"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
