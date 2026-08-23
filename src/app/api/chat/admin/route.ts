import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdminOrMod() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "admin" && user.role !== "moderator")) return null;
  return user;
}

// GET - all sessions (admin/moderator view)
export async function GET(req: Request) {
  const admin = await requireAdminOrMod();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, username: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, username: true, name: true } },
      },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, username: true, name: true, role: true } } },
    });
    return NextResponse.json({ session, messages });
  }

  const where: any = {};
  if (status) where.status = status;
  if (admin.role === "moderator") {
    where.OR = [{ assignedTo: admin.id }, { assignedTo: null }];
  }

  const sessions = await prisma.chatSession.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, username: true, name: true } },
      assignee: { select: { username: true, name: true } },
      _count: { select: { messages: true } },
    },
  });

  // Count unread messages per session (messages not from admin/moderator)
  const sessionIds = sessions.map(s => s.id);
  const unreadCounts = await prisma.chatMessage.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, isAdmin: false, read: false },
    _count: { id: true },
  });
  const unreadMap = new Map(unreadCounts.map(u => [u.sessionId, u._count.id]));

  return NextResponse.json({
    sessions: sessions.map(s => ({ ...s, unreadCount: unreadMap.get(s.id) || 0 })),
  });
}

// POST - assign, reply, resolve
export async function POST(req: Request) {
  const admin = await requireAdminOrMod();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, sessionId, assignTo, message } = body;

  if (action === "assign") {
    if (!sessionId || !assignTo) return NextResponse.json({ error: "sessionId and assignTo required" }, { status: 400 });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { assignedTo: assignTo, status: "assigned" } });
    if (message) {
      await prisma.chatMessage.create({ data: { sessionId, senderId: admin.id, message, isAdmin: true } });
    }
    await prisma.activityLog.create({ data: { action: "chat_assigned", description: `Support ticket assigned`, userId: admin.id } });
    return NextResponse.json({ success: true });
  }

  if (action === "resolve") {
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { status: "resolved" } });
    if (message) {
      await prisma.chatMessage.create({ data: { sessionId, senderId: admin.id, message, isAdmin: true } });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "reply") {
    if (!sessionId || !message?.trim()) return NextResponse.json({ error: "sessionId and message required" }, { status: 400 });
    const msg = await prisma.chatMessage.create({
      data: { sessionId, senderId: admin.id, message: message.trim(), isAdmin: true },
    });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    return NextResponse.json({ success: true, message: msg });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
