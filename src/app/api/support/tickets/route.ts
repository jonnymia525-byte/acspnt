import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

// POST - create a support ticket (with optional file attachment)
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subject, category, priority, message, attachmentUrl, attachmentName } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }
  if (subject.length > 200) return NextResponse.json({ error: "Subject too long" }, { status: 400 });
  if (message.length > 10000) return NextResponse.json({ error: "Message too long" }, { status: 400 });
  if (attachmentUrl && attachmentUrl.length > 500) return NextResponse.json({ error: "Attachment URL too long" }, { status: 400 });

  // Rate limit: max 10 tickets per user per hour
  const recentCount = await prisma.supportTicket.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentCount >= 10) {
    return NextResponse.json({ error: "Too many tickets. Please wait." }, { status: 429 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      subject,
      category: category || "general",
      priority: priority || "normal",
      message,
      userId: user.id,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
    },
  });

  return NextResponse.json({ success: true, ticket });
}

// GET - list current user's support tickets (with admin replies)
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    include: {
      repliedBy: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tickets });
}
