import React from "react";
import { Sparkles, Bell, Search, Layers, Radio } from "lucide-react";

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
    <header className="sticky top-0 z-30 w-full border-b border-[#e6e6e6] bg-white/95 backdrop-blur-md transition-all">
      {/* BMW M-Stripe: 4px M-stripe (Light Blue -> Dark Blue -> Red) */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#0066b1]" />
        <div className="w-1/3 bg-[#1c69d4]" />
        <div className="w-1/3 bg-[#e22718]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & Live status badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-[#1a2129] border border-[#262e38] flex items-center justify-center font-bold text-white text-xs tracking-wider">
            PT
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#1a1a1a] tracking-tight">
                Placement <span className="text-[#1c69d4]">Tracker</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 bg-[#eff6ff] text-[#1c69d4] border border-[#bfdbfe]">
                <Radio className="w-2.5 h-2.5 text-[#22c55e] animate-pulse" />
                Demo Showcase
              </span>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b] hidden sm:block">
              {activeDrivesCount} Active Drives • {urgentCount > 0 ? (
                <span className="text-[#b45309] font-bold">{urgentCount} Closing Soon</span>
              ) : "All on schedule"}
            </p>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search companies, roles, CTC, branches..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4] transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6b6b6b] hover:text-[#262626] px-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-Channel Alerts Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-white hover:bg-[#f7f7f7] border border-[#cccccc] transition-colors cursor-pointer"
            title="Configure Telegram & Push notifications"
          >
            <Bell className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span className="hidden sm:inline">Alert Channels</span>
            <span className="w-2 h-2 bg-[#22c55e]" />
          </button>

          {/* AI Notice Ingest Button */}
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Parse Notice</span>
          </button>

          {/* Switch back to Live UI */}
          <button
            type="button"
            onClick={onExitPrototype}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-[#f7f7f7] hover:bg-[#ebebeb] border border-[#e6e6e6] transition-colors cursor-pointer"
            title="Switch back to Live Dashboard"
          >
            <Layers className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span>Live Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
