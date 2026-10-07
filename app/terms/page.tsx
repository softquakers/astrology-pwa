import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Astro Reports",
  description: "Read the Terms & Conditions governing your use of Astro Reports and our astrological calculation services.",
};

export default function TermsAndConditionsPage() {
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
            📜 User Agreement
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#EDE9FA]">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-[#A59FC8]">
            Last updated: October 7, 2026 • Effective Date: October 7, 2026
          </p>
        </div>

        {/* Introduction */}
        <div className="rounded-2xl border border-[#2E2752] bg-[#16122E]/80 p-5 text-sm leading-relaxed text-[#D6D1EE] space-y-3">
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of <strong>Astro Reports</strong> (accessible via{" "}
            <a href="https://astrologyguru.net" className="text-[#E8B86B] hover:underline">
              astrologyguru.net
            </a>
            ) and our associated astrological calculation and ephemeris APIs.
          </p>
          <p>
            By accessing or using our application, calculating a birth chart, or signing in with Google, you agree to be bound by these Terms. If you do not agree, please do not use the application.
          </p>
        </div>

        {/* Section 1: Astrological Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>1.</span> Astrological Guidance &amp; Entertainment Disclaimer
          </h2>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3 text-sm text-[#EDE9FA] leading-relaxed">
            <p className="font-medium text-amber-300">
              ⚠️ Important Legal &amp; Professional Advice Disclaimer:
            </p>
            <p className="text-[#D6D1EE]">
              Astro Reports provides celestial charts, planetary positions, transit forecasts, and zodiac insights based on historical and astronomical ephemeris algorithms. All interpretations, reports, and readings are intended solely for <strong>personal self-reflection, philosophical curiosity, and cultural entertainment</strong>.
            </p>
            <p className="text-[#D6D1EE]">
              Astrological interpretations should <strong>never</strong> be used as a substitute for professional medical, psychological, psychiatric, legal, tax, or financial advice. Astro Reports makes no warranties regarding the accuracy or predictive outcomes of any astrological interpretation.
            </p>
          </div>
        </section>

        {/* Section 2: User Account & Registration */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>2.</span> User Accounts &amp; Registration
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>
                <strong className="text-[#EDE9FA]">Accuracy of Birth Details:</strong> Natal charts depend on the accuracy of your input. You are responsible for ensuring that your birth date, time, and birthplace are accurate.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Account Security:</strong> If you authenticate via Google Sign-In or email, you are responsible for maintaining the confidentiality of your device and login credentials.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Eligibility:</strong> You must be at least 13 years of age (or the minimum legal age in your jurisdiction) to use our services.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Subscriptions and Membership Plans */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>3.</span> Membership Plans &amp; Billing
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              Astro Reports offers both free exploratory features and premium membership tiers (such as Monthly Access and Annual Cosmic Pass):
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>
                <strong className="text-[#EDE9FA]">Demo Sandbox Mode:</strong> During trial and demonstration periods, no real financial transaction is conducted unless explicitly stated at checkout.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Subscription Renewals:</strong> Paid memberships renew automatically at the end of each billing cycle unless canceled prior to the renewal date.
              </li>
              <li>
                <strong className="text-[#EDE9FA]">Cancellation:</strong> You may cancel your subscription at any time through your account profile. Access continues through the end of the paid billing period.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>4.</span> Intellectual Property Rights
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              All software, algorithms, report templates, visual designs, logos, and written content on Astro Reports are the exclusive intellectual property of Astro Reports and protected by applicable copyright and trademark laws.
            </p>
            <p>
              You are granted a personal, non-exclusive, non-transferable license to view, download, and print your personal natal charts for individual, non-commercial use.
            </p>
          </div>
        </section>

        {/* Section 5: Acceptable Use Policy */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>5.</span> Acceptable Use Policy
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#A59FC8] pl-2">
              <li>Use automated scrapers, bots, or spiders to extract chart data or planetary ephemerides without authorization.</li>
              <li>Interfere with or overburden the server and API infrastructure.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the source code of our calculation engine.</li>
              <li>Use the service for fraudulent, unlawful, or harmful activities.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>6.</span> Limitation of Liability
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              To the fullest extent permitted by applicable law, Astro Reports and its operators shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the service, or any reliance placed on astrological interpretations.
            </p>
            <p>
              The application is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied.
            </p>
          </div>
        </section>

        {/* Section 7: Modifications to Terms */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>7.</span> Modifications to Terms
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              We may revise these Terms &amp; Conditions from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of Astro Reports after any modifications signifies your acceptance of the updated Terms.
            </p>
          </div>
        </section>

        {/* Section 8: Contact & Support */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E8B86B] flex items-center gap-2">
            <span>8.</span> Contact Us
          </h2>
          <div className="rounded-xl border border-[#2E2752] bg-[#1A1533] p-5 space-y-3 text-sm text-[#D6D1EE] leading-relaxed">
            <p>
              For legal inquiries, terms clarification, or customer support regarding your account, please reach out to us:
            </p>
            <div className="mt-2 rounded-xl bg-[#231C42] p-4 text-xs space-y-1 font-mono text-[#EDE9FA]">
              <div>Email: <a href="mailto:support@astrologyguru.net" className="text-[#E8B86B] hover:underline">support@astrologyguru.net</a></div>
              <div>Domain: <a href="https://astrologyguru.net" className="text-[#E8B86B] hover:underline">https://astrologyguru.net</a></div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2E2752] pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A59FC8]">
          <div>© {new Date().getFullYear()} Astro Reports. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-[#E8B86B] transition-colors">
              Privacy Policy
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
