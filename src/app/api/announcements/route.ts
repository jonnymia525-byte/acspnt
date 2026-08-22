import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - public active announcements
export async function GET() {
  const now = new Date();
  const announcements = await prisma.scheduledAnnouncement.findMany({
    where: {
      active: true,
      deletedAt: null,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, message: true, type: true, target: true },
  });

  return NextResponse.json({ announcements });
}

// POST - admin CRUD
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, announcementId, title, message, type, target, active, startsAt, expiresAt } = body;

  if (action === "list") {
    const items = await prisma.scheduledAnnouncement.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ announcements: items });
  }

  if (action === "create") {
    if (!title || !message) return NextResponse.json({ error: "title and message required" }, { status: 400 });
    const item = await prisma.scheduledAnnouncement.create({
      data: {
        title, message, type: type || "info", target: target || "all",
        active: active !== false,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return NextResponse.json({ success: true, announcement: item });
  }

  if (action === "update" && announcementId) {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (message !== undefined) data.message = message;
    if (type !== undefined) data.type = type;
    if (target !== undefined) data.target = target;
    if (active !== undefined) data.active = active;
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const item = await prisma.scheduledAnnouncement.update({ where: { id: announcementId }, data });
    return NextResponse.json({ success: true, announcement: item });
  }

  if (action === "delete" && announcementId) {
    await prisma.scheduledAnnouncement.update({ where: { id: announcementId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
