"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Save, UserIcon, Briefcase, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI, jobAPI } from "@/lib/api"
import { useUser, useClerk } from "@clerk/nextjs"
import FinancialDashboard from "@/components/financial-dashboard"
import JobListingPreview from "@/components/job-listing-preview"

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [avatarFile, setAvatarFile] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  // Fetch user data from our database
  useEffect(() => {
    const fetchUserData = async () => {
      if (isLoaded && isSignedIn && user?.id) {
        try {
          const response = await userAPI.getUserByClerkId(user.id)
          if (response.success) {
            setDbUser(response.user)

            // Set form values
            reset({
              name: response.user.name || user.fullName || "",
              email: response.user.email || user.primaryEmailAddress?.emailAddress || "",
              phone: response.user.phone || user.phoneNumbers?.[0]?.phoneNumber || "",
              address: response.user.address || "",
              bio: response.user.bio || "",
              skills: response.user.skills ? response.user.skills.join(", ") : "",
              paypalEmail: response.user.paypalEmail || "",
            })

            if (response.user.avatar) {
              setAvatarPreview(response.user.avatar)
            } else if (user.imageUrl) {
              setAvatarPreview(user.imageUrl)
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          toast({
            title: "Error",
            description: "Failed to load user profile data",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      } else if (isLoaded && !isSignedIn) {
        router.push("/login")
      }
    }

    fetchUserData()
  }, [isLoaded, isSignedIn, user, reset, router, toast])

  // Fetch user's jobs
  useEffect(() => {
    const fetchUserJobs = async () => {
      if (dbUser?._id) {
        try {
          setJobsLoading(true)
          const response = await jobAPI.getUserJobs(dbUser._id)
          if (response.success) {
            setActiveJobs(response.jobs.filter((job) => job.status !== "Completed"))
            setCompletedJobs(response.jobs.filter((job) => job.status === "Completed"))
          }
        } catch (error) {
          console.error("Error fetching user jobs:", error)
        } finally {
          setJobsLoading(false)
        }
      }
    }

    fetchUserJobs()
  }, [dbUser])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data) => {
    setIsUpdating(true)

    try {
      // Format skills as array
      const formattedData = {
        ...data,
        skills: data.skills ? data.skills.split(",").map((skill) => skill.trim()) : [],
      }

      // Handle avatar upload if changed
      if (avatarFile) {
        const formData = new FormData()
        formData.append("avatar", avatarFile)
        // In a real app, you would upload the avatar to a storage service
        // For this demo, we'll skip this step
      }

      // Update user profile in our database
      const result = await userAPI.updateUserByClerkId(user.id, formattedData)

      if (result.success) {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully",
        })

        // Update local state
        setDbUser(result.user)
      } else {
        toast({
          title: "Update failed",
          description: result.message || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout failed",
        description: "There was a problem logging out",
        variant: "destructive",
      })
    }
  }

  if (loading || !isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile Information
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            My Jobs
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Financial Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || "/placeholder.svg?height=96&width=96"} alt={dbUser?.name} />
                    <AvatarFallback>
                      <UserIcon className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar" className="block mb-2">
                      Profile Picture
                    </Label>
                    <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
                    <p className="text-sm text-muted-foreground mt-1">Recommended: Square image, at least 200x200px</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...register("name", { required: "Name is required" })}
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="Your email address" disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" {...register("phone")} placeholder="Your phone number (optional)" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register("address")} placeholder="Your address (optional)" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Tell us about yourself"
                    className="min-h-[100px]"
                  />
                </div>

                {dbUser?.userType === "Seller" && (
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input id="skills" {...register("skills")} placeholder="e.g. Plumbing, Electrical, Carpentry" />
                  </div>
                )}

                {dbUser?.userType === "Seller" && (
                  <div className="space-y-2">
                    <Label htmlFor="paypal-email">PayPal Email</Label>
                    <Input
                      id="paypal-email"
                      type="email"
                      {...register("paypalEmail", {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                      placeholder="Your PayPal email address"
                    />
                    {errors.paypalEmail && <p className="text-sm text-red-500">{errors.paypalEmail.message}</p>}
                    <p className="text-sm text-muted-foreground mt-1">This email will be used for PayPal withdrawals</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>My Jobs</CardTitle>
              <CardDescription>Manage your active and completed jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Tabs defaultValue="active">
                  <TabsList className="mb-4">
                    <TabsTrigger value="active">Active Jobs ({activeJobs.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed Jobs ({completedJobs.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    {activeJobs.length > 0 ? (
                      <div className="space-y-4">
                        {activeJobs.map((job) => (
                          <JobListingPreview key={job._id} job={job} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        You don't have any active jobs.
                        {dbUser?.userType === "Buyer" && (
                          <div className="mt-4">
                            <Button onClick={() => router.push("/post-job")}>Post a New Job</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed">
                    {completedJobs.length > 0 ? (
                      <div className="space-y-4">
                        {completedJobs.map((job) => (
                          <JobListingPreview key={job._id} job={job} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        You don't have any completed jobs yet.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            {dbUser?.userType === "Buyer" && (
              <CardFooter>
                <Button onClick={() => router.push("/post-job")}>Post a New Job</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <FinancialDashboard userId={dbUser?._id} userType={dbUser?.userType} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
