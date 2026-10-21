/**
 * ============================================================================
 * Security Core - Zero-Dependency Hardening Layer for Student Deadline Radar
 * ============================================================================
 * Provides:
 *  1. External URL sanitization          -> kills stored XSS via javascript:/data: hrefs
 *  2. Public mail-host validation        -> kills SSRF against internal/metadata networks
 *  3. HMAC-signed stateless sessions     -> server-side auth for state-changing endpoints
 *  4. Double-submit CSRF defense         -> pairs the session cookie with a header token
 *  5. LLM output schema enforcement      -> blocks field tampering / mass assignment
 * All helpers are pure and unit-testable without a network connection.
 * ============================================================================
 */

const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

// ---------------------------------------------------------------------------
// 1. EXTERNAL URL SANITIZATION (stored-XSS kill switch)
// ---------------------------------------------------------------------------
const MAX_URL_LENGTH = 800;

/**
 * Normalizes and validates an untrusted URL for safe <a href> / window.open use.
 * Returns a normalized http(s) URL string, or null when the value must be dropped.
 */
function sanitizeExternalUrl(raw) {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;

  // Reject control characters anywhere (prevents CRLF header/ICS injection tricks)
  if (/[<>"'`\u0000-\u001f\u007f]/.test(value)) return null;

  // Refuse dangerous schemes outright (covers encoded tricks only if they survive trim)
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('blob:')) {
    return null;
  }

  // Scheme-less URLs (e.g. "forms.gle/abc") get capped to https://
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

// ---------------------------------------------------------------------------
// 2. PUBLIC HOST / IP VALIDATION (SSRF kill switch)
// ---------------------------------------------------------------------------
const BLOCKED_HOST_SUFFIXES = [
  '.localhost', '.local', '.internal', '.lan', '.home.arpa',
  '.corp', '.intranet', '.test', '.example', '.invalid'
];

/** True when an IPv4/IPv6 address is safe to connect to from a serverless function. */
function isPublicIp(rawIp) {
  const ip = String(rawIp || '').trim().toLowerCase().replace(/%.*$/, '');
  if (!ip) return false;

  if (net.isIPv4(ip)) {
    const [a, b, c, d] = ip.split('.').map(Number);
    if (![a, b, c, d].every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return false;
    if (a === 0) return false;                                    // 0.0.0.0/8 "this network"
    if (a === 10) return false;                                   // RFC1918 private
    if (a === 127) return false;                                  // loopback
    if (a === 169 && b === 254) return false;                     // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;            // RFC1918 private
    if (a === 192 && b === 0 && c === 0) return false;            // IETF protocol assignments
    if (a === 192 && b === 0 && c === 2) return false;            // TEST-NET-1
    if (a === 192 && b === 168) return false;                     // RFC1918 private
    if (a === 198 && (b === 18 || b === 19)) return false;        // benchmarking
    if (a === 198 && b === 51 && c === 100) return false;         // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return false;          // TEST-NET-3
    if (a === 100 && b >= 64 && b <= 127) return false;           // CGNAT / Tailscale 100.64.0.0/10
    if (a >= 224) return false;                                   // multicast + reserved
    return true;
  }

  // IPv6 handling
  if (ip === '::' || ip === '::1') return false;
  const v4mapped = ip.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (v4mapped) {
    if (v4mapped[1]) return isPublicIp(v4mapped[1]);
    const a = parseInt(v4mapped[2], 16);
    const b = parseInt(v4mapped[3], 16);
    return isPublicIp(`${(a >> 8) & 255}.${a & 255}.${(b >> 8) & 255}.${b & 255}`);
  }
  if (ip.startsWith('::ffff:')) {
    const tail = ip.slice(7);
    return net.isIPv4(tail) ? isPublicIp(tail) : false;
  }
  if (/^f[cd][0-9a-f]{0,3}:/.test(ip) || /^f[cd]$/.test(ip)) return false; // ULA fc00::/7 (fc00–fdff)
  if (/^fe[89ab][0-9a-f]{0,2}:/.test(ip)) return false;          // link-local fe80::/10
  if (ip.startsWith('ff')) return false;                          // multicast
  if (ip.startsWith('2001:db8')) return false;                    // documentation range
  const sixToFour = ip.match(/^2002:([0-9a-f]{2})([0-9a-f]{2}):([0-9a-f]{2})([0-9a-f]{2})/);
  if (sixToFour) return isPublicIp(`${parseInt(sixToFour[1], 16)}.${parseInt(sixToFour[2], 16)}.${parseInt(sixToFour[3], 16)}.${parseInt(sixToFour[4], 16)}`);

  return true;
}

/** Fast syntax-level check of the hostname string itself. */
function isMailHostSyntaxAllowed(hostname) {
  if (typeof hostname !== 'string') return false;
  const host = hostname.trim().toLowerCase();
  if (!host || host.length > 253) return false;
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(host) || host.endsWith('-')) return false;

  // Bars bare internal names such as "localhost", "intranet" (single labels –
  // public mail hosts are always FQDNs on the open internet)
  if (!host.includes('.')) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;

  if (BLOCKED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) return false;

  // IP literals must be public
  if (net.isIPv4(host) || host.includes(':')) {
    return isPublicIp(host);
  }
  return true;
}

/**
 * Full SSRF validation: syntax check + DNS resolution vetting.
 * Every resolved address must be globally routable, so hostnames that resolve
 * to internal, loopback, link-local/metadata, or shared-private space fail closed.
 */
async function validatePublicMailHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!isMailHostSyntaxAllowed(host)) {
    return { ok: false, reason: 'Invalid or non-public IMAP server hostname.' };
  }
  let addresses;
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch (err) {
    return { ok: false, reason: 'IMAP server hostname could not be resolved.' };
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return { ok: false, reason: 'IMAP server hostname did not resolve to any address.' };
  }
  for (const { address } of addresses) {
    if (!isPublicIp(address)) {
      return { ok: false, reason: 'IMAP server resolves to a private or protected network address.' };
    }
  }
  return { ok: true, host };
}

// ---------------------------------------------------------------------------
// 3. STATELESS SESSION TOKENS (HMAC-SHA256 signed)
// ---------------------------------------------------------------------------
const SESSION_COOKIE_NAME = 'radar_session';
const CSRF_COOKIE_NAME = 'radar_csrf';
const DEFAULT_SESSION_TTL_MS = 10 * 60 * 60 * 1000; // 10h sliding re-issue on every mailbox success

let cachedSecret = null;
let cachedSecretFlagged = false;

function getSessionSecret() {
  if (cachedSecret) return cachedSecret;
  const fromEnv = (process.env.SESSION_SECRET || '').trim();
  if (fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  if (!cachedSecretFlagged) {
    cachedSecretFlagged = true;
    console.warn('[SEC] SESSION_SECRET missing or too short (<32 chars). Using an ephemeral in-process secret: sessions do not survive restarts and are NOT shared across serverless instances. Set SESSION_SECRET in production!');
  }
  // Ephemeral fallback keeps the app functional in single-instance environments;
  // not persisted so it never leaves memory.
  cachedSecret = crypto.randomBytes(48).toString('hex');
  return cachedSecret;
}

function createSessionToken(email, ttlMs = DEFAULT_SESSION_TTL_MS) {
  const payloadObj = {
    e: String(email || '').slice(0, 254),
    iat: Date.now(),
    exp: Date.now() + Math.max(ttlMs, 60 * 1000)
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  if (!safeEqualString(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (!data.e) return null;
    return data;
  } catch {
    return null;
  }
}

/** Length-aware timing-safe string comparison. */
function safeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// 4. COOKIE HELPERS + CSRF DOUBLE-SUBMIT CHECK
// ---------------------------------------------------------------------------
function parseCookies(header) {
  const out = {};
  if (typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const rawValue = part.slice(eq + 1).trim();
    if (!key) continue;
    let value = rawValue;
    try { value = decodeURIComponent(rawValue); } catch { /* keep raw */ }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

function buildCookieString(name, value, { maxAgeSec = null, httpOnly = true, secure = true, sameSite = 'Lax', path = '/' } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; Path=${path}`;
  cookie += `; SameSite=${sameSite}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  if (maxAgeSec !== null) cookie += `; Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`;
  return cookie;
}

/** Double-submit check: csrf cookie must exist and match the request header. */
function verifyCsrfDoubleSubmit({ cookies, headerToken }) {
  const cookieToken = (cookies || {})[CSRF_COOKIE_NAME];
  if (!cookieToken || typeof headerToken !== 'string' || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  return safeEqualString(cookieToken, headerToken);
}

// ---------------------------------------------------------------------------
// 5. LLM OUTPUT SCHEMA ENFORCEMENT (anti field-tampering / mass assignment)
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ['registration', 'hackathon', 'placement', 'feedback', 'exam', 'assignment', 'event', 'form', 'other'];

function clampString(value, maxLen, defaultVal = '') {
  if (typeof value !== 'string' || !value.trim()) return defaultVal;
  return value.trim().slice(0, maxLen);
}

function clampInt(value, min, max, defaultVal) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

function clampFloat(value, min, max, defaultVal) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

/**
 * Whitelists every field the extraction pipeline may persist, clamps lengths,
 * validates enums/ranges, and strips unsafe URLs. Anything unrecognized is dropped.
 */
function sanitizeExtracted(extracted, { fallbackSubject = '' } = {}) {
  if (!extracted || typeof extracted !== 'object') return null;

  const out = {
    is_actionable: Boolean(extracted.is_actionable),
    title: clampString(extracted.title, 200, clampString(fallbackSubject, 200, 'Campus Action Notice')),
    category: VALID_CATEGORIES.includes(extracted.category) ? extracted.category : 'other',
    is_mandatory: Boolean(extracted.is_mandatory),
    action_required: clampString(extracted.action_required, 200, 'Review announcement details'),
    deadline_text_raw: clampString(extracted.deadline_text_raw, 100) || null,
    deadline_exact: extracted.deadline_exact !== false && Boolean(clampString(extracted.deadline_text_raw, 100)),
    primary_link: extracted.primary_link ? sanitizeExternalUrl(extracted.primary_link) : null,
    priority_score: clampInt(extracted.priority_score, 1, 5, 3),
    confidence: clampFloat(extracted.confidence, 0, 1, 0.95),
    reasoning: clampString(extracted.reasoning, 400) || 'Validated extraction'
  };

  // Deadline sanity window: reject years outside 2000-2100 instead of trusting the LLM
  if (extracted.deadline_iso) {
    const d = new Date(extracted.deadline_iso);
    if (Number.isNaN(d.getTime())) {
      out.deadline_iso = null;
    } else {
      const year = d.getUTCFullYear();
      out.deadline_iso = (year >= 2000 && year <= 2100) ? d.toISOString() : null;
    }
  } else {
    out.deadline_iso = null;
  }
  if (!out.deadline_iso) out.deadline_exact = Boolean(out.deadline_text_raw) && false;

  return out;
}

module.exports = {
  sanitizeExternalUrl,
  isPublicIp,
  isMailHostSyntaxAllowed,
  validatePublicMailHost,
  createSessionToken,
  verifySessionToken,
  getSessionSecret,
  safeEqualString,
  generateCsrfToken,
  parseCookies,
  buildCookieString,
  verifyCsrfDoubleSubmit,
  sanitizeExtracted,
  clampString,
  clampInt,
  clampFloat,
  VALID_CATEGORIES,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  DEFAULT_SESSION_TTL_MS
};
