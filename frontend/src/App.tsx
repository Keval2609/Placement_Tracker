import { useEffect, useState, useCallback } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import { DashboardPage } from "./components/DashboardPage";
import { IngestModal } from "./components/IngestModal";
import { AlertsDrawer } from "./components/AlertsDrawer";
import { ThemeToggle } from "./components/ThemeToggle";
import { LegalPage, LegalTab } from "./components/LegalPage";
import { PrototypeView } from "./prototype/PrototypeView";
import {
  Sparkles,
  LogIn,
  Loader2,
  ShieldCheck,
  Search,
  Bell,
  Radio,
} from "lucide-react";
import { setTokenGetter } from "./services/api";
import { setSupabaseAuth } from "./lib/supabase";

const getInitialLegalTab = (): LegalTab | null => {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  if (
    path.startsWith("/terms-of-service") ||
    path === "/terms" ||
    path.startsWith("/terms/") ||
    search.get("legal") === "terms" ||
    search.get("page") === "terms" ||
    hash === "#terms" ||
    hash === "#terms-of-service"
  ) {
    return "terms";
  }

  if (
    path.startsWith("/privacy-policy") ||
    path === "/privacy" ||
    path.startsWith("/privacy/") ||
    search.get("legal") === "privacy" ||
    search.get("page") === "privacy" ||
    hash === "#privacy" ||
    hash === "#privacy-policy"
  ) {
    return "privacy";
  }

  return null;
};

const isDemoEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
  // If we are on a legal page, do not auto-force demo mode
  if (getInitialLegalTab() !== null) return false;
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return (
    hostname.startsWith("demo.") ||
    hostname.startsWith("showcase.") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/showcase") ||
    params.get("demo") === "true" ||
    params.get("mock") === "true" ||
    params.get("prototype") === "true" ||
    window.location.hash === "#demo" ||
    window.location.hash === "#mock"
  );
};

function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Set token getter synchronously so child components always have immediate access
  setTokenGetter(async () => {
    try {
      const token = await getToken();
      return token;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isSignedIn) {
      getToken({ template: "supabase" })
        .then(setSupabaseAuth)
        .catch(() => setSupabaseAuth(null));
    } else {
      setSupabaseAuth(null);
    }
  }, [isSignedIn, getToken]);

  const [showPrototype, setShowPrototype] = useState<boolean>(isDemoEnvironment);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(getInitialLegalTab);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [counts, setCounts] = useState<{ active: number; urgent: number }>({
    active: 0,
    urgent: 0,
  });

  const handleOpenLegal = useCallback((tab: LegalTab) => {
    setLegalTab(tab);
    const path = tab === "terms" ? "/terms-of-service" : "/privacy-policy";
    window.history.pushState({}, "", path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCloseLegal = useCallback(() => {
    setLegalTab(null);
    window.history.pushState({}, "", "/");
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setLegalTab(getInitialLegalTab());
      setShowPrototype(isDemoEnvironment());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-bmw-surface-dark rounded-md flex items-center justify-center font-bold text-white text-xs tracking-wider border border-neutral-800">
            PT
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 tracking-wider uppercase">
            <Loader2 className="w-4 h-4 animate-spin text-bmw-primary" />
            <span>Loading Portal...</span>
          </div>
        </div>
      </div>
    );
  }

  if (legalTab) {
    return (
      <LegalPage
        initialTab={legalTab}
        onBack={handleCloseLegal}
      />
    );
  }

  if (showPrototype) {
    return (
      <PrototypeView
        onExitPrototype={() => {
          setShowPrototype(false);
          if (
            window.location.search.includes("demo") ||
            window.location.search.includes("mock") ||
            window.location.hash.includes("demo") ||
            window.location.hash.includes("mock")
          ) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }}
        onOpenLegal={handleOpenLegal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans pb-16 selection:bg-bmw-primary selection:text-white transition-colors duration-150 overflow-x-hidden w-full max-w-full">
      {/* BMW M-Stripe Top Signature Divider: 4px M-stripe (Light Blue -> Dark Blue -> Red) */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-bmw-m-blue-light" />
        <div className="w-1/3 bg-bmw-primary" />
        <div className="w-1/3 bg-bmw-m-red" />
      </div>

      {/* Corporate Top Command Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Dynamic Subtitle */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Placement Tracker Home - Clear Search"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
            onClick={() => setSearchQuery("")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSearchQuery("");
              }
            }}
          >
            {/* Monogram Badge */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-bmw-surface-dark rounded-md flex items-center justify-center font-bold text-white text-xs tracking-wider border border-neutral-800 shrink-0">
              PT
            </div>

            {/* Mobile stacked brand title */}
            <div className="flex sm:hidden flex-col leading-tight select-none">
              <span className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white">Placement</span>
              <span className="text-xs font-bold tracking-tight text-bmw-primary">Tracker</span>
            </div>

            {/* Desktop horizontal brand title & Live pill */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  Placement <span className="text-bmw-primary">Tracker</span>
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-bmw-primary border border-blue-200 dark:border-blue-900/50">
                  <Radio className="w-2.5 h-2.5 text-emerald-500 motion-safe:animate-pulse" />
                  Live Portal
                </span>
              </div>
              <p className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                {counts.active} Active Drives •{" "}
                {counts.urgent > 0 ? (
                  <span className="text-amber-700 dark:text-amber-400 font-bold">{counts.urgent} Closing Soon</span>
                ) : (
                  "All on schedule"
                )}
              </p>
            </div>
          </div>

          {/* Center Global Search Input */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search companies, roles, CTC, or eligible branches"
                placeholder="Search companies, roles, CTC, branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-bmw-primary focus:border-bmw-primary transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search input"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-1 font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bmw-primary rounded-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Global Theme Toggle */}
            <ThemeToggle />

            {/* Multi-Channel Alerts Button */}
            <button
              type="button"
              aria-label="Open alert channel settings"
              onClick={() => setIsAlertsDrawerOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 w-8 h-8 sm:w-auto sm:h-auto text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
              title="Configure Telegram & Web Push notification channels"
            >
              <Bell className="w-3.5 h-3.5 text-bmw-primary" />
              <span className="hidden sm:inline">Alert Channels</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full absolute top-1 right-1 sm:static" />
            </button>

            {/* Retained Mock Showcase Switcher Button - Hidden on mobile navbar */}
            <button
              type="button"
              aria-label="Explore demo mock showcase"
              onClick={() => setShowPrototype(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
              title="Explore Demo Mock Showcase (Google, Microsoft, Uber, etc.)"
            >
              <Sparkles className="w-3.5 h-3.5 text-bmw-primary" />
              <span>Mock Showcase</span>
            </button>

            {/* Add Drive Button */}
            {isSignedIn ? (
              <button
                type="button"
                aria-label="Add new placement drive"
                onClick={() => setIsIngestModalOpen(true)}
                className="inline-flex items-center justify-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-white bg-bmw-primary hover:bg-bmw-primary-active rounded-md transition-colors cursor-pointer shadow-xs active:bg-bmw-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary focus-visible:ring-offset-2"
              >
                <span className="hidden sm:inline">+ Add Drive</span>
                <span className="sm:hidden">+ Add</span>
              </button>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  aria-label="Sign in to add drive"
                  className="inline-flex items-center justify-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-white bg-bmw-primary hover:bg-bmw-primary-active rounded-md transition-colors cursor-pointer shadow-xs active:bg-bmw-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary focus-visible:ring-offset-2"
                >
                  <span className="hidden sm:inline">+ Add Drive</span>
                  <span className="sm:hidden">+ Add</span>
                </button>
              </SignInButton>
            )}

            {/* Clerk Authentication Controls */}
            {!isSignedIn ? (
              <div className="flex items-center gap-1.5">
                <SignInButton mode="modal">
                  <button
                    aria-label="Sign in to your account"
                    className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    aria-label="Sign up for a new account"
                    className="text-xs font-bold uppercase tracking-wider text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-3 py-2 rounded-md border border-neutral-900 dark:border-neutral-100 transition-colors cursor-pointer hidden sm:inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            ) : (
              <UserButton />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {!isSignedIn ? (
          <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl shadow-xs text-center">
            <div className="w-12 h-12 bg-bmw-surface-dark text-white font-bold text-sm flex items-center justify-center mx-auto mb-4 rounded-lg border border-neutral-800">
              PT
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
              Welcome to Placement Tracker Portal
            </h2>
            <p className="text-sm font-normal text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-8">
              Track recruitment drives, application pipelines, deadline reminders, and parse placement notices in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-bmw-primary hover:bg-bmw-primary-active rounded-md transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary focus-visible:ring-offset-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Your Account</span>
                </button>
              </SignInButton>
              <button
                type="button"
                onClick={() => setShowPrototype(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
              >
                <Sparkles className="w-4 h-4 text-bmw-primary" />
                <span>Explore Interactive Demo</span>
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-bmw-m-blue-light" /> End-to-end Encrypted
              </span>
              <span>•</span>
              <span className="font-medium">Clerk Authentication</span>
              <span>•</span>
              <a
                href="/terms-of-service"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenLegal("terms");
                }}
                className="hover:text-bmw-primary underline transition-colors"
              >
                Terms of Service
              </a>
              <span>•</span>
              <a
                href="/privacy-policy"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenLegal("privacy");
                }}
                className="hover:text-bmw-primary underline transition-colors"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        ) : (
          <DashboardPage
            globalSearchQuery={searchQuery}
            onOpenIngest={() => setIsIngestModalOpen(true)}
            onDriveCountChange={(active, urgent) =>
              setCounts({ active, urgent })
            }
          />
        )}
      </main>

      {/* Global Site Footer */}
      <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800 pt-8 pb-10 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-bmw-surface-dark rounded flex items-center justify-center font-bold text-white text-[10px] border border-neutral-800">
              PT
            </div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              DriveTrack — Placement Drive & Application Pipeline Tracker
            </span>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            <a
              href="/terms-of-service"
              onClick={(e) => {
                e.preventDefault();
                handleOpenLegal("terms");
              }}
              className="hover:text-bmw-primary transition-colors"
            >
              Terms of Service
            </a>
            <span>•</span>
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                handleOpenLegal("privacy");
              }}
              className="hover:text-bmw-primary transition-colors"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="https://github.com/Keval2609/Placement_Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bmw-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Modal-First Ingest Wizard */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
      />

      {/* Alerts & Notification Channels Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
      />
    </div>
  );
}

export default App;
