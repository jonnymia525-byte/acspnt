import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

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
  const search = url.searchParams.get("search");
  const sort = url.searchParams.get("sort");
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
  if (search?.trim()) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { subject: { contains: search.trim(), mode: "insensitive" } },
          { user: { username: { contains: search.trim(), mode: "insensitive" } } },
          { user: { name: { contains: search.trim(), mode: "insensitive" } } },
        ],
      },
    ];
  }
  if (admin.role === "moderator") {
    where.AND = [
      ...(where.AND || []),
      { OR: [{ assignedTo: admin.id }, { assignedTo: null }] },
    ];
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

  let result = sessions.map(s => ({ ...s, unreadCount: unreadMap.get(s.id) || 0 }));
  if (sort === "priority") {
    result = result.sort((a, b) =>
      (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return NextResponse.json({ sessions: result });
}

// POST - assign, reply, resolve, reassign, unassign
export async function POST(req: Request) {
  const admin = await requireAdminOrMod();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, sessionId, assignTo, message } = body;

  if (action === "assign" || action === "reassign") {
    if (!sessionId || !assignTo) return NextResponse.json({ error: "sessionId and assignTo required" }, { status: 400 });
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    let slaDeadline: Date | null = null;
    if (session.priority === "urgent") slaDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000);
    else if (session.priority === "high") slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);
    await prisma.chatSession.update({ where: { id: sessionId }, data: { assignedTo: assignTo, status: "assigned", slaDeadline } });
    if (message) {
      await prisma.chatMessage.create({ data: { sessionId, senderId: admin.id, message, isAdmin: true } });
    }
    await prisma.activityLog.create({ data: { action: "chat_assigned", description: `Support ticket assigned`, userId: admin.id } });
    return NextResponse.json({ success: true });
  }

  if (action === "unassign") {
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { assignedTo: null, status: "open" } });
    return NextResponse.json({ success: true });
  }

  if (action === "resolve") {
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { status: "resolved" } });
    if (message) {
      await prisma.chatMessage.create({ data: { sessionId, senderId: admin.id, message, isAdmin: true } });
    }
    if (session) {
      await prisma.notification.create({
        data: {
          title: "Ticket resolved",
          message: `Your ticket "${session.subject}" has been resolved`,
          type: "success",
          section: "support",
          userId: session.userId,
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "reply") {
    if (!sessionId || !message?.trim()) return NextResponse.json({ error: "sessionId and message required" }, { status: 400 });
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const msg = await prisma.chatMessage.create({
      data: {
        sessionId,
        senderId: admin.id,
        message: message.trim(),
        isAdmin: true,
        attachment: body.attachment || null,
      },
    });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    await prisma.notification.create({
      data: {
        title: "Support replied",
        message: `${admin.username} replied to your ticket`,
        type: "success",
        section: "support",
        userId: session.userId,
      },
    });
    return NextResponse.json({ success: true, message: msg });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
