// --- Configuration ---
const API_BASE_URL = "https://elsayedghoonaim-internet-quota.hf.space";

/**
 * Creates authenticated headers for API requests.
 */
export function getHeaders(auth) {
  const base64Creds = btoa(`${auth.username}:${auth.password}`);
  return {
    'Authorization': `Basic ${base64Creds}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Generic fetch helper with auth and error handling.
 */
export async function apiFetch(path, auth, options = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(auth), ...(options.headers || {}) }
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}
