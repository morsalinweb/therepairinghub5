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

  // Create a copy of security headers to modify
  const updatedHeaders = { ...securityHeaders }
  
  // Update the Content-Security-Policy to also allow web workers
  updatedHeaders["Content-Security-Policy"] = 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://stunning-chimp-36.clerk.accounts.dev; " +
    "worker-src 'self' blob:; " +  // Add this line to allow blob workers
    "connect-src 'self' https://*.clerk.accounts.dev https://stunning-chimp-36.clerk.accounts.dev; " + 
    "frame-src 'self' https://*.clerk.accounts.dev https://stunning-chimp-36.clerk.accounts.dev; " +
    "img-src 'self' data: https://*.clerk.accounts.dev; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:;";

  // Add security headers
  Object.entries(updatedHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // For API routes that need authentication, check if user is authenticated
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/") &&
    !request.nextUrl.pathname.startsWith("/api/webhook/")
  ) {
    // Get auth token from cookie
    const token = request.cookies.get("token")?.value

    // Add token to Authorization header if it exists
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`)
    }
  }

  return response
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Apply to all paths except static files and api routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}