import { useEffect, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import {
  loadExternalContentDecision,
  saveExternalContentDecision,
  type ExternalContentDecision,
  type PrivacyRegion,
} from "@/lib/external-content-preferences";

const COPY = {
  fi: {
    title: "Yksityisyysasetukset",
    section: "Ulkopuolinen opetussisältö",
    description:
      "Google Slides -esitykset voivat sisältää YouTube-palvelusta upotettuja videoita. Valintasi määrittää, saako selaimesi ladata tämän ulkopuolisen sisällön.",
    allowed: "Sallittu",
    rejected: "Ei sallittu",
    undecided: "Valintaa ei ole vielä tehty",
    allow: "Hyväksy ulkopuolinen sisältö",
    reject: "Peru hyväksyntä",
    saved: "Valinta tallennettu.",
    loading: "Ladataan…",
    error: "Asetuksen tallentaminen epäonnistui.",
  },
  en: {
    title: "Privacy settings",
    section: "External teaching content",
    description:
      "Google Slides presentations may contain videos embedded from YouTube. Your choice controls whether your browser may load this external content.",
    allowed: "Allowed",
    rejected: "Not allowed",
    undecided: "No choice has been made yet",
    allow: "Accept external content",
    reject: "Withdraw acceptance",
    saved: "Your choice has been saved.",
    loading: "Loading…",
    error: "The setting could not be saved.",
  },
  sv: {
    title: "Integritetsinställningar",
    section: "Externt undervisningsinnehåll",
    description:
      "Google Slides-presentationer kan innehålla videor inbäddade från YouTube. Ditt val avgör om webbläsaren får ladda detta externa innehåll.",
    allowed: "Tillåtet",
    rejected: "Inte tillåtet",
    undecided: "Inget val har gjorts ännu",
    allow: "Godkänn externt innehåll",
    reject: "Återkalla godkännandet",
    saved: "Ditt val har sparats.",
    loading: "Laddar…",
    error: "Inställningen kunde inte sparas.",
  },
} as const;

type Props = {
  userId: string | null;
  schoolId: string | null;
  privacyRegion: PrivacyRegion | null;
  preview?: boolean;
};

export function ExternalContentPrivacySettings({
  userId,
  schoolId,
  privacyRegion: _privacyRegion,
  preview = false,
}: Props) {
  const { language } = useLanguage();
  const text = COPY[language];
  const [decision, setDecision] = useState<ExternalContentDecision>("undecided");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The service-description rule applies to every production school. Region is
  // retained in the component contract for backwards compatibility, but it no
  // longer changes whether users can review/withdraw their consent.
  const visible = !preview && !!userId && !!schoolId;

  useEffect(() => {
    let cancelled = false;
    if (!visible || !userId || !schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadExternalContentDecision(userId, schoolId)
      .then((value) => {
        if (!cancelled) setDecision(value);
      })
      .catch((error) => {
        console.error("[external-content-settings]", error);
        if (!cancelled) setMessage(text.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, text.error, userId, visible]);

  if (!visible) return null;

  async function choose(allowed: boolean) {
    if (!userId || !schoolId) return;
    setSaving(true);
    setMessage(null);
    try {
      setDecision(await saveExternalContentDecision(userId, schoolId, allowed));
      setMessage(text.saved);
    } catch (error) {
      console.error("[external-content-settings-save]", error);
      setMessage(text.error);
    } finally {
      setSaving(false);
    }
  }

  const status =
    decision === "allowed" ? text.allowed : decision === "rejected" ? text.rejected : text.undecided;

  return (
    <StickyNote seed="external-content-privacy-settings" className="space-y-4">
      <div>
        <h3 className="text-xl font-bold">{text.title}</h3>
        <p className="mt-2 font-semibold">{text.section}</p>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed opacity-75">{text.description}</p>
      </div>

      <p className="text-sm">
        <span className="font-semibold">{status}</span>
      </p>

      {loading ? (
        <p className="text-sm opacity-70">{text.loading}</p>
      ) : (
        <button
          type="button"
          disabled={saving}
          className="rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black disabled:opacity-50"
          onClick={() => void choose(decision !== "allowed")}
        >
          {decision === "allowed" ? text.reject : text.allow}
        </button>
      )}

      {message && <p className="text-sm opacity-75">{message}</p>}
    </StickyNote>
  );
}