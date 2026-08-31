import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

const WARNING_MS = 28 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000;
const LAST_ACTIVITY_KEY = "strength-portfolio:last-activity";
const CHANNEL_NAME = "strength-portfolio:idle";

const WARNING_COPY = {
  fi: "Istuntosi päättyy 2 minuutin kuluttua käyttämättömyyden vuoksi. Jatka työskentelyä pysyäksesi kirjautuneena.",
  en: "Your session will end in 2 minutes due to inactivity. Continue working to stay signed in.",
  sv: "Din session avslutas om 2 minuter på grund av inaktivitet. Fortsätt arbeta för att förbli inloggad.",
} as const;

type IdleMessage = { type: "activity"; at: number } | { type: "logout" };

function readLastActivity(): number {
  try {
    const value = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  } catch {
    return Date.now();
  }
}

export function useIdleLogout() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout> | undefined;
    let logoutTimer: ReturnType<typeof setTimeout> | undefined;
    let warningToastId: string | number | undefined;
    let lastWriteAt = 0;
    let loggingOut = false;
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

    const clearTimers = () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      warningTimer = undefined;
      logoutTimer = undefined;
    };

    const dismissWarning = () => {
      if (warningToastId !== undefined) toast.dismiss(warningToastId);
      warningToastId = undefined;
    };

    const logout = async (broadcast = true) => {
      if (loggingOut) return;
      loggingOut = true;
      clearTimers();
      dismissWarning();
      if (broadcast) channel?.postMessage({ type: "logout" } satisfies IdleMessage);
      try {
        await supabase.auth.signOut();
      } finally {
        navigate({
          to: "/auth",
          search: { idle: "1" } as never,
          replace: true,
        });
      }
    };

    const showWarning = () => {
      if (warningToastId !== undefined) return;
      warningToastId = toast.warning(WARNING_COPY[language], {
        duration: IDLE_MS - WARNING_MS,
      });
    };

    const scheduleFrom = (lastActivity: number) => {
      clearTimers();
      const idleFor = Math.max(0, Date.now() - lastActivity);
      if (idleFor >= IDLE_MS) {
        void logout();
        return;
      }

      if (idleFor >= WARNING_MS) {
        showWarning();
      } else {
        dismissWarning();
        warningTimer = setTimeout(showWarning, WARNING_MS - idleFor);
      }
      logoutTimer = setTimeout(() => void logout(), IDLE_MS - idleFor);
    };

    const publishActivity = (at: number) => {
      try {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
      } catch {
        // Private browsing/storage restrictions still keep the current tab safe.
      }
      channel?.postMessage({ type: "activity", at } satisfies IdleMessage);
    };

    const recordActivity = () => {
      if (loggingOut) return;
      const now = Date.now();
      // Any real activity resets the local timers immediately. Persist/broadcast
      // at a lower rate so mousemove does not continuously write to storage.
      dismissWarning();
      scheduleFrom(now);
      if (now - lastWriteAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastWriteAt = now;
        publishActivity(now);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_KEY || !event.newValue) return;
      const at = Number(event.newValue);
      if (Number.isFinite(at) && at > 0) {
        dismissWarning();
        scheduleFrom(at);
      }
    };

    const onMessage = (event: MessageEvent<IdleMessage>) => {
      if (event.data?.type === "activity") {
        dismissWarning();
        scheduleFrom(event.data.at);
      } else if (event.data?.type === "logout") {
        void logout(false);
      }
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    if (channel) channel.onmessage = onMessage;

    const initialActivity = readLastActivity();
    // If the persisted timestamp belongs to a previous signed-in session and is
    // already older than the timeout, start this newly mounted session at now.
    const initial = Date.now() - initialActivity >= IDLE_MS ? Date.now() : initialActivity;
    lastWriteAt = initial;
    publishActivity(initial);
    scheduleFrom(initial);

    return () => {
      clearTimers();
      dismissWarning();
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [language, navigate]);
}