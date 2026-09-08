import React, { useState } from "react";
import { X, Bell, Send, CheckCircle2, Smartphone } from "lucide-react";

interface PrototypeAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrototypeAlertsDrawer: React.FC<PrototypeAlertsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [pushActive, setPushActive] = useState(true);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramHandle, setTelegramHandle] = useState("");
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleLinkTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramHandle) return;
    setTelegramLinked(true);
  };

  const handleTriggerTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white border border-[#e6e6e6] shadow-2xl p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-[#f7f7f7] border border-[#e6e6e6] text-[#6b6b6b] hover:text-[#262626] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2129] flex items-center justify-center text-white">
            <Bell className="w-5 h-5 text-[#1c69d4]" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[1px] text-[#262626]">
              Multi-Channel Alerts
            </h2>
            <p className="text-xs font-light text-[#6b6b6b]">
              Never miss a 11:59 PM deadline or OA schedule.
            </p>
          </div>
        </div>

        {/* Push Notification Card */}
        <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white text-[#1c69d4] border border-[#cccccc] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#262626]">Browser Web Push</h4>
                <p className="text-[11px] font-light text-[#6b6b6b]">Direct notifications on desktop & Android PWA</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPushActive(!pushActive)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-all cursor-pointer ${
                pushActive
                  ? "bg-[#ecfdf5] text-[#15803d] border border-[#bbf7d0]"
                  : "bg-white text-[#6b6b6b] border border-[#cccccc]"
              }`}
            >
              {pushActive ? "Enabled" : "Enable Push"}
            </button>
          </div>
        </div>

        {/* Telegram Bot Integration Card */}
        <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white text-[#1c69d4] border border-[#cccccc] flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#262626]">Telegram Alerts Bot</h4>
                <p className="text-[11px] font-light text-[#6b6b6b]">High-priority instant alerts with custom sounds</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                telegramLinked
                  ? "bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]"
                  : "bg-[#fffbeb] text-[#b45309] border-[#fde68a]"
              }`}
            >
              {telegramLinked ? "Connected" : "Not Linked"}
            </span>
          </div>

          {!telegramLinked ? (
            <form onSubmit={handleLinkTelegram} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Enter Telegram Chat ID or Username"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4]"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1c69d4] hover:bg-[#0653b6] text-white text-xs font-bold uppercase tracking-[0.5px] transition-colors cursor-pointer"
              >
                Connect
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#6b6b6b]">
                Connected Chat: <strong className="text-[#262626]">{telegramHandle || "@student_dev"}</strong>
              </span>
              <button
                type="button"
                onClick={() => setTelegramLinked(false)}
                className="text-[11px] text-[#dc2626] hover:underline font-bold uppercase tracking-wider"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Battery / OEM Optimization Advisory */}
        <div className="p-3.5 bg-[#fffbeb] border border-[#fde68a] flex items-start gap-2.5 text-xs text-[#92400e]">
          <Smartphone className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#92400e] block">OEM Battery Optimization Note:</span>
            <span className="font-light">Enable "Allow Background Activity" in OS Settings on Xiaomi/OnePlus to ensure alarms fire.</span>
          </div>
        </div>

        {/* Test Alert Trigger */}
        <div className="flex justify-between items-center pt-2">
          {testSent ? (
            <span className="text-xs text-[#15803d] font-bold uppercase tracking-[0.5px] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Test notification fired successfully.
            </span>
          ) : (
            <span className="text-[11px] text-[#6b6b6b]">
              Simulates a 1-hour deadline countdown warning
            </span>
          )}

          <button
            type="button"
            onClick={handleTriggerTest}
            className="px-4 py-2 bg-white hover:bg-[#f7f7f7] text-[#262626] text-xs font-bold uppercase tracking-[0.5px] border border-[#cccccc] transition-colors cursor-pointer"
          >
            Send Test Alert
          </button>
        </div>
      </div>
    </div>
  );
};
