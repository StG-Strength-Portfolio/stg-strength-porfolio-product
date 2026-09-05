import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendPasswordResetEmail } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";

const RESEND_COOLDOWN_SECONDS = 60;

const FORGOT_PASSWORD_COPY = {
  fi: {
    title: "Salasanan palautus",
    sent: "Jos sähköposti löytyy järjestelmästä, palautuslinkki on lähetetty.",
    resend: "Lähetä uudelleen",
    email: "Sähköpostiosoitteesi",
    send: "Lähetä palautuslinkki",
    sending: "Lähetetään…",
    close: "Sulje",
  },
  en: {
    title: "Password Reset",
    sent: "If the email exists in the system, a reset link has been sent.",
    resend: "Send again",
    email: "Email address",
    send: "Send reset link",
    sending: "Sending…",
    close: "Close",
  },
  sv: {
    title: "Återställ lösenord",
    sent: "Om e-postadressen finns i systemet har en återställningslänk skickats.",
    resend: "Skicka igen",
    email: "E-postadress",
    send: "Skicka återställningslänk",
    sending: "Skickar…",
    close: "Stäng",
  },
} as const;

/**
 * Forgot-password dialog. Shared by the regular login page and the Super
 * Admin login page — pass `source="superadmin"` so the eventual reset link
 * routes back into the Super Admin surface instead of the regular one.
 */
export function ForgotPasswordDialog({
  onClose,
  source,
}: {
  onClose: () => void;
  source?: "superadmin";
}) {
  const { language } = useLanguage();
  const copy = FORGOT_PASSWORD_COPY[language];

  const sendPasswordReset = useServerFn(sendPasswordResetEmail);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const id = setTimeout(() => {
      setCooldown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendResetEmail() {
    if (busy || cooldown > 0 || !email.trim()) return;

    setBusy(true);

    try {
      await sendPasswordReset({
        data: {
          email: email.trim(),
          language,
          source,
        },
      });
    } catch (error) {
      /*
       * Do not reveal whether:
       * - the email exists,
       * - Supabase generated the link,
       * - or the email provider encountered an error.
       *
       * The user always receives the same generic response.
       */
      console.warn("[forgot-password]", error);
    } finally {
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <h2 id="forgot-password-title" className="font-display text-xl">
          {copy.title}
        </h2>

        {sent ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm">{copy.sent}</p>

            <button
              type="button"
              onClick={() => void sendResetEmail()}
              disabled={cooldown > 0 || busy}
              className="text-xs font-semibold text-[color:var(--purple)] underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
            >
              {copy.resend}
              {cooldown > 0 ? ` (${cooldown}s)` : ""}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendResetEmail();
            }}
            className="mt-4 space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">{copy.email}</Label>

              <Input
                id="forgot-email"
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {busy ? copy.sending : copy.send}
            </Button>
          </form>
        )}

        <Button
          variant="ghost"
          className="mt-3 w-full rounded-full"
          onClick={onClose}
        >
          {copy.close}
        </Button>
      </div>
    </div>
  );
}
