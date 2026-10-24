import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import { DashboardPage } from "./components/DashboardPage";
import { IngestModal } from "./components/IngestModal";
import { AlertsDrawer } from "./components/AlertsDrawer";
import { PrototypeView } from "./prototype/PrototypeView";
import {
  Plus,
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

const isDemoEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [counts, setCounts] = useState<{ active: number; urgent: number }>({
    active: 0,
    urgent: 0,
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#262626]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2129] flex items-center justify-center font-bold text-white text-xs tracking-wider border border-[#262e38]">
            PT
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6b6b6b] tracking-wider uppercase">
            <Loader2 className="w-4 h-4 animate-spin text-[#1c69d4]" />
            <span>Loading Portal...</span>
          </div>
        </div>
      </div>
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#262626] font-sans pb-16 selection:bg-[#1c69d4] selection:text-white">
      {/* BMW M-Stripe Top Signature Divider: 4px M-stripe (Light Blue -> Dark Blue -> Red) */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#0066b1]" />
        <div className="w-1/3 bg-[#1c69d4]" />
        <div className="w-1/3 bg-[#e22718]" />
      </div>

      {/* Corporate Top Command Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-[#e6e6e6] bg-white/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Dynamic Subtitle */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group shrink-0"
            onClick={() => setSearchQuery("")}
          >
            {/* Monogram Badge */}
            <div className="w-9 h-9 bg-[#1a2129] flex items-center justify-center font-bold text-white text-xs tracking-wider border border-[#262e38]">
              PT
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-[#1a1a1a]">
                  Placement <span className="text-[#1c69d4]">Tracker</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 bg-[#eff6ff] text-[#1c69d4] border border-[#bfdbfe]">
                  <Radio className="w-2.5 h-2.5 text-[#22c55e] animate-pulse" />
                  Live Portal
                </span>
              </div>
              <p className="text-[11px] font-light text-[#6b6b6b] hidden sm:block">
                {counts.active} Active Drives •{" "}
                {counts.urgent > 0 ? (
                  <span className="text-[#b45309] font-bold">{counts.urgent} Closing Soon</span>
                ) : (
                  "All on schedule"
                )}
              </p>
            </div>
          </div>

          {/* Center Global Search Input */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search companies, roles, CTC, branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4] transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6b6b6b] hover:text-[#262626] px-1 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Multi-Channel Alerts Button */}
            <button
              type="button"
              onClick={() => setIsAlertsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-white hover:bg-[#f7f7f7] border border-[#cccccc] transition-colors cursor-pointer"
              title="Configure Telegram & Web Push notification channels"
            >
              <Bell className="w-3.5 h-3.5 text-[#1c69d4]" />
              <span className="hidden sm:inline">Alert Channels</span>
              <span className="w-2 h-2 bg-[#22c55e]" />
            </button>

            {/* Retained Mock Showcase Switcher Button */}
            <button
              type="button"
              onClick={() => setShowPrototype(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-[#ffffff] hover:bg-[#f7f7f7] border border-[#cccccc] transition-colors cursor-pointer"
              title="Explore Demo Mock Showcase (Google, Microsoft, Uber, etc.)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1c69d4]" />
              <span className="hidden sm:inline">Mock Showcase</span>
            </button>

            {/* Add Drive Button */}
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm active:bg-[#0653b6]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Drive</span>
              </button>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm active:bg-[#0653b6]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Drive</span>
                </button>
              </SignInButton>
            )}

            {/* Clerk Authentication Controls */}
            {!isSignedIn ? (
              <div className="flex items-center gap-1.5">
                <SignInButton mode="modal">
                  <button className="text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-[#f7f7f7] hover:bg-[#ebebeb] px-3 py-2 border border-[#e6e6e6] transition-colors cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#262626] hover:bg-[#1a1a1a] px-3 py-2 border border-[#262626] transition-colors cursor-pointer hidden sm:inline-block">
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
          <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 border border-[#e6e6e6] bg-[#fafafa] shadow-sm text-center">
            <div className="w-12 h-12 bg-[#1a2129] text-white font-bold text-sm flex items-center justify-center mx-auto mb-4 border border-[#262e38]">
              PT
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#1a1a1a] mb-2">
              Welcome to Placement Tracker Portal
            </h2>
            <p className="text-sm font-light text-[#6b6b6b] max-w-md mx-auto mb-8">
              Track recruitment drives, application pipelines, deadline reminders, and parse placement notices in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Your Account</span>
                </button>
              </SignInButton>
              <button
                type="button"
                onClick={() => setShowPrototype(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-white hover:bg-[#f7f7f7] border border-[#cccccc] transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#1c69d4]" />
                <span>Explore Interactive Demo</span>
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-[#ebebeb] flex items-center justify-center gap-6 text-xs text-[#8c8c8c]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0066b1]" /> End-to-end Encrypted
              </span>
              <span>•</span>
              <span>Clerk Authentication</span>
              <span>•</span>
              <span>Automated Deadlines</span>
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
