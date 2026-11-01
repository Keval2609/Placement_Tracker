import React from "react";
import { Sparkles, Bell, Search, Layers, Radio } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

interface PrototypeNavbarProps {
  onOpenIngest: () => void;
  onOpenAlerts: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeDrivesCount: number;
  urgentCount: number;
  onExitPrototype: () => void;
}

export const PrototypeNavbar: React.FC<PrototypeNavbarProps> = ({
  onOpenIngest,
  onOpenAlerts,
  searchQuery,
  onSearchChange,
  activeDrivesCount,
  urgentCount,
  onExitPrototype,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md transition-all shadow-xs">
      {/* BMW M-Stripe: 4px M-stripe (Light Blue -> Dark Blue -> Red) */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-bmw-m-blue-light" />
        <div className="w-1/3 bg-bmw-primary" />
        <div className="w-1/3 bg-bmw-m-red" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & Live status badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-bmw-surface-dark border border-neutral-800 rounded-md flex items-center justify-center font-bold text-white text-xs tracking-wider">
            PT
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                Placement <span className="text-bmw-primary">Tracker</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-bmw-primary border border-blue-200 dark:border-blue-900/50">
                <Radio className="w-2.5 h-2.5 text-emerald-500 motion-safe:animate-pulse" />
                Demo Showcase
              </span>
            </div>
            <p className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400 hidden sm:block">
              {activeDrivesCount} Active Drives • {urgentCount > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-bold">{urgentCount} Closing Soon</span>
              ) : "All on schedule"}
            </p>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search companies, roles, CTC, or eligible branches"
              placeholder="Search companies, roles, CTC, branches..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-bmw-primary focus:border-bmw-primary transition-all font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search input"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-1 font-bold rounded-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Multi-Channel Alerts Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
            title="Configure Telegram & Push notifications"
          >
            <Bell className="w-3.5 h-3.5 text-bmw-primary" />
            <span className="hidden sm:inline">Alert Channels</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          </button>

          {/* AI Notice Ingest Button */}
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-bmw-primary hover:bg-bmw-primary-active rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Parse Notice</span>
          </button>

          {/* Switch back to Live UI */}
          <button
            type="button"
            onClick={onExitPrototype}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
            title="Switch back to Live Dashboard"
          >
            <Layers className="w-3.5 h-3.5 text-bmw-primary" />
            <span>Live Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
