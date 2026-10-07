import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Astro Reports",
  description: "Learn how Astro Reports collects, uses, and protects your personal and astrological birth chart data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0E0B1F] text-[#EDE9FA] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between border-b border-[#2E2752] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8B86B] to-[#FFE2A4] text-base text-[#1A1230] font-bold shadow-md shadow-[#E8B86B]/20">
              ✨
            </span>
            <div>
              <div className="font-semibold tracking-wide text-base text-[#EDE9FA]">Astro Reports</div>
              <div className="text-[11px] text-[#A59FC8]">astrologyguru.net</div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2E2752] bg-[#1A1533] px-3.5 py-1.5 text-xs text-[#E8B86B] hover:border-[#E8B86B] hover:text-[#FFE2A4] transition-colors"
          >
            ← Back to App
          </Link>
        </header>

        {/* Page Title Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8B86B]/10 px-3 py-1 text-xs text-[#E8B86B] border border-[#E8B86B]/20">
            🛡️ Legal & Data Protection
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#EDE9FA]">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#A59FC8]">
            Last updated: October 7, 2026 • Effective Date: October 7, 2026
          </p>
        </div>

        {/* Introduction Banner */}
        <div className="rounded-2xl border border-[#2E2752] bg-[#16122E]/80 p-5 text-sm leading-relaxed text-[#D6D1EE] space-y-3">
          <p>
            Welcome to <strong>Astro Reports</strong> (accessible at{" "}
            <a href="https://astrologyguru.net" className="text-[#E8B86B] hover:underline">
              astrologyguru.net
            </a>
            ). We respect your privacy and are committed to protecting your personal information and astrological birth details.
          </p>
          <p>
            This Privacy Policy explains what data we collect, why we need it, how it is processed to calculate astrological charts, and what control you have over your information.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>1.</span> Information We Collect
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>To provide high-precision astrological interpretations and birth chart calculations, we collect:</p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>
                <strong className="text-[#EDE9FA]">Identity &amp; Profile Details:</strong> Your full name, email address, and optional portrait photo.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Astrological &amp; Birth Data:</strong> Your date of birth (DOB), exact time of birth, birth city/country, and geographic coordinates (latitude, longitude, timezone).
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Google Account Information:</strong> When signing in with Google, we receive basic profile attributes (Google account name, email address, profile picture URL, and Google ID) authorized through Google Identity Services.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Technical Information:</strong> Standard browser user-agent headers, connection IP, and interaction timestamps.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: How We Use Your Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>2.</span> How We Use Your Information
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>Your details are used exclusively for legitimate app functionality:</p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>Calculating astronomical planetary positions, ascendant signs, house placements, and celestial aspects using high-precision ephemeris engines.</li>
              <li>Personalizing your natal reports and daily transit horoscopes.</li>
              <li>Creating and managing your user profile and subscription status.</li>
              <li>Maintaining your astrological question and reading history on your device and account.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Google API Services User Data Policy */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>3.</span> Google API Services &amp; OAuth Compliance
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              Astro Reports complies with the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#E8B86B] hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>We only request basic Google Identity data (Name, Email, Profile Picture) necessary to authenticate you.</li>
              <li>We do <strong>not</strong> sell, rent, or trade your Google data to third parties, data brokers, or advertising networks.</li>
              <li>We do not use Google account data to train generalized AI/ML models without your explicit consent.</li>
              <li>We retain your Google login profile only as long as you maintain your account on our platform.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>4.</span> Third-Party Service Providers
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>To operate our application, we integrate with trusted third-party services:</p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>
                <strong className="text-[#EDE9FA]">OpenStreetMap / Nominatim:</strong> Used strictly to resolve birth city names into latitude, longitude, and timezone coordinates.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Google Identity Services:</strong> Used for optional, secure one-click sign in.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">MongoDB Cloud Atlas &amp; Heroku:</strong> Secure cloud infrastructure where user records and chart calculations are stored with encryption in transit and at rest.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Data Storage and Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>5.</span> Data Storage &amp; Security
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              We implement industry-standard administrative, technical, and physical safeguards to secure your personal data against unauthorized access, loss, or alteration. All client-server communications use HTTPS/TLS encryption.
            </p>
            <p>
              Your natal chart query history is stored locally in your browser's <code className="bg-[#241D42] px-1.5 py-0.5 rounded text-[#E8B86B]">localStorage</code> for instant offline access in our Progressive Web App (PWA).
            </p>
          </div>
        </section>

        {/* Section 6: Your Privacy Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>6.</span> Your Privacy Rights (GDPR &amp; CCPA)
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>Regardless of your geographic location, you retain the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li><strong>Right to Access:</strong> You can request a summary of the personal and chart data we hold for you.</li>
              <li><strong>Right to Rectification:</strong> You can edit your birth date, time, and location directly in the app.</li>
              <li><strong>Right to Erasure:</strong> You can request immediate deletion of your user account and stored chart records.</li>
              <li><strong>Right to Withdraw Consent:</strong> You may disconnect Google authentication or clear your local PWA data at any time.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Contact Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>7.</span> Contact Us
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              If you have any questions about this Privacy Policy, your personal data, or wish to exercise your data deletion rights, please contact our privacy team:
            </p>
            <div className="mt-2 rounded-xl bg-[#231C42] p-4 text-xs space-y-1 font-mono text-[#EDE9FA]">
              <div>Email: <a href="mailto:support@astrologyguru.net" className="text-[#E8B86B] hover:underline">support@astrologyguru.net</a></div>
              <div>Website: <a href="https://astrologyguru.net" className="text-[#E8B86B] hover:underline">https://astrologyguru.net</a></div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2E2752] pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A59FC8]">
          <div>© {new Date().getFullYear()} Astro Reports. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[#E8B86B] transition-colors">
              Terms &amp; Conditions
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-[#E8B86B] transition-colors">
              Back to App
            </Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
