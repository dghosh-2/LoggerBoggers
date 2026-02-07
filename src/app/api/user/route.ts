import { NextResponse } from "next/server";

export async function GET() {
  // This endpoint previously returned persisted onboarding data from a local file.
  // The app no longer writes onboarding data to disk.
  return NextResponse.json({ message: "No user data found" });
}

export async function POST(request: Request) {
  try {
    // Keep shape-compatible with the existing client flow, but do not persist to disk.
    await request.json().catch(() => null);
    return NextResponse.json({ message: "User data received (not persisted)" });
  } catch (error) {
    console.error("Error handling user data:", error);
    return NextResponse.json({ error: "Failed to handle data" }, { status: 500 });
  }
}
