"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Bell, Menu, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useMobile()
  const { toast } = useToast()
  const { user, isAuthenticated, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const handleLogout = async () => {
    await logout()

    // Close mobile menu if open
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Services", href: "/services" },
    { name: "How It Works", href: "/docs" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <span className="text-2xl font-bold">
              Repairing<span className="text-blue-600">Hub</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/notifications" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link href="/profile">
                  <Button variant="ghost" size="sm">
                    Profile
                  </Button>
                </Link>
                {user?.userType === "Buyer" && (
                  <Link href="/post-job">
                    <Button size="sm">Post a Job</Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          )}

          <ModeToggle />

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary py-2",
                  pathname === item.href ? "text-foreground" : "text-muted-foreground",
                )}
                onClick={closeMenu}
              >
                {item.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <Link href="/profile" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    Profile
                  </Button>
                </Link>
                {user?.userType === "Buyer" && (
                  <Link href="/post-job" onClick={closeMenu}>
                    <Button className="w-full" size="sm">
                      Post a Job
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register" onClick={closeMenu}>
                  <Button className="w-full" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
