import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list conversations
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.vendorMessage.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    include: {
      sender: { select: { id: true, username: true, name: true, role: true } },
      receiver: { select: { id: true, username: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}

// POST - send a message
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId, message } = await req.json();
  if (!receiverId || !message?.trim()) {
    return NextResponse.json({ error: "receiverId and message required" }, { status: 400 });
  }

  // Check receiver exists
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const msg = await prisma.vendorMessage.create({
    data: { senderId: user.id, receiverId, message: message.trim() },
  });

  // Notify receiver
  await prisma.notification.create({
    data: {
      title: "New Message",
      message: `New message from @${user.username}`,
      type: "info",
      link: "/?page=user-dashboard",
      userId: receiverId,
    },
  });

  return NextResponse.json({ success: true, message: msg });
}

// PUT - mark as read
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { senderId } = await req.json();
  if (!senderId) return NextResponse.json({ error: "senderId required" }, { status: 400 });

  await prisma.vendorMessage.updateMany({
    where: { senderId, receiverId: user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
