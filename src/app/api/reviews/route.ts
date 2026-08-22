import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  const reviews = await prisma.review.findMany({
    where: productId ? { productId } : {},
    orderBy: { createdAt: "desc" },
    take: productId ? undefined : 50,
    select: { id: true, rating: true, comment: true, createdAt: true, buyer: { select: { username: true } } },
  });

  const ratingCount = reviews.length;
  const avgRating =
    ratingCount > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount) * 10) / 10 : 0;

  return NextResponse.json({ reviews, avgRating, ratingCount });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: Record<string, unknown> = await req.json();
    const rating = Number(body.rating);
    const comment = String(body.comment ?? "");
    const vendorId = body.vendorId ? String(body.vendorId) : null;
    const productId = body.productId ? String(body.productId) : null;
    const listingId = body.listingId ? String(body.listingId) : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: { rating, comment, buyerId: user.id, vendorId, productId, listingId },
    });

    await prisma.activityLog.create({
      data: { action: "review", description: `${user.username} rated vendor ${rating}★`, userId: user.id },
    });

    if (vendorId) {
      const vendor = await prisma.user.findUnique({ where: { id: vendorId } });
      await prisma.notification.create({
        data: { title: "New review", message: `You received a ${rating}★ review`, type: "info", userId: vendorId },
      });
      if (vendor) {
        try {
          await sendEmail({
            to: vendor.email,
            templateKey: "vendor_rated",
            vars: { username: vendor.username, rating: String(rating), comment },
            userId: vendorId,
          });
        } catch (err) {
          console.error("Review email failed:", err);
        }
      }
    }

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error("Review creation failed:", err);
    return NextResponse.json({ error: "Review creation failed" }, { status: 500 });
  }
}