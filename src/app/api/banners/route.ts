import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - public active banners
export async function GET() {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      active: true,
      deletedAt: null,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, imageUrl: true, linkUrl: true, position: true },
  });

  return NextResponse.json({ banners });
}

// POST - admin create/update/delete banners
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, bannerId, title, imageUrl, linkUrl, position, active, sortOrder, startsAt, expiresAt } = body;

  if (action === "list") {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ banners });
  }

  if (action === "create") {
    if (!title || !imageUrl) return NextResponse.json({ error: "title and imageUrl required" }, { status: 400 });
    const banner = await prisma.banner.create({
      data: {
        title, imageUrl, linkUrl: linkUrl || null,
        position: position || "top", active: active !== false,
        sortOrder: sortOrder || 0,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return NextResponse.json({ success: true, banner });
  }

  if (action === "update" && bannerId) {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkUrl !== undefined) data.linkUrl = linkUrl;
    if (position !== undefined) data.position = position;
    if (active !== undefined) data.active = active;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const banner = await prisma.banner.update({ where: { id: bannerId }, data });
    return NextResponse.json({ success: true, banner });
  }

  if (action === "delete" && bannerId) {
    await prisma.banner.update({ where: { id: bannerId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
