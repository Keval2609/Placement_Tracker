import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  fetchOnboardingTestStatus,
  fetchTelegramStatus,
  fetchVapidPublicKey,
  linkTelegramChat,
  savePushSubscription,
  triggerOnboardingTest,
} from "../services/api";
import { detectOemBrand, OemInfo } from "../utils/oemDetection";
import {
  X,
  Bell,
  Send,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({ isOpen, onClose }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [telegramChatId, setTelegramChatId] = useState<string>("");
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(false);
  const [telegramLoading, setTelegramLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{
    has_tested: boolean;
    ack_received: boolean;
    show_oem_warning: boolean;
  }>({ has_tested: false, ack_received: false, show_oem_warning: false });

  const [oemInfo, setOemInfo] = useState<OemInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const info = detectOemBrand();
    setOemInfo(info);

    if ("Notification" in window && Notification.permission === "granted") {
      setPushEnabled(true);
    }

    if (isLoaded && isSignedIn && isOpen) {
      loadStatus();
    }
  }, [isLoaded, isSignedIn, isOpen]);

  const loadStatus = async () => {
    try {
      const tg = await fetchTelegramStatus();
      setIsTelegramLinked(tg.is_linked);
      if (tg.chat_id) setTelegramChatId(tg.chat_id);

      const test = await fetchOnboardingTestStatus();
      setTestStatus(test);
    } catch (err) {
      console.warn("Error loading alert status:", err);
    }
  };

  const handleEnablePush = async () => {
    try {
      if (!("Notification" in window)) {
        setStatusMessage("Web Push is not supported by your browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatusMessage("Notification permission was denied.");
        return;
      }

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = await fetchVapidPublicKey();
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        await savePushSubscription(subscription);
        setPushEnabled(true);
        setStatusMessage("Web Push notifications enabled successfully!");
      }
    } catch (err: unknown) {
      setStatusMessage(`Push setup failed: ${(err as Error).message}`);
    }
  };

  const handleLinkTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramChatId.trim()) return;

    setTelegramLoading(true);
    setStatusMessage(null);
    try {
      await linkTelegramChat(telegramChatId.trim());
      setIsTelegramLinked(true);
      setStatusMessage("Telegram chat linked successfully!");
    } catch (err: unknown) {
      setStatusMessage(`Telegram link failed: ${(err as Error).message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTriggerTestAlert = async () => {
    setTestLoading(true);
    setStatusMessage(null);
    try {
      const res = await triggerOnboardingTest();
      setStatusMessage(res.message || "Test notification dispatched to your channels.");
      await loadStatus();
    } catch (err: unknown) {
      setStatusMessage(`Test trigger failed: ${(err as Error).message}`);
    } finally {
      setTestLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white border border-[#e6e6e6] shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-[#f7f7f7] border border-[#e6e6e6] text-[#6b6b6b] hover:text-[#262626] hover:bg-[#ebebeb] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2129] flex items-center justify-center text-white border border-[#262e38]">
            <Bell className="w-5 h-5 text-[#1c69d4]" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[1px] text-[#262626]">
              Alert Channels & Escalation
            </h2>
            <p className="text-xs font-light text-[#6b6b6b]">
              Guaranteed delivery for 11:59 PM deadlines and OA schedules.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] text-[#1c69d4] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Channel 1: Browser Web Push */}
        <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#1c69d4]" />
              <span className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                Browser Web Push
              </span>
            </div>
            {pushEnabled ? (
              <span className="px-2 py-0.5 bg-[#ecfdf5] border border-[#bbf7d0] text-[#15803d] text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[10px] font-bold uppercase tracking-wider">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs font-light text-[#6b6b6b]">
            Delivers instant notifications 24 hours and 3 hours prior to drive deadlines.
          </p>
          {!pushEnabled && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="px-3.5 py-1.5 bg-[#1c69d4] hover:bg-[#0653b6] text-white text-xs font-bold uppercase tracking-[0.5px] transition-colors cursor-pointer"
            >
              Enable Push Notifications
            </button>
          )}
        </div>

        {/* Channel 2: Telegram Bot Integration */}
        <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#0088cc]" />
              <span className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                Telegram Bot Escalation
              </span>
            </div>
            {isTelegramLinked ? (
              <span className="px-2 py-0.5 bg-[#ecfdf5] border border-[#bbf7d0] text-[#15803d] text-[10px] font-bold uppercase tracking-wider">
                Linked
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] text-[10px] font-bold uppercase tracking-wider">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs font-light text-[#6b6b6b]">
            If push notifications go unacknowledged, alerts automatically escalate to your Telegram.
          </p>
          <div className="text-[11px] text-[#6b6b6b] bg-white p-2.5 border border-[#e6e6e6] space-y-1">
            <div className="flex items-center justify-between">
              <span>1. Open our Telegram Bot:</span>
              <a
                href="https://t.me/PlacementTrackerBot"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#0088cc] hover:underline inline-flex items-center gap-0.5"
              >
                @PlacementTrackerBot <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>2. Type <code>/start</code> to receive your unique Chat ID.</div>
          </div>
          <form onSubmit={handleLinkTelegram} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter your Telegram Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-[#cccccc] text-xs text-[#262626] focus:outline-none focus:border-[#1c69d4]"
            />
            <button
              type="submit"
              disabled={telegramLoading || !telegramChatId.trim()}
              className="px-3.5 py-1.5 bg-[#262626] hover:bg-[#1a1a1a] text-white text-xs font-bold uppercase tracking-[0.5px] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {telegramLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
            </button>
          </form>
        </div>

        {/* Delivery Health Verification */}
        {testStatus.has_tested && (
          <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-xs flex items-center justify-between text-[#166534]">
            <span className="font-medium">Recent delivery test verified successfully.</span>
            <span className="text-[10px] uppercase font-bold font-mono">Verified</span>
          </div>
        )}

        {/* OEM Battery Warning */}
        {oemInfo && oemInfo.isAndroid && (
          <div className="p-3 bg-[#fffbeb] border border-[#fde68a] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#b45309]">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>OEM Battery Optimization Detected ({oemInfo.oemName})</span>
            </div>
            <p className="text-[11px] text-[#92400e] font-light leading-relaxed">
              {oemInfo.advice}
            </p>
          </div>
        )}

        {/* Test Alert Button */}
        <div className="pt-2 border-t border-[#e6e6e6] flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803d]" />
            <span>Encrypted webhooks & push keys</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerTestAlert}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f7f7f7] hover:bg-[#ebebeb] border border-[#cccccc] text-[#262626] text-xs font-bold uppercase tracking-[0.5px] transition-colors cursor-pointer"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1c69d4]" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#1c69d4]" />
            )}
            <span>Send Test Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
