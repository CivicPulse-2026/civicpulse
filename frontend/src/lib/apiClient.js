// Central API client for the CivicPulse frontend.
//
// - Reads the base URL from VITE_API_BASE_URL (defaults to "/api" via the Vite proxy).
// - Attaches the stored JWT as an Authorization: Bearer header.
// - Sends JSON by default, but passes FormData through untouched (for photo uploads).
// - Normalizes backend errors into a thrown ApiError with status + detail.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const TOKEN_KEY = "civicpulse.token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — auth just won't persist */
  }
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Turn a backend photo path like "/uploads/abc.jpg" into a full URL the browser can load.
export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

async function request(method, path, { body, headers, signal } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders = { ...(headers || {}) };

  const token = getToken();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body != null && !isFormData) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: finalHeaders,
      body: method === "GET" || method === "HEAD" ? undefined : payload,
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Network error. Is the backend running?", 0, null);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail : data;
    const message =
      (typeof detail === "string" && detail) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, detail);
  }

  return data;
}

export const api = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, body, opts) => request("POST", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  put: (path, body, opts) => request("PUT", path, { ...opts, body }),
  del: (path, opts) => request("DELETE", path, opts),
};

export default api;
