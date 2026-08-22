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

// GET - fetch all page content for admin editing
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pages = ["faq", "terms", "seller_terms", "about"];
  const content: Record<string, any> = {};

  for (const page of pages) {
    const setting = await prisma.setting.findUnique({ where: { key: `page_${page}` } });
    if (setting) {
      try { content[page] = JSON.parse(setting.value); } catch { content[page] = null; }
    } else {
      content[page] = null; // use defaults
    }
  }

  return NextResponse.json({ pages: content });
}

// POST - update page content
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { page, content } = await req.json();
  if (!page || !content) return NextResponse.json({ error: "page and content required" }, { status: 400 });

  const validPages = ["faq", "terms", "seller_terms", "about"];
  if (!validPages.includes(page)) return NextResponse.json({ error: "Invalid page" }, { status: 400 });

  await prisma.setting.upsert({
    where: { key: `page_${page}` },
    create: { key: `page_${page}`, value: JSON.stringify(content) },
    update: { value: JSON.stringify(content) },
  });

  await prisma.activityLog.create({
    data: { action: "page_content_updated", description: `Admin updated ${page} page content`, userId: admin.id },
  });

  return NextResponse.json({ success: true });
}
