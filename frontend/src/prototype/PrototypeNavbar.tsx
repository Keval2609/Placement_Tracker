import React from "react";
import { FileText, Bell, Search, Layers } from "lucide-react";
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
    <header className="sticky top-0 z-30 w-full border-b border-registry-border dark:border-registry-dark-border bg-white/95 dark:bg-registry-dark-surface/90 backdrop-blur-md transition-all shadow-xs">
      {/* Institutional Top Dispatch Header Bar */}
      <div className="w-full bg-registry-surface dark:bg-registry-dark-surface border-b border-registry-border dark:border-registry-dark-border px-4 sm:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-bold text-tpo-navy dark:text-neutral-200 uppercase tracking-wider">
            Academic Placement Registry
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span className="hidden sm:inline">Simulation Cohort Sandbox</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-tpo-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-tpo-accent" />
            Sandbox Mode
          </span>
          <span className="hidden md:inline text-neutral-400 dark:text-neutral-500">IST (UTC+05:30)</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand logo & Live status badge */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-tpo-navy border border-neutral-800 rounded-md flex items-center justify-center font-serif font-bold text-white text-xs tracking-wider shrink-0">
            PR
          </div>

          {/* Mobile stacked brand title */}
          <div className="flex sm:hidden flex-col leading-tight select-none">
            <span className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white">Placement</span>
            <span className="text-xs font-serif italic text-tpo-cobalt dark:text-blue-400">Registry</span>
          </div>

          {/* Desktop horizontal brand title */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                Placement <span className="text-tpo-cobalt dark:text-blue-400 font-serif italic">Registry</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-tpo-accent" />
                Cohort Simulation
              </span>
            </div>
            <p className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
              {activeDrivesCount} Active Drives • {urgentCount > 0 ? (
                <span className="text-tpo-urgent font-mono font-bold">{urgentCount} Closing Soon</span>
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
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-neutral-900 border border-registry-border dark:border-registry-dark-border rounded-md text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-tpo-cobalt focus:border-tpo-cobalt transition-all font-sans"
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Multi-Channel Alerts Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 w-8 h-8 sm:w-auto sm:h-auto text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer relative"
            title="Configure Push notifications"
          >
            <Bell className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
            <span className="hidden sm:inline">Alert Channels</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute top-1 right-1 sm:static" />
          </button>

          {/* Notice Ingest Button */}
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-white bg-tpo-cobalt hover:bg-tpo-cobalt-hover rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Log Notice</span>
            <span className="sm:hidden">Log</span>
          </button>

          {/* Switch back to Live UI */}
          <button
            type="button"
            onClick={onExitPrototype}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
            title="Switch back to Live Dashboard"
          >
            <Layers className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
            <span>Live Registry</span>
          </button>
        </div>
      </div>
    </header>
  );
};
