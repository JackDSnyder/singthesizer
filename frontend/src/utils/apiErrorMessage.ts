import axios from "axios";

const NETWORK =
  "Could not reach the server. Check your connection and try again.";
const SERVER_GENERIC = "Something went wrong. Please try again.";

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((x) => String(x)).join(" ");
  }
  return null;
}

/**
 * Human-readable message from an axios/API failure. Never surfaces `traceback`.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return fallback;
  }

  if (err.response?.status === 401) {
    return fallback;
  }

  if (!err.response) {
    return NETWORK;
  }

  const status = err.response.status;
  const raw = err.response.data;

  if (status >= 500) {
    return SERVER_GENERIC;
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const data = raw as Record<string, unknown>;

    const fromDetail = messageFromDetail(data.detail);
    if (fromDetail) return fromDetail;

    for (const [k, v] of Object.entries(data)) {
      if (k === "traceback") continue;
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
        return v[0];
      }
      if (typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
  }

  return fallback;
}
