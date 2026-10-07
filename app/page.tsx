"use client";
import { useEffect, useState, useRef } from "react";
import { fetchGeoLocation, fetchBirthChart, checkServerHealth, signUpUser, googleAuthUser, BACKEND_URL } from "../lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number | string;
            }
          ) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

type P = { name: string; sign: string; deg: number; house: number };
type Chart = { asc: string; planets: P[]; aspects: string[] };
type Rec = { q: string; name: string; at: string; chart: Chart };

const TABS = ["Home", "History", "Profile", "Plans"] as const;

const inp = "w-full min-h-12 rounded-xl border border-[#2E2752] bg-[#1A1533] px-4 text-[15px] text-[#EDE9FA] placeholder-[#6E6796] focus:border-[#E8B86B] focus:outline-none transition-colors";
const btn = "w-full min-h-14 rounded-2xl bg-[#E8B86B] font-semibold text-[#1A1230] hover:bg-[#F2C77D] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer";
const card = "rounded-2xl border border-[#2E2752] bg-[#1A1533] p-4";

function getZodiacSign(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [, m, d] = parts;
  if (!m || !d) return null;
  const days = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const signs = [
    { name: "Capricorn", symbol: "♑" },
    { name: "Aquarius", symbol: "♒" },
    { name: "Pisces", symbol: "♓" },
    { name: "Aries", symbol: "♈" },
    { name: "Taurus", symbol: "♉" },
    { name: "Gemini", symbol: "♊" },
    { name: "Cancer", symbol: "♋" },
    { name: "Leo", symbol: "♌" },
    { name: "Virgo", symbol: "♍" },
    { name: "Libra", symbol: "♎" },
    { name: "Scorpio", symbol: "♏" },
    { name: "Sagittarius", symbol: "♐" },
    { name: "Capricorn", symbol: "♑" },
  ];
  const idx = d < days[m - 1] ? m - 1 : m;
  return signs[idx];
}

const Report = ({ r }: { r: Rec }) => (
  <div className={card + " space-y-3"}>
    <div className="flex items-center justify-between border-b border-[#2E2752] pb-2">
      <span className="text-xs uppercase tracking-wider text-[#A59FC8]">Astrological Reading</span>
      <span className="text-xs text-[#E8B86B] font-medium">{r.at}</span>
    </div>
    <div>
      <div className="text-xs text-[#A59FC8]">Querent</div>
      <p className="font-medium text-[#EDE9FA]">{r.name}</p>
    </div>
    <div>
      <div className="text-xs text-[#A59FC8]">Question</div>
      <p className="italic text-[#EDE9FA]">"{r.q}"</p>
    </div>
    <div className="rounded-xl bg-[#241D42] p-3 text-sm">
      <div className="font-semibold text-[#E8B86B]">Ascendant (Rising Sign): {r.chart.asc}</div>
      <div className="mt-2 space-y-1 text-xs text-[#D6D1EE]">
        {r.chart.planets.map(p => (
          <div key={p.name} className="flex justify-between">
            <span>{p.name}</span>
            <span className="text-[#A59FC8]">{p.sign} {p.deg.toFixed(1)}° · House {p.house}</span>
          </div>
        ))}
      </div>
    </div>
    <div>
      <div className="text-xs text-[#A59FC8]">Aspects</div>
      <p className="text-xs text-[#EDE9FA]">{r.chart.aspects.join(", ") || "No major aspects found"}</p>
    </div>
    <p className="text-[11px] text-[#7C75A3] border-t border-[#2E2752] pt-2">
      Calculated using high-precision planetary ephemeris.
    </p>
  </div>
);

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Home");
  const [step, setStep] = useState<"form" | "ask" | "locked" | "report">("form");
  const [formStep, setFormStep] = useState<number>(0); // 0: Name, 1: Email, 2: Photo, 3: DOB, 4: Time, 5: Place

  const [f, setF] = useState({ name: "", email: "", date: "", time: "", place: "" });
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [googleAuthBday, setGoogleAuthBday] = useState("");
  const [showClientIdModal, setShowClientIdModal] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const tokenClientRef = useRef<any>(null);

  const [, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState(false);
  const [hist, setHist] = useState<Rec[]>([]);
  const [cur, setCur] = useState<Rec | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(true);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showPurposeDetails, setShowPurposeDetails] = useState(false);

  const getEffectiveClientId = () => {
    return (
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      (typeof window !== "undefined" ? localStorage.getItem("google_client_id") || "" : "")
    );
  };

  const initGoogleAuth = () => {
    const clientId = getEffectiveClientId();
    if (!clientId || typeof window === "undefined" || !window.google) return;

    // 1. Initialize Google Identity Services (One Tap)
    if (window.google.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res: { credential?: string }) => {
            if (res.credential) handleGoogleCredential(res.credential);
          },
        });
      } catch (e) {
        console.warn("Google Accounts initialize notice:", e);
      }
    }

    // 2. Initialize OAuth 2.0 Token Client (to request Scopes including user.birthday.read)
    if (window.google.accounts?.oauth2) {
      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile https://www.googleapis.com/auth/user.birthday.read",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error("Google OAuth error:", tokenResponse);
              setGoogleLoading(false);
              if (tokenResponse.error !== "popup_closed_by_user") {
                setErr(tokenResponse.error_description || "Google sign-in was cancelled or failed");
              }
              return;
            }
            await handleOAuthToken(tokenResponse.access_token);
          },
        });
      } catch (e) {
        console.warn("Google OAuth2 TokenClient notice:", e);
      }
    }
  };

  const handleOAuthToken = async (accessToken: string) => {
    setGoogleLoading(true);
    setErr("");
    try {
      let email = "";
      let name = "";
      let photo = "";
      let bday = "";

      // 1. Attempt to fetch profile & birthday from Google People API
      try {
        const peopleRes = await fetch(
          "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos,birthdays",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (peopleRes.ok) {
          const data = await peopleRes.json();
          email = data.emailAddresses?.[0]?.value || "";
          name = data.names?.[0]?.displayName || "";
          photo = data.photos?.[0]?.url || "";

          // Extract birthday from People API
          const bdayDate = data.birthdays?.[0]?.date;
          if (bdayDate) {
            const y = bdayDate.year ? String(bdayDate.year).padStart(4, "0") : "1990";
            const m = String(bdayDate.month || 1).padStart(2, "0");
            const d = String(bdayDate.day || 1).padStart(2, "0");
            bday = `${y}-${m}-${d}`;
          }
        }
      } catch (e) {
        console.warn("People API fetch notice:", e);
      }

      // 2. Fallback to Google userinfo if email is not yet found
      if (!email) {
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userinfoRes.ok) {
          const info = await userinfoRes.json();
          email = info.email || "";
          name = name || info.name || "";
          photo = photo || info.picture || "";
          if (info.birthdate) bday = info.birthdate;
        }
      }

      if (!email) {
        throw new Error("Could not retrieve email from Google. Please enter email manually.");
      }

      await handleGoogleAuth({
        email,
        name,
        photoUrl: photo,
        googleAuthBday: bday,
      });
    } catch (e: any) {
      console.error("Google OAuth token processing failed:", e);
      setErr(e.message || "Failed to process Google sign-in");
    } finally {
      setGoogleLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    const clientId = getEffectiveClientId();
    if (!clientId) {
      setShowClientIdModal(true);
      return;
    }

    if (tokenClientRef.current) {
      setGoogleLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      return;
    }

    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("Google One Tap error:", e);
      }
    }

    setShowClientIdModal(true);
  };

  useEffect(() => {
    try {
      setSub(localStorage.getItem("sub") === "1");
      setHist(JSON.parse(localStorage.getItem("hist") || "[]"));
    } catch {}
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    // Check Express API server connectivity
    checkServerHealth().then(res => setServerOnline(!!res));

    // Load Google Identity Services dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initGoogleAuth();
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, []);


  const handleTextChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF(prev => ({ ...prev, [k]: e.target.value }));
    if (err) setErr("");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    try {
      const base64Url = credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      const bday = payload.birthdate || payload.birthday || "";
      await handleGoogleAuth({
        email: payload.email || "",
        name: payload.name || "",
        photoUrl: payload.picture || "",
        googleAuthBday: bday,
        credential,
      });
    } catch (e) {
      console.error("Failed to decode Google credential:", e);
    }
  };

  const handleGoogleAuth = async (params: {
    email: string;
    name?: string;
    photoUrl?: string;
    credential?: string;
    googleAuthBday?: string;
  }) => {
    const cleanEmail = params.email.trim();
    const cleanName = params.name?.trim() || f.name.trim() || cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const cleanPhoto = params.photoUrl || photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=e8b86b&textColor=1a1230`;
    const cleanBday = params.googleAuthBday?.trim() || "";

    if (cleanBday) {
      setGoogleAuthBday(cleanBday);
    }

    setF(prev => ({
      ...prev,
      email: cleanEmail,
      name: cleanName,
      date: prev.date || cleanBday || prev.date,
    }));
    setPhotoUrl(cleanPhoto);
    setIsGoogleLogin(true);
    setShowClientIdModal(false);

    // Call backend API immediately so user name, profile pic, and googleAuthBday are stored in MongoDB
    try {
      await googleAuthUser({
        credential: params.credential,
        email: cleanEmail,
        name: cleanName,
        photoUrl: cleanPhoto,
        dob: (f.date.trim() || cleanBday) || undefined,
        birthTime: f.time.trim() || undefined,
        birthPlace: f.place.trim() || undefined,
        googleAuthBday: cleanBday || googleAuthBday || undefined,
      });
    } catch (apiErr) {
      console.warn("Backend Google Auth sync warning:", apiErr);
    }

    // Advance to photo or DOB step smoothly
    setFormStep(2);
  };

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      // 1. Call Sign Up API with full user details: email, name, profile pic, and DOB!
      if (f.email.trim()) {
        try {
          await signUpUser({
            email: f.email.trim(),
            name: f.name.trim(),
            photoUrl: photoUrl || undefined,
            dob: f.date.trim() || undefined,
            birthTime: f.time.trim() || undefined,
            birthPlace: f.place.trim() || undefined,
            googleAuthBday: googleAuthBday || undefined,
          });
        } catch (signUpErr) {
          console.warn("Sign up warning:", signUpErr);
        }
      }

      // 2. Resolve geographic coordinates
      const g = await fetchGeoLocation(f.place);
      setGeo(g);

      // 3. Calculate and persist chart linked to user profile
      const c = await fetchBirthChart({
        date: f.date,
        time: f.time,
        lat: g.lat,
        lon: g.lon,
        name: f.name.trim(),
        email: f.email.trim(),
        place: f.place.trim(),
      });
      setChart(c);
      setStep("ask");
    } catch (e) {
      setErr((e as Error).message || "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  }

  function ask() {
    if (!chart) return;
    const r: Rec = { q, name: f.name, at: new Date().toLocaleDateString(), chart };
    const h = [r, ...hist];
    setHist(h);
    try {
      localStorage.setItem("hist", JSON.stringify(h));
    } catch {}
    setCur(r);
    setStep(sub ? "report" : "locked");
  }

  function subscribe() {
    setSub(true);
    try {
      localStorage.setItem("sub", "1");
    } catch {}
    if (step === "locked") setStep("report");
    setTab("Home");
  }

  const stepsMeta = [
    { label: "Name", icon: "👤", desc: "Identity" },
    { label: "Email", icon: "✉️", desc: "Account" },
    { label: "Photo", icon: "📷", desc: "Portrait" },
    { label: "Birth Date", icon: "📅", desc: "Sun Sign" },
    { label: "Birth Time", icon: "🕒", desc: "Ascendant" },
    { label: "Birth Place", icon: "📍", desc: "Coordinates" },
  ];

  const zodiac = getZodiacSign(f.date);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
      <main className="flex-1 space-y-5 pb-28">
        {/* App Top Bar */}
        <header className="flex items-center justify-between py-2 border-b border-[#2E2752]/60">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8B86B] to-[#FFE2A4] text-sm text-[#1A1230] font-bold shadow-md shadow-[#E8B86B]/20">
              ✨
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-bold tracking-wide text-sm sm:text-base text-[#EDE9FA]">Astrology App</span>
              <span className="text-[10px] text-[#A59FC8]">Astro Reports</span>
            </div>
            {serverOnline !== null && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                  serverOnline
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
                title={`Backend: ${BACKEND_URL} (${serverOnline ? "Connected" : "Offline"})`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${serverOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {serverOnline ? "API Live" : "API Offline"}
              </span>
            )}
          </div>
          {sub ? (
            <span className="rounded-full bg-[#E8B86B]/20 px-2.5 py-0.5 text-xs font-medium text-[#E8B86B] border border-[#E8B86B]/30">
              Premium
            </span>
          ) : (
            <button
              onClick={() => setTab("Plans")}
              className="text-xs text-[#E8B86B] hover:underline cursor-pointer"
            >
              Upgrade
            </button>
          )}
        </header>

        {/* Home Page Title & App Purpose Section */}
        {tab === "Home" && (
          <section className="space-y-3 pt-1">
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8B86B]/10 px-3 py-0.5 text-[11px] font-medium text-[#E8B86B] border border-[#E8B86B]/25">
                ✨ Precision Ephemeris &amp; Natal Charts
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9FA]">
                Astrology App
              </h1>
              <p className="text-xs text-[#A59FC8] leading-relaxed max-w-sm mx-auto">
                Discover your exact cosmic blueprint. Calculate your natal birth chart, rising sign (ascendant), and personalized planetary insights.
              </p>
            </div>

            {/* Purpose of This App Card */}
            <div className="rounded-2xl border border-[#2E2752] bg-[#16122E]/80 p-3.5 text-xs shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#E8B86B] flex items-center gap-1.5 text-xs">
                  <span>🌌</span> Purpose of this App
                </span>
                <button
                  type="button"
                  onClick={() => setShowPurposeDetails(v => !v)}
                  className="text-[11px] text-[#E8B86B] hover:text-[#FFE2A4] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                >
                  {showPurposeDetails ? "Hide Details ▲" : "How It Works ▼"}
                </button>
              </div>

              <p className="text-[#D6D1EE] leading-relaxed">
                This app uses astronomical planetary ephemeris to map the exact cosmic sky at your birth moment. By entering your birth date, time, and coordinates, it determines your planetary signs, houses, rising sign, and aspect alignments to provide deep personal guidance and answer life questions.
              </p>

              {showPurposeDetails && (
                <div className="pt-2.5 border-t border-[#2E2752]/70 space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-[#1A1533] p-2.5 border border-[#2E2752] space-y-1">
                      <div className="font-semibold text-[#EDE9FA] flex items-center gap-1">
                        <span>🪐</span> Natal Birth Chart
                      </div>
                      <p className="text-[#A59FC8] leading-tight">
                        Calculates precise degrees of Sun, Moon, and planets across all 12 astrological houses.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#1A1533] p-2.5 border border-[#2E2752] space-y-1">
                      <div className="font-semibold text-[#EDE9FA] flex items-center gap-1">
                        <span>☀️</span> Rising Sign (Asc)
                      </div>
                      <p className="text-[#A59FC8] leading-tight">
                        Identifies the eastern horizon zodiac sign using your exact birth place coordinates and timezone.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#1A1533] p-2.5 border border-[#2E2752] space-y-1">
                      <div className="font-semibold text-[#EDE9FA] flex items-center gap-1">
                        <span>🔮</span> Question Readings
                      </div>
                      <p className="text-[#A59FC8] leading-tight">
                        Ask any career, love, or life direction query analyzed against your personal chart aspects.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#1A1533] p-2.5 border border-[#2E2752] space-y-1">
                      <div className="font-semibold text-[#EDE9FA] flex items-center gap-1">
                        <span>🔒</span> Cloud Dossier
                      </div>
                      <p className="text-[#A59FC8] leading-tight">
                        Sign in with Google to securely store and retrieve your birth chart records and dossier anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Backend Server URL Status Banner (Homepage) */}
        {tab === "Home" && (
          <div className="flex items-center justify-between rounded-xl border border-[#2E2752] bg-[#16122E]/80 px-3.5 py-2 text-xs shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#241D42] text-xs">
                ⚡
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#A59FC8] font-medium">Backend URL</span>
                <a
                  href={BACKEND_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-[#E8B86B] hover:text-[#FFE2A4] hover:underline truncate transition-colors"
                  title={`Open backend server: ${BACKEND_URL}`}
                >
                  {BACKEND_URL}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  serverOnline === true
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : serverOnline === false
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    serverOnline === true
                      ? "bg-emerald-400 animate-pulse"
                      : serverOnline === false
                      ? "bg-rose-400"
                      : "bg-amber-400"
                  }`}
                />
                {serverOnline === true ? "Online" : serverOnline === false ? "Offline" : "Connecting"}
              </span>
            </div>
          </div>
        )}

        {tab === "Home" && step === "form" && (
          <div className="space-y-6">
            {/* Step Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A59FC8]">
                <div className="flex items-center gap-1.5 font-medium">
                  {formStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormStep(s => Math.max(0, s - 1))}
                      className="mr-1 text-[#E8B86B] hover:text-[#FFE2A4] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                  <span>Step {formStep + 1} of 6</span>
                </div>
                <span className="text-[#E8B86B] font-semibold">{stepsMeta[formStep].label}</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A1533] border border-[#2E2752]">
                <div
                  className="h-full bg-gradient-to-r from-[#8870FF] to-[#E8B86B] transition-all duration-300 ease-out"
                  style={{ width: `${((formStep + 1) / 6) * 100}%` }}
                />
              </div>

              {/* Progress Milestones */}
              <div className="flex justify-between px-1 pt-1">
                {stepsMeta.map((s, idx) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={idx > formStep}
                    onClick={() => setFormStep(idx)}
                    className={`flex flex-col items-center cursor-pointer transition-opacity ${
                      idx === formStep
                        ? "text-[#E8B86B] opacity-100"
                        : idx < formStep
                        ? "text-[#A59FC8] opacity-80 hover:opacity-100"
                        : "text-[#544C7C] opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-xs">{s.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FIELD 1: NAME */}
            {formStep === 0 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>👤</span> Personal Identity
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">What's your full name?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    We'll customize your celestial readings and birth chart reports with your name.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      className={inp}
                      placeholder="e.g. Eleanor Vance"
                      value={f.name}
                      autoFocus
                      onChange={handleTextChange("name")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.name.trim()) setFormStep(1);
                      }}
                    />
                  </div>

                  {f.name.trim().length > 0 && (
                    <p className="text-xs text-[#A59FC8]">
                      Nice to meet you, <span className="font-semibold text-[#E8B86B]">{f.name.trim()}</span>!
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.name.trim()}
                  onClick={() => setFormStep(1)}
                >
                  Continue →
                </button>
              </section>
            )}

            {/* FIELD 2: EMAIL WITH GMAIL LOGIN */}
            {formStep === 1 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>✉️</span> Communication
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">What's your email address?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Use Google for instant sign-in or enter your email address manually.
                  </p>
                </div>

                {/* Google Sign-In Button */}
                <div className="space-y-3">

                  {/* Primary Google Sign-In Action */}
                  <button
                    type="button"
                    onClick={triggerGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full min-h-12 rounded-xl bg-[#231C42] hover:bg-[#2C2454] border border-[#3E346B] text-sm font-medium text-[#EDE9FA] flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-[#E8B86B]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Connecting with Google...</span>
                      </span>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{isGoogleLogin ? "Google Connected ✓" : "Continue with Google"}</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2E2752]" />
                    </div>
                    <span className="relative bg-[#0E0B1F] px-3 text-xs text-[#A59FC8]">or enter email</span>
                  </div>

                  <input
                    type="email"
                    className={inp}
                    placeholder="name@example.com"
                    value={f.email}
                    autoFocus={!isGoogleLogin}
                    onChange={handleTextChange("email")}
                    onKeyDown={e => {
                      if (e.key === "Enter" && isEmailValid) setFormStep(2);
                    }}
                  />

                  {isGoogleLogin && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#273B2F] border border-[#3A6B4C] px-3 py-2 text-xs text-[#8EF2B0]">
                      <span>✓</span>
                      <span>Signed in via Google: <strong>{f.email}</strong></span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!isEmailValid}
                  onClick={() => setFormStep(2)}
                >
                  Continue →
                </button>
              </section>
            )}

            {/* FIELD 3: PHOTOGRAPH */}
            {formStep === 2 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📷</span> Visual Dossier
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Add your photograph</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Upload a portrait photo for your astrological dossier. Photos stay local on your device.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                  <label
                    htmlFor="photo-upload"
                    className="relative group flex h-44 w-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[#4A4180] bg-[#1A1533] hover:border-[#E8B86B] hover:bg-[#231C42] transition-all shadow-inner"
                  >
                    {photoUrl ? (
                      <>
                        <img src={photoUrl} alt="Uploaded portrait" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#EDE9FA] font-medium">
                          Change Photo
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center p-4 text-center">
                        <span className="text-3xl mb-2">📸</span>
                        <span className="text-sm font-medium text-[#EDE9FA]">Upload Portrait</span>
                        <span className="text-xs text-[#A59FC8] mt-1">Tap to browse or take photo</span>
                      </div>
                    )}
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      capture="user"
                      hidden
                      onChange={handlePhotoUpload}
                    />
                  </label>

                  {photoUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8EF2B0]">✓ Photo loaded</span>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="text-xs text-red-400 hover:underline cursor-pointer ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#A59FC8] text-center max-w-xs">
                      Portrait photo helps complete your personal natal report file.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => setFormStep(3)}
                  >
                    {photoUrl ? "Continue with Photo →" : "Continue →"}
                  </button>
                  {!photoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      className="py-2 text-xs text-[#A59FC8] hover:text-[#EDE9FA] cursor-pointer"
                    >
                      Skip photo for now
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* FIELD 4: DATE OF BIRTH */}
            {formStep === 3 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📅</span> Solar Alignment
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">When were you born?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Your date of birth pinpoints the Sun's degree along the zodiac belt.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">Date of birth</label>
                    <input
                      type="date"
                      className={inp}
                      aria-label="Date of birth"
                      value={f.date}
                      autoFocus
                      onChange={handleTextChange("date")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.date) setFormStep(4);
                      }}
                    />
                  </div>

                  {/* Zodiac Preview Card */}
                  {zodiac && (
                    <div className="rounded-2xl border border-[#443875] bg-gradient-to-r from-[#201944] to-[#2B1D4E] p-4 flex items-center gap-4 shadow-sm animate-in fade-in duration-150">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8B86B]/20 text-2xl text-[#E8B86B] border border-[#E8B86B]/30">
                        {zodiac.symbol}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-[#A59FC8]">Calculated Sun Sign</div>
                        <div className="text-base font-bold text-[#E8B86B]">{zodiac.name} {zodiac.symbol}</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.date}
                  onClick={() => setFormStep(4)}
                >
                  Continue →
                </button>
              </section>
            )}

            {/* FIELD 5: TIME OF BIRTH */}
            {formStep === 4 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>🕒</span> Ascendant Precision
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">What time were you born?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Crucial for calculating your Rising Sign (Ascendant) and accurate astrological houses.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">Time of birth (24h or AM/PM)</label>
                    <input
                      type="time"
                      className={inp}
                      aria-label="Time of birth"
                      value={f.time}
                      autoFocus
                      onChange={handleTextChange("time")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.time) setFormStep(5);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setF(prev => ({ ...prev, time: "12:00" }))}
                      className="text-xs text-[#E8B86B] hover:underline cursor-pointer"
                    >
                      Don't know exact time? Use 12:00 PM (Noon)
                    </button>
                    {f.time && (
                      <span className="text-xs text-[#8EF2B0]">Selected: {f.time}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.time}
                  onClick={() => setFormStep(5)}
                >
                  Continue →
                </button>
              </section>
            )}

            {/* FIELD 6: PLACE OF BIRTH */}
            {formStep === 5 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📍</span> Earth Coordinates
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Where were you born?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Enter your birth city and country to look up geographic coordinates and timezone.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">Place of birth</label>
                    <input
                      type="text"
                      className={inp}
                      placeholder="e.g. San Francisco, USA or Tokyo, Japan"
                      value={f.place}
                      autoFocus
                      onChange={handleTextChange("place")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.place.trim() && ok) submit();
                      }}
                    />
                  </div>

                  {/* Popular quick picks */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#A59FC8]">Quick suggestions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["New York, USA", "London, UK", "Paris, France", "Tokyo, Japan", "Mumbai, India", "Sydney, Australia"].map(city => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setF(prev => ({ ...prev, place: city }))}
                          className="rounded-lg border border-[#2E2752] bg-[#1A1533] px-2.5 py-1 text-xs text-[#A59FC8] hover:border-[#E8B86B] hover:text-[#EDE9FA] transition-colors cursor-pointer"
                        >
                          {city.split(",")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary recap */}
                  <div className="rounded-xl border border-[#2E2752] bg-[#1A1533]/80 p-3 text-xs space-y-1 text-[#A59FC8]">
                    <div className="font-semibold text-[#EDE9FA] mb-1">Your Chart Summary:</div>
                    <div className="flex justify-between">
                      <span>Name:</span> <span className="text-[#EDE9FA]">{f.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span> <span className="text-[#EDE9FA]">{f.email || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Born:</span> <span className="text-[#EDE9FA]">{f.date || "-"} at {f.time || "-"}</span>
                    </div>
                    {photoUrl && (
                      <div className="flex justify-between items-center pt-1">
                        <span>Portrait:</span>
                        <img src={photoUrl} alt="avatar" className="h-6 w-6 rounded-full object-cover border border-[#E8B86B]" />
                      </div>
                    )}
                  </div>

                  {/* Privacy policy checkbox */}
                  <label className="flex items-start gap-2.5 text-xs text-[#A59FC8] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#2E2752] bg-[#1A1533] text-[#E8B86B] accent-[#E8B86B]"
                      checked={ok}
                      onChange={e => setOk(e.target.checked)}
                    />
                    <span>
                      I agree to the{" "}
                      <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#E8B86B] underline hover:text-[#FFE2A4]">
                        Privacy Policy
                      </a>{" "}
                      and{" "}
                      <a href="/terms" target="_blank" rel="noreferrer" className="text-[#E8B86B] underline hover:text-[#FFE2A4]">
                        Terms &amp; Conditions
                      </a>
                      , and consent to calculating astrological charts from these details.
                    </span>
                  </label>

                  {err && (
                    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      ⚠️ {err}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.place.trim() || !ok || busy}
                  onClick={submit}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-[#1A1230]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Calculating Chart…
                    </span>
                  ) : (
                    "Calculate Birth Chart ✨"
                  )}
                </button>
              </section>
            )}
          </div>
        )}

        {/* STEP: ASK QUESTION */}
        {tab === "Home" && step === "ask" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className={card + " border-[#E8B86B] bg-gradient-to-r from-[#211A3D] to-[#2E204B]"}>
              <div className="text-xs uppercase tracking-wider text-[#E8B86B]">Birth Chart Ready</div>
              <div className="font-semibold text-lg text-[#EDE9FA]">{f.name}</div>
              <div className="text-sm text-[#A59FC8] mt-1">
                Ascendant: <strong className="text-[#E8B86B]">{chart?.asc}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Ask your question</h1>
              <p className="text-sm text-[#A59FC8]">
                What insights, career directions, or relationship alignments would you like to explore?
              </p>
            </div>

            <textarea
              className={inp + " min-h-28 py-3 text-sm"}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="e.g. What does my natal chart say about career growth in 2026?"
            />

            <button
              className={btn}
              disabled={!q.trim()}
              onClick={ask}
            >
              Analyze Chart & Question →
            </button>
          </div>
        )}

        {/* STEP: LOCKED (PAYWALL/PLAN PREVIEW) */}
        {tab === "Home" && step === "locked" && (
          <div className={card + " space-y-4 border-[#E8B86B]/40 animate-in fade-in duration-200"}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8B86B]/10 text-2xl text-[#E8B86B]">
              🔒
            </div>
            <div>
              <div className="text-xl font-bold text-[#EDE9FA]">Your Report is Ready</div>
              <p className="text-sm text-[#D6D1EE] mt-1">
                Your full planetary positions, houses, and aspect calculations are complete. Subscribe to unlock unlimited reports.
              </p>
            </div>
            <button className={btn} onClick={() => setTab("Plans")}>
              View Subscription Plans
            </button>
          </div>
        )}

        {/* STEP: REPORT VIEW */}
        {tab === "Home" && step === "report" && cur && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Your Report</h1>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setFormStep(0);
                  setQ("");
                }}
                className="text-xs text-[#E8B86B] hover:underline cursor-pointer"
              >
                + New Chart
              </button>
            </div>
            <Report r={cur} />
            <button
              className={btn}
              onClick={() => {
                setStep("form");
                setFormStep(0);
                setQ("");
              }}
            >
              Calculate Another Report
            </button>
          </div>
        )}

        {/* TAB: HISTORY */}
        {tab === "History" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">History</h1>
            {hist.length === 0 ? (
              <div className={card + " text-center py-8 text-[#A59FC8]"}>
                <span className="text-3xl block mb-2">📜</span>
                No reports generated yet.
              </div>
            ) : (
              hist.map((r, i) =>
                sub ? (
                  <Report key={i} r={r} />
                ) : (
                  <div key={i} className={card + " space-y-1"}>
                    <div className="font-medium text-[#EDE9FA]">{r.q}</div>
                    <div className="text-xs text-[#A59FC8] flex justify-between pt-1">
                      <span>{r.at}</span>
                      <span className="text-[#E8B86B]">Locked · Subscribe to view</span>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        )}

        {/* TAB: PROFILE */}
        {tab === "Profile" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Profile</h1>
            <div className={card + " space-y-4"}>
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <img src={photoUrl} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover border-2 border-[#E8B86B]" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2E2752] text-2xl text-[#E8B86B]">
                    👤
                  </div>
                )}
                <div>
                  <div className="font-semibold text-base text-[#EDE9FA]">{f.name || "Guest Querent"}</div>
                  <div className="text-xs text-[#A59FC8]">{f.email || "No email provided"}</div>
                  {isGoogleLogin && (
                    <span className="inline-block mt-1 text-[11px] text-[#8EF2B0]">
                      ✓ Google Authenticated
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-[#2E2752] pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#A59FC8]">Subscription Plan:</span>
                  <span className="font-medium text-[#E8B86B]">{sub ? "Premium Active (Demo)" : "Free Explorer"}</span>
                </div>
                {f.date && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">Date of Birth:</span>
                    <span className="text-[#EDE9FA]">{f.date}</span>
                  </div>
                )}
                {f.time && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">Time of Birth:</span>
                    <span className="text-[#EDE9FA]">{f.time}</span>
                  </div>
                )}
                {f.place && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">Birth City:</span>
                    <span className="text-[#EDE9FA]">{f.place}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Server Connection Details */}
            <div className={card + " space-y-2 text-xs"}>
              <div className="font-semibold text-[#EDE9FA]">Server Connection</div>
              <div className="flex justify-between items-center">
                <span className="text-[#A59FC8]">Backend URL:</span>
                <a
                  href={BACKEND_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-[#E8B86B] hover:underline truncate max-w-[200px]"
                >
                  {BACKEND_URL}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A59FC8]">API Status:</span>
                <span className={serverOnline ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {serverOnline ? "Online (Express)" : "Offline"}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setFormStep(0);
                  setTab("Home");
                }}
                className="w-full min-h-12 rounded-xl border border-[#2E2752] bg-[#1A1533] text-sm text-[#EDE9FA] hover:border-[#E8B86B] transition-colors cursor-pointer"
              >
                Edit Birth Details
              </button>

              <div className="flex justify-center items-center gap-3 text-xs text-[#A59FC8] pt-1">
                <a href="/privacy-policy" target="_blank" rel="noreferrer" className="hover:text-[#E8B86B] underline transition-colors">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-[#E8B86B] underline transition-colors">
                  Terms &amp; Conditions
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLANS */}
        {tab === "Plans" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Membership Plans</h1>
            <p className="text-xs text-[#A59FC8]">
              Unlock deep-dive chart interpretations, planetary transits, and unlimited query analysis.
            </p>

            {[
              ["Monthly Access", "$9.99 / month", "Billed monthly, cancel anytime"],
              ["Annual Cosmic Pass", "$79.99 / year", "Save 33% + Full solar return forecast"]
            ].map(([n, p, d]) => (
              <div key={n} className={card + " space-y-3 border-[#2E2752] hover:border-[#E8B86B]/50 transition-colors"}>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-base text-[#EDE9FA]">{n}</span>
                  <span className="text-base font-bold text-[#E8B86B]">{p}</span>
                </div>
                <p className="text-xs text-[#A59FC8]">{d}</p>
                <button
                  className={btn}
                  onClick={subscribe}
                  disabled={sub}
                >
                  {sub ? "Current Plan ✓" : "Activate (Demo Mode)"}
                </button>
              </div>
            ))}

            <p className="text-center text-xs text-[#7C75A3] pt-2">
              Demo sandbox: no actual card payment will be processed.
            </p>
          </div>
        )}
      </main>

      {/* GOOGLE CLIENT ID SETUP MODAL (Shown only if Client ID is not yet configured) */}
      {showClientIdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#3E346B] bg-[#171233] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2E2752]">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-sm font-semibold text-[#EDE9FA]">Connect Google Sign-In</span>
              </div>
              <button
                type="button"
                onClick={() => setShowClientIdModal(false)}
                className="text-[#A59FC8] hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A59FC8] leading-relaxed">
              To launch the official Google popup and read profile/birthday data, enter your Google OAuth Web Client ID (from Google Cloud Console):
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                className={inp + " min-h-10 text-xs py-2"}
                value={customClientId}
                onChange={e => setCustomClientId(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!customClientId.trim()}
                  onClick={() => {
                    const clean = customClientId.trim();
                    if (clean) {
                      localStorage.setItem("google_client_id", clean);
                      setShowClientIdModal(false);
                      initGoogleAuth();
                      setTimeout(() => {
                        triggerGoogleSignIn();
                      }, 200);
                    }
                  }}
                  className="flex-1 rounded-xl bg-[#E8B86B] py-2.5 text-xs font-semibold text-[#1A1230] disabled:opacity-50 cursor-pointer"
                >
                  Save &amp; Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setShowClientIdModal(false)}
                  className="rounded-xl border border-[#3E346B] px-3 text-xs text-[#A59FC8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="text-[11px] text-[#7C75A3] bg-[#150F2B] p-2.5 rounded-xl border border-[#2E2752] space-y-1">
                <div>💡 <strong className="text-[#A59FC8]">For production:</strong></div>
                <div>Add <code className="text-[#E8B86B]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your Netlify Environment Variables.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-[#2E2752] bg-[#150F2B]/95 backdrop-blur-md px-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 z-40">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "min-h-11 flex-1 text-xs font-medium cursor-pointer transition-colors flex flex-col items-center justify-center gap-0.5 " +
              (tab === t ? "text-[#E8B86B] font-semibold" : "text-[#A59FC8] hover:text-[#EDE9FA]")
            }
          >
            <span>{t === "Home" ? "🌟" : t === "History" ? "📜" : t === "Profile" ? "👤" : "💎"}</span>
            <span>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
