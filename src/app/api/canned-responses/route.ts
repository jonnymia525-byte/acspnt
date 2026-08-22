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

// GET - list canned responses (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.cannedResponse.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json({ responses: items });
}

// POST - create/update/delete
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, id, title, content, category } = body;

  if (action === "create") {
    if (!title || !content) return NextResponse.json({ error: "title and content required" }, { status: 400 });
    const item = await prisma.cannedResponse.create({ data: { title, content, category: category || "general" } });
    return NextResponse.json({ success: true, response: item });
  }

  if (action === "update" && id) {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category;
    const item = await prisma.cannedResponse.update({ where: { id }, data });
    return NextResponse.json({ success: true, response: item });
  }

  if (action === "delete" && id) {
    await prisma.cannedResponse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
