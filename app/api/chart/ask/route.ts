import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, name = "Querent", chart = {}, customApiKey } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

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

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.85,
            max_tokens: 300,
            messages: [
              {
                role: "system",
                content: `You are an insightful, authentic, and intuitive Vedic & Western astrologer.
The querent is asking a specific personal life question based on their birth chart.
Provide a clean, direct, and conclusive answer/prediction to their specific question (2 to 4 concise sentences).
- Address the question directly in the very first sentence. For example:
  - If they ask "when i get married", give a clear, encouraging astrological timeframe (e.g. "Based on your 7th house configurations and upcoming Jupiter transits, marriage is indicated between late 2027 and mid-2028, marked by a deep soul connection.")
  - If they ask about career or jobs, give a direct timeframe and astrological context.
- Keep the tone warm, clear, decisive, and reassuring.
- Do NOT say "as an AI language model" or hedge with generic disclaimers. Speak with authentic astrological authority.`,
              },
              {
                role: "user",
                content: `Querent Name: ${name}
Ascendant: ${ascSummary}
Planetary Placements: ${planetsSummary || "Classical Ephemeris"}
Querent's Question: "${question}"

Provide a clean, direct astrological answer to this question:`,
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
      const isMarriage = /(marr|wedding|spouse|husband|wife|soulmate|partner|matrimon)/i.test(q);
      const isLove = /(love|dating|romance|crush|heart|relationship|bf|gf|boyfriend|girlfriend)/i.test(q);
      const isCareer = /(career|job|work|promotion|business|money|finance|wealth|salary|profession|boss|company|hire|invest|success|raise)/i.test(q);
      const isHealth = /(health|illness|disease|body|stress|energy|diet|sleep|vitality|healing|exhaust)/i.test(q);

      if (isMarriage) {
        const marriageOptions = [
          `Based on your 7th house alignments and upcoming Jupiter-Venus transit cycles, marriage prospects open auspiciously between late 2027 and mid-2028, marked by a deeply supportive and mutual soul connection for ${name}.`,
          `Your planetary transits highlight a high-probability marriage window between Autumn 2027 and Summer 2028, with favorable Venusian currents bringing long-term stability and marital harmony.`,
          `Cosmic configurations across your relationship axis indicate that marriage and life-partner commitments solidify between late 2026 and mid-2027, supported by grounding Saturn and expansive Jupiter placements.`,
        ];
        directAnswer = marriageOptions[Math.floor(Math.random() * marriageOptions.length)];
      } else if (isLove) {
        directAnswer = `Planetary alignments indicate an uplifting romantic chapter beginning over the next 4 to 8 months, where emotional reciprocity and authentic connection will flourish.`;
      } else if (isCareer) {
        directAnswer = `Your 10th house planetary momentum indicates a decisive career breakthrough and lucrative advancement between early and mid-2027 for ${name}.`;
      } else if (isHealth) {
        directAnswer = `Your solar vitality charts a rejuvenating upward cycle starting within 3 to 5 months, provided mindful rest and restorative grounding practices are prioritized.`;
      } else {
        directAnswer = `Celestial configurations show favorable planetary currents aligning in your favor over the next 6 to 12 months, bringing clear resolution and fruitful progress for ${name}.`;
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

    const isLove = /(marr|love|wedding|spouse|husband|wife|dating|romance|partner)/i.test(question);
    const isCareer = /(career|job|work|promotion|business|money|finance|wealth|salary)/i.test(question);

    let keyPlacements = [];
    let baseSummary = "";
    let interpretation = "";
    let timing = "";
    let cosmicAdvice: string[] = [];

    if (isLove) {
      baseSummary = `In matters of love and relationships, your chart emphasizes emotional authenticity, with Venus in ${venus.sign} and Moon in ${moon.sign} guiding meaningful harmony.`;
      interpretation = `With ${asc} rising and Venus placed in ${venus.sign} in House ${venus.house}, your romantic journey values heartfelt reciprocity and open-hearted communication.`;
      keyPlacements = [
        { planet: "Venus", sign: venus.sign, house: venus.house, relevance: `Fosters romantic magnetism and harmony in House ${venus.house}.` },
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Bestows blessing and expansive synchronicity for commitments in House ${jupiter.house}.` },
        { planet: "Moon", sign: moon.sign, house: moon.house, relevance: `Anchors inner emotional security in ${moon.sign}.` },
      ];
      timing = `Favorable Venusian currents are opening windows for heart-centered conversations and deepening commitments.`;
      cosmicAdvice = [
        `Express your feelings openly and directly; clarity invites reciprocated vulnerability.`,
        `Uphold personal boundaries—a healthy partnership amplifies your peace.`,
        `Allow new connections to evolve at an unhurried, natural tempo.`,
      ];
    } else if (isCareer) {
      baseSummary = `Your natal chart indicates strong professional momentum, with ${jupiter.name} in ${jupiter.sign} (House ${jupiter.house}) empowering upward career expansion for ${name}.`;
      interpretation = `With your Ascendant in ${asc} and your Sun radiating in ${sun.sign} in House ${sun.house}, your career blueprint thrives on clear vision.`;
      keyPlacements = [
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Magnifies career opportunities and mentorship in House ${jupiter.house}.` },
        { planet: "Saturn", sign: saturn.sign, house: saturn.house, relevance: `Rewards patient craftsmanship and long-term stamina in House ${saturn.house}.` },
        { planet: "Sun", sign: sun.sign, house: sun.house, relevance: `Illuminates your executive presence in ${sun.sign}.` },
      ];
      timing = `Cosmic currents show high-momentum expansion through 2026-2027.`;
      cosmicAdvice = [
        `Focus your energy on high-leverage goals rather than spreading yourself too thin.`,
        `Cultivate strategic networks; your ${sun.sign} placement shines when collaborating.`,
        `Trust your intuitive radar during contract discussions and milestone transitions.`,
      ];
    } else {
      baseSummary = `Your natal chart indicates an inspiring chapter of personal alignment and cosmic clarity unfolding for ${name}.`;
      interpretation = `Examining your inquiry through your ${asc} Ascendant reveals a powerful awakening of self-trust. Mercury in ${mercury.sign} provides discernment, while Jupiter in ${jupiter.sign} offers cosmic protection.`;
      keyPlacements = [
        { planet: "Sun", sign: sun.sign, house: sun.house, relevance: `Anchors your essential identity in ${sun.sign}.` },
        { planet: "Jupiter", sign: jupiter.sign, house: jupiter.house, relevance: `Bestows expansive wisdom in House ${jupiter.house}.` },
        { planet: "Mercury", sign: mercury.sign, house: mercury.house, relevance: `Sharpens analytical clarity in ${mercury.sign}.` },
      ];
      timing = `Planetary transits are aligning in your favor. Trust the unfolding timing.`;
      cosmicAdvice = [
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
