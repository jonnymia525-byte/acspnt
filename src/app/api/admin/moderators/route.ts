import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - list all moderators
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const moderators = await prisma.user.findMany({
    where: { role: "moderator" },
    select: {
      id: true, username: true, email: true, name: true, createdAt: true, lastLogin: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Count active sessions per moderator
  const modIds = moderators.map(m => m.id);
  const sessionCounts = await prisma.chatSession.groupBy({
    by: ["assignedTo"],
    where: { assignedTo: { in: modIds }, status: { in: ["open", "assigned"] } },
    _count: { id: true },
  });
  const countMap = new Map(sessionCounts.map(s => [s.assignedTo, s._count.id]));

  return NextResponse.json({
    moderators: moderators.map(m => ({ ...m, activeSessions: countMap.get(m.id) || 0 })),
  });
}

// POST - create/remove moderator
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, username, email, password, name, userId } = body;

  if (action === "create") {
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password required" }, { status: 400 });
    }
    // Check uniqueness
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });

    const hashed = await bcryptjs.hash(password, 10);
    const mod = await prisma.user.create({
      data: { username, email, password: hashed, name: name || username, role: "moderator", balance: 0 },
    });
    await prisma.activityLog.create({ data: { action: "moderator_created", description: `Admin created moderator: ${mod.username}`, userId: admin.id } });
    return NextResponse.json({ success: true, moderator: { id: mod.id, username: mod.username, email: mod.email, name: mod.name } });
  }

  if (action === "remove") {
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    // Unassign all sessions first
    await prisma.chatSession.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } });
    // Delete the user
    await prisma.user.delete({ where: { id: userId } });
    await prisma.activityLog.create({ data: { action: "moderator_removed", description: `Admin removed a moderator`, userId: admin.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
