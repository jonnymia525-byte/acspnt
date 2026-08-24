/**
 * Look up geographic location from IP address.
 * Uses free ip-api.com (no key required, 45 req/min limit).
 * Returns country and city, or null if lookup fails.
 */
export async function geoLookup(ip: string): Promise<{ country: string; city: string } | null> {
  // Skip lookup for local/unknown IPs
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === "success") {
      return { country: data.country || "", city: data.city || "" };
    }
    return null;
  } catch {
    return null;
  }
}
