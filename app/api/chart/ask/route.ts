import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, name = "Querent", chart = {}, customApiKey, language = "en" } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const isHindi = language === "hi" || /[\u0900-\u097F]/.test(question);

    const apiKey = (
      customApiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.CHATGPT_API_KEY ||
      ""
    ).trim();

    let directAnswer = "";

    if (apiKey) {
      try {
        const planetsSummary = (chart?.planets || [])
          .map((p: any) => `${p.name} in ${p.sign} (House ${p.house})`)
          .join(", ");
        const ascSummary = chart?.asc || "Unknown";

        const systemLangInstruction = isHindi
          ? "CRITICAL: The user has selected Hindi language. You MUST write your entire response exclusively in clear, natural, and elegant Hindi (हिंदी script). Do not use English words."
          : "Respond in English.";

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.85,
            max_tokens: 350,
            messages: [
              {
                role: "system",
                content: `You are an insightful, authentic, and intuitive Vedic & Western astrologer.
The querent is asking a specific personal life question based on their birth chart.
Provide a clean, direct, and conclusive answer/prediction to their specific question (2 to 4 concise sentences).
- Address the question directly in the very first sentence. For example:
  - If they ask "when i get married", give a clear, encouraging astrological timeframe.
  - If they ask about career or jobs, give a direct timeframe and astrological context.
- Keep the tone warm, clear, decisive, and reassuring.
- Do NOT say "as an AI language model" or hedge with generic disclaimers. Speak with authentic astrological authority.
${systemLangInstruction}`,
              },
              {
                role: "user",
                content: `Querent Name: ${name}
Ascendant: ${ascSummary}
Planetary Placements: ${planetsSummary || "Classical Ephemeris"}
Querent's Question: "${question}"

Provide a clean, direct astrological answer to this question ${isHindi ? "in Hindi" : "in English"}:`,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          directAnswer = data?.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (e) {
        console.warn("OpenAI API call failed in Next.js route:", e);
      }
    }

    // Fallback if no API key or failed
    if (!directAnswer) {
      const q = question.toLowerCase();
      const isMarriage = /(marr|wedding|spouse|husband|wife|soulmate|partner|matrimon|शादी|विवाह|पति|पत्नी)/i.test(q);
      const isLove = isMarriage || /(love|dating|romance|crush|heart|relationship|bf|gf|boyfriend|girlfriend|प्यार|प्रेम|रिश्ता)/i.test(q);
      const isCareer = /(career|job|work|promotion|business|money|finance|wealth|salary|profession|boss|company|hire|invest|success|raise|नौकरी|करियर|व्यापार|व्यवसाय|धन|पैसा)/i.test(q);
      const isHealth = /(health|illness|disease|body|stress|energy|diet|sleep|vitality|healing|exhaust|स्वास्थ्य|तबीयत|बीमारी)/i.test(q);

      if (isMarriage) {
        if (isHindi) {
          const hindiMarriage = [
            `आपके 7वें भाव के शुभ प्रभाव और आगामी गुरु-शुक्र गोचर के अनुसार, 2027 के उत्तरार्ध से 2028 के मध्य तक ${name} के विवाह के अत्यंत प्रबल और मांगलिक योग बन रहे हैं।`,
            `ग्रह गोचर के अनुसार 2027 के शरद ऋतु से 2028 की ग्रीष्म ऋतु के मध्य विवाह का श्रेष्ठ समय रहेगा, जिसमें एक समझदार और समर्पित जीवनसाथी प्राप्त होगा।`,
            `आपके दांपत्य भाव में शुभ ग्रहों की स्थिति दर्शाती है कि 2026 के अंत से 2027 के मध्य तक विवाह से जुड़े निर्णय पक्के होंगे और दीर्घकालिक सुख प्राप्त होगा।`,
          ];
          directAnswer = hindiMarriage[Math.floor(Math.random() * hindiMarriage.length)];
        } else {
          const marriageOptions = [
            `Based on your 7th house alignments and upcoming Jupiter-Venus transit cycles, marriage prospects open auspiciously between late 2027 and mid-2028, marked by a deeply supportive and mutual soul connection for ${name}.`,
            `Your planetary transits highlight a high-probability marriage window between Autumn 2027 and Summer 2028, with favorable Venusian currents bringing long-term stability and marital harmony.`,
            `Cosmic configurations across your relationship axis indicate that marriage and life-partner commitments solidify between late 2026 and mid-2027, supported by grounding Saturn and expansive Jupiter placements.`,
          ];
          directAnswer = marriageOptions[Math.floor(Math.random() * marriageOptions.length)];
        }
      } else if (isLove) {
        directAnswer = isHindi
          ? `ग्रह स्थिति दर्शाती है कि अगले 4 से 8 महीनों में आपके जीवन में एक सुखद और आत्मीय प्रेम संबंध प्रगाढ़ होगा, जहाँ आपसी समझ और विश्वास बढ़ेगा।`
          : `Planetary alignments indicate an uplifting romantic chapter beginning over the next 4 to 8 months, where emotional reciprocity and authentic connection will flourish.`;
      } else if (isCareer) {
        directAnswer = isHindi
          ? `आपकी कुंडली के 10वें भाव की ऊर्जा दर्शाती है कि 2027 के आरंभ से मध्य के बीच ${name} के कार्यक्षेत्र में उल्लेखनीय उन्नति और आर्थिक लाभ के प्रबल योग हैं।`
          : `Your 10th house planetary momentum indicates a decisive career breakthrough and lucrative advancement between early and mid-2027 for ${name}.`;
      } else if (isHealth) {
        directAnswer = isHindi
          ? `आपकी सौर ऊर्जा अगले 3 से 5 महीनों में एक सकारात्मक और नई स्फूर्ति प्रदान करेगी, बशर्ते पर्याप्त विश्राम और नियमित दिनचर्या को प्राथमिकता दी जाए।`
          : `Your solar vitality charts a rejuvenating upward cycle starting within 3 to 5 months, provided mindful rest and restorative grounding practices are prioritized.`;
      } else {
        directAnswer = isHindi
          ? `ग्रहों की चाल दर्शाती है कि अगले 6 से 12 महीनों में परिस्थितियाँ ${name} के पक्ष में अनुकूल हो रही हैं, जिससे मनोवांछित फल और स्पष्ट प्रगति होगी।`
          : `Celestial configurations show favorable planetary currents aligning in your favor over the next 6 to 12 months, bringing clear resolution and fruitful progress for ${name}.`;
      }
    }

    const planets = chart?.planets || [];
    const sun = planets.find((p: any) => p.name === "Sun") || { name: "Sun", sign: "Aries", deg: 0, house: 1 };
    const moon = planets.find((p: any) => p.name === "Moon") || { name: "Moon", sign: "Taurus", deg: 0, house: 2 };
    const mercury = planets.find((p: any) => p.name === "Mercury") || { name: "Mercury", sign: "Gemini", deg: 0, house: 3 };
    const venus = planets.find((p: any) => p.name === "Venus") || { name: "Venus", sign: "Libra", deg: 0, house: 7 };
    const mars = planets.find((p: any) => p.name === "Mars") || { name: "Mars", sign: "Scorpio", deg: 0, house: 8 };
    const jupiter = planets.find((p: any) => p.name === "Jupiter") || { name: "Jupiter", sign: "Sagittarius", deg: 0, house: 9 };
    const saturn = planets.find((p: any) => p.name === "Saturn") || { name: "Saturn", sign: "Capricorn", deg: 0, house: 10 };
    const asc = chart?.asc || "Ascendant";

    const isLove = /(marr|love|wedding|spouse|husband|wife|dating|romance|partner|शादी|विवाह|प्रेम|प्यार)/i.test(question);
    const isCareer = /(career|job|work|promotion|business|money|finance|wealth|salary|नौकरी|करियर|व्यापार|व्यवसाय)/i.test(question);

    let keyPlacements = [];
    let baseSummary = "";
    let interpretation = "";
    let timing = "";
    let cosmicAdvice: string[] = [];

    if (isLove) {
      baseSummary = isHindi
        ? `प्रेम और दांपत्य के संदर्भ में आपकी कुंडली भावनात्मक आत्मीयता को दर्शाती है, जहाँ शुक्र और चंद्रमा का शुभ प्रभाव सकारात्मक सामंजस्य ला रहा है।`
        : `In matters of love and relationships, your chart emphasizes emotional authenticity, with Venus in ${venus.sign} and Moon in ${moon.sign} guiding meaningful harmony.`;
      interpretation = isHindi
        ? `लग्न में ${asc} और शुक्र की शुभ स्थिति के साथ, आपका वैवाहिक जीवन प्रेम और परस्पर सम्मान पर आधारित रहेगा।`
        : `With ${asc} rising and Venus placed in ${venus.sign} in House ${venus.house}, your romantic journey values heartfelt reciprocity and open-hearted communication.`;
      keyPlacements = isHindi ? [
        { planet: "शुक्र (Venus)", sign: venus.sign, house: venus.house, relevance: `भाव ${venus.house} में दांपत्य सुख, आकर्षण और मधुर संबंधों को बढ़ाता है।` },
        { planet: "गुरु (Jupiter)", sign: jupiter.sign, house: jupiter.house, relevance: `भाव ${jupiter.house} में मांगलिक कार्यों और वैवाहिक जीवन को दैवीय सुरक्षा प्रदान करता है।` },
        { planet: "चंद्रमा (Moon)", sign: moon.sign, house: moon.house, relevance: `मानसिक शांति और आंतरिक सुरक्षा को दृढ़ करता है।` },
      ] : [
        { planet: "Venus", sign: venus.sign, house: venus.house, relevance: `Fosters romantic magnetism and harmony in House ${venus.house}.` },
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Bestows blessing and expansive synchronicity for commitments in House ${jupiter.house}.` },
        { planet: "Moon", sign: moon.sign, house: moon.house, relevance: `Anchors inner emotional security in ${moon.sign}.` },
      ];
      timing = isHindi
        ? `शुक्र और देवगुरु बृहस्पति का गोचर शुभ समय और सुखद संवाद के नए अवसर निर्मित कर रहा है।`
        : `Favorable Venusian currents are opening windows for heart-centered conversations and deepening commitments.`;
      cosmicAdvice = isHindi ? [
        `अपनी भावनाओं को स्पष्ट और सकारात्मक ढंग से व्यक्त करें; स्पष्टता से विश्वास गहरा होता है।`,
        `परस्पर सम्मान बनाए रखें—एक संतुलित साझेदारी आपके मानसिक सुख को बढ़ाती है।`,
        `रिश्ते को स्वाभाविक गति से विकसित होने दें।`,
      ] : [
        `Express your feelings openly and directly; clarity invites reciprocated vulnerability.`,
        `Uphold personal boundaries—a healthy partnership amplifies your peace.`,
        `Allow new connections to evolve at an unhurried, natural tempo.`,
      ];
    } else if (isCareer) {
      baseSummary = isHindi
        ? `आपकी जन्म कुंडली कार्यक्षेत्र में मजबूत गति दर्शाती है, जहाँ गुरु की स्थिति ${name} के लिए व्यवसाय व पदोन्नति के मार्ग प्रशस्त कर रही है।`
        : `Your natal chart indicates strong professional momentum, with ${jupiter.name} in ${jupiter.sign} (House ${jupiter.house}) empowering upward career expansion for ${name}.`;
      interpretation = isHindi
        ? `आपके लग्न ${asc} और सूर्य के प्रभाव से आपकी नेतृत्व क्षमता और कार्य-योजना सफलता की ओर अग्रसर है।`
        : `With your Ascendant in ${asc} and your Sun radiating in ${sun.sign} in House ${sun.house}, your career blueprint thrives on clear vision.`;
      keyPlacements = isHindi ? [
        { planet: "गुरु (Jupiter)", sign: jupiter.sign, house: jupiter.house, relevance: `भाव ${jupiter.house} में करियर के नए अवसर, मान-सम्मान और मार्गदर्शन प्रदान करता है।` },
        { planet: "शनि (Saturn)", sign: saturn.sign, house: saturn.house, relevance: `भाव ${saturn.house} में धैर्य, परिश्रम और दीर्घकालिक स्थायित्व का फल देता है।` },
        { planet: "सूर्य (Sun)", sign: sun.sign, house: sun.house, relevance: `कार्यक्षेत्र में आपकी प्रतिष्ठा और प्रभाव को चमकाता है।` },
      ] : [
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Magnifies career opportunities and mentorship in House ${jupiter.house}.` },
        { planet: "Saturn", sign: saturn.sign, house: saturn.house, relevance: `Rewards patient craftsmanship and long-term stamina in House ${saturn.house}.` },
        { planet: "Sun", sign: sun.sign, house: sun.house, relevance: `Illuminates your executive presence in ${sun.sign}.` },
      ];
      timing = isHindi
        ? `ग्रह गोचर 2026-2027 के दौरान उच्च व्यावसायिक सफलता और प्रगति की संभावना दर्शाते हैं।`
        : `Cosmic currents show high-momentum expansion through 2026-2027.`;
      cosmicAdvice = isHindi ? [
        `अपनी ऊर्जा को प्रमुख लक्ष्यों पर केंद्रित रखें और व्यर्थ के भटकाव से बचें।`,
        `अनुभवी लोगों से संपर्क बनाएं; सकारात्मक सहयोग से आपकी प्रगति तेज होगी।`,
        `महत्वपूर्ण व्यावसायिक निर्णयों में अपनी अंतर्दृष्टि और विवेक पर भरोसा करें।`,
      ] : [
        `Focus your energy on high-leverage goals rather than spreading yourself too thin.`,
        `Cultivate strategic networks; your ${sun.sign} placement shines when collaborating.`,
        `Trust your intuitive radar during contract discussions and milestone transitions.`,
      ];
    } else {
      baseSummary = isHindi
        ? `आपकी जन्म कुंडली ${name} के जीवन में एक प्रेरक और स्पष्टता से भरे नए अध्याय के आरंभ का संकेत दे रही है।`
        : `Your natal chart indicates an inspiring chapter of personal alignment and cosmic clarity unfolding for ${name}.`;
      interpretation = isHindi
        ? `लग्न ${asc} से विश्लेषण करने पर आत्म-विश्वास और निर्णय क्षमता में स्पष्ट वृद्धि परिलक्षित होती है।`
        : `Examining your inquiry through your ${asc} Ascendant reveals a powerful awakening of self-trust. Mercury in ${mercury.sign} provides discernment, while Jupiter in ${jupiter.sign} offers cosmic protection.`;
      keyPlacements = isHindi ? [
        { planet: "सूर्य (Sun)", sign: sun.sign, house: sun.house, relevance: `आपकी मौलिक पहचान और आत्मबल को संबल प्रदान करता है।` },
        { planet: "गुरु (Jupiter)", sign: jupiter.sign, house: jupiter.house, relevance: `भाव ${jupiter.house} में ज्ञान, सुरक्षा और सौभाग्य का संचार करता है।` },
        { planet: "बुध (Mercury)", sign: mercury.sign, house: mercury.house, relevance: `विश्लेषणात्मक स्पष्टता और विवेक को तीव्र करता है।` },
      ] : [
        { planet: "Sun", sign: sun.sign, house: sun.house, relevance: `Anchors your essential identity in ${sun.sign}.` },
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Bestows expansive wisdom in House ${jupiter.house}.` },
        { planet: "Mercury", sign: mercury.sign, house: mercury.house, relevance: `Sharpens analytical clarity in ${mercury.sign}.` },
      ];
      timing = isHindi
        ? `ग्रह आपके अनुकूल परिणाम देने की दिशा में अग्रसर हैं। समय पर भरोसा रखें।`
        : `Planetary transits are aligning in your favor. Trust the unfolding timing.`;
      cosmicAdvice = isHindi ? [
        `आत्मविश्वास के साथ आगे बढ़ें; जो आपके लिए श्रेष्ठ है वह आपको अवश्य मिलेगा।`,
        `अपनी आंतरिक प्रेरणाओं पर ध्यान दें, उनमें व्यवहारिक मार्गदर्शन छिपा है।`,
        `अपने पूर्व अनुभवों को इस नए चरण की मजबूत नींव समझें।`,
      ] : [
        `Lead with authentic conviction; what is meant for you will not pass you by.`,
        `Note down your intuitive impressions; they hold practical wisdom.`,
        `Acknowledge your past growth as the steady foundation for this next phase.`,
      ];
    }

    return NextResponse.json({
      success: true,
      answer: {
        aiAnswer: directAnswer,
        summary: directAnswer ? `${directAnswer} ${baseSummary}` : baseSummary,
        interpretation,
        keyPlacements,
        cosmicAdvice,
        timing,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process question" }, { status: 500 });
  }
}
