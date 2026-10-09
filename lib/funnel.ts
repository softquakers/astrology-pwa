import { BACKEND_URL } from "./api";

export type FunnelStep =
  | "launch"
  | "name"
  | "photo"
  | "dob"
  | "tob"
  | "subscribed"
  | "attached";

export interface FunnelTrackData {
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

const trackedInSession = new Set<string>();

/**
 * Returns a persistent anonymous client visitor ID across visits.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";
  try {
    let vid = localStorage.getItem("astro_visitor_id");
    if (!vid) {
      vid =
        "v_" +
        Math.random().toString(36).substring(2, 10) +
        "_" +
        Date.now().toString(36);
      localStorage.setItem("astro_visitor_id", vid);
    }
    return vid;
  } catch {
    return "anon-visitor";
  }
}

/**
 * Tracks a user step through the 7-stage conversion funnel:
 * 1. launch -> 2. name -> 3. photo -> 4. dob -> 5. tob -> 6. subscribed -> 7. attached
 */
export async function trackFunnelStep(
  step: FunnelStep,
  data?: FunnelTrackData
): Promise<void> {
  if (typeof window === "undefined") return;

  const visitorId = getVisitorId();
  const sessionKey = `${visitorId}_${step}`;

  // Avoid spamming identical step events within the same browsing session
  if (trackedInSession.has(sessionKey)) {
    return;
  }

  try {
    const stored = sessionStorage.getItem(`funnel_${step}`);
    if (stored) {
      trackedInSession.add(sessionKey);
      return;
    }
  } catch {}

  trackedInSession.add(sessionKey);
  try {
    sessionStorage.setItem(`funnel_${step}`, "1");
  } catch {}

  const payload = {
    step,
    visitorId,
    email: data?.email || "",
    name: data?.name || "",
    metadata: {
      platform: typeof navigator !== "undefined" ? navigator.platform : "Web",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
      ...(data?.metadata || {}),
    },
  };

  // Attempt 1: Next.js same-origin API proxy (/api/analytics/funnel)
  try {
    const res = await fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch {}

  // Attempt 2: Direct backend URL
  try {
    const baseUrl = (BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    await fetch(`${baseUrl}/api/analytics/funnel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fail silently to never interrupt user experience
  }
}
