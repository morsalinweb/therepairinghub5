"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Star, MapPin, Phone, Mail, Calendar, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI, reviewAPI } from "@/lib/api"
import JobListingPreview from "@/components/job-listing-preview"

export default function ProviderProfile({ params }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState(null)
  const [reviews, setReviews] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])

  useEffect(() => {
    fetchProviderData()
  }, [params.id])

  const fetchProviderData = async () => {
    try {
      setIsLoading(true)

      // Fetch provider profile
      const { success, user } = await userAPI.getProfile(params.id)

      if (success) {
        setProvider(user)

        // Fetch provider reviews
        const reviewsResponse = await reviewAPI.getReviews({ provider: params.id })
        if (reviewsResponse.success) {
          setReviews(reviewsResponse.reviews)
        }

        // Fetch completed jobs
        // This would be a separate API call in a real implementation
        setCompletedJobs([
          {
            _id: "1",
            title: "Bathroom Sink Repair",
            price: 120,
            location: "San Francisco, CA",
            date: "2023-05-10",
            category: "Plumbing",
          },
          {
            _id: "2",
            title: "Kitchen Faucet Installation",
            price: 150,
            location: "Oakland, CA",
            date: "2023-05-15",
            category: "Plumbing",
          },
          {
            _id: "3",
            title: "Shower Head Replacement",
            price: 85,
            location: "San Jose, CA",
            date: "2023-05-20",
            category: "Plumbing",
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching provider data:", error)
      toast({
        title: "Error",
        description: "Failed to load provider profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="container py-10">
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-xl font-medium mb-2">Provider not found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The service provider you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/services">Browse Service Providers</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Provider Profile Sidebar */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={provider.avatar || "/placeholder.svg?height=96&width=96"} alt={provider.name} />
                  <AvatarFallback>
                    {provider.name
                      ? provider.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : provider.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{provider.name || "Service Provider"}</h2>
                <div className="flex items-center text-yellow-500 mt-1">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <span className="ml-1 text-sm">5.0 ({reviews.length} reviews)</span>
                </div>
                {provider.location && (
                  <div className="flex items-center text-gray-500 mt-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{provider.location}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-500 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Member since {new Date(provider.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Services Offered</h3>
                  <div className="flex flex-wrap gap-1">
                    {provider.services
                      ? provider.services.split(",").map((service, index) => (
                          <Badge key={index} variant="secondary">
                            {service.trim()}
                          </Badge>
                        ))
                      : "No services listed"}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Contact</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{provider.email}</span>
                    </div>
                    {provider.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About Me</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                {provider.bio || "This provider has not added a bio yet."}
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue="completed_jobs">
            <TabsList className="mb-4">
              <TabsTrigger value="completed_jobs">Completed Jobs</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="completed_jobs">
              <div className="grid md:grid-cols-2 gap-4">
                {completedJobs.length > 0 ? (
                  completedJobs.map((job) => (
                    <JobListingPreview
                      key={job._id}
                      id={job._id}
                      title={job.title}
                      price={`$${job.price}`}
                      location={job.location}
                      date={new Date(job.date).toLocaleDateString()}
                      category={job.category}
                    />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">This provider has not completed any jobs yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={review.reviewer.avatar || "/placeholder.svg?height=40&width=40"}
                              alt={review.reviewer.name}
                            />
                            <AvatarFallback>
                              {review.reviewer.name
                                ? review.reviewer.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : review.reviewer.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{review.reviewer.name || review.reviewer.email}</p>
                                <div className="flex items-center text-yellow-500 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">{review.comment}</p>
                            {review.job && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500">Job: </span>
                                <Link href={`/jobs/${review.job._id}`} className="text-blue-600 hover:underline">
                                  {review.job.title}
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">This provider has not received any reviews yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
