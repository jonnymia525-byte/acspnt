import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, sender: true, message: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}