import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - user's chat sessions, or messages for a specific session
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    // Get messages for a specific session
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || (session.userId !== userId)) {
      // Check if user is admin/moderator
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.role !== "admin" && user.role !== "moderator")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, username: true, name: true, role: true } } },
    });
    // Mark unread messages as read
    await prisma.chatMessage.updateMany({
      where: { sessionId, senderId: { not: userId }, read: false },
      data: { read: true },
    });
    return NextResponse.json({ messages });
  }

  // Get user's chat sessions
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      assignee: { select: { username: true, name: true } },
    },
  });
  // Compute actual unread admin message count per session
  const sessionIds = sessions.map(s => s.id);
  const unreadRows = await prisma.chatMessage.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, isAdmin: true, read: false, senderId: { not: userId } },
    _count: { id: true },
  });
  const unreadMap = new Map(unreadRows.map(r => [r.sessionId, r._count.id]));
  const sessionsWithUnread = sessions.map(s => ({
    ...s,
    unreadCount: unreadMap.get(s.id) || 0,
  }));
  return NextResponse.json({ sessions: sessionsWithUnread });
}

// POST - create new session or send message in existing session
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, sessionId, subject, category, priority, message } = body;

  if (action === "create_session") {
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
    }
    if (subject.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }
    // Rate limit: max 5 new tickets per user per hour
    const recentTickets = await prisma.chatSession.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentTickets >= 5) {
      return NextResponse.json({ error: "Too many tickets. Please wait before creating another." }, { status: 429 });
    }
    const session = await prisma.chatSession.create({
      data: { subject: subject.trim(), category: category || "general", priority: priority || "normal", userId },
    });
    await prisma.chatMessage.create({
      data: { sessionId: session.id, senderId: userId, message: message.trim(), isAdmin: false },
    });
    await prisma.activityLog.create({
      data: { action: "support_ticket_created", description: `User created support ticket: ${subject}`, userId },
    });
    return NextResponse.json({ success: true, session });
  }

  if (action === "send_message") {
    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: "sessionId and message required" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.role !== "admin" && user.role !== "moderator")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "admin" || user?.role === "moderator";
    const msg = await prisma.chatMessage.create({
      data: { sessionId, senderId: userId, message: message.trim(), isAdmin },
    });
    // If session was resolved/closed and user sends a message, reopen it
    const updateData: any = { updatedAt: new Date() };
    if (!isAdmin && (session.status === "resolved" || session.status === "closed")) {
      updateData.status = "open";
    }
    await prisma.chatSession.update({ where: { id: sessionId }, data: updateData });
    return NextResponse.json({ success: true, message: msg });
  }

  if (action === "close_session") {
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    // Verify ownership or admin
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (session.userId !== userId && (!user || (user.role !== "admin" && user.role !== "moderator"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.chatSession.update({ where: { id: sessionId }, data: { status: "closed" } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
