export type Language = "en" | "hi";

export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  heroTitle: string;
  heroSubtitle: string;
  tabs: {
    home: string;
    history: string;
    profile: string;
    plans: string;
  };
  steps: {
    stepOf: (cur: number, total: number) => string;
    back: string;
    continue: string;
    name: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      placeholder: string;
      btn: string;
    };
    email: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      placeholder: string;
      btn: string;
      skip: string;
    };
    photo: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      capture: string;
      retake: string;
      upload: string;
      flip: string;
      skip: string;
      cameraError: string;
    };
    dob: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      fieldLabel: string;
      sunSign: string;
      btn: string;
    };
    tob: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      fieldLabel: string;
      noonHint: string;
      selected: string;
      btn: string;
    };
    pob: {
      label: string;
      badge: string;
      title: string;
      desc: string;
      fieldLabel: string;
      placeholder: string;
      born: string;
      portrait: string;
      summaryTitle: string;
      agreePrivacy: string;
      privacyPolicy: string;
      terms: string;
      and: string;
      agreeConsent: string;
      calcBtn: string;
      calculatingBtn: string;
    };
  };
  ask: {
    chartReady: string;
    newChart: string;
    born: string;
    title: string;
    subtitle: string;
    placeholder: string;
    subRequired: string;
    subRequiredDesc: string;
    viewPlans: string;
    analyzeBtn: string;
    analyzePlansBtn: string;
    consulting: string;
  };
  reading: {
    title: string;
    calcFor: string;
    yourQuestion: string;
    directAnswer: string;
    aiPrediction: string;
    synthesis: string;
    keyPlacements: string;
    house: string;
    timing: string;
    advice: string;
    attachBannerPrompt: string;
    attachBannerDone: string;
    attachBtn: string;
    viewDetailsBtn: string;
    ephemerisNote: string;
    askAnother: string;
  };
  locked: {
    title: string;
    desc: string;
    btn: string;
  };
  report: {
    title: string;
    newChart: string;
    calcAnother: string;
  };
  history: {
    title: string;
    empty: string;
    locked: string;
  };
  profile: {
    title: string;
    guest: string;
    noEmail: string;
    googleAuth: string;
    subPlan: string;
    premiumActive: string;
    freeExplorer: string;
    dob: string;
    tob: string;
    birthCity: string;
    serverConn: string;
    backendUrl: string;
    apiStatus: string;
    online: string;
    offline: string;
    chatgptTitle: string;
    customKeyActive: string;
    serverEnvDefault: string;
    chatgptDesc: string;
    chatgptKeyLabel: string;
    save: string;
    keyEnvHint: string;
    autoLoginTitle: string;
    sessionActive: string;
    guestSession: string;
    autoLoginDescActive: string;
    autoLoginDescGuest: string;
    signOut: string;
    editDetails: string;
    privacyPolicy: string;
    terms: string;
  };
  plans: {
    title: string;
    tag: string;
    desc: string;
    activeMembership: string;
    activeMembershipDesc: string;
    gatewayNote: string;
    cancelNote: string;
    phoneLabel: string;
    phoneReq: string;
    phoneDesc: string;
    subscribeBtn: string;
    popularBadge: string;
    currentBadge: string;
    perMonth: string;
    billedMonthly: string;
    billedThreeMonth: string;
  };
  attachModal: {
    title: string;
    subtitle: string;
    prompt: string;
    desc: string;
    b1Title: string;
    b1Desc: string;
    b2Title: string;
    b2Desc: string;
    b3Title: string;
    b3Desc: string;
    iosTitle: string;
    iosDesc: string;
    savedTitle: string;
    confirmBtn: string;
    attachingBtn: string;
    laterBtn: string;
    closeBtn: string;
    pwaNote: string;
  };
  upiModal: {
    title: string;
    secureTag: string;
    merchant: string;
    plan: string;
    amount: string;
    frequency: string;
    every3Months: string;
    monthly: string;
    subId: string;
    selectApp: string;
    authBtn: (amt: number) => string;
    authorizing: string;
    cancel: string;
    securityNote: string;
  };
  zodiacs: Record<string, string>;
  planets: Record<string, string>;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: "Astrology App",
    appSubtitle: "Astro Reports",
    heroTitle: "Astrology App",
    heroSubtitle: "We combine both birth chart analysis and face reading to predict your future. Shall we begin?",
    tabs: {
      home: "Home",
      history: "History",
      profile: "Profile",
      plans: "Plans",
    },
    steps: {
      stepOf: (cur, total) => `Step ${cur} of ${total}`,
      back: "← Back",
      continue: "Continue →",
      name: {
        label: "Name",
        badge: "Personal Identity",
        title: "What's your full name?",
        desc: "We'll customize your celestial readings and birth chart reports with your name.",
        placeholder: "e.g. Rakesh Krishnan",
        btn: "Next Step →",
      },
      email: {
        label: "Email",
        badge: "Celestial Account",
        title: "What's your email address?",
        desc: "Used to safely save your charts, subscription, and predictions.",
        placeholder: "you@example.com",
        btn: "Continue →",
        skip: "Skip email for now",
      },
      photo: {
        label: "Photo",
        badge: "Face & Aura Reading",
        title: "Capture or upload your photo",
        desc: "Combines Vedic physiognomy (Mukha Samudrika) with planetary placements for enhanced precision.",
        capture: "Take Photo",
        retake: "Retake Photo",
        upload: "Upload file instead",
        flip: "Flip Camera",
        skip: "Skip photo for now",
        cameraError: "Camera permission denied or not available.",
      },
      dob: {
        label: "Birth Date",
        badge: "Solar Alignment",
        title: "When were you born?",
        desc: "Your date of birth pinpoints the Sun's degree along the zodiac belt.",
        fieldLabel: "Date of birth",
        sunSign: "Calculated Sun Sign",
        btn: "Continue →",
      },
      tob: {
        label: "Birth Time",
        badge: "Ascendant Precision",
        title: "What time were you born?",
        desc: "Crucial for calculating your Rising Sign (Ascendant) and accurate astrological houses.",
        fieldLabel: "Time of birth (24h or AM/PM)",
        noonHint: "Don't know exact time? Use 12:00 PM (Noon)",
        selected: "Selected:",
        btn: "Continue →",
      },
      pob: {
        label: "Birth Place",
        badge: "Earth Coordinates",
        title: "Where were you born?",
        desc: "Latitude and longitude establish exact planetary coordinates.",
        fieldLabel: "Birth City or Town",
        placeholder: "Type city (e.g. Mumbai, Delhi, Paris, New York)",
        born: "Born:",
        portrait: "Portrait:",
        summaryTitle: "Birth Details Summary",
        agreePrivacy: "I agree to the ",
        privacyPolicy: "Privacy Policy",
        terms: "Terms & Conditions",
        and: " and ",
        agreeConsent: ", and consent to calculating astrological charts from these details.",
        calcBtn: "Calculate Birth Chart ✨",
        calculatingBtn: "Calculating Chart…",
      },
    },
    ask: {
      chartReady: "Birth Chart Ready",
      newChart: "+ New Chart",
      born: "Born:",
      title: "Ask your question",
      subtitle: "What insights, career directions, or relationship alignments would you like to explore?",
      placeholder: "e.g. What does my natal chart say about career growth in 2026?",
      subRequired: "Subscription required:",
      subRequiredDesc: "A membership plan is needed to view answers.",
      viewPlans: "View Plans →",
      analyzeBtn: "Analyze Chart & Question →",
      analyzePlansBtn: "Analyze Chart & Question (View Plans) →",
      consulting: "Consulting the Stars…",
    },
    reading: {
      title: "Astrological Reading",
      calcFor: "Calculated for",
      yourQuestion: "Your Question:",
      directAnswer: "Direct Celestial Answer",
      aiPrediction: "AI Astrological Prediction",
      synthesis: "Cosmic Synthesis",
      keyPlacements: "Key Planetary Placements For Your Query",
      house: "House",
      timing: "Favorable Cycles & Timing",
      advice: "Celestial Guidance & Takeaways",
      attachBannerPrompt: "Want faster 1-tap answers?",
      attachBannerDone: "Astro Reports is attached to your screen",
      attachBtn: "Attach App →",
      viewDetailsBtn: "View Details",
      ephemerisNote: "High-precision planetary ephemeris analysis",
      askAnother: "Ask another question ↑",
    },
    locked: {
      title: "Your Report is Ready",
      desc: "Your full planetary positions, houses, and aspect calculations are complete. Subscribe to unlock unlimited reports.",
      btn: "View Subscription Plans",
    },
    report: {
      title: "Your Report",
      newChart: "+ New Chart",
      calcAnother: "Calculate Another Report",
    },
    history: {
      title: "History",
      empty: "No reports generated yet.",
      locked: "Locked · Subscribe to view",
    },
    profile: {
      title: "Profile",
      guest: "Guest Querent",
      noEmail: "No email provided",
      googleAuth: "✓ Google Authenticated",
      subPlan: "Subscription Plan:",
      premiumActive: "Premium Active (Demo)",
      freeExplorer: "Free Explorer",
      dob: "Date of Birth:",
      tob: "Time of Birth:",
      birthCity: "Birth City:",
      serverConn: "Server Connection",
      backendUrl: "Backend URL:",
      apiStatus: "API Status:",
      online: "Online (Express)",
      offline: "Offline",
      chatgptTitle: "ChatGPT AI Integration",
      customKeyActive: "Custom Key Active",
      serverEnvDefault: "Server Env Default",
      chatgptDesc: "Empowers every query with direct predictions and clean astrological answers to your specific questions.",
      chatgptKeyLabel: "OpenAI / ChatGPT API Key:",
      save: "Save",
      keyEnvHint: "Key can also be defined in .env as OPENAI_API_KEY.",
      autoLoginTitle: "30-Day Auto Login",
      sessionActive: "Session Active (1 Month)",
      guestSession: "Guest Session",
      autoLoginDescActive: "Your session is preserved for 30 days in localStorage. When you launch the app, you will land directly on the Chat screen.",
      autoLoginDescGuest: "Sign in with Google or enter your details once; your token will keep you logged in for 1 month.",
      signOut: "Sign Out / Reset Session",
      editDetails: "Edit Birth Details",
      privacyPolicy: "Privacy Policy",
      terms: "Terms & Conditions",
    },
    plans: {
      title: "Membership Plans",
      tag: "⚡ UPI AutoPay",
      desc: "Continuous planetary guidance powered by Razorpay UPI AutoPay & Secure Payments.",
      activeMembership: "Active AutoPay Membership",
      activeMembershipDesc: "Your cosmic membership is unlocked. Planetary transits, houses, and unlimited astrological query analyses are active.",
      gatewayNote: "Payment Gateway: Razorpay Live NPCI",
      cancelNote: "Manage or cancel anytime in your UPI / Banking App",
      phoneLabel: "UPI Linked Mobile Number",
      phoneReq: "Required for UPI mandate",
      phoneDesc: "Your UPI app (GPay / PhonePe / Paytm / BHIM) or card provider will verify the payment on this number.",
      subscribeBtn: "Subscribe Now",
      popularBadge: "Most Popular",
      currentBadge: "Current Plan",
      perMonth: "/ Month",
      billedMonthly: "Billed Monthly",
      billedThreeMonth: "Billed Every 3 Months",
    },
    attachModal: {
      title: "Attach to Home Screen",
      subtitle: "1-Tap Fast Astrological Access",
      prompt: "Are you interested in attaching this app to your home screen?",
      desc: "Attach Astro Reports to your home screen for instant 1-tap astrological guidance, planetary transit alerts, and future answers.",
      b1Title: "1-Tap Launch:",
      b1Desc: "open instantly from your home screen",
      b2Title: "Faster Answers:",
      b2Desc: "ask questions without opening browser",
      b3Title: "Planetary Transit Alerts:",
      b3Desc: "track auspicious celestial timings",
      iosTitle: "For iPhone / iPad Users:",
      iosDesc: 'Tap the Share button (⎋) in your Safari toolbar below, then scroll down and tap "Add to Home Screen" (➕).',
      savedTitle: "Screen Attachment Saved",
      confirmBtn: "✨ Yes, Attach to Home Screen",
      attachingBtn: "Attaching to Home Screen...",
      laterBtn: "No, Maybe Later",
      closeBtn: "Close & View Astrological Reading →",
      pwaNote: "Safe & fast PWA technology. Automatically logged in Admin Dashboard.",
    },
    upiModal: {
      title: "NPCI UPI AutoPay Authorization",
      secureTag: "🔒 256-bit Secure",
      merchant: "Merchant:",
      plan: "Plan:",
      amount: "Mandate Amount:",
      frequency: "Debit Frequency:",
      every3Months: "Every 3 Months",
      monthly: "Monthly",
      subId: "Sub ID:",
      selectApp: "Select Your UPI App:",
      authBtn: (amt) => `Authorize AutoPay Mandate (₹${amt}) ✓`,
      authorizing: "Authorizing Mandate...",
      cancel: "Cancel",
      securityNote: "🔒 256-bit Bank Grade Security. Mandate registration is processed via NPCI UPI AutoPay. Cancel anytime from your UPI App.",
    },
    zodiacs: {
      Aries: "Aries",
      Taurus: "Taurus",
      Gemini: "Gemini",
      Cancer: "Cancer",
      Leo: "Leo",
      Virgo: "Virgo",
      Libra: "Libra",
      Scorpio: "Scorpio",
      Sagittarius: "Sagittarius",
      Capricorn: "Capricorn",
      Aquarius: "Aquarius",
      Pisces: "Pisces",
    },
    planets: {
      Sun: "Sun",
      Moon: "Moon",
      Mars: "Mars",
      Mercury: "Mercury",
      Jupiter: "Jupiter",
      Venus: "Venus",
      Saturn: "Saturn",
      Ascendant: "Ascendant",
    },
  },

  hi: {
    appName: "ज्योतिष ऐप",
    appSubtitle: "एस्ट्रो रिपोर्ट्स",
    heroTitle: "ज्योतिष ऐप",
    heroSubtitle: "हम आपका भविष्य बताने के लिए जन्म कुंडली और चेहरा पढ़ने की विद्या दोनों का एक साथ उपयोग करते हैं। क्या हम शुरू करें?",
    tabs: {
      home: "होम",
      history: "इतिहास",
      profile: "प्रोफ़ाइल",
      plans: "प्लान्स",
    },
    steps: {
      stepOf: (cur, total) => `चरण ${cur} / ${total}`,
      back: "← वापस",
      continue: "आगे बढ़ें →",
      name: {
        label: "नाम",
        badge: "व्यक्तिगत पहचान",
        title: "आपका पूरा नाम क्या है?",
        desc: "हम आपके नाम के अनुसार आपकी जन्म कुंडली और भविष्यवाणियां तैयार करेंगे।",
        placeholder: "उदा. राकेश कृष्णन",
        btn: "अगला चरण →",
      },
      email: {
        label: "ईमेल",
        badge: "खगोलीय खाता",
        title: "आपका ईमेल पता क्या है?",
        desc: "आपकी जन्म कुंडली, सदस्यता और भविष्यवाणियों को सुरक्षित रखने के लिए आवश्यक है।",
        placeholder: "you@example.com",
        btn: "आगे बढ़ें →",
        skip: "ईमेल अभी छोड़ें",
      },
      photo: {
        label: "फोटो",
        badge: "मुख एवं आभामंडल पठन",
        title: "अपनी फोटो लें या अपलोड करें",
        desc: "अति-सटीक फलादेश के लिए वैदिक मुख सामुद्रिक शास्त्र और ग्रह स्थिति का समन्वय करता है।",
        capture: "फोटो खींचें",
        retake: "दोबारा फोटो लें",
        upload: "फाइल अपलोड करें",
        flip: "कैमरा बदलें",
        skip: "फोटो अभी छोड़ें",
        cameraError: "कैमरा अनुमति अस्वीकृत या अनुपलब्ध है।",
      },
      dob: {
        label: "जन्म तिथि",
        badge: "सौर स्थिति",
        title: "आपका जन्म कब हुआ था?",
        desc: "आपकी जन्म तिथि राशि चक्र में सूर्य की सटीक स्थिति निर्धारित करती है।",
        fieldLabel: "जन्म तिथि",
        sunSign: "आपकी सूर्य राशि",
        btn: "आगे बढ़ें →",
      },
      tob: {
        label: "जन्म समय",
        badge: "लग्न परिशुद्धता",
        title: "आपका जन्म किस समय हुआ था?",
        desc: "आपके लग्न (राइजिंग साइन) और सटीक 12 भावों की गणना के लिए अनिवार्य।",
        fieldLabel: "जन्म समय (24 घंटे या AM/PM)",
        noonHint: "सटीक समय नहीं पता? दोपहर 12:00 का उपयोग करें",
        selected: "चयनित समय:",
        btn: "आगे बढ़ें →",
      },
      pob: {
        label: "जन्म स्थान",
        badge: "स्थान निर्देशांक",
        title: "आपका जन्म कहाँ हुआ था?",
        desc: "अक्षांश और देशांतर से ग्रहों की सटीक खगोलीय स्थिति निर्धारित होती है।",
        fieldLabel: "जन्म स्थान / शहर",
        placeholder: "शहर का नाम लिखें (जैसे मुंबई, दिल्ली, पेरिस...)",
        born: "जन्म:",
        portrait: "फोटो:",
        summaryTitle: "जन्म विवरण सारांश",
        agreePrivacy: "मैं ",
        privacyPolicy: "गोपनीयता नीति",
        terms: "नियम और शर्तें",
        and: " व ",
        agreeConsent: " से सहमत हूँ और इन विवरणों से जन्म कुंडली गणना की स्वीकृति देता हूँ।",
        calcBtn: "जन्म कुंडली बनाएं ✨",
        calculatingBtn: "कुंडली तैयार हो रही है…",
      },
    },
    ask: {
      chartReady: "जन्म कुंडली तैयार",
      newChart: "+ नई कुंडली",
      born: "जन्म:",
      title: "अपना प्रश्न पूछें",
      subtitle: "आप अपने करियर, रिश्ते, विवाह या जीवन के बारे में क्या जानना चाहते हैं?",
      placeholder: "उदा. मेरी शादी कब होगी? या 2026 में मेरा करियर कैसा रहेगा?",
      subRequired: "सदस्यता आवश्यक:",
      subRequiredDesc: "उत्तर देखने के लिए एक सदस्यता प्लान आवश्यक है।",
      viewPlans: "प्लान देखें →",
      analyzeBtn: "कुंडली और प्रश्न का विश्लेषण करें →",
      analyzePlansBtn: "कुंडली और प्रश्न का विश्लेषण करें (प्लान देखें) →",
      consulting: "ग्रहों और सितारों का विश्लेषण हो रहा है…",
    },
    reading: {
      title: "ज्योतिषीय फलादेश",
      calcFor: "के लिए विश्लेषित",
      yourQuestion: "आपका प्रश्न:",
      directAnswer: "प्रत्यक्ष आकाशीय उत्तर",
      aiPrediction: "एआई ज्योतिषीय भविष्यवाणी",
      synthesis: "सार और विश्लेषण",
      keyPlacements: "आपके प्रश्न के मुख्य ग्रह योग",
      house: "भाव",
      timing: "शुभ समय और दशा काल",
      advice: "दैवीय मार्गदर्शन और उपाय",
      attachBannerPrompt: "तेज़ 1-टैप उत्तर चाहते हैं?",
      attachBannerDone: "एस्ट्रो रिपोर्ट्स आपकी स्क्रीन पर जुड़ा हुआ है",
      attachBtn: "ऐप जोड़ें →",
      viewDetailsBtn: "विवरण देखें",
      ephemerisNote: "सटीक खगोलीय ग्रह स्थिति पर आधारित विश्लेषण",
      askAnother: "दूसरा प्रश्न पूछें ↑",
    },
    locked: {
      title: "आपकी रिपोर्ट तैयार है",
      desc: "आपकी पूर्ण ग्रह स्थिति, भाव और दृष्टि की गणना पूरी हो गई है। असीमित रिपोर्ट के लिए सब्सक्राइब करें।",
      btn: "सदस्यता प्लान देखें",
    },
    report: {
      title: "आपकी रिपोर्ट",
      newChart: "+ नई कुंडली",
      calcAnother: "अन्य रिपोर्ट तैयार करें",
    },
    history: {
      title: "इतिहास",
      empty: "अभी तक कोई रिपोर्ट नहीं बनाई गई है।",
      locked: "लॉक्ड · देखने के लिए सब्सक्राइब करें",
    },
    profile: {
      title: "प्रोफ़ाइल",
      guest: "अतिथि प्रयोक्ता",
      noEmail: "कोई ईमेल दर्ज नहीं है",
      googleAuth: "✓ गूगल प्रमाणित",
      subPlan: "सदस्यता प्लान:",
      premiumActive: "प्रीमियम सक्रिय (डेमो)",
      freeExplorer: "निःशुल्क अन्वेषक",
      dob: "जन्म तिथि:",
      tob: "जन्म समय:",
      birthCity: "जन्म स्थान:",
      serverConn: "सर्वर कनेक्शन",
      backendUrl: "बैकएंड यूआरएल:",
      apiStatus: "एपीआई स्थिति:",
      online: "ऑनलाइन (Express)",
      offline: "ऑफलाइन",
      chatgptTitle: "चैटजीपीटी एआई एकीकरण",
      customKeyActive: "कस्टम की सक्रिय",
      serverEnvDefault: "डिफ़ॉल्ट सर्वर की",
      chatgptDesc: "आपके विशिष्ट प्रश्नों के सटीक ज्योतिषीय उत्तर और भविष्यवाणियां प्रदान करता है।",
      chatgptKeyLabel: "ओपनएआई / चैटजीपीटी एपीआई की:",
      save: "सहेजें",
      keyEnvHint: "एपीआई की को सर्वर .env में OPENAI_API_KEY के रूप में भी सेट किया जा सकता है।",
      autoLoginTitle: "30-दिवसीय ऑटो लॉगिन",
      sessionActive: "सत्र सक्रिय (1 माह)",
      guestSession: "अतिथि सत्र",
      autoLoginDescActive: "आपका सत्र 30 दिनों के लिए सुरक्षित है। ऐप खोलने पर आप सीधे चैट स्क्रीन पर पहुंचेंगे।",
      autoLoginDescGuest: "एक बार गूगल से लॉगिन करें या विवरण भरें; आपका टोकन आपको 1 महीने तक लॉगिन रखेगा।",
      signOut: "साइन आउट / सत्र रीसेट करें",
      editDetails: "जन्म विवरण संपादित करें",
      privacyPolicy: "गोपनीयता नीति",
      terms: "नियम और शर्तें",
    },
    plans: {
      title: "सदस्यता प्लान",
      tag: "⚡ यूपीआई ऑटोपे",
      desc: "रेज़रपे यूपीआई ऑटोपे और सुरक्षित भुगतान द्वारा निरंतर आकाशीय मार्गदर्शन।",
      activeMembership: "सक्रिय ऑटोपे सदस्यता",
      activeMembershipDesc: "आपकी सदस्यता सक्रिय है। ग्रह गोचर, 12 भाव और असीमित ज्योतिषीय प्रश्न विश्लेषण चालू हैं।",
      gatewayNote: "पेमेंट गेटवे: रेज़रपे लाइव एनपीसीआई",
      cancelNote: "अपने यूपीआई / बैंकिंग ऐप में कभी भी प्रबंधित या रद्द करें",
      phoneLabel: "यूपीआई लिंक्ड मोबाइल नंबर",
      phoneReq: "यूपीआई मैंडेट के लिए आवश्यक",
      phoneDesc: "आपका यूपीआई ऐप (GPay / PhonePe / Paytm / BHIM) या बैंक इस नंबर पर भुगतान सत्यापित करेगा।",
      subscribeBtn: "अभी सब्सक्राइब करें",
      popularBadge: "सर्वाधिक लोकप्रिय",
      currentBadge: "वर्तमान प्लान",
      perMonth: "/ माह",
      billedMonthly: "प्रति माह बिल",
      billedThreeMonth: "हर 3 महीने में बिल",
    },
    attachModal: {
      title: "होम स्क्रीन पर जोड़ें",
      subtitle: "1-टैप त्वरित ज्योतिषीय पहुंच",
      prompt: "क्या आप इस ऐप को अपनी होम स्क्रीन पर जोड़ना चाहते हैं?",
      desc: "त्वरित ज्योतिषीय मार्गदर्शन, ग्रह गोचर अलर्ट और भविष्य के उत्तरों के लिए एस्ट्रो रिपोर्ट्स को अपनी होम स्क्रीन पर जोड़ें।",
      b1Title: "1-टैप लॉन्च:",
      b1Desc: "अपनी होम स्क्रीन से तुरंत खोलें",
      b2Title: "तेज़ उत्तर:",
      b2Desc: "ब्राउज़र खोले बिना सीधे प्रश्न पूछें",
      b3Title: "ग्रह गोचर अलर्ट:",
      b3Desc: "शुभ समय और मुहूर्तों पर नज़र रखें",
      iosTitle: "आईफोन / आईपैड उपयोगकर्ताओं के लिए:",
      iosDesc: 'नीचे सफारी टूलबार में शेयर बटन (⎋) दबाएं, फिर नीचे स्क्रॉल करके "होम स्क्रीन पर जोड़ें" (➕) चुनें।',
      savedTitle: "स्क्रीन अटैचमेंट सुरक्षित हुआ",
      confirmBtn: "✨ हाँ, होम स्क्रीन पर जोड़ें",
      attachingBtn: "होम स्क्रीन पर जोड़ा जा रहा है...",
      laterBtn: "नहीं, बाद में",
      closeBtn: "बंद करें और फलादेश देखें →",
      pwaNote: "सुरक्षित और तेज़ पीडबल्यूए तकनीक। एडमिन डैशबोर्ड में स्वतः लॉग इन।",
    },
    upiModal: {
      title: "एनपीसीआई यूपीआई ऑटोपे प्रमाणीकरण",
      secureTag: "🔒 256-बिट सुरक्षित",
      merchant: "मर्चेंट:",
      plan: "प्लान:",
      amount: "मैंडेट राशि:",
      frequency: "डेबिट आवृत्ति:",
      every3Months: "प्रत्येक 3 माह में",
      monthly: "मासिक",
      subId: "सब्सक्रिप्शन आईडी:",
      selectApp: "अपना यूपीआई ऐप चुनें:",
      authBtn: (amt) => `ऑटोपे मैंडेट अधिकृत करें (₹${amt}) ✓`,
      authorizing: "मैंडेट अधिकृत हो रहा है...",
      cancel: "रद्द करें",
      securityNote: "🔒 256-बिट बैंक स्तरीय सुरक्षा। मैंडेट पंजीकरण एनपीसीआई यूपीआई ऑटोपे द्वारा संसाधित होता है। कभी भी अपने यूपीआई ऐप से रद्द करें।",
    },
    zodiacs: {
      Aries: "मेष",
      Taurus: "वृषभ",
      Gemini: "मिथुन",
      Cancer: "कर्क",
      Leo: "सिंह",
      Virgo: "कन्या",
      Libra: "तुला",
      Scorpio: "वृश्चिक",
      Sagittarius: "धनु",
      Capricorn: "मकर",
      Aquarius: "कुंभ",
      Pisces: "मीन",
    },
    planets: {
      Sun: "सूर्य",
      Moon: "चंद्रमा",
      Mars: "मंगल",
      Mercury: "बुध",
      Jupiter: "गुरु (बृहस्पति)",
      Venus: "शुक्र",
      Saturn: "शनि",
      Ascendant: "लग्न",
    },
  },
};
