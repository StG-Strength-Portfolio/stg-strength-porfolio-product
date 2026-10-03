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
      "Opetusmateriaalit näytetään Google Slides -palvelun kautta, ja esityksissä voi olla YouTube-palvelusta upotettuja videoita.",
    details:
      "Kun näytät opetusmateriaalit, selaimesi muodostaa yhteyden Googlen palveluihin. Tällöin Googlelle ja YouTubelle voi välittyä esimerkiksi laitettasi, selaintasi ja verkkoyhteyttäsi koskevia tietoja, ja ne voivat käyttää evästeitä tai vastaavia teknologioita.",
    change:
      "Valitsemalla ”Näytä opetusmateriaalit” hyväksyt tämän ulkopuolisen sisällön lataamisen. Voit muuttaa valintaasi myöhemmin profiilisi yksityisyysasetuksissa.",
    allow: "Näytä opetusmateriaalit",
    reject: "Älä näytä",
    blockedTitle: "Opetusmateriaaleja ei näytetä",
    blocked:
      "Olet valinnut, ettei Google Slides -sisältöä ladata. Strength Portfolion muut toiminnot ovat käytettävissä normaalisti.",
    changeChoice: "Muuta valintaa",
    back: "Takaisin",
    loading: "Ladataan yksityisyysasetuksia…",
    error: "Yksityisyysasetusten lataaminen epäonnistui. Yritä uudelleen.",
    missingSchool:
      "Opetusmateriaaleja ei voida avata, koska käyttäjätiliäsi ei ole liitetty kouluun. Ota yhteyttä koulusi ylläpitäjään.",
    retry: "Yritä uudelleen",
  },
  en: {
    title: "External content and privacy",
    intro:
      "Teaching Materials are shown through Google Slides and the presentations may include videos embedded from YouTube.",
    details:
      "When you show Teaching Materials, your browser connects to Google services. Information about your device, browser and network connection may be sent to Google and YouTube, and they may use cookies or similar technologies.",
    change:
      "By selecting “Show Teaching Materials”, you accept the loading of this external content. You can change your choice later in Privacy settings in your profile.",
    allow: "Show Teaching Materials",
    reject: "Do not show",
    blockedTitle: "Teaching Materials are not being shown",
    blocked:
      "You chose not to load Google Slides content. The rest of Strength Portfolio remains available normally.",
    changeChoice: "Change my choice",
    back: "Back",
    loading: "Loading privacy settings…",
    error: "Privacy settings could not be loaded. Please try again.",
    missingSchool:
      "Teaching Materials cannot be opened because your account is not linked to a school. Please contact your school administrator.",
    retry: "Try again",
  },
  sv: {
    title: "Externt innehåll och integritet",
    intro:
      "Undervisningsmaterialet visas via Google Slides, och presentationerna kan innehålla videor inbäddade från YouTube.",
    details:
      "När du visar undervisningsmaterialet ansluter din webbläsare till Googles tjänster. Uppgifter om din enhet, webbläsare och nätverksanslutning kan då överföras till Google och YouTube, och de kan använda cookies eller liknande teknik.",
    change:
      "Genom att välja ”Visa undervisningsmaterialet” godkänner du att detta externa innehåll laddas. Du kan ändra ditt val senare i integritetsinställningarna i din profil.",
    allow: "Visa undervisningsmaterialet",
    reject: "Visa inte",
    blockedTitle: "Undervisningsmaterialet visas inte",
    blocked:
      "Du har valt att Google Slides-innehåll inte ska laddas. Resten av Strength Portfolio är fortfarande tillgängligt som vanligt.",
    changeChoice: "Ändra mitt val",
    back: "Tillbaka",
    loading: "Laddar integritetsinställningar…",
    error: "Integritetsinställningarna kunde inte laddas. Försök igen.",
    missingSchool:
      "Undervisningsmaterialet kan inte öppnas eftersom ditt konto inte är kopplat till en skola. Kontakta skolans administratör.",
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
  const [missingContext, setMissingContext] = useState(false);

  // Only an explicitly configured U.S. school bypasses the European consent gate.
  // Unknown/missing school context fails closed so Google content never loads by accident.
  const requiresConsent = !preview && privacyRegion !== "us";

  async function load() {
    if (!requiresConsent) {
      setLoading(false);
      setFailed(false);
      setMissingContext(false);
      return;
    }
    if (!userId || !schoolId) {
      setLoading(false);
      setFailed(false);
      setMissingContext(true);
      return;
    }

    setLoading(true);
    setFailed(false);
    setMissingContext(false);
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

  if (missingContext) {
    return (
      <StickyNote seed="external-content-missing-school" className="space-y-4">
        <p className="max-w-3xl leading-relaxed">{text.missingSchool}</p>
        <button
          type="button"
          className="rounded-full border-2 border-black bg-white px-5 py-2 font-bold text-black"
          onClick={() => window.history.back()}
        >
          {text.back}
        </button>
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
        <p className="max-w-3xl text-sm font-semibold leading-relaxed">{text.change}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          className="min-w-48 rounded-full border-2 border-black bg-[color:var(--yellow)] px-5 py-2 font-bold text-black disabled:opacity-50"
          onClick={() => void choose(true)}
        >
          {text.allow}
        </button>
        <button
          type="button"
          disabled={saving}
          className="min-w-48 rounded-full border-2 border-black bg-white px-5 py-2 font-bold text-black disabled:opacity-50"
          onClick={() => void choose(false)}
        >
          {text.reject}
        </button>
      </div>
    </StickyNote>
  );
}
