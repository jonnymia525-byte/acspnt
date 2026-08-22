import { prisma } from "./prisma";
import { DEFAULT_TEMPLATES } from "./email-templates";

interface SendEmailParams {
  to: string;
  templateKey: string;
  vars: Record<string, string>;
  userId?: string;
}

export async function sendEmail({ to, templateKey, vars, userId }: SendEmailParams) {
  // Load template from DB (customized) or use default
  const setting = await prisma.setting.findUnique({ where: { key: `email_template_${templateKey}` } });

  let subject: string;
  let body: string;

  if (setting) {
    try {
      const parsed = JSON.parse(setting.value);
      subject = parsed.subject;
      body = parsed.body;
    } catch {
      const def = DEFAULT_TEMPLATES[templateKey];
      if (!def) return;
      subject = def.subject;
      body = def.body;
    }
  } else {
    const def = DEFAULT_TEMPLATES[templateKey];
    if (!def) return;
    subject = def.subject;
    body = def.body;
  }

  // Replace placeholders
  for (const [key, value] of Object.entries(vars)) {
    const token = `{{${key}}}`;
    subject = subject.replaceAll(token, value);
    body = body.replaceAll(token, value);
  }

  // Log to EmailLog (in production, would actually send via SMTP)
  try {
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        templateKey,
        subject,
        body,
        status: "sent",
        userId,
      },
    });
  } catch (err) {
    console.error("Failed to log email:", err);
  }

  // TODO: Plug in real SMTP transport (Nodemailer/SES) here
  // await transporter.sendMail({ from: 'noreply@accspoint.com', to, subject, text: body });

  return { subject, body };
}
