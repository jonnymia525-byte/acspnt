import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";
import { money } from "@/lib/money";

// Max manual top-up cap to prevent abuse
const MAX_TOPUP = 100_000;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: Record<string, unknown> = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    switch (action) {
      case "approve_vendor": {
        const targetId = String(body.userId ?? "");
        const vendor = await prisma.user.findUnique({ where: { id: targetId } });
        if (!vendor) return NextResponse.json({ error: "User not found" }, { status: 404 });

        await prisma.user.update({
          where: { id: vendor.id },
          data: { role: "vendor", vendorStatus: "approved", vendorReason: "" },
        });
        await prisma.vendorRequest.updateMany({
          where: { userId: vendor.id },
          data: { status: "approved", reviewedAt: new Date() },
        });
        await prisma.activityLog.create({
          data: { action: "vendor_approved", description: `Vendor ${vendor.username} approved`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Vendor approved!", message: "You can now sell on AccsPoint.", type: "success", userId: vendor.id },
        });
        try {
          await sendEmail({
            to: vendor.email,
            templateKey: "vendor_approved",
            vars: { username: vendor.username, store_url: "https://accspoint.test" },
            userId: vendor.id,
          });
        } catch (err) {
          console.error("Approval email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "reject_vendor": {
        const targetId = String(body.userId ?? "");
        const reason = String(body.reason ?? "");
        const vendor = await prisma.user.findUnique({ where: { id: targetId } });
        if (!vendor) return NextResponse.json({ error: "User not found" }, { status: 404 });

        await prisma.user.update({
          where: { id: vendor.id },
          data: { vendorStatus: "rejected", vendorReason: reason },
        });
        await prisma.vendorRequest.updateMany({
          where: { userId: vendor.id },
          data: { status: "rejected", adminComments: reason, reviewedAt: new Date() },
        });
        await prisma.activityLog.create({
          data: { action: "vendor_rejected", description: `Vendor ${vendor.username} rejected`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Vendor application rejected", message: `Your vendor application was rejected: ${reason}`, type: "error", userId: vendor.id },
        });
        try {
          await sendEmail({
            to: vendor.email,
            templateKey: "vendor_rejected",
            vars: { username: vendor.username, reason },
            userId: vendor.id,
          });
        } catch (err) {
          console.error("Rejection email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "approve_product": {
        const productId = String(body.productId ?? "");
        const product = await prisma.product.findUnique({ where: { id: productId }, include: { vendor: true } });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        await prisma.product.update({
          where: { id: product.id },
          data: { status: "approved", visible: true },
        });
        await prisma.activityLog.create({
          data: { action: "product_approved", description: `Product ${product.title} approved`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Product approved", message: `${product.title} is now live`, type: "success", userId: product.vendorId },
        });
        try {
          await sendEmail({
            to: product.vendor.email,
            templateKey: "product_approved",
            vars: { username: product.vendor.username, product_title: product.title, store_url: "https://accspoint.test" },
            userId: product.vendorId,
          });
        } catch (err) {
          console.error("Product approval email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "reject_product": {
        const productId = String(body.productId ?? "");
        const reason = String(body.reason ?? "");
        const product = await prisma.product.findUnique({ where: { id: productId }, include: { vendor: true } });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const reasonText = reason ? `: ${reason}` : "";
        await prisma.product.update({ where: { id: product.id }, data: { status: "rejected" } });
        await prisma.activityLog.create({
          data: { action: "product_rejected", description: `Product ${product.title} rejected${reasonText}`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Product rejected", message: `${product.title} was rejected${reasonText}`, type: "error", userId: product.vendorId },
        });
        try {
          await sendEmail({
            to: product.vendor.email,
            templateKey: "product_rejected",
            vars: { username: product.vendor.username, product_title: product.title, reason },
            userId: product.vendorId,
          });
        } catch (err) {
          console.error("Product rejection email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "topup": {
        const targetId = String(body.userId ?? "");
        const amount = Number(body.amount);
        const reason = String(body.reason ?? "");
        if (!Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
        }
        if (amount > MAX_TOPUP) {
          return NextResponse.json({ error: `Amount exceeds max top-up limit of $${MAX_TOPUP.toLocaleString()}` }, { status: 400 });
        }
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

<<<<<<< ours
        // Atomic transaction: update balance, create deposit record, create transaction record
        const updated = await prisma.$transaction(async (tx) => {
          const u = await tx.user.update({
            where: { id: user.id },
            data: { balance: { increment: amount } },
          });
          await tx.deposit.create({
            data: { amount, method: "manual", status: "completed", completedAt: new Date(), userId: user.id },
          });
          await tx.transaction.create({
            data: { type: "topup", amount, description: "Admin manual top-up", userId: user.id },
          });
          return u;
=======
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: amount } },
        });
        await prisma.deposit.create({
          data: { amount, method: "manual", status: "completed", completedAt: new Date(), userId: user.id },
        });
        await prisma.transaction.create({
          data: { type: "topup", amount, description: "Admin topup" + (reason ? `: ${reason}` : ""), userId: user.id },
>>>>>>> theirs
        });

        await prisma.notification.create({
          data: { title: "Balance topped up", message: `${money(amount)} added by admin`, type: "success", userId: user.id },
        });
        try {
          await sendEmail({
            to: user.email,
            templateKey: "deposit_confirmation",
            vars: { username: user.username, amount: money(amount), method: "manual", new_balance: money(updated.balance) },
            userId: user.id,
          });
        } catch (err) {
          console.error("Top-up email failed:", err);
        }
        return NextResponse.json({ success: true, balance: updated.balance });
      }
      case "complete_withdrawal": {
        const withdrawalId = String(body.withdrawalId ?? "");
        const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId }, include: { user: true } });
        if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });

        // CRITICAL: Only pending withdrawals can be completed
        if (withdrawal.status !== "pending") {
          return NextResponse.json({ error: `Cannot complete withdrawal with status "${withdrawal.status}"` }, { status: 400 });
        }

        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: "completed", processedAt: new Date() },
        });
        await prisma.activityLog.create({
          data: { action: "withdrawal_completed", description: `Withdrawal of ${money(withdrawal.amount)} completed`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Withdrawal completed", message: `${money(withdrawal.netAmount)} sent to your ${withdrawal.method} wallet`, type: "success", userId: withdrawal.userId },
        });
        try {
          await sendEmail({
            to: withdrawal.user.email,
            templateKey: "withdrawal_processed",
            vars: { username: withdrawal.user.username, amount: money(withdrawal.amount), net_amount: money(withdrawal.netAmount), method: withdrawal.method, wallet: withdrawal.wallet },
            userId: withdrawal.userId,
          });
        } catch (err) {
          console.error("Withdrawal completion email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "reject_withdrawal": {
        const withdrawalId = String(body.withdrawalId ?? "");
        const reason = String(body.reason ?? "");
        const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId }, include: { user: true } });
        if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });

        // CRITICAL: Only pending withdrawals can be rejected (prevents double refund)
        if (withdrawal.status !== "pending") {
          return NextResponse.json({ error: `Cannot reject withdrawal with status "${withdrawal.status}"` }, { status: 400 });
        }

        // Atomic: reject + refund balance + create transaction in one go
        await prisma.$transaction(async (tx) => {
          await tx.withdrawal.update({
            where: { id: withdrawal.id },
            data: { status: "rejected", rejectReason: reason },
          });
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: { balance: { increment: withdrawal.netAmount } },
          });
          await tx.transaction.create({
            data: { type: "withdrawal_refund", amount: withdrawal.netAmount, description: "Withdrawal rejected refund", userId: withdrawal.userId },
          });
        });

        await prisma.notification.create({
          data: { title: "Withdrawal rejected", message: `Your withdrawal of ${money(withdrawal.amount)} was rejected: ${reason}`, type: "error", userId: withdrawal.userId },
        });
        try {
          await sendEmail({
            to: withdrawal.user.email,
            templateKey: "withdrawal_processed",
            vars: { username: withdrawal.user.username, amount: money(withdrawal.amount), net_amount: money(withdrawal.netAmount), method: withdrawal.method, wallet: withdrawal.wallet, status: "rejected", reason },
            userId: withdrawal.userId,
          });
        } catch (err) {
          console.error("Withdrawal rejection email failed:", err);
        }
        return NextResponse.json({ success: true });
      }
      case "resolve_dispute": {
        const disputeId = String(body.disputeId ?? "");
        const resolution = String(body.resolution ?? "");
        const refundBuyer = body.refundBuyer === true;
        const dispute = await prisma.dispute.findUnique({
          where: { id: disputeId },
          include: {
            buyer: true,
            purchase: { include: { product: { include: { vendor: true } } } },
          },
        });
        if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

<<<<<<< ours
        // CRITICAL: Only open disputes can be resolved (prevents replay refunds)
        if (dispute.status !== "open") {
          return NextResponse.json({ error: `Cannot resolve dispute with status "${dispute.status}"` }, { status: 400 });
        }

        // Atomic: resolve dispute + optional refund in one transaction
        await prisma.$transaction(async (tx) => {
          await tx.dispute.update({
            where: { id: dispute.id },
            data: { status: "resolved", resolution, resolvedAt: new Date() },
          });
          if (refundBuyer && dispute.purchaseId) {
            const purchase = await tx.purchase.findUnique({ where: { id: dispute.purchaseId } });
            if (purchase) {
              await tx.user.update({
                where: { id: dispute.buyerId },
                data: { balance: { increment: purchase.total } },
              });
              await tx.transaction.create({
                data: { type: "dispute_refund", amount: purchase.total, description: "Dispute resolved refund", userId: dispute.buyerId },
              });
            }
          }
=======
        let refundAmount = 0;
        let vendorCharge = 0;

        if (refundBuyer && dispute.purchase) {
          const purchase = dispute.purchase;
          refundAmount = purchase.total;
          vendorCharge = purchase.vendorEarning || 0;

          await prisma.$transaction([
            // Refund buyer
            prisma.user.update({
              where: { id: dispute.buyerId },
              data: { balance: { increment: refundAmount } },
            }),
            // Charge vendor (deduct their earnings)
            prisma.user.update({
              where: { id: purchase.product.vendorId },
              data: { balance: { decrement: vendorCharge } },
            }),
            // Mark purchase refunded
            prisma.purchase.update({
              where: { id: purchase.id },
              data: { status: "refunded" },
            }),
            // Buyer transaction
            prisma.transaction.create({
              data: { type: "dispute_refund", amount: refundAmount, description: "Dispute resolved refund", userId: dispute.buyerId },
            }),
            // Vendor transaction (negative = money taken back)
            prisma.transaction.create({
              data: { type: "dispute_charge", amount: -vendorCharge, description: "Dispute charge for sale", userId: purchase.product.vendorId },
            }),
          ]);
        }

        await prisma.dispute.update({
          where: { id: dispute.id },
          data: { status: "resolved", resolution, resolvedAt: new Date(), refundAmount, vendorCharge },
>>>>>>> theirs
        });

        await prisma.activityLog.create({
          data: { action: "dispute_resolved", description: `Dispute ${dispute.id} resolved${refundBuyer ? ` - refunded ${refundAmount} & charged vendor ${vendorCharge}` : ""}`, userId: admin.id },
        });
        await prisma.notification.create({
          data: { title: "Dispute resolved", message: resolution, type: "success", userId: dispute.buyerId },
        });

        // Notify vendor if they were charged
        if (vendorCharge > 0 && dispute.purchase?.product.vendorId) {
          await prisma.notification.create({
            data: { title: "Dispute charge", message: `${vendorCharge.toFixed(2)} was deducted from your balance due to a resolved dispute.`, type: "error", section: "payouts", userId: dispute.purchase.product.vendorId },
          });
        }

        try {
          await sendEmail({
            to: dispute.buyer.email,
            templateKey: "dispute_resolved",
            vars: { username: dispute.buyer.username, resolution },
            userId: dispute.buyerId,
          });
        } catch (err) {
          console.error("Dispute resolution email failed:", err);
        }
        return NextResponse.json({ success: true, refundAmount, vendorCharge });
      }
      case "create_coupon": {
        const code = String(body.code ?? "").toUpperCase().trim();
        const type = String(body.type ?? "");
        const value = Number(body.value);
        if (!code || code.length > 20 || (type !== "percentage" && type !== "fixed") || !Number.isFinite(value) || value <= 0) {
          return NextResponse.json({ error: "Invalid coupon data" }, { status: 400 });
        }
        // Check uniqueness
        const existing = await prisma.coupon.findFirst({ where: { code, deletedAt: null } });
        if (existing) {
          return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
        }
        const coupon = await prisma.coupon.create({
          data: {
            code,
            type,
            value,
            minOrder: Math.max(0, Number(body.minOrder) || 0),
            maxUses: body.maxUses === undefined || body.maxUses === null ? -1 : Math.max(1, Number(body.maxUses)),
            expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
          },
        });
        return NextResponse.json({ success: true, coupon });
      }
      case "delete_coupon": {
        const couponId = String(body.couponId ?? "");
        await prisma.coupon.updateMany({ where: { id: couponId }, data: { deletedAt: new Date() } });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("Admin action failed:", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
