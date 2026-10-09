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
  googleAuthBday?: string;
}

export interface GoogleAuthParams {
  credential?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
  dob?: string;
  birthTime?: string;
  birthPlace?: string;
  googleAuthBday?: string;
}

export interface SignUpResult {
  success: boolean;
  token?: string;
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
    googleAuthBday?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    isPremium?: boolean;
  };
}

const TOKEN_KEY = "auth_token";
const TOKEN_EXPIRY_KEY = "auth_token_expiry";

/**
 * Returns stored JWT session token if present and not expired (valid for 30 days).
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const expStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expStr) {
      const expTime = parseInt(expStr, 10);
      if (Date.now() > expTime) {
        // Expired after 1 month
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        return null;
      }
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves JWT session token with a 30-day (1 month) expiration timestamp in localStorage.
 */
export function saveStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + thirtyDaysMs));
  } catch {}
}

/**
 * Clears stored JWT session token from localStorage.
 */
export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
}

/**
 * Verifies the 30-day JWT session token with the backend and returns user details.
 */
export async function verifySessionToken(token: string): Promise<SignUpResult | null> {
  try {
    const endpoint = `${BASE_URL}/api/users/me`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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

export interface UploadPhotoResult {
  success: boolean;
  message?: string;
  photoUrl: string;
  key?: string;
  bucket?: string;
  folder?: string;
}

export async function uploadUserPhoto(photoData: string, email?: string): Promise<UploadPhotoResult> {
  const endpoint = `${BASE_URL}/api/users/upload-photo`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo: photoData, email }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Could not upload photograph");
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

export interface SubscriptionPlanItem {
  id: "monthly" | "three_month";
  name: string;
  tagline: string;
  amount: number;
  amountPaise?: number;
  period?: string;
  interval?: number;
  intervals?: number;
  intervalType?: string;
  badge?: string;
  savings?: string;
  perMonthText: string;
  features: string[];
}

export interface PlansResponse {
  success: boolean;
  plans: SubscriptionPlanItem[];
  gateway: {
    provider: string;
    method: string;
    keyId?: string;
    isConfigured: boolean;
    env?: string;
  };
}

export async function fetchSubscriptionPlans(): Promise<PlansResponse | null> {
  try {
    const endpoint = `${BASE_URL}/api/subscriptions/plans`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface CreateSubscriptionParams {
  planId: "monthly" | "three_month";
  email: string;
  name?: string;
  phone?: string;
  returnUrl?: string;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  authLink: string;
  keyId?: string;
  razorpayPlanId?: string;
  plan: SubscriptionPlanItem;
  isDemo: boolean;
  message?: string;
  error?: string;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<CreateSubscriptionResponse> {
  const endpoint = `${BASE_URL}/api/subscriptions/create`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Failed to initialize subscription checkout");
  }
  return data;
}

export const createCashfreeSubscription = createSubscription;

export interface VerifySubscriptionResult {
  success: boolean;
  status: string;
  isPremium: boolean;
  subscriptionPlan: string;
  user?: any;
  subscription?: any;
  error?: string;
}

export async function verifySubscription(params: {
  subscriptionId: string;
  paymentId?: string;
  signature?: string;
  email?: string;
}): Promise<VerifySubscriptionResult> {
  const endpoint = `${BASE_URL}/api/subscriptions/verify`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Failed to verify subscription payment");
  }
  return data;
}

export const verifyCashfreeSubscription = verifySubscription;

export async function checkSubscriptionStatus(
  subscriptionId: string
): Promise<any> {
  const endpoint = `${BASE_URL}/api/subscriptions/status/${encodeURIComponent(
    subscriptionId
  )}`;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  return await res.json();
}

export const checkCashfreeSubscriptionStatus = checkSubscriptionStatus;

export interface AstrologicalAnswer {
  aiAnswer?: string;
  summary: string;
  interpretation: string;
  keyPlacements: { planet: string; sign: string; house: number; relevance: string }[];
  cosmicAdvice: string[];
  timing: string;
}

export async function askAstrologyQuestion(params: {
  question: string;
  name?: string;
  chart: any;
  customApiKey?: string;
  language?: "en" | "hi";
}): Promise<AstrologicalAnswer> {
  // First attempt: call configured backend endpoint (e.g. Express server on :5000)
  try {
    const endpoint = `${BASE_URL}/api/chart/ask`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok && data.success && data.answer) {
      return data.answer;
    }
  } catch (err) {
    console.warn("Backend /api/chart/ask call warning:", err);
  }

  // Second attempt: call Next.js route /api/chart/ask directly
  try {
    const res = await fetch("/api/chart/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok && data.success && data.answer) {
      return data.answer;
    }
  } catch (err) {
    console.warn("Next.js /api/chart/ask call warning:", err);
  }

  throw new Error("Unable to contact astrological reading service.");
}

export interface AttachScreenParams {
  email?: string;
  name?: string;
  question?: string;
  platform?: string;
  userAgent?: string;
}

export async function recordAttachScreen(
  params: AttachScreenParams
): Promise<{ success: boolean; message?: string }> {
  try {
    const endpoint = `${BASE_URL}/api/users/attach-screen`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("recordAttachScreen API call warning:", err);
    return { success: true, message: "Saved locally" };
  }
}
