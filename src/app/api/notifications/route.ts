import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - Get notifications grouped by section, or mark as read
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const markRead = url.searchParams.get("markRead");
  const section = url.searchParams.get("section");

  // Mark all as read
  if (markRead === "all") {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return NextResponse.json({ success: true });
  }

  // Mark section as read
  if (markRead && section) {
    await prisma.notification.updateMany({ where: { userId, section, read: false }, data: { read: true } });
    return NextResponse.json({ success: true });
  }

  // Mark single notification as read
  if (markRead) {
    await prisma.notification.updateMany({ where: { id: markRead, userId }, data: { read: true } });
    return NextResponse.json({ success: true });
  }

  // Get section-wise counts
  const unreadBySection = await prisma.notification.groupBy({
    by: ["section"],
    where: { userId, read: false },
    _count: { id: true },
  });

  const totalUnread = unreadBySection.reduce((sum, r) => sum + r._count.id, 0);

  // Get all unread notifications grouped by section
  const where: any = { userId, read: false };
  if (section) where.section = section;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, message: true, type: true, section: true, link: true, read: true, createdAt: true },
  });

  // Group by section
  const grouped: Record<string, any[]> = {};
  for (const n of notifications) {
    const s = n.section || "general";
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(n);
  }

  return NextResponse.json({
    totalUnread,
    sections: unreadBySection.map(r => ({ section: r.section, count: r._count.id })),
    grouped,
    notifications,
  });
}

// POST - Create notification (admin only for now)
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, message, section, link, targetUserId, type } = body;

  if (!title || !message) return NextResponse.json({ error: "title and message required" }, { status: 400 });

  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      section: section || "general",
      link: link || null,
      type: type || "info",
      userId: targetUserId || userId,
    },
  });

  return NextResponse.json({ success: true, notification });
}
