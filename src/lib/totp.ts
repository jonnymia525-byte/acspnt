// RFC 6238 TOTP implementation (pure crypto, no dependencies)
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function base32Encode(bytes: Uint8Array): string {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(str: string): Uint8Array {
  let bits = "";
  for (const c of str.toUpperCase()) {
    const idx = BASE32_CHARS.indexOf(c);
    if (idx === -1) throw new Error(`Invalid base32 char: ${c}`);
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function hmacSha1(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}

function intToBytes(num: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(4, num, false);
  return buf;
}

export async function totpCode(secret: string, timeStep = 30, digits = 6): Promise<string> {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const counterBytes = intToBytes(counter);
  const hmac = await hmacSha1(key.buffer as ArrayBuffer, counterBytes);
  const hmacArr = new Uint8Array(hmac);
  const offset = hmacArr[hmacArr.length - 1] & 0x0f;
  const code =
    ((hmacArr[offset] & 0x7f) << 24) |
    ((hmacArr[offset + 1] & 0xff) << 16) |
    ((hmacArr[offset + 2] & 0xff) << 8) |
    (hmacArr[offset + 3] & 0xff);
  return (code % Math.pow(10, digits)).toString().padStart(digits, "0");
}

export async function verifyTotp(secret: string, code: string, window = 1): Promise<boolean> {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  for (let i = -window; i <= window; i++) {
    const shiftedBytes = intToBytes(counter + i);
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key.buffer as ArrayBuffer, shiftedBytes);
    const hmacArr = new Uint8Array(hmac);
    const offset = hmacArr[hmacArr.length - 1] & 0x0f;
    const numericCode =
      ((hmacArr[offset] & 0x7f) << 24) |
      ((hmacArr[offset + 1] & 0xff) << 16) |
      ((hmacArr[offset + 2] & 0xff) << 8) |
      (hmacArr[offset + 3] & 0xff);
    const expected = (numericCode % 1000000).toString().padStart(6, "0");
    if (expected === code) return true;
  }
  return false;
}

export function otpauthUri(secret: string, username: string): string {
  return `otpauth://totp/AccsPoint:${encodeURIComponent(username)}?secret=${secret}&issuer=AccsPoint&algorithm=SHA1&digits=6&period=30`;
}

export function qrCodeUrl(secret: string, username: string): string {
  const uri = otpauthUri(secret, username);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
}

export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    codes.push(Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));
  }
  return codes;
}

export function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    instagram: "#E4405F", facebook: "#1877F2", telegram: "#26A5E4", x: "#000000",
    twitter: "#1DA1F2", tiktok: "#000000", linkedin: "#0A66C2", gmail: "#EA4335",
    outlook: "#0078D4", discord: "#5865F2", reddit: "#FF4500", youtube: "#FF0000",
    pinterest: "#BD081C", snapchat: "#FFFC00",
  };
  return colors[platform] || "#666666";
}

export function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    instagram: "📷", facebook: "📘", telegram: "✈️", x: "𝕏", twitter: "🐦",
    tiktok: "🎵", linkedin: "💼", gmail: "📧", outlook: "📬", discord: "💬",
    reddit: "🔴", youtube: "▶️", pinterest: "📌", snapchat: "👻",
  };
  return icons[platform] || "🌐";
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    aged: "Aged", follower: "Followers", storage: "Storage",
    fresh: "Fresh", verified: "Verified", bulk: "Bulk",
  };
  return labels[cat] || cat;
}

export function platformLabel(p: string): string {
  const labels: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", telegram: "Telegram",
    x: "X (Twitter)", twitter: "Twitter", tiktok: "TikTok", linkedin: "LinkedIn",
    gmail: "Gmail", outlook: "Outlook", discord: "Discord", reddit: "Reddit",
    youtube: "YouTube", pinterest: "Pinterest", snapchat: "Snapchat",
  };
  return labels[p] || p;
}
