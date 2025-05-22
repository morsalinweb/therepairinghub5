// app/layout.js or app/layout.tsx
"use client"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { NotificationProvider } from "@/contexts/notification-context"
import { AuthProvider } from "@/contexts/auth-context"
import { ClerkProvider } from "@clerk/nextjs"

import { Provider } from "react-redux"
import { store } from "@/lib/redux/store" // ✅ Correct path to your store

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

// export const metadata = {
//   title: "RepairingHub - Connect with Repair Professionals",
//   description: "Find and hire skilled repair professionals for your home and business needs.",
// }

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Provider store={store}> {/* ✅ Redux store wrapper */}
            <AuthProvider>
              <NotificationProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
              </NotificationProvider>
            </AuthProvider>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
