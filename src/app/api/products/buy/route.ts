import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";
import { money } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ code: "login_required", error: "Login required" }, { status: 401 });

    const { productId, quantity, couponCode } = await req.json();
    if (!productId || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Not enough stock" }, { status: 400 });
    }

    const [user, product] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.product.findUnique({
        where: { id: productId },
        include: {
          vendor: { select: { id: true, username: true } },
          listing: { select: { title: true } },
        },
      }),
    ]);

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!product || product.status !== "approved" || !product.visible) {
      return NextResponse.json({ error: "Product unavailable" }, { status: 404 });
    }
    if (quantity > product.stock) {
      return NextResponse.json({ error: "Not enough stock" }, { status: 400 });
    }

    const subtotal = product.storePrice * quantity;
    let discount = 0;
    let coupon: { id: string } | null = null;

    if (couponCode) {
      const found = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
      if (
        found &&
        found.active &&
        (!found.expiresAt || found.expiresAt > new Date()) &&
        (found.maxUses === -1 || found.usedCount < found.maxUses) &&
        subtotal >= found.minOrder
      ) {
        coupon = found;
        discount =
          found.type === "percentage"
            ? Math.round(subtotal * (found.value / 100) * 100) / 100
            : Math.min(found.value, subtotal);
      }
    }

    const total = Math.round((subtotal - discount) * 100) / 100;
    if (user.balance < total) {
      return NextResponse.json(
        { code: "deposit_required", balance: user.balance, error: "Insufficient balance" },
        { status: 400 },
      );
    }

    const accountLines = product.accountsData.split("\n").filter((line) => line.trim());
    const deliveredAccounts = accountLines.slice(0, quantity).join("\n");
    const remainingAccounts = accountLines.slice(quantity).join("\n");
    const newStock = product.stock - quantity;
    const commissionPct = parseFloat((await prisma.setting.findUnique({ where: { key: "platform_commission_pct" } }))?.value || "15");
    const commissionAmount = Math.round(total * (commissionPct / 100) * 100) / 100;
    const vendorEarning = Math.round((total - commissionAmount) * 100) / 100;

    const alreadyUsedCoupon = coupon
      ? await prisma.usedCoupon.findUnique({ where: { userId_couponId: { userId: user.id, couponId: coupon.id } } })
      : null;

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.purchase.create({
        data: {
          quantity,
          subtotal,
          discount,
          couponCode: couponCode || null,
          total,
          commissionAmount,
          vendorEarning,
          platformFee: commissionAmount,
          accounts: deliveredAccounts,
          status: "completed",
          buyerId: user.id,
          productId: product.id,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: total } } }),
      prisma.user.update({ where: { id: product.vendorId }, data: { balance: { increment: vendorEarning } } }),
      prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity }, accountsData: remainingAccounts },
      }),
      prisma.transaction.create({
        data: { type: "purchase", amount: -total, description: `Purchased ${quantity}× ${product.title}`, userId: user.id },
      }),
      prisma.transaction.create({
        data: { type: "sale", amount: vendorEarning, description: `Sale: ${product.title} (after ${commissionPct}% commission)`, userId: product.vendorId },
      }),
      prisma.transaction.create({
        data: { type: "commission", amount: commissionAmount, description: `Platform commission: ${product.title}`, userId: product.vendorId },
      }),
      prisma.notification.create({
        data: { title: "Purchase complete", message: `Order for ${product.title} delivered. ${money(total)} deducted.`, type: "success", userId: user.id },
      }),
      prisma.activityLog.create({
        data: { action: "purchase", description: `${user.username} bought ${quantity}× ${product.title} for ${money(total)}`, userId: user.id },
      }),
    ];

    if (coupon) {
      ops.push(prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } }));
      if (!alreadyUsedCoupon) {
        ops.push(prisma.usedCoupon.create({ data: { userId: user.id, couponId: coupon.id } }));
      }
    }

    if (newStock > 0 && newStock <= 5) {
      ops.push(
        prisma.notification.create({
          data: { title: "Low stock alert", message: `${product.title} has only ${newStock} left`, type: "warning", userId: product.vendorId },
        }),
      );
    } else if (newStock <= 0) {
      ops.push(
        prisma.notification.create({
          data: { title: "Out of stock", message: `${product.title} is now sold out`, type: "error", userId: product.vendorId },
        }),
      );
    }

    const results = await prisma.$transaction(ops);
    const purchaseId = (results[0] as { id: string }).id;

    // Notify restock subscribers if stock is now 0
    if (newStock <= 0) {
      const restockNotifs = await prisma.restockNotification.findMany({
        where: { productId: product.id, status: "pending" },
      });
      for (const rn of restockNotifs) {
        await prisma.notification.create({
          data: { title: "Product Sold Out", message: `${product.title} is now out of stock`, type: "info", userId: rn.userId },
        });
        await prisma.restockNotification.update({ where: { id: rn.id }, data: { status: "notified" } });
      }
    }

    // Update vendor stats
    await prisma.user.update({
      where: { id: product.vendorId },
      data: { vendorSalesCount: { increment: quantity } },
    });

    // Update product view/sales stats
    await prisma.product.update({
      where: { id: product.id },
      data: { totalSales: { increment: quantity } },
    });

    try {
      await sendEmail({
        to: user.email,
        templateKey: "purchase_confirmation",
        vars: {
          username: user.username,
          product_title: product.title,
          quantity: String(quantity),
          subtotal: money(subtotal),
          discount: money(discount),
          total: money(total),
          accounts: deliveredAccounts,
          coupon_line: couponCode ? `Coupon: ${couponCode} (-${money(discount)})` : "",
        },
        userId: user.id,
      });
    } catch {
      console.error("Failed to send purchase confirmation email");
    }

    if (newStock > 0 && newStock <= 5) {
      const vendorUser = await prisma.user.findUnique({ where: { id: product.vendorId }, select: { email: true } });
      if (vendorUser?.email) {
        try {
          await sendEmail({
            to: vendorUser.email,
            templateKey: "low_stock_alert",
            vars: { user_name: product.vendor.username, product_name: product.title, stock: String(newStock) },
            userId: product.vendorId,
          });
        } catch {
          console.error("Failed to send low stock alert email");
        }
      }
    } else if (newStock <= 0) {
      const vendorUser = await prisma.user.findUnique({ where: { id: product.vendorId }, select: { email: true } });
      if (vendorUser?.email) {
        try {
          await sendEmail({
            to: vendorUser.email,
            templateKey: "out_of_stock_alert",
            vars: { user_name: product.vendor.username, product_name: product.title, stock: "0" },
            userId: product.vendorId,
          });
        } catch {
          console.error("Failed to send out of stock alert email");
        }
      }
    }

    return NextResponse.json({
      success: true,
      accounts: deliveredAccounts,
      newBalance: user.balance - total,
      purchaseId,
    });
  } catch {
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}