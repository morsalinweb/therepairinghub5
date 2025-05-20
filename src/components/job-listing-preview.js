import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, DollarSign } from "lucide-react"

export default function JobListingPreview({ id, title, price, location, date, category }) {
  return (
    <Link href={`/jobs/${id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <Badge className="mb-2">{category}</Badge>
          <h3 className="text-xl font-semibold mb-3 line-clamp-2">{title}</h3>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{price}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{location}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{date}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 text-sm">
          <span className="text-blue-600 dark:text-blue-400">View details →</span>
        </CardFooter>
      </Card>
    </Link>
  )
}
