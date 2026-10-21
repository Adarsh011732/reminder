/**
 * API Client helper for Student Deadline Radar
 * - Prepends VITE_API_URL for separate frontend/backend deployments (e.g. Vercel + Render),
 *   or uses relative paths for single-service deployments (Express serving the Vite bundle).
 * - Attaches the double-submit CSRF header on mutating requests.
 * - Sends credentials when the API base is a different origin (cookie sessions).
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '';
export const API_BASE = RAW_API_BASE.replace(/\/$/, '');

export function apiUrl(endpoint) {
  if (!endpoint) return API_BASE;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
}

function readCsrfCookie() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)radar_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const opts = { ...options, headers: new Headers(options.headers || undefined) };

  // Different-origin API deployments must carry the session cookie explicitly
  if (/^https?:\/\//i.test(url)) {
    let crossOrigin = true;
    try { crossOrigin = new URL(url, window.location.href).origin !== window.location.origin; } catch {}
    if (crossOrigin) opts.credentials = opts.credentials || 'include';
  }

  // Double-submit CSRF token for state-changing calls (paired with HttpOnly session cookie)
  const method = (opts.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = readCsrfCookie();
    if (csrfToken && !opts.headers.has('x-radar-csrf')) {
      opts.headers.set('x-radar-csrf', csrfToken);
    }
  }

  return fetch(url, opts);
}

export default apiFetch;
