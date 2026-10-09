"use client";
import { useEffect, useState, useRef } from "react";
import {
  fetchGeoLocation,
  fetchBirthChart,
  checkServerHealth,
  signUpUser,
  googleAuthUser,
  fetchSubscriptionPlans,
  createSubscription,
  verifySubscription,
  SubscriptionPlanItem,
  BACKEND_URL,
  askAstrologyQuestion,
  AstrologicalAnswer,
  getStoredToken,
  saveStoredToken,
  clearStoredToken,
  verifySessionToken,
  recordAttachScreen,
} from "../lib/api";

declare global {
  interface Window {
    Razorpay?: any;
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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type P = { name: string; sign: string; deg: number; house: number };
type Chart = { asc: string; planets: P[]; aspects: string[] };

type Rec = { q: string; name: string; at: string; chart: Chart; answer?: AstrologicalAnswer };

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

function generateAstrologicalAnswer(question: string, querentName: string, chart: Chart): AstrologicalAnswer {
  const qLower = question.toLowerCase();

  const sun = chart.planets.find(p => p.name === "Sun") || { name: "Sun", sign: "Aries", deg: 0, house: 1 };
  const moon = chart.planets.find(p => p.name === "Moon") || { name: "Moon", sign: "Taurus", deg: 0, house: 2 };
  const mercury = chart.planets.find(p => p.name === "Mercury") || { name: "Mercury", sign: "Gemini", deg: 0, house: 3 };
  const venus = chart.planets.find(p => p.name === "Venus") || { name: "Venus", sign: "Libra", deg: 0, house: 7 };
  const mars = chart.planets.find(p => p.name === "Mars") || { name: "Mars", sign: "Scorpio", deg: 0, house: 8 };
  const jupiter = chart.planets.find(p => p.name === "Jupiter") || { name: "Jupiter", sign: "Sagittarius", deg: 0, house: 9 };
  const saturn = chart.planets.find(p => p.name === "Saturn") || { name: "Saturn", sign: "Capricorn", deg: 0, house: 10 };
  const asc = chart.asc || "Aries";

  const isMarriage = /(marr|wedding|spouse|husband|wife|soulmate|partner|matrimon)/i.test(qLower);
  const isLove = isMarriage || /(love|dating|romance|crush|heart|relationship|bf|gf|boyfriend|girlfriend)/i.test(qLower);
  const isCareer = /(career|job|work|promotion|business|money|finance|wealth|grow|salary|profession|boss|company|hire|invest|2026|office|goal|success|raise)/i.test(qLower);
  const isHealth = /(health|stress|body|vitality|energy|healing|illness|disease|mind|exhaust|diet|workout|sleep)/i.test(qLower);

  let directAnswer = "";
  if (isMarriage) {
    const marriageOptions = [
      `Based on your 7th house alignments and upcoming Jupiter-Venus transit cycles, marriage prospects open auspiciously between late 2027 and mid-2028, marked by a deeply supportive and mutual soul connection for ${querentName}.`,
      `Your planetary transits highlight a high-probability marriage window between Autumn 2027 and Summer 2028, with favorable Venusian currents bringing long-term stability and marital harmony.`,
      `Cosmic configurations across your relationship axis indicate that marriage and life-partner commitments solidify between late 2026 and mid-2027, supported by grounding Saturn and expansive Jupiter placements.`,
    ];
    directAnswer = marriageOptions[Math.floor(Math.random() * marriageOptions.length)];
  } else if (isLove) {
    directAnswer = `Planetary alignments indicate an uplifting romantic chapter beginning over the next 4 to 8 months, where emotional reciprocity and authentic connection will flourish for ${querentName}.`;
  } else if (isCareer) {
    directAnswer = `Your 10th house planetary momentum indicates a decisive career breakthrough and lucrative advancement between early and mid-2027 for ${querentName}.`;
  } else if (isHealth) {
    directAnswer = `Your solar vitality charts a rejuvenating upward cycle starting within 3 to 5 months, provided mindful rest and restorative grounding practices are prioritized.`;
  } else {
    directAnswer = `Celestial configurations show favorable planetary currents aligning in your favor over the next 6 to 12 months, bringing clear resolution and fruitful progress for ${querentName}.`;
  }

  if (isCareer) {
    const baseSummary = `Your natal chart indicates strong professional momentum, with ${jupiter.name} in ${jupiter.sign} (House ${jupiter.house}) empowering upward career expansion for ${querentName}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: `With your Ascendant in ${asc} and your Sun radiating in ${sun.sign} in House ${sun.house}, your career blueprint thrives on clear vision and self-directed leadership. Jupiter's placement in House ${jupiter.house} signals that calculated boldness and strategic moves will unlock lucrative doors. Meanwhile, Saturn in ${saturn.sign} in House ${saturn.house} acts as your grounding pillar—ensuring that milestones achieved through discipline and consistency will stand firm over time.`,
      keyPlacements: [
        {
          planet: "Jupiter",
          sign: jupiter.sign,
          house: jupiter.house,
          relevance: `Acts as the great cosmic benefic for House ${jupiter.house}, magnifying career opportunities, recognition, and influential mentorship.`,
        },
        {
          planet: "Saturn",
          sign: saturn.sign,
          house: saturn.house,
          relevance: `Demands disciplined execution in House ${saturn.house}, rewarding patient craftsmanship and long-term stamina.`,
        },
        {
          planet: "Sun",
          sign: sun.sign,
          house: sun.house,
          relevance: `Illuminates your executive presence in ${sun.sign}, favoring authentic leadership and visible contributions.`,
        },
      ],
      timing: `Cosmic currents show high-momentum expansion through 2026, particularly when major transits activate your ${jupiter.sign} and 10th house placements. Establish foundations now for mid-cycle breakthroughs.`,
      cosmicAdvice: [
        `Focus your energy on high-leverage goals rather than spreading yourself too thin.`,
        `Cultivate strategic networks; your ${sun.sign} placement shines when collaborating with visionary allies.`,
        `Trust your intuitive radar during contract discussions and milestone transitions.`,
      ],
    };
  } else if (isLove) {
    const baseSummary = `In matters of love and relationships, your chart emphasizes emotional authenticity, with Venus in ${venus.sign} and Moon in ${moon.sign} guiding meaningful harmony.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: `With ${asc} rising and Venus placed in ${venus.sign} in House ${venus.house}, your romantic journey values heartfelt reciprocity and open-hearted communication. Moon in ${moon.sign} in House ${moon.house} indicates that emotional safety and mutual respect are essential before you give your full trust. Current astrological configurations suggest past emotional lessons are crystallizing into profound relational clarity.`,
      keyPlacements: [
        {
          planet: "Venus",
          sign: venus.sign,
          house: venus.house,
          relevance: `Fosters romantic magnetism, emotional grace, and relationship harmony in House ${venus.house}.`,
        },
        {
          planet: "Moon",
          sign: moon.sign,
          house: moon.house,
          relevance: `Anchors your inner subconscious needs in ${moon.sign}, clarifying what brings true security and warmth.`,
        },
        {
          planet: "Mars",
          sign: mars.sign,
          house: mars.house,
          relevance: `Supplies passion and healthy boundary-setting in ${mars.sign}, protecting your emotional energy.`,
        },
      ],
      timing: `Favorable Venusian currents are opening windows for heart-centered conversations, deepening commitments, and emotional synchronicity.`,
      cosmicAdvice: [
        `Express your feelings openly and directly; clarity invites reciprocated vulnerability.`,
        `Uphold personal boundaries—a healthy partnership amplifies your peace.`,
        `Allow new connections or existing bonds to evolve at an unhurried, natural tempo.`,
      ],
    };
  } else if (isHealth) {
    const baseSummary = `Your chart highlights rejuvenation and somatic balance as priorities, anchored by Sun in ${sun.sign} and Mars in ${mars.sign}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: `With ${asc} rising, your physical constitution is intimately tied to your mental surroundings. Mars in ${mars.sign} in House ${mars.house} grants potent regenerative vigor, but urges moderation against prolonged stress. Moon in ${moon.sign} reveals that restorative sleep, mindfulness, and grounding rituals are direct prerequisites for your vitality.`,
      keyPlacements: [
        {
          planet: "Sun",
          sign: sun.sign,
          house: sun.house,
          relevance: `Fuels your core vitality, immunological rhythm, and life force in ${sun.sign}.`,
        },
        {
          planet: "Mars",
          sign: mars.sign,
          house: mars.house,
          relevance: `Drives physical stamina and motivation in House ${mars.house}.`,
        },
        {
          planet: "Moon",
          sign: moon.sign,
          house: moon.house,
          relevance: `Influences your internal biorhythms, nervous system recharge, and emotional balance.`,
        },
      ],
      timing: `The celestial sky calls for conscious pacing and restorative practices over relentless hustle.`,
      cosmicAdvice: [
        `Incorporate daily grounding rituals to settle active ${sun.sign} mental energy.`,
        `Prioritize restorative sleep and hydration to keep physical channels fluid and calm.`,
        `Heed early somatic whispers before your body is forced to demand rest.`,
      ],
    };
  } else {
    const baseSummary = `Your natal chart indicates an inspiring chapter of personal alignment and cosmic clarity unfolding for ${querentName}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: `Examining your inquiry through your ${asc} Ascendant and ${sun.sign} Sun reveals a powerful awakening of self-trust. Mercury in ${mercury.sign} in House ${mercury.house} provides sharp discernment and perspective, while Jupiter in ${jupiter.sign} in House ${jupiter.house} offers cosmic protection. Aligning your day-to-day choices with your authentic core values will generate immediate peace and progress.`,
      keyPlacements: [
        {
          planet: "Sun",
          sign: sun.sign,
          house: sun.house,
          relevance: `Anchors your essential identity, purposeful direction, and creative spark in ${sun.sign}.`,
        },
        {
          planet: "Jupiter",
          sign: jupiter.sign,
          house: jupiter.house,
          relevance: `Bestows expansive wisdom, fortunate synchronicity, and higher guidance in House ${jupiter.house}.`,
        },
        {
          planet: "Mercury",
          sign: mercury.sign,
          house: mercury.house,
          relevance: `Sharpens analytical clarity, decision-making, and communication in ${mercury.sign}.`,
        },
      ],
      timing: `Planetary transits are aligning in your favor. Trust the unfolding timing and take intentional steps toward what truly resonates with your spirit.`,
      cosmicAdvice: [
        `Lead with authentic conviction; what is meant for you will not pass you by.`,
        `Note down your intuitive impressions; they hold practical wisdom for your upcoming path.`,
        `Acknowledge your past growth as the steady foundation for this next phase.`,
      ],
    };
  }
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
    {r.answer && (
      <div className="rounded-xl bg-[#241D42] p-3 text-xs space-y-2.5 border border-[#E8B86B]/30">
        {r.answer.aiAnswer && (
          <div className="rounded-lg bg-[#2C214D] p-2.5 border border-[#E8B86B]/40 space-y-1">
            <div className="font-bold text-[#E8B86B] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <span>✨</span> Direct Answer:
            </div>
            <p className="text-[#EDE9FA] font-medium leading-relaxed">{r.answer.aiAnswer}</p>
          </div>
        )}
        <div className="font-semibold text-[#E8B86B] flex items-center gap-1.5">
          <span>🔮</span> Cosmic Synthesis:
        </div>
        <p className="text-[#EDE9FA] font-medium">{r.answer.summary}</p>
        <p className="text-[#D6D1EE] leading-relaxed">{r.answer.interpretation}</p>
      </div>
    )}
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
  const [directEmail, setDirectEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const tokenClientRef = useRef<any>(null);

  // Physical Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const [, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState(false);

  const [subPlan, setSubPlan] = useState<"monthly" | "three_month">("monthly");
  const [subPhone, setSubPhone] = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [subSuccessMsg, setSubSuccessMsg] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [gatewayConfig, setGatewayConfig] = useState<{
    provider: string;
    method: string;
    keyId?: string;
    isConfigured: boolean;
  } | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [pendingSubSession, setPendingSubSession] = useState<{
    subscriptionId: string;
    planId: "monthly" | "three_month";
    amount: number;
    planName: string;
    authLink?: string;
    isDemo?: boolean;
  } | null>(null);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("gpay");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [hist, setHist] = useState<Rec[]>([]);

  const [cur, setCur] = useState<Rec | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<AstrologicalAnswer | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [openAiKey, setOpenAiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(true);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Attach App to Screen states
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appAttached, setAppAttached] = useState(false);
  const [attachSubmitting, setAttachSubmitting] = useState(false);
  const [attachSuccessMsg, setAttachSuccessMsg] = useState("");
  const [showIosGuide, setShowIosGuide] = useState(false);

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
          // Google People API often returns multiple birthday objects:
          // 1. 'PROFILE' source (often marked primary) which may only contain month & day if year is hidden.
          // 2. 'ACCOUNT' source which contains the full birth date including the year (e.g. 1988).
          if (Array.isArray(data.birthdays) && data.birthdays.length > 0) {
            const accountBday = data.birthdays.find(
              (b: any) => b?.metadata?.source?.type === "ACCOUNT" && b?.date?.year
            );
            const anyWithYear = data.birthdays.find((b: any) => b?.date?.year);
            const primaryBday = data.birthdays.find((b: any) => b?.metadata?.primary && b?.date);
            const fallbackBday = data.birthdays[0];

            const dateWithYear = accountBday?.date || anyWithYear?.date;
            const fallbackDate = primaryBday?.date || fallbackBday?.date;

            const year = dateWithYear?.year || fallbackDate?.year;
            const month = dateWithYear?.month || fallbackDate?.month;
            const day = dateWithYear?.day || fallbackDate?.day;

            if (month && day) {
              const y = year ? String(year).padStart(4, "0") : "1990";
              const m = String(month).padStart(2, "0");
              const d = String(day).padStart(2, "0");
              bday = `${y}-${m}-${d}`;
            }
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
      if (localStorage.getItem("app_attached_screen") === "true") {
        setAppAttached(true);
      }
      setSub(localStorage.getItem("sub") === "1");
      const savedHist = JSON.parse(localStorage.getItem("hist") || "[]");
      setHist(savedHist);
      const savedProfile = JSON.parse(localStorage.getItem("user_profile") || "null");
      if (savedProfile) {
        if (savedProfile.email) setF(prev => ({ ...prev, email: savedProfile.email }));
        if (savedProfile.name) setF(prev => ({ ...prev, name: savedProfile.name }));
        if (savedProfile.dob) setF(prev => ({ ...prev, date: savedProfile.dob }));
        if (savedProfile.birthTime) setF(prev => ({ ...prev, time: savedProfile.birthTime }));
        if (savedProfile.birthPlace) setF(prev => ({ ...prev, place: savedProfile.birthPlace }));
        if (savedProfile.isGoogle) setIsGoogleLogin(true);
        if (savedProfile.phone) setSubPhone(savedProfile.phone);
      }
      const savedPlan = localStorage.getItem("sub_plan") as "monthly" | "three_month" | null;
      if (savedPlan) setSubPlan(savedPlan);
      const savedPhone = localStorage.getItem("sub_phone");
      if (savedPhone) setSubPhone(savedPhone);
      const savedApiKey = localStorage.getItem("chatgpt_api_key");
      if (savedApiKey) {
        setOpenAiKey(savedApiKey);
        setApiKeyInput(savedApiKey);
      }

      // 30-Day Session Token & Auto-Navigation directly to Chat Screen on Launch
      const token = getStoredToken();
      if (token || savedProfile?.email) {
        setIsLoggedIn(true);

        // 1. Check if there is a cached birth chart in localStorage or history
        let initialChart: Chart | null = null;
        try {
          const cachedChartStr = localStorage.getItem("saved_chart");
          if (cachedChartStr) initialChart = JSON.parse(cachedChartStr);
        } catch {}

        if (!initialChart && Array.isArray(savedHist) && savedHist.length > 0 && savedHist[0].chart) {
          initialChart = savedHist[0].chart;
        }

        if (initialChart) {
          setChart(initialChart);
          if (Array.isArray(savedHist) && savedHist.length > 0) {
            setCur(savedHist[0]);
          } else {
            setCur({
              q: "Natal Birth Chart Analysis",
              name: savedProfile?.name || "Querent",
              at: new Date().toLocaleDateString(),
              chart: initialChart,
            });
          }
        }

        // 2. DIRECTLY NAVIGATE TO CHAT SCREEN!
        setStep("ask");
        setTab("Home");

        // 3. If birth details exist but chart wasn't in cache, calculate in background
        const targetDob = savedProfile?.dob;
        const targetPlace = savedProfile?.birthPlace;
        const targetTime = savedProfile?.birthTime || "12:00";
        const targetName = savedProfile?.name || "Querent";
        const targetEmail = savedProfile?.email || "";

        if (!initialChart && targetDob && targetPlace) {
          fetchGeoLocation(targetPlace)
            .then(g => {
              setGeo(g);
              return fetchBirthChart({
                date: targetDob,
                time: targetTime,
                lat: g.lat,
                lon: g.lon,
                name: targetName,
                email: targetEmail,
                place: targetPlace,
              });
            })
            .then(c => {
              setChart(c);
              try { localStorage.setItem("saved_chart", JSON.stringify(c)); } catch {}
              setCur({
                q: "Natal Birth Chart Analysis",
                name: targetName,
                at: new Date().toLocaleDateString(),
                chart: c,
              });
            })
            .catch(err => {
              console.warn("Background auto-chart calculate error:", err);
            });
        }

        // 4. Verify/sync session in background with server to refresh membership & token
        if (token) {
          verifySessionToken(token)
            .then(res => {
              if (res && res.success && res.user) {
                if (res.user.isPremium || res.user.subscriptionStatus === "active" || res.user.subscriptionStatus === "premium") {
                  setSub(true);
                  try { localStorage.setItem("sub", "1"); } catch {}
                }
                if (res.token) {
                  saveStoredToken(res.token);
                }
              } else if (res && !res.success) {
                clearStoredToken();
                setIsLoggedIn(false);
                setStep("form");
              }
            })
            .catch(() => {});
        }
      }

      // Check URL query parameters for Razorpay / payment gateway redirect
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const rzpSubId =
          urlParams.get("razorpay_subscription_id") ||
          urlParams.get("subscription_id") ||
          urlParams.get("sub_id") ||
          urlParams.get("cf_sub_id");
        const rzpPaymentId = urlParams.get("razorpay_payment_id");
        const rzpSignature = urlParams.get("razorpay_signature");
        const isVerify = urlParams.get("verify") === "1" || !!urlParams.get("razorpay_subscription_id");
        const isDemoAuth = urlParams.get("demo_auth") === "1";

        if (rzpSubId && isVerify && !isDemoAuth) {
          verifySubscription({
            subscriptionId: rzpSubId,
            paymentId: rzpPaymentId || undefined,
            signature: rzpSignature || undefined,
          })
            .then(res => {
              if (res.success || res.isPremium) {
                setSub(true);
                setSubPlan((res.subscriptionPlan as "monthly" | "three_month") || "monthly");
                try {
                  localStorage.setItem("sub", "1");
                  localStorage.setItem("sub_plan", res.subscriptionPlan || "monthly");
                } catch {}
                setSubSuccessMsg("🎉 Razorpay Payment & Membership successfully activated!");
                window.history.replaceState({}, "", "/?tab=Plans");
              }
            })
            .catch(() => {});
        } else if (isDemoAuth && rzpSubId) {
          const planParam = (urlParams.get("plan") as "monthly" | "three_month") || "monthly";
          const amountParam = parseInt(urlParams.get("amount") || "149", 10);
          setPendingSubSession({
            subscriptionId: rzpSubId,
            planId: planParam,
            amount: amountParam,
            planName: planParam === "three_month" ? "Celestial 3-Month AutoPay" : "Celestial Monthly AutoPay",
            isDemo: true,
          });
          setShowUpiModal(true);
        }
      }
    } catch {}
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    // Fetch dynamic subscription plans from backend API
    fetchSubscriptionPlans()
      .then(res => {
        if (res && res.success && res.plans && res.plans.length > 0) {
          setPlans(res.plans);
          if (res.gateway) setGatewayConfig(res.gateway);
        }
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));

    // Preload Razorpay Checkout script for fast payment modal
    loadRazorpayScript().catch(() => {});

    // Check Express API server connectivity in background
    checkServerHealth().then(res => setServerOnline(!!res));

    // Load Google Identity Services dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initGoogleAuth();
    };
    // PWA Home Screen Installation listener
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setAppAttached(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      setAppAttached(true);
    }

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);


  const handleTextChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF(prev => ({ ...prev, [k]: e.target.value }));
    if (err) setErr("");
  };

  // Camera methods
  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    setCameraError("");
    setIsCameraStarting(true);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        cameraStreamRef.current = null;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Physical camera is not supported in this browser or environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Camera video play notice:", playErr);
        }
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start notice:", err);
      setIsCameraActive(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in your browser to take a photo."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "No physical camera device was detected on your computer or device."
          : err.message || "Could not start camera."
      );
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !isCameraActive) return;

    try {
      const canvas = document.createElement("canvas");
      const vW = video.videoWidth || 640;
      const vH = video.videoHeight || 480;
      const size = Math.min(vW, vH);
      const startX = (vW - size) / 2;
      const startY = (vH - size) / 2;

      // Clean portrait square 480x480
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Mirror if user front camera so photo matches user mirror view
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, startX, startY, size, size, 0, 0, 480, 480);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setPhotoUrl(dataUrl);
      stopCamera();
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoUrl("");
    startCamera(facingMode);
  };

  const toggleCameraFacing = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Turn on camera when entering step 3 (formStep === 2) without a captured photo
  useEffect(() => {
    if (tab === "Home" && step === "form" && formStep === 2 && !photoUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [tab, step, formStep, photoUrl]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotoUrl(reader.result);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
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
    const cleanBday = params.googleAuthBday?.trim() || "";

    if (cleanBday) {
      setGoogleAuthBday(cleanBday);
    }

    setF(prev => ({
      ...prev,
      email: cleanEmail,
      name: cleanName,
    }));

    setIsGoogleLogin(true);
    setShowClientIdModal(false);

    // Call backend API to authenticate/sync user with MongoDB
    try {
      const res = await googleAuthUser({
        credential: params.credential,
        email: cleanEmail,
        name: cleanName,
        photoUrl: photoUrl || undefined,
        dob: f.date.trim() || undefined,
        birthTime: f.time.trim() || undefined,
        birthPlace: f.place.trim() || undefined,
        googleAuthBday: cleanBday || googleAuthBday || undefined,
      });

      if (res?.token) {
        saveStoredToken(res.token);
        setIsLoggedIn(true);
      }

      // Check if user is an existing user with birth chart data
      const existingUser = res?.user;
      const userDob = existingUser?.dob || f.date.trim();
      const userPlace = existingUser?.birthPlace || f.place.trim();
      const userTime = existingUser?.birthTime || f.time.trim() || "12:00";
      const userName = existingUser?.name || cleanName;
      const userPhoto = existingUser?.photoUrl || photoUrl;

      if (existingUser?.isPremium || existingUser?.subscriptionStatus === "premium") {
        setSub(true);
        try { localStorage.setItem("sub", "1"); } catch {}
      }

      if (userPhoto) {
        setPhotoUrl(userPhoto);
      }

      setF({
        name: userName,
        email: cleanEmail,
        date: userDob,
        time: userTime,
        place: userPlace,
      });

      try {
        localStorage.setItem("user_profile", JSON.stringify({
          email: cleanEmail,
          name: userName,
          dob: userDob,
          birthTime: userTime,
          birthPlace: userPlace,
          photoUrl: userPhoto,
          isGoogle: true
        }));
      } catch {}

      // If existing user already has DOB and Birth Place: automatically fetch chart and directly go to chart page!
      if (userDob && userPlace) {
        setBusy(true);
        try {
          const g = await fetchGeoLocation(userPlace);
          setGeo(g);
          const c = await fetchBirthChart({
            date: userDob,
            time: userTime,
            lat: g.lat,
            lon: g.lon,
            name: userName,
            email: cleanEmail,
            place: userPlace,
          });
          setChart(c);
          try { localStorage.setItem("saved_chart", JSON.stringify(c)); } catch {}
          setCur({
            q: "Natal Birth Chart Analysis",
            name: userName,
            at: new Date().toLocaleDateString(),
            chart: c,
          });
          setStep("ask");
          setTab("Home");
          return;
        } catch (chartErr) {
          console.warn("Auto-generating chart for existing user error:", chartErr);
          setFormStep(5);
          return;
        } finally {
          setBusy(false);
        }
      }

      // Fallback: Check local history for previously calculated chart
      const savedHistStr = typeof window !== "undefined" ? localStorage.getItem("hist") : null;
      if (savedHistStr) {
        try {
          const savedHist = JSON.parse(savedHistStr);
          if (Array.isArray(savedHist) && savedHist.length > 0 && savedHist[0].chart) {
            const lastReport = savedHist[0];
            setChart(lastReport.chart);
            try { localStorage.setItem("saved_chart", JSON.stringify(lastReport.chart)); } catch {}
            setCur(lastReport);
            if (lastReport.name) setF(prev => ({ ...prev, name: lastReport.name }));
            setStep("ask");
            setTab("Home");
            return;
          }
        } catch {}
      }
    } catch (apiErr) {
      console.warn("Backend Google Auth sync warning:", apiErr);
    }

    // New user without birth details yet: advance smoothly to photo/birthdate step
    setFormStep(2);
  };

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      // 1. Call Sign Up API with full user details: email, name, profile pic, and DOB!
      if (f.email.trim()) {
        try {
          const signUpRes = await signUpUser({
            email: f.email.trim(),
            name: f.name.trim(),
            photoUrl: photoUrl || undefined,
            dob: f.date.trim() || undefined,
            birthTime: f.time.trim() || undefined,
            birthPlace: f.place.trim() || undefined,
            googleAuthBday: googleAuthBday || undefined,
          });
          if (signUpRes?.token) {
            saveStoredToken(signUpRes.token);
            setIsLoggedIn(true);
          }
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
      try {
        localStorage.setItem("saved_chart", JSON.stringify(c));
        localStorage.setItem("user_profile", JSON.stringify({
          email: f.email.trim(),
          name: f.name.trim(),
          dob: f.date.trim(),
          birthTime: f.time.trim(),
          birthPlace: f.place.trim(),
          photoUrl: photoUrl || undefined,
        }));
      } catch {}
      setCur({
        q: "Natal Birth Chart Analysis",
        name: f.name.trim() || "Querent",
        at: new Date().toLocaleDateString(),
        chart: c,
      });
      // Directly navigate to chat screen!
      setStep("ask");
      setTab("Home");
    } catch (e) {
      setErr((e as Error).message || "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!chart) return;
    if (!q.trim()) return;

    // If user is not subscribed, navigate to subscription page as requested
    if (!sub) {
      setTab("Plans");
      return;
    }

    setAnalyzing(true);
    try {
      const reading = await askAstrologyQuestion({
        question: q.trim(),
        name: f.name.trim() || "Querent",
        chart,
        customApiKey: openAiKey.trim() || undefined,
      });

      const r: Rec = {
        q,
        name: f.name || "Querent",
        at: new Date().toLocaleDateString(),
        chart,
        answer: reading,
      };
      const h = [r, ...hist];
      setHist(h);
      try {
        localStorage.setItem("hist", JSON.stringify(h));
      } catch {}
      setCur(r);
      setCurrentAnswer(reading);
    } catch (err) {
      console.warn("API ask failed, using client astrological engine:", err);
      const reading = generateAstrologicalAnswer(q, f.name || "Querent", chart);
      const r: Rec = {
        q,
        name: f.name || "Querent",
        at: new Date().toLocaleDateString(),
        chart,
        answer: reading,
      };
      const h = [r, ...hist];
      setHist(h);
      try {
        localStorage.setItem("hist", JSON.stringify(h));
      } catch {}
      setCur(r);
      setCurrentAnswer(reading);
    } finally {
      setAnalyzing(false);
      // Ensure the generated answer is visible to the user first
      setTimeout(() => {
        const answerEl = document.getElementById("astrological-answer-section");
        if (answerEl) {
          answerEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);

      // After user sees the answer, show pop-up asking if interested in attaching to home screen
      setTimeout(() => {
        setShowAttachModal(true);
      }, 1200);
    }
  }

  async function handleConfirmAttachApp() {
    setAttachSubmitting(true);
    try {
      // 1. If browser PWA deferred prompt exists, trigger native install prompt
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          console.log("Deferred prompt user choice:", choice);
        } catch (promptErr) {
          console.warn("Deferred prompt trigger error:", promptErr);
        }
        setDeferredPrompt(null);
      } else {
        // Detect iOS Safari or browser without deferred prompt
        const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIos) {
          setShowIosGuide(true);
        }
      }

      // 2. Record this info in admin dashboard via Express backend API
      const userEmail =
        f.email ||
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user_profile") || "{}").email || ""
          : "");
      const querentName = f.name || "Querent";
      const userAgentStr = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const platformStr =
        typeof navigator !== "undefined"
          ? (navigator.platform || (navigator as any).userAgentData?.platform || "Mobile / Web")
          : "Web";

      await recordAttachScreen({
        email: userEmail,
        name: querentName,
        question: q || "Astrology natal query",
        platform: platformStr,
        userAgent: userAgentStr,
      });

      setAppAttached(true);
      try {
        localStorage.setItem("app_attached_screen", "true");
      } catch {}

      setAttachSuccessMsg("🎉 Astro Reports successfully attached to screen! Recorded in admin dashboard.");
      setTimeout(() => {
        setShowAttachModal(false);
        setAttachSuccessMsg("");
        setShowIosGuide(false);
      }, 2500);
    } catch (err) {
      console.warn("Error attaching app to screen:", err);
      setAttachSuccessMsg("🎉 Astro Reports successfully attached to screen!");
      setTimeout(() => {
        setShowAttachModal(false);
        setAttachSuccessMsg("");
        setShowIosGuide(false);
      }, 2200);
    } finally {
      setAttachSubmitting(false);
    }
  }

  const defaultPlans: SubscriptionPlanItem[] = [
    {
      id: "monthly",
      name: "Celestial Monthly AutoPay",
      tagline: "Unlimited cosmic queries billed monthly via UPI AutoPay",
      amount: 149,
      perMonthText: "₹149 / month",
      features: [
        "Unlimited natal chart query analysis",
        "Instant planetary transit readings & answers",
        "Automated monthly renewal via Razorpay UPI AutoPay",
        "Pre-debit alert 24 hrs prior",
        "Cancel or pause anytime in 1 tap",
      ],
    },
    {
      id: "three_month",
      name: "Celestial 3-Month AutoPay",
      tagline: "Best Value: 90 days of deep transit & question forecasts",
      amount: 299,
      badge: "✨ MOST POPULAR · SAVE 33%",
      savings: "Save 33% (~₹99.6/mo)",
      perMonthText: "₹299 for 3 months",
      features: [
        "All Monthly Plan features included",
        "Full 90-day astrological forecast & horizon",
        "Save 33% compared to monthly billing",
        "Single UPI authorization lasts 3 whole months",
        "Priority question calculation speed",
        "Seamless auto-renewal, cancel anytime",
      ],
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  async function initiateCheckout(targetPlan: SubscriptionPlanItem) {
    alert("Subscriptions are currently unavailable. Redirecting to home page...");
    setTab("Home");
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    return;
    setSubError("");
    setSubLoading(true);
    try {
      const email = f.email.trim() || (typeof window !== "undefined" ? localStorage.getItem("user_email") || "" : "");
      if (!email || !email.includes("@")) {
        setSubError("Please enter your email address in your profile first so your membership can be linked.");
        setSubLoading(false);
        setTab("Profile");
        return;
      }

      if (subPhone.trim()) {
        try { localStorage.setItem("sub_phone", subPhone.trim()); } catch {}
      }

      const res = await createSubscription({
        planId: targetPlan.id,
        email,
        name: f.name.trim() || undefined,
        phone: subPhone.trim() || undefined,
        returnUrl: `${window.location.origin}/?tab=Plans&verify=1`,
      });

      if (!res || !res.subscriptionId) {
        throw new Error("Unable to create subscription session with Razorpay.");
      }

      // Check if real Razorpay Checkout SDK is ready
      const rzpLoaded = await loadRazorpayScript();
      const rzpKey = res.keyId || gatewayConfig?.keyId;

      if (rzpLoaded && (window as any).Razorpay && rzpKey && !res.isDemo) {
        const options = {
          key: rzpKey,
          subscription_id: res.subscriptionId,
          name: "Astrology AI Insights",
          description: `${targetPlan.name} (₹${targetPlan.amount})`,
          prefill: {
            name: f.name.trim() || "",
            email,
            contact: subPhone.trim() || "",
          },
          theme: {
            color: "#E8B86B",
          },
          handler: async function (response: any) {
            setSubLoading(true);
            try {
              const verifyRes = await verifySubscription({
                subscriptionId: response.razorpay_subscription_id || res.subscriptionId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                email,
              });

              if (verifyRes.success || verifyRes.isPremium) {
                setSub(true);
                setSubPlan(targetPlan.id);
                try {
                  localStorage.setItem("sub", "1");
                  localStorage.setItem("sub_plan", targetPlan.id);
                } catch {}
                setSubSuccessMsg(`🎉 Payment Successful! ₹${targetPlan.amount} ${targetPlan.name} is now active.`);
                if (step === "locked") setStep("ask");
                setTimeout(() => setSubSuccessMsg(""), 8000);
              } else {
                throw new Error("Payment verification failed. Please try again.");
              }
            } catch (vErr: any) {
              setSubError(vErr.message || "Payment verification failed.");
            } finally {
              setSubLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubLoading(false);
            },
          },
        };

        const rzpInstance = new (window as any).Razorpay(options);
        rzpInstance.open();
        return;
      }

      // Live Razorpay hosted short_url redirect fallback
      if (res.authLink && !res.authLink.includes("demo_auth=1")) {
        window.location.href = res.authLink;
        return;
      }

      // Interactive simulation modal (only if gateway keys are missing/simulation)
      setPendingSubSession({
        subscriptionId: res.subscriptionId,
        planId: targetPlan.id,
        amount: targetPlan.amount,
        planName: targetPlan.name,
        authLink: res.authLink,
        isDemo: res.isDemo,
      });
      setShowUpiModal(true);
    } catch (err: any) {
      setSubError(err.message || "Failed to initiate payment. Please try again.");
    } finally {
      setSubLoading(false);
    }
  }

  function initiateUpiAutopay(planId: "monthly" | "three_month") {
    const chosen = displayPlans.find(p => p.id === planId) || {
      id: planId,
      name: planId === "three_month" ? "Celestial 3-Month AutoPay" : "Celestial Monthly AutoPay",
      tagline: "",
      amount: planId === "three_month" ? 299 : 149,
      perMonthText: planId === "three_month" ? "₹299 for 3 months" : "₹149 / month",
      features: [],
    };
    return initiateCheckout(chosen);
  }

  async function confirmUpiMandate() {
    if (!pendingSubSession) return;
    setPinSubmitting(true);
    setSubError("");
    try {
      const email = f.email.trim() || (typeof window !== "undefined" ? localStorage.getItem("user_email") || "" : "");
      const result = await verifySubscription({
        subscriptionId: pendingSubSession.subscriptionId,
        email,
      });

      if (result.success || result.isPremium) {
        setSub(true);
        setSubPlan(pendingSubSession.planId);
        try {
          localStorage.setItem("sub", "1");
          localStorage.setItem("sub_plan", pendingSubSession.planId);
        } catch {}
        setShowUpiModal(false);
        setPendingSubSession(null);
        setSubSuccessMsg(
          `🎉 AutoPay Active! ₹${pendingSubSession.amount} ${
            pendingSubSession.planId === "three_month" ? "3-Month" : "Monthly"
          } plan confirmed.`
        );
        if (step === "locked") setStep("ask");
        setTimeout(() => {
          setSubSuccessMsg("");
        }, 7000);
      } else {
        throw new Error("Mandate was not approved by payment gateway.");
      }
    } catch (err: any) {
      setSubError(err.message || "Mandate verification failed. Please try again.");
    } finally {
      setPinSubmitting(false);
    }
  }


  function subscribe() {
    initiateUpiAutopay("monthly");
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
        <header className="flex items-center justify-between py-2 border-b border-[#2E2752]/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8B86B] to-[#FFE2A4] text-sm text-[#1A1230] font-bold shadow-md shadow-[#E8B86B]/20 shrink-0">
              ✨
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-bold tracking-wide text-sm sm:text-base text-[#EDE9FA]">Astrology App</span>
              <span className="text-[10px] text-[#A59FC8]">Astro Reports</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Account Action Button (if signed in or chart ready) */}
            {(isGoogleLogin || isLoggedIn || chart) && (
              <button
                type="button"
                onClick={() => {
                  if (chart) {
                    setStep("ask");
                    setTab("Home");
                  } else {
                    setTab("Profile");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#201A3D] hover:bg-[#2C2454] border border-[#443875] text-[#EDE9FA] transition-colors cursor-pointer"
                title={chart ? "View your birth chart" : "View profile"}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="User" className="h-4 w-4 rounded-full object-cover border border-[#E8B86B]" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )}
                <span className="truncate max-w-[80px] text-[11px] font-medium">
                  {chart ? "Chart Ready" : (f.name ? f.name.split(" ")[0] : "Account")}
                </span>
              </button>
            )}

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
          </div>
        </header>

        {/* Home Page Title Section */}
        {tab === "Home" && (
          <section className="space-y-1.5 text-center pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9FA]">
              Astrology App
            </h1>
            <p className="text-xs text-[#A59FC8] leading-relaxed max-w-sm mx-auto">
              हम आपका भविष्य बताने के लिए जन्म कुंडली और चेहरा पढ़ने की विद्या दोनों का एक साथ उपयोग करते हैं। क्या हम शुरू करें?
            </p>
          </section>
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

            {/* FIELD 2: EMAIL */}
            {formStep === 1 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>✉️</span> Communication
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">What's your email address?</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Enter your email address to receive your birth chart reading.
                  </p>
                </div>

                <div className="space-y-3">
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

            {/* FIELD 3: PHOTOGRAPH / REAL CAMERA */}
            {formStep === 2 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📷</span> Visual Dossier
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Take your real photo</h1>
                  <p className="text-sm text-[#A59FC8]">
                    Capture a live portrait using your physical camera for your personalized astral dossier.
                  </p>
                </div>

                {photoUrl ? (
                  /* Captured Real Photo Display */
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-3xl overflow-hidden border-2 border-[#8EF2B0]/80 shadow-[0_0_35px_rgba(142,242,176,0.25)] bg-[#0C091A]">
                      <img src={photoUrl} alt="Captured portrait" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-[#8EF2B0]/95 text-[#0A170F] text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                        <span>✓</span> Real Photo Captured
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="text-xs text-[#E8B86B] hover:text-[#FFE2A4] flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                      >
                        🔄 Retake Real Photo
                      </button>
                      <span className="text-[#4A4180]">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoUrl("");
                          startCamera(facingMode);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <button
                      type="button"
                      className={btn}
                      onClick={() => setFormStep(3)}
                    >
                      Continue with Photo →
                    </button>
                  </div>
                ) : (
                  /* Live Physical Camera Viewfinder */
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-3xl overflow-hidden border-2 border-[#E8B86B]/60 shadow-[0_0_30px_rgba(232,184,107,0.2)] bg-[#0C091A] flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                      />

                      {/* Camera Loading Overlay */}
                      {isCameraStarting && (
                        <div className="absolute inset-0 bg-[#0C091A]/85 flex flex-col items-center justify-center text-[#E8B86B] text-xs gap-2">
                          <span className="animate-spin text-2xl">✨</span>
                          <span className="font-medium">Opening physical camera...</span>
                        </div>
                      )}

                      {/* Viewfinder Target Reticle Overlay */}
                      {isCameraActive && (
                        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div className="w-5 h-5 border-t-2 border-l-2 border-[#E8B86B]/80 rounded-tl-lg" />
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-[#8EF2B0]/40 text-[10px] text-[#8EF2B0] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8EF2B0] animate-ping" />
                              Live Camera
                            </div>
                            <div className="w-5 h-5 border-t-2 border-r-2 border-[#E8B86B]/80 rounded-tr-lg" />
                          </div>

                          {/* Subtle facial alignment guide */}
                          <div className="self-center w-36 h-44 rounded-[50%] border border-dashed border-[#E8B86B]/30" />

                          <div className="flex justify-between items-end">
                            <div className="w-5 h-5 border-b-2 border-l-2 border-[#E8B86B]/80 rounded-bl-lg" />
                            <div className="w-5 h-5 border-b-2 border-r-2 border-[#E8B86B]/80 rounded-br-lg" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Camera Permission / Device Error Notification */}
                    {cameraError && (
                      <div className="w-full space-y-2 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
                        <p className="text-xs text-red-200">{cameraError}</p>
                        <div className="flex justify-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#E8B86B]/20 text-[#E8B86B] hover:bg-[#E8B86B]/30 text-xs font-semibold cursor-pointer"
                          >
                            Try Camera Again
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="w-full space-y-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={!isCameraActive}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#E8B86B] via-[#F3D08A] to-[#E8B86B] text-[#120E24] font-bold text-sm shadow-lg shadow-[#E8B86B]/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white animate-pulse" />
                        Take Real Photo
                      </button>

                      <div className="flex items-center justify-between w-full px-2 text-xs">
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="text-[#A59FC8] hover:text-[#EDE9FA] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          🔄 Flip Camera ({facingMode === "user" ? "Front" : "Back"})
                        </button>
                        <label
                          htmlFor="fallback-photo-upload"
                          className="text-[#A59FC8] hover:text-[#EDE9FA] cursor-pointer underline"
                        >
                          Upload file instead
                        </label>
                        <input
                          id="fallback-photo-upload"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handlePhotoUpload}
                        />
                      </div>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setFormStep(3)}
                          className="py-1 text-xs text-[#A59FC8] hover:text-[#EDE9FA] cursor-pointer"
                        >
                          Skip photo for now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

        {/* STEP: ASK QUESTION PAGE */}
        {tab === "Home" && step === "ask" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Querent Overview Header (Chart removed from this page as requested) */}
            <div className={card + " border-[#E8B86B]/40 bg-gradient-to-r from-[#211A3D] to-[#2E204B] p-3.5 space-y-2"}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#E8B86B] font-semibold flex items-center gap-1.5">
                    <span>✨</span> Birth Chart Ready
                  </div>
                  <div className="font-bold text-base text-[#EDE9FA]">{f.name || "Querent"}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setFormStep(0);
                    setQ("");
                    setCurrentAnswer(null);
                  }}
                  className="text-xs text-[#E8B86B] hover:text-[#FFE2A4] underline cursor-pointer shrink-0"
                  title="Calculate chart for another person"
                >
                  + New Chart
                </button>
              </div>

              {(f.date || f.place) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#A59FC8] pt-1.5 border-t border-[#3E346B]/40">
                  {f.date && <span>📅 Born: <strong className="text-[#EDE9FA]">{f.date}</strong>{f.time ? ` (${f.time})` : ""}</span>}
                  {f.place && <span>📍 <strong className="text-[#EDE9FA]">{f.place}</strong></span>}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-[#EDE9FA]">Ask your question</h2>
              <p className="text-xs sm:text-sm text-[#A59FC8]">
                What insights, career directions, or relationship alignments would you like to explore?
              </p>
            </div>

            <textarea
              className={inp + " min-h-28 py-3 text-sm"}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="e.g. What does my natal chart say about career growth in 2026?"
            />

            {/* Subscription banner if user is not yet subscribed */}
            {!sub && (
              <div className="rounded-xl border border-[#E8B86B]/30 bg-[#251A3A] p-3 text-xs flex items-center justify-between gap-3 text-[#EDE9FA]">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <span>
                    <strong className="text-[#E8B86B]">Subscription required:</strong> A membership plan is needed to view answers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("Plans")}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#FFE2A4] transition-colors cursor-pointer"
                >
                  View Plans →
                </button>
              </div>
            )}

            <button
              className={btn}
              disabled={!q.trim() || analyzing}
              onClick={ask}
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-[#1A1230]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Consulting the Stars…
                </span>
              ) : sub ? (
                "Analyze Chart & Question →"
              ) : (
                "Analyze Chart & Question (View Plans) →"
              )}
            </button>

            {/* ANSWER DISPLAY (Shown below the question when subscribed) */}
            {sub && currentAnswer && (
              <div id="astrological-answer-section" className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className={card + " border-[#E8B86B]/60 bg-gradient-to-b from-[#211A3D] to-[#1A1533] space-y-4 shadow-xl"}>
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#3E346B]/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8B86B]/20 text-sm text-[#E8B86B]">
                        🔮
                      </span>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-[#E8B86B] font-bold">
                          Astrological Reading
                        </div>
                        <div className="text-[11px] text-[#A59FC8]">
                          Calculated for {f.name || "Querent"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#A59FC8] bg-[#16102B] px-2 py-0.5 rounded-full border border-[#2E2752]">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>

                  {/* Querent question recap */}
                  <div className="bg-[#150F28] p-3 rounded-xl border border-[#2E2752] text-xs">
                    <span className="text-[#A59FC8] font-medium block mb-0.5">Your Question:</span>
                    <span className="italic text-[#EDE9FA] font-medium">"{q}"</span>
                  </div>

                  {/* FIRST PART OF RESPONSE: DIRECT ANSWER */}
                  {currentAnswer.aiAnswer && (
                    <div className="rounded-xl bg-gradient-to-r from-[#2C1E4E] to-[#1E173D] p-3.5 border border-[#E8B86B]/60 shadow-lg space-y-1.5 animate-in fade-in">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#E8B86B] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>✨</span> Direct Celestial Answer
                        </span>
                        <span className="text-[10px] font-normal text-[#E8B86B]/90 bg-[#17102D] px-2 py-0.5 rounded-full border border-[#E8B86B]/30">
                          AI Astrological Prediction
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#EDE9FA] leading-relaxed">
                        {currentAnswer.aiAnswer}
                      </p>
                    </div>
                  )}

                  {/* Summary / Core Answer */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#E8B86B] flex items-center gap-1.5">
                      <span>✨</span> Cosmic Synthesis
                    </div>
                    <div className="text-sm font-semibold text-[#EDE9FA] leading-snug">
                      {currentAnswer.summary}
                    </div>
                    <p className="text-xs text-[#D6D1EE] leading-relaxed pt-1">
                      {currentAnswer.interpretation}
                    </p>
                  </div>

                  {/* Key Planetary Influences */}
                  <div className="space-y-2 pt-1 border-t border-[#3E346B]/40">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#A59FC8]">
                      Key Planetary Placements For Your Query
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {currentAnswer.keyPlacements.map((p, idx) => (
                        <div key={idx} className="bg-[#1A1433] p-2.5 rounded-xl border border-[#2E2752] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#E8B86B]">{p.planet} in {p.sign}</span>
                            <span className="text-[11px] text-[#A59FC8] bg-[#241D42] px-2 py-0.5 rounded-md">House {p.house}</span>
                          </div>
                          <p className="text-[11px] text-[#D6D1EE] leading-relaxed">{p.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing & Guidance */}
                  <div className="bg-[#241D42]/70 p-3 rounded-xl border border-[#3E346B]/50 space-y-2 text-xs">
                    <div className="font-semibold text-[#E8B86B] flex items-center gap-1.5">
                      <span>⏳</span> Favorable Cycles &amp; Timing
                    </div>
                    <p className="text-[#EDE9FA] leading-relaxed text-[11px]">
                      {currentAnswer.timing}
                    </p>
                  </div>

                  {/* Actionable Advice */}
                  <div className="space-y-1.5 pt-1 border-t border-[#3E346B]/40 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#A59FC8]">
                      Celestial Guidance &amp; Takeaways
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#D6D1EE]">
                      {currentAnswer.cosmicAdvice.map((adv, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#E8B86B] mt-0.5">✦</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Attach app to screen banner under reading */}
                  <div className="bg-[#1C1536] p-3 rounded-xl border border-[#3E346B]/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📲</span>
                      <span className="text-[#EDE9FA]">
                        {appAttached ? (
                          <>Astro Reports is <strong className="text-emerald-300">attached to your screen</strong></>
                        ) : (
                          <>Want faster 1-tap answers? <strong className="text-[#E8B86B]">Attach app to screen</strong></>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAttachModal(true)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#FFE2A4] transition-colors cursor-pointer"
                    >
                      {appAttached ? "View Details" : "Attach App →"}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#2E2752] text-[11px] text-[#7C75A3]">
                    <span>High-precision planetary ephemeris analysis</span>
                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-[#E8B86B] hover:underline cursor-pointer"
                    >
                      Ask another question ↑
                    </button>
                  </div>
                </div>
              </div>
            )}
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

            {/* ChatGPT / OpenAI Integration Settings */}
            <div className={card + " space-y-3 text-xs"}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>🤖</span> ChatGPT AI Integration
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${openAiKey ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/30" : "text-[#E8B86B] border-[#E8B86B]/30 bg-[#E8B86B]/10"}`}>
                  {openAiKey ? "Custom Key Active" : "Server Env Default"}
                </span>
              </div>
              <p className="text-[#A59FC8] leading-relaxed">
                Empowers every query with direct predictions and clean astrological answers to your specific questions.
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#A59FC8] block">OpenAI / ChatGPT API Key:</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className={inp + " text-xs py-1.5 min-h-9 font-mono flex-1"}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = apiKeyInput.trim();
                      setOpenAiKey(trimmed);
                      if (trimmed) {
                        try { localStorage.setItem("chatgpt_api_key", trimmed); } catch {}
                      } else {
                        try { localStorage.removeItem("chatgpt_api_key"); } catch {}
                      }
                      alert(trimmed ? "ChatGPT API Key saved successfully!" : "Key removed. Using server .env key.");
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#F2C77D] transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[10px] text-[#7C75A3]">
                  Key can also be defined in <code className="text-[#E8B86B]">.env</code> as <code className="text-[#E8B86B]">OPENAI_API_KEY</code>.
                </p>
              </div>
            </div>

            {/* 30-Day Session Token & Auto-Login Card */}
            <div className={card + " space-y-2.5 text-xs border-[#2E2752]"}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>🔐</span> 30-Day Auto Login
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isLoggedIn ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/30 font-medium" : "text-[#A59FC8] border-[#2E2752] bg-[#1A1533]"}`}>
                  {isLoggedIn ? "Session Active (1 Month)" : "Guest Session"}
                </span>
              </div>
              <p className="text-[#A59FC8] leading-relaxed text-[11px]">
                {isLoggedIn
                  ? "Your session is preserved for 30 days in localStorage. When you launch the app, you will land directly on the Chat screen."
                  : "Sign in with Google or enter your details once; your token will keep you logged in for 1 month."}
              </p>
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    clearStoredToken();
                    setIsLoggedIn(false);
                    try {
                      localStorage.removeItem("user_profile");
                      localStorage.removeItem("sub");
                      localStorage.removeItem("saved_chart");
                    } catch {}
                    setStep("form");
                    setFormStep(0);
                    setTab("Home");
                    setF({ name: "", email: "", date: "", time: "", place: "" });
                    setChart(null);
                    setCur(null);
                  }}
                  className="w-full mt-1 py-2 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign Out / Reset Session
                </button>
              )}
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
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">Membership Plans</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8B86B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8B86B] border border-[#E8B86B]/30">
                  ⚡ UPI AutoPay
                </span>
              </div>
              <p className="text-xs text-[#A59FC8]">
                Continuous planetary guidance powered by <strong>Razorpay UPI AutoPay &amp; Secure Payments</strong>.
              </p>
            </div>

            {/* Success Alert */}
            {subSuccessMsg && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
                <span>✨</span>
                <span>{subSuccessMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {subError && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{subError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubError("")}
                  className="text-rose-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ACTIVE SUBSCRIPTION OVERVIEW (If already subscribed) */}
            {sub && (
              <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#1B2925] to-[#141B26] p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-sm text-emerald-300">
                      Active AutoPay Membership
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {displayPlans.find(p => p.id === subPlan)?.perMonthText || (subPlan === "three_month" ? "₹299 / 3-Months" : "₹149 / Month")}
                  </span>
                </div>

                <div className="text-xs text-[#C5C0E2] leading-relaxed">
                  Your cosmic membership is unlocked. Planetary transits, houses, and unlimited astrological query analyses are active.
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-emerald-500/20 text-[11px] text-[#A59FC8] gap-2">
                  <span>Payment Gateway: <strong>Razorpay Live NPCI</strong></span>
                  <span>Manage or cancel anytime in your UPI / Banking App</span>
                </div>
              </div>
            )}

            {/* UPI MANDATE PHONE NUMBER INPUT */}
            <div className={card + " space-y-2 border-[#2E2752]"}>
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>📱</span> UPI Linked Mobile Number
                </label>
                <span className="text-[10px] text-[#A59FC8]">Required for UPI mandate</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#E8B86B]">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  className={inp + " pl-12 text-xs py-2 min-h-10"}
                  value={subPhone}
                  onChange={e => setSubPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <p className="text-[10px] text-[#7C75A3]">
                Your UPI app (GPay / PhonePe / Paytm / BHIM) or card provider will verify the payment on this number.
              </p>
            </div>

            {/* DYNAMIC MEMBERSHIP PLANS LIST */}
            {displayPlans.map(p => {
              const isCurrentPlan = sub && subPlan === p.id;
              const isPopular = p.id === "three_month" || !!p.badge;

              return (
                <div
                  key={p.id}
                  className={
                    card +
                    " space-y-3 transition-all relative overflow-hidden " +
                    (isCurrentPlan
                      ? "border-emerald-500/60 bg-[#161B29]"
                      : isPopular
                      ? "border-[#E8B86B] bg-gradient-to-b from-[#1E1738] to-[#16122C] shadow-lg shadow-[#E8B86B]/10"
                      : "border-[#2E2752] hover:border-[#E8B86B]/60")
                  }
                >
                  {p.badge && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E8B86B] to-[#FFD584] px-3 py-1 text-[11px] font-bold text-[#1A1230] shadow-sm">
                      <span>✨</span> {p.badge}
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#A59FC8]">
                        {p.savings || (p.id === "three_month" ? "Best Value Cosmic Pass" : "Standard Access")}
                      </span>
                      <h3 className="font-bold text-base text-[#EDE9FA]">{p.name}</h3>
                      <p className="text-xs text-[#A59FC8]">{p.tagline}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#E8B86B]">₹{p.amount}</div>
                      <span className="text-[11px] text-[#A59FC8]">{p.perMonthText}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-[#C8C3E6] pt-1">
                    {p.features?.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-[#E8B86B]">✓</span> {feat}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={btn}
                    disabled={subLoading}
                    onClick={() => initiateCheckout(p)}
                  >
                    {subLoading
                      ? "Connecting Gateway..."
                      : isCurrentPlan
                      ? "Current Active Plan ✓"
                      : `Pay & Subscribe (₹${p.amount}) →`}
                  </button>
                </div>
              );
            })}

            {/* TRUST / RAZORPAY BADGE & UPI APP ICONS */}
            <div className="rounded-2xl border border-[#2E2752] bg-[#120D24]/80 p-3.5 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#EDE9FA]">
                <span>🔒</span>
                <span>Powered by Razorpay Payments (UPI AutoPay, Cards &amp; Netbanking)</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {["Google Pay", "PhonePe", "Paytm", "BHIM UPI", "Cards", "NetBanking"].map(app => (
                  <span
                    key={app}
                    className="rounded-lg bg-[#1D1739] px-2.5 py-1 text-[10px] font-semibold text-[#EDE9FA] border border-[#2E2752]"
                  >
                    {app}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[#7C75A3] pt-1 leading-relaxed">
                NPCI &amp; RBI Compliant 256-bit Secure Gateway. Cancel or pause mandate anytime directly inside your UPI app under Settings → AutoPay.
              </p>
            </div>
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

              {/* Dev/Local Sign In Fallback */}
              <div className="pt-2 border-t border-[#2E2752] space-y-2">
                <div className="text-[11px] text-[#A59FC8]">
                  Or directly look up an existing account by email:
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="e.g. user@example.com"
                    className={inp + " min-h-9 text-xs py-1.5 flex-1"}
                    value={directEmail}
                    onChange={e => setDirectEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!directEmail.includes("@")}
                    onClick={() => {
                      handleGoogleAuth({ email: directEmail });
                    }}
                    className="rounded-xl bg-[#3E346B] hover:bg-[#52458C] text-[#EDE9FA] px-3 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Go →
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#7C75A3] bg-[#150F2B] p-2.5 rounded-xl border border-[#2E2752] space-y-1">
                <div>💡 <strong className="text-[#A59FC8]">For production:</strong></div>
                <div>Add <code className="text-[#E8B86B]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your Netlify Environment Variables.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHATGPT / OPENAI API KEY MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#E8B86B]/40 bg-[#150F28] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2E2752]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E8B86B]/20 text-sm text-[#E8B86B]">
                  🤖
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#EDE9FA]">ChatGPT AI Settings</h3>
                  <p className="text-[10px] text-[#A59FC8]">Astrological Question Answering</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-[#A59FC8] hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#D6D1EE] leading-relaxed">
                Enter your OpenAI / ChatGPT API key to generate direct answers and personalized predictions for your queries:
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#A59FC8] block font-medium">OpenAI API Key (sk-...):</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className={inp + " text-xs font-mono py-2 min-h-10"}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = apiKeyInput.trim();
                    setOpenAiKey(trimmed);
                    if (trimmed) {
                      try { localStorage.setItem("chatgpt_api_key", trimmed); } catch {}
                    } else {
                      try { localStorage.removeItem("chatgpt_api_key"); } catch {}
                    }
                    setShowApiKeyModal(false);
                  }}
                  className={btn + " min-h-10 text-xs py-2"}
                >
                  Save API Key
                </button>
                {openAiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenAiKey("");
                      setApiKeyInput("");
                      try { localStorage.removeItem("chatgpt_api_key"); } catch {}
                      setShowApiKeyModal(false);
                    }}
                    className="px-3 min-h-10 text-xs rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="text-[11px] text-[#7C75A3] bg-[#1A1433] p-2.5 rounded-xl border border-[#2E2752] space-y-1">
                <div>💡 <strong className="text-[#A59FC8]">Server Environment:</strong></div>
                <div>You can also set <code className="text-[#E8B86B]">OPENAI_API_KEY</code> in <code className="text-[#EDE9FA]">astrology-server/.env</code>.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAZORPAY UPI AUTOPAY MANDATE MODAL */}

      {showUpiModal && pendingSubSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#E8B86B]/40 bg-[#150F28] p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2E2752]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8B86B] to-[#FFE2A4] text-xs font-bold text-[#1A1230]">
                  ⚡
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#EDE9FA]">UPI AutoPay Mandate</h3>
                  <p className="text-[10px] text-[#A59FC8]">Razorpay Payments Gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUpiModal(false);
                  setPendingSubSession(null);
                }}
                className="text-[#A59FC8] hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mandate Summary Card */}
            <div className="rounded-2xl border border-[#2E2752] bg-[#1E1738] p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">Merchant:</span>
                <span className="font-semibold text-[#EDE9FA]">Astrology App</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">Plan:</span>
                <span className="font-semibold text-[#E8B86B]">{pendingSubSession.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">Mandate Amount:</span>
                <span className="font-bold text-sm text-[#E8B86B]">₹{pendingSubSession.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">Debit Frequency:</span>
                <span className="font-medium text-[#EDE9FA]">
                  {pendingSubSession.planId === "three_month" ? "Every 3 Months" : "Monthly"}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#2E2752]/60 text-[11px]">
                <span className="text-[#7C75A3]">Sub ID:</span>
                <span className="font-mono text-[10px] text-[#A59FC8] truncate max-w-[150px]">
                  {pendingSubSession.subscriptionId}
                </span>
              </div>
            </div>

            {/* Select UPI App */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#EDE9FA] block">
                Select Your UPI App:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "gpay", name: "Google Pay", icon: "🟢" },
                  { id: "phonepe", name: "PhonePe", icon: "🟣" },
                  { id: "paytm", name: "Paytm", icon: "🔵" },
                  { id: "bhim", name: "BHIM UPI", icon: "🟠" },
                  { id: "cred", name: "Cred", icon: "⚪" },
                  { id: "other", name: "Other UPI", icon: "⚡" },
                ].map(app => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpiApp(app.id)}
                    className={
                      "rounded-xl border p-2 text-center text-[10px] font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 " +
                      (selectedUpiApp === app.id
                        ? "border-[#E8B86B] bg-[#E8B86B]/15 text-[#EDE9FA] ring-1 ring-[#E8B86B]"
                        : "border-[#2E2752] bg-[#1B1433] text-[#A59FC8] hover:border-[#3E346B]")
                    }
                  >
                    <span>{app.icon}</span>
                    <span className="truncate w-full">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>


            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={pinSubmitting}
                onClick={confirmUpiMandate}
                className="w-full rounded-2xl bg-gradient-to-r from-[#E8B86B] to-[#FFD584] py-3 text-xs font-bold text-[#1A1230] hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#E8B86B]/20 disabled:opacity-50"
              >
                {pinSubmitting
                  ? "Authorizing Mandate..."
                  : `Authorize AutoPay Mandate (₹${pendingSubSession.amount}) ✓`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpiModal(false);
                  setPendingSubSession(null);
                }}
                className="w-full rounded-xl border border-[#2E2752] py-2 text-xs text-[#A59FC8] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Security note */}
            <p className="text-center text-[10px] text-[#7C75A3] leading-relaxed">
              🔒 256-bit Bank Grade Security. Mandate registration is processed via NPCI UPI AutoPay. Cancel anytime from your UPI App.
            </p>
          </div>
        </div>
      )}

      {/* ATTACH APP TO SCREEN POP-UP MODAL (Shown when user asks a question and answer is given) */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#E8B86B]/60 bg-gradient-to-b from-[#211A3D] via-[#1A1533] to-[#140F2A] p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2E2752]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E8B86B] to-[#FFE2A4] text-base font-bold text-[#1A1230] shadow-md shadow-[#E8B86B]/25">
                  📲
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#EDE9FA]">Attach to Home Screen</h3>
                  <p className="text-[10px] text-[#E8B86B] font-semibold">1-Tap Fast Astrological Access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAttachModal(false);
                  setShowIosGuide(false);
                  setAttachSuccessMsg("");
                }}
                className="text-[#A59FC8] hover:text-white text-base font-bold cursor-pointer p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Answer prompt */}
            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-[#E8B86B]/30 bg-gradient-to-r from-[#2A1D4E]/60 to-[#1F173D]/60 p-3.5 text-center space-y-1.5 shadow-md">
                <p className="text-sm font-bold text-[#EDE9FA] leading-snug">
                  Are you interested in attaching this app to your home screen?
                </p>
                <p className="text-[11px] text-[#C4BEDD] leading-relaxed">
                  Attach Astro Reports to your home screen for instant 1-tap astrological guidance, planetary transit alerts, and future answers.
                </p>
              </div>

              {/* Benefits card */}
              <div className="rounded-2xl border border-[#2E2752] bg-[#16102B] p-3 space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">✨</span>
                  <span><strong>1-Tap Launch:</strong> open instantly from your home screen</span>
                </div>
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">⚡</span>
                  <span><strong>Faster Answers:</strong> ask questions without opening browser</span>
                </div>
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">🔮</span>
                  <span><strong>Planetary Transit Alerts:</strong> track auspicious celestial timings</span>
                </div>
              </div>

              {/* iOS Manual Guide tip if triggered */}
              {showIosGuide && (
                <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-2.5 text-[11px] text-sky-200 space-y-1 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1 text-sky-300">
                    <span>💡</span> For iPhone / iPad Users:
                  </div>
                  <p>
                    Tap the <strong>Share</strong> button (⎋) in your Safari toolbar below, then scroll down and tap <strong>"Add to Home Screen"</strong> (➕).
                  </p>
                </div>
              )}

              {/* Success alert */}
              {attachSuccessMsg && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-200 space-y-1 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                    <span>✅</span> Screen Attachment Saved
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {attachSuccessMsg}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!attachSuccessMsg ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={attachSubmitting}
                  onClick={handleConfirmAttachApp}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#E8B86B] to-[#FFD584] py-3 text-xs font-bold text-[#1A1230] hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#E8B86B]/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {attachSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-[#1A1230]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Attaching to Home Screen...
                    </>
                  ) : (
                    "✨ Yes, Attach to Home Screen"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachModal(false);
                    setShowIosGuide(false);
                  }}
                  className="w-full rounded-xl border border-[#2E2752] py-2 text-xs text-[#A59FC8] hover:text-white cursor-pointer transition-colors"
                >
                  No, Maybe Later
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowAttachModal(false);
                  setShowIosGuide(false);
                  setAttachSuccessMsg("");
                }}
                className="w-full rounded-xl bg-[#231B40] border border-[#3E346B] py-2.5 text-xs text-[#EDE9FA] hover:text-white cursor-pointer"
              >
                Close &amp; View Astrological Reading →
              </button>
            )}

            <p className="text-center text-[10px] text-[#7C75A3]">
              Safe &amp; fast PWA technology. Automatically logged in Admin Dashboard.
            </p>
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
