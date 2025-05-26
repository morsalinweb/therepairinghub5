"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Filter, MapPin } from "lucide-react"
import JobListingPreview from "@/components/job-listing-preview"
import { jobAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function Jobs() {
  const [isLoading, setIsLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [priceRange, setPriceRange] = useState([0, 500])
  const [category, setCategory] = useState("")
  const [location, setLocation] = useState("")
  const [categories, setCategories] = useState([])
  const { toast } = useToast()

  useEffect(() => {
    // Fetch jobs data
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      const { success, jobs } = await jobAPI.getJobs({ status: "active" })

      if (success) {
        setJobs(jobs)
        setFilteredJobs(jobs)

        // Extract unique categories
        const uniqueCategories = [...new Set(jobs.map((job) => job.category).filter(Boolean))]
        setCategories(uniqueCategories)
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast({
        title: "Error",
        description: "Failed to load jobs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Apply filters
    let results = jobs

    // Search term filter
    if (searchTerm) {
      results = results.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Price range filter
    results = results.filter((job) => job.price >= priceRange[0] && job.price <= priceRange[1])

    // Category filter
    if (category && category !== "all") {
      results = results.filter((job) => job.category === category)
    }

    // Location filter
    if (location) {
      results = results.filter((job) => job.location.toLowerCase().includes(location.toLowerCase()))
    }

    setFilteredJobs(results)
  }, [searchTerm, priceRange, category, location, jobs])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handlePriceChange = (value) => {
    setPriceRange(value)
  }

  const handleCategoryChange = (value) => {
    setCategory(value)
  }

  const handleLocationChange = (e) => {
    setLocation(e.target.value)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setPriceRange([0, 500])
    setCategory("")
    setLocation("")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        {/* Filters */}
        <Card className="w-full md:w-64 sticky top-20">
          <CardHeader>
            <CardTitle className="text-xl">Filters</CardTitle>
            <CardDescription>Refine your job search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Price Range</Label>
              <div className="pt-4">
                <Slider
                  defaultValue={[0, 500]}
                  max={500}
                  step={10}
                  value={priceRange}
                  onValueChange={handlePriceChange}
                />
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Enter location" value={location} onChange={handleLocationChange} className="pl-8" />
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Job Listings */}
        <div className="flex-1">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Search jobs..." value={searchTerm} onChange={handleSearch} className="pl-8" />
              </div>

              {/* Mobile filters button */}
              <Button variant="outline" className="sm:hidden flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Available Jobs</h1>
              <p className="text-gray-500">{filteredJobs.length} jobs found</p>
            </div>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <JobListingPreview
                  key={job._id}
                  id={job._id}
                  title={job.title}
                  price={`$${job.price}`}
                  location={job.location}
                  date={new Date(job.date).toLocaleDateString()}
                  category={job.category}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-xl font-medium mb-2">No jobs found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search terms</p>
              <Button onClick={resetFilters}>Reset Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
