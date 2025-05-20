import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { generateToken } from "@/lib/auth"

// This endpoint syncs Clerk user with our database and returns a JWT token
export async function GET(req) {
  try {
    await connectToDatabase()

    // Get user from Clerk
    const { userId } = auth()

    if (!userId) {
      console.error("Auth sync error: No Clerk userId found")
      return NextResponse.json({ success: false, message: "Not authenticated with Clerk" }, { status: 401 })
    }

    console.log("Syncing user with Clerk ID:", userId)

    // Find user in our database
    let user = await User.findOne({ clerkId: userId })

    if (!user) {
      console.log("User not found in database, fetching from Clerk")

      try {
        // Get user details from Clerk
        const clerkUser = await clerkClient.users.getUser(userId)

        if (clerkUser) {
          console.log("Creating new user in database from Clerk user")

          // Get primary email
          const primaryEmail = clerkUser.emailAddresses.find(
            (email) => email.id === clerkUser.primaryEmailAddressId,
          )?.emailAddress

          if (!primaryEmail) {
            return NextResponse.json(
              {
                success: false,
                message: "No email address found for Clerk user",
              },
              { status: 400 },
            )
          }

          // Create a new user in our database
          user = await User.create({
            clerkId: userId,
            email: primaryEmail,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
            userType: "Buyer", // Default to Buyer
            status: "active",
            isActive: true,
          })

          console.log("Created new user:", user._id)
        } else {
          console.error("User not found in Clerk")
          return NextResponse.json({ success: false, message: "User not found in Clerk" }, { status: 404 })
        }
      } catch (error) {
        console.error("Error fetching user from Clerk:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Error fetching user from Clerk: " + error.message,
          },
          { status: 500 },
        )
      }
    }

    // Generate JWT token
    const token = generateToken(user._id)
    console.log("Generated token for user:", user._id)

    // Set token in cookie
    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        bio: user.bio,
        avatar: user.avatar,
        services: user.services,
        status: user.status,
        createdAt: user.createdAt,
        clerkId: user.clerkId,
      },
      token,
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Auth sync error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
