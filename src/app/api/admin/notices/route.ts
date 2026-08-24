import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - list created notices (persistent announcements)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const notices = await prisma.scheduledAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ notices });
}

// POST - create / update / delete / hide notices
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const action = body.action || "create";

  // ─── UPDATE an existing notice ────────────────────────────────
  if (action === "update") {
    const { noticeId, title, message, noticeType, closeable, active } = body;
    if (!noticeId) return NextResponse.json({ error: "noticeId required" }, { status: 400 });
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (message !== undefined) data.message = message;
    if (noticeType !== undefined) data.type = noticeType;
    if (closeable !== undefined) data.closeable = closeable === true;
    if (active !== undefined) data.active = active === true;
    const notice = await prisma.scheduledAnnouncement.update({ where: { id: noticeId }, data });
    return NextResponse.json({ success: true, notice });
  }

  // ─── DELETE (soft delete) ─────────────────────────────────────
  if (action === "delete") {
    const { noticeId } = body;
    if (!noticeId) return NextResponse.json({ error: "noticeId required" }, { status: 400 });
    await prisma.scheduledAnnouncement.update({ where: { id: noticeId }, data: { deletedAt: new Date() } });
    await prisma.activityLog.create({ data: { action: "notice_deleted", description: `Admin deleted notice ${noticeId}`, userId: admin.id } });
    return NextResponse.json({ success: true });
  }

  // ─── HIDE from specific users ─────────────────────────────────
  if (action === "set_hidden_users") {
    const { noticeId, userIds } = body;
    if (!noticeId) return NextResponse.json({ error: "noticeId required" }, { status: 400 });
    const list = Array.isArray(userIds) ? userIds.map(String) : [];
    await prisma.scheduledAnnouncement.update({ where: { id: noticeId }, data: { hiddenForUserIds: list.length ? JSON.stringify(list) : "" } });
    return NextResponse.json({ success: true });
  }

  // ─── CREATE (default) ─────────────────────────────────────────
  const { title, message, noticeType, target, userIds, closeable } = body;
  if (!title || !message || !noticeType) return NextResponse.json({ error: "title, message, noticeType required" }, { status: 400 });

  const prefix = `[NOTICE:${noticeType}]`;
  const fullMessage = `${prefix} ${message}`;

  // Send per-user notifications (bell)
  if (target === "all") {
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({ data: users.map(u => ({ userId: u.id, title, message: fullMessage })) });
  } else if (target === "bulk" && userIds?.length) {
    await prisma.notification.createMany({ data: userIds.map((id: string) => ({ userId: id, title, message: fullMessage })) });
  } else if (target === "single" && userIds?.[0]) {
    await prisma.notification.create({ data: { userId: userIds[0], title, message: fullMessage } });
  }

  // Persist as an announcement so it shows in the News banner & can be managed
  const notice = await prisma.scheduledAnnouncement.create({
    data: {
      title,
      message: fullMessage,
      type: noticeType,
      target: target === "all" ? "all" : target === "bulk" ? "all" : "all",
      active: true,
      closeable: closeable !== false,
      startsAt: new Date(),
    },
  });

  await prisma.activityLog.create({ data: { action: "notice_sent", description: `Admin sent "${title}" to ${target === "all" ? "all users" : target === "bulk" ? `${userIds.length} users` : "1 user"}`, userId: admin.id } });

  return NextResponse.json({ success: true, notice });
}
