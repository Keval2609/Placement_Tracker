import React from "react";
import { Briefcase, AlertTriangle, GitPullRequest, Trophy, ArrowUpRight } from "lucide-react";
import { DriveCard } from "../types/drive";
import { cn } from "../lib/utils";

interface DashboardMetricsStripProps {
  drives: DriveCard[];
  onFilterUrgent?: () => void;
  onFilterActivePipeline?: () => void;
  onFilterOffers?: () => void;
}

export const DashboardMetricsStrip: React.FC<DashboardMetricsStripProps> = ({
  drives,
  onFilterUrgent,
  onFilterActivePipeline,
  onFilterOffers,
}) => {
  const totalDrives = drives.length;
  const urgentDrives = drives.filter(
    (d) =>
      !d.is_overdue &&
      d.days_left !== null &&
      d.days_left <= 3 &&
      d.application_status === "not_applied"
  );
  const inPipeline = drives.filter((d) =>
    ["applied", "oa", "interview"].includes(d.application_status)
  );
  const offers = drives.filter((d) => d.application_status === "offer");

  const cards = [
    {
      title: "Total Drives Tracked",
      value: totalDrives,
      subtext: "Across Tier-1 & Off-Campus",
      icon: Briefcase,
      textColor: "text-white",
      onClick: undefined,
      highlight: false,
      ariaLabel: `Total drives tracked: ${totalDrives}`,
    },
    {
      title: "Urgent Deadlines (< 72h)",
      value: urgentDrives.length,
      subtext:
        urgentDrives.length > 0
          ? `${urgentDrives.slice(0, 3).map((d) => d.company_name).join(", ")}`
          : "No pending urgency",
      icon: AlertTriangle,
      textColor: "text-amber-400",
      onClick: onFilterUrgent,
      highlight: urgentDrives.length > 0,
      ariaLabel: `Filter by urgent deadlines: ${urgentDrives.length} drives closing within 72 hours`,
    },
    {
      title: "Active In Pipeline",
      value: inPipeline.length,
      subtext:
        inPipeline.length > 0
          ? `${inPipeline.slice(0, 3).map((d) => d.company_name).join(", ")}`
          : "Applied, OA & Interviews",
      icon: GitPullRequest,
      textColor: "text-blue-400",
      onClick: onFilterActivePipeline,
      highlight: false,
      ariaLabel: `Filter by active pipeline: ${inPipeline.length} drives in applied, OA, or interview stages`,
    },
    {
      title: "Offers & Selections",
      value: offers.length,
      subtext:
        offers.length > 0
          ? `${offers.map((d) => d.company_name).join(", ")} (Secured)`
          : "In selection rounds",
      icon: Trophy,
      textColor: "text-emerald-400",
      onClick: onFilterOffers,
      highlight: offers.length > 0,
      ariaLabel: `Filter by offers secured: ${offers.length} offers`,
    },
  ];

  return (
    <div className="bg-tpo-navy border border-neutral-800 p-4 sm:p-5 text-white rounded-lg shadow-sm">
      {/* Registry Hero Band Header Label */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 font-mono text-[11px]">
        <span className="font-bold uppercase tracking-wider text-neutral-300">
          Cohort Registry Metrics
        </span>
        <span className="text-neutral-400">
          Active Student Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const isInteractive = Boolean(card.onClick);

          return (
            <div
              key={idx}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              aria-label={card.ariaLabel}
              onClick={card.onClick}
              onKeyDown={(e) => {
                if (isInteractive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  card.onClick?.();
                }
              }}
              className={cn(
                "group bg-neutral-900/70 border border-white/10 p-4 rounded-md transition-all duration-200 hover:border-tpo-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt",
                isInteractive && "cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold text-neutral-300 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                      {card.value}
                    </span>
                    {card.highlight && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-tpo-urgent/25 text-red-300 font-bold uppercase tracking-wider border border-tpo-urgent/40">
                        Closing Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 truncate max-w-[190px] font-medium">
                    {card.subtext}
                  </p>
                </div>

                <div
                  className={cn(
                    "w-9 h-9 bg-neutral-900 border border-white/10 rounded-md flex items-center justify-center shrink-0",
                    card.textColor
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {card.onClick && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-300 group-hover:text-white transition-colors">
                  <span>Filter by stage</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-tpo-accent" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
