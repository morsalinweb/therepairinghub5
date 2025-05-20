import { Loader2 } from "lucide-react"

export default function MessagesLoading() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    </div>
  )
}
