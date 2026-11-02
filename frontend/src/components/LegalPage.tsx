import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import {
  FileText,
  ShieldCheck,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Database,
  ExternalLink,
  Cpu,
  Bell,
  Scale,
  CheckCircle2,
} from "lucide-react";

export type LegalTab = "terms" | "privacy";

interface LegalPageProps {
  initialTab?: LegalTab;
  onBack: () => void;
}

export function LegalPage({ initialTab = "terms", onBack }: LegalPageProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: LegalTab) => {
    setActiveTab(tab);
    const newPath = tab === "terms" ? "/terms-of-service" : "/privacy-policy";
    window.history.replaceState({}, "", newPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans pb-20 selection:bg-bmw-primary selection:text-white transition-colors duration-150">
      {/* BMW M-Stripe Top Signature Divider */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-bmw-m-blue-light" />
        <div className="w-1/3 bg-bmw-primary" />
        <div className="w-1/3 bg-bmw-m-red" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md transition-all shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Portal"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>

            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-bmw-surface-dark rounded-md flex items-center justify-center font-bold text-white text-[11px] tracking-wider border border-neutral-800">
                PT
              </div>
              <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white hidden sm:inline">
                DriveTrack <span className="text-neutral-500 dark:text-neutral-400 font-medium text-xs">Legal Center</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero & Tab Navigator */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-bmw-primary border border-blue-200 dark:border-blue-900/50 mb-3">
                <Scale className="w-3 h-3 text-bmw-primary" />
                Legal Agreements & Privacy Policy
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {activeTab === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-xl">
                Clear, transparent commitments governing placement notice ingestion, human verification gates, and strict student data privacy.
              </p>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex items-center p-1 bg-neutral-200/70 dark:bg-neutral-800/80 rounded-lg border border-neutral-300/80 dark:border-neutral-700 shrink-0">
              <button
                type="button"
                onClick={() => switchTab("terms")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeTab === "terms"
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-bmw-primary" />
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => switchTab("privacy")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeTab === "privacy"
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Document Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === "terms" ? (
          <TermsOfServiceContent onSwitchToPrivacy={() => switchTab("privacy")} />
        ) : (
          <PrivacyPolicyContent onSwitchToTerms={() => switchTab("terms")} />
        )}
      </main>
    </div>
  );
}

function TermsOfServiceContent({ onSwitchToPrivacy }: { onSwitchToPrivacy: () => void }) {
  return (
    <article className="space-y-8 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
            Document Version
          </span>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Last Updated: November 2, 2026 • Effective Date: November 2, 2026
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Active & Binding Agreement</span>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-lg border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold uppercase tracking-wide">Important Advisory for College Students</p>
            <p>
              DriveTrack is a personal organization and deadline tracking assistant. It is <strong>NOT</strong> an official university portal, and AI extraction outputs are advisory drafts. You are strictly responsible for confirming all deadlines, eligibility rules, and test links with your Training & Placement (T&P) cell and company job portals.
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">1</span>
          Acceptance & Eligibility
        </h2>
        <p>
          By accessing or registering for DriveTrack at <strong>drivetrack.page</strong> (including all web clients, APIs, and PWA apps), you agree to be bound by these Terms of Service. If you do not agree, you must discontinue use immediately.
        </p>
        <p>
          You must be at least 16 years of age or an actively enrolled student/candidate seeking placement or employment opportunities. Account authentication is managed securely through <strong>Clerk</strong>. You are solely responsible for all actions conducted under your authenticated session.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">2</span>
          Service Description & Dual-Track Ingestion
        </h2>
        <p>
          DriveTrack provides recruitment and placement deadline tracking through two distinct ingestion pathways:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Campus Drives:</strong> Notice announcements (WhatsApp messages, text circulars, `.pdf`, or `.docx` documents) submitted by the user are parsed via Large Language Model (LLM) inference to generate preliminary draft milestones (deadlines, OA dates, interview rounds, and eligibility criteria).
          </li>
          <li>
            <strong>Off-Campus Applications:</strong> Direct manual logging for individual applications that bypasses AI inference and directly registers records into your pipeline funnel.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">3</span>
          Human-in-the-Loop Trust Gate & Disclaimer of Accuracy
        </h2>
        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <p className="font-semibold text-neutral-900 dark:text-white">
            Mandatory Verification Requirement
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Automated LLM extraction is inherently probabilistic. To safeguard against hallucination or formatting misinterpretations, DriveTrack enforces an interactive <strong>Human Verification Gate</strong>. No campus drive is marked active until the user confirms or adjusts extracted dates.
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
            DriveTrack and its operators disclaim all liability for missed registration cutoffs, wrong criteria interpretation, or scheduling changes announced outside the platform.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">4</span>
          Non-Affiliation with Academic Institutions & Hiring Companies
        </h2>
        <p>
          DriveTrack is an independent developer project. It is <strong>NOT</strong> affiliated with, endorsed by, or operated in partnership with any university Training and Placement Cell (T&P), academic department, or corporate hiring organization.
        </p>
        <p>
          Any company names, trademarks, and logos (such as Google, Microsoft, Goldman Sachs, Uber, Cisco, etc.) shown in interactive mock showcases or user entries are solely for factual identification and demonstration purposes and remain the exclusive property of their respective trademark holders.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">5</span>
          Notification Reliability & Best-Effort Delivery
        </h2>
        <p>
          Deadline alert delivery via Web Push (VAPID) and the Telegram Bot API operates as an assistive reminder mechanism. Timely delivery depends on your browser’s service worker status, network availability, and device battery optimization policies (e.g. Android OEM background thread limits). DriveTrack cannot guarantee 100% receipt and shall not be held liable for delayed or suppressed push alerts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">6</span>
          Acceptable Use & User Conduct
        </h2>
        <p>When using DriveTrack, you agree that you will not:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
          <li>Attempt to breach, probe, or circumvent Supabase Row-Level Security (RLS) policies or cross into another tenant’s data;</li>
          <li>Upload malicious payloads, executables, or corrupted files disguised as PDF or DOCX notices;</li>
          <li>Engage in automated scraping or denial-of-service traffic against the backend APIs;</li>
          <li>Misrepresent your identity or use fraudulent Clerk credentials.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">7</span>
          Limitation of Liability
        </h2>
        <p className="text-xs uppercase font-medium tracking-wide bg-neutral-100 dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">
          To the fullest extent permitted by applicable law, DriveTrack and its developers shall not be liable for any indirect, incidental, consequential, or punitive damages, including any lost employment opportunities, missed application deadlines, or academic placement penalties resulting from using the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-800 dark:text-neutral-200">8</span>
          Data Ownership & Privacy
        </h2>
        <p>
          You retain full ownership of the data, notes, and circular documents you upload. We treat your personal application data as confidential. For detailed technical information on how your data is isolated and protected, please review our{" "}
          <button
            type="button"
            onClick={onSwitchToPrivacy}
            className="text-bmw-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
          >
            Privacy Policy <ExternalLink className="w-3 h-3 inline" />
          </button>.
        </p>
      </section>

      <section className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
        <p>
          Questions about our Terms of Service? File an issue on our{" "}
          <a
            href="https://github.com/Keval2609/Placement_Tracker/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bmw-primary hover:underline font-bold"
          >
            GitHub Repository
          </a>.
        </p>
      </section>
    </article>
  );
}

function PrivacyPolicyContent({ onSwitchToTerms }: { onSwitchToTerms: () => void }) {
  return (
    <article className="space-y-8 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
            Privacy Policy Status
          </span>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Last Updated: November 2, 2026 • Effective Date: November 2, 2026
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Zero Data Brokerage</span>
        </div>
      </div>

      {/* Core Privacy Promise Box */}
      <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-bold uppercase tracking-wide">Our Non-Negotiable Privacy Promise</p>
            <p>
              We believe student career data is private and sensitive. DriveTrack <strong>DOES NOT sell, monetize, rent, or distribute</strong> your personal information, resumes, application history, or academic performance (CGPA) to advertisers, third-party recruiters, or marketing aggregators.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-bmw-primary" />
          1. Information We Collect
        </h2>
        <p>We collect only the minimal data required to provide recruitment deadline tracking and notice parsing:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-bmw-primary" />
              Account & Identity Data
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Unique user ID, verified email address, and display name provided through our identity provider <strong>Clerk</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-bmw-m-blue-light" />
              Placement & Funnel Records
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Company names, job roles, compensation specs, deadlines, pipeline stages (Applied, OA, Interview, Offer), and private notes.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Notice Text & Documents
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Unstructured announcement snippets, circular PDFs, or DOCX files uploaded for automated milestone extraction.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Alert Identifiers
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Browser Web Push endpoints (VAPID) and optional Telegram Chat IDs used exclusively to dispatch scheduled deadline alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-bmw-primary" />
          2. AI Extraction & Model Privacy
        </h2>
        <p>
          When you upload or paste a notice, the text is processed via <strong>Groq Cloud LPUs</strong> (`llama-3.3-70b-versatile`) or a self-hosted <strong>Ollama</strong> instance to output structured JSON.
        </p>
        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
          <p className="font-bold text-neutral-900 dark:text-white">
            Zero Model Training Policy
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            Your notice contents and application parameters sent to LLM inference are processed transiently with strict JSON schema decoding. <strong>They are NEVER retained by us to train or fine-tune public foundation AI models.</strong>
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-bmw-primary" />
          3. Database Security & Tenant Isolation (RLS)
        </h2>
        <p>
          Your records are stored in <strong>Supabase PostgreSQL</strong> protected by PostgreSQL <strong>Row-Level Security (RLS)</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>
            Every database query runs through a cryptographic verification filter (`requesting_user_id() = user_id`) matching your Clerk JWT token.
          </li>
          <li>
            <strong>Total Tenant Isolation:</strong> No other authenticated user or student can query, view, or alter your tracked placement records.
          </li>
          <li>
            All client-server communications use modern TLS 1.3 encryption in transit.
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-bmw-primary" />
          4. Third-Party Service Providers
        </h2>
        <p>We work exclusively with reputable cloud infrastructure providers:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-neutral-200 dark:border-neutral-800 rounded-md">
            <thead className="bg-neutral-100 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-2.5">Service Provider</th>
                <th className="p-2.5">Function</th>
                <th className="p-2.5">Data Privacy Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr>
                <td className="p-2.5 font-bold">Clerk</td>
                <td className="p-2.5">Authentication & Session Management</td>
                <td className="p-2.5">
                  <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-bmw-primary hover:underline">
                    clerk.com/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">Supabase</td>
                <td className="p-2.5">PostgreSQL Database with RLS & Storage</td>
                <td className="p-2.5">
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-bmw-primary hover:underline">
                    supabase.com/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">Groq</td>
                <td className="p-2.5">LPU Inference for Structured Extraction</td>
                <td className="p-2.5">
                  <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-bmw-primary hover:underline">
                    groq.com/privacy-policy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">Telegram Bot API</td>
                <td className="p-2.5">Opt-in Deadline Escalation Alerts</td>
                <td className="p-2.5">
                  <a href="https://telegram.org/privacy" target="_blank" rel="noopener noreferrer" className="text-bmw-primary hover:underline">
                    telegram.org/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">Sentry</td>
                <td className="p-2.5">Error Monitoring & Crash Diagnostics</td>
                <td className="p-2.5">
                  <a href="https://sentry.io/privacy" target="_blank" rel="noopener noreferrer" className="text-bmw-primary hover:underline">
                    sentry.io/privacy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-bmw-primary" />
          5. Data Retention & User Rights
        </h2>
        <p>
          You hold the ultimate rights over your career data under standard global privacy frameworks:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Right to Rectification:</strong> You can edit any milestone, company information, or note at any time.</li>
          <li><strong>Right to Erasure:</strong> Deleting a drive removes it from your operational database immediately. You can delete your entire account through Clerk settings.</li>
          <li><strong>Local Storage:</strong> Your visual theme preference (`theme: "dark"` or `"light"`) is stored locally in your browser and can be reset by clearing browser cache.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-bmw-primary" />
          6. Terms of Service
        </h2>
        <p>
          For complete terms governing the acceptable use of this service and disclaimers of liability, please read our{" "}
          <button
            type="button"
            onClick={onSwitchToTerms}
            className="text-bmw-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
          >
            Terms of Service <ExternalLink className="w-3 h-3 inline" />
          </button>.
        </p>
      </section>

      <section className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
        <p>
          Have questions or want to request data deletion? Open an issue on our{" "}
          <a
            href="https://github.com/Keval2609/Placement_Tracker/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bmw-primary hover:underline font-bold"
          >
            GitHub Repository
          </a>.
        </p>
      </section>
    </article>
  );
}

