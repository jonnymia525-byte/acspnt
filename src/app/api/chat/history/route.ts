import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin/moderator can access full chat history
  if (user.role !== "admin" && user.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      message: true,
      isAdmin: true,
      read: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
  });
  return NextResponse.json({ messages });
}
