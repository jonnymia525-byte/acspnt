import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - list webhooks
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ webhooks });
}

// POST - create/update/delete webhook
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, webhookId, url, event, secret, active } = body;

  if (action === "create") {
    if (!url || !event) return NextResponse.json({ error: "url and event required" }, { status: 400 });
    const webhookSecret = secret || crypto.randomBytes(16).toString("hex");
    const webhook = await prisma.webhook.create({
      data: { url, event, secret: webhookSecret, active: active !== false },
    });
    return NextResponse.json({ success: true, webhook });
  }

  if (action === "update" && webhookId) {
    const data: any = {};
    if (url !== undefined) data.url = url;
    if (event !== undefined) data.event = event;
    if (active !== undefined) data.active = active;
    const webhook = await prisma.webhook.update({ where: { id: webhookId }, data });
    return NextResponse.json({ success: true, webhook });
  }

  if (action === "delete" && webhookId) {
    await prisma.webhook.delete({ where: { id: webhookId } });
    return NextResponse.json({ success: true });
  }

  if (action === "test" && webhookId) {
    const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    try {
      await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "test", timestamp: new Date().toISOString(), message: "Test webhook from AccsPoint" }),
      });
      return NextResponse.json({ success: true, message: "Test webhook sent" });
    } catch {
      return NextResponse.json({ error: "Failed to send test webhook" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
