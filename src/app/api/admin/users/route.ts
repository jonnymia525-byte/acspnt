import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";

// Helper to check admin
async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - fetch all users with details
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  if (action === "list") {
    const users = await prisma.user.findMany({
      select: {
        id: true, username: true, email: true, name: true, role: true,
        balance: true, vendorStatus: true, registeredAt: true, lastLogin: true, registrationIp: true,
        vendorCountry: true, contactMethod: true, contactDetail: true,
        muted: true, mutedUntil: true, blocked: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ users });
  }

  if (action === "detail") {
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, name: true, role: true,
        balance: true, vendorStatus: true, registeredAt: true, lastLogin: true, registrationIp: true,
        vendorCountry: true, contactMethod: true, contactDetail: true,
        muted: true, mutedUntil: true, blocked: true, createdAt: true, twoFaEnabled: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [purchases, deposits, withdrawals, reviews, products, activityLogs, sentMessages, disputes] = await Promise.all([
      prisma.purchase.findMany({ where: { buyerId: userId }, select: { id: true, quantity: true, total: true, status: true, createdAt: true, product: { select: { title: true, platform: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.deposit.findMany({ where: { userId }, select: { id: true, amount: true, method: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.withdrawal.findMany({ where: { userId }, select: { id: true, amount: true, netAmount: true, fee: true, method: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.review.findMany({ where: { buyerId: userId }, select: { id: true, rating: true, comment: true, createdAt: true, product: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.product.findMany({ where: { vendorId: userId }, select: { id: true, title: true, platform: true, storePrice: true, stock: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.activityLog.findMany({ where: { userId }, select: { id: true, action: true, description: true, ip: true, country: true, city: true, userAgent: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.notification.findMany({ where: { userId }, select: { id: true, title: true, message: true, read: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.dispute.findMany({ where: { buyerId: userId }, select: { id: true, reason: true, status: true, resolution: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    return NextResponse.json({ user, purchases, deposits, withdrawals, reviews, products, activityLogs, sentMessages, disputes });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST - admin actions on users
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, userId, ...data } = body;

  if (!userId && action !== "bulk_notice") return NextResponse.json({ error: "userId required" }, { status: 400 });

  switch (action) {
    case "edit_user": {
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.username !== undefined) updates.username = data.username;
      if (data.email !== undefined) updates.email = data.email;
      if (data.password) updates.password = await bcryptjs.hash(data.password, 10);
      if (data.balance !== undefined) updates.balance = parseFloat(data.balance);
      if (data.role !== undefined) updates.role = data.role;
      if (data.muted !== undefined) updates.muted = data.muted;
      if (data.blocked !== undefined) updates.blocked = data.blocked;
      const updated = await prisma.user.update({ where: { id: userId }, data: updates });
      await prisma.activityLog.create({ data: { action: "admin_edit_user", description: `Admin edited user ${updated.username}`, userId: admin.id } });
      return NextResponse.json({ success: true, user: { id: updated.id, username: updated.username, name: updated.name, email: updated.email, balance: updated.balance, role: updated.role } });
    }

    case "topup": {
      const amount = parseFloat(data.amount);
      if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      const user = await prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
      await prisma.deposit.create({ data: { userId, amount, method: "admin_topup", status: "completed" } });
      await prisma.activityLog.create({ data: { action: "admin_topup", description: `Admin topped up $${amount} to ${user.username}`, userId: admin.id } });
      await prisma.notification.create({ data: { userId, title: "Balance Top-up", message: `Admin added $${amount.toFixed(2)} to your balance. New balance: $${user.balance.toFixed(2)}` } });
      return NextResponse.json({ success: true, balance: user.balance });
    }

    case "send_message": {
      if (!data.title || !data.message) return NextResponse.json({ error: "title and message required" }, { status: 400 });
      await prisma.notification.create({ data: { userId, title: data.title, message: data.message } });
      await prisma.activityLog.create({ data: { action: "admin_message", description: `Admin sent message "${data.title}" to user`, userId: admin.id } });
      return NextResponse.json({ success: true });
    }

    case "set_notice": {
      if (!data.title || !data.message || !data.noticeType) return NextResponse.json({ error: "title, message, noticeType required" }, { status: 400 });
      // Store as notification with special prefix for notice bar
      const noticeMsg = `[NOTICE:${data.noticeType}] ${data.message}`;
      if (data.target === "all") {
        const users = await prisma.user.findMany({ select: { id: true } });
        await prisma.notification.createMany({ data: users.map(u => ({ userId: u.id, title: data.title, message: noticeMsg })) });
      } else if (data.target === "bulk" && data.userIds) {
        await prisma.notification.createMany({ data: data.userIds.map((id: string) => ({ userId: id, title: data.title, message: noticeMsg })) });
      } else {
        await prisma.notification.create({ data: { userId, title: data.title, message: noticeMsg } });
      }
      await prisma.activityLog.create({ data: { action: "admin_notice", description: `Admin sent notice "${data.title}" to ${data.target}`, userId: admin.id } });
      return NextResponse.json({ success: true });
    }

    case "set_mute": {
      const muteDays = Number(data.muteDays);
      // Positive days = temporary mute; 0 or negative or missing = permanent mute
      const muteUntil = muteDays > 0 ? new Date(Date.now() + muteDays * 24 * 60 * 60 * 1000) : null;
      const user = await prisma.user.update({ where: { id: userId }, data: { muted: true, mutedUntil: muteUntil } });
      const duration = muteDays > 0 ? `${muteDays} day(s)` : "permanent";
      await prisma.notification.create({ data: { userId, title: "Account Muted", message: `Your account has been muted for ${duration}. You cannot perform purchases or actions during this period.` } }).catch(() => {});
      return NextResponse.json({ success: true, muted: user.muted, mutedUntil: user.mutedUntil });
    }

    case "unmute": {
      const user = await prisma.user.update({ where: { id: userId }, data: { muted: false, mutedUntil: null } });
      await prisma.notification.create({ data: { userId, title: "Account Unmuted", message: `Your account has been unmuted. You can now perform actions normally.` } }).catch(() => {});
      return NextResponse.json({ success: true, muted: user.muted });
    }

    case "toggle_block": {
      // Fetch current state first — data.blocked from client is unreliable
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { blocked: true } });
      const newBlocked = !(currentUser?.blocked ?? false);
      const user = await prisma.user.update({ where: { id: userId }, data: { blocked: newBlocked } });
      const action = user.blocked ? "blocked" : "unblocked";
      await prisma.notification.create({ data: { userId, title: `Account ${action.charAt(0).toUpperCase() + action.slice(1)}`, message: user.blocked ? `Your account has been blocked. You can no longer access the platform.` : `Your account has been unblocked. You can now access the platform.` } }).catch(() => {});
      return NextResponse.json({ success: true, blocked: user.blocked });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
