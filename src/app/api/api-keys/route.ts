import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

function generateApiKey(): string {
  return `ak_${crypto.randomBytes(32).toString("hex")}`;
}

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list user's API keys
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, key: true, active: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // NEVER return the full key — only masked version
  const maskedKeys = keys.map(k => ({
    id: k.id,
    name: k.name,
    keyMasked: k.key.substring(0, 8) + "..." + k.key.substring(k.key.length - 4),
    active: k.active,
    lastUsed: k.lastUsed,
    createdAt: k.createdAt,
  }));

  return NextResponse.json({ keys: maskedKeys });
}

// POST - create/revoke/delete API key
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, keyId, name } = body;

  if (action === "create") {
    const keyName = (name || `API Key ${new Date().toLocaleDateString()}`).substring(0, 100);
    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: { name: keyName, key, userId: user.id },
    });

    // Return full key ONLY on creation
    return NextResponse.json({
      success: true,
      key: { id: apiKey.id, name: apiKey.name, key: apiKey.key, createdAt: apiKey.createdAt },
      message: "Save this key — it won't be shown again!",
    });
  }

  if ((action === "revoke" || action === "delete") && keyId) {
    // CRITICAL: Ownership check — users can only modify their own keys
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== user.id) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    if (action === "revoke") {
      await prisma.apiKey.update({ where: { id: keyId }, data: { active: false } });
    } else {
      await prisma.apiKey.delete({ where: { id: keyId } });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
