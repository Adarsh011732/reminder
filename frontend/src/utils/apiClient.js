/**
 * API Client helper for Student Deadline Radar
 * Automatically prepends VITE_API_URL if configured for separate frontend/backend deployments (e.g. Vercel + Render),
 * or falls back to relative paths for single-service deployments (Express serving Vite bundle).
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '';
export const API_BASE = RAW_API_BASE.replace(/\/$/, '');

export function apiUrl(endpoint) {
  if (!endpoint) return API_BASE;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
}

export function apiFetch(endpoint, options) {
  return fetch(apiUrl(endpoint), options);
}

export default apiFetch;
