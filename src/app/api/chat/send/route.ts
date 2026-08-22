import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const GUEST_EMAIL = "guest@accspoint.local";
const GUEST_USERNAME = "guest";

async function getGuestUserId(): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
  if (existing) return existing.id;
  try {
    const created = await prisma.user.create({
      data: {
        email: GUEST_EMAIL,
        username: GUEST_USERNAME,
        password: "guest",
        name: "Guest",
        role: "buyer",
        balance: 0,
      },
    });
    return created.id;
  } catch {
    const retry = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
    return retry ? retry.id : null;
  }
}

export async function POST(req: Request) {
  try {
    const body: Record<string, unknown> = await req.json();
    const message = String(body.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get("accsm_user_id")?.value;
    const loggedIn = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null;

    const sender = loggedIn ? loggedIn.username : "guest";
    const userId = loggedIn ? loggedIn.id : await getGuestUserId();
    if (!userId) throw new Error("Unable to resolve chat sender");

    const msg = await prisma.chatMessage.create({ data: { sender, message, userId } });
    return NextResponse.json({
      success: true,
      message: { id: msg.id, sender: msg.sender, message: msg.message, createdAt: msg.createdAt },
    });
  } catch (err) {
    console.error("Chat send failed:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}