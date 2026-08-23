import { NextResponse } from "next/server";

// Legacy route - redirect to session-based chat
export async function POST() {
  return NextResponse.json({ error: "Please use POST /api/chat with action: create_session or send_message" }, { status: 410 });
}
