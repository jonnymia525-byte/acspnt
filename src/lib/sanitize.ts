/**
 * Simple server-side HTML sanitizer.
 * Strips all tags except a safe subset and removes event handlers.
 * This is a defense-in-depth measure — not a full sanitizer.
 * For production, consider using a library like DOMPurify on the client
 * and sanitize-html on the server.
 */

const SAFE_TAGS = new Set([
  "b", "i", "u", "strong", "em", "br", "p", "span", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "img",
]);

const SAFE_ATTRS = new Set(["href", "src", "alt", "title", "class", "style", "target", "rel"]);

const EVENT_HANDLER_RE = /\bon\w+\s*=/gi;
const JAVASCRIPT_RE = /javascript\s*:/gi;
const DATA_URI_RE = /data\s*:[^image]/gi;
const STYLE_URL_RE = /url\s*\(/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Remove event handlers: onclick, onerror, onload, etc.
  let clean = html.replace(EVENT_HANDLER_RE, "data-removed=");

  // Remove javascript: URLs
  clean = clean.replace(JAVASCRIPT_RE, "data-removed:");

  // Remove non-image data: URIs
  clean = clean.replace(DATA_URI_RE, "data-removed:");

  // Remove CSS url() that could load external resources
  clean = clean.replace(STYLE_URL_RE, "url(removed:");

  // Strip tags not in the safe list
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const lower = tag.toLowerCase();
    if (SAFE_TAGS.has(lower)) return match;
    return ""; // strip unsafe tags
  });

  // Strip attributes not in the safe list
  clean = clean.replace(/\s([a-zA-Z-]+)\s*=\s*(?:"[^"]*"|'[^']*')/gi, (match, attr) => {
    if (SAFE_ATTRS.has(attr.toLowerCase())) return match;
    return "";
  });

  return clean;
}

/**
 * Strip all HTML tags — for contexts where no HTML is allowed.
 */
export function stripAllHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}
