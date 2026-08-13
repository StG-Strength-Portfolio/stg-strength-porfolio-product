import { useEffect, useState, type ReactNode } from "react";
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
    title: "Ulkopuolinen sisältö ja yksityisyys",
    intro:
      "Opetusmateriaalit sisältävät Google Slides -esityksiä, joissa voi olla YouTube-palvelusta upotettuja videoita.",
    details:
      "Kun hyväksyt ulkopuolisen sisällön lataamisen, selaimesi muodostaa yhteyden Googlen palveluihin. Tällöin Googlelle ja YouTubelle voi välittyä esimerkiksi laitettasi, selaintasi ja verkkoyhteyttäsi koskevia tietoja, ja ne voivat käyttää evästeitä tai vastaavia teknologioita.",
    change:
      "Voit muuttaa valintaasi myöhemmin profiilisi yksityisyysasetuksissa.",
    allow: "Hyväksyn",
    reject: "En hyväksy",
    blockedTitle: "Opetusmateriaalit eivät ole käytettävissä",
    blocked:
      "Google Slides -sisältöä ei ladata ilman hyväksyntää. Strength Portfolion muut toiminnot ovat käytettävissä normaalisti.",
    changeChoice: "Muuta valintaa",
    back: "Takaisin",
    loading: "Ladataan yksityisyysasetuksia…",
    error: "Yksityisyysasetusten lataaminen epäonnistui. Yritä uudelleen.",
    retry: "Yritä uudelleen",
  },
  en: {
    title: "External content and privacy",
    intro:
      "Teaching Materials contains Google Slides presentations that may include videos embedded from YouTube.",
    details:
      "When you allow external content to load, your browser connects to Google services. Information such as details about your device, browser and network connection may be sent to Google and YouTube, and they may use cookies or similar technologies.",
    change: "You can change your choice later in Privacy settings in your profile.",
    allow: "I accept",
    reject: "I do not accept",
    blockedTitle: "Teaching Materials is not available",
    blocked:
      "Google Slides content is not loaded without your acceptance. The rest of Strength Portfolio remains available normally.",
    changeChoice: "Change my choice",
    back: "Back",
    loading: "Loading privacy settings…",
    error: "Privacy settings could not be loaded. Please try again.",
    retry: "Try again",
  },
  sv: {
    title: "Externt innehåll och integritet",
    intro:
      "Undervisningsmaterialet innehåller Google Slides-presentationer som kan innehålla videor inbäddade från YouTube.",
    details:
      "När du tillåter att externt innehåll laddas ansluter din webbläsare till Googles tjänster. Uppgifter om till exempel din enhet, webbläsare och nätverksanslutning kan då överföras till Google och YouTube, och de kan använda cookies eller liknande teknik.",
    change: "Du kan ändra ditt val senare i integritetsinställningarna i din profil.",
    allow: "Jag godkänner",
    reject: "Jag godkänner inte",
    blockedTitle: "Undervisningsmaterialet är inte tillgängligt",
    blocked:
      "Google Slides-innehåll laddas inte utan ditt godkännande. Resten av Strength Portfolio är fortfarande tillgängligt som vanligt.",
    changeChoice: "Ändra mitt val",
    back: "Tillbaka",
    loading: "Laddar integritetsinställningar…",
    error: "Integritetsinställningarna kunde inte laddas. Försök igen.",
    retry: "Försök igen",
  },
} as const;

type Props = {
  userId: string | null;
  schoolId: string | null;
  privacyRegion: PrivacyRegion | null;
  preview?: boolean;
  children: ReactNode;
};

export function ExternalTeachingContentGate({
  userId,
  schoolId,
  privacyRegion,
  preview = false,
  children,
}: Props) {
  const { language } = useLanguage();
  const text = COPY[language];
  const [decision, setDecision] = useState<ExternalContentDecision>("undecided");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const requiresConsent = !preview && privacyRegion === "eu_eea";

  async function load() {
    if (!requiresConsent) {
      setLoading(false);
      setFailed(false);
      return;
    }
    if (!userId || !schoolId) {
      setLoading(false);
      setFailed(true);
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      setDecision(await loadExternalContentDecision(userId, schoolId));
    } catch (error) {
      console.error("[external-content-gate]", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresConsent, userId, schoolId]);

  async function choose(allowed: boolean) {
    if (!userId || !schoolId) return;
    setSaving(true);
    setFailed(false);
    try {
      setDecision(await saveExternalContentDecision(userId, schoolId, allowed));
    } catch (error) {
      console.error("[external-content-gate-save]", error);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (!requiresConsent) return <>{children}</>;

  if (loading) {
    return (
      <StickyNote seed="external-content-loading">
        <p className="text-sm opacity-70">{text.loading}</p>
      </StickyNote>
    );
  }

  if (failed) {
    return (
      <StickyNote seed="external-content-error" className="space-y-4">
        <p>{text.error}</p>
        <button
          type="button"
          className="rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black"
          onClick={() => void load()}
        >
          {text.retry}
        </button>
      </StickyNote>
    );
  }

  if (decision === "allowed") return <>{children}</>;

  if (decision === "rejected") {
    return (
      <StickyNote seed="external-content-rejected" className="space-y-4">
        <h2 className="text-2xl font-bold">{text.blockedTitle}</h2>
        <p className="max-w-3xl leading-relaxed">{text.blocked}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black"
            onClick={() => setDecision("undecided")}
          >
            {text.changeChoice}
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-black bg-white px-5 py-2 font-bold text-black"
            onClick={() => window.history.back()}
          >
            {text.back}
          </button>
        </div>
      </StickyNote>
    );
  }

  return (
    <StickyNote seed="external-content-consent" className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">{text.title}</h2>
        <p className="max-w-3xl leading-relaxed">{text.intro}</p>
        <p className="max-w-3xl leading-relaxed">{text.details}</p>
        <p className="max-w-3xl text-sm leading-relaxed opacity-75">{text.change}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          className="min-w-40 rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black disabled:opacity-50"
          onClick={() => void choose(true)}
        >
          {text.allow}
        </button>
        <button
          type="button"
          disabled={saving}
          className="min-w-40 rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black disabled:opacity-50"
          onClick={() => void choose(false)}
        >
          {text.reject}
        </button>
      </div>
    </StickyNote>
  );
}
