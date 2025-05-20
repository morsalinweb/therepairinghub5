"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Star, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI } from "@/lib/api"

export default function ServicesPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [providers, setProviders] = useState([])
  const [filteredProviders, setFilteredProviders] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")

  useEffect(() => {
    fetchServiceProviders()
  }, [])

  const fetchServiceProviders = async () => {
    try {
      setIsLoading(true)
      const { success, users } = await userAPI.getServiceProviders({ userType: "Seller" })

      if (success) {
        setProviders(users)
        setFilteredProviders(users)
      }
    } catch (error) {
      console.error("Error fetching service providers:", error)
      toast({
        title: "Error",
        description: "Failed to load service providers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Apply filters
    let results = providers

    // Search term filter
    if (searchTerm) {
      results = results.filter(
        (provider) =>
          (provider.name && provider.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (provider.services && provider.services.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (provider.bio && provider.bio.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Category filter
    if (selectedCategory) {
      results = results.filter(
        (provider) => provider.services && provider.services.toLowerCase().includes(selectedCategory.toLowerCase()),
      )
    }

    setFilteredProviders(results)
  }, [searchTerm, selectedCategory, providers])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? "" : category)
  }

  // Extract unique categories from providers' services
  const categories = [
    ...new Set(
      providers
        .flatMap((provider) => (provider.services ? provider.services.split(",").map((service) => service.trim()) : []))
        .filter((service) => service),
    ),
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Service Providers</h1>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search for service providers or services..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategorySelect(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Service Providers List */}
      {filteredProviders.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <Card key={provider._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={provider.avatar || "/placeholder.svg?height=64&width=64"} alt={provider.name} />
                      <AvatarFallback>
                        {provider.name
                          ? provider.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : provider.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{provider.name || "Service Provider"}</h3>
                      <div className="flex items-center text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <span className="ml-1 text-sm">5.0</span>
                      </div>
                      {provider.location && (
                        <div className="flex items-center text-gray-500 text-sm mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{provider.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {provider.bio || "No bio provided"}
                  </p>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Services:</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.services
                        ? provider.services.split(",").map((service, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {service.trim()}
                            </Badge>
                          ))
                        : "No services listed"}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t">
                  <Button asChild className="w-full">
                    <Link href={`/providers/${provider._id}`}>View Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-xl font-medium mb-2">No service providers found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Try adjusting your search or filters to find service providers
          </p>
          <Button
            onClick={() => {
              setSearchTerm("")
              setSelectedCategory("")
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
