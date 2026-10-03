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

// When NEXT_PUBLIC_API_URL is configured (e.g. in deployed / decoupled environments),
// requests go directly to that host. Otherwise, relative /api paths are used and proxied by Next.js rewrites.
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function fetchGeoLocation(place: string): Promise<GeoResult> {
  const endpoint = `${BASE_URL}/api/geo?q=${encodeURIComponent(place.trim())}`;
  const res = await fetch(endpoint);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not locate birthplace");
  }
  return data;
}

export async function fetchBirthChart(params: {
  date: string;
  time: string;
  lat: number;
  lon: number;
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
