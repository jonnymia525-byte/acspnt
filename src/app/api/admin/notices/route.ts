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

// POST - send notice
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, message, noticeType, target, userIds } = await req.json();
  if (!title || !message || !noticeType) return NextResponse.json({ error: "title, message, noticeType required" }, { status: 400 });

  const prefix = `[NOTICE:${noticeType}]`;
  const fullMessage = `${prefix} ${message}`;

  if (target === "all") {
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({ data: users.map(u => ({ userId: u.id, title, message: fullMessage })) });
  } else if (target === "bulk" && userIds?.length) {
    await prisma.notification.createMany({ data: userIds.map((id: string) => ({ userId: id, title, message: fullMessage })) });
  } else if (target === "single" && userIds?.[0]) {
    await prisma.notification.create({ data: { userId: userIds[0], title, message: fullMessage } });
  } else {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  await prisma.activityLog.create({ data: { action: "notice_sent", description: `Admin sent "${title}" to ${target === "all" ? "all users" : target === "bulk" ? `${userIds.length} users` : "1 user"}`, userId: admin.id } });

  return NextResponse.json({ success: true });
}

// GET - list sent notices
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const notices = await prisma.activityLog.findMany({
    where: { action: "notice_sent" },
    select: { id: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notices });
}
