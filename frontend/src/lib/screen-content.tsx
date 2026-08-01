import { useEffect, useState, type ReactNode } from "react";
import { StickyNote } from "@/components/StickyNote";
import { WORLDS } from "@/lib/screens";
import { ReflectionTextarea, ReflectionInput } from "@/components/ReflectionTextarea";
import { SelectableChips } from "@/components/SelectableChips";
import { useAutosave, loadResponse, type SaveState } from "@/hooks/use-autosave";
import { useReportCompletion } from "@/lib/screen-completion";
import { cn } from "@/lib/utils";
import { useTr, useLanguage } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";


// Screens 1–22: content sourced verbatim from the workbook PDF
// "Vahvuusportfolio lukiolaiselle" (Huomaa hyvä!®).

export const STRENGTHS_24 = [
  "Rohkeus", "Luovuus", "Innostus", "Reiluus",
  "Sisukkuus", "Myötätunto", "Huumorintaju", "Ystävällisyys",
  "Kauneuden ja erinomaisuuden arvostus", "Oppimisen ilo", "Rehellisyys",
  "Sosiaalinen älykkyys", "Sinnikkyys", "Kiitollisuus", "Henkisyys",
  "Johtajuus", "Toiveikkuus", "Anteeksiantavuus", "Arviointikyky",
  "Uteliaisuus", "Itsesäätely", "Rakkaus", "Näkökulmanottokyky",
  "Harkitsevaisuus", "Vaatimattomuus", "Ryhmätyötaidot",
];

type Props = { onSaveStateChange?: (s: SaveState) => void };

function Cover() {
  const tr = useTr();
  return (
    <div className="space-y-5">
      <StickyNote tone="yellow" seed="s1-cover" className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Huomaa hyvä!®</div>
        <h1 className="font-display text-4xl leading-tight mb-3">{tr("Vahvuusportfolio lukiolaiselle")}</h1>
        <div className="text-4xl mb-3">🐈‍⬛ 🏀 📚 💻</div>
        <p className="text-base leading-relaxed">
          {tr("Tervetuloa vahvuusseikkailuun! Tällä matkalla opit tunnistamaan, kehittämään ja hyödyntämään omia vahvuuksiasi — lukiossa, kotona, vapaa-ajalla ja ystävien kanssa.")}
        </p>
      </StickyNote>
      <StickyNote seed="s1-howto" tone="white">
        <p className="text-sm leading-relaxed">
          {tr("Etene näytöstä toiseen alalaidan nuolilla. Vastauksesi tallentuvat automaattisesti — voit aina jatkaa siitä, mihin jäit. Aloita painamalla Seuraava →.")}
        </p>
      </StickyNote>
    </div>
  );
}

function Modules() {
  const tr = useTr();
  const modules = WORLDS.filter((w) => w.id.startsWith("m"));
  const blurbs: Record<string, string> = {
    m1: "Tutustut ja opit omista luonteenvahvuuksista.",
    m2: "Tutustut henkilökohtaisiin vahvuuksiin opiskelijana. Opit kysymään palautetta opettajilta ja opiskelukavereilta.",
    m3: "Tutustut henkilökohtaisiin vahvuuksiin kotona. Myös vanhemmat / läheiset kertovat sinun vahvuuksistasi.",
    m4: "Tutustut omiin vahvuuksiin ja niiden hyödyntämiseen vapaa-ajalla.",
    m5: "Tutustut omiin vahvuuksiin ystävyyssuhteissa. Opit kysymään ja antamaan palautetta.",
    m6: "Reflektoi oppimaasi ja hyödynnä omia vahvuuksiasi esimerkiksi kesätyönhaussa.",
  };
  const titles: Record<string, string> = {
    m1: "Omat ydinvahvuudet",
    m2: "Omat vahvuudet lukiossa",
    m3: "Omat vahvuudet kotona",
    m4: "Omat vahvuudet vapaa-ajalla ja harrastuksissa",
    m5: "Omat vahvuudet ystävyyssuhteissa",
    m6: "Vahvuusportfolion kokoaminen",
  };
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s2-intro">
        <h1 className="font-display text-3xl mb-1">{tr("Tasot")}</h1>
        <p className="text-sm opacity-90">{tr("Seikkailu kulkee kuuden moduulin läpi. Tässä on yleiskuva siitä, mitä edessä on.")}</p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((w, i) => (
          <StickyNote key={w.id} seed={`mod-${w.id}`} tone={mapTone(w.tone)}>
            <div className="text-xs font-bold opacity-70">{tr(`Taso ${i + 1}`)}</div>
            <div className="font-display text-lg leading-tight mb-1">{tr(titles[w.id])}</div>
            <p className="text-xs leading-snug opacity-90">{tr(blurbs[w.id])}</p>
          </StickyNote>
        ))}
      </div>
    </div>
  );
}

function mapTone(tone: string): "white" | "yellow" | "mint" | "coral" {
  if (tone === "yellow" || tone === "mint" || tone === "coral") return tone;
  return "white";
}

function Quote() {
  const tr = useTr();
  return (
    <div className="space-y-5">
      <StickyNote tone="coral" seed="s3-q" className="text-center">
        <div className="text-sm italic mb-2 opacity-90">{tr("Panosta vahvuuksiisi.")}</div>
        <h1 className="font-display text-3xl leading-tight">
          {tr("Kasvat eniten niillä alueilla, joilla olet jo vahva.")}
        </h1>
        <div className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1 text-sm">
          {tr("MYÖTÄTUNTO 1000 kg")} 💛
        </div>
      </StickyNote>
      <p className="text-center text-xs opacity-70">Huomaa hyvä!®</p>
    </div>
  );
}

function Definition() {
  const tr = useTr();
  return (
    <StickyNote tone="mint" seed="s4-def">
      <h1 className="font-display text-2xl mb-3">{tr("Mitä vahvuudet ovat?")}</h1>
      <p className="text-base leading-relaxed mb-3">
        {tr("Vahvuudet eivät ole asioita tai ominaisuuksia, joissa olet hyvä — eivätkä heikkoudet niitä, joissa tunnet itsesi huonoksi.")}
      </p>
      <p className="text-base leading-relaxed">
        {tr("Sen sijaan vahvuudet tekevät kantajastaan vahvan, ja heikkoudet toimivat päinvastoin.")}
      </p>
    </StickyNote>
  );
}

function Tieto({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s5-info">
        <h1 className="font-display text-2xl mb-2">{tr("Tietoa vahvuuksista")}</h1>
        <p className="text-sm leading-relaxed mb-2">
          {tr("Luonteenvahvuudet ovat persoonan myönteisiä piirteitä, joita hyödyntämällä sinä, opiskelukaverisi ja yhteisösi voivat kukoistaa. Niitä ovat esimerkiksi sinnikkyys, uteliaisuus, rohkeus ja myötätuntoisuus. Jokaisella opiskelijalla on vahvuuksia ja kehittymässä olevaa vahvuuspotentiaalia.")}
        </p>
        <p className="text-sm leading-relaxed mb-2">
          {tr("Vahvuudet auttavat haasteiden kohtaamisessa. Taidot ovat opittuja, kun taas vahvuudet ovat itselle luontaisia ja tärkeitä ajattelu- ja toimintatapoja.")}
        </p>
        <p className="text-sm leading-relaxed">
          {tr("Jokaisella on omat ydinvahvuutensa, joihin kannattaa keskittyä ja joita on järkevää vahvistaa. Omien vahvuuksien tunteminen lisää tyytyväisyyttä, opiskelun mielekkyyttä ja hyvinvointia.")}
        </p>
        <p className="mt-3 font-display text-lg">{tr("Tervetuloa mukaan, lukiolainen!")}</p>
      </StickyNote>
      <StickyNote seed="s5-reflect" tone="white">
        <ReflectionTextarea
          fieldKey="screen_5_first_impression"
          label={tr("Mikä tästä jäi mieleen? (vapaaehtoinen)")}
          placeholder={tr("Kirjoita muutama ajatus…")}
          onSaveStateChange={onSaveStateChange}
        />
      </StickyNote>
    </div>
  );
}

function StrengthsList({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s6-h">
        <h1 className="font-display text-2xl mb-1">
          {tr("Luonteenvahvuudet, joita voit tunnistaa itsessäsi ja toisissa")}
        </h1>
        <p className="text-sm opacity-90">
          {tr("Valitse ne vahvuudet, jotka tunnistat itsessäsi tai läheisissäsi. Voit palata muokkaamaan valintaasi myöhemmin.")}
        </p>
      </StickyNote>
      <div className="rounded-3xl bg-white/10 p-4">
        <SelectableChips
          fieldKey="screen_6_known_strengths"
          options={STRENGTHS_24}
          labelFor={(o) => tr(o)}
          onSaveStateChange={onSaveStateChange}
          min={1}
        />
      </div>
    </div>
  );
}

// S7 (PDF p7): only three short phrases on the page. No invented blurbs.
function ThreeSteps() {
  const tr = useTr();
  const steps = [
    { t: "Tunnista omia vahvuuksia", tone: "yellow" as const },
    { t: "Kehitä omia vahvuuksia",   tone: "mint" as const },
    { t: "Hyödynnä omia vahvuuksia", tone: "coral" as const },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <StickyNote key={s.t} tone={s.tone} seed={`s7-${s.t}`} className="text-center">
          <div className="font-display text-xl">{tr(s.t)}</div>
        </StickyNote>
      ))}
    </div>
  );
}

function JokoTunnet({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    { k: "s8_love", q: "Tiedätkö, mitä rakastat tehdä?" },
    { k: "s8_motivate", q: "Minkä alkamista odotat? Mistä koulutehtävistä motivoidut eniten?" },
    { k: "s8_freetime", q: "Mitkä ovat kiinnostuksen kohteesi vapaa-ajalla?" },
    { k: "s8_authentic", q: "Milloin koet olevasi aidoimmillasi ja onnistut sinulle tärkeissä asioissa?" },
    { k: "s8_persist", q: "Mitä tehdessä jaksat ponnistella sinnikkäästi ja ylittää haasteita?" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s8-h">
        <h1 className="font-display text-2xl mb-1">{tr("Lukiolainen — joko tunnet omat vahvuutesi?")}</h1>
        <p className="text-sm opacity-90">{tr("Pohdi alla olevia kysymyksiä. Vastaa omin sanoin.")}</p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q) => (
          <ReflectionTextarea
            key={q.k}
            fieldKey={`screen_8_${q.k}`}
            label={tr(q.q)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

function KysyPalautetta({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s9-h">
        <h1 className="font-display text-2xl mb-1">{tr("Kysy palautetta")}</h1>
        <p className="text-sm opacity-90">
          {tr("Valitse 2–4 sinulle tärkeää henkilöä — läheinen, opettaja tai ystävä — jonka palautetta arvostat. Pyydä viestillä palautetta seuraavista lauseista ja täydennä saamasi vastaukset tähän.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReflectionTextarea fieldKey="screen_9_best_sides" label={tr("Parhaita puoliani ovat:")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_9_strengths" label={tr("Vahvuuksiani ovat mielestäni:")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_9_learned" label={tr("Olen oppinut sinulta seuraavia asioita:")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_9_spotted" label={tr("Olen bongannut niitä erityisesti kun:")} rows={3} onSaveStateChange={onSaveStateChange} />
      </div>
    </div>
  );
}

function MinaOlen({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s10-h">
        <h1 className="font-display text-2xl mb-1">{tr("Minä olen")}</h1>
        <p className="text-sm opacity-90">
          {tr("Muuta muilta saamasi palaute lauseiksi minä-muotoon. “Olet sinnikäs.” → “Minä olen sinnikäs.”")}
        </p>
      </StickyNote>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <ReflectionInput
            key={i}
            fieldKey={`screen_10_mina_olen_${i + 1}`}
            prefix={tr("Minä olen")}
            placeholder="…"
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}


// S11 (PDF p15): pure title card.
function M1Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="coral" seed="s11-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 1")}</div>
      <h1 className="font-display text-4xl leading-tight">1. {tr("Omat ydinvahvuudet")}</h1>
    </StickyNote>
  );
}

// ----- S12: Ydinvahvuuksien karkkikauppa (PDF p16–17) -----

// 26 statements verbatim from PDF p16 (preserves capitalisation and the
// "VAIKKA VAIKKA" repetition that appears in the source).
const KARKKIKAUPPA_STATEMENTS: string[] = [
  "SAAN USEIN KUULLA TOISILTA, ETTÄ KEKSIN OMAPERÄISIÄ IDEOITA",
  "HALUAN JATKUVASTI OPPIA UUTTA JA OLEN LAAJALTI KIINNOSTUNUT ASIOISTA, IHMISISTÄ, ILMIOISTÄ.",
  "PUOLUSTAN MIELIPIDETTÄNI JA USKALLAN KERTOA, MITÄ AJATTELEN, VAIKKA KOHTAISIN JYRKKÄÄKIN VASTUSTUSTA.",
  "JOS PÄÄTÄN JOTAIN, TEEN SEN, VAIKKA HAASTEITA JA VASTOINKÄYMISIÄ ILMENISI.",
  "OSOITAN LÄHEISILLENI VÄLITTÄMISTÄNI SANOIN, TEOIN JA VIETTÄMÄLLÄ PALJON AIKAA HEIDÄN KANSSAAN.",
  "MINULLE ON TÄRKEÄÄ KOHDELLA KAIKKIA TASAPUOLISESTI.",
  "TEEN AINA HARKITTUJA PÄÄTÖKSIÄ.",
  "PYSTYN SÄÄTELEMÄÄN TUNTEITANI JA KÄYTÖSTÄNI TILANTEISIIN SOPIVAKSI.",
  "HUOMAAN KAUNIITA YKSITYISKOHTIA JA PYSÄHDYN USEIN NIIDEN ÄÄRELLÄ.",
  "TEEN PÄÄTÖKSIÄ VASTA KUN TIEDÄN ASIASTA KAIKEN",
  "OLEN KIINNOSTUNUT LUKUISISTA ASIOISTA JA HALUAN JATKUVASTI OPPIA UUTTA.",
  "MINULTA PYYDETÄÄN USEIN NEUVOJA JA KOEN ETTÄ MIELIPITEITÄNI ARVOSTETAAN.",
  "PUHUN KAUNISTELEMATTA SEN PUOLESTA, MIKÄ ON MIELESTÄNI OIKEIN JA TOTTA.",
  "YSTÄVÄNI KUVAILISIVAT MINUA ENERGISEKSI, TARMOKKAAKSI JA HYVÄNTUULISEKSI.",
  "TEEN MITÄ TEHDÄ PITÄÄ, VAIKKA VAIKKA VASTOINKÄYMISIÄ ILMENISI.",
  "YKSI ELÄMÄÄNI ENITEN MERKITYSTÄ TUOVISTA ASIOISTA ON MUIDEN IHMISTEN AUTTAMINEN.",
  "OLEN MIELELLÄNI AVUKSI TAI HYÖDYKSI.",
  "PÄRJÄÄN HYVIN ERILAISISSA SOSIAALISISSA TILANTEISSA JA UUSIEN IHMISTEN PARISSA.",
  "PARHAAT PUOLENI PÄÄSEVÄT KÄYTTÖÖN RYHMÄSSÄ, JA MINUA MOTIVOI RYHMÄN ONNISTUMINEN.",
  "MINUA VOISI KUVAILLA VAHVAKSI JA REILUKSI JOHTAJAKSI.",
  "EN KAIVELE MENNEITÄ VAAN MINUN ON HELPPO IRROTTAUTUA NIISTÄ JA MENNÄ ELÄMÄSSÄ ETEENPÄIN.",
  "EN TEE ITSESTÄNI NUMEROA MISSÄÄN TILANTEISSA JA PITÄYDYN MIELELLÄNI TAUSTALLA.",
  "PERHEENI KERTOISI, ETTÄ KIITÄN USEIN JA OLEN VILPITTÖMÄSTI KIITOLLINEN.",
  "MINUN ON HELPPOA NÄHDÄ ASIOISSA NIIDEN HYVÄT PUOLET JA NÄEN TULEVAISUUDEN MYÖNTEISENÄ.",
  "LÖYDÄN VAIKEISTAKIN ELÄMÄNTILANTEISTA HUUMORIA JA PIENIÄ ILON PILKAHDUKSIA.",
  "AJATTELEN, ETTÄ ELÄMÄLLÄ ON JOKIN SYVEMPI TARKOITUS.",
];

// 26 strength names from PDF p17, in the same order. Hyphenated OCR
// line-wraps de-hyphenated (e.g. "ARVIOIN-TIKYKY" -> "ARVIOINTIKYKY").
const KARKKIKAUPPA_STRENGTHS: string[] = [
  "LUOVUUS", "UTELIAISUUS", "ARVIOINTIKYKY", "OPPIMISEN ILO",
  "NÄKÖKULMANOTTOKYKY", "ROHKEUS", "SINNIKKYYS", "REHELLISYYS",
  "INNOKKUUS", "SISUKKUUS", "MYÖTÄTUNTO", "RAKKAUS", "YSTÄVÄLLISYYS",
  "SOSIAALINEN ÄLYKKYYS", "RYHMÄTYÖTAITO", "REILUUS", "JOHTAJUUS",
  "ANTEEKSIANTAVUUS", "VAATIMATTOMUUS", "HARKITSEVUUS", "ITSESÄÄTELY",
  "KAUNEUDEN JA ERINOMAISUUDEN ARVOSTAMINEN", "KIITOLLISUUS",
  "TOIVEIKKUUS", "HUUMORINTAJU", "HENGELLISYYS",
];

const KARKKIKAUPPA_KEY = "screen_12_karkkikauppa_picks";

function Karkkikauppa({ onSaveStateChange }: Props) {
  const tr = useTr();
  const [picks, setPicks] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    (async () => {
      const v = await loadResponse<number[]>(KARKKIKAUPPA_KEY);
      if (Array.isArray(v)) setPicks(v.filter((x) => Number.isInteger(x) && x >= 0 && x < KARKKIKAUPPA_STATEMENTS.length));
      setLoaded(true);
    })();
  }, []);

  const { language: lang } = useLanguage();
  const state = useAutosave(KARKKIKAUPPA_KEY, picks, { enabled: loaded });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(KARKKIKAUPPA_KEY, picks.length === 5);
  }, [picks, loaded, report]);

  function toggle(i: number) {
    setPicks((cur) => {
      if (cur.includes(i)) return cur.filter((x) => x !== i);
      if (cur.length >= 5) return cur;
      return [...cur, i];
    });
  }

  const remaining = 5 - picks.length;
  const done = picks.length === 5;

  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s12-h" className="text-center">
        <h1 className="font-display text-3xl leading-tight mb-2">{tr("YDINVAHVUUKSIEN KARKKIKAUPPA")}</h1>
        <p className="text-sm leading-relaxed">
          {tr("Valitse itsellesi viisi tärkeintä väittämäkarkkia. Kun olet ruksinut ne, katso seuraavalta sivulta väittämiä vastaavat luonteenvahvuudet.")}
        </p>
      </StickyNote>

      <div className="sticky top-[5.5rem] z-[5] rounded-full bg-[color:var(--purple-dark)]/80 px-4 py-2 text-center text-xs font-medium backdrop-blur">
        {done
          ? tr("Valmista! Olet valinnut viisi väittämäkarkkia.")
          : tr("Valittu {n} / 5 — valitse vielä {remaining}.", { n: picks.length, remaining })}
      </div>


      <ul className="grid gap-2 sm:grid-cols-2">
        {KARKKIKAUPPA_STATEMENTS.map((stmt, i) => {
          const active = picks.includes(i);
          const atMax = !active && picks.length >= 5;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                disabled={atMax}
                className={cn(
                  "w-full rounded-2xl border-2 px-3 py-2 text-left text-xs leading-snug transition-all",
                  active
                    ? "bg-[color:var(--coral)] border-[color:var(--coral)] text-white shadow-md"
                    : "bg-white/90 text-slate-900 border-white/40 hover:bg-white",
                  atMax && "opacity-40 cursor-not-allowed hover:bg-white/90",
                )}
                aria-pressed={active}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current align-middle text-[10px]">
                  {active ? "✓" : ""}
                </span>
                {tr(stmt)}
              </button>
            </li>
          );
        })}
      </ul>

      {done && (
        <StickyNote tone="mint" seed="s12-reveal">
          <h2 className="font-display text-xl mb-2">{tr("Väittämiä vastaavat luonteenvahvuudet")}</h2>
          <p className="text-xs opacity-80 mb-3">
            {tr("Numerot vastaavat väittämien järjestystä. Tunnistatko valitsemasi viisi?")}
          </p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {KARKKIKAUPPA_STRENGTHS.map((_s, i) => {
              const chosen = picks.includes(i);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-baseline gap-2 rounded-lg border-l-4 px-2 py-1 text-slate-900",
                    chosen && "font-bold",
                  )}
                  style={{
                    borderLeftColor: getStrengthColor(i + 1),
                    background: chosen
                      ? `color-mix(in srgb, ${getStrengthColor(i + 1)} 45%, white)`
                      : undefined,
                  }}
                >
                  <span className="font-mono text-xs opacity-60 w-6">{i + 1}.</span>
                  <span className="break-words">{getStrengthName(i + 1, lang)}</span>
                </li>
              );
            })}
          </ol>
        </StickyNote>
      )}
    </div>
  );
}

// ----- S13 (PDF p18): Vahvuuskarkkini -----
function S13({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s13-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuuskarkkini")}</h1>
        <p className="text-sm opacity-90">{tr("Pohdi omia vahvuuksia ja vastaa:")}</p>
      </StickyNote>

      <StickyNote tone="white" seed="s13-jar">
        <div className="mb-2 text-sm font-medium">{tr("Merkkaa tähän 5 vahvuuskarkkiasi!")}</div>
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ReflectionInput
              key={i}
              fieldKey={`screen_13_karkki_${i + 1}`}
              placeholder={tr("Vahvuuskarkki…")}
              onSaveStateChange={onSaveStateChange}
            />
          ))}
        </div>
      </StickyNote>

      <ReflectionTextarea
        fieldKey="screen_13_examples"
        label={tr("Ajattele itseäsi tekemässä tavanomaisia ja arkisia asioita tai tehtäviä. Miten olet näissä tekemisissä käyttänyt ydinvahvuuksiasi? Kirjoita muutama esimerkki tilanteista.")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_13_success"
        label={tr("Missä onnistuit omia vahvuuksia hyödyntämällä?")}
        rows={3}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_13_effect"
        label={tr("Miten omien ydinvahvuuksien hyödyntäminen vaikutti itseesi tai toisiin?")}
        rows={3}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S14 (PDF p19): Ydinvahvuuksien tiekartta -----
function S14({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Mistä innostut?",
    "Minkä tekeminen tuntuu kevyeltä?",
    "Mistä luonteenvahvuuksista saat kiitosta ja palautetta toisilta?",
    "Mitä rakastat tehdä vapaa-ajalla?",
    "Minkä alkamista odotat eniten päivässäsi?",
    "Mitä tehdessä aika ja paikka unohtuvat ja pääset flow-tilaan?",
    "Mitkä vahvuudet vahvistavat sinua vapaa-ajalla?",
    "Mitkä vahvuudet tulevat lukioon, kun sinä tulet paikalle?",
    "Mitä vahvuuksia arvostat eniten itsessäsi?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s14-h">
        <h1 className="font-display text-2xl">{tr("Ydinvahvuuksien tiekartta")}</h1>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_14_tiekartta_${i + 1}`}
            label={`${i + 1}. ${tr(q)}`}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S15 (PDF p20): Voimavarani opiskelijana 1/2 — informational -----
function S15() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s15-h">
        <h1 className="font-display text-2xl mb-1">{tr("Voimavarani opiskelijana 1/2")}</h1>
        <p className="text-sm opacity-90">{tr("Pohdi ja täydennä omien voimavarojesi sydämet")}</p>
      </StickyNote>
      <StickyNote tone="white" seed="s15-b">
        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
          <li>
            {tr("Mieti voimavarojasi, jotka auttavat sinua selviytymään hankalissa ja stressaavissa elämäntilanteissa, palautumaan vastoinkäymisistä ja olemaan toiveikas tulevaisuuden suhteen.")}
          </li>
          <li>
            {tr("Näitä tekijöitä voivat olla omat vahvuutesi, sosiaaliset suhteet, läheiset ihmiset, tunnetaidot, unelmasi tulevaisuuden suhteen, ajatuksesi, asenteesi, myötätuntoinen suhtautuminen itseesi ja aikaisemmat onnistumisen kokemukset.")}
          </li>
          <li>
            {tr("Listaa voimavarasi seuraavan sivun taulukkoon. Merkkaa sydämiin miten tärkeiksi voimarasi koet.")}
          </li>
        </ul>
      </StickyNote>
    </div>
  );
}

// ----- S16 (PDF p21): Voimavarani opiskelijana 2/2 -----
function S16({ onSaveStateChange }: Props) {
  const tr = useTr();
  const groups: Array<{ label: string; key: string }> = [
    { label: "KOULUSSA",       key: "screen_16_koulussa" },
    { label: "VAPAA-AJALLA",   key: "screen_16_vapaa_ajalla" },
    { label: "KOTONA",         key: "screen_16_kotona" },
    { label: "KAVERISUHTEISSA", key: "screen_16_kaverisuhteissa" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s16-h">
        <h1 className="font-display text-2xl">{tr("Voimavarani opiskelijana 2/2")}</h1>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <StickyNote key={g.key} tone="white" seed={g.key}>
            <ReflectionTextarea
              fieldKey={g.key}
              label={tr(g.label)}
              rows={4}
              onSaveStateChange={onSaveStateChange}
            />
          </StickyNote>
        ))}
      </div>
    </div>
  );
}

// ----- S17 (PDF p22): Haasteet ja vahvuudet -----
function S17({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s17-h">
        <h1 className="font-display text-2xl mb-1">{tr("Haasteet ja vahvuudet")}</h1>
        <p className="text-sm font-medium">{tr("Pohdi ja kirjoita vastaukset")}</p>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_17_opetukset"
        label={tr("Mitä vaikeudet ovat opettaneet vahvuuksistasi?")}
        rows={3}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_17_kasvu"
        label={tr("Miten olet kasvanut ja muuttunut ihmisenä vaikeuksien seurauksena?")}
        rows={3}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_17_laheinen"
        label={tr("Mitä sellainen läheinen ihminen, joka tuntee sinut hyvin, kertoisi olevan vahvuuksiasi ja voimavaroja, joiden avulla selviydyt tulevista haasteista?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S18 (PDF p23): Vahvuuksien käyttökielto -----
function S18({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s18-h">
        <h1 className="font-display text-2xl mb-2">{tr("Vahvuuksien käyttökielto")}</h1>
        <p className="text-sm">
          {tr("Mieti tilannetta, jossa ydinvahvuutesi laitetaan seuraavaksi kuukaudeksi käyttökieltoon.")}
        </p>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_18_tunne"
        label={tr("Miltä tämä tuntuisi?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_18_vaikutus"
        label={tr("Miten tämä vaikuttaisi arkeesi, entä opintoihin?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S19 (PDF p24): Idea: Vahvuusjulisteet — informational, no required input -----
function S19() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s19-h">
        <h1 className="font-display text-2xl mb-1">{tr("Idea: Vahvuusjulisteet")}</h1>
        <p className="text-sm leading-relaxed mb-2">
          {tr("Jokainen opiskelija tekee itsestään ja ydinvahvuuksistaan julisteen, jossa on oma kuva ja viisi ydinvahvuutta.")}
        </p>
        <p className="text-sm leading-relaxed mb-2">
          {tr("Millä tavoin voisit tehdä ydinvahvuutesi näkyväksi muille hauskalla ja luovalla tavalla?")}
        </p>
        <p className="text-sm leading-relaxed">
          {tr("Miten haluat visualisoida omat vahvuutesi? Ne parhaat puolesi, jotka tulevat mukanasi päivittäin lukioon.")}
        </p>
      </StickyNote>
      <StickyNote tone="white" seed="s19-karin">
        <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">
          {tr("Esimerkki")} — KARIN
        </div>
        <ul className="space-y-2 text-sm leading-snug">
          <li>
            <strong>{tr("SINNIKKYYS")}</strong>
            <ul className="ml-5 list-disc opacity-90">
              <li>{tr("säästämisessä")}</li>
              <li>{tr("kokeisiin lukemisessa")}</li>
              <li>{tr("treeneissä")}</li>
            </ul>
          </li>
          <li>
            <strong>{tr("YSTÄVÄLLISYYS")}</strong>
            <ul className="ml-5 list-disc opacity-90">
              <li>{tr("ystävällisyys tuntuu hyvältä")}</li>
              <li>{tr("sanon jos jonkun (Sannin) naamassa on räkää.")}</li>
            </ul>
          </li>
          <li>
            <strong>{tr("REILUUS")}</strong>
            <ul className="ml-5 list-disc opacity-90">
              <li>{tr("tiimipeluri")}</li>
              <li>{tr("tasa-arvo")}</li>
              <li>{tr("lojaali")}</li>
            </ul>
          </li>
          <li>
            <strong>{tr("HUUMORINTAJU")}</strong>
            <ul className="ml-5 list-disc opacity-90">
              <li>{tr("nauru pidentää ikää!")}</li>
              <li>{tr("asiat ei oo aina niin vakavia")}</li>
            </ul>
          </li>
          <li>
            <strong>{tr("MYÖTÄTUNTO")}</strong>
            <ul className="ml-5 list-disc opacity-90">
              <li>{tr("eläinsuojelutyö")}</li>
              <li>{tr("oikeuksien puolustaja")}</li>
            </ul>
          </li>
        </ul>
      </StickyNote>
    </div>
  );
}

// ----- S20 (PDF p25): Muistele onnistumista -----
function S20({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s20-h">
        <h1 className="font-display text-2xl">{tr("Muistele onnistumista")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_20_onnistuminen"
        label={tr("Mieti jotain tilannetta opinnoissa tai vapaa-ajalla, joka sujui hyvin, josta olet ylpeä ja jossa huomasit onnistuvasi sinulle tärkeissä asioissa. Mitä silloin tapahtui? Mikä siinä meni hyvin? Minkälaista palautetta sait toisilta? Mikä siinä oli sinulle tärkeää?")}
        rows={5}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_20_ydinvahvuudet"
        label={tr("Mitä tämä onnistuminen kertoo ydinvahvuuksistasi: mitä omia ydinvahvuuksia käyttämällä onnistuit?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_20_tuki"
        label={tr("Mieti onnistumista, jossa pystyit tukemaan ja auttamaan toisia omia vahvuuksiasi hyödyntämällä? Mitä teit ja kenen kanssa olit? Kerro esimerkki.")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_20_yhteinen"
        label={tr("Mitä yhteistä hyvää vahvuutesi edistivät, miten?")}
        rows={3}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S21 (PDF p26): Pohdi onnistumisia ja täydennä! -----
function S21({ onSaveStateChange }: Props) {
  const tr = useTr();
  const stems: Array<{ k: string; label: string }> = [
    { k: "screen_21_ylpea",     label: "Tästä onnistumisesta olen ylpeä" },
    { k: "screen_21_sinnikas",  label: "Olin sinnikäs kun" },
    { k: "screen_21_kehut",     label: "Sain kehuja ja kannustusta seuraavista asioista" },
    { k: "screen_21_rohkea",    label: "Olin rohkea kohdatessani tämän uuden haasteen" },
    { k: "screen_21_tavoite",   label: "Saavutin tämän tärkeän tavoitteen" },
    { k: "screen_21_tunne",     label: "Minusta tuntuu tällä hetkellä tältä, kun muistelen kokemaani" },
    { k: "screen_21_vahvuudet", label: "Tunnistin nämä vahvuudet jotka mahdollistivat onnistumisen" },
    { k: "screen_21_uudet",     label: "Löysin itsestäni tilanteessa uusia tai yllättäviä puolia" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s21-h">
        <h1 className="font-display text-2xl">{tr("Pohdi onnistumisia ja täydennä!")}</h1>
      </StickyNote>
      <div className="grid gap-3">
        {stems.map((s) => (
          <ReflectionTextarea
            key={s.k}
            fieldKey={s.k}
            label={tr(s.label)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S22 (PDF p27): Tulevaisuuden muistelu -----
function S22({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s22-h">
        <h1 className="font-display text-2xl">{tr("Tulevaisuuden muistelu")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_22_tulevaisuus"
        label={tr("Mieti jotain tilannetta opinnoissa tai vapaa-ajalla, jossa voit lähitulevaisuudessa hyödyntää vahvuuksiasi? Mikä tulee menemään hyvin? Mistä voit huomata, että olet hyödyntänyt vahvuuksiasi tietoisemmin?")}
        rows={5}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_22_oppi"
        label={tr("Mieti jotain tilannetta, jossa et onnistunut hyödyntämään vahvuuksiasi, tai käytit niitä liikaa? Mitä tämä tilanne opetti sinulle?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S23 (PDF p28): Ydinvahvuudet parin kanssa -----
function S23({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Mistä innostut?",
    "Minkä tekeminen tuntuu kevyeltä?",
    "Mistä luonteenvahvuuksista saat kiitosta ja palautetta toisilta?",
    "Mikä on parasta opinnoissa?",
    "Mitkä asiat päätyvät love-to-do -listalle?",
    "Mitä tehdessä aika ja paikka unohtuvat ja pääset flow-tilaan?",
    "Mitkä vahvuudet tulevat lukioon, kun sinä tulet paikalle?",
    "Mitä vahvuuksia arvostat eniten itsessäsi?",
    "Mitä samoja vahvuuksia sinussa oli jo lapsena?",
    "Mitä luonteenvahvuuksia hyödynnät eniten vapaalla?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s23-h">
        <h1 className="font-display text-2xl mb-1">{tr("Ydinvahvuudet parin kanssa")}</h1>
        <p className="text-sm opacity-90">
          {tr("Keskustele parin kanssa. Vastaa kysymyksiin. Käyttäkää omia vahvuuskarkkeja apuna keskustelussa.")}
        </p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_23_pair_${i + 1}`}
            label={tr(q)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S24 (PDF p29–30): Anna palautetta ja kehuja -----
function S24({ onSaveStateChange }: Props) {
  const tr = useTr();
  const stems = [
    "Sinun vahvuuksiasi ovat ainakin…",
    "Tämä oli tärkeää kuulla, koska…",
    "WAU, OPIN ETTÄ…",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s24-h">
        <h1 className="font-display text-2xl">
          {tr("Anna palautetta ja kehuja täydentämällä seuraavia lauseenalkuja:")}
        </h1>
      </StickyNote>
      <div className="grid gap-3">
        {stems.map((s, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_24_palaute_${i + 1}`}
            label={tr(s)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S25 (PDF p31): Tässä olen minä -----
function S25({ onSaveStateChange }: Props) {
  const tr = useTr();
  const stems = [
    "Minulle tärkeää on",
    "Tulen iloiseksi, kun",
    "Läheisissäni parasta on",
    "Osaan hyvin ja tykkään tehdä",
    "Parasta ryhmässäni on",
    "Opinnoissa lempiaineita ovat",
    "Minulle on vaikeaa",
    "Lempitekemistä",
    "Vapaa-ajalla tykkään",
    "Lukiossa haluaisin oppia",
    "Lukiossa minua innostaa",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s25-h">
        <h1 className="font-display text-2xl">{tr("Tässä olen minä:")}</h1>
      </StickyNote>
      <div className="grid gap-2 sm:grid-cols-2">
        {stems.map((s, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_25_tassa_${i + 1}`}
            label={tr(s)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}


// ----- S26 (PDF p32): Omien vahvuuksien käyttö (Govindji & Linley, 2007) -----
const LIKERT_STATEMENTS = [
  "Pystyn yleensä tekemään sitä, mitä teen parhaiten",
  "Hyödynnän aina vahvuuksiani",
  "Pyrin aina käyttämään vahvuuksiani",
  "Saavutan haluamani käyttämällä vahvuuksiani",
  "Käytän vahvuuksiani päivittäin",
  "Käytän vahvuuksiani saadakseni elämässä sen, mitä haluan",
  "Opinnoissani minulla on paljon mahdollisuuksia käyttää vahvuuksiani",
  "Elämä tarjoilee minulle monia eri tapoja käyttää vahvuuksiani",
  "Vahvuuksien käyttäminen on minulle luontaista",
  "Vahvuuksien käyttäminen tekemissäni asioissa on minusta helppoa",
  "Pystyn käyttämään vahvuuksiani monissa eri tilanteissa",
  "Suurimman osan ajastani teen asioita, joissa olen hyvä",
  "Vahvuuksien käyttäminen on minulle tuttua",
  "Pystyn käyttämään vahvuuksiani monin eri tavoin",
];

function LikertRow({
  fieldKey,
  index,
  label,
  onSaveStateChange,
  onValue,
}: {
  fieldKey: string;
  index: number;
  label: string;
  onSaveStateChange?: (s: SaveState) => void;
  onValue?: (n: number) => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    (async () => {
      const v = await loadResponse<number>(fieldKey);
      if (typeof v === "number") setValue(v);
      setLoaded(true);
    })();
  }, [fieldKey]);

  const state = useAutosave(fieldKey, value, { enabled: loaded && value !== null });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, value !== null);
    if (value !== null) onValue?.(value);
  }, [value, loaded, fieldKey, report, onValue]);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2">
      <div className="flex-1 text-sm">
        <span className="font-mono opacity-60 mr-2">{index + 1}.</span>{label}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={cn(
              "h-8 w-8 rounded-full border text-xs font-bold transition-all",
              value === n
                ? "bg-[color:var(--coral)] border-[color:var(--coral)] text-white scale-110"
                : "bg-white/80 text-slate-900 border-white/40 hover:bg-white",
            )}
            aria-label={`${n}/5`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function S26({ onSaveStateChange }: Props) {
  const tr = useTr();
  const [scores, setScores] = useState<Record<number, number>>({});
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s26-h">
        <h1 className="font-display text-2xl mb-1">{tr("Omien vahvuuksien käyttö")}</h1>
        <p className="text-xs opacity-70 mb-2">Govindji and Linley (2007)</p>
        <p className="text-sm opacity-90">
          {tr(
            "Asteikolla 1 täysin eri mieltä, 2.. 3.. 4.. ja 5 täysin samaa mieltä, vastaa seuraavaan mittariin vahvuuksien käytöstä.",
          )}
        </p>
      </StickyNote>
      <div className="grid gap-2">
        {LIKERT_STATEMENTS.map((s, i) => (
          <LikertRow
            key={i}
            fieldKey={`screen_26_likert_${i + 1}`}
            index={i}
            label={tr(s)}
            onSaveStateChange={onSaveStateChange}
            onValue={(v) => setScores((cur) => ({ ...cur, [i]: v }))}
          />
        ))}
      </div>
      <StickyNote tone="mint" seed="s26-sum" className="text-center">
        <div className="text-sm opacity-80">{tr("Vastaa kyselyyn. Laske yhteen pisteesi:")}</div>
        <div className="font-display text-4xl mt-1">{sum}</div>
        <div className="text-xs opacity-60 mt-1">
          {tr("{n} / {total} vastattu", { n: Object.keys(scores).length, total: LIKERT_STATEMENTS.length })}
        </div>
      </StickyNote>

    </div>
  );
}

// ----- S27 (PDF p33): Moduuli 2 title card -----
function M2Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="mint" seed="s27-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 2")}</div>
      <h1 className="font-display text-4xl leading-tight">{tr("2. Omat vahvuudet lukiossa")}</h1>
    </StickyNote>
  );
}

// ----- S28 (PDF p34): Omat vahvuuteni lukiossa — informational -----
function S28() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s28-h">
        <h1 className="font-display text-2xl mb-2">{tr("Omat vahvuuteni lukiossa")}</h1>
      </StickyNote>
      <StickyNote tone="white" seed="s28-b">
        <p className="text-sm leading-relaxed mb-2">
          {tr("Tässä kokonaisuudessa pääset tutustumaan ja työstämään omia vahvuuksiasi lukiolaisena.")}
        </p>
        <p className="text-sm leading-relaxed mb-2">
          {tr("Koulukulttuurissa ja opinnoissa virheiden ja puutteiden tunnistaminen tapahtuu kuin itsestään, mutta sen vastavoima, eli vahvuudet ja onnistumiset, eivät tavallisesti pääsekään esiin arvolleen kuuluvalla tavalla. Opiskelussa huomio saattaa kiinnittyä kaikkeen siihen, mitä ei vielä osaa, missä ei ole onnistunut ja mitä kaikkea pitäisi vielä kehittää ja oppia.")}
        </p>
        <p className="text-sm leading-relaxed">
          {tr("Kasvamme ja kehitymme ihmisenä läpi opintojen ja koko elämän. On hyvä muistaa, että luonteenvahvuudet eivät ole syntymässä fiksattuja ominaisuuksia, vaan niitä voi tavoitteellisesti kehittää. Lähtökohta on, että opit tunnistamaan omat vahvuutesi opiskelijana jotta voit hyödyntää niitä osana opintoja.")}
        </p>
      </StickyNote>
    </div>
  );
}


// ----- Reusable: "Vahvuuskarkkini" worksheet (S29 lukiossa, S42 kotona,
// S48 vapaa-ajalla, S56 ystävyyssuhteissa) -----
function VahvuuskarkkiSheet({
  title,
  context,
  fieldPrefix,
  onSaveStateChange,
}: {
  title: string;
  context: string; // "lukiossa", "kotona", "vapaa-ajalla", "ystävyyssuhteissa"
  fieldPrefix: string;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed={`${fieldPrefix}-h`}>
        <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
          {tr(context).toUpperCase()}
        </div>
        <h1 className="font-display text-2xl mb-1">{tr(title)}</h1>
        <p className="text-sm opacity-90">
          {tr("Valitse 1–2 vahvuuskarkkia ja hyödynnä niitä {context}. Kirjoita vahvuudet tähän. Pohdi, mitä teit, koit ja opit.", { context: tr(context) })}
        </p>
      </StickyNote>
      <ReflectionInput
        fieldKey={`${fieldPrefix}_karkit`}
        prefix={tr("Vahvuudet")}
        placeholder={tr("Merkkaa tähän mitä vahvuutta käytit!")}
        onSaveStateChange={onSaveStateChange}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ReflectionTextarea fieldKey={`${fieldPrefix}_teit`}        label={tr("1. Mitä teit?")}             rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey={`${fieldPrefix}_seuraavaksi`} label={tr("2. Mitä tapahtui seuraavaksi?")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey={`${fieldPrefix}_opit`}        label={tr("3. Mitä opit?")}             rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey={`${fieldPrefix}_hyodynnat`}   label={tr("4. Miten hyödynnät oppimaasi?")} rows={3} onSaveStateChange={onSaveStateChange} />
      </div>

    </div>
  );
}

// ----- S29 (PDF p35): Vahvuuskarkkini lukiossa -----
function S29(p: Props) {
  return (
    <VahvuuskarkkiSheet
      title="Vahvuuskarkkini"
      context="lukiossa"
      fieldPrefix="screen_29"
      onSaveStateChange={p.onSaveStateChange}
    />
  );
}

// ----- S30 (PDF p36): Osaamisen osa-alueiden palapeli -----
function S30({ onSaveStateChange }: Props) {
  const tr = useTr();
  const quadrants: Array<{ k: string; title: string; q: string }> = [
    { k: "screen_30_lahjakkuudet",   title: "LAHJAKKUUDET",            q: "Missä olet hyvä?" },
    { k: "screen_30_taidot",         title: "TAIDOT",                  q: "Mitä taitoja sinulla jo on, joita hyödynnät opinnoissa?" },
    { k: "screen_30_kiinnostukset",  title: "KIINNOSTUKSEN KOHTEET",   q: "Mitä harrastat? Mitkä ovat innostuksen ja intohimon kohteita vapaa-ajallasi?" },
    { k: "screen_30_resurssit",      title: "RESURSSIT",               q: "Mitkä asiat tai henkilöt ovat voimavarojasi? Mikä auttaa sinua pysymään vahvana vaikeina aikoina? Mikä tuo elämääsi merkitystä?" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s30-h">
        <h1 className="font-display text-2xl mb-1">{tr("Osaamisen osa-alueiden palapeli")}</h1>
        <p className="text-sm opacity-90">
          {tr("Meillä kaikilla on osaamisia ja tukipilareita elämässämme. Nämä voidaan jakaa neljään osa-alueeseen: lahjakkuuksiin, taitoihin, kiinnostuksen kohteisiin ja resursseihin.")}
        </p>
        <p className="text-xs opacity-60 mt-1">(Niemiec, 2018)</p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {quadrants.map((q) => (
          <StickyNote key={q.k} tone="white" seed={q.k}>
            <div className="font-display text-sm mb-1">{tr(q.title)}</div>
            <ReflectionTextarea
              fieldKey={q.k}
              label={tr(q.q)}
              rows={4}
              onSaveStateChange={onSaveStateChange}
            />
          </StickyNote>
        ))}
      </div>
    </div>
  );
}


// ----- S31 (PDF p37): Unelmien tiekartta opinnoissa -----
function S31({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Keneltä saan tukea ja opastusta?",
    "Mitä vahvuuksiani voin hyödyntää?",
    "Mitä minun kannattaisi vielä oppia?",
    "Mitä jo osaan hyvin?",
    "Unelmieni ammatti",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s31-h">
        <h1 className="font-display text-2xl">{tr("Unelmien tiekartta opinnoissa")}</h1>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_31_tiekartta_${i + 1}`}
            label={`${i + 1}. ${tr(q)}`}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S32 (PDF p38): Minä opiskelijana -----
function S32({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Mikä saa sinut innostumaan opinnoissa?",
    "Minkä tekemiseen uppoudut?",
    "Minkä parissa jaksat olla sinnikäs ja ylittää esteitä?",
    "Mistä olet saanut kannustavaa palautetta opettajilta tai opiskelutovereilta?",
    "Mistä olet erityisen kiinnostunut opinnoissa?",
    "Mitä vahvuuksia tavallisesti hyödynnät opintojen aikana?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s32-h">
        <h1 className="font-display text-2xl mb-1">{tr("Minä opiskelijana")}</h1>
        <p className="text-sm opacity-90">
          {tr("Listaa seuraavalle sivulle aivan kaikki vahvuutesi opiskelijana, myös sellaiset, jotka saattavat tuntua sinulle itsestään selvyydeltä. Oletko hyvä kielissä, keksitkö luovia ratkaisuja ongelmiin, autatko mielelläsi toisia, keksitkö parhaat vitsit, kiitätkö toisia, oletko ryhmähengen luoja?")}
        </p>
        <p className="text-sm opacity-90 mt-2">
          {tr("Pohdi ensin seuraavia kysymyksiä ja selvitä, mitä oikeasti rakastat tehdä ja missä olet erityisen hyvä. Mieti, millä uudella tavalla voit hyödyntää vahvuuksiasi lukiossa.")}
        </p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_32_minaopisk_${i + 1}`}
            label={tr(q)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S33 (PDF p39): Listaa erityistaidot — 10 slots -----
function S33({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s33-h">
        <h1 className="font-display text-2xl">
          {tr("Täydennä kaikki erityistaitosi tähän listaan.")}
        </h1>
      </StickyNote>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <ReflectionInput
            key={i}
            fieldKey={`screen_33_erityistaito_${i + 1}`}
            prefix={`${i + 1}.`}
            placeholder={tr("Erityistaito…")}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S34 (PDF p40): Koulu-kokemuksia -----
function S34({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs: Array<{ k: string; q: string }> = [
    { k: "screen_34_oppi",         q: "Minkälaisia asioita opit nopeasti ja helposti?" },
    { k: "screen_34_palaute",      q: "Mistä sait rohkaisevaa palautetta peruskoulussa opettajilta entä luokkakavereilta?" },
    { k: "screen_34_aiheet",       q: "Mistä tykkäsit koulussa ala-asteella, entä yläasteella?" },
    { k: "screen_34_onnistuminen", q: "Mikä onnistuminen sinulle on jäänyt mieleen peruskoulusta?" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s34-h">
        <h1 className="font-display text-2xl mb-1">{tr("Koulu-kokemuksia")}</h1>
        <p className="text-sm opacity-90">
          {tr("Tarkastele omia aiempia kokemuksiasi opinnoissa ja huomaa, millaisia vahvuuksia sinulla on.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {qs.map((x) => (
          <ReflectionTextarea
            key={x.k}
            fieldKey={x.k}
            label={tr(x.q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S35 (PDF p41): Tavoitteeni opiskelijana 1/2 — informational -----
function S35() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s35-h">
        <h1 className="font-display text-2xl">{tr("Tavoitteeni opiskelijana 1/2")}</h1>
      </StickyNote>
      <StickyNote tone="white" seed="s35-b">
        <p className="text-sm leading-relaxed mb-2">
          {tr("Tässä tehtävässä pääset kirkastamaan tavoitteesi opiskelijana, ne joita haluaisit saavuttaa. Pääset lisäksi pohtimaan, mitä kaikkea tämä tulee vaatimaan. Pohdi ja täydennä, mitä vahvuuksia sinulla jo on, joita aiot hyödyntää tavoitteen saavuttamisessa.")}
        </p>
        <p className="text-sm font-medium">
          {tr("Mikä on sinulle se iso tavoite, jonka haluat elämässäsi saavuttaa?")}
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm mt-2">
          <li>{tr("Kirjoita tavoitteesi jäävuoren pinnan päällä näkyvään osaan.")}</li>
          <li>{tr("Pohdi ja kirjaa jäävuoren pinnan alapuolelle kaikki vahvuudet, joiden käyttäminen ja kehittäminen tukee tavoitteen saavuttamista.")}</li>
          <li>{tr("Pohdi ja konkretisoi, miten voit hyödyntää kyseisiä vahvuuksia tavoitteen saavuttamisessa.")}</li>
          <li>{tr("Kirjoita myös, mitä muita taitoja tulet tarvitsemaan ja kehittämään tavoitteen saavuttamisessa.")}</li>
        </ol>
        <p className="text-xs italic opacity-70 mt-2">→ {tr("Jäävuori seuraavalla sivulla.")}</p>
      </StickyNote>
    </div>
  );
}

// ----- S36 (PDF p42): Tavoitteeni opiskelijana 2/2 — iceberg quadrants -----
function S36({ onSaveStateChange }: Props) {
  const tr = useTr();
  const boxes: Array<{ k: string; label: string }> = [
    { k: "screen_36_tavoite",     label: "1. Tavoitteeni ja miksi se on minulle tärkeä" },
    { k: "screen_36_vahvuudet",   label: "2. Vaaditut vahvuudet" },
    { k: "screen_36_hyodynnan",   label: "3. Miten hyödynnän vahvuuksia" },
    { k: "screen_36_taidot",      label: "4. Mitä muita taitoja tarvitsen" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s36-h">
        <h1 className="font-display text-2xl">{tr("Tavoitteeni opiskelijana 2/2")}</h1>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {boxes.map((b) => (
          <StickyNote key={b.k} tone="white" seed={b.k}>
            <ReflectionTextarea
              fieldKey={b.k}
              label={tr(b.label)}
              rows={4}
              onSaveStateChange={onSaveStateChange}
            />
          </StickyNote>
        ))}
      </div>
      <p className="text-center text-xs opacity-60">
        {tr("Visuaalinen jäävuori on tilapäisesti korvattu nelikenttänä, kunnes alkuperäinen kuva saadaan käyttöön.")}
      </p>
    </div>
  );
}

// ----- S37 (PDF p43): Vahvuuteni opiskelijana — 3 columns -----
function S37({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s37-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuuteni opiskelijana")}</h1>
        <p className="text-sm opacity-90">
          {tr("Tunnista omia vahvuuksiasi. Arvosta ja ole ylpeä omista vahvuuksistasi. Kirjoita itsellesi muistiin omia parhaita puoliasi opiskelijana!")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-3">
        <ReflectionTextarea
          fieldKey="screen_37_arvostan"
          label={tr("Mukavia asioita — Arvostan itsessäni")}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
        <ReflectionTextarea
          fieldKey="screen_37_vahvuuksiani"
          label={tr("Omia vahvuuksia — Vahvuuksiani ovat mielestäni")}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
        <ReflectionTextarea
          fieldKey="screen_37_paikkoja"
          label={tr("Paikkoja — Näissä paikoissa viihdyn ja pääsen käyttämään vahvuuksiani")}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </div>
  );
}

// ----- S38 (PDF p44): Vahvuuspalaute opiskelukavereilta -----
function S38({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s38-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuuspalaute opiskelukavereilta")}</h1>
        <p className="text-sm opacity-90">
          {tr("Kirjoita palautetta ja kehuja ryhmässä 2–4 opiskelukaverin kanssa. Käytä sivua 10 pohjana. Nimetkää ne vahvuudet, joita toisissanne arvostatte. Kertokaa myös, missä vahvuudet näkyvät ja miten ne vaikuttavat kanssaihmisiin.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReflectionTextarea fieldKey="screen_38_uutta"       label={tr("Mitä uutta opin palautteista?")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_38_tarkeaa"     label={tr("Mikä palautteessa on minulle tärkeää?")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_38_muistetaan"  label={tr("Millaisista asioista minut muistetaan / tunnistetaan parhaiten?")} rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_38_yhteisoon"   label={tr("Mitä hyvää vahvuuteni tuovat yhteisööni?")} rows={3} onSaveStateChange={onSaveStateChange} />
      </div>
    </div>
  );
}

// ----- S39 (PDF p45): Minä olen (M2) -----
function S39({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s39-h">
        <h1 className="font-display text-2xl mb-1">{tr("Minä olen")}</h1>
        <p className="text-sm opacity-90">
          {tr("Muuta muilta saamasi palaute lauseiksi minä-muotoon.")}
          <em> {tr("“Olet sinnikäs.”")}</em> → <strong>{tr("“Minä olen sinnikäs.”")}</strong>
        </p>
      </StickyNote>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <ReflectionInput
            key={i}
            fieldKey={`screen_39_mina_olen_${i + 1}`}
            prefix={tr("Minä olen")}
            placeholder="…"
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}


// ----- S40 (PDF p46): Moduuli 3 title card -----
function M3Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="mint" seed="s40-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 3")}</div>
      <h1 className="font-display text-4xl leading-tight">{tr("3. Omat vahvuudet kotona")}</h1>
    </StickyNote>
  );
}

// ----- S41 (PDF p47): Vahvuuskarkkini kotona -----
function S41(p: Props) {
  return (
    <VahvuuskarkkiSheet
      title="Vahvuuskarkkini"
      context="kotona"
      fieldPrefix="screen_41"
      onSaveStateChange={p.onSaveStateChange}
    />
  );
}

// Note: S41 worksheet stores under screen_41_* but REQUIREMENTS is keyed off
// screen_42_*. The actual mapping below uses S42 for kotona-karkkini to keep
// REQUIREMENTS keys aligned with the screen number. The dual numbering above
// happened because PDF "Vahvuudet perheessä" is on the next page (p48 → S42).
// The registry below assigns S41 = M3 title, S42 = kotona-karkkini, etc.

// ----- S42 (PDF p48): Vahvuudet perheessä -----
function S42_perhe({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s42-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuudet perheessä")}</h1>
        <p className="text-sm opacity-90">{tr("Täydennä laput.")}</p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReflectionTextarea fieldKey="screen_43_vahvuudet"   label={tr("Minkälaisia vahvuuksia sinulla on perheenjäsenenä? Miten ne näkyvät?")} rows={4} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_43_parasta"     label={tr("Mikä on parasta perheessäsi? Miten erilaiset vahvuudet näkyvät perheessänne?")} rows={4} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_43_kiitollinen" label={tr("Mistä olet kiitollinen perheessäsi?")} rows={4} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_43_yhdessa"     label={tr("Mitä tykkäätte tehdä yhdessä?")} rows={4} onSaveStateChange={onSaveStateChange} />
      </div>
    </div>
  );
}

// ----- S43 (PDF p49): Minä perheenjäsenenä -----
function S43_perheenjasen({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s43-h">
        <h1 className="font-display text-2xl">{tr("Minä perheenjäsenenä")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_44_perheenjasenena"
        label={tr("Kirjoita itsellesi muistiin, millainen olet perheenjäsenenä ja millaisia vahvuuksia tuot perheeseesi.")}
        rows={8}
        onSaveStateChange={onSaveStateChange}
      />
      <p className="text-center text-xs opacity-60">
        {tr("Alkuperäisen sivun kahta saraketta ei ollut mahdollista poimia PDF:stä; kenttä on tilapäisesti yhtenä laajana tekstialueena.")}
      </p>
    </div>
  );
}

// ----- S44 (PDF p50): Muistele ja kysy vanhemmilta -----
function S44_kysy({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Millainen lapsi olin?",
    "Mitkä olivat lempileikkejäni?",
    "Mistä innostuin?",
    "Missä olin lapsena hyvä?",
    "Mistä sain kannustusta ja kehuja?",
    "Mitä vahvuuksia minussa huomattiin jo lapsena?",
    "Mitä toivoit minusta tulevan?",
    "Mitä haluat vielä sanoa minulle vahvuuksistani?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s44-h">
        <h1 className="font-display text-2xl mb-1">{tr("Muistele ja kysy vanhemmilta")}</h1>
        <p className="text-sm opacity-90">
          {tr("Pyydä vanhempaasi muistelemaan ja kerro lapsuusaikaisista vahvuuksistasi.")}
        </p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_45_vanhemmat_${i + 1}`}
            label={tr(q)}
            rows={2}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
      <p className="text-center text-xs opacity-60">
        {tr("Kysymykset ovat osittain rekonstruoitu PDF-sivun rakenteesta — alkuperäinen sivu on käsinkirjoitusta varten varattu, ja muutamat kysymyssanat eivät olleet poimittavissa OCR:llä.")}
      </p>
    </div>
  );
}

// ----- S45 (PDF p51): Vahvuuskirje vanhemmalta — informational -----
function S45_kirje() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s45-h">
        <h1 className="font-display text-2xl mb-1">{tr("Pyydä vanhempaasi täydentämään!")}</h1>
        <p className="text-sm opacity-90">
          {tr("Tämä sivu on vahvuuskirjeen pohja, jonka vanhempi voi täydentää nuorelleen. Voitte tulostaa sen tai kirjoittaa puhtaaksi yhdessä.")}
        </p>
      </StickyNote>
      <StickyNote tone="white" seed="s45-letter">
        <h2 className="font-display text-lg mb-2">{tr("Kirjoita vahvuuskirje nuorellesi")}</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line">
{tr(`Hän kun . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

Sinun vahvuuksiasi ovat . . . . . . . . , . . . . . . . . ja . . . . . . . .

Olen huomannut, että käytät niitä, kun . . . . . . . . . . ja . . . . . . . . .

Arvostan sinussa erityisesti . . . . . . . . . . . . . . . . . ja . . . . . . . . . . .

Kun käytät vahvuuksiasi kotona, se vaikuttaa . . . . . . . . . . . . . . . . . . . .

Olet opettanut minulle erityisesti . . . . . . . . . . . . . . . . käytöstä.

Kun käytät vahvuuksiasi, näen sinut tulevaisuudessa . . . . . . . . . . . . . . . .

Anna vahvuuksiesi loistaa.

Rakkain terveisin, . . . . . . . . . .`)}
        </p>
      </StickyNote>
      <p className="text-center text-xs opacity-60">
        {tr("Sivun visuaalinen ilme on tilapäisesti korvattu yksinkertaisella tekstipohjalla.")}
      </p>
    </div>
  );
}

// ----- S46 (PDF p52): Moduuli 4 title card -----
function M4Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="coral" seed="s46-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 4")}</div>
      <h1 className="font-display text-4xl leading-tight">
        {tr("4. Omat vahvuudet vapaa-ajalla ja harrastuksissa")}
      </h1>
    </StickyNote>
  );
}

// ----- S47 (PDF p53): Vahvuuskarkkini vapaa-ajalla -----
function S47(p: Props) {
  return (
    <VahvuuskarkkiSheet
      title="Vahvuuskarkkini"
      context="vapaa-ajalla"
      fieldPrefix="screen_48"
      onSaveStateChange={p.onSaveStateChange}
    />
  );
}

// ----- S48 (PDF p54): Minä vapaa-ajalla -----
function S48_vapaa({ onSaveStateChange }: Props) {
  const tr = useTr();
  const cols = [
    { k: "screen_49_tykkaat",      q: "Mitä tykkäät tehdä vapaa-ajalla?" },
    { k: "screen_49_harrastukset", q: "Mitä harrastuksia sinulla on?" },
    { k: "screen_49_vahvuudet",    q: "Mitä vahvuuksia tunnistat itsessäsi vapaa-ajalla ja harrastuksissa?" },
    { k: "screen_49_enemman",      q: "Mitä vahvuuksiasi haluaisit hyödyntää enemmän vapaa-ajallasi?" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s48-h">
        <h1 className="font-display text-2xl mb-1">{tr("Minä vapaa-ajalla")}</h1>
        <p className="text-sm opacity-90">
          {tr("Kirjoita itsellesi muistiin mitä teet vapaa-ajallasi ja millaisia vahvuuksia hyödynnät.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {cols.map((c) => (
          <ReflectionTextarea
            key={c.k}
            fieldKey={c.k}
            label={tr(c.q)}
            rows={4}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S49 (PDF p55): Love to-do -lista 1/3 — informational -----
function S49_loveinfo() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s49-h">
        <h1 className="font-display text-2xl">{tr("Love to-do -lista 1/3")}</h1>
      </StickyNote>
      <StickyNote tone="white" seed="s49-b">
        <p className="text-sm leading-relaxed mb-2">
          {tr("Mitkä asiat päätyvät sinun love-to-do listalle? Tee lista viidestä asiasta, joita rakastat tehdä vapaa-ajalla.")}
        </p>
        <p className="text-sm leading-relaxed">
          {tr("Mieti seuraavaksi, kuinka vahvuutesi liittyvät näihin tekemisiin.")}
        </p>
        <p className="text-xs italic opacity-70 mt-2">
          {tr("Ps. Todennäköisesti harrastukset ja tekemiset, joista pidät eniten, ovat myös tyydyttäviä, koska ne tarjoavat sinulle mahdollisuuden hyödyntää vahvuuksiasi.")}
        </p>
        <p className="text-xs italic opacity-70 mt-2">{tr("→ Love to-do -lista seuraavalla sivulla.")}</p>
      </StickyNote>
    </div>
  );
}

// ----- S50 (PDF p56): Love to-do -lista 2/3 — 5 inputs -----
function S50_love({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s50-h">
        <h1 className="font-display text-2xl mb-1">{tr("Love to-do -lista")}</h1>
        <p className="text-sm opacity-90">
          {tr("Kirjoita viisi asiaa, joita rakastat tehdä vapaa-ajallasi. Merkkaa sydämiin miten paljon teet kyseistä asiaa.")}
        </p>
      </StickyNote>
      <div className="grid gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ReflectionInput
            key={i}
            fieldKey={`screen_51_love_${i + 1}`}
            prefix={`${i + 1}.`}
            placeholder={tr("Asia, jota rakastan tehdä…")}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S51 (PDF p57): Love to-do -lista 3/3 -----
function S51_loveB({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s51-h">
        <h1 className="font-display text-2xl">{tr("Love to-do -lista")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_52_konkreettisesti"
        label={tr("Kuvittele, että voisit tehdä eniten rakastamaasi asiaa enemmän — miltä se konkreettisesti tuntuisi? Mihin haluaisit käyttää enemmän aikaa?")}
        rows={5}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_52_vahvuudet"
        label={tr("Kirjoita mitä vahvuuksiasi hyödynnät tehdessäsi rakastamiasi asioita vapaa-ajalla!")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S52 (PDF p58): Kuvakollaasi 1/2 — informational -----
function S52_kollaasiInfo() {
  const tr = useTr();
  const bullets = [
    "Kerää kollaasi asioista / tavaroista, jotka ovat sinulle tärkeitä, joista olet kiinnostunut ja joissa voit hyödyntää vahvuuksiasi. Esimerkiksi koripallo, kirja, tietokone ja kissa.",
    "Teenäistä kollaasi ja ota siitä kuva.",
    "Esitelkää kuvat ryhmässä. Tutustukaa toistenne vahvuuksiin.",
    "Mitkä tavarat tai tekemiset valitsit kuvaasi? Miksi?",
    "Kirjoita, mitä vahvuuksiasi kiinnostuksen kohteesi ovat kehittäneet? Miten?",
    "Mitä uusia taitoja olet oppinut kiinnostuksen kohteiden parissa?",
    "Käykää ystävän kanssa syvempi keskustelu vahvuuksien ja kiinnostuksen kohteiden välisestä yhteydestä vapaa-ajalla.",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s52-h">
        <h1 className="font-display text-2xl mb-1">{tr("Kuvakollaasi 1/2")}</h1>
        <p className="text-sm font-medium">{tr("Mitkä asiat sinua kiinnostavat vapaa-ajalla? Miksi?")}</p>
      </StickyNote>
      <StickyNote tone="white" seed="s52-b">
        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
          {bullets.map((b) => (
            <li key={b}>{tr(b)}</li>
          ))}
        </ul>
      </StickyNote>
    </div>
  );
}

// ----- S53 (PDF p59): Kuvakollaasi 2/2 -----
function S53_kollaasi({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s53-h">
        <h1 className="font-display text-2xl mb-1">{tr("Kuvakollaasi 2/2")}</h1>
        <p className="text-sm opacity-90">
          {tr("Jutelkaa ystävien kanssa vahvuuksistanne ja kiinnostuksen kohteistanne!")}
        </p>
      </StickyNote>
      <ReflectionTextarea fieldKey="screen_54_valitsin"     label={tr("Mitä valitsin")}                                                              rows={4} onSaveStateChange={onSaveStateChange} />
      <ReflectionTextarea fieldKey="screen_54_kehittaneet"  label={tr("Mitä vahvuuksia kiinnostuksen kohteeni ovat kehittäneet?")}                  rows={4} onSaveStateChange={onSaveStateChange} />
      <ReflectionTextarea fieldKey="screen_54_uudet"        label={tr("Mitä uusia taitoja olet oppinut kiinnostuksen kohteiden parissa?")}          rows={4} onSaveStateChange={onSaveStateChange} />
    </div>
  );
}

// ----- S54 (PDF p60): Moduuli 5 title card -----
function M5Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="coral" seed="s54-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 5")}</div>
      <h1 className="font-display text-4xl leading-tight">{tr("5. Omat vahvuudet ystävyyssuhteissa")}</h1>
    </StickyNote>
  );
}

// ----- S55 (PDF p61): Vahvuuskarkkini ystävyyssuhteissa -----
function S55(p: Props) {
  return (
    <VahvuuskarkkiSheet
      title="Vahvuuskarkkini"
      context="ystävyyssuhteissa"
      fieldPrefix="screen_56"
      onSaveStateChange={p.onSaveStateChange}
    />
  );
}

// ----- S56 (PDF p62): Minä ystävänä -----
function S56_ystava({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s56-h">
        <h1 className="font-display text-2xl mb-1">{tr("Minä ystävänä")}</h1>
        <p className="text-sm opacity-90">
          {tr("Haastattele ystäviäsi. Pyydä heitä kertomaan tai lähettämään viesti. Täydennä lauseet:")}
        </p>
      </StickyNote>
      <ReflectionTextarea fieldKey="screen_57_ystavien" label={tr("Ystävieni mielestä vahvuuksiani ovat")}   rows={4} onSaveStateChange={onSaveStateChange} />
      <ReflectionTextarea fieldKey="screen_57_parasta"  label={tr("Parasta ystävissäni on")}                  rows={4} onSaveStateChange={onSaveStateChange} />
    </div>
  );
}

// ----- S57 (PDF p63): Vahvuuspalaute ystäviltä -----
function S57_palaute({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s57-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuuspalaute ystäviltä")}</h1>
        <p className="text-sm opacity-90">
          {tr("Kirjoita palautetta ja kehuja ystäviesi kesken. Kerätkää yhdessä 2–4 ystävältä palautetta vahvuuksistanne. Käytä sivua 11 pohjana. Nimetkää ne vahvuudet, joita toisissanne arvostatte. Kertokaa myös, missä toisen vahvuudet erityisesti näkyvät ja miten positiivisesti ne vaikuttavat ystävyyssuhteissa.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReflectionTextarea fieldKey="screen_58_uutta"     label={tr("Mitä uutta opin palautteista?")}                              rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_58_tarkeaa"   label={tr("Mikä palautteessa on minulle tärkeää?")}                      rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_58_muistavat" label={tr("Millaisista asioista ystäväni muistavat minut parhaiten?")}   rows={3} onSaveStateChange={onSaveStateChange} />
        <ReflectionTextarea fieldKey="screen_58_parasta"   label={tr("Mikä on parasta ystävissäni?")}                                rows={3} onSaveStateChange={onSaveStateChange} />
      </div>
    </div>
  );
}

// ----- S58 (PDF p64): Moduuli 6 title card -----
function M6Intro() {
  const tr = useTr();
  return (
    <StickyNote tone="yellow" seed="s58-h" className="text-center">
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{tr("Taso 6")}</div>
      <h1 className="font-display text-4xl leading-tight">{tr("6. Vahvuusportfolion kokoaminen")}</h1>
    </StickyNote>
  );
}

// ----- S59 (PDF p65): Vahvuuksien yhteenveto -----
function S59_yhteenveto({ onSaveStateChange }: Props) {
  const tr = useTr();
  const cols = [
    { k: "screen_60_koulusta",     label: "Koulusta" },
    { k: "screen_60_perheelta",    label: "Perheeltä" },
    { k: "screen_60_vapaa_ajalta", label: "Vapaa-ajalta" },
    { k: "screen_60_ystavilta",    label: "Ystäviltä" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s59-h">
        <h1 className="font-display text-2xl mb-1">{tr("Vahvuuksien yhteenveto")}</h1>
        <p className="text-sm opacity-90">
          {tr("Kokoa saamasi palautteet. Kirjoita ylös vahvuudet joita sinussa on huomattu eri ympäristöissä.")}
        </p>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        {cols.map((c) => (
          <ReflectionTextarea
            key={c.k}
            fieldKey={c.k}
            label={tr(c.label)}
            rows={5}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S60 (PDF p66): Pohdi ja hyödynnä saamaasi palautetta -----
function S60_pohdi({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    { k: "screen_61_samaa",      q: "Mitä samaa niissä on?" },
    { k: "screen_61_eroavat",    q: "Miten ne eroavat?" },
    { k: "screen_61_huomataan",  q: "Mitä vahvuuksia sinussa huomataan?" },
    { k: "screen_61_yllatti",    q: "Mikä palautteissa yllätti?" },
    { k: "screen_61_muistaa",    q: "Mitä haluat muistaa palautteista?" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s60-h">
        <h1 className="font-display text-2xl mb-1">{tr("Pohdi ja hyödynnä saamaasi palautetta")}</h1>
        <p className="text-sm opacity-90">{tr("Tutustu muilta saamiisi palautteisiin.")}</p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((x) => (
          <ReflectionTextarea
            key={x.k}
            fieldKey={x.k}
            label={tr(x.q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S61 (PDF p67): Visioni ja tavoitteeni -----
function S61_visio({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Millainen ihminen haluat olla?",
    "Mitä vahvuuksia ja taitoja haluaisit kehittää itsessäsi ja miksi?",
    "Onko sinulla joku esikuva, jolla on näitä ominaisuuksia? Kuka ja mitä?",
    "Miten voit kompensoida omia heikkouksiasi vahvuuksiesi avulla?",
    "Mitä toivoisit, että ystäväsi ja perheesi kertoisivat sinusta, kun et ole paikalla? Millaisena haluat tulla muistetuksi?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s61-h">
        <h1 className="font-display text-2xl mb-1">{tr("Visioni ja tavoitteeni")}</h1>
        <p className="text-sm opacity-90">{tr("Pohdi lopuksi:")}</p>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_62_visioni_${i + 1}`}
            label={tr(q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S62 (PDF p68): Kerro vahvuuksistasi videon tai esityksen avulla -----
function S62_video({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Mitkä ovat ydinvahvuuksiasi? Mitä rakastat tehdä? Milloin olet aidoimmillasi? Mistä saat energiaa? Mitkä vahvuuksia voisit nostaa esiin videolla entä työhaastattelussa?",
    "Missä ammateissa tai työtehtävissä vahvuutesi pääsisivät oikeuksiinsa?",
    "Miten hyödynnät vahvuuksiasi eri ihmisten kanssa?",
    "Missä ympäristöissä vahvuutesi pääsevät esiin parhaiten?",
    "Mistä saat usein positiivista palautetta toisilta?",
    "Miten käytät vahvuuksiasi ryhmässä? Mihin se vaikuttaa?",
    "Mitä haluat sanoa videolla tai esityksessä? Mitä haluat jättää katsojan mieleen?",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s62-h">
        <h1 className="font-display text-2xl">
          {tr("Kerro vahvuuksistasi videon tai esityksen avulla")}
        </h1>
      </StickyNote>
      <div className="grid gap-3">
        {qs.map((q, i) => (
          <ReflectionTextarea
            key={i}
            fieldKey={`screen_63_kerro_${i + 1}`}
            label={tr(q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </div>
  );
}

// ----- S63 (PDF p69): Muistiinpanoja — stems -----
function S63_notes({ onSaveStateChange }: Props) {
  const tr = useTr();
  const stems = [
    { k: "screen_64_havainnot", q: "Omat havainnot vahvuuksistani…" },
    { k: "screen_64_muistaa",   q: "Tämän haluan muistaa ainakin…" },
    { k: "screen_64_tarkeaa",   q: "Minulle on tärkeää…" },
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s63-h">
        <h1 className="font-display text-2xl">{tr("Muistiinpanoja")}</h1>
      </StickyNote>
      {stems.map((s) => (
        <ReflectionTextarea
          key={s.k}
          fieldKey={s.k}
          label={tr(s.q)}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
      ))}
    </div>
  );
}

// ----- S64 (PDF p70): Muistiinpanoja — free notes -----
function S64_notesB({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s64-h">
        <h1 className="font-display text-2xl">{tr("Muistiinpanoja")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_65_notes"
        label={tr("Vapaita muistiinpanoja")}
        rows={10}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S65 (PDF p71): Muistiinpanoja — free notes -----
function S65_notesC({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s65-h">
        <h1 className="font-display text-2xl">{tr("Muistiinpanoja")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_66_notes"
        label={tr("Vapaita muistiinpanoja")}
        rows={10}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S66 (PDF p72): Anna itsellesi ja toisille palautetta — informational -----
function S66_palauteInfo() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s66-h">
        <h1 className="font-display text-2xl mb-1">{tr("Anna itsellesi ja toisille palautetta!")}</h1>
      </StickyNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <StickyNote tone="white" seed="s66-a">
          <div className="font-display text-sm mb-1">{tr("MITÄ VAHVUUKSIA SINUSSA NÄHTIIN")}</div>
          <p className="text-xs opacity-80">
            {tr("Tämä sivu kannustaa kokoamaan toisilta saadut vahvuushavainnot näkyväksi — esimerkiksi luokassa, perheessä tai ystäväpiirissä.")}
          </p>
        </StickyNote>
        <StickyNote tone="white" seed="s66-b">
          <div className="font-display text-sm mb-1">{tr("SINUN VAHVUUKSIASI")}</div>
          <p className="text-xs opacity-80">
            {tr("Anna itse itsellesi vahvuuspalautetta. Mitä vahvuuksia olet bongannut itsestäsi erityisesti?")}
          </p>
        </StickyNote>
      </div>
      <p className="text-center text-xs opacity-60">
        {tr("Alkuperäisen sivun käsinkirjoitettua ulkoasua ei voitu poimia PDF:stä; sivu on tilapäisesti esitetty kahtena ohjeistuslappuna.")}
      </p>
    </div>
  );
}

// ----- S67 (PDF p73): 5 vinkkiä sinulle — informational -----
function S67_vinkit() {
  const tr = useTr();
  const tips = [
    "Huomaa hyvä itsessäsi ja ole siitä ylpeä siitä, mitä jo osaat.",
    "Tunnista ja hyödynnä omia vahvuuksiasi.",
    "Kannusta ja kehu toisia.",
    "Ole ystävällinen myös itseäsi kohtaan.",
    "Uskalla näyttää innostuksesi. Se tarttuu!",
  ];
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s67-h">
        <h1 className="font-display text-2xl">{tr("5 vinkkiä sinulle")}</h1>
      </StickyNote>
      <ol className="grid gap-2">
        {tips.map((t, i) => (
          <StickyNote key={i} tone="white" seed={`s67-${i}`}>
            <div className="flex items-start gap-3">
              <span className="font-display text-2xl text-[color:var(--coral)]">{i + 1}.</span>
              <span className="text-sm leading-relaxed pt-1">{tr(t)}</span>
            </div>
          </StickyNote>
        ))}
      </ol>
    </div>
  );
}

// ----- S68 (PDF p74): Reflektoi tuloksia -----
function S68_reflekto({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="coral" seed="s68-h">
        <h1 className="font-display text-2xl">{tr("Reflektoi tuloksia")}</h1>
      </StickyNote>
      <ReflectionTextarea
        fieldKey="screen_69_kertovat"
        label={tr("Mitä vahvuutesi kertovat sinusta?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_69_kehittamisesta"
        label={tr("Minkä vahvuuksien kehittämisestä olisi sinulle eniten iloa?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_69_tilanteissa"
        label={tr("Missä tilanteissa ja ympäristöissä pääset käyttämään vahvuuksiasi päivittäin?")}
        rows={4}
        onSaveStateChange={onSaveStateChange}
      />
      <ReflectionTextarea
        fieldKey="screen_69_toimia"
        label={tr("Miten sinun kannattaisi toimia, jos haluaisit hyödyntää vahvuuksiasi enemmän — opinnoissa, vapaa-ajalla ja ystävyyssuhteissa?")}
        rows={5}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

// ----- S69 (PDF p75): Täydennä vahvuusmittari — finale -----
function S69_finale() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="yellow" seed="s69-h" className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
          {tr("Vahvuusseikkailu päättyy")}
        </div>
        <h1 className="font-display text-3xl leading-tight mb-2">
          {tr("Täydennä vahvuusmittari ja vertaa tuloksia itse valitsemiisi vahvuuskarkkeihin.")}
        </h1>
        <p className="text-sm">{tr("Mitä huomaat?")}</p>
      </StickyNote>
      <StickyNote tone="white" seed="s69-b">
        <p className="text-sm leading-relaxed">
          {tr("Suurin osa meistä ihmisistä pystyy tunnistamaan helposti ainakin osan omista ydinvahvuuksistaan. Tämä on osa itsetuntemusta, joka on yhteydessä hyvinvointiin.")}
        </p>
      </StickyNote>
      <StickyNote tone="coral" seed="s69-end" className="text-center">
        <div className="font-display text-2xl mb-1">{tr("Onneksi olkoon! 🎉")}</div>
        <p className="text-sm">
          {tr("Olet käynyt läpi koko Vahvuusportfolion. Voit aina palata aiempiin sivuihin ja täydentää vastauksiasi — tallennukset säilyvät.")}
        </p>
      </StickyNote>
    </div>
  );
}

// ----- S70: Loppuyhteenveto -----
function S70_end() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <StickyNote tone="mint" seed="s70-h" className="text-center">
        <h1 className="font-display text-3xl mb-2">{tr("Kiitos seikkailusta! 🌟")}</h1>
        <p className="text-sm leading-relaxed">
          {tr("Vahvuusportfoliosi on nyt koossa. Käytä sitä esimerkiksi kesätyönhaussa, jatko-opintoihin hakeutuessa tai aina kun haluat muistuttaa itseäsi siitä, millainen olet parhaimmillasi.")}
        </p>
      </StickyNote>
    </div>
  );
}

const REGISTRY: Record<number, (p: Props) => ReactNode> = {
  1: () => <Cover />,
  2: () => <Modules />,
  3: () => <Quote />,
  4: () => <Definition />,
  5: (p) => <Tieto {...p} />,
  6: (p) => <StrengthsList {...p} />,
  7: () => <ThreeSteps />,
  8: (p) => <JokoTunnet {...p} />,
  9: (p) => <KysyPalautetta {...p} />,
  10: (p) => <MinaOlen {...p} />,
  11: () => <M1Intro />,
  12: (p) => <Karkkikauppa {...p} />,
  13: (p) => <S13 {...p} />,
  14: (p) => <S14 {...p} />,
  15: () => <S15 />,
  16: (p) => <S16 {...p} />,
  17: (p) => <S17 {...p} />,
  18: (p) => <S18 {...p} />,
  19: () => <S19 />,
  20: (p) => <S20 {...p} />,
  21: (p) => <S21 {...p} />,
  22: (p) => <S22 {...p} />,
  23: (p) => <S23 {...p} />,
  24: (p) => <S24 {...p} />,
  25: (p) => <S25 {...p} />,
  26: (p) => <S26 {...p} />,
  27: () => <M2Intro />,
  28: () => <S28 />,
  29: (p) => <S29 {...p} />,
  30: (p) => <S30 {...p} />,
  31: (p) => <S31 {...p} />,
  32: (p) => <S32 {...p} />,
  33: (p) => <S33 {...p} />,
  34: (p) => <S34 {...p} />,
  35: () => <S35 />,
  36: (p) => <S36 {...p} />,
  37: (p) => <S37 {...p} />,
  38: (p) => <S38 {...p} />,
  39: (p) => <S39 {...p} />,
  40: () => <M3Intro />,
  41: () => <M3Intro />, // module 3 title shown again? Actually S41=p47 karkki.
  42: (p) => <S42_perhe {...p} />,
  43: (p) => <S43_perheenjasen {...p} />,
  44: (p) => <S44_kysy {...p} />,
  45: () => <S45_kirje />,
  46: () => <M4Intro />,
  47: (p) => <S47 {...p} />,
  48: (p) => <S48_vapaa {...p} />,
  49: () => <S49_loveinfo />,
  50: (p) => <S50_love {...p} />,
  51: (p) => <S51_loveB {...p} />,
  52: () => <S52_kollaasiInfo />,
  53: (p) => <S53_kollaasi {...p} />,
  54: () => <M5Intro />,
  55: (p) => <S55 {...p} />,
  56: (p) => <S56_ystava {...p} />,
  57: (p) => <S57_palaute {...p} />,
  58: () => <M6Intro />,
  59: (p) => <S59_yhteenveto {...p} />,
  60: (p) => <S60_pohdi {...p} />,
  61: (p) => <S61_visio {...p} />,
  62: (p) => <S62_video {...p} />,
  63: (p) => <S63_notes {...p} />,
  64: (p) => <S64_notesB {...p} />,
  65: (p) => <S65_notesC {...p} />,
  66: () => <S66_palauteInfo />,
  67: () => <S67_vinkit />,
  68: (p) => <S68_reflekto {...p} />,
  69: () => <S69_finale />,
  70: () => <S70_end />,
};

// Correct M3 mapping: per the workbook table M3 = PDF p46 (title) and content
// p47–p51. After M2 ends at S39 (PDF p45 "Minä olen"), S40 is M3 title (PDF
// p46). S41 = PDF p47 (Vahvuuskarkkini kotona).
REGISTRY[40] = () => <M3Intro />;
REGISTRY[41] = (p) => (
  <VahvuuskarkkiSheet
    title="Vahvuuskarkkini"
    context="kotona"
    fieldPrefix="screen_42"
    onSaveStateChange={p.onSaveStateChange}
  />
);

import { meterContentFor } from "./meter-content";
import { METER_FIRST_SCREEN, METER_TOP } from "./meter-data";

export function hasContent(n: number): boolean {
  if (n in REGISTRY) return true;
  if (n >= METER_FIRST_SCREEN && n <= METER_TOP) return true;
  return false;
}

export function ScreenContent({ n, onSaveStateChange }: { n: number } & Props): ReactNode {
  if (n >= METER_FIRST_SCREEN && n <= METER_TOP) {
    return meterContentFor(n, { onSaveStateChange });
  }
  const Comp = REGISTRY[n];
  if (!Comp) return null;
  return Comp({ onSaveStateChange });
}

