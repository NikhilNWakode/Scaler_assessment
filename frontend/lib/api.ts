/** Thin fetch wrapper around the FastAPI backend. */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, ""); // tolerate a trailing slash in the env var

export const WS_URL = API_URL.replace(/^http/, "ws");

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
}

export interface Participant {
  id: number;
  display_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  passcode: string;
  meeting_type: "instant" | "scheduled";
  status: "waiting" | "active" | "ended";
  scheduled_at: string | null;
  duration_minutes: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host: User;
  /** Secret host token — only present on responses meant for the host. */
  host_key?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  me: () => request<User>("/api/users/me"),

  createInstantMeeting: (title?: string) =>
    request<Meeting>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title: title ?? null }),
    }),

  scheduleMeeting: (data: {
    title: string;
    description?: string;
    scheduled_at: string;
    duration_minutes: number;
  }) =>
    request<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  upcomingMeetings: () => request<Meeting[]>("/api/meetings/upcoming"),
  recentMeetings: () => request<Meeting[]>("/api/meetings/recent"),

  getMeeting: (code: string) =>
    request<Meeting & { participants: Participant[] }>(
      `/api/meetings/${encodeURIComponent(code)}`
    ),

  joinMeeting: (code: string, displayName: string) =>
    request<{ meeting: Meeting; participant: Participant }>(
      `/api/meetings/${encodeURIComponent(code)}/join`,
      { method: "POST", body: JSON.stringify({ display_name: displayName }) }
    ),

  leaveMeeting: (code: string, participantId: number) =>
    request<Participant>(
      `/api/meetings/${encodeURIComponent(code)}/leave/${participantId}`,
      { method: "POST" }
    ),

  endMeeting: (code: string, hostKey: string) =>
    request<Meeting>(`/api/meetings/${encodeURIComponent(code)}/end`, {
      method: "POST",
      body: JSON.stringify({ host_key: hostKey }),
    }),

  cancelMeeting: (code: string, hostKey: string) =>
    request<Meeting>(
      `/api/meetings/${encodeURIComponent(code)}?host_key=${encodeURIComponent(hostKey)}`,
      { method: "DELETE" }
    ),
};

/**
 * Host keys live in localStorage on the device that created the meeting —
 * they prove host identity to the backend without a login system.
 */
const HOST_KEYS_STORAGE = "zoom_clone_host_keys";

export function saveHostKey(code: string, key: string | undefined) {
  if (!key || typeof window === "undefined") return;
  try {
    const keys = JSON.parse(localStorage.getItem(HOST_KEYS_STORAGE) ?? "{}");
    keys[code] = key;
    localStorage.setItem(HOST_KEYS_STORAGE, JSON.stringify(keys));
  } catch {
    /* storage unavailable (private mode) — host features degrade gracefully */
  }
}

export function getHostKey(code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = JSON.parse(localStorage.getItem(HOST_KEYS_STORAGE) ?? "{}");
    return keys[code] ?? null;
  } catch {
    return null;
  }
}

/** "83412907561" -> "834 1290 7561" (how Zoom displays meeting IDs) */
export function formatMeetingCode(code: string): string {
  return code.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}

export function inviteLink(code: string): string {
  if (typeof window === "undefined") return `/meeting/${code}`;
  return `${window.location.origin}/meeting/${code}`;
}
