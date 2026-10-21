/**
 * Client-side mirror of the backend URL sanitizer (backend/security.js).
 * Every untrusted href (task.primary_link, extracted links, notification URLs)
 * MUST pass through here before being used in href, window.open or ICS output.
 */

const MAX_URL_LENGTH = 800;

export function safeExternalUrl(raw) {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;

  // Control characters / CR-LF anywhere -> reject outright
  // eslint-disable-next-line no-control-regex
  if (/[<>"'`\u0000-\u001f\u007f]/.test(value)) return null;

  const lower = value.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return null;
  }

  // Scheme-less ("forms.gle/abc") -> force https
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    value = `https://${value.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Convenience for ICS/calendar text fields: strips CR/LF injection chars. */
export function safeIcsText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();
}
