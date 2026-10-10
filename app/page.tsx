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
  trackFunnelStep,
} from "../lib/api";
import { translations, Language } from "../lib/translations";

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

function getFaceReadingPredictionMonths(
  googleAuthBday?: string,
  dob?: string,
  lang: Language = "en"
): { monthX: string; monthY: string; rawMonthX: string; rawMonthY: string } {
  let bdayStr = (googleAuthBday || "").trim();
  if (!bdayStr && typeof window !== "undefined") {
    try {
      bdayStr = (localStorage.getItem("google_auth_bday") || "").trim();
    } catch {}
  }
  if (!bdayStr && dob) {
    bdayStr = dob.trim();
  }

  let monthIndex = -1; // 0 to 11

  if (bdayStr) {
    // 1. Try standard YYYY-MM-DD or YYYY/MM/DD
    const ymd = bdayStr.match(/^\d{4}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
    if (ymd) {
      monthIndex = parseInt(ymd[1], 10) - 1;
    } else {
      // 2. Try --MM-DD or MM-DD or MM/DD
      const md = bdayStr.match(/^(?:--)?(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
      if (md) {
        monthIndex = parseInt(md[1], 10) - 1;
      } else {
        // 3. Try standard Date parsing
        const d = new Date(bdayStr);
        if (!isNaN(d.getTime())) {
          monthIndex = d.getMonth();
        } else {
          // 4. Try month name substring
          const lower = bdayStr.toLowerCase();
          const monthKeywords = [
            "jan", "feb", "mar", "apr", "may", "jun",
            "jul", "aug", "sep", "oct", "nov", "dec"
          ];
          const found = monthKeywords.findIndex(kw => lower.includes(kw));
          if (found !== -1) {
            monthIndex = found;
          }
        }
      }
    }
  }

  // Fallback: If not found, use current month (e.g. October -> 9)
  if (monthIndex < 0 || monthIndex > 11) {
    monthIndex = new Date().getMonth();
  }

  const yIndex = (monthIndex + 6) % 12;

  const MONTHS_EN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const MONTHS_HI = [
    "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
  ];

  const currentList = lang === "hi" ? MONTHS_HI : MONTHS_EN;

  return {
    monthX: currentList[monthIndex],
    monthY: currentList[yIndex],
    rawMonthX: MONTHS_EN[monthIndex],
    rawMonthY: MONTHS_EN[yIndex],
  };
}

function generateAstrologicalAnswer(
  question: string,
  querentName: string,
  chart: Chart,
  language: Language = "en"
): AstrologicalAnswer {
  const isHi = language === "hi" || /[\u0900-\u097F]/.test(question);
  const qLower = question.toLowerCase();

  const sun = chart.planets.find(p => p.name === "Sun") || { name: "Sun", sign: "Aries", deg: 0, house: 1 };
  const moon = chart.planets.find(p => p.name === "Moon") || { name: "Moon", sign: "Taurus", deg: 0, house: 2 };
  const mercury = chart.planets.find(p => p.name === "Mercury") || { name: "Mercury", sign: "Gemini", deg: 0, house: 3 };
  const venus = chart.planets.find(p => p.name === "Venus") || { name: "Venus", sign: "Libra", deg: 0, house: 7 };
  const mars = chart.planets.find(p => p.name === "Mars") || { name: "Mars", sign: "Scorpio", deg: 0, house: 8 };
  const jupiter = chart.planets.find(p => p.name === "Jupiter") || { name: "Jupiter", sign: "Sagittarius", deg: 0, house: 9 };
  const saturn = chart.planets.find(p => p.name === "Saturn") || { name: "Saturn", sign: "Capricorn", deg: 0, house: 10 };
  const asc = chart.asc || "Aries";

  const isMarriage = /(marr|wedding|spouse|husband|wife|soulmate|partner|matrimon|शादी|विवाह|पति|पत्नी)/i.test(qLower);
  const isLove = isMarriage || /(love|dating|romance|crush|heart|relationship|bf|gf|boyfriend|girlfriend|प्यार|प्रेम|रिश्ता)/i.test(qLower);
  const isCareer = /(career|job|work|promotion|business|money|finance|wealth|grow|salary|profession|boss|company|hire|invest|2026|office|goal|success|raise|नौकरी|करियर|व्यापार|व्यवसाय|धन|पैसा)/i.test(qLower);
  const isHealth = /(health|stress|body|vitality|energy|healing|illness|disease|mind|exhaust|diet|workout|sleep|स्वास्थ्य|तबीयत|बीमारी)/i.test(qLower);

  let directAnswer = "";
  if (isMarriage) {
    if (isHi) {
      const marriageOptionsHi = [
        `आपके 7वें भाव के शुभ प्रभाव और आगामी गुरु-शुक्र गोचर के अनुसार, 2027 के उत्तरार्ध से 2028 के मध्य तक ${querentName} के विवाह के अत्यंत शुभ और प्रबल योग बन रहे हैं।`,
        `ग्रह गोचर के अनुसार 2027 के शरद ऋतु से 2028 की ग्रीष्म ऋतु के मध्य विवाह का श्रेष्ठ समय रहेगा, जिसमें एक समझदार और समर्पित जीवनसाथी प्राप्त होगा।`,
        `आपके दांपत्य भाव में शुभ ग्रहों की स्थिति दर्शाती है कि 2026 के अंत से 2027 के मध्य तक विवाह से जुड़े निर्णय पक्के होंगे और दीर्घकालिक सुख प्राप्त होगा।`,
      ];
      directAnswer = marriageOptionsHi[Math.floor(Math.random() * marriageOptionsHi.length)];
    } else {
      const marriageOptions = [
        `Based on your 7th house alignments and upcoming Jupiter-Venus transit cycles, marriage prospects open auspiciously between late 2027 and mid-2028, marked by a deeply supportive and mutual soul connection for ${querentName}.`,
        `Your planetary transits highlight a high-probability marriage window between Autumn 2027 and Summer 2028, with favorable Venusian currents bringing long-term stability and marital harmony.`,
        `Cosmic configurations across your relationship axis indicate that marriage and life-partner commitments solidify between late 2026 and mid-2027, supported by grounding Saturn and expansive Jupiter placements.`,
      ];
      directAnswer = marriageOptions[Math.floor(Math.random() * marriageOptions.length)];
    }
  } else if (isLove) {
    directAnswer = isHi
      ? `ग्रह स्थिति दर्शाती है कि अगले 4 से 8 महीनों में आपके जीवन में एक सुखद और आत्मीय प्रेम संबंध प्रगाढ़ होगा, जहाँ आपसी समझ और विश्वास बढ़ेगा।`
      : `Planetary alignments indicate an uplifting romantic chapter beginning over the next 4 to 8 months, where emotional reciprocity and authentic connection will flourish for ${querentName}.`;
  } else if (isCareer) {
    directAnswer = isHi
      ? `आपकी कुंडली के 10वें भाव की ऊर्जा दर्शाती है कि 2027 के आरंभ से मध्य के बीच ${querentName} के कार्यक्षेत्र में उल्लेखनीय उन्नति और आर्थिक लाभ के प्रबल योग हैं।`
      : `Your 10th house planetary momentum indicates a decisive career breakthrough and lucrative advancement between early and mid-2027 for ${querentName}.`;
  } else if (isHealth) {
    directAnswer = isHi
      ? `आपकी सौर ऊर्जा अगले 3 से 5 महीनों में एक सकारात्मक और नई स्फूर्ति प्रदान करेगी, बशर्ते पर्याप्त विश्राम और नियमित दिनचर्या को प्राथमिकता दी जाए।`
      : `Your solar vitality charts a rejuvenating upward cycle starting within 3 to 5 months, provided mindful rest and restorative grounding practices are prioritized.`;
  } else {
    directAnswer = isHi
      ? `ग्रहों की चाल दर्शाती है कि अगले 6 से 12 महीनों में परिस्थितियाँ ${querentName} के पक्ष में अनुकूल हो रही हैं, जिससे मनोवांछित फल और स्पष्ट प्रगति होगी।`
      : `Celestial configurations show favorable planetary currents aligning in your favor over the next 6 to 12 months, bringing clear resolution and fruitful progress for ${querentName}.`;
  }

  if (isCareer) {
    const baseSummary = isHi
      ? `आपकी जन्म कुंडली कार्यक्षेत्र में मजबूत गति दर्शाती है, जहाँ गुरु की स्थिति ${querentName} के लिए व्यवसाय व पदोन्नति के मार्ग प्रशस्त कर रही है।`
      : `Your natal chart indicates strong professional momentum, with ${jupiter.name} in ${jupiter.sign} (House ${jupiter.house}) empowering upward career expansion for ${querentName}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: isHi
        ? `आपके लग्न ${asc} और सूर्य के प्रभाव से आपकी नेतृत्व क्षमता और कार्य-योजना सफलता की ओर अग्रसर है। गुरु की स्थिति दर्शाती है कि सुनियोजित निर्णय नए अवसर खोलेंगे। वहीं शनि आपके प्रयासों को दीर्घकालिक स्थायित्व प्रदान करेगा।`
        : `With your Ascendant in ${asc} and your Sun radiating in ${sun.sign} in House ${sun.house}, your career blueprint thrives on clear vision and self-directed leadership. Jupiter's placement in House ${jupiter.house} signals that calculated boldness and strategic moves will unlock lucrative doors. Meanwhile, Saturn in ${saturn.sign} in House ${saturn.house} acts as your grounding pillar—ensuring that milestones achieved through discipline and consistency will stand firm over time.`,
      keyPlacements: isHi ? [
        {
          planet: "गुरु (Jupiter)",
          sign: jupiter.sign,
          house: jupiter.house,
          relevance: `भाव ${jupiter.house} में करियर के नए अवसर, मान-सम्मान और मार्गदर्शन प्रदान करता है।`,
        },
        {
          planet: "शनि (Saturn)",
          sign: saturn.sign,
          house: saturn.house,
          relevance: `भाव ${saturn.house} में धैर्य, परिश्रम और दीर्घकालिक स्थायित्व का फल देता है।`,
        },
        {
          planet: "सूर्य (Sun)",
          sign: sun.sign,
          house: sun.house,
          relevance: `कार्यक्षेत्र में आपकी प्रतिष्ठा, आत्मविश्वास और प्रभाव को चमकाता है।`,
        },
      ] : [
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
      timing: isHi
        ? `ग्रह गोचर 2026-2027 के दौरान उच्च व्यावसायिक सफलता और प्रगति की संभावना दर्शाते हैं।`
        : `Cosmic currents show high-momentum expansion through 2026, particularly when major transits activate your ${jupiter.sign} and 10th house placements. Establish foundations now for mid-cycle breakthroughs.`,
      cosmicAdvice: isHi ? [
        `अपनी ऊर्जा को प्रमुख लक्ष्यों पर केंद्रित रखें और व्यर्थ के भटकाव से बचें।`,
        `अनुभवी लोगों से संपर्क बनाएं; सकारात्मक सहयोग से आपकी प्रगति तेज होगी।`,
        `महत्वपूर्ण व्यावसायिक निर्णयों में अपनी अंतर्दृष्टि और विवेक पर भरोसा करें।`,
      ] : [
        `Focus your energy on high-leverage goals rather than spreading yourself too thin.`,
        `Cultivate strategic networks; your ${sun.sign} placement shines when collaborating with visionary allies.`,
        `Trust your intuitive radar during contract discussions and milestone transitions.`,
      ],
    };
  } else if (isLove) {
    const baseSummary = isHi
      ? `प्रेम और दांपत्य के संदर्भ में आपकी कुंडली भावनात्मक आत्मीयता को दर्शाती है, जहाँ शुक्र और चंद्रमा का शुभ प्रभाव सकारात्मक सामंजस्य ला रहा है।`
      : `In matters of love and relationships, your chart emphasizes emotional authenticity, with Venus in ${venus.sign} and Moon in ${moon.sign} guiding meaningful harmony.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: isHi
        ? `लग्न में ${asc} और शुक्र की शुभ स्थिति के साथ, आपका वैवाहिक जीवन प्रेम और परस्पर सम्मान पर आधारित रहेगा। चंद्रमा की स्थिति भावनात्मक सुरक्षा को प्राथमिकता देती है।`
        : `With ${asc} rising and Venus placed in ${venus.sign} in House ${venus.house}, your romantic journey values heartfelt reciprocity and open-hearted communication. Moon in ${moon.sign} in House ${moon.house} indicates that emotional safety and mutual respect are essential before you give your full trust. Current astrological configurations suggest past emotional lessons are crystallizing into profound relational clarity.`,
      keyPlacements: isHi ? [
        {
          planet: "शुक्र (Venus)",
          sign: venus.sign,
          house: venus.house,
          relevance: `भाव ${venus.house} में दांपत्य सुख, आकर्षण और मधुर संबंधों को बढ़ाता है।`,
        },
        {
          planet: "चंद्रमा (Moon)",
          sign: moon.sign,
          house: moon.house,
          relevance: `मानसिक शांति और आंतरिक सुरक्षा को दृढ़ करता है।`,
        },
        {
          planet: "मंगल (Mars)",
          sign: mars.sign,
          house: mars.house,
          relevance: `भाव ${mars.house} में ऊर्जा और स्पष्ट व्यक्तिगत सीमाओं को बनाए रखने में सहायक है।`,
        },
      ] : [
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
      timing: isHi
        ? `शुक्र और देवगुरु बृहस्पति का गोचर शुभ समय और सुखद संवाद के नए अवसर निर्मित कर रहा है।`
        : `Favorable Venusian currents are opening windows for heart-centered conversations, deepening commitments, and emotional synchronicity.`,
      cosmicAdvice: isHi ? [
        `अपनी भावनाओं को स्पष्ट और सकारात्मक ढंग से व्यक्त करें; स्पष्टता से विश्वास गहरा होता है।`,
        `परस्पर सम्मान बनाए रखें—एक संतुलित साझेदारी आपके मानसिक सुख को बढ़ाती है।`,
        `रिश्ते को स्वाभाविक गति से विकसित होने दें।`,
      ] : [
        `Express your feelings openly and directly; clarity invites reciprocated vulnerability.`,
        `Uphold personal boundaries—a healthy partnership amplifies your peace.`,
        `Allow new connections or existing bonds to evolve at an unhurried, natural tempo.`,
      ],
    };
  } else if (isHealth) {
    const baseSummary = isHi
      ? `आपकी कुंडली में स्वास्थ्य और संतुलन को प्राथमिकता दी गई है, जहाँ सूर्य और मंगल ऊर्जा का संचार कर रहे हैं।`
      : `Your chart highlights rejuvenation and somatic balance as priorities, anchored by Sun in ${sun.sign} and Mars in ${mars.sign}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: isHi
        ? `लग्न में ${asc} के साथ आपका शारीरिक स्वास्थ्य मानसिक वातावरण से गहराई से जुड़ा हुआ है। पर्याप्त विश्राम और ध्यान से ऊर्जा बनी रहेगी।`
        : `With ${asc} rising, your physical constitution is intimately tied to your mental surroundings. Mars in ${mars.sign} in House ${mars.house} grants potent regenerative vigor, but urges moderation against prolonged stress. Moon in ${moon.sign} reveals that restorative sleep, mindfulness, and grounding rituals are direct prerequisites for your vitality.`,
      keyPlacements: isHi ? [
        {
          planet: "सूर्य (Sun)",
          sign: sun.sign,
          house: sun.house,
          relevance: `आपकी जीवन शक्ति और रोग प्रतिरोधक क्षमता को बढ़ाता है।`,
        },
        {
          planet: "मंगल (Mars)",
          sign: mars.sign,
          house: mars.house,
          relevance: `भाव ${mars.house} में शारीरिक सहनशक्ति और ऊर्जा प्रदान करता है।`,
        },
        {
          planet: "चंद्रमा (Moon)",
          sign: moon.sign,
          house: moon.house,
          relevance: `मानसिक शांति, नींद और भावनात्मक संतुलन को प्रभावित करता है।`,
        },
      ] : [
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
      timing: isHi
        ? `आकाशीय स्थिति निरंतर भागदौड़ के स्थान पर सचेत दिनचर्या अपनाने का संकेत देती है।`
        : `The celestial sky calls for conscious pacing and restorative practices over relentless hustle.`,
      cosmicAdvice: isHi ? [
        `सकारात्मक ऊर्जा बनाए रखने के लिए दैनिक ध्यान और विश्राम करें।`,
        `पर्याप्त नींद और संतुलित खान-पान को प्राथमिकता दें।`,
        `थकावट महसूस होने पर शरीर को पर्याप्त आराम दें।`,
      ] : [
        `Incorporate daily grounding rituals to settle active ${sun.sign} mental energy.`,
        `Prioritize restorative sleep and hydration to keep physical channels fluid and calm.`,
        `Heed early somatic whispers before your body is forced to demand rest.`,
      ],
    };
  } else {
    const baseSummary = isHi
      ? `आपकी जन्म कुंडली ${querentName} के जीवन में एक प्रेरक और स्पष्टता से भरे नए अध्याय के आरंभ का संकेत दे रही है।`
      : `Your natal chart indicates an inspiring chapter of personal alignment and cosmic clarity unfolding for ${querentName}.`;
    return {
      aiAnswer: directAnswer,
      summary: `${directAnswer} ${baseSummary}`,
      interpretation: isHi
        ? `लग्न ${asc} से विश्लेषण करने पर आत्म-विश्वास और निर्णय क्षमता में स्पष्ट वृद्धि परिलक्षित होती है। बुध विवेक प्रदान करता है और गुरु सौभाग्य की वृद्धि करता है।`
        : `Examining your inquiry through your ${asc} Ascendant and ${sun.sign} Sun reveals a powerful awakening of self-trust. Mercury in ${mercury.sign} in House ${mercury.house} provides sharp discernment and perspective, while Jupiter in ${jupiter.sign} in House ${jupiter.house} offers cosmic protection. Aligning your day-to-day choices with your authentic core values will generate immediate peace and progress.`,
      keyPlacements: isHi ? [
        {
          planet: "सूर्य (Sun)",
          sign: sun.sign,
          house: sun.house,
          relevance: `आपकी मौलिक पहचान और आत्मबल को संबल प्रदान करता है।`,
        },
        {
          planet: "गुरु (Jupiter)",
          sign: jupiter.sign,
          house: jupiter.house,
          relevance: `भाव ${jupiter.house} में ज्ञान, सुरक्षा और सौभाग्य का संचार करता है।`,
        },
        {
          planet: "बुध (Mercury)",
          sign: mercury.sign,
          house: mercury.house,
          relevance: `विश्लेषणात्मक स्पष्टता और विवेक को तीव्र करता है।`,
        },
      ] : [
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
      timing: isHi
        ? `ग्रह आपके अनुकूल परिणाम देने की दिशा में अग्रसर हैं। समय पर भरोसा रखें।`
        : `Planetary transits are aligning in your favor. Trust the unfolding timing and take intentional steps toward what truly resonates with your spirit.`,
      cosmicAdvice: isHi ? [
        `आत्मविश्वास के साथ आगे बढ़ें; जो आपके लिए श्रेष्ठ है वह आपको अवश्य मिलेगा।`,
        `अपनी आंतरिक प्रेरणाओं पर ध्यान दें, उनमें व्यवहारिक मार्गदर्शन छिपा है।`,
        `अपने पूर्व अनुभवों को इस नए चरण की मजबूत नींव समझें।`,
      ] : [
        `Lead with authentic conviction; what is meant for you will not pass you by.`,
        `Note down your intuitive impressions; they hold practical wisdom for your upcoming path.`,
        `Acknowledge your past growth as the steady foundation for this next phase.`,
      ],
    };
  }
}

const Report = ({ r, lang = "en" }: { r: Rec; lang?: Language }) => {
  const t = translations[lang];
  return (
    <div className={card + " space-y-3"}>
      <div className="flex items-center justify-between border-b border-[#2E2752] pb-2">
        <span className="text-xs uppercase tracking-wider text-[#A59FC8]">{t.reading.title}</span>
        <span className="text-xs text-[#E8B86B] font-medium">{r.at}</span>
      </div>
      <div>
        <div className="text-xs text-[#A59FC8]">{lang === "hi" ? "प्रयोक्ता" : "Querent"}</div>
        <p className="font-medium text-[#EDE9FA]">{r.name}</p>
      </div>
      <div>
        <div className="text-xs text-[#A59FC8]">{t.reading.yourQuestion}</div>
        <p className="italic text-[#EDE9FA]">"{r.q}"</p>
      </div>
      {r.answer && (
        <div className="rounded-xl bg-[#241D42] p-3 text-xs space-y-2.5 border border-[#E8B86B]/30">
          {r.answer.aiAnswer && (
            <div className="rounded-lg bg-[#2C214D] p-2.5 border border-[#E8B86B]/40 space-y-1">
              <div className="font-bold text-[#E8B86B] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <span>✨</span> {t.reading.directAnswer}:
              </div>
              <p className="text-[#EDE9FA] font-medium leading-relaxed">{r.answer.aiAnswer}</p>
            </div>
          )}
          <div className="font-semibold text-[#E8B86B] flex items-center gap-1.5">
            <span>🔮</span> {t.reading.synthesis}:
          </div>
          <p className="text-[#EDE9FA] font-medium">{r.answer.summary}</p>
          <p className="text-[#D6D1EE] leading-relaxed">{r.answer.interpretation}</p>
        </div>
      )}
      <div className="rounded-xl bg-[#241D42] p-3 text-sm">
        <div className="font-semibold text-[#E8B86B]">
          {lang === "hi" ? "लग्न (राइजिंग साइन):" : "Ascendant (Rising Sign):"} {r.chart.asc}
        </div>
        <div className="mt-2 space-y-1 text-xs text-[#D6D1EE]">
          {r.chart.planets.map(p => (
            <div key={p.name} className="flex justify-between">
              <span>{t.planets[p.name] || p.name}</span>
              <span className="text-[#A59FC8]">
                {t.zodiacs[p.sign] || p.sign} {p.deg.toFixed(1)}° · {t.reading.house} {p.house}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-[#A59FC8]">{lang === "hi" ? "ग्रह दृष्टियां" : "Aspects"}</div>
        <p className="text-xs text-[#EDE9FA]">
          {r.chart.aspects.join(", ") || (lang === "hi" ? "कोई प्रमुख दृष्टि नहीं मिली" : "No major aspects found")}
        </p>
      </div>
      <p className="text-[11px] text-[#7C75A3] border-t border-[#2E2752] pt-2">
        {t.reading.ephemerisNote}
      </p>
    </div>
  );
};

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Home");
  const [step, setStep] = useState<"form" | "ask" | "locked" | "report">("form");
  const [formStep, setFormStep] = useState<number>(0); // 0: Name, 1: Email, 2: Photo, 3: Face Reading, 4: DOB, 5: Time, 6: Place
  const [lang, setLang] = useState<Language>("hi");

  const [f, setF] = useState({ name: "", email: "", date: "", time: "", place: "" });
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [googleAuthBday, setGoogleAuthBday] = useState("");
  const [showGoogleSignInPrompt, setShowGoogleSignInPrompt] = useState(false);
  const [googlePromptTab, setGooglePromptTab] = useState<"oauth" | "email">("oauth");
  const [googlePromptView, setGooglePromptView] = useState<"accounts" | "custom_email">("accounts");
  const [googleManualEmail, setGoogleManualEmail] = useState("");
  const [showDevClientId, setShowDevClientId] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const tokenClientRef = useRef<any>(null);

  // Backward compatibility alias for any references
  const showClientIdModal = showGoogleSignInPrompt;
  const setShowClientIdModal = setShowGoogleSignInPrompt;

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
  const [showTabLockedModal, setShowTabLockedModal] = useState(false);
  const [lockedModalTab, setLockedModalTab] = useState<(typeof TABS)[number]>("History");
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

            if (month) {
              const y = year ? String(year).padStart(4, "0") : "1990";
              const m = String(month).padStart(2, "0");
              const d = day ? String(day).padStart(2, "0") : "01";
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

  const handleConnectRealGoogle = (cId?: string) => {
    const targetId = (cId || customClientId).trim();
    if (!targetId) {
      setErr(lang === "hi" ? "कृपया एक मान्य गूगल क्लाइंट आईडी दर्ज करें" : "Please enter a valid Google OAuth Client ID");
      return;
    }
    localStorage.setItem("google_client_id", targetId);
    setCustomClientId(targetId);

    if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: targetId,
          scope: "openid email profile https://www.googleapis.com/auth/user.birthday.read",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== "popup_closed_by_user") {
                setErr(tokenResponse.error_description || "Google sign-in was cancelled or failed");
              }
              return;
            }
            await handleOAuthToken(tokenResponse.access_token);
          },
        });
        tokenClientRef.current = client;
        setShowGoogleSignInPrompt(false);
        setGoogleLoading(true);
        client.requestAccessToken({ prompt: "select_account" });
      } catch (e: any) {
        console.error("Failed to launch Google TokenClient:", e);
        setErr(e.message || "Failed to launch Google sign-in prompt");
      }
    } else {
      setShowGoogleSignInPrompt(false);
      setErr(lang === "hi" ? "Google स्क्रिप्ट लोड हो रही है, कृपया 2 सेकंड बाद फिर से क्लिक करें" : "Google services are initializing, please retry in 2 seconds");
    }
  };


  const triggerGoogleSignIn = () => {
    const clientId = getEffectiveClientId(); 
    

    // If client ID is present and token client is not initialized yet, initialize it now
    if (clientId && !tokenClientRef.current && typeof window !== "undefined") {
      initGoogleAuth();
    }

    // If client ID is present and token client is ready, request access token with real Google account chooser
    if (clientId && tokenClientRef.current) {
      setGoogleLoading(true);
      try {
        tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (e) {
        console.warn("Google OAuth popup error:", e);
        setGoogleLoading(false);
      }
    }

    if (clientId && typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("Google One Tap error:", e);
      }
    }

    // If no Google Client ID is configured yet, open real authentication setup prompt
    setGoogleManualEmail(f.email || "");
    setShowGoogleSignInPrompt(true);
  };

  useEffect(() => {
    // Stage 1 in Funnel: Track App Launch
    trackFunnelStep("launch");

    try {
      const savedLang = localStorage.getItem("app_lang") as Language | null;
      if (savedLang === "en" || savedLang === "hi") {
        setLang(savedLang);
      }
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

      const savedGoogleBday = localStorage.getItem("google_auth_bday") || savedProfile?.googleAuthBday || "";
      if (savedGoogleBday) setGoogleAuthBday(savedGoogleBday);

      const savedClientId = localStorage.getItem("google_client_id") || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      if (savedClientId) setCustomClientId(savedClientId);

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
                if (res.user.googleAuthBday) {
                  setGoogleAuthBday(res.user.googleAuthBday);
                  try { localStorage.setItem("google_auth_bday", res.user.googleAuthBday); } catch {}
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
                trackFunnelStep("subscribed", { email: f.email, name: f.name });
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
    document.body.appendChild(script);
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
      trackFunnelStep("photo", { name: f.name, email: f.email });
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
          trackFunnelStep("photo", { name: f.name, email: f.email });
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
      try { localStorage.setItem("google_auth_bday", cleanBday); } catch {}
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
        setShowTabLockedModal(false);
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
          googleAuthBday: cleanBday || googleAuthBday,
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
          setFormStep(6);
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

    // If user is not logged in or not subscribed, handle access
    if (!isLoggedIn) {
      setLockedModalTab("Plans");
      setShowTabLockedModal(true);
      return;
    }
    if (!sub) {
      setTab("Plans");
      return;
    }

    setAnalyzing(true);
    try {
      const reading = await askAstrologyQuestion({
        question: q.trim(),
        name: f.name.trim() || (lang === "hi" ? "प्रयोक्ता" : "Querent"),
        chart,
        customApiKey: openAiKey.trim() || undefined,
        language: lang,
      });

      const r: Rec = {
        q,
        name: f.name || (lang === "hi" ? "प्रयोक्ता" : "Querent"),
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
      const reading = generateAstrologicalAnswer(q, f.name || (lang === "hi" ? "प्रयोक्ता" : "Querent"), chart, lang);
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

      // Stage 7 in Funnel: Track App Attached to Screen
      trackFunnelStep("attached", {
        email: userEmail,
        name: querentName,
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
                trackFunnelStep("subscribed", { email, name: f.name });
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
        trackFunnelStep("subscribed", { email, name: f.name });
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

  const switchLanguage = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem("app_lang", newLang);
    } catch {}
  };

  const t = translations[lang];

  const stepsMeta = [
    { label: t.steps.name.label, icon: "👤", desc: t.steps.name.badge },
    { label: t.steps.email.label, icon: "✉️", desc: t.steps.email.badge },
    { label: t.steps.photo.label, icon: "📷", desc: t.steps.photo.badge },
    { label: t.steps.faceReading.label, icon: "✨", desc: t.steps.faceReading.badge },
    { label: t.steps.dob.label, icon: "📅", desc: t.steps.dob.badge },
    { label: t.steps.tob.label, icon: "🕒", desc: t.steps.tob.badge },
    { label: t.steps.pob.label, icon: "📍", desc: t.steps.pob.badge },
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
              <span className="font-bold tracking-wide text-sm sm:text-base text-[#EDE9FA]">{t.appName}</span>
              <span className="text-[10px] text-[#A59FC8]">{t.appSubtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => triggerGoogleSignIn()}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#E8B86B]/15 text-[#E8B86B] border border-[#E8B86B]/30 hover:bg-[#E8B86B]/25 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title={lang === "hi" ? "साइन इन करें" : "Sign In"}
              >
                <span>🔑</span>
                <span>{lang === "hi" ? "साइन इन" : "Sign In"}</span>
              </button>
            )}

            {/* Language Toggle Button (replacing Chart Ready badge & Premium button) */}
            <div className="flex items-center rounded-full bg-[#181233] p-1 border border-[#3E346B] shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => switchLanguage("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                lang === "en"
                  ? "bg-gradient-to-r from-[#E8B86B] to-[#FFD584] text-[#1A1230] font-bold shadow-sm"
                  : "text-[#A59FC8] hover:text-[#EDE9FA]"
              }`}
              title="Switch to English"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => switchLanguage("hi")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                lang === "hi"
                  ? "bg-gradient-to-r from-[#E8B86B] to-[#FFD584] text-[#1A1230] font-bold shadow-sm"
                  : "text-[#A59FC8] hover:text-[#EDE9FA]"
              }`}
              title="हिंदी में बदलें"
            >
              हिंदी
            </button>
          </div>
        </div>
      </header>

        {/* Home Page Title Section */}
        {tab === "Home" && (
          <section className="space-y-1.5 text-center pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9FA]">
              {t.heroTitle}
            </h1>
            <p className="text-xs text-[#A59FC8] leading-relaxed max-w-sm mx-auto">
              {t.heroSubtitle}
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
                      {t.steps.back}
                    </button>
                  )}
                  <span>{t.steps.stepOf(formStep + 1, 7)}</span>
                </div>
                <span className="text-[#E8B86B] font-semibold">{stepsMeta[formStep].label}</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A1533] border border-[#2E2752]">
                <div
                  className="h-full bg-gradient-to-r from-[#8870FF] to-[#E8B86B] transition-all duration-300 ease-out"
                  style={{ width: `${((formStep + 1) / 7) * 100}%` }}
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
                    <span>👤</span> {t.steps.name.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.name.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {t.steps.name.desc}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      className={inp}
                      placeholder={t.steps.name.placeholder}
                      value={f.name}
                      autoFocus
                      onChange={handleTextChange("name")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.name.trim()) {
                          trackFunnelStep("name", { name: f.name.trim() });
                          setFormStep(1);
                        }
                      }}
                    />
                  </div>

                  {f.name.trim().length > 0 && (
                    <p className="text-xs text-[#A59FC8]">
                      {lang === "hi" ? "नमस्ते," : "Nice to meet you,"} <span className="font-semibold text-[#E8B86B]">{f.name.trim()}</span>!
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.name.trim()}
                  onClick={() => {
                    trackFunnelStep("name", { name: f.name.trim() });
                    setFormStep(1);
                  }}
                >
                  {t.steps.name.btn}
                </button>

                {!isLoggedIn && (
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => triggerGoogleSignIn()}
                      className="text-xs text-[#A59FC8] hover:text-[#E8B86B] transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <span>🔑</span>
                      <span>{lang === "hi" ? "पहले से खाता है? साइन इन करें" : "Already have an account? Sign In"}</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* FIELD 2: EMAIL WITH GOOGLE SIGN IN */}
            {formStep === 1 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>✉️</span> {t.steps.email.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.email.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {lang === "hi"
                      ? "त्वरित साइन-इन के लिए गूगल का उपयोग करें या अपना ईमेल दर्ज करें।"
                      : "Use Google for instant sign-in or enter your email address manually."}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Official Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={triggerGoogleSignIn}
                    disabled={googleLoading || busy}
                    className="w-full min-h-12 rounded-xl bg-white hover:bg-[#f8f9fa] border border-[#dadce0] text-sm font-medium text-[#1f1f1f] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-[#4285F4]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span className="text-[#3c4043]">{lang === "hi" ? "गूगल से कनेक्ट हो रहा है..." : "Connecting with Google..."}</span>
                      </span>
                    ) : (
                      <>
                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                        <span className="text-[#3c4043] font-medium">
                          {isGoogleLogin
                            ? (lang === "hi" ? "गूगल कनेक्टेड ✓" : "Google Connected ✓")
                            : (lang === "hi" ? "गूगल के साथ जारी रखें" : "Continue with Google")}
                        </span>
                      </>
                    )}
                  </button>

                  
                  <div className="relative flex items-center justify-center my-3">
                    <div className="w-full border-t border-[#2E2752]" />
                    <span className="absolute bg-[#120D26] px-3 text-xs text-[#A59FC8]">
                      {lang === "hi" ? "या ईमेल दर्ज करें" : "or enter email manually"}
                    </span>
                  </div>

                  <input
                    type="email"
                    className={inp}
                    placeholder={t.steps.email.placeholder}
                    value={f.email}
                    autoFocus={!isGoogleLogin}
                    onChange={handleTextChange("email")}
                    onKeyDown={e => {
                      if (e.key === "Enter" && isEmailValid) {
                        setFormStep(2);
                      }
                    }}
                  />

                  {isGoogleLogin && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#273B2F] border border-[#3A6B4C] px-3 py-2 text-xs text-[#8EF2B0]">
                      <span>✓</span>
                      <span>{lang === "hi" ? "गूगल द्वारा लॉग इन:" : "Signed in via Google:"} <strong>{f.email}</strong></span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!isEmailValid}
                  onClick={() => {
                    setFormStep(2);
                  }}
                >
                  {t.steps.email.btn}
                </button>
              </section>
            )}

            {/* FIELD 3: PHOTOGRAPH / REAL CAMERA */}
            {formStep === 2 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📷</span> {t.steps.photo.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.photo.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {t.steps.photo.desc}
                  </p>
                </div>

                {photoUrl ? (
                  /* Captured Real Photo Display */
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-3xl overflow-hidden border-2 border-[#8EF2B0]/80 shadow-[0_0_35px_rgba(142,242,176,0.25)] bg-[#0C091A]">
                      <img src={photoUrl} alt="Captured portrait" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-[#8EF2B0]/95 text-[#0A170F] text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                        <span>✓</span> {lang === "hi" ? "फोटो सुरक्षित हुई" : "Real Photo Captured"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="text-xs text-[#E8B86B] hover:text-[#FFE2A4] flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                      >
                        🔄 {t.steps.photo.retake}
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
                        {lang === "hi" ? "हटाएं" : "Remove"}
                      </button>
                    </div>

                    <button
                      type="button"
                      className={btn}
                      onClick={() => {
                        trackFunnelStep("photo", { name: f.name, email: f.email });
                        setFormStep(3);
                      }}
                    >
                      {t.steps.continue}
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
                          <span className="font-medium">{lang === "hi" ? "कैमरा शुरू हो रहा है..." : "Opening physical camera..."}</span>
                        </div>
                      )}

                      {/* Viewfinder Target Reticle Overlay */}
                      {isCameraActive && (
                        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div className="w-5 h-5 border-t-2 border-l-2 border-[#E8B86B]/80 rounded-tl-lg" />
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-[#8EF2B0]/40 text-[10px] text-[#8EF2B0] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8EF2B0] animate-ping" />
                              {lang === "hi" ? "लाइव कैमरा" : "Live Camera"}
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
                            {lang === "hi" ? "पुनः प्रयास करें" : "Try Camera Again"}
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
                        {t.steps.photo.capture}
                      </button>

                      <div className="flex items-center justify-between w-full px-2 text-xs">
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="text-[#A59FC8] hover:text-[#EDE9FA] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          🔄 {t.steps.photo.flip} ({facingMode === "user" ? (lang === "hi" ? "फ्रंट" : "Front") : (lang === "hi" ? "बैक" : "Back")})
                        </button>
                        <label
                          htmlFor="fallback-photo-upload"
                          className="text-[#A59FC8] hover:text-[#EDE9FA] cursor-pointer underline"
                        >
                          {t.steps.photo.upload}
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
                          {t.steps.photo.skip}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* FIELD 4: VEDIC FACE READING & PREDICTION INSIGHT */}
            {formStep === 3 && (() => {
              const prediction = getFaceReadingPredictionMonths(googleAuthBday, f.date, lang);
              return (
                <section className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                      <span>✨</span> {t.steps.faceReading.badge}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">
                      {t.steps.faceReading.title}
                    </h1>
                  </div>

                  {/* Captured Portrait or Mystic Aura Card */}
                  <div className="flex flex-col items-center">
                    {photoUrl ? (
                      <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-3xl overflow-hidden border-2 border-[#E8B86B]/70 shadow-[0_0_35px_rgba(232,184,107,0.3)] bg-[#0C091A]">
                        <img src={photoUrl} alt="Face reading scan" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0C091A]/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-3 py-1 border border-[#8EF2B0]/40 text-[10px] text-[#8EF2B0] font-semibold">
                          <span>✓</span>
                          <span>{t.steps.faceReading.faceAnalyzedBadge}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-36 h-36 mx-auto rounded-3xl border-2 border-[#E8B86B]/50 bg-gradient-to-tr from-[#1E1742] via-[#2A1F5B] to-[#171233] flex flex-col items-center justify-center shadow-[0_0_35px_rgba(232,184,107,0.25)]">
                        <span className="text-4xl animate-pulse">🔮</span>
                        <span className="text-[11px] text-[#E8B86B] font-medium mt-1">Vedic Physiognomy</span>
                      </div>
                    )}
                  </div>

                  {/* Prediction Description Card */}
                  <div className="relative rounded-2xl border border-[#E8B86B]/40 bg-gradient-to-br from-[#231A47] via-[#1B1438] to-[#120D26] p-5 shadow-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8B86B]/15 text-lg text-[#E8B86B] border border-[#E8B86B]/30">
                        ✨
                      </div>
                      <div className="space-y-2">
                        {lang === "hi" ? (
                          <p className="text-[15px] sm:text-base leading-relaxed text-[#EDE9FA] font-medium tracking-wide">
                            आने वाले वर्षों में आपका जीवन बदल सकता है, आपके नए रिश्ते और नए अवसर बन सकते हैं। आपके चेहरे के अध्ययन के आधार पर ऐसा प्रतीत होता है कि आपका जन्म{" "}
                            <span className="text-[#E8B86B] font-bold underline decoration-[#E8B86B]/60 underline-offset-4">{prediction.monthX}</span>
                            {" "}या{" "}
                            <span className="text-[#E8B86B] font-bold underline decoration-[#E8B86B]/60 underline-offset-4">{prediction.monthY}</span>
                            {" "}के महीने में हुआ है।
                          </p>
                        ) : (
                          <p className="text-[15px] sm:text-base leading-relaxed text-[#EDE9FA] font-medium tracking-wide">
                            your life may get changed in coming years you may have new relations and new opportunities it llok like you are born in month{" "}
                            <span className="text-[#E8B86B] font-bold underline decoration-[#E8B86B]/60 underline-offset-4">{prediction.monthX}</span>
                            {" "}or month{" "}
                            <span className="text-[#E8B86B] font-bold underline decoration-[#E8B86B]/60 underline-offset-4">{prediction.monthY}</span>
                            {" "}based on your face reading.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dual Month Visual Chips */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="rounded-xl border border-[#E8B86B]/30 bg-[#140F2B]/80 p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-[#A59FC8] font-semibold">
                          {t.steps.faceReading.highlightMonthX}
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[#E8B86B] flex items-center justify-center gap-1">
                          <span>🌟</span>
                          <span>{prediction.monthX}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#8870FF]/30 bg-[#140F2B]/80 p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-[#A59FC8] font-semibold">
                          {t.steps.faceReading.highlightMonthY}
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[#C3B7FF] flex items-center justify-center gap-1">
                          <span>🌙</span>
                          <span>{prediction.monthY}</span>
                        </div>
                      </div>
                    </div>

                    {googleAuthBday ? (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8EF2B0] font-medium pt-1">
                        <span>🔒</span>
                        <span>{t.steps.faceReading.verifiedGoogleBadge} ({prediction.monthX})</span>
                      </div>
                    ) : (
                      !isLoggedIn && (
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => triggerGoogleSignIn()}
                            className="text-xs text-[#E8B86B] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>🔑</span>
                            <span>{lang === "hi" ? "गूगल से साइन इन करके जन्म माह सत्यापित करें" : "Sign in with Google to sync birth month"}</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Navigation to next page (DOB / Calendar) */}
                  <button
                    type="button"
                    className={btn}
                    onClick={() => setFormStep(4)}
                  >
                    {t.steps.faceReading.btn}
                  </button>
                </section>
              );
            })()}

            {/* FIELD 5: DATE OF BIRTH */}
            {formStep === 4 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📅</span> {t.steps.dob.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.dob.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {t.steps.dob.desc}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">{t.steps.dob.fieldLabel}</label>
                    <input
                      type="date"
                      className={inp}
                      aria-label={t.steps.dob.fieldLabel}
                      value={f.date}
                      autoFocus
                      onChange={handleTextChange("date")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.date) {
                          trackFunnelStep("dob", { name: f.name, email: f.email });
                          setFormStep(5);
                        }
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
                        <div className="text-xs uppercase tracking-wider text-[#A59FC8]">{t.steps.dob.sunSign}</div>
                        <div className="text-base font-bold text-[#E8B86B]">{t.zodiacs[zodiac.name] || zodiac.name} {zodiac.symbol}</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.date}
                  onClick={() => {
                    trackFunnelStep("dob", { name: f.name, email: f.email });
                    setFormStep(5);
                  }}
                >
                  {t.steps.continue}
                </button>
              </section>
            )}

            {/* FIELD 6: TIME OF BIRTH */}
            {formStep === 5 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>🕒</span> {t.steps.tob.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.tob.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {t.steps.tob.desc}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">{t.steps.tob.fieldLabel}</label>
                    <input
                      type="time"
                      className={inp}
                      aria-label={t.steps.tob.fieldLabel}
                      value={f.time}
                      autoFocus
                      onChange={handleTextChange("time")}
                      onKeyDown={e => {
                        if (e.key === "Enter" && f.time) {
                          trackFunnelStep("tob", { name: f.name, email: f.email });
                          setFormStep(6);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setF(prev => ({ ...prev, time: "12:00" }))}
                      className="text-xs text-[#E8B86B] hover:underline cursor-pointer"
                    >
                      {t.steps.tob.noonHint}
                    </button>
                    {f.time && (
                      <span className="text-xs text-[#8EF2B0]">{t.steps.tob.selected} {f.time}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={btn}
                  disabled={!f.time}
                  onClick={() => {
                    trackFunnelStep("tob", { name: f.name, email: f.email });
                    setFormStep(6);
                  }}
                >
                  {t.steps.continue}
                </button>
              </section>
            )}

            {/* FIELD 7: PLACE OF BIRTH */}
            {formStep === 6 && (
              <section className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
                    <span>📍</span> {t.steps.pob.badge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.steps.pob.title}</h1>
                  <p className="text-sm text-[#A59FC8]">
                    {t.steps.pob.desc}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A59FC8]">{t.steps.pob.fieldLabel}</label>
                    <input
                      type="text"
                      className={inp}
                      placeholder={t.steps.pob.placeholder}
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
                    <span className="text-[11px] text-[#A59FC8]">{lang === "hi" ? "त्वरित सुझाव:" : "Quick suggestions:"}</span>
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
                    <div className="font-semibold text-[#EDE9FA] mb-1">{t.steps.pob.summaryTitle}:</div>
                    <div className="flex justify-between">
                      <span>{t.steps.name.label}:</span> <span className="text-[#EDE9FA]">{f.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.steps.email.label}:</span> <span className="text-[#EDE9FA]">{f.email || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.steps.pob.born}</span> <span className="text-[#EDE9FA]">{f.date || "-"} at {f.time || "-"}</span>
                    </div>
                    {photoUrl && (
                      <div className="flex justify-between items-center pt-1">
                        <span>{t.steps.pob.portrait}</span>
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
                      {t.steps.pob.agreePrivacy}
                      <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#E8B86B] underline hover:text-[#FFE2A4]">
                        {t.steps.pob.privacyPolicy}
                      </a>
                      {t.steps.pob.and}
                      <a href="/terms" target="_blank" rel="noreferrer" className="text-[#E8B86B] underline hover:text-[#FFE2A4]">
                        {t.steps.pob.terms}
                      </a>
                      {t.steps.pob.agreeConsent}
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
                      {t.steps.pob.calculatingBtn}
                    </span>
                  ) : (
                    t.steps.pob.calcBtn
                  )}
                </button>
              </section>
            )}
          </div>
        )}

        {/* STEP: ASK QUESTION PAGE */}
        {tab === "Home" && step === "ask" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Querent Overview Header */}
            <div className={card + " border-[#E8B86B]/40 bg-gradient-to-r from-[#211A3D] to-[#2E204B] p-3.5 space-y-2"}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#E8B86B] font-semibold flex items-center gap-1.5">
                    <span>✨</span> {t.ask.chartReady}
                  </div>
                  <div className="font-bold text-base text-[#EDE9FA]">{f.name || (lang === "hi" ? "प्रयोक्ता" : "Querent")}</div>
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
                  {t.ask.newChart}
                </button>
              </div>

              {(f.date || f.place) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#A59FC8] pt-1.5 border-t border-[#3E346B]/40">
                  {f.date && <span>📅 {t.ask.born} <strong className="text-[#EDE9FA]">{f.date}</strong>{f.time ? ` (${f.time})` : ""}</span>}
                  {f.place && <span>📍 <strong className="text-[#EDE9FA]">{f.place}</strong></span>}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-[#EDE9FA]">{t.ask.title}</h2>
              <p className="text-xs sm:text-sm text-[#A59FC8]">
                {t.ask.subtitle}
              </p>
            </div>

            <textarea
              className={inp + " min-h-28 py-3 text-sm"}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t.ask.placeholder}
            />

            {/* Subscription banner if user is not yet subscribed */}
            {!sub && (
              <div className="rounded-xl border border-[#E8B86B]/30 bg-[#251A3A] p-3 text-xs flex items-center justify-between gap-3 text-[#EDE9FA]">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <span>
                    <strong className="text-[#E8B86B]">{t.ask.subRequired}</strong> {t.ask.subRequiredDesc}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setLockedModalTab("Plans");
                      setShowTabLockedModal(true);
                    } else {
                      setTab("Plans");
                    }
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#FFE2A4] transition-colors cursor-pointer"
                >
                  {t.ask.viewPlans}
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
                  {t.ask.consulting}
                </span>
              ) : sub ? (
                t.ask.analyzeBtn
              ) : (
                t.ask.analyzePlansBtn
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
                          {t.reading.title}
                        </div>
                        <div className="text-[11px] text-[#A59FC8]">
                          {t.reading.calcFor} {f.name || (lang === "hi" ? "प्रयोक्ता" : "Querent")}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#A59FC8] bg-[#16102B] px-2 py-0.5 rounded-full border border-[#2E2752]">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>

                  {/* Querent question recap */}
                  <div className="bg-[#150F28] p-3 rounded-xl border border-[#2E2752] text-xs">
                    <span className="text-[#A59FC8] font-medium block mb-0.5">{t.reading.yourQuestion}</span>
                    <span className="italic text-[#EDE9FA] font-medium">"{q}"</span>
                  </div>

                  {/* FIRST PART OF RESPONSE: DIRECT ANSWER */}
                  {currentAnswer.aiAnswer && (
                    <div className="rounded-xl bg-gradient-to-r from-[#2C1E4E] to-[#1E173D] p-3.5 border border-[#E8B86B]/60 shadow-lg space-y-1.5 animate-in fade-in">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#E8B86B] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>✨</span> {t.reading.directAnswer}
                        </span>
                        <span className="text-[10px] font-normal text-[#E8B86B]/90 bg-[#17102D] px-2 py-0.5 rounded-full border border-[#E8B86B]/30">
                          {t.reading.aiPrediction}
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
                      <span>✨</span> {t.reading.synthesis}
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
                      {t.reading.keyPlacements}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {currentAnswer.keyPlacements.map((p, idx) => (
                        <div key={idx} className="bg-[#1A1433] p-2.5 rounded-xl border border-[#2E2752] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#E8B86B]">{t.planets[p.planet] || p.planet} {lang === "hi" ? "में" : "in"} {t.zodiacs[p.sign] || p.sign}</span>
                            <span className="text-[11px] text-[#A59FC8] bg-[#241D42] px-2 py-0.5 rounded-md">{t.reading.house} {p.house}</span>
                          </div>
                          <p className="text-[11px] text-[#D6D1EE] leading-relaxed">{p.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing & Guidance */}
                  <div className="bg-[#241D42]/70 p-3 rounded-xl border border-[#3E346B]/50 space-y-2 text-xs">
                    <div className="font-semibold text-[#E8B86B] flex items-center gap-1.5">
                      <span>⏳</span> {t.reading.timing}
                    </div>
                    <p className="text-[#EDE9FA] leading-relaxed text-[11px]">
                      {currentAnswer.timing}
                    </p>
                  </div>

                  {/* Actionable Advice */}
                  <div className="space-y-1.5 pt-1 border-t border-[#3E346B]/40 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#A59FC8]">
                      {t.reading.advice}
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
                          <>{t.reading.attachBannerDone}</>
                        ) : (
                          <>{t.reading.attachBannerPrompt} <strong className="text-[#E8B86B]">{t.reading.attachBtn}</strong></>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAttachModal(true)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#FFE2A4] transition-colors cursor-pointer"
                    >
                      {appAttached ? t.reading.viewDetailsBtn : t.reading.attachBtn}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#2E2752] text-[11px] text-[#7C75A3]">
                    <span>{t.reading.ephemerisNote}</span>
                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-[#E8B86B] hover:underline cursor-pointer"
                    >
                      {t.reading.askAnother}
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
              <div className="text-xl font-bold text-[#EDE9FA]">{t.locked.title}</div>
              <p className="text-sm text-[#D6D1EE] mt-1">
                {t.locked.desc}
              </p>
            </div>
            <button
              className={btn}
              onClick={() => {
                if (!isLoggedIn) {
                  setLockedModalTab("Plans");
                  setShowTabLockedModal(true);
                } else {
                  setTab("Plans");
                }
              }}
            >
              {t.locked.btn}
            </button>
          </div>
        )}

        {/* STEP: REPORT VIEW */}
        {tab === "Home" && step === "report" && cur && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.report.title}</h1>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setFormStep(0);
                  setQ("");
                }}
                className="text-xs text-[#E8B86B] hover:underline cursor-pointer"
              >
                {t.report.newChart}
              </button>
            </div>
            <Report r={cur} lang={lang} />
            <button
              className={btn}
              onClick={() => {
                setStep("form");
                setFormStep(0);
                setQ("");
              }}
            >
              {t.report.calcAnother}
            </button>
          </div>
        )}

        {/* FROZEN / LOCKED TAB SCREEN (When guest user tries to view non-Home tab) */}
        {!isLoggedIn && tab !== "Home" && (
          <div className="space-y-5 animate-in fade-in duration-200 py-6 text-center">
            <div className="rounded-3xl border border-[#E8B86B]/30 bg-gradient-to-b from-[#1E1738]/95 to-[#120D24]/95 p-6 shadow-2xl backdrop-blur-md space-y-4 max-w-sm mx-auto">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8B86B]/15 text-3xl shadow-[0_0_25px_rgba(232,184,107,0.25)] border border-[#E8B86B]/30">
                🔒
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs font-semibold text-[#E8B86B] border border-[#E8B86B]/20">
                  <span>❄️</span>
                  <span>{t.lockedTab.lockedBadge}</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-[#EDE9FA]">
                  {t.lockedTab.lockedTitle(
                    tab === "History" ? t.tabs.history : tab === "Profile" ? t.tabs.profile : t.tabs.plans
                  )}
                </h2>
                <p className="text-xs text-[#A59FC8] leading-relaxed">
                  {t.lockedTab.lockedDesc(
                    tab === "History" ? t.tabs.history : tab === "Profile" ? t.tabs.profile : t.tabs.plans
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => triggerGoogleSignIn()}
                  className={btn}
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{t.lockedTab.signInBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab("Home")}
                  className="w-full py-2.5 rounded-xl border border-[#3E346B] text-xs font-semibold text-[#A59FC8] hover:text-[#EDE9FA] hover:bg-[#1E1738] transition-colors cursor-pointer"
                >
                  {t.lockedTab.backHome}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {tab === "History" && isLoggedIn && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.history.title}</h1>
            {hist.length === 0 ? (
              <div className={card + " text-center py-8 text-[#A59FC8]"}>
                <span className="text-3xl block mb-2">📜</span>
                {t.history.empty}
              </div>
            ) : (
              hist.map((r, i) =>
                sub ? (
                  <Report key={i} r={r} lang={lang} />
                ) : (
                  <div key={i} className={card + " space-y-1"}>
                    <div className="font-medium text-[#EDE9FA]">{r.q}</div>
                    <div className="text-xs text-[#A59FC8] flex justify-between pt-1">
                      <span>{r.at}</span>
                      <span className="text-[#E8B86B]">{t.history.locked}</span>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        )}

        {/* TAB: PROFILE */}
        {tab === "Profile" && isLoggedIn && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.profile.title}</h1>
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
                  <div className="font-semibold text-base text-[#EDE9FA]">{f.name || t.profile.guest}</div>
                  <div className="text-xs text-[#A59FC8]">{f.email || t.profile.noEmail}</div>
                  {isGoogleLogin && (
                    <span className="inline-block mt-1 text-[11px] text-[#8EF2B0]">
                      {t.profile.googleAuth}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-[#2E2752] pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#A59FC8]">{t.profile.subPlan}</span>
                  <span className="font-medium text-[#E8B86B]">{sub ? t.profile.premiumActive : t.profile.freeExplorer}</span>
                </div>
                {f.date && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">{t.profile.dob}</span>
                    <span className="text-[#EDE9FA]">{f.date}</span>
                  </div>
                )}
                {f.time && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">{t.profile.tob}</span>
                    <span className="text-[#EDE9FA]">{f.time}</span>
                  </div>
                )}
                {f.place && (
                  <div className="flex justify-between">
                    <span className="text-[#A59FC8]">{t.profile.birthCity}</span>
                    <span className="text-[#EDE9FA]">{f.place}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Server Connection Details */}
            <div className={card + " space-y-2 text-xs"}>
              <div className="font-semibold text-[#EDE9FA]">{t.profile.serverConn}</div>
              <div className="flex justify-between items-center">
                <span className="text-[#A59FC8]">{t.profile.backendUrl}</span>
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
                <span className="text-[#A59FC8]">{t.profile.apiStatus}</span>
                <span className={serverOnline ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {serverOnline ? t.profile.online : t.profile.offline}
                </span>
              </div>
            </div>

            {/* ChatGPT / OpenAI Integration Settings */}
            <div className={card + " space-y-3 text-xs"}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>🤖</span> {t.profile.chatgptTitle}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${openAiKey ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/30" : "text-[#E8B86B] border-[#E8B86B]/30 bg-[#E8B86B]/10"}`}>
                  {openAiKey ? t.profile.customKeyActive : t.profile.serverEnvDefault}
                </span>
              </div>
              <p className="text-[#A59FC8] leading-relaxed">
                {t.profile.chatgptDesc}
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#A59FC8] block">{t.profile.chatgptKeyLabel}</label>
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
                      alert(trimmed ? (lang === "hi" ? "चैटजीपीटी एपीआई की सफलतापूर्वक सुरक्षित हुई!" : "ChatGPT API Key saved successfully!") : (lang === "hi" ? "की हटा दी गई। डिफ़ॉल्ट सर्वर की प्रयुक्त होगी।" : "Key removed. Using server .env key."));
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#E8B86B] text-[#1A1230] font-semibold text-xs hover:bg-[#F2C77D] transition-colors cursor-pointer"
                  >
                    {t.profile.save}
                  </button>
                </div>
                <p className="text-[10px] text-[#7C75A3]">
                  {t.profile.keyEnvHint}
                </p>
              </div>
            </div>

            {/* 30-Day Session Token & Auto-Login Card */}
            <div className={card + " space-y-2.5 text-xs border-[#2E2752]"}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>🔐</span> {t.profile.autoLoginTitle}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isLoggedIn ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/30 font-medium" : "text-[#A59FC8] border-[#2E2752] bg-[#1A1533]"}`}>
                  {isLoggedIn ? t.profile.sessionActive : t.profile.guestSession}
                </span>
              </div>
              <p className="text-[#A59FC8] leading-relaxed text-[11px]">
                {isLoggedIn ? t.profile.autoLoginDescActive : t.profile.autoLoginDescGuest}
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
                  {t.profile.signOut}
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
                {t.profile.editDetails}
              </button>

              <div className="flex justify-center items-center gap-3 text-xs text-[#A59FC8] pt-1">
                <a href="/privacy-policy" target="_blank" rel="noreferrer" className="hover:text-[#E8B86B] underline transition-colors">
                  {t.profile.privacyPolicy}
                </a>
                <span>•</span>
                <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-[#E8B86B] underline transition-colors">
                  {t.profile.terms}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLANS */}
        {tab === "Plans" && isLoggedIn && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#EDE9FA]">{t.plans.title}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8B86B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8B86B] border border-[#E8B86B]/30">
                  {t.plans.tag}
                </span>
              </div>
              <p className="text-xs text-[#A59FC8]">
                {t.plans.desc}
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
                      {t.plans.activeMembership}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {displayPlans.find(p => p.id === subPlan)?.perMonthText || (subPlan === "three_month" ? "₹299 / 3-Months" : "₹149 / Month")}
                  </span>
                </div>

                <div className="text-xs text-[#C5C0E2] leading-relaxed">
                  {t.plans.activeMembershipDesc}
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-emerald-500/20 text-[11px] text-[#A59FC8] gap-2">
                  <span>{t.plans.gatewayNote}</span>
                  <span>{t.plans.cancelNote}</span>
                </div>
              </div>
            )}

            {/* UPI MANDATE PHONE NUMBER INPUT */}
            <div className={card + " space-y-2 border-[#2E2752]"}>
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-[#EDE9FA] flex items-center gap-1.5">
                  <span>📱</span> {t.plans.phoneLabel}
                </label>
                <span className="text-[10px] text-[#A59FC8]">{t.plans.phoneReq}</span>
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
                {t.plans.phoneDesc}
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
                        {p.savings || (p.id === "three_month" ? (lang === "hi" ? "सर्वोत्तम मूल्य पास" : "Best Value Cosmic Pass") : (lang === "hi" ? "मानक एक्सेस" : "Standard Access"))}
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
                      ? (lang === "hi" ? "गेटवे से जुड़ रहे हैं..." : "Connecting Gateway...")
                      : isCurrentPlan
                      ? (lang === "hi" ? "वर्तमान सक्रिय प्लान ✓" : "Current Active Plan ✓")
                      : (lang === "hi" ? `भुगतान व सदस्यता (₹${p.amount}) →` : `Pay & Subscribe (₹${p.amount}) →`)}
                  </button>
                </div>
              );
            })}

            {/* TRUST / RAZORPAY BADGE & UPI APP ICONS */}
            <div className="rounded-2xl border border-[#2E2752] bg-[#120D24]/80 p-3.5 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#EDE9FA]">
                <span>🔒</span>
                <span>{lang === "hi" ? "Razorpay पेमेंट्स द्वारा सुरक्षित (UPI AutoPay, कार्ड्स और नेटबैंकिंग)" : "Powered by Razorpay Payments (UPI AutoPay, Cards & Netbanking)"}</span>
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
                {lang === "hi" 
                  ? "NPCI एवं RBI अनुपालित 256-बिट सुरक्षित गेटवे। अपने UPI ऐप में सेटिंग्स → ऑटोपे से कभी भी मेंडेट रद्द करें।" 
                  : "NPCI & RBI Compliant 256-bit Secure Gateway. Cancel or pause mandate anytime directly inside your UPI app under Settings → AutoPay."}
              </p>
            </div>
          </div>
        )}

      </main>

      {/* AUTHENTIC GOOGLE SIGN-IN PROMPT (Material 3 Auth Dialog & Real Account Connection) */}
      {showGoogleSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-[28px] bg-white text-[#1f1f1f] shadow-2xl border border-[#dadce0] p-6 sm:p-7 flex flex-col justify-between font-sans relative animate-in zoom-in-95 duration-200">
            {/* Header: Google Icon & Close Button */}
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
              <div className="flex items-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                  Google Sign-In
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleSignInPrompt(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] transition-colors cursor-pointer text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mt-4 flex rounded-xl bg-[#f1f3f4] p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGooglePromptTab("oauth")}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  googlePromptTab === "oauth"
                    ? "bg-white text-[#1a73e8] shadow-sm font-semibold"
                    : "text-[#5f6368] hover:text-[#1f1f1f]"
                }`}
              >
                {lang === "hi" ? "🔗 असली गूगल खाता (OAuth)" : "🔗 Real Google Account"}
              </button>
              <button
                type="button"
                onClick={() => setGooglePromptTab("email")}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  googlePromptTab === "email"
                    ? "bg-white text-[#1a73e8] shadow-sm font-semibold"
                    : "text-[#5f6368] hover:text-[#1f1f1f]"
                }`}
              >
                {lang === "hi" ? "✉️ ईमेल से साइन इन" : "✉️ Real Email Sign-In"}
              </button>
            </div>

            {/* TAB 1: REAL GOOGLE OAUTH POPUP (Shows Real Accounts directly from Google) */}
            {googlePromptTab === "oauth" && (
              <div className="mt-4 space-y-3.5">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1f1f1f]">
                    {lang === "hi" ? "असली गूगल खाते दिखाएं" : "Show Your Real Google Accounts"}
                  </h3>
                  <p className="text-[12px] text-[#5f6368] mt-1 leading-relaxed">
                    {lang === "hi"
                      ? "ब्राउज़र सुरक्षा के अनुसार, आपके असली Google खातों को केवल Google के आधिकारिक पॉपअप से ही दिखाया जा सकता है। इसके लिए Google Cloud Client ID की आवश्यकता होती है।"
                      : "For privacy and security, only Google's official popup can display your browser's real logged-in Google accounts. Provide your Google OAuth Client ID below to launch Google's authentic account picker:"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#444746] block uppercase tracking-wider">
                    Google OAuth Web Client ID:
                  </label>
                  <input
                    type="text"
                    placeholder="xxxx.apps.googleusercontent.com"
                    value={customClientId}
                    onChange={e => setCustomClientId(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && customClientId.trim()) {
                        handleConnectRealGoogle(customClientId.trim());
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 text-[13px] text-[#1f1f1f] placeholder-[#9aa0a6] outline-none transition-all font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => handleConnectRealGoogle(customClientId.trim())}
                  className="w-full py-3 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[13px] font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{lang === "hi" ? "असली गूगल खाता विंडो खोलें" : "Launch Official Google Account Chooser"}</span>
                </button>

                {/* Collapsible Setup Guide */}
                <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-xl p-3 text-[11px] text-[#444746] space-y-1.5">
                  <div className="font-semibold text-[#1f1f1f] flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{lang === "hi" ? "Google Client ID कैसे प्राप्त करें:" : "How to get your Google Client ID (Free):"}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[#5f6368] pl-1">
                    <li>{lang === "hi" ? "Google Cloud Console खोलें (console.cloud.google.com)" : "Go to console.cloud.google.com"}</li>
                    <li>{lang === "hi" ? "APIs & Services → Credentials → Create OAuth Client ID (Web Application)" : "APIs & Services → Credentials → Create OAuth Client ID (Web Application)"}</li>
                    <li>{lang === "hi" ? "Authorized JavaScript origins में http://localhost:3000 जोड़ें" : "Add http://localhost:3000 to Authorized JavaScript Origins"}</li>
                    <li>{lang === "hi" ? "Client ID को यहाँ पेस्ट करें या astrology-pwa/.env.local में सेव करें" : "Paste your Client ID above or save in astrology-pwa/.env.local"}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: INSTANT REAL EMAIL SIGN-IN (No Cloud Setup Needed) */}
            {googlePromptTab === "email" && (
              <div className="mt-4 space-y-3.5">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1f1f1f]">
                    {lang === "hi" ? "अपने असली गूगल ईमेल से साइन इन करें" : "Sign in with your Real Email"}
                  </h3>
                  <p className="text-[12px] text-[#5f6368] mt-1 leading-relaxed">
                    {lang === "hi"
                      ? "बिना Google Cloud सेटअप के अपने व्यक्तिगत ईमेल पते से तुरंत साइन इन करें:"
                      : "Instant authentication with your actual personal email address without requiring Google Cloud setup:"}
                  </p>
                </div>

                {/* If user previously typed their email in the form */}
                {f.email.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      handleGoogleAuth({
                        email: f.email.trim(),
                        name: f.name.trim() || f.email.split("@")[0],
                      });
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#c2e7ff] text-left cursor-pointer transition-all group"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-[#1a73e8] text-white font-semibold flex items-center justify-center text-sm shadow-sm">
                      {(f.name ? f.name[0] : f.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#1f1f1f] truncate group-hover:text-[#0b57d0]">
                        {f.name.trim() || f.email.split("@")[0]}
                      </div>
                      <div className="text-[11px] text-[#444746] truncate">
                        {f.email.trim()}
                      </div>
                    </div>
                    <span className="text-xs text-[#1a73e8] font-semibold">
                      {lang === "hi" ? "जारी रखें →" : "Continue →"}
                    </span>
                  </button>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#444746] block uppercase tracking-wider">
                    {lang === "hi" ? "गूगल / व्यक्तिगत ईमेल:" : "Your Google / Personal Email:"}
                  </label>
                  <input
                    type="email"
                    autoFocus
                    placeholder="yourname@gmail.com"
                    value={googleManualEmail}
                    onChange={e => setGoogleManualEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && googleManualEmail.trim()) {
                        handleGoogleAuth({
                          email: googleManualEmail.trim(),
                          name: f.name || googleManualEmail.split("@")[0],
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 text-[14px] text-[#1f1f1f] placeholder-[#9aa0a6] outline-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  disabled={!googleManualEmail.trim() || !googleManualEmail.includes("@")}
                  onClick={() => {
                    if (googleManualEmail.trim()) {
                      handleGoogleAuth({
                        email: googleManualEmail.trim(),
                        name: f.name || googleManualEmail.split("@")[0],
                      });
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[13px] font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>{lang === "hi" ? "इस खाते से साइन इन करें →" : "Sign In with this Account →"}</span>
                </button>
              </div>
            )}

            {/* Official Google Privacy & Security Notice */}
            <div className="mt-5 pt-3 border-t border-[#f1f3f4] text-center">
              <p className="text-[11px] text-[#747775] leading-relaxed">
                {lang === "hi"
                  ? "🔒 सुरक्षित साइन इन। केवल आपकी बुनियादी प्रोफ़ाइल (नाम व ईमेल) का उपयोग होता है।"
                  : "🔒 256-bit Secure Authentication. Only your basic profile (name & email) is used."}
              </p>
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
                  <h3 className="text-sm font-bold text-[#EDE9FA]">{t.upiModal.title}</h3>
                  <p className="text-[10px] text-[#A59FC8]">{t.upiModal.secureTag}</p>
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
                <span className="text-[#A59FC8]">{t.upiModal.merchant}:</span>
                <span className="font-semibold text-[#EDE9FA]">{t.appName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">{t.upiModal.plan}:</span>
                <span className="font-semibold text-[#E8B86B]">{pendingSubSession.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">{t.upiModal.amount}:</span>
                <span className="font-bold text-sm text-[#E8B86B]">₹{pendingSubSession.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A59FC8]">{t.upiModal.frequency}:</span>
                <span className="font-medium text-[#EDE9FA]">
                  {pendingSubSession.planId === "three_month" ? t.upiModal.every3Months : t.upiModal.monthly}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#2E2752]/60 text-[11px]">
                <span className="text-[#7C75A3]">{t.upiModal.subId}:</span>
                <span className="font-mono text-[10px] text-[#A59FC8] truncate max-w-[150px]">
                  {pendingSubSession.subscriptionId}
                </span>
              </div>
            </div>

            {/* Select UPI App */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#EDE9FA] block">
                {t.upiModal.selectApp}:
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
                  ? t.upiModal.authorizing
                  : t.upiModal.authBtn(pendingSubSession.amount)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpiModal(false);
                  setPendingSubSession(null);
                }}
                className="w-full rounded-xl border border-[#2E2752] py-2 text-xs text-[#A59FC8] hover:text-white cursor-pointer"
              >
                {t.upiModal.cancel}
              </button>
            </div>

            {/* Security note */}
            <p className="text-center text-[10px] text-[#7C75A3] leading-relaxed">
              {t.upiModal.securityNote}
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
                  <h3 className="text-sm font-bold text-[#EDE9FA]">{t.attachModal.title}</h3>
                  <p className="text-[10px] text-[#E8B86B] font-semibold">{t.attachModal.subtitle}</p>
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
                  {t.attachModal.prompt}
                </p>
                <p className="text-[11px] text-[#C4BEDD] leading-relaxed">
                  {t.attachModal.desc}
                </p>
              </div>

              {/* Benefits card */}
              <div className="rounded-2xl border border-[#2E2752] bg-[#16102B] p-3 space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">✨</span>
                  <span><strong>{t.attachModal.b1Title}:</strong> {t.attachModal.b1Desc}</span>
                </div>
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">⚡</span>
                  <span><strong>{t.attachModal.b2Title}:</strong> {t.attachModal.b2Desc}</span>
                </div>
                <div className="flex items-center gap-2 text-[#EDE9FA]">
                  <span className="text-[#E8B86B] text-xs">🔮</span>
                  <span><strong>{t.attachModal.b3Title}:</strong> {t.attachModal.b3Desc}</span>
                </div>
              </div>

              {/* iOS Manual Guide tip if triggered */}
              {showIosGuide && (
                <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-2.5 text-[11px] text-sky-200 space-y-1 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1 text-sky-300">
                    <span>💡</span> {t.attachModal.iosTitle}:
                  </div>
                  <p>
                    {t.attachModal.iosDesc}
                  </p>
                </div>
              )}

              {/* Success alert */}
              {attachSuccessMsg && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-200 space-y-1 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                    <span>✅</span> {t.attachModal.savedTitle}
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
                      {t.attachModal.attachingBtn}
                    </>
                  ) : (
                    t.attachModal.confirmBtn
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
                  {t.attachModal.laterBtn}
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
                {t.attachModal.closeBtn}
              </button>
            )}

            <p className="text-center text-[10px] text-[#7C75A3]">
              {t.attachModal.pwaNote}
            </p>
          </div>
        </div>
      )}

      {/* LOCKED TAB MODAL (When guest tries to access History, Profile, or Plans) */}
      {showTabLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#E8B86B]/40 bg-[#150F28] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2E2752]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E8B86B]/20 text-sm text-[#E8B86B]">
                  🔒
                </span>
                <span className="text-sm font-semibold text-[#EDE9FA]">
                  {t.lockedTab.lockedTitle(
                    lockedModalTab === "History"
                      ? t.tabs.history
                      : lockedModalTab === "Profile"
                      ? t.tabs.profile
                      : t.tabs.plans
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTabLockedModal(false)}
                className="text-[#A59FC8] hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8B86B]/15 text-2xl border border-[#E8B86B]/30 shadow-[0_0_20px_rgba(232,184,107,0.2)]">
                {lockedModalTab === "History" ? "📜" : lockedModalTab === "Profile" ? "👤" : "💎"}
              </div>
              <p className="text-xs text-[#A59FC8] leading-relaxed">
                {t.lockedTab.lockedDesc(
                  lockedModalTab === "History"
                    ? t.tabs.history
                    : lockedModalTab === "Profile"
                    ? t.tabs.profile
                    : t.tabs.plans
                )}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowTabLockedModal(false);
                  triggerGoogleSignIn();
                }}
                className={btn}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t.lockedTab.signInBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTabLockedModal(false)}
                className="w-full py-2.5 rounded-xl border border-[#3E346B] text-xs font-semibold text-[#A59FC8] hover:text-[#EDE9FA] transition-colors cursor-pointer"
              >
                {t.lockedTab.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-[#2E2752] bg-[#150F2B]/95 backdrop-blur-md px-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 z-40">
        {TABS.map(tabKey => {
          const isLocked = !isLoggedIn && tabKey !== "Home";
          const tabLabel =
            tabKey === "Home"
              ? t.tabs.home
              : tabKey === "History"
              ? t.tabs.history
              : tabKey === "Profile"
              ? t.tabs.profile
              : t.tabs.plans;
          return (
            <button
              key={tabKey}
              onClick={() => {
                if (isLocked) {
                  setLockedModalTab(tabKey);
                  setShowTabLockedModal(true);
                  return;
                }
                setTab(tabKey);
              }}
              className={
                "min-h-11 flex-1 text-xs font-medium cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 relative " +
                (tab === tabKey
                  ? "text-[#E8B86B] font-semibold"
                  : isLocked
                  ? "text-[#706899] hover:text-[#A59FC8]"
                  : "text-[#A59FC8] hover:text-[#EDE9FA]")
              }
              title={isLocked ? `${tabLabel} (${t.lockedTab.lockedBadge})` : tabLabel}
            >
              <div className="relative flex items-center justify-center">
                <span className={isLocked ? "opacity-60 scale-95" : ""}>
                  {tabKey === "Home" ? "🌟" : tabKey === "History" ? "📜" : tabKey === "Profile" ? "👤" : "💎"}
                </span>
                {isLocked && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px] leading-none bg-[#0D0A1C] border border-[#E8B86B]/40 text-[#E8B86B] rounded-full px-1 py-0.5 shadow-sm">
                    🔒
                  </span>
                )}
              </div>
              <span className={`flex items-center gap-0.5 ${isLocked ? "opacity-60" : ""}`}>
                <span>{tabLabel}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
