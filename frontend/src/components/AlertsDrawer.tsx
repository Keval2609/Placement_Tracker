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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        setStatusMessage("Web Push notifications enabled successfully.");
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
      setStatusMessage("Telegram linked successfully!");
      await loadStatus();
    } catch (err: unknown) {
      setStatusMessage(`Failed linking Telegram: ${(err as Error).message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTriggerTestAlert = async () => {
    setTestLoading(true);
    setStatusMessage(null);
    try {
      const res = await triggerOnboardingTest();
      setStatusMessage(res.message || "Test alerts triggered across all connected channels!");
      await loadStatus();
    } catch (err: unknown) {
      setStatusMessage(`Test trigger failed: ${(err as Error).message}`);
    } finally {
      setTestLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close notification settings"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bmw-surface-dark flex items-center justify-center text-white border border-neutral-800 rounded-lg">
            <Bell className="w-5 h-5 text-bmw-primary" />
          </div>
          <div>
            <h2 id="alerts-drawer-title" className="text-lg font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Alert Channels & Escalation
            </h2>
            <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
              Guaranteed delivery for 11:59 PM deadlines and OA schedules.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-bmw-primary dark:text-blue-400 text-xs font-medium rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Channel 1: Browser Web Push */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-bmw-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Browser Web Push
              </span>
            </div>
            {pushEnabled ? (
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-sm">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
            Delivers instant notifications 24 hours and 3 hours prior to drive deadlines.
          </p>
          {!pushEnabled && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="px-3.5 py-1.5 bg-bmw-primary hover:bg-bmw-primary-active text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
            >
              Enable Push Notifications
            </button>
          )}
        </div>

        {/* Channel 2: Telegram Bot Integration */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Telegram Bot Escalation
              </span>
            </div>
            {isTelegramLinked ? (
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                Linked
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
            If push notifications go unacknowledged, alerts automatically escalate to your Telegram.
          </p>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-800 p-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span>1. Open our Telegram Bot:</span>
              <a
                href="https://t.me/PlacementTrackerBot"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
              >
                @PlacementTrackerBot <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>2. Type <code>/start</code> to receive your unique Chat ID.</div>
          </div>
          <form onSubmit={handleLinkTelegram} className="flex gap-2">
            <input
              type="text"
              aria-label="Telegram Chat ID"
              placeholder="Enter your Telegram Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-bmw-primary focus:border-bmw-primary font-mono"
            />
            <button
              type="submit"
              disabled={telegramLoading || !telegramChatId.trim()}
              className="px-3.5 py-1.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-md text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
            >
              {telegramLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
            </button>
          </form>
        </div>

        {/* Delivery Health Verification */}
        {testStatus.has_tested && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Recent delivery test verified successfully.</span>
            <span className="text-[11px] uppercase font-bold font-mono">Verified</span>
          </div>
        )}

        {/* OEM Battery Warning */}
        {oemInfo && oemInfo.isAndroid && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>OEM Battery Optimization Detected ({oemInfo.oemName})</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-300/80 font-normal leading-relaxed">
              {oemInfo.advice}
            </p>
          </div>
        )}

        {/* Test Alert Button */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted webhooks & push keys</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerTestAlert}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-bmw-primary" />
            ) : (
              <Send className="w-3.5 h-3.5 text-bmw-primary" />
            )}
            <span>Send Test Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
