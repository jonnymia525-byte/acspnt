export interface EmailTemplate {
  subject: string;
  body: string;
}

export const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  purchase_confirmation: {
    subject: "[AccsPoint] Your Purchase is Complete",
    body: `Hi {{buyer_name}},\n\nYour order has been completed successfully.\n\nProduct: {{product_name}}\nQuantity: {{quantity}}\nTotal: {{total}}\n\nDelivered Accounts:\n{{accounts}}\n\nYour new balance: {{new_balance}}\n\n{{coupon_line}}\nThank you for using AccsPoint!\n— AccsPoint Team`,
  },
  deposit_confirmation: {
    subject: "[AccsPoint] Deposit Confirmed",
    body: `Hi {{buyer_name}},\n\nYour deposit has been confirmed.\n\nAmount: {{amount}}\nMethod: {{method}}\n\nYour new balance: {{new_balance}}\n\n— AccsPoint Team`,
  },
  vendor_approved: {
    subject: "[AccsPoint] Vendor Application Approved",
    body: `Hi {{user_name}},\n\nGreat news! Your vendor application has been approved.\n\nYou can now start listing products on the marketplace.\n\nLog in to your vendor dashboard to get started.\n\n— AccsPoint Team`,
  },
  vendor_rejected: {
    subject: "[AccsPoint] Vendor Application Update",
    body: `Hi {{user_name}},\n\nUnfortunately, your vendor application was not approved at this time.\n\nReason: {{reason}}\n\nYou may reapply after addressing the issues mentioned.\n\n— AccsPoint Team`,
  },
  product_rejected: {
    subject: "[AccsPoint] Product Listing Rejected",
    body: `Hi {{user_name}},\n\nYour product listing "{{product_name}}" was not approved.\n\nReason: {{reason}}\n\nPlease review and resubmit.\n\n— AccsPoint Team`,
  },
  dispute_opened: {
    subject: "[AccsPoint] Dispute Opened",
    body: `A new dispute has been opened.\n\nBuyer: {{buyer_name}}\nOrder: {{purchase_id}}\nProduct: {{product_name}}\nReason: {{reason}}\n\nReview at: {{review_link}}\n\n— AccsPoint System`,
  },
  dispute_resolved: {
    subject: "[AccsPoint] Dispute Resolved",
    body: `Hi {{buyer_name}},\n\nYour dispute has been resolved.\n\nResolution: {{resolution}}\n\nIf you have questions, please contact support.\n\n— AccsPoint Team`,
  },
  withdrawal_requested: {
    subject: "[AccsPoint] Withdrawal Requested",
    body: `A withdrawal request has been submitted.\n\nAmount: {{amount}}\nMethod: {{method}}\nWallet: {{wallet}}\n\nPlease process this request.\n\n— AccsPoint System`,
  },
  withdrawal_processed: {
    subject: "[AccsPoint] Withdrawal Completed",
    body: `Hi {{user_name}},\n\nYour withdrawal has been processed.\n\nAmount: {{amount}} (Net: {{net_amount}})\nMethod: {{method}}\nTransaction: {{txid}}\n\n— AccsPoint Team`,
  },
  low_stock_alert: {
    subject: "[AccsPoint] Low Stock Alert",
    body: `Hi {{user_name}},\n\nYour product "{{product_name}}" is running low on stock.\n\nCurrent stock: {{stock}}\n\nPlease restock soon to avoid missing sales.\n\n— AccsPoint Team`,
  },
  out_of_stock_alert: {
    subject: "[AccsPoint] Out of Stock Alert",
    body: `Hi {{user_name}},\n\nYour product "{{product_name}}" is now out of stock.\n\nPlease restock as soon as possible.\n\n— AccsPoint Team`,
  },
  direct_report_vendor: {
    subject: "[AccsPoint] Account Report Received",
    body: `Hi {{user_name}},\n\nA buyer has reported an issue with your product.\n\nProduct: {{product_name}}\nOrder: {{purchase_id}}\nIssue: {{reason}}\n\nMessage: {{message}}\n\nPlease review and respond within 48 hours.\n\n— AccsPoint System`,
  },
  direct_report_admin: {
    subject: "[AccsPoint] New Direct Report",
    body: `A new direct report has been filed.\n\nBuyer: {{buyer_name}}\nVendor: {{vendor_name}}\nProduct: {{product_name}}\nOrder: {{purchase_id}}\nIssue: {{reason}}\n\nMessage: {{message}}\n\nReview at: {{review_link}}\n\n— AccsPoint System`,
  },
  vendor_rated: {
    subject: "[AccsPoint] You Received a {{rating}}-Star Review",
    body: `Hi {{user_name}},\n\nYou received a {{rating}}-star review.\n\nYour current average rating: {{avg_rating}} / 5 ({{total_reviews}} reviews)\n\nComment: "{{comment}}"\n\n— AccsPoint System`,
  },
  contact_seller: {
    subject: "[AccsPoint] Inquiry about {{product_name}}",
    body: `Hi {{user_name}},\n\nA buyer has sent you an inquiry about "{{product_name}}".\n\nMessage: {{message}}\n\nBuyer email: {{buyer_email}}\n\nReply directly to this email to respond.\n\n— AccsPoint System`,
  },
  password_reset: {
    subject: "[AccsPoint] Reset Your Password",
    body: `Hi {{user_name}},\n\nYou requested a password reset.\n\nClick the link below to reset your password (expires in 24 hours):\n{{reset_link}}\n\nIf you didn't request this, ignore this email.\n\n— AccsPoint Team`,
  },
  password_changed: {
    subject: "[AccsPoint] Your Password Was Changed",
    body: `Hi {{user_name}},\n\nYour password has been changed successfully.\n\nIf you didn't make this change, contact support immediately.\n\n— AccsPoint Team`,
  },
};

export const ALL_PLACEHOLDERS = [
  "{{buyer_name}}", "{{user_name}}", "{{product_name}}", "{{quantity}}",
  "{{subtotal}}", "{{discount}}", "{{coupon_code}}", "{{coupon_line}}",
  "{{total}}", "{{new_balance}}", "{{accounts}}", "{{purchase_id}}",
  "{{amount}}", "{{reason}}", "{{method}}", "{{wallet}}", "{{txid}}",
  "{{stock}}", "{{resolution}}", "{{rating}}", "{{avg_rating}}",
  "{{total_reviews}}", "{{comment}}", "{{buyer_email}}", "{{vendor_name}}",
  "{{reset_link}}", "{{review_link}}",
];
