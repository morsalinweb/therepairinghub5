import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { writeFile } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"

export async function POST(req) {
  try {
    // Get authenticated user
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get("avatar")

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 })
    }

    // Check file type
    const fileType = file.type
    if (!fileType.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "File must be an image" }, { status: 400 })
    }

    // Get file extension
    const fileExtension = fileType.split("/")[1]

    // Create unique filename
    const fileName = `${uuidv4()}.${fileExtension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Define upload path
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    const filePath = path.join(uploadDir, fileName)

    // Ensure directory exists
    await writeFile(filePath, buffer)

    // Generate URL for the uploaded file
    const avatarUrl = `/uploads/${fileName}`

    // Update user in database
    await connectToDatabase()

    const user = await User.findOneAndUpdate({ clerkId: userId }, { $set: { avatar: avatarUrl } }, { new: true })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, avatarUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
