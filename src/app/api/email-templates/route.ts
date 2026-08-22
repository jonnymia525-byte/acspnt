import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES } from "@/lib/email-templates";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const saved = await prisma.setting.findMany({ where: { key: { startsWith: "email_template_" } } });
  const savedMap = new Map(saved.map((s) => [s.key.replace("email_template_", ""), s.value]));

  const templates = Object.entries(DEFAULT_TEMPLATES).map(([key, def]) => {
    const override = savedMap.get(key);
    let customized = false;
    let subject = def.subject;
    let body = def.body;

    if (override) {
      try {
        const parsed = JSON.parse(override);
        subject = parsed.subject || def.subject;
        body = parsed.body || def.body;
        customized = parsed.subject !== def.subject || parsed.body !== def.body;
      } catch {}
    }

    return { key, subject, body, customized };
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, subject, body } = await req.json();
  if (!key || !subject || !body) return NextResponse.json({ error: "All fields required" }, { status: 400 });

  await prisma.setting.upsert({
    where: { key: `email_template_${key}` },
    update: { value: JSON.stringify({ subject, body }) },
    create: { key: `email_template_${key}`, value: JSON.stringify({ subject, body }) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });

  await prisma.setting.delete({ where: { key: `email_template_${key}` } }).catch(() => {});
  return NextResponse.json({ success: true });
}
