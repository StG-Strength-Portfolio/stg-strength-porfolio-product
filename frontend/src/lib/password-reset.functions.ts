import { createServerFn } from "@tanstack/react-start";
import type { Language } from "@/lib/i18n";
import {
  domainBrandName,
  registrationDomainForHostname,
} from "@/lib/domain-language";

type PasswordResetInput = {
  email: string;
  language: Language;
  source?: "superadmin";
};

const TEMPLATE_BY_LANGUAGE: Record<Language, string> = {
  fi: "password-reset-finnish",
  en: "password-reset-english",
  sv: "password-reset-swedish",
};

const SUBJECT_BY_LANGUAGE: Record<Language, string> = {
  fi: "Nollaa salasanasi",
  en: "Reset your password",
  sv: "Återställ ditt lösenord",
};

const DEFAULT_DOMAIN = "strengthportfolio.com";
const RESET_COOLDOWN_SECONDS = 60;

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  return supabaseAdmin;
}

function getResendApiKey(): string | undefined {
  const cfEnv = (
    globalThis as {
      __env__?: Record<string, string | undefined>;
    }
  ).__env__;

  return cfEnv?.RESEND_API_KEY || process.env.RESEND_API_KEY;
}

function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const host =
    forwardedHost ||
    request.headers.get("host") ||
    DEFAULT_DOMAIN;

  return host.split(":")[0].trim().toLowerCase();
}

function normalizeLanguage(value: unknown): Language {
  if (value === "fi" || value === "sv" || value === "en") {
    return value;
  }

  return "en";
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const sendPasswordResetEmail = createServerFn({
  method: "POST",
})
  .inputValidator((input: PasswordResetInput) => ({
    email:
      typeof input.email === "string"
        ? input.email.trim().toLowerCase()
        : "",
    language: normalizeLanguage(input.language),
    source:
      input.source === "superadmin"
        ? ("superadmin" as const)
        : undefined,
  }))
  .handler(async ({ data }) => {
    const { email, language, source } = data;

    // Always return the same public response so we do not reveal
    // whether an account exists.
    const genericSuccess = {
      ok: true as const,
    };

    if (!email || !looksLikeEmail(email)) {
      return genericSuccess;
    }

    const { getRequest } = await import(
      "@tanstack/react-start/server"
    );

    const request = getRequest();

    const hostname = request
      ? getRequestHostname(request)
      : DEFAULT_DOMAIN;

    /*
     * DOMAIN controls:
     * - sender brand
     * - domain the user returns to
     *
     * LANGUAGE controls:
     * - Resend template
     * - reset-page language
     */
    const domain =
      registrationDomainForHostname(hostname) ??
      DEFAULT_DOMAIN;

    const brandName =
      domainBrandName(domain) ??
      "Strength Portfolio";

    const returnUrl = new URL(
      `https://${domain}/reset-password`,
    );

    returnUrl.searchParams.set("lang", language);

    if (source === "superadmin") {
      returnUrl.searchParams.set(
        "source",
        "superadmin",
      );
    }

    const db = await admin();

    /*
     * Server-side cooldown.
     */
    try {
      const since = new Date(
        Date.now() -
          RESET_COOLDOWN_SECONDS * 1000,
      ).toISOString();

      const { data: recentEmail } = await db
        .from("email_log")
        .select("id")
        .eq("template_key", "password_reset")
        .eq("recipient_email", email)
        .eq("status", "sent")
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();

      if (recentEmail) {
        return genericSuccess;
      }
    } catch (error) {
      console.warn(
        "[password-reset] cooldown check failed",
        error,
      );
    }

    /*
     * Supabase creates the secure recovery link.
     * Supabase does not send the email here.
     */
    const {
      data: linkData,
      error: linkError,
    } = await db.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: returnUrl.toString(),
      },
    });

    if (
      linkError ||
      !linkData?.properties?.action_link
    ) {
      if (linkError) {
        console.warn(
          "[password-reset] recovery link not generated",
          linkError.message,
        );
      }

      return genericSuccess;
    }

    const resetLink =
      linkData.properties.action_link;

    const resendApiKey = getResendApiKey();

    if (!resendApiKey) {
      console.error(
        "[password-reset] Missing RESEND_API_KEY",
      );

      return genericSuccess;
    }

    const templateId =
      TEMPLATE_BY_LANGUAGE[language];

    const subject =
      SUBJECT_BY_LANGUAGE[language];

    /*
     * Template follows the selected language.
     * Sender branding follows the domain.
     */
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${brandName} <noreply@strengthportfolio.com>`,
          to: [email],
          template: {
            id: templateId,
            variables: {
              RESET_LINK: resetLink,
            },
          },
        }),
      },
    );

    if (!resendResponse.ok) {
      const errorText =
        await resendResponse.text();

      console.error(
        "[password-reset] Resend failed",
        resendResponse.status,
        errorText,
      );

      try {
        await db.from("email_log").insert({
          template_key: "password_reset",
          recipient_email: email,
          recipient_id:
            linkData.user?.id ?? null,
          language,
          subject,
          status: "error",
          error_message: `Resend ${resendResponse.status}`,
        });
      } catch (logError) {
        console.warn(
          "[password-reset] error log failed",
          logError,
        );
      }

      return genericSuccess;
    }

    try {
      await db.from("email_log").insert({
        template_key: "password_reset",
        recipient_email: email,
        recipient_id:
          linkData.user?.id ?? null,
        language,
        subject,
        status: "sent",
        error_message: null,
      });
    } catch (logError) {
      console.warn(
        "[password-reset] sent log failed",
        logError,
      );
    }

    return genericSuccess;
  });