import { NextResponse } from "next/server"
import { securityHeaders } from "./lib/security"

export function middleware(request) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)

  // Get response and add security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // For API routes that need authentication, check if user is authenticated
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth/register") &&
    !request.nextUrl.pathname.startsWith("/api/webhook/")
  ) {
    // Get auth token from cookie
    const token = request.cookies.get("token")?.value

    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization")
    const headerToken = authHeader ? authHeader.split(" ")[1] : null

    // Use token from cookie or header
    const finalToken = token || headerToken

    // Add token to Authorization header if it exists
    if (finalToken) {
      requestHeaders.set("Authorization", `Bearer ${finalToken}`)
    }
  }

  return response
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Apply to all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
