import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { calcStorePrice } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.vendorStatus !== "approved") return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });

    const body: Record<string, unknown> = await req.json();
    const title = String(body.title ?? "").trim();
    const platform = String(body.platform ?? "").trim();
    const category = String(body.category ?? "").trim();
    const description = String(body.description ?? "");
    const deliveryFormat = String(body.deliveryFormat ?? "email:pass");
    const countryRegister = String(body.countryRegister ?? "");
    const originalMail = body.originalMail === true;
    const country = String(body.country ?? "");
    const proxy = String(body.proxy ?? "");
    const vendorPrice = Number(body.vendorPrice);
    const accountsData = String(body.accountsData ?? "");

    if (title.length < 3) return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
    if (!platform) return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    if (!Number.isFinite(vendorPrice) || vendorPrice <= 0) {
      return NextResponse.json({ error: "Vendor price must be greater than 0" }, { status: 400 });
    }

    const accounts = accountsData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (accounts.length === 0) return NextResponse.json({ error: "At least one account is required" }, { status: 400 });

    const stock = accounts.length;

    const listing = await prisma.listing.create({
      data: {
        title,
        platform,
        category,
        description,
        deliveryFormat,
        countryRegister,
        originalMail,
        country,
        proxy,
        visible: true,
        vendorId: user.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        title,
        description,
        platform,
        category,
        vendorPrice,
        storePrice: calcStorePrice(vendorPrice),
        stock,
        status: "pending",
        visible: false,
        accountsData: accounts.join("\n"),
        deliveryFormat,
        countryRegister,
        originalMail,
        country,
        proxy,
        listingId: listing.id,
        vendorId: user.id,
      },
    });

    await prisma.activityLog.create({
      data: { action: "product_submitted", description: `${user.username} submitted product ${title}`, userId: user.id },
    });
    await prisma.notification.create({
      data: { title: "Product submitted", message: `${title} is pending admin approval`, type: "info", userId: user.id },
    });

    return NextResponse.json({
      success: true,
      product: { id: product.id, title: product.title, storePrice: product.storePrice, stock: product.stock, status: product.status },
    });
  } catch (err) {
    console.error("Listing creation failed:", err);
    return NextResponse.json({ error: "Listing creation failed" }, { status: 500 });
  }
}