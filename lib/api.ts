export interface Planet {
  name: string;
  sign: string;
  deg: number;
  house: number;
  lon?: number;
}

export interface ChartResult {
  tz: string;
  asc: string;
  planets: Planet[];
  aspects: string[];
}

export interface GeoResult {
  lat: number;
  lon: number;
  label: string;
}

export interface ServerHealth {
  status: string;
  uptime: number;
  timestamp: string;
}

export interface HoroscopeResult {
  sign: string;
  date: string;
  element: string;
  ruler: string;
  forecast: string;
  luckyAspect: string;
}

// Backend URL (from next.config.mjs env or NEXT_PUBLIC_API_URL or localhost default)
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

// Direct API calls to configured backend (Heroku in production, localhost in development).
// Falls back to relative paths only if no host is configured.
const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  BACKEND_URL
).replace(/\/$/, "");

export async function fetchGeoLocation(place: string): Promise<GeoResult> {
  const endpoint = `${BASE_URL}/api/geo?q=${encodeURIComponent(place.trim())}`;
  const res = await fetch(endpoint);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not locate birthplace");
  }
  return data;
}

export interface SignUpParams {
  email: string;
  name?: string;
  photoUrl?: string;
  dob?: string;
  birthTime?: string;
  birthPlace?: string;
  googleId?: string;
}

export interface GoogleAuthParams {
  credential?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
  dob?: string;
  birthTime?: string;
  birthPlace?: string;
}

export interface SignUpResult {
  success: boolean;
  message?: string;
  offline?: boolean;
  user?: {
    id?: string;
    email: string;
    name?: string;
    photoUrl?: string;
    dob?: string;
    birthTime?: string;
    birthPlace?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    isPremium?: boolean;
  };
}

export async function signUpUser(params: SignUpParams): Promise<SignUpResult> {
  const endpoint = `${BASE_URL}/api/users/signup`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not sign up user");
  }
  return data;
}

export async function googleAuthUser(params: GoogleAuthParams): Promise<SignUpResult> {
  const endpoint = `${BASE_URL}/api/users/google-auth`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not authenticate with Google");
  }
  return data;
}

export async function fetchBirthChart(params: {
  date: string;
  time: string;
  lat: number;
  lon: number;
  name?: string;
  email?: string;
  place?: string;
}): Promise<ChartResult> {
  const endpoint = `${BASE_URL}/api/chart`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not calculate birth chart");
  }
  return data;
}

export async function checkServerHealth(): Promise<ServerHealth | null> {
  try {
    const endpoint = `${BASE_URL}/api/health`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDailyHoroscope(sign: string): Promise<HoroscopeResult | null> {
  try {
    const endpoint = `${BASE_URL}/api/zodiac/${encodeURIComponent(sign)}/horoscope`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
