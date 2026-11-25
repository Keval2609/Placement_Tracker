import React, { useState } from "react";
import { X, Bell, CheckCircle2, Smartphone } from "lucide-react";

interface PrototypeAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrototypeAlertsDrawer: React.FC<PrototypeAlertsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [pushActive, setPushActive] = useState(true);
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleTriggerTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-6 sm:p-7 space-y-5 text-neutral-800 dark:text-neutral-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2129] rounded-md flex items-center justify-center text-white">
            <Bell className="w-5 h-5 text-[#1c69d4] dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[1px] text-neutral-900 dark:text-white">
              Mobile Web Push Alerts
            </h2>
            <p className="text-xs font-light text-neutral-600 dark:text-neutral-400">
              Never miss a 11:59 PM deadline or OA schedule.
            </p>
          </div>
        </div>

        {/* Push Notification Card */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-white dark:bg-neutral-800 text-[#1c69d4] dark:text-blue-400 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Browser Web Push</h4>
                <p className="text-[11px] font-light text-neutral-500 dark:text-neutral-400">Direct notifications on desktop & Android PWA</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPushActive(!pushActive)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer ${
                pushActive
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {pushActive ? "Enabled" : "Enable Push"}
            </button>
          </div>
        </div>

        {/* Battery / OEM Optimization Advisory */}
        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-200 block">OEM Battery Optimization Note:</span>
            <span className="font-light">Enable "Allow Background Activity" in OS Settings on Xiaomi/OnePlus to ensure alarms fire.</span>
          </div>
        </div>

        {/* Test Alert Trigger */}
        <div className="flex justify-between items-center pt-2">
          {testSent ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-[0.5px] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Test notification fired successfully.
            </span>
          ) : (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Simulates a 1-hour deadline countdown warning
            </span>
          )}

          <button
            type="button"
            onClick={handleTriggerTest}
            className="px-4 py-2 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold uppercase tracking-[0.5px] border border-neutral-300 dark:border-neutral-700 transition-colors cursor-pointer"
          >
            Send Test Alert
          </button>
        </div>
      </div>
    </div>
  );
};
