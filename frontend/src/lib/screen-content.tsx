import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { StickyNote } from "@/components/StickyNote";
import { WORLDS } from "@/lib/screens";
import { ReflectionTextarea, ReflectionInput } from "@/components/ReflectionTextarea";
import { SelectableChips } from "@/components/SelectableChips";
import { useAutosave, loadResponse, type SaveState } from "@/hooks/use-autosave";
import { useReportCompletion } from "@/lib/screen-completion";
import { cn } from "@/lib/utils";
import { useTr, useLanguage } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { Heart } from "lucide-react";

// Screens 1–22: content sourced verbatim from the workbook PDF
// "Vahvuusportfolio lukiolaiselle" (Huomaa hyvä!®).

export const STRENGTHS_24 = [
  "Rohkeus",
  "Luovuus",
  "Innostus",
  "Reiluus",
  "Sisukkuus",
  "Myötätunto",
  "Huumorintaju",
  "Ystävällisyys",
  "Kauneuden ja erinomaisuuden arvostus",
  "Oppimisen ilo",
  "Rehellisyys",
  "Sosiaalinen älykkyys",
  "Sinnikkyys",
  "Kiitollisuus",
  "Henkisyys",
  "Johtajuus",
  "Toiveikkuus",
  "Anteeksiantavuus",
  "Arviointikyky",
  "Uteliaisuus",
  "Itsesäätely",
  "Rakkaus",
  "Näkökulmanottokyky",
  "Harkitsevaisuus",
  "Vaatimattomuus",
  "Ryhmätyötaidot",
];

type Props = { onSaveStateChange?: (s: SaveState) => void };

// ------------------------------------------------------------------
// FIX: helper to translate multi-line strings ("\n" -> <br />) so that
// headings/paragraphs that used to be hardcoded JSX with <br /> can now
// be run through tr() as a single translatable string.
// ------------------------------------------------------------------
function trLines(
  tr: (key: string, params?: Record<string, string | number>) => string,
  text: string,
) {
  const translated = tr(text);
  const parts = translated.split("\n");
  return parts.map((line, i) => (
    <span key={i}>
      {line}
      {i < parts.length - 1 && <br />}
    </span>
  ));
}

function Screen1() {
  const tr = useTr();

  return (
    <div className="relative flex h-full min-h-[620px] w-full flex-col overflow-hidden px-[5%] text-center font-display text-white">
      <div className="relative z-10 flex shrink-0 flex-col items-center pt-[5vh]">
        <div className="text-[clamp(24px,2.4vw,42px)] font-bold leading-none tracking-[0] text-white">
          {tr("Huomaa hyvä!®")}
        </div>

        <h1
          className="
            mt-[2.5vh]
            max-w-[900px]
            text-[clamp(30px,3.4vw,48px)]
            font-medium
            leading-[1.08]
            tracking-[0]
            text-white
          "
        >
          {trLines(tr, "Vahvuusportfolio\nlukiolaiselle")}
        </h1>
      </div>

      <div
        className="
          relative
          z-0
          flex
          min-h-0
          flex-1
          items-center
          justify-center
          pb-[3vh]
          pt-[2vh]
        "
      >
        <img
          src="/illustrations/naytto-1.png"
          alt=""
          aria-hidden="true"
          className="
    pointer-events-none
    block
    h-auto
    w-[760px]
    max-w-[90%]
    object-contain
    object-center
    select-none
    -translate-y-12
  "
        />
      </div>
    </div>
  );
}

//=============Tarot======================//

function Screen2() {
  const tr = useTr();

  const moduleKeys = [
    {
      id: "m1",
      translationKey:
        "1 – Omat ydinvahvuudet | Tutustut ja opit omista luonteenvahvuuksista. | sivut 16–33",
    },
    {
      id: "m2",
      translationKey:
        "2 – Omat vahvuudet lukiossa | Tutustut henkilökohtaisiin vahvuuksiin opiskelijana. Opit kysymään palautetta opettajilta ja opiskelukavereilta. | sivut 34–46",
    },
    {
      id: "m3",
      translationKey:
        "3 – Omat vahvuudet kotona | Tutustut henkilökohtaisiin vahvuuksiin kotona. Myös vanhemmat / läheiset kertovat sinun vahvuuksistasi. | sivut 47–52",
    },
    {
      id: "m4",
      translationKey:
        "4 – Omat vahvuudet vapaa-ajalla ja harrastuksissa | Tutustut omiin vahvuuksiin ja niiden hyödyntämiseen vapaa-ajalla. | sivut 53–60",
    },
    {
      id: "m5",
      translationKey:
        "5 – Omat vahvuudet ystävyyssuhteissa | Tutustut omiin vahvuuksiin ystävyyssuhteissa. Opit kysymään ja antamaan palautetta. | sivut 61–64",
    },
    {
      id: "m6",
      translationKey:
        "6 – Vahvuusportfolion kokoaminen | Reflektoi oppimaasi ja hyödynnä omia vahvuuksiasi – esimerkiksi kesätyönhaussa. | sivut 65–76",
    },
  ] as const;

  const modules = WORLDS.filter((world) => moduleKeys.some((item) => item.id === world.id));

  return (
    <div className="relative min-h-[620px] w-full overflow-x-hidden overflow-y-auto px-[4%] pb-10 pt-8">
      <h1 className="mb-10 text-center font-display text-[clamp(28px,2.6vw,40px)] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
        {tr("Taso")}
      </h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {modules.map((module, index) => {
          const moduleKey = moduleKeys.find((item) => item.id === module.id);
          const translated = moduleKey ? tr(moduleKey.translationKey) : "";
          const [rawTitle = "", description = ""] = translated.split(" | ");
          const title = rawTitle.replace(/^\d+\s*–\s*/, "");

          return (
            <div
              key={module.id}
              className="relative flex min-h-[330px] min-w-0 flex-col rounded-[22px] border-2 border-black bg-white px-4 pb-6 pt-11 text-center text-white"
            >
              <div className="absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-[#7755c9] text-[22px] font-semibold text-white">
                {index + 1}
              </div>

              <h2 className="mb-4 break-words font-display text-[clamp(16px,1.35vw,22px)] font-semibold leading-[1.15] text-[#7654ad]">
                {title}
              </h2>

              <p className="break-words text-[clamp(15px,1vw,18px)] leading-[1.3] text-[#7654ad]">
                {description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mapTone(tone: string): "white" | "yellow" | "mint" | "coral" {
  if (tone === "yellow" || tone === "mint" || tone === "coral") return tone;
  return "white";
}

function Screen3() {
  const tr = useTr();
  const { language } = useLanguage();

  const illustrationSrc =
    language === "en"
      ? "/illustrations/naytto-2-en.png"
      : language === "sv"
        ? "/illustrations/naytto-2-sv.png"
        : "/illustrations/naytto-2.png";

  return (
    <div className="grid min-h-[600px] w-full min-w-0 grid-cols-[60%_40%] overflow-hidden">
      <div className="flex min-w-0 flex-col justify-center pl-[2%] pr-[3%] text-white">
        <h1
          className="
            m-0
            text-center
            font-display
            font-normal
            tracking-[-0.01em]
            text-white
          "
        >
          <span
            className="
              block
              text-[clamp(34px,4vw,56px)]
              font-medium
              leading-[1.15]
            "
          >
            {tr("Panosta vahvuuksiisi.")}
          </span>

          <span
            className="
              mx-auto
              mt-4
              block
              max-w-[780px]
              text-[clamp(22px,2.5vw,36px)]
              font-normal
              leading-[1.3]
            "
          >
            {tr("Kasvat eniten niillä alueilla, joilla olet jo vahva.")}
          </span>
        </h1>
      </div>

      <div className="flex min-w-0 items-center justify-end pr-0">
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            block
            h-auto
            max-h-full
            w-auto
            max-w-full
            object-contain
          "
        />
      </div>
    </div>
  );
}
//s4
function Screen4() {
  const tr = useTr();

  return (
    <div className="relative flex min-h-[600px] w-full items-center justify-center overflow-hidden px-6 text-white">
      <h1
        className="
          mx-auto
          max-w-[1150px]
          text-center
          font-display
          font-normal
          tracking-[-0.01em]
          text-white
        "
      >
        <span
          className="
            block
            text-[clamp(30px,3.4vw,48px)]
            font-medium
            leading-[1.18]
          "
        >
          {tr(
            "Vahvuudet eivät ole ominaisuuksia, joissa olet hyvä, eivätkä heikkoudet niitä, joissa tunnet itsesi huonoksi.",
          )}
        </span>

        <span
          className="
            mx-auto
            mt-5
            block
            max-w-[980px]
            text-[clamp(22px,2.5vw,34px)]
            font-normal
            leading-[1.3]
          "
        >
          {tr(
            "Sen sijaan vahvuudet tekevät kantajastaan vahvan ja heikkoudet toimivat päinvastoin.",
          )}
        </span>
      </h1>
    </div>
  );
}
//s5
function Screen5({ onSaveStateChange: _onSaveStateChange }: Props) {
  const tr = useTr();

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-scroll
        overscroll-contain
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          grid
          w-full
          grid-cols-1
          gap-10
          pb-[150px]
          lg:grid-cols-[minmax(0,1fr)_430px]
        "
      >
        {/* =========================
            BÊN TRÁI: TEXT
        ========================== */}

        <div className="min-w-0">
          {/* PHẦN CHỮ LỚN */}

          <div>
            <h1 className="font-display text-white">{tr("Tietoa vahvuuksista")}</h1>

            <p
              className="
                font-display
                text-[clamp(21px,1.85vw,28px)]
                font-normal
                leading-[1.42]
                tracking-[-0.005em]
                text-white
              "
            >
              {tr(
                "Luonteenvahvuudet ovat persoonan myönteisiä piirteitä, joita hyödyntämällä sinä, opiskelukaverisi ja monenlaiset yhteisöt, kuten lukiot, voivat kukoistaa. Niitä ovat esimerkiksi sinnikkyys, uteliaisuus, rohkeus ja myötätuntoisuus. Jokaisella opiskelijalla on vahvuuksia ja kehittymässä olevaa vahvuuspotentiaalia. Vahvuuksien voi ajatella heijastelevan sitä, millainen kukin meistä on ihmisenä parhaimmillaan.",
              )}
            </p>
          </div>

          {/* PHẦN CHỮ NHỎ */}

          <div
            className="
              mt-7
              max-w-[880px]
              space-y-4
              font-display
              text-[clamp(16px,1.25vw,19px)]
              font-normal
              leading-[1.5]
              text-white
            "
          >
            <p>
              {tr(
                "Vahvuudet auttavat haasteiden kohtaamisessa ja edistävät niistä ylipääsemisessä eli selviytymisessä. Taidoilla ja vahvuuksilla on eroa. Taidot ovat opittuja, kun taas vahvuudet ovat itselle luontaisia ja tärkeitä ajattelu- ja toimintatapoja.",
              )}
            </p>

            <p>
              {tr(
                "Jokaisella on omat ydinvahvuutensa, joihin kannattaa keskittyä ja joita on järkevää vahvistaa! Omien vahvuuksien tunteminen ja niiden hyödyntäminen opiskelussa ja vapaa-ajalla lisää tyytyväisyyttä, opiskelun mielekkyyttä ja hyvinvointia.",
              )}
            </p>

            <p className="pt-1 font-medium">{tr("Tervetuloa mukaan lukiolainen!")}</p>
          </div>
        </div>

        {/* =========================
            BÊN PHẢI: ILLUSTRATION
        ========================== */}

        <div
          className="
            flex
            min-w-0
            items-center
            justify-center
          "
        >
          <img
            src="/illustrations/tieto-vahvuuksista.png"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              block
              h-auto
              w-full
              max-w-[430px]
              object-contain
              object-center
              select-none
            "
          />
        </div>
      </div>
    </div>
  );
}

// S6
function Screen6({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  const report = useReportCompletion();

  const fieldKey = "screen_6_known_strengths";
  const maxSelections = 3;

  const legacyNameToId: Record<string, number> = {
    Luovuus: 1,
    Uteliaisuus: 2,
    Arviointikyky: 3,
    "Oppimisen ilo": 4,
    Näkökulmanottokyky: 5,

    Rohkeus: 6,
    Sinnikkyys: 7,
    Rehellisyys: 8,
    Innokkuus: 9,
    Innostus: 9,
    Sisukkuus: 10,

    Myötätunto: 11,
    Rakkaus: 12,
    Ystävällisyys: 13,
    "Sosiaalinen älykkyys": 14,

    Ryhmätyötaito: 15,
    Ryhmätyötaidot: 15,
    Reiluus: 16,
    Johtajuus: 17,

    Anteeksiantavuus: 18,
    Vaatimattomuus: 19,
    Harkitsevuus: 20,
    Harkitsevaisuus: 20,
    Itsesäätely: 21,

    "Kauneuden ja erinomaisuuden arvostaminen": 22,
    "Kauneuden ja erinomaisuuden arvostus": 22,

    Kiitollisuus: 23,
    Toiveikkuus: 24,
    Huumorintaju: 25,

    Hengellisyys: 26,
    Henkisyys: 26,
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadResponse<unknown[]>(fieldKey);

      if (cancelled) return;

      if (Array.isArray(saved)) {
        const migratedIds = saved
          .map((item) => {
            if (typeof item === "number" && Number.isInteger(item) && item >= 1 && item <= 26) {
              return item;
            }

            if (typeof item === "string") {
              return legacyNameToId[item];
            }

            return undefined;
          })
          .filter((id): id is number => typeof id === "number");

        setSelectedIds([...new Set(migratedIds)].slice(0, maxSelections));
      }

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const state = useAutosave(fieldKey, selectedIds, {
    enabled: loaded,
  });

  useEffect(() => {
    onSaveStateChange?.(state);
    if (state === "saved") setPendingSave(false);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;

    // Do not unlock navigation until a changed selection is safely persisted.
    // Existing saved selections loaded from the database remain complete.
    report(fieldKey, selectedIds.length >= 1 && !pendingSave);
  }, [loaded, pendingSave, report, selectedIds.length]);

  function toggleStrength(id: number) {
    // Clicking a fourth strength does not change the value, so it must not
    // create a pending-save state that can never resolve.
    if (!selectedIds.includes(id) && selectedIds.length >= maxSelections) return;

    setPendingSave(true);
    setSelectedIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((selectedId) => selectedId !== id);
      }

      if (currentIds.length >= maxSelections) {
        return currentIds;
      }

      return [...currentIds, id];
    });
  }

  return (
    <div className="relative min-h-[560px] overflow-hidden p-8 text-white">
      <div className="relative z-10 grid h-full grid-cols-[220px_minmax(0,1fr)] gap-8">
        {/* JAR */}
        <aside className="flex flex-col items-center justify-center pt-4 text-center">
          <div className="relative h-[245px] w-[185px]">
            {/* Jar lid */}
            <div
              className="
                absolute
                left-1/2
                top-0
                z-20
                h-[28px]
                w-[140px]
                -translate-x-1/2
                rounded-full
                border-[3px]
                border-black
                bg-[#EAF9FC]
              "
            />

            {/* Jar body */}
            <div
              className="
                absolute
                bottom-0
                left-1/2
                h-[220px]
                w-[175px]
                -translate-x-1/2
                overflow-hidden
                rounded-[36px]
                border-[3px]
                border-black
                bg-white/20
                shadow-[0_9px_0_rgba(0,0,0,0.14)]
              "
            >
              {selectedIds.length === 0 && (
                <div
                  className="
                    absolute
                    left-1/2
                    top-[70px]
                    w-[125px]
                    -translate-x-1/2
                    -rotate-3
                    bg-[#FFF4DE]
                    px-3
                    py-3
                    text-center
                    text-[11px]
                    font-bold
                    leading-tight
                    text-[#4C3B58]
                  "
                >
                  {tr("Minun vahvuuteni")}
                </div>
              )}

              <div
                className="
                  absolute
                  inset-x-2
                  bottom-5
                  flex
                  flex-col-reverse
                  items-center
                  gap-2
                "
              >
                {selectedIds.map((id, index) => {
                  const color = getStrengthColor(id);
                  const name = getStrengthName(id, language);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleStrength(id)}
                      title={name}
                      className={`
                        flex
                        items-center
                        justify-center
                        transition-transform
                        hover:scale-105
                        ${index === 0 ? "-rotate-2" : ""}
                        ${index === 1 ? "rotate-2" : ""}
                        ${index === 2 ? "-rotate-1" : ""}
                      `}
                    >
                      <span
                        aria-hidden="true"
                        className="
                          h-[24px]
                          w-[14px]
                          shrink-0
                          rounded-full
                          border-2
                          border-black
                        "
                        style={{
                          backgroundColor: color,
                        }}
                      />

                      <span
                        className="
                          -mx-[2px]
                          flex
                          min-h-[32px]
                          max-w-[120px]
                          items-center
                          justify-center
                          rounded-full
                          border-2
                          border-black
                          px-3
                          py-1
                          text-center
                          text-[9px]
                          font-semibold
                          leading-[1.05]
                          text-[#2E2336]
                          shadow-sm
                        "
                        style={{
                          backgroundColor: color,
                        }}
                      >
                        {name}
                      </span>

                      <span
                        aria-hidden="true"
                        className="
                          h-[24px]
                          w-[14px]
                          shrink-0
                          rounded-full
                          border-2
                          border-black
                        "
                        style={{
                          backgroundColor: color,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative mt-5 max-w-[205px] text-center font-display text-[13px] font-semibold leading-[1.25] text-[#FFE65A]">
            <span className="absolute -left-7 top-2 -rotate-[25deg] text-[34px]">↗</span>

            {tr(
              "Valitse ne vahvuudet, jotka tunnistat itsessäsi tai läheisissäsi. Voit palata muokkaamaan valintaasi myöhemmin.",
            )}
          </div>

          <div className="mt-3 font-display text-[14px] font-semibold">
            {tr("Valittu")} {selectedIds.length} / {maxSelections}
          </div>
        </aside>

        {/* STRENGTH CANDIES */}
        <section className="min-w-0 pt-1">
          <h1 className="mb-1 max-w-[850px] font-display text-[30px] font-bold leading-tight">
            {tr("Luonteenvahvuudet, joita voit tunnistaa itsessäsi ja toisissa")}
          </h1>

          <p className="mb-4 font-display text-[18px] font-medium">{tr("Keksitkö lisää?")}</p>

          <div className="grid max-w-[1000px] grid-cols-5 gap-x-3 gap-y-3">
            {Array.from({ length: 26 }, (_, index) => index + 1).map((id) => {
              const name = getStrengthName(id, language);
              const color = getStrengthColor(id);

              const isSelected = selectedIds.includes(id);

              const selectionDisabled = selectedIds.length >= maxSelections && !isSelected;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={selectionDisabled}
                  onClick={() => toggleStrength(id)}
                  aria-pressed={isSelected}
                  aria-label={name}
                  className={cn(
                    `
                      group
                      flex
                      min-w-0
                      items-center
                      justify-center
                      transition-all
                      duration-150
                    `,
                    isSelected && "scale-105",
                    selectionDisabled && "cursor-not-allowed opacity-35",
                    !selectionDisabled && "hover:scale-105",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="
                      h-[34px]
                      w-[18px]
                      shrink-0
                      rounded-full
                      border-2
                      border-black
                    "
                    style={{
                      backgroundColor: color,
                    }}
                  />

                  <span
                    className={cn(
                      `
                        -mx-[2px]
                        flex
                        min-h-[46px]
                        w-[128px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border-2
                        border-black
                        px-2
                        py-1
                        text-center
                        font-display
                        text-[10px]
                        font-semibold
                        leading-[1.08]
                        text-[#2E2336]
                        shadow-[0_4px_0_rgba(0,0,0,0.12)]
                      `,
                      isSelected && "ring-4 ring-white/70",
                    )}
                    style={{
                      backgroundColor: color,
                    }}
                  >
                    {name}
                  </span>

                  <span
                    aria-hidden="true"
                    className="
                      h-[34px]
                      w-[18px]
                      shrink-0
                      rounded-full
                      border-2
                      border-black
                    "
                    style={{
                      backgroundColor: color,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// S7 (PDF p7): only three short phrases on the page. No invented blurbs.
function Screen7() {
  const tr = useTr();

  return (
    <div className="relative min-h-[620px] w-full overflow-hidden">
      {/* LEFT */}
      <div className="absolute left-[5%] top-[9%] flex w-[30%] flex-col items-center">
        <div className="flex h-[430px] w-full items-center justify-center">
          <img
            src="/illustrations/illustration-left-transparent.png"
            alt={tr("Tunnista omia vahvuuksia")}
            className="
              h-[400px]
              w-auto
              max-w-full
              object-contain
            "
          />
        </div>

        <p
          className="
            mt-3
            text-center
            font-display
            text-[24px]
            font-semibold
            text-white
            [-webkit-text-stroke:1px_#000]
            [paint-order:stroke_fill]
          "
        >
          {tr("Tunnista omia vahvuuksia")}
        </p>
      </div>

      {/* CENTER */}
      <div className="absolute left-1/2 top-[4%] flex w-[30%] -translate-x-1/2 flex-col items-center">
        <div className="flex h-[430px] w-full items-center justify-center">
          <img
            src="/illustrations/illustration-center-transparent.png"
            alt={tr("Hyödynnä omia vahvuuksia")}
            className="
              h-[430px]
              w-auto
              max-w-full
              object-contain
            "
          />
        </div>

        <p
          className="
            mt-3
            whitespace-nowrap
            text-center
            font-display
            text-[24px]
            font-semibold
            text-white
            [-webkit-text-stroke:1px_#000]
            [paint-order:stroke_fill]
          "
        >
          {tr("Hyödynnä omia vahvuuksia")}
        </p>
      </div>

      {/* RIGHT */}
      <div className="absolute right-[5%] top-[9%] flex w-[30%] flex-col items-center">
        <div className="flex h-[430px] w-full items-center justify-center">
          <img
            src="/illustrations/illustration-right-transparent.png"
            alt={tr("Kehitä omia vahvuuksia")}
            className="
              h-[400px]
              w-auto
              max-w-full
              object-contain
            "
          />
        </div>

        <p
          className="
            mt-3
            text-center
            font-display
            text-[24px]
            font-semibold
            text-white
            [-webkit-text-stroke:1px_#000]
            [paint-order:stroke_fill]
          "
        >
          {tr("Kehitä omia vahvuuksia")}
        </p>
      </div>
    </div>
  );
}
//s8
function Screen8({ onSaveStateChange }: Props) {
  const tr = useTr();

  const questions = [
    {
      fieldKey: "screen_8_s8_love",
      text: "Tiedätkö, mitä rakastat tehdä?",
    },
    {
      fieldKey: "screen_8_s8_freetime",
      text: "Mitkä ovat kiinnostuksen kohteesi vapaa-ajalla?",
    },
    {
      fieldKey: "screen_8_s8_motivate",
      text: "Minkä alkamista odotat, entä mistä koulutehtävistä motivoidut eniten?",
    },
    {
      fieldKey: "screen_8_s8_authentic",
      text: "Milloin ja mitä tehdessä koet, että olet aidoimmillasi, eniten oma itsesi ja onnistut sinulle tärkeissä asioissa?",
    },
    {
      fieldKey: "screen_8_s8_persist",
      text: "Mitä tehdessä jaksat ponnistella sinnikkäästi ja ylittää haasteita, sekä kestät epämiellyttäviä tunteita?",
    },
  ] as const;

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[4%]
        pb-10
        pt-5
        text-black
        [scrollbar-gutter:stable]
      "
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <h1
          className="
            max-w-[900px]
            font-display
            text-[clamp(28px,2.4vw,38px)]
            font-medium
            leading-[1.18]
            tracking-[-0.01em]
            text-white
          "
        >
          {tr("Lukiolainen – joko tunnet omat vahvuutesi?")}
        </h1>

        <div
          className="
            mt-6
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
          "
        >
          {questions.map((item, index) => {
            const isLast = index === questions.length - 1;

            return (
              <section
                key={item.fieldKey}
                className={`
                  flex
                  min-h-[235px]
                  min-w-0
                  flex-col
                  rounded-[22px]
                  border-[3px]
                  border-black
                  bg-[#faf8ff]
                  px-5
                  pb-5
                  pt-5
                  shadow-[0_6px_0_rgba(0,0,0,0.18)]
                  ${isLast ? "md:col-span-2" : ""}
                `}
              >
                <h2
                  className="
                    min-h-[58px]
                    text-left
                    font-display
                    text-[clamp(17px,1.35vw,21px)]
                    font-medium
                    leading-[1.35]
                    tracking-[-0.005em]
                    text-black
                  "
                >
                  {tr(item.text)}
                </h2>

                <div
                  className="
                    mt-4
                    min-h-0
                    flex-1
                    overflow-hidden
                    rounded-[16px]
                    border-[2px]
                    border-black
                    bg-white

                    [&_label]:hidden

                    [&>div]:h-full
                    [&>div]:min-h-0

                    [&_div]:border-0
                    [&_div]:bg-transparent
                    [&_div]:p-0
                    [&_div]:shadow-none

                    [&_textarea]:h-full
                    [&_textarea]:w-full
                    [&_textarea]:resize-none
                    [&_textarea]:rounded-[14px]
                    [&_textarea]:border-0
                    [&_textarea]:bg-transparent
                    [&_textarea]:px-4
                    [&_textarea]:py-3
                    [&_textarea]:text-[16px]
                    [&_textarea]:font-normal
                    [&_textarea]:leading-[1.5]
                    [&_textarea]:text-[#241b3f]
                    [&_textarea]:outline-none
                    [&_textarea]:shadow-none
                    [&_textarea]:ring-0
                    [&_textarea]:placeholder:text-[#9a93a6]

                    [&_textarea:focus]:outline-none
                    [&_textarea:focus]:ring-0
                  "
                >
                  <ReflectionTextarea
                    fieldKey={item.fieldKey}
                    label=""
                    rows={isLast ? 4 : 3}
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
//s9
function Screen9({ onSaveStateChange }: Props) {
  const tr = useTr();

  const questions = [
    {
      fieldKey: "screen_9_best_sides",
      text: "Mitä uutta opin palautteista?",
    },
    {
      fieldKey: "screen_9_strengths",
      text: "Mikä palautteessa on minulle tärkeää?",
    },
    {
      fieldKey: "screen_9_learned",
      text: "Millaisista asioista minut muistetaan / tunnistetaan parhaiten?",
    },
    {
      fieldKey: "screen_9_spotted",
      text: "Mitä hyvää vahvuuteni ystävänä ja läheisenä tuovat yhteisööni?",
    },
  ] as const;

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[7%] pb-10 pt-9 text-black">
      <div className="mx-auto w-full max-w-[1150px] rounded-[30px] px-10 py-8 pb-12">
        <h1 className="font-display text-[38px] font-medium leading-[1.1] text-[#f1f1ef]">
          {tr("Kysy palautetta ja opi lisää itsestäsi")}
        </h1>

        <p className="mt-6 max-w-[980px] text-[19px] font-normal leading-[1.45] text-[#f1f1ef]">
          {tr(
            "Kysy 2–4 läheiseltä, opettajalta ja ystävältä palautetta vahvuuksistasi. Käytä sivua 10 pohjana. Pyydä heitä nimeämään vahvuutesi, joita he sinussa eniten arvostavat. Kysy myös, missä ja miten vahvuutesi näkyvät.",
          )}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
          {questions.map((item) => (
            <section
              key={item.fieldKey}
              className="
                relative
                flex
                min-h-[230px]
                min-w-0
                flex-col
                rounded-[22px]
                border-[3px]
                border-black
                bg-[#faf8ff]
                px-5
                pb-5
                pt-5
                shadow-[0_6px_0_rgba(0,0,0,0.18)]
              "
            >
              <h2
                className="
                  min-h-[56px]
                  text-left
                  font-display
                  text-[18px]
                  font-medium
                  leading-[1.35]
                  text-black
                "
              >
                {tr(item.text)}
              </h2>

              <div
                className="
                  mt-4
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[16px]
                  border-2
                  border-black
                  bg-white

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-[120px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[14px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[16px]
                  [&_textarea]:font-normal
                  [&_textarea]:leading-[1.5]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#9a93a6]

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey={item.fieldKey}
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
//s10
function Screen10({ onSaveStateChange }: Props) {
  const tr = useTr();

  const notes = [
    {
      id: 1,
      position: "left-[0%] top-[3%] h-[205px] w-[29%] -rotate-[2deg]",
    },
    {
      id: 2,
      position: "left-[35.5%] top-[0%] h-[205px] w-[29%] rotate-[1deg]",
    },
    {
      id: 3,
      position: "right-[0%] top-[3%] h-[205px] w-[29%] rotate-[2deg]",
    },
    {
      id: 4,
      position: "left-[2%] top-[34%] h-[195px] w-[29%] rotate-[1deg]",
    },
    {
      id: 5,
      position: "left-[36%] top-[32%] h-[195px] w-[29%] -rotate-[1deg]",
    },
    {
      id: 6,
      position: "right-[0%] top-[34%] h-[195px] w-[29%] -rotate-[2deg]",
    },
    {
      id: 7,
      position: "left-[35.5%] top-[64%] h-[190px] w-[29%] rotate-[1deg]",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[3%]
        pb-16
        pt-6
        text-white
       
      "
    >
      <div className="grid min-h-[760px] grid-cols-[0.25fr_0.75fr] gap-7">
        {/* CỘT TRÁI */}
        <div className="relative min-w-0">
          <h1
            className="
              font-display
              text-[42px]
              font-medium
              leading-[1.12]
              tracking-[-0.01em]
            "
          >
            {tr("Minä olen")}
          </h1>

          <p
            className="
              mt-8
              max-w-[290px]
              font-display
              text-[22px]
              font-medium
              leading-[1.4]
            "
          >
            {tr("Muuta muilta saamasi palaute lauseiksi minä muotoon:")}
          </p>

          <div
            className="
              mt-7
              max-w-[290px]
              text-[21px]
              font-normal
              leading-[1.45]
            "
          >
            {tr('"Olet sinnikäs" → "Minä olen sinnikäs."')}
          </div>

          {/* ILLUSTRATION TO HƠN */}
          <img
            src="/illustrations/mina-olen-character.png"
            alt={tr("Minä olen –övning")}
            className="
              pointer-events-none
              absolute
              bottom-[-55px]
              left-[-95px]
              h-[520px]
              w-auto
              max-w-none
              select-none
              object-contain
            "
          />
        </div>

        {/* CỘT PHẢI */}
        <div className="relative min-h-[760px] min-w-0">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`
                absolute
                flex
                flex-col
                overflow-hidden
                rounded-[18px_14px_24px_16px]
                border-[3px]
                border-black
                bg-[#fffefa]
                px-5
                pb-4
                pt-4
                text-black
                shadow-[0_10px_0_#4b326c]
                transition-all
                duration-200
                hover:z-30
                hover:-translate-y-1
                hover:scale-[1.02]
                focus-within:ring-2
                focus-within:ring-[#d5c2ef]
                ${note.position}
              `}
            >
              {/* TIÊU ĐỀ BOX */}
              <p
                className="
                  mb-3
                  shrink-0
                  text-center
                  font-display
                  text-[15px]
                  font-medium
                  uppercase
                  leading-[1.2]
                  tracking-[0.2px]
                  text-black
                "
              >
                {tr("Minä olen ...")}
              </p>

              {/* VÙNG NHẬP */}
              <div
                className="
                  relative
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[12px]
                  border-2
                  border-black
                  bg-[#fffefa]
                  [&_label]:hidden
                  [&>div]:h-full
                  [&>div]:min-h-0
                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none
                  [&_textarea]:relative
                  [&_textarea]:z-10
                  [&_textarea]:h-full
                  [&_textarea]:min-h-[125px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[10px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-3
                  [&_textarea]:py-2
                  [&_textarea]:text-[16px]
                  [&_textarea]:font-normal
                  [&_textarea]:leading-[29px]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#9b93a8]
                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                {/* DÒNG KẺ GIẤY */}
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    inset-x-3
                    inset-y-2
                    z-0
                    opacity-35
                    [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_28px,#b7a8cc_29px)]
                  "
                />

                {/* TEXTAREA */}
                <div className="relative z-10 h-full [&>div]:h-full">
                  <ReflectionTextarea
                    fieldKey={`screen_10_mina_olen_${note.id}`}
                    label=""
                    rows={5}
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
//s11
// FIX: description trước đây là JSX hard-code tiếng Phần Lan, không qua tr().
// Nay chuyển description sang string (dùng "\n" thay cho <br/>) và render bằng trLines().
function Screen11() {
  const tr = useTr();
  const items = [
    {
      title: "1. Huomaa hyvää!",
      description:
        "Harjoittele tunnistamaan myönteistä toimintaa ihmisissä ympärilläsi.\nTee hyvän huomaamisesta tapa ja tottumus.",
    },
    {
      title: "2. Nimeä käytetty vahvuus ja sano palaute ääneen tai liitä viestiin somessa.",
      description: "“Olit todella rohkea.” “Kiitos ystävällisyydestä”. “Sinussa on myötätuntoa”.",
    },
    {
      title: "3. Syvennä ja kuvaile, miten käytetty vahvuus näkyy toisessa. Sanallista tunne.",
      description: "“Olit rohkea. Huomasin, että uskalsit nostaa esille vaikeita asioita.”",
    },
    {
      title: "4. Arvosta ja kerro, miten käytetty vahvuus vaikuttaa. Liitä mukaan tunnesana.",
      description:
        "“Kiitos rohkeudestasi tänään. Tapasi toimia vaikuttaa myönteisesti koko ryhmään.\nOlen susta ylpeä.”",
    },
    {
      title: "5. Huomaa, miten positiivinen palaute ja vahvuuksista puhuminen vaikuttaa toiseen.",
      description: "Miltä sinusta tuntui antaa kehuja ja kiitosta? Mikä oli tärkein oivalluksesi?",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
       
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[720px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[8%]
          pb-20
          pt-14
        "
      >
        <div className="relative z-20 grid grid-cols-[72px_minmax(0,1fr)] gap-x-8">
          <div
            className="
              mt-1
              flex
              h-[150px]
              w-[66px]
              items-center
              justify-center
              rounded-[9px]
              bg-[#7654ad]
              text-white
            "
          >
            <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl] font-display text-[22px] font-semibold">
              {tr("VINKKI!")}
            </span>
          </div>

          <div className="min-w-0">
            <h1
              className="
                max-w-[980px]
                font-display
                text-[clamp(38px,3.4vw,56px)]
                font-semibold
                leading-[1.08]
                text-[#FFD700]
              "
            >
              {trLines(tr, "Näin voit antaa toiselle kehuja ja\nkannustusta vahvuuksista:")}
            </h1>

            <div className="mt-7 max-w-[1160px] space-y-7">
              {items.map((item) => (
                <div key={tr(item.title)}>
                  <h2 className="text-[clamp(19px,1.55vw,26px)] font-semibold leading-[1.35]">
                    {tr(item.title)}
                  </h2>

                  <div className="text-[clamp(18px,1.45vw,25px)] leading-[1.42]">
                    {trLines(tr, item.description)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FIX: alt text giờ bọc tr()
function Screen12() {
  const tr = useTr();

  return (
    <div
      className="
        relative
        h-full
        min-h-[620px]
        w-full
        overflow-hidden
        text-white
      "
    >
      <div
        className="
          relative
          mx-auto
          flex
          h-full
          min-h-[620px]
          w-full
          max-w-[1500px]
          flex-col
          overflow-hidden
          px-[4%]
          pb-0
          pt-8
        "
      >
        {/* TEXT */}
        <div
          className="
            relative
            z-20
            mx-auto
            w-full
            max-w-[1240px]
            
            shrink-0
          "
        >
          <h1
            className="
    mx-auto
    max-w-[1240px]
    text-center
    font-display
    text-[clamp(24px,2.15vw,36px)]
    font-semibold
    leading-[1.08]
    tracking-[-0.01em]
    text-white
  "
          >
            {tr(
              "Meissä kaikissa on paljon enemmän vahvuuksia kuin päällepäin näkyy. Omien vahvuuksien pohtiminen ja hyödyntäminen tukee itsetuntoa, antaa itsevarmuutta ja auttaa tekemään valintoja – esimerkiksi opiskeluun tai työpaikkaan liittyen.",
            )}
          </h1>
        </div>

        {/* ILLUSTRATION */}
        <div
          className="
            relative
            z-10
            mt-6
            flex
            min-h-0
            flex-1
            items-end
            justify-center
          "
        >
          <img
            src="/illustrations/s12-raised-hands.png"
            alt={tr("Erilaisia käsiä nostettuna ilmaan")}
            className="
              pointer-events-none
              block
              h-auto
              max-h-[370px]
              w-auto
              max-w-[100%]
              object-contain
              object-bottom
              select-none
            "
          />
        </div>
      </div>
    </div>
  );
}

function Screen13({ onSaveStateChange }: Props) {
  const tr = useTr();
  const questions = [
    {
      fieldKey: "screen_13_hyva_tanaan",
      text: "Mikä tänään meni hyvin?",
    },
    {
      fieldKey: "screen_13_kolme_hyvaa",
      text: "Mieti kolme hyvää asiaa, jotka olet saanut kokea tänään.",
    },
    {
      fieldKey: "screen_13_vahvuudet_opinnoissa",
      text: "Mitä vahvuuksia hyödynsin opinnoissani?",
    },
    {
      fieldKey: "screen_13_osaan",
      text: "Mitä huomasin jo osaavani?",
    },
    {
      fieldKey: "screen_13_autoin",
      text: "Ketä autoin tänään? Miltä se tuntui?",
    },
    {
      fieldKey: "screen_13_hyvaa_toisissa",
      text: "Mitä hyvää huomasin toisissa?",
    },
    {
      fieldKey: "screen_13_auttoi_minua",
      text: "Kuka auttoi minua onnistumaan?",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
      
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          z-20
          mx-auto
          grid
          min-h-[1650px]
          w-full
          grid-cols-[70px_minmax(0,1fr)]
          gap-x-8
          px-[7.5%]
          pb-28
          pt-12
        "
      >
        <div
          className="
            mt-1
            flex
            h-[148px]
            w-[66px]
            items-center
            justify-center
            rounded-[9px]
            bg-[#7654ad]
            text-white
          "
        >
          <span
            className="
              rotate-180
              whitespace-nowrap
              [writing-mode:vertical-rl]
              font-display
              text-[22px]
              font-semibold
            "
          >
            {tr("VINKKI!")}
          </span>
        </div>

        <div className="relative min-w-0">
          <div className="max-w-[940px]">
            <h1
              className="
                font-display
                text-[clamp(32px,3vw,50px)]
                font-semibold
                leading-[1.08]
                text-[#ffd95d]
              "
            >
              {trLines(tr, "Nämä kysymykset auttavat sinua\nnäkemään hyviä puolia elämästäsi")}
            </h1>

            <p
              className="
                mt-7
                text-[clamp(18px,1.45vw,25px)]
                leading-[1.4]
              "
            >
              {tr("Kysy itseltäsi päivän aikana ja päätteeksi:")}
            </p>

            <div className="mt-8 space-y-8">
              {questions.map((question) => (
                <section
                  key={question.fieldKey}
                  className="
                    grid
                    grid-cols-[10px_minmax(0,1fr)]
                    items-start
                    gap-x-5
                  "
                >
                  <span
                    aria-hidden="true"
                    className="
                      mt-[12px]
                      h-[8px]
                      w-[8px]
                      rounded-full
                      bg-[#ffc936]
                    "
                  />

                  <div className="min-w-0">
                    <h2
                      className="
                        text-[clamp(18px,1.42vw,24px)]
                        font-medium
                        leading-[1.35]
                        text-white
                      "
                    >
                      {tr(question.text)}
                    </h2>

                    <div
                      className="
                        relative
                        mt-4
                        min-h-[165px]
                        w-full
                        max-w-[900px]
                        overflow-hidden
                        rounded-[18px]
                        border-2
                        border-black
                        bg-[#fffefa]
                        shadow-[0_5px_0_rgba(68,42,105,0.12)]

                        focus-within:border-black
                        focus-within:bg-white

                        [&_label]:hidden

                        [&>div]:h-full
                        [&>div]:min-h-0

                        [&_div]:border-0
                        [&_div]:bg-transparent
                        [&_div]:p-0
                        [&_div]:shadow-none

                        [&_textarea]:h-full
                        [&_textarea]:min-h-[165px]
                        [&_textarea]:w-full
                        [&_textarea]:resize-none
                        [&_textarea]:rounded-[16px]
                        [&_textarea]:border-0
                        [&_textarea]:bg-transparent
                        [&_textarea]:px-5
                        [&_textarea]:py-4
                        [&_textarea]:text-[17px]
                        [&_textarea]:leading-[30px]
                        [&_textarea]:text-[#241b3f]
                        [&_textarea]:outline-none
                        [&_textarea]:shadow-none
                        [&_textarea]:ring-0
                        [&_textarea]:placeholder:text-[#aaa1b5]

                        [&_textarea:focus]:outline-none
                        [&_textarea:focus]:ring-0
                      "
                    >
                      <div
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          inset-x-5
                          inset-y-4
                          opacity-70
                          [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                        "
                      />

                      <div className="relative z-10 h-full">
                        <ReflectionTextarea
                          fieldKey={question.fieldKey}
                          label=""
                          rows={5}
                          onSaveStateChange={onSaveStateChange}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          <img
            src="/illustrations/s13-good-candy.png"
            alt={tr("See the Good Candy")}
            className="
              pointer-events-none
              absolute
              right-[-3%]
              top-[-10px]
              z-20
              h-[285px]
              w-auto
              max-w-[31%]
              object-contain
            "
          />
        </div>
      </div>
    </div>
  );
}

// S14 (PDF p15): pure title card.
function Screen14() {
  const tr = useTr();
  return (
    <div className="relative flex h-full min-h-[620px] w-full items-center justify-center overflow-hidden px-8 text-white">
      <h1 className="relative z-10 text-center font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08]">
        {trLines(tr, "1. Omat\nydinvahvuudet")}
      </h1>
    </div>
  );
}

// ----- S12: Ydinvahvuuksien karkkikauppa (PDF p16–17) -----

const PICK = 5;

const DATA = [
  [
    "luovuus",
    "Saan usein kuulla toisilta, että keksin omaperäisiä ideoita.",
    "Luovuus",
    "Viisaus ja tieto",
  ],
  [
    "uteliaisuus",
    "Haluan jatkuvasti oppia uutta ja olen laajalti kiinnostunut asioista, ihmisistä, ilmiöistä.",
    "Uteliaisuus",
    "Viisaus ja tieto",
  ],
  [
    "arviointikyky",
    "Teen päätöksiä vasta kun tiedän asiasta kaiken.",
    "Arviointikyky",
    "Viisaus ja tieto",
  ],
  [
    "oppimisen_ilo",
    "Olen kiinnostunut lukuisista asioista ja haluan jatkuvasti oppia uutta.",
    "Oppimisen ilo",
    "Viisaus ja tieto",
  ],
  [
    "nakokulmanottokyky",
    "Minulta pyydetään usein neuvoja ja koen, että mielipiteitäni arvostetaan.",
    "Näkökulmanottokyky",
    "Viisaus ja tieto",
  ],
  [
    "rohkeus",
    "Puolustan mielipidettäni ja uskallan kertoa, mitä ajattelen, vaikka kohtaisin jyrkkääkin vastustusta.",
    "Rohkeus",
    "Rohkeus",
  ],
  [
    "sinnikkyys",
    "Jos päätän jotain, teen sen, vaikka haasteita ja vastoinkäymisiä ilmenisi.",
    "Sinnikkyys",
    "Rohkeus",
  ],
  [
    "rehellisyys",
    "Puhun kaunistelematta sen puolesta, mikä on mielestäni oikein ja totta.",
    "Rehellisyys",
    "Rohkeus",
  ],
  [
    "innokkuus",
    "Ystäväni kuvailisivat minua energiseksi, tarmokkaaksi ja hyväntuuliseksi.",
    "Innokkuus",
    "Rohkeus",
  ],
  ["sisukkuus", "Teen mitä tehdä pitää, vaikka vastoinkäymisiä ilmenisi.", "Sisukkuus", "Rohkeus"],
  [
    "myotatunto",
    "Yksi elämääni eniten merkitystä tuovista asioista on muiden ihmisten auttaminen.",
    "Myötätunto",
    "Inhimillisyys",
  ],
  [
    "rakkaus",
    "Osoitan läheisilleni välittämistäni sanoin, teoin ja viettämällä paljon aikaa heidän kanssaan.",
    "Rakkaus",
    "Inhimillisyys",
  ],
  ["ystavallisyys", "Olen mielelläni avuksi tai hyödyksi.", "Ystävällisyys", "Inhimillisyys"],
  [
    "sosiaalinen_alykkyys",
    "Pärjään hyvin erilaisissa sosiaalisissa tilanteissa ja uusien ihmisten parissa.",
    "Sosiaalinen älykkyys",
    "Inhimillisyys",
  ],
  [
    "ryhmatyotaito",
    "Parhaat puoleni pääsevät käyttöön ryhmässä, ja minua motivoi ryhmän onnistuminen.",
    "Ryhmätyötaito",
    "Oikeudenmukaisuus",
  ],
  [
    "reiluus",
    "Minulle on tärkeää kohdella kaikkia tasapuolisesti.",
    "Reiluus",
    "Oikeudenmukaisuus",
  ],
  [
    "johtajuus",
    "Minua voisi kuvailla vahvaksi ja reiluksi johtajaksi.",
    "Johtajuus",
    "Oikeudenmukaisuus",
  ],
  [
    "anteeksiantavuus",
    "En kaivele menneitä, vaan minun on helppo irrottautua niistä ja mennä elämässä eteenpäin.",
    "Anteeksiantavuus",
    "Kohtuullisuus",
  ],
  [
    "vaatimattomuus",
    "En tee itsestäni numeroa missään tilanteissa ja pitäydyn mielelläni taustalla.",
    "Vaatimattomuus",
    "Kohtuullisuus",
  ],
  ["harkitsevuus", "Teen aina harkittuja päätöksiä.", "Harkitsevuus", "Kohtuullisuus"],
  [
    "itsesaately",
    "Pystyn säätelemään tunteitani ja käytöstäni tilanteisiin sopivaksi.",
    "Itsesäätely",
    "Kohtuullisuus",
  ],
  [
    "kauneuden_arvostaminen",
    "Huomaan kauniita yksityiskohtia ja pysähdyn usein niiden äärelle.",
    "Kauneuden ja erinomaisuuden arvostaminen",
    "Henkisyys",
  ],
  [
    "kiitollisuus",
    "Perheeni kertoisi, että kiitän usein ja olen vilpittömästi kiitollinen.",
    "Kiitollisuus",
    "Henkisyys",
  ],
  [
    "toiveikkuus",
    "Minun on helppoa nähdä asioissa niiden hyvät puolet ja näen tulevaisuuden myönteisenä.",
    "Toiveikkuus",
    "Henkisyys",
  ],
  [
    "huumorintaju",
    "Löydän vaikeistakin elämäntilanteista huumoria ja pieniä ilon pilkahduksia.",
    "Huumorintaju",
    "Henkisyys",
  ],
  [
    "hengellisyys",
    "Ajattelen, että elämällä on jokin syvempi tarkoitus.",
    "Hengellisyys",
    "Henkisyys",
  ],
].map(([id, statement, strength, virtue], i) => ({
  id,
  statement,
  strength,
  virtue,
  kind: i % 12,
  hue: i % 9,
  tall: statement.length > 88 ? 2 : statement.length > 54 ? 1 : 0,
}));

const HUES = [
  ["#F49BB0", "#D9718C"],
  ["#E8736B", "#C4544D"],
  ["#F0954E", "#CE7434"],
  ["#F4C84A", "#D3A527"],
  ["#A9D9D2", "#7FB8B0"],
  ["#7FC9C0", "#57A79D"],
  ["#B58BD6", "#8F66B2"],
  ["#7A5442", "#5A3B2D"],
  ["#FFF3E6", "#DCC9B4"],
];

const PROMPTS = [
  "Ajattele itseäsi tekemässä tavanomaisia ja arkisia asioita. Miten olet näissä tekemisissä käyttänyt ydinvahvuuksiasi? Kirjoita muutama esimerkki.",
  "Missä onnistuit omia vahvuuksia hyödyntämällä?",
  "Miten omien ydinvahvuuksien hyödyntäminen vaikutti itseesi tai toisiin?",
];

/* ── karkit ────────────────────────────────────────────────── */
function Candy({ kind, hue, size = 30 }) {
  const [a, b] = HUES[((hue % 9) + 9) % 9];
  const p = { fill: a, stroke: b, strokeWidth: 1.6, strokeLinejoin: "round" };
  const S = (c) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: "block", overflow: "visible" }}
    >
      {c}
    </svg>
  );
  switch (((kind % 12) + 12) % 12) {
    case 0:
      return S(
        <g {...p}>
          <circle cx="12" cy="11" r="6" />
          <circle cx="28" cy="11" r="6" />
          <rect x="7" y="13" width="26" height="24" rx="12" />
          <circle cx="15" cy="22" r="1.7" fill={b} stroke="none" />
          <circle cx="25" cy="22" r="1.7" fill={b} stroke="none" />
        </g>,
      );
    case 1:
      return S(
        <g fill="none" stroke={a} strokeWidth="5.5" strokeLinecap="round">
          <path d="M20 20 m-13 0 a13 13 0 1 1 26 0 a9 9 0 1 1 -18 0 a5 5 0 1 1 10 0" />
        </g>,
      );
    case 2:
      return S(
        <g {...p}>
          <ellipse cx="20" cy="20" rx="15" ry="11" />
          <ellipse cx="14" cy="16" rx="4" ry="2.6" fill="#fff" opacity=".45" stroke="none" />
        </g>,
      );
    case 3:
      return S(
        <g {...p}>
          <path d="M6 12 q14 24 28 12 q-6 12 -20 10 Q4 30 6 12Z" />
        </g>,
      );
    case 4:
      return S(
        <g>
          <rect
            x="5"
            y="12"
            width="30"
            height="16"
            rx="8"
            fill="#FFF3E6"
            stroke={b}
            strokeWidth="1.6"
          />
          <path
            d="M11 12 q5 8 0 16M20 12 q5 8 0 16M29 12 q5 8 0 16"
            fill="none"
            stroke={a}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
        </g>,
      );
    case 5:
      return S(
        <g {...p}>
          <circle cx="20" cy="20" r="14" />
          <ellipse cx="14" cy="14" rx="4.5" ry="3" fill="#fff" opacity=".5" stroke="none" />
        </g>,
      );
    case 6:
      return S(
        <g fill="none" stroke={a} strokeWidth="7" strokeLinecap="round">
          <path d="M5 26 q7 -14 14 0 t 16 -2" />
        </g>,
      );
    case 7:
      return S(
        <g {...p}>
          <path d="M4 20 q10 -12 22 0 q-12 12 -22 0Z" />
          <path d="M26 20 l10 -7 v14Z" />
        </g>,
      );
    case 8:
      return S(
        <g {...p}>
          <rect x="9" y="13" width="22" height="14" rx="4" />
          <path d="M9 20 l-7 -6 v12Z" />
          <path d="M31 20 l7 -6 v12Z" />
        </g>,
      );
    case 9:
      return S(
        <g>
          <path
            d="M20 34 C6 24 6 12 13 10 c4-1.4 7 1 7 4 0-3 3-5.4 7-4 7 2 7 14-7 24Z"
            fill={a}
            stroke={b}
            strokeWidth="1.6"
          />
        </g>,
      );
    case 10:
      return S(
        <g {...p}>
          <circle cx="20" cy="20" r="13" />
          <circle cx="20" cy="20" r="7" fill={b} stroke="none" opacity=".35" />
        </g>,
      );
    default:
      return S(
        <g {...p}>
          <rect x="4" y="14" width="32" height="13" rx="6.5" />
          <path d="M13 14v13M22 14v13M31 14v13" stroke={b} strokeWidth="1.2" opacity=".55" />
        </g>,
      );
  }
}

function Tongs() {
  return (
    <svg className="tongs" viewBox="0 0 34 104" fill="none" aria-hidden="true">
      <path
        d="M11 100 C11 62 6 44 6 26 A5 5 0 0 1 16 26 C16 46 17 64 17 100"
        stroke="#E9E4F2"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M23 100 C23 62 28 44 28 26 A5 5 0 0 0 18 26 C18 46 17 64 17 100"
        stroke="#E9E4F2"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="17" cy="22" r="5" fill="#2FA86A" />
    </svg>
  );
}

function BagArt({ items, size = 1 }) {
  return (
    <>
      <div className="heldrow">
        {items.map((d, i) => (
          <span key={d.id} style={{ transform: `rotate(${i * 16 - 32}deg)` }}>
            <Candy kind={d.kind} hue={d.hue} size={26 * size} />
          </span>
        ))}
      </div>
      <div className="bagbody" />
      <div className="bagfold" />
    </>
  );
}

function Fly({ x0, y0, x1, y1, kind, hue }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div
      className="fly"
      style={{
        left: x0 - 17,
        top: y0 - 17,
        opacity: go ? 0.2 : 1,
        transform: go
          ? `translate(${x1 - x0}px, ${y1 - y0}px) rotate(540deg) scale(.65)`
          : "translate(0,0) rotate(0deg) scale(1.3)",
      }}
    >
      <Candy kind={kind} hue={hue} size={34} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
function Screen15({ onSaveStateChange }: Props) {
  const tr = useTr();
  const [phase, setPhase] = useState("kauppa"); // kauppa | kaanto | kuitti
  const [picked, setPicked] = useState([]);
  const [turned, setTurned] = useState(false);
  const [settled, setSettled] = useState(false);
  const [flying, setFlying] = useState([]);
  const [bump, setBump] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [loaded, setLoaded] = useState(false);
  const bagRef = useRef(null);
  const flyId = useRef(0);
  const report = useReportCompletion();

  const picksSaveState = useAutosave("screen_12_karkkikauppa_picks", picked, { enabled: loaded });
  const examplesSaveState = useAutosave("screen_15_examples", answers[0], { enabled: loaded });
  const successSaveState = useAutosave("screen_15_success", answers[1], { enabled: loaded });
  const effectSaveState = useAutosave("screen_15_effect", answers[2], { enabled: loaded });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedPicks, savedExamples, savedSuccess, savedEffect] = await Promise.all([
        loadResponse<number[]>("screen_12_karkkikauppa_picks"),
        loadResponse<string>("screen_15_examples"),
        loadResponse<string>("screen_15_success"),
        loadResponse<string>("screen_15_effect"),
      ]);
      if (cancelled) return;

      const validPicks = Array.isArray(savedPicks)
        ? savedPicks.filter((id) => DATA.some((d) => d.id === id)).slice(0, PICK)
        : [];
      setPicked(validPicks);
      setAnswers([savedExamples ?? "", savedSuccess ?? "", savedEffect ?? ""]);

      if (validPicks.length === PICK) {
        setTurned(true);
        setSettled(true);
        setPhase("kuitti");
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    report("screen_12_karkkikauppa_picks", picked.length === PICK);
    report("screen_15_examples", answers[0].trim().length > 0);
    report("screen_15_success", answers[1].trim().length > 0);
    report("screen_15_effect", answers[2].trim().length > 0);
  }, [answers, loaded, picked, report]);

  useEffect(() => {
    const states = [picksSaveState, examplesSaveState, successSaveState, effectSaveState];
    const merged: SaveState = states.includes("error")
      ? "error"
      : states.includes("saving")
        ? "saving"
        : states.includes("saved")
          ? "saved"
          : "idle";
    onSaveStateChange?.(merged);
  }, [picksSaveState, examplesSaveState, successSaveState, effectSaveState, onSaveStateChange]);

  const full = picked.length === PICK;
  const chosen = picked.map((id) => DATA.find((d) => d.id === id));
  const tilt = useMemo(() => DATA.map((_, i) => ((i * 53) % 7) - 3), []);

  useEffect(() => {
    if (phase !== "kaanto") return;

    const t1 = setTimeout(() => setTurned(true), 420);
    const t2 = setTimeout(() => setSettled(true), 420 + 26 * 42 + 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  const toggle = useCallback(
    (d, el) => {
      if (picked.includes(d.id)) {
        setPicked((p) => p.filter((x) => x !== d.id));
        return;
      }

      if (picked.length >= PICK) return;

      const a = el.getBoundingClientRect();
      const b = bagRef.current?.getBoundingClientRect();

      if (b) {
        const fid = ++flyId.current;

        setFlying((f) => [
          ...f,
          {
            fid,
            kind: d.kind,
            hue: d.hue,
            x0: a.left + a.width / 2,
            y0: a.top + a.height - 30,
            x1: b.left + b.width / 2,
            y1: b.top + 20,
          },
        ]);

        setTimeout(() => setFlying((f) => f.filter((x) => x.fid !== fid)), 640);

        setTimeout(() => setBump((n) => n + 1), 470);
      }

      setPicked((p) => [...p, d.id]);
    },
    [picked],
  );

  const restart = () => {
    setPicked([]);
    setTurned(false);
    setSettled(false);
    setAnswers(["", "", ""]);
    setPhase("kauppa");
  };

  const rows = [DATA.slice(0, 7), DATA.slice(7, 14), DATA.slice(14, 20), DATA.slice(20, 26)];

  const shopping = phase === "kauppa";
  const revealing = phase === "kaanto";

  return (
    <div className="ns">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');

.ns{
  --pu:#6C4F9C;
  --pud:#4E3A78;
  --ye:#F4C84A;
  --co:#E8736B;
  --ink:#2B2342;
  --wood:#B99444;

  position:relative;
  display:flex;
  flex-direction:column;
  width:100%;
  height:100%;
  min-height:0;
  overflow:hidden;
  padding:2px 20px 0;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;

  background:transparent;

  color:#fff;
}

.shopscroll{
  flex:1;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
  padding-bottom:32px;
}

.ns *{
  box-sizing:border-box;
}

.fd{
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-weight:600;
}

.deco{
  display:none;
}

.d1{
  top:-100px;
  left:-76px;
  width:272px;
  height:272px;
  border-radius:50%;
  background:#EE8C93;
}

.d2{
  top:88px;
  right:-56px;
  width:0;
  height:0;
  border-left:96px solid transparent;
  border-right:96px solid transparent;
  border-bottom:132px solid var(--ye);
  transform:rotate(20deg);
}

.d3{
  bottom:170px;
  left:-58px;
  width:190px;
  height:190px;
  border-radius:50%;
  background:#8FB6D9;
  opacity:.55;
}

.counter{
  display:none;
}

/* ── header ─────────────────────────────── */

.hd{
  position:relative;
  z-index:2;
  max-width:1310px;
  margin:0 auto 14px;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:26px;
  flex-wrap:wrap;
}

.h1{
  font-size:clamp(30px,3.5vw,52px);
  line-height:1.04;
  letter-spacing:0;
  max-width:18ch;
  margin:0;
  color:#fff;
  text-shadow:0 3px 0 rgba(43,35,66,.22);
}

.h1 small{
  display:block;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-weight:500;
  font-size:clamp(15px,1.35vw,19px);
  line-height:1.35;
  color:#fff;
  opacity:1;
  margin-top:14px;
  max-width:42ch;
  letter-spacing:0;
  text-shadow:0 2px 0 rgba(43,35,66,.18);
}

.namu{
  position:relative;
  flex:0 0 auto;
  padding:13px 38px;
  border:3px solid var(--ye);
  border-radius:11px;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:25px;
  color:var(--ye);
  letter-spacing:1px;
  transform:rotate(-3deg);
  white-space:nowrap;
  background:rgba(78,58,120,.72);
  box-shadow:0 4px 0 rgba(43,35,66,.28);
}

.namu::before,
.namu::after{
  content:"";
  position:absolute;
  top:50%;
  margin-top:-18px;
  width:0;
  height:0;
  border-top:18px solid transparent;
  border-bottom:18px solid transparent;
}

.namu::before{
  left:-24px;
  border-right:21px solid var(--ye);
}

.namu::after{
  right:-24px;
  border-left:21px solid var(--ye);
}

/* ── hylly ────────────────────────────────── */

.wall{
  position:relative;
  z-index:2;
  max-width:1310px;
  margin:0 auto;
}

.shelf{
  position:relative;
  margin-bottom:30px;
}

.bins{
  display:flex;
  gap:10px;
  align-items:flex-end;
  justify-content:center;
  flex-wrap:wrap;
}

.plank{
  height:11px;
  border-radius:3px;
  background:#3D2E60;
  margin-top:-2px;
  box-shadow:
    0 8px 15px rgba(0,0,0,.32),
    inset 0 2px 0 rgba(255,255,255,.1);
}

.tongs{
  width:32px;
  height:104px;
  align-self:flex-end;
  margin:0 2px 4px;
  opacity:.9;
  flex:0 0 auto;
}

/* ── purkki ───────────────────────────────── */

.bin{
  position:relative;
  width:170px;
  border:0;
  padding:0;
  background:none;
  transition:
    transform .18s cubic-bezier(.34,1.56,.64,1),
    filter .3s,
    opacity .3s;
}

.shop .bin{
  cursor:pointer;
}

.shop .bin:hover:not(:disabled){
  transform:translateY(-10px) rotate(0deg) scale(1.04)!important;
  z-index:9;
}

.shop .bin:active:not(:disabled){
  transform:translateY(-2px) scale(.985)!important;
}

.bin:focus-visible{
  outline:none;
}

.bin:focus-visible .tub{
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 8px rgba(244,200,74,.55),
    inset 0 -14px 20px rgba(0,0,0,.14);
}

.bin:disabled{
  cursor:not-allowed;
}

.shop .bin:disabled{
  filter:grayscale(.6) brightness(.68);
  opacity:.45;
}

.flipper{
  position:relative;
  transform-style:preserve-3d;
  transition:transform .72s cubic-bezier(.55,-0.28,.3,1.25);
}

.turn .flipper{
  transform:rotateY(180deg);
}

.side{
  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

.side.back{
  position:absolute;
  inset:0;
  transform:rotateY(180deg);
}

.lid{
  height:13px;
  border-radius:10px 10px 3px 3px;
  background:rgba(255,255,255,.30);
  border:1.5px solid rgba(255,255,255,.44);
  margin:0 -2px;
  box-shadow:0 3px 6px rgba(0,0,0,.2);
}

.tub{
  position:relative;
  border-radius:12px 12px 8px 8px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.28),
      rgba(255,255,255,.14) 42%,
      rgba(255,255,255,.20)
    );
  border:1.5px solid rgba(255,255,255,.58);
  border-top:0;
  transition:box-shadow .2s,background .3s;
  box-shadow:
    inset 0 -16px 22px rgba(0,0,0,.15),
    0 5px 0 rgba(43,35,66,.3);
}

.h0 .tub{
  height:146px;
}

.h1 .tub{
  height:170px;
}

.h2 .tub{
  height:194px;
}

.txt{
  flex:1 1 auto;
  padding:12px 11px 2px;
  font-size:10px;
  line-height:1.34;
  letter-spacing:.35px;
  text-transform:uppercase;
  font-weight:700;
  text-align:center;
  color:#fff;
  text-shadow:
    0 1px 2px rgba(24,17,42,.72),
    0 0 10px rgba(24,17,42,.34);
}

.pile{
  flex:0 0 auto;
  height:44px;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding-bottom:7px;
}

.pile>span{
  margin:0 -5px;
  filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));
}

.sticker{
  position:absolute;
  left:8px;
  bottom:8px;
  width:22px;
  height:15px;
  border-radius:2px;
  background:#fff;
  opacity:.9;
  box-shadow:0 1px 2px rgba(0,0,0,.3);
}

.chk{
  position:absolute;
  top:-10px;
  right:-8px;
  width:30px;
  height:30px;
  border-radius:50%;
  background:var(--ye);
  color:var(--ink);
  display:grid;
  place-items:center;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:16px;
  border:3px solid var(--pu);
  box-shadow:0 2px 0 rgba(43,35,66,.45);
  animation:pop .3s cubic-bezier(.34,1.8,.64,1);
  z-index:6;
}

@keyframes pop{
  0%{
    transform:scale(0) rotate(-45deg);
  }

  100%{
    transform:scale(1) rotate(0);
  }
}

/* takapuoli: vahvuus + sitä vastaava karkki */

.rev{
  flex:1 1 auto;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:12px 9px;
  text-align:center;
}

.rev .nm{
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  line-height:1.12;
  font-size:15px;
}

.rev .nm.long{
  font-size:11.5px;
}

.rev .vt{
  font-size:7.6px;
  letter-spacing:1.3px;
  text-transform:uppercase;
  opacity:.6;
}

.rev .cd{
  filter:drop-shadow(0 3px 3px rgba(0,0,0,.35));
}

/* voittajapurkit vs. muut */

.reveal .bin{
  opacity:.34;
  filter:saturate(.35);
}

.reveal .bin.won{
  opacity:1;
  filter:none;
  z-index:8;
}

.settled .bin.won{
  transform:translateY(-14px) scale(1.07)!important;
  animation:hover 3s ease-in-out infinite;
}

@keyframes hover{
  0%,
  100%{
    transform:translateY(-14px) scale(1.07);
  }

  50%{
    transform:translateY(-20px) scale(1.07);
  }
}

.reveal .bin.won .tub{
  background:linear-gradient(180deg,#FFF6E2,#FFE8B8);
  border-color:var(--ye);
  box-shadow:
    0 0 0 3px var(--ye),
    0 0 34px rgba(244,200,74,.6),
    0 6px 0 #B98F1C;
}

.reveal .bin.won .lid{
  background:var(--ye);
  border-color:#FFF0C4;
}

.reveal .bin.won .rev{
  color:var(--ink);
}

.reveal .bin.won .vt{
  opacity:.5;
}

.fly{
  position:fixed;
  z-index:60;
  pointer-events:none;
  transition:
    transform .62s cubic-bezier(.38,-0.25,.5,1),
    opacity .62s ease-in;
}

/* ── pussi + palkki ───────────────────────── */

.bar{
  position:relative;
  z-index:30;
  display:flex;
  flex:0 0 100px;
  height:100px;

  align-items:center;
  justify-content:center;
  gap:24px;
  flex-wrap:nowrap;

  /* kéo bar tràn hết 2 bên */
  width:calc(100% + 40px);
  left:-20px;

  margin:0;
  padding:0 22px;

  /* đẩy bar lên */
  transform:translateY(-20px);

  /* màu mới */
  background:#FFE77A;

  box-shadow:
    inset 0 7px 0 rgba(255,255,255,.22),
    0 -3px 16px rgba(0,0,0,.22);
}

.bag{
  position:relative;
  width:104px;
  height:86px;
  flex:0 0 auto;
}

.bagbody{
  position:absolute;
  inset:14px 0 0;
  border-radius:5px 5px 10px 10px;
  background:linear-gradient(180deg,#F7E6C8,#E0C89E);
  box-shadow:
    inset -13px 0 18px rgba(0,0,0,.11),
    0 4px 0 rgba(43,35,66,.32);
}

.bagfold{
  position:absolute;
  top:8px;
  left:-4px;
  right:-4px;
  height:15px;
  border-radius:4px;
  background:#FFF3DE;
  box-shadow:0 2px 3px rgba(0,0,0,.18);
}

.heldrow{
  position:absolute;
  top:-8px;
  left:0;
  right:0;
  display:flex;
  justify-content:center;
  z-index:2;
}

.heldrow>span{
  margin:0 -6px;
  filter:drop-shadow(0 3px 2px rgba(0,0,0,.32));
}

.bag.bump{
  animation:bb .36s cubic-bezier(.34,1.7,.64,1);
}

@keyframes bb{
  0%{
    transform:scale(1);
  }

  32%{
    transform:scale(1.15,.86);
  }

  66%{
    transform:scale(.95,1.07);
  }

  100%{
    transform:scale(1);
  }
}

.cnt{
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:14px;
  color:#3B2C10;
  line-height:1.2;
  flex:0 0 auto;
}

.cnt b{
  display:block;
  font-size:34px;
  line-height:1;
  color:#241A06;
}

.slots{
  display:flex;
  gap:6px;
  margin-top:8px;
}

.slot{
  width:13px;
  height:13px;
  border-radius:50%;
  background:rgba(59,44,16,.25);
  transition:.24s cubic-bezier(.34,1.6,.64,1);
}

.slot.on{
  background:var(--ye);
  box-shadow:0 0 0 2px rgba(255,255,255,.65);
  transform:scale(1.2);
}

.won5{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
  justify-content:center;
  min-width:0;
}

.pill{
  display:flex;
  align-items:center;
  gap:7px;
  background:#FFF6E8;
  color:var(--ink);
  border-radius:999px;
  padding:6px 15px 6px 7px;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:13px;
  white-space:nowrap;
  box-shadow:0 3px 0 rgba(43,35,66,.32);
  animation:rise .4s backwards cubic-bezier(.34,1.6,.64,1);
}

@keyframes rise{
  from{
    transform:translateY(16px);
    opacity:0;
  }

  to{
    transform:none;
    opacity:1;
  }
}

.btn{
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:17px;
  border:0;
  border-radius:999px;
  padding:15px 30px;
  cursor:pointer;
  background:var(--co);
  color:#fff;
  box-shadow:0 5px 0 #A8463F;
  transition:.12s;
  white-space:nowrap;
  flex:0 0 auto;
}

.btn:hover:not(:disabled){
  transform:translateY(-2px);
  box-shadow:0 7px 0 #A8463F;
}

.btn:active:not(:disabled){
  transform:translateY(3px);
  box-shadow:0 2px 0 #A8463F;
}

.btn:disabled{
  background:#6F5D3B;
  color:#CBBA95;
  box-shadow:0 5px 0 #4E4126;
  cursor:not-allowed;
}

.btn.go{
  background:var(--ye);
  color:var(--ink);
  box-shadow:0 5px 0 #C39C22;
  animation:br 1.5s ease-in-out infinite;
}

.btn.go:hover{
  box-shadow:0 7px 0 #C39C22;
}

/* button về vị trí cũ */
.middle-btn{
  position:relative;
  top:0;
}

@keyframes br{
  0%,
  100%{
    transform:scale(1);
  }

  50%{
    transform:scale(1.05);
  }
}

.link{
  background:none;
  border:0;
  color:inherit;
  opacity:.72;
  text-decoration:underline;
  cursor:pointer;
  font-size:13px;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  padding:6px;
}

/* ── kuitti ───────────────────────────────── */

.receipt{
  position:relative;
  z-index:2;
  max-width:740px;
  margin:24px auto 0;
  background:#FFF9EF;
  color:var(--ink);
  padding:32px 34px 28px;
  box-shadow:0 10px 0 rgba(43,35,66,.38);
}

.receipt::before,
.receipt::after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  height:12px;
  background:
    repeating-linear-gradient(
      135deg,
      #FFF9EF 0 9px,
      transparent 9px 18px
    );
}

.receipt::before{
  top:-11px;
  transform:scaleY(-1);
}

.receipt::after{
  bottom:-11px;
}

.rhead{
  text-align:center;
  border-bottom:2px dashed #D8C9AE;
  padding-bottom:15px;
  margin-bottom:8px;
}

.rhead .fd{
  font-size:23px;
}

.rhead p{
  font-size:10px;
  letter-spacing:2.6px;
  text-transform:uppercase;
  opacity:.5;
  margin:7px 0 0;
}

.line{
  display:flex;
  align-items:center;
  gap:13px;
  padding:9px 2px;
  border-bottom:1px dotted #DCCEB6;
}

.line .fd{
  flex:1;
  font-size:16px;
  text-align:left;
}

.line em{
  font-style:normal;
  font-size:9px;
  letter-spacing:1.3px;
  text-transform:uppercase;
  opacity:.48;
}

.q{
  font-weight:500;
  font-size:13px;
  margin:20px 0 8px;
  line-height:1.5;
}

.ta{
  width:100%;
  min-height:80px;
  border:2px solid #E6DAC2;
  border-radius:12px;
  padding:11px 13px;
  background:#fff;
  font-family:var(--font-display),'Fredoka',system-ui,sans-serif;
  font-size:13px;
  color:var(--ink);
  resize:vertical;
}

.ta:focus{
  outline:0;
  border-color:var(--pu);
}

.acts{
  display:flex;
  gap:16px;
  align-items:center;
  margin-top:22px;
  flex-wrap:wrap;
}

@media (max-width:820px){
  .hd{
    gap:16px;
  }

  .h1{
    font-size:32px;
    max-width:100%;
  }

  .h1 small{
    font-size:15px;
  }

  .namu{
    font-size:18px;
    padding:10px 24px;
  }

  .bin{
    width:150px;
  }

  .h0 .tub{
    height:150px;
  }

  .h1 .tub{
    height:176px;
  }

  .h2 .tub{
    height:202px;
  }

  .txt{
    font-size:9.5px;
  }
}

@media (prefers-reduced-motion:reduce){
  .ns *{
    animation:none!important;
    transition:none!important;
  }
}
      `}</style>

      <div className="deco d1" />
      <div className="deco d2" />
      <div className="deco d3" />

      {(shopping || revealing) && (
        <>
          <div className="shopscroll">
            <div className="hd">
              <h1 className="fd h1">
                {shopping
                  ? tr("Ydinvahvuuksien karkkikauppa")
                  : settled
                    ? tr("Nämä ovat ydinvahvuutesi")
                    : tr("Hylly kääntyy…")}

                <small>
                  {shopping
                    ? tr(
                        "Poimi hyllystä viisi väittämäkarkkia, jotka kuulostavat sinulta. Älä mieti liikaa — mene fiiliksellä.",
                      )
                    : settled
                      ? tr(
                          "Jokaisen purkin takana oli luonteenvahvuus ja sitä vastaava karkki. Sinun viisi loistavat.",
                        )
                      : tr("Katso, mitkä vahvuudet väittämien takaa paljastuvat.")}
                </small>
              </h1>

              <div className="namu fd">{settled ? tr("OOT NAMU!") : tr("OOT NAMU")}</div>
            </div>

            <div className={`wall ${shopping ? "shop" : "reveal"}${settled ? " settled" : ""}`}>
              {rows.map((row, ri) => (
                <div className="shelf" key={ri}>
                  <div className="bins">
                    {ri % 2 === 1 && <Tongs />}

                    {row.map((d) => {
                      const i = DATA.indexOf(d);
                      const on = picked.includes(d.id);
                      const longName = d.strength.length > 22;

                      return (
                        <button
                          key={d.id}
                          className={`bin h${d.tall}${turned ? " turn" : ""}${on ? " won" : ""}`}
                          style={{
                            transform: `rotate(${tilt[i]}deg)`,
                            transitionDelay: revealing && !settled ? `${i * 42}ms` : "0ms",
                          }}
                          disabled={revealing || (full && !on)}
                          onClick={(e) => shopping && toggle(d, e.currentTarget)}
                          aria-pressed={on}
                          aria-label={
                            revealing
                              ? `${tr(d.strength)} — ${tr(d.virtue)}${
                                  on ? `, ${tr("sinun vahvuutesi")}` : ""
                                }`
                              : `${tr(d.statement)}${on ? ` — ${tr("pussissa")}` : ""}`
                          }
                        >
                          <div
                            className="flipper"
                            style={{
                              transitionDelay: revealing ? `${i * 42}ms` : "0ms",
                            }}
                          >
                            <div className="side front">
                              <div className="lid" />

                              <div className="tub">
                                <div className="txt">{tr(d.statement)}</div>

                                <div className="pile">
                                  {!on &&
                                    [0, 1, 2, 3].map((k) => (
                                      <span
                                        key={k}
                                        style={{
                                          transform: `rotate(${
                                            ((k * 37) % 50) - 25
                                          }deg) translateY(${k % 2 ? 3 : 0}px)`,
                                        }}
                                      >
                                        <Candy kind={d.kind + k} hue={d.hue + (k % 2)} size={27} />
                                      </span>
                                    ))}
                                </div>

                                <span className="sticker" />
                              </div>
                            </div>

                            <div className="side back">
                              <div className="lid" />

                              <div className="tub">
                                <div className="rev">
                                  <span className="cd">
                                    <Candy kind={d.kind} hue={d.hue} size={on ? 52 : 38} />
                                  </span>

                                  <span className={`nm${longName ? " nm long" : ""}`}>
                                    {tr(d.strength)}
                                  </span>

                                  <span className="vt">{tr(d.virtue)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {on && shopping && <span className="chk">✓</span>}
                        </button>
                      );
                    })}

                    {ri % 2 === 0 && <Tongs />}
                  </div>

                  <div className="plank" />
                </div>
              ))}
            </div>
          </div>

          <div className="bar">
            {shopping ? (
              <>
                <div ref={bagRef} className={`bag${bump ? " bump" : ""}`} key={bump}>
                  <BagArt items={chosen} />
                </div>

                <div className="cnt">
                  <b>{picked.length}/5</b>

                  {tr("karkkia pussissa")}

                  <div className="slots">
                    {Array.from({ length: PICK }).map((_, i) => (
                      <span key={i} className={`slot${picked[i] ? " on" : ""}`} />
                    ))}
                  </div>
                </div>

                <button
                  className={`btn middle-btn${full ? " go" : ""}`}
                  disabled={!full}
                  onClick={() => setPhase("kaanto")}
                >
                  {full
                    ? tr("Käännä hylly →")
                    : tr("Valitse vielä {n}", {
                        n: PICK - picked.length,
                      })}
                </button>
              </>
            ) : settled ? (
              <>
                <div className="won5">
                  {chosen.map((d, i) => (
                    <span
                      className="pill"
                      key={d.id}
                      style={{
                        animationDelay: `${i * 90}ms`,
                      }}
                    >
                      <Candy kind={d.kind} hue={d.hue} size={24} />

                      {tr(d.strength)}
                    </span>
                  ))}
                </div>

                <button className="btn middle-btn go" onClick={() => setPhase("kuitti")}>
                  {tr("Ota kuitti →")}
                </button>
              </>
            ) : (
              <div className="cnt" style={{ textAlign: "center" }}>
                <b>26</b>
                {tr("purkkia kääntyy…")}
              </div>
            )}
          </div>

          {flying.map((f) => (
            <Fly key={f.fid} {...f} />
          ))}
        </>
      )}

      {phase === "kuitti" && (
        <div className="shopscroll">
          <div className="receipt">
            <div className="rhead">
              <div className="fd">{tr("Vahvuuskarkkini – Merkkaa tähän vahvuuskarkkisi!")}</div>

              <p>{tr("YDINVAHVUUKSIEN KARKKIKAUPPA")}</p>
            </div>

            {chosen.map((d) => (
              <div className="line" key={d.id}>
                <Candy kind={d.kind} hue={d.hue} size={30} />

                <span className="fd">{tr(d.strength)}</span>

                <em>{tr(d.virtue)}</em>
              </div>
            ))}

            {PROMPTS.map((q, i) => (
              <div key={i}>
                <p className="q">{tr(q)}</p>

                <textarea
                  className="ta"
                  value={answers[i]}
                  placeholder={tr("Kirjoita tähän…")}
                  onChange={(e) =>
                    setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))
                  }
                />
              </div>
            ))}

            <div className="acts">
              <button className="link" onClick={restart}>
                {tr("Valitse karkit uudelleen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Screen16: Vahvuuskarkkini ----- (FIX: heading, subtitle, placeholder, và 3 label giờ đều qua tr())
// ----- Screen16 (PDF p18): Vahvuuskarkkini -----
function Screen16({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language: lang } = useLanguage();

  const [selectedCandies, setSelectedCandies] = useState<Record<number, string>>({});

  const selectedValues = Object.values(selectedCandies).filter(Boolean);

  const updateCandy = useCallback((index: number, value: string) => {
    setSelectedCandies((current) => {
      if (current[index] === value) return current;

      return {
        ...current,
        [index]: value,
      };
    });
  }, []);

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
      "
    >
      <div
        className="
          relative
          mx-auto
          grid
          min-h-[760px]
          w-full
          max-w-[1220px]
          grid-cols-1
          gap-10
          px-6
          pb-24
          pt-3
          lg:grid-cols-[minmax(0,1fr)_360px]
        "
      >
        {/* =========================
            BÊN TRÁI
        ========================== */}

        <div className="min-w-0">
          <h1
            className="
              font-display
              text-[clamp(34px,3vw,50px)]
              font-semibold
              leading-[1.05]
              text-white
            "
          >
            {tr("Vahvuuskarkkini")}
          </h1>

          <p
            className="
              mt-4
              font-display
              text-[clamp(17px,1.35vw,21px)]
              font-semibold
              text-white
            "
          >
            {tr("Pohdi omia vahvuuksia ja vastaa:")}
          </p>

          <div className="mt-7 grid gap-6">
            <ReflectionTextarea
              fieldKey="screen_13_examples"
              label={tr(
                "Ajattele itseäsi tekemässä tavanomaisia ja arkisia asioita tai tehtäviä. Miten olet näissä tekemisissä käyttänyt ydinvahvuuksiasi? Kirjoita muutama esimerkki tilanteista.",
              )}
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
        </div>

        {/* =========================
            BÊN PHẢI
        ========================== */}

        <StickyNote tone="coral" seed="s13-candies" className="self-start">
          <div
            className="
              mb-4
              text-center
              font-display
              text-xl
              font-bold
              leading-tight
              text-[color:var(--purple-dark)]
            "
          >
            {tr("Merkkaa tähän 5 vahvuuskarkkiasi!")}
          </div>

          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <StrengthCandySelect
                key={index}
                index={index}
                language={lang}
                selectedValues={selectedValues}
                onValueChange={updateCandy}
                onSaveStateChange={onSaveStateChange}
              />
            ))}
          </div>
        </StickyNote>

        {/* =========================
            ILLUSTRATION GÓC PHẢI DƯỚI
        ========================== */}

        <img
          src="/illustrations/s16-bottom-right.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            bottom-4
            right-4
            z-20
            h-auto
            w-[500px]
            max-w-[100%]
            select-none
            object-contain
          "
        />
      </div>
    </div>
  );
}

function StrengthCandySelect({
  index,
  language,
  selectedValues,
  onValueChange,
  onSaveStateChange,
}: {
  index: number;
  language: "fi" | "sv" | "en";
  selectedValues: string[];
  onValueChange: (index: number, value: string) => void;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  const fieldKey = `screen_13_karkki_${index + 1}`;
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadResponse<string>(fieldKey);
      if (cancelled) return;

      if (typeof saved === "string") {
        setValue(saved);
        onValueChange(index, saved);
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldKey, index, onValueChange]);

  const state = useAutosave(fieldKey, value, { enabled: loaded });

  useEffect(() => {
    onSaveStateChange?.(state);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, value.trim().length > 0);
  }, [fieldKey, loaded, report, value]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    onValueChange(index, nextValue);
  }

  const selectedStrengthNumber = Number(value);
  const hasSelectedStrength =
    Number.isInteger(selectedStrengthNumber) && selectedStrengthNumber >= 1;

  return (
    <div className="relative">
      {hasSelectedStrength && (
        <span
          className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/20"
          style={{ backgroundColor: getStrengthColor(selectedStrengthNumber) }}
        />
      )}

      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border-2 border-white/70 bg-white px-4 pr-10 font-display text-sm font-bold text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--purple-dark)]",
          hasSelectedStrength && "pl-10",
        )}
      >
        <option value="">{tr("Valitse vahvuus")}</option>

        {Array.from({ length: 26 }).map((_, strengthIndex) => {
          const strengthNumber = strengthIndex + 1;
          const optionValue = String(strengthNumber);
          const alreadyUsed = selectedValues.includes(optionValue) && optionValue !== value;

          return (
            <option key={strengthNumber} value={optionValue} disabled={alreadyUsed}>
              {getStrengthName(strengthNumber, language)}
            </option>
          );
        })}
      </select>

      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[color:var(--purple-dark)]">
        ▼
      </span>
    </div>
  );
}

// ============================================================
// Core Strengths Roadmap
// ============================================================

const SCREEN_14_QUESTIONS = [
  {
    id: 1,
    text: "Mistä innostut?",
  },
  {
    id: 2,
    text: "Minkä tekeminen tuntuu kevyeltä?",
  },
  {
    id: 3,
    text: "Mistä luonteenvahvuuksista saat kiitosta ja palautetta toisilta?",
  },
  {
    id: 4,
    text: "Mitä rakastat tehdä vapaa-ajalla?",
  },
  {
    id: 5,
    text: "Minkä alkamista odotat eniten päivässäsi?",
  },
  {
    id: 6,
    text: "Mitä tehdessä aika ja paikka unohtuvat ja pääset flow-tilaan?",
  },
  {
    id: 7,
    text: "Mitkä vahvuudet vahvistavat sinua vapaa-ajalla?",
  },
  {
    id: 8,
    text: "Mitkä vahvuudet tulevat lukioon, kun sinä tulet paikalle?",
  },
  {
    id: 9,
    text: "Mitä vahvuuksia arvostat eniten itsessäsi?",
  },
] as const;

const SCREEN_14_BOXES = [
  {
    cx: 180,
    cy: 285,
    w: 236,
    h: 174,
  },

  {
    cx: 150,
    cy: 570,
    w: 236,
    h: 166,
  },

  {
    cx: 440,
    cy: 588,
    w: 236,
    h: 166,
  },

  {
    cx: 505,
    cy: 430,
    w: 242,
    h: 174,
  },

  {
    cx: 790,
    cy: 170,
    w: 246,
    h: 174,
  },

  {
    cx: 805,
    cy: 588,
    w: 242,
    h: 166,
  },

  {
    cx: 1070,
    cy: 430,
    w: 242,
    h: 174,
  },

  {
    cx: 1115,
    cy: 170,
    w: 246,
    h: 174,
  },

  {
    cx: 1215,
    cy: 588,
    w: 236,
    h: 166,
  },
] as const;

const SCREEN_14_ROAD_PATH = `
  M 5 380

  C 18 376, 28 378, 40 380

  C 70 330, 115 285, 180 285

  C 250 285, 255 355, 245 420

  C 230 500, 175 535, 150 570

  C 135 635, 260 650, 358 628

  C 410 616, 432 602, 440 588

  C 490 555, 510 500, 505 430

  C 500 315, 575 215, 790 170

  C 855 158, 900 190, 920 265

  C 950 380, 830 525, 805 588

  C 790 640, 910 650, 990 628

  C 1040 635, 1065 535, 1070 430

  C 1075 320, 1090 225, 1115 170

  C 1140 132, 1200 148, 1225 210

  C 1265 330, 1240 525, 1215 588

  C 1205 636, 1285 642, 1345 618

  C 1370 610, 1390 600, 1420 590

  C 1430 586, 1438 582, 1445 578
`;

function Screen17({ onSaveStateChange }: Props) {
  const tr = useTr();

  const CANVAS_WIDTH = 1450;
  const CANVAS_HEIGHT = 720;

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[1.5%]
        pb-24
        pt-5
        text-black
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          h-[720px]
          w-full
          max-w-[1450px]
        "
      >
        {/* =========================
            TITLE
        ========================== */}

        <h1
          className="
            absolute
            left-[1.5%]
            top-[5%]
            z-30
            max-w-[300px]
            text-left
            font-display
            text-[clamp(34px,2.8vw,52px)]
            font-semibold
            leading-[1.03]
            text-white
          "
        >
          {tr("Ydinvahvuuksien tiekartta")}
        </h1>

        {/* =========================
            ROAD
        ========================== */}

        <svg
          aria-hidden="true"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="
            pointer-events-none
            absolute
            inset-0
            z-0
            h-full
            w-full
            overflow-visible
          "
        >
          {/* Road shadow */}
          {/* FIX: tăng bề rộng road theo tỉ lệ box to hơn, cho đồng bộ */}
          <path
            d={SCREEN_14_ROAD_PATH}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="62"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* White road */}
          <path
            d={SCREEN_14_ROAD_PATH}
            fill="none"
            stroke="#fffdfc"
            strokeWidth="48"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center dashed line */}
          <path
            d={SCREEN_14_ROAD_PATH}
            fill="none"
            stroke="rgba(118,84,173,0.22)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="12 18"
          />

          {/* =========================
              START
          ========================== */}

          <g transform="translate(22 356)">
            <path
              d="
                M 0 0
                H 100
                L 118 24
                L 100 48
                H 0
                Z
              "
              fill="#f3cbd1"
              stroke="#241b3f"
              strokeWidth="2"
            />

            <text x="56" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7654ad">
              {tr("Aloita tästä")}
            </text>
          </g>

          {/* =========================
              FINISH
          ========================== */}

          <g transform="translate(1340 538)">
            <line
              x1="8"
              y1="0"
              x2="8"
              y2="62"
              stroke="#241b3f"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <rect
              x="10"
              y="0"
              width="82"
              height="36"
              rx="9"
              fill="#ffd95d"
              stroke="#241b3f"
              strokeWidth="2"
            />

            <text x="51" y="23" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7654ad">
              {tr("Maali")}
            </text>
          </g>
        </svg>

        {/* =========================
            QUESTION BOXES
        ========================== */}

        {SCREEN_14_QUESTIONS.map((question, index) => {
          const box = SCREEN_14_BOXES[index];

          if (!box) {
            return null;
          }

          const left = ((box.cx - box.w / 2) / CANVAS_WIDTH) * 100;

          const top = ((box.cy - box.h / 2) / CANVAS_HEIGHT) * 100;

          const width = (box.w / CANVAS_WIDTH) * 100;

          const height = (box.h / CANVAS_HEIGHT) * 100;

          return (
            <section
              key={question.id}
              className="
                absolute
                z-20
                flex
                min-w-0
                flex-col
                overflow-hidden
                bg-[#f8f6f1]
                px-4
                pb-4
                pt-3
                text-black
                transition-transform
                duration-200

                hover:z-30
                hover:-translate-y-1

                focus-within:z-30
              "
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,

                minWidth: "0",
                minHeight: "0",

                border: "5px solid #111",

                borderRadius: index % 2 === 0 ? "30px 26px 32px 27px" : "26px 31px 26px 32px",

                boxShadow: "5px 6px 0 rgba(0,0,0,0.12)",

                transform: `rotate(${
                  index % 3 === 0 ? "-0.45deg" : index % 3 === 1 ? "0.35deg" : "-0.15deg"
                })`,
              }}
            >
              {/* =========================
                  QUESTION
              ========================== */}

              <p
                className="
                  mb-3
                  shrink-0
                  text-left
                  font-display
                  text-[11px]
                  font-semibold
                  leading-[1.2]
                  text-[#6c50a8]
                "
              >
                {question.id}. {tr(question.text)}
              </p>

              {/* =========================
                  WRITING AREA
                  FIX: siết chặt hơn để chắc chắn KHÔNG còn viền/outline/
                  shadow/ring nào còn sót lại bên trong (kể cả trên chính
                  div gốc do ReflectionTextarea trả về) — trước đây chỉ
                  reset [&_div] (descendant) mà chưa ép luôn chính nó qua
                  [&>div] nên có thể còn sót viền mặc định.
              ========================== */}

              <div
                className="
                  relative
                  mt-1
	                  min-h-0
	                  flex-1
	                  overflow-hidden
	                  rounded-[18px]
	                  border-[5px]
	                  border-black
	                  bg-[#f8f6f1]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0
                  [&>div]:border-0
                  [&>div]:shadow-none
                  [&>div]:outline-none
                  [&>div]:ring-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none
                  [&_div]:outline-none
                  [&_div]:ring-0

                  [&_textarea]:relative
                  [&_textarea]:z-10
                  [&_textarea]:h-full
	                  [&_textarea]:min-h-[86px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none

                  [&_textarea]:rounded-[14px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent

                  [&_textarea]:px-3
                  [&_textarea]:py-2

                  [&_textarea]:text-left
                  [&_textarea]:font-display
                  [&_textarea]:text-[13px]
                  [&_textarea]:font-normal
                  [&_textarea]:leading-[28px]

                  [&_textarea]:text-[#241b3f]

                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0

                  [&_textarea]:placeholder:text-[#aaa1b5]

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                  [&_textarea:focus]:border-0
                  [&_textarea:focus]:shadow-none

                  [&_input]:border-0
                  [&_input]:outline-none
                  [&_input]:shadow-none
                  [&_input]:ring-0
                "
              >
                {/* Paper lines */}
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    z-0
                    opacity-75
                    [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_26px,#d9ccef_27px,#d9ccef_29px)]
                  "
                />

                {/* Saved textarea */}
                <div className="relative z-10 h-full">
                  <ReflectionTextarea
                    fieldKey={`screen_14_tiekartta_${question.id}`}
                    label=""
                    rows={4}
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ----- Screen18 (PDF p20): Voimavarani opiskelijana 1/2 — informational -----
// FIX: bulletItems giờ là string thuần (không còn JSX fragment), qua tr(); heading cũng qua tr()
function Screen18() {
  const tr = useTr();
  const bulletItems = [
    "Mieti voimavarojasi, jotka auttavat sinua selviytymään hankalissa ja stressaavissa elämäntilanteissa, palautumaan vastoinkäymisistä ja olemaan toiveikas tulevaisuuden suhteen.",
    "Näitä tekijöitä voivat olla omat vahvuutesi, sosiaaliset suhteet, läheiset ihmiset, tunnetaidot, unelmasi tulevaisuuden suhteen, ajatuksesi, asenteesi, myötätuntoinen suhtautuminen itseesi ja aikaisemmat onnistumisen kokemukset.",
    "Listaa voimavarasi seuraavan sivun taulukkoon. Merkkaa sydämiin, miten tärkeiksi voimavarasi koet.",
  ];

  return (
    <div className="relative min-h-[620px] w-full overflow-hidden  px-[8%] pb-10 pt-14 text-white">
      <div className="relative z-20 max-w-[820px]">
        <h1 className="font-display text-[42px] font-semibold leading-[1.08]">
          {tr("Voimavarani opiskelijana")} <span className="text-white">1/2</span>
        </h1>

        <h2 className="mt-9 font-display text-[24px] font-semibold leading-[1.2] text-white">
          {tr("Pohdi ja täydennä omien voimavarojesi sydämet")}
        </h2>

        <div className="mt-3 flex max-w-[800px] flex-col gap-7">
          {bulletItems.map((item, index) => (
            <div key={index} className="grid grid-cols-[12px_minmax(0,1fr)] items-start gap-5">
              <span
                aria-hidden="true"
                className="mt-[13px] h-[10px] w-[10px] rounded-full bg-[#ffd95d]"
              />

              <p className="font-display text-[23px] font-medium leading-[1.42]">{tr(item)}</p>
            </div>
          ))}
        </div>
      </div>

      <img
        src="/illustrations/voimavarani-hand.png"
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-[-3%]
          top-[7%]
          z-10
          h-[390px]
          w-auto
          object-contain
        "
      />
    </div>
  );
}

// ----- Screen19 (PDF p21): Voimavarani opiskelijana 2/2 -----
// FIX: heading "Voimavarani opiskelijana 2/2" và "Merkitse vahvuutesi" giờ qua tr()
export function Screen19({ onSaveStateChange }: Props) {
  const tr = useTr();
  const [scores, setScores] = useState<Record<string, number[]>>({});

  const groups = [
    {
      label: "KOULUSSA",
      fieldKey: "screen_16_koulussa",
      frameClass: "bg-[#ef706e]",
      tabClass: "bg-[#acd8b1] text-black",
      rotateClass: "-rotate-[0.6deg]",
    },
    {
      label: "VAPAA-AJALLA",
      fieldKey: "screen_16_vapaa_ajalla",
      frameClass: "bg-[#f5c8ce]",
      tabClass: "bg-[#ffd95d] text-black",
      rotateClass: "rotate-[0.6deg]",
    },
    {
      label: "KOTONA",
      fieldKey: "screen_16_kotona",
      frameClass: "bg-[#ffd75b]",
      tabClass: "bg-[#ef706e] text-white",
      rotateClass: "rotate-[-0.4deg]",
    },
    {
      label: "KAVERISUHTEISSA",
      fieldKey: "screen_16_kaverisuhteissa",
      frameClass: "bg-[#afd9b4]",
      tabClass: "bg-[#f3cbd1] text-black",
      rotateClass: "rotate-[0.5deg]",
    },
  ];

  const selectScore = (fieldKey: string, score: number) => {
    setScores((current) => ({
      ...current,
      [fieldKey]: current[fieldKey]?.includes(score)
        ? current[fieldKey].filter((selectedScore) => selectedScore !== score)
        : [...(current[fieldKey] ?? []), score],
    }));
  };

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-8
        pb-16
        pr-6
        pt-8
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <h1 className="font-display text-[42px] font-semibold leading-[1.08] text-white">
          {tr("Voimavarani opiskelijana")} <span className="text-[#f1f1ef]">2/2</span>
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          {groups.map((group) => {
            const selectedScores = scores[group.fieldKey] ?? [];

            return (
              <div
                key={group.fieldKey}
                className={`
                  relative
                  min-h-[245px]
                  w-full
                  transition-transform
                  duration-200
                  hover:-translate-y-1
                  ${group.rotateClass}
                `}
              >
                <div
                  className={`
                    absolute
                    left-[-31px]
                    top-1/2
                    z-20
                    flex
                    h-[126px]
                    w-[34px]
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-l-[12px]
                    text-[11px]
                    font-semibold
                    shadow-[0_4px_10px_rgba(0,0,0,0.12)]
                    ${group.tabClass}
                  `}
                >
                  <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl] tracking-[0.5px]">
                    {tr(group.label)}
                  </span>
                </div>

                <div
                  className={`
                    h-full
                    w-full
                    border-2
                    border-black
                    rounded-[26px]
                    p-[10px]
                    shadow-[0_8px_0_rgba(62,36,112,0.28)]
                    ${group.frameClass}
                  `}
                >
                  <div
                    className="
                      grid
                      h-full
                      min-h-[225px]
                      w-full
                      grid-cols-[minmax(0,1fr)_124px]
                      gap-2
                    "
                  >
                    <div
                      className="
                        min-h-[225px]
                        overflow-hidden
                        border-2
                        border-black
                        rounded-[18px]
                        bg-[#fffdf6]
                        screen19-lined-textarea

                        [&_label]:hidden
                        [&>div]:h-full
                        [&>div]:min-h-0

                        [&_div]:border-0
                        [&_div]:bg-transparent
                        [&_div]:p-0
                        [&_div]:shadow-none

                        [&_textarea]:h-full
                        [&_textarea]:min-h-[225px]
                        [&_textarea]:w-full
                        [&_textarea]:resize-none
                        [&_textarea]:rounded-[16px]
                        [&_textarea]:border-0
                        [&_textarea]:text-[#241b3f]
                        [&_textarea]:outline-none
                        [&_textarea]:shadow-none
                        [&_textarea]:ring-0
                        [&_textarea]:placeholder:text-[#9b93a8]

                        [&_textarea:focus]:outline-none
                        [&_textarea:focus]:ring-0
                      "
                    >
                      <ReflectionTextarea
                        fieldKey={group.fieldKey}
                        label=""
                        rows={7}
                        onSaveStateChange={onSaveStateChange}
                      />
                    </div>

                    <div
                      className="
                        flex
                        min-h-[225px]
                        flex-col
                        items-center
                        justify-center
                        border-2
                        border-black
                        rounded-[18px]
                        bg-white
                        px-2.5
                        py-5
                      "
                    >
                      <p
                        className="
    mb-4
    text-center
    text-[12px]
    font-semibold
    leading-[1.25]
    text-[#4b3a66]
  "
                      >
                        {tr("Väritä")}
                        <br />
                        {tr("sydämet")}
                      </p>

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-x-3
                          gap-y-2
                        "
                      >
                        {[1, 2, 3, 4, 5, 6].map((score) => {
                          const isSelected = selectedScores.includes(score);

                          return (
                            <button
                              key={score}
                              type="button"
                              aria-label={`${tr(group.label)}: ${tr("valitse taso {n}", { n: score })}`}
                              aria-pressed={isSelected}
                              onClick={() => selectScore(group.fieldKey, score)}
                              className={`
                                relative
                                flex
                                h-[43px]
                                w-[43px]
                                cursor-pointer
                                items-center
                                justify-center
                                border-0
                                bg-transparent
                                text-[#241b3f]
                                font-semibold
                                transition-all
                                duration-150

                                ${
                                  isSelected
                                    ? "drop-shadow-[0_2px_0_rgba(0,0,0,0.18)]"
                                    : "hover:text-[#ef706e]"
                                }

                                focus-visible:outline-none
                                focus-visible:ring-4
                                focus-visible:ring-[#d9ccec]
                              `}
                            >
                              <Heart
                                aria-hidden="true"
                                className="h-[36px] w-[36px]"
                                strokeWidth={2.8}
                                fill={isSelected ? "#ef706e" : "transparent"}
                                color={isSelected ? "#ef706e" : "#241b3f"}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Screen20({ onSaveStateChange }: Props) {
  const tr = useTr();

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[760px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[9%]
          pb-20
          pt-16
        "
      >
        {/* =========================
            ILLUSTRATION
        ========================== */}

        <img
          src="/illustrations/s17-chain.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            right-[-12px]
            top-[-15px]
            z-10
            h-[310px]
            w-auto
            max-w-[32%]
            object-contain
          "
        />

        {/* =========================
            TITLE
        ========================== */}

        <div
          className="
            relative
            z-20
            max-w-[820px]
            pr-6
            font-display
            font-semibold
            leading-[1.1]
            text-[#FFE77A]
          "
        >
          <h2
            className="
              m-0
              text-[clamp(30px,2.6vw,42px)]
              font-semibold
              leading-[1.08]
            "
          >
            {tr("Haasteet ja vahvuudet")}
          </h2>

          <h3
            className="
              mt-2
              text-[clamp(23px,2vw,32px)]
              font-semibold
              leading-[1.15]
              text-[#FFE77A]
            "
          >
            {tr("– Pohdi ja kirjoita vastaukset.")}
          </h3>
        </div>

        {/* =========================
            TOP QUESTIONS
        ========================== */}

        <div
          className="
            relative
            z-20
            mt-6
            grid
            grid-cols-1
            gap-x-20
            gap-y-10
            pr-[16%]
            md:grid-cols-2
          "
        >
          {/* =========================
              QUESTION 1
          ========================== */}

          <div className="flex min-h-[245px] min-w-0 flex-col">
            <h2
              className="
                min-h-[72px]
                font-display
                text-[clamp(20px,1.8vw,27px)]
                font-semibold
                leading-[1.28]
                text-white
              "
            >
              {tr("Mitä vaikeudet ovat opettaneet sinulle vahvuuksistasi?")}
            </h2>

            <div
              className="
                relative
                mt-4
                min-h-[155px]
                flex-1
                overflow-hidden
                rounded-[18px]
                border-2
                border-black
                bg-[#fcfbfe]
                shadow-[0_5px_0_#e2d8ed]

                focus-within:bg-white

                [&_label]:hidden

                [&>div]:h-full
                [&>div]:min-h-0

                [&_div]:border-0
                [&_div]:bg-transparent
                [&_div]:p-0
                [&_div]:shadow-none

                [&_textarea]:h-full
                [&_textarea]:min-h-[155px]
                [&_textarea]:w-full
                [&_textarea]:resize-none
                [&_textarea]:rounded-[18px]
                [&_textarea]:border-0
                [&_textarea]:bg-transparent
                [&_textarea]:px-5
                [&_textarea]:py-4
                [&_textarea]:text-[17px]
                [&_textarea]:leading-[1.55]
                [&_textarea]:text-[#241b3f]
                [&_textarea]:outline-none
                [&_textarea]:shadow-none
                [&_textarea]:ring-0
                [&_textarea]:placeholder:text-[#aaa1b5]

                [&_textarea:focus]:outline-none
                [&_textarea:focus]:ring-0
              "
            >
              <ReflectionTextarea
                fieldKey="screen_17_opetukset"
                label=""
                rows={6}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>

          {/* =========================
              QUESTION 2
          ========================== */}

          <div className="flex min-h-[245px] min-w-0 flex-col">
            <h2
              className="
                min-h-[72px]
                font-display
                text-[clamp(20px,1.8vw,27px)]
                font-semibold
                leading-[1.28]
                text-white
              "
            >
              {tr("Miten olet kasvanut ja muuttunut ihmisenä vastoinkäymisten seurauksena?")}
            </h2>

            <div
              className="
                relative
                mt-4
                min-h-[155px]
                flex-1
                overflow-hidden
                rounded-[18px]
                border-2
                border-black
                bg-[#fcfbfe]
                shadow-[0_5px_0_#e2d8ed]

                focus-within:bg-white

                [&_label]:hidden

                [&>div]:h-full
                [&>div]:min-h-0

                [&_div]:border-0
                [&_div]:bg-transparent
                [&_div]:p-0
                [&_div]:shadow-none

                [&_textarea]:h-full
                [&_textarea]:min-h-[155px]
                [&_textarea]:w-full
                [&_textarea]:resize-none
                [&_textarea]:rounded-[18px]
                [&_textarea]:border-0
                [&_textarea]:bg-transparent
                [&_textarea]:px-5
                [&_textarea]:py-4
                [&_textarea]:text-[17px]
                [&_textarea]:leading-[1.55]
                [&_textarea]:text-[#241b3f]
                [&_textarea]:outline-none
                [&_textarea]:shadow-none
                [&_textarea]:ring-0
                [&_textarea]:placeholder:text-[#aaa1b5]

                [&_textarea:focus]:outline-none
                [&_textarea:focus]:ring-0
              "
            >
              <ReflectionTextarea
                fieldKey="screen_17_kasvu"
                label=""
                rows={6}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>
        </div>

        {/* =========================
            BOTTOM QUESTION
        ========================== */}

        <div
          className="
            relative
            z-20
            mt-14
            max-w-[1120px]
          "
        >
          <h2
            className="
              font-display
              text-[clamp(20px,1.8vw,27px)]
              font-semibold
              leading-[1.38]
              text-white
            "
          >
            {tr(
              "Mitä sinulle läheinen ihminen, joka tuntee sinut hyvin, sanoisi vahvuuksistasi ja resursseistasi, joilla pärjäät tulevissa haasteissa?",
            )}
          </h2>

          <div
            className="
              relative
              mt-5
              min-h-[150px]
              w-full
              overflow-hidden
              rounded-[18px]
              border-2
              border-black
              bg-[#fcfbfe]
              shadow-[0_5px_0_#e2d8ed]

              focus-within:bg-white

              [&_label]:hidden

              [&>div]:h-full
              [&>div]:min-h-0

              [&_div]:border-0
              [&_div]:bg-transparent
              [&_div]:p-0
              [&_div]:shadow-none

              [&_textarea]:h-full
              [&_textarea]:min-h-[150px]
              [&_textarea]:w-full
              [&_textarea]:resize-none
              [&_textarea]:rounded-[18px]
              [&_textarea]:border-0
              [&_textarea]:bg-transparent
              [&_textarea]:px-5
              [&_textarea]:py-4
              [&_textarea]:text-[17px]
              [&_textarea]:leading-[1.55]
              [&_textarea]:text-[#241b3f]
              [&_textarea]:outline-none
              [&_textarea]:shadow-none
              [&_textarea]:ring-0
              [&_textarea]:placeholder:text-[#aaa1b5]

              [&_textarea:focus]:outline-none
              [&_textarea:focus]:ring-0
            "
          >
            <ReflectionTextarea
              fieldKey="screen_17_laheinen"
              label=""
              rows={5}
              onSaveStateChange={onSaveStateChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Screen21 (PDF p23): Vahvuuksien käyttökielto -----
// FIX: title và heading câu hỏi 2 (đổi <br/> thành trLines) giờ đều qua tr()
// ----- Screen21 (PDF p23): Vahvuuksien käyttökielto -----
function Screen21({ onSaveStateChange }: Props) {
  const tr = useTr();

  const pages = [
    {
      label: "21/1",
      fieldKey: "screen_18_tunne",
      question: "Miltä se tuntuisi?",
    },
    {
      label: "21/2",
      fieldKey: "screen_18_vaikutus",
      question: "Miten tämä vaikuttaisi arkeesi, entä opintoihin?",
    },
  ] as const;

  // Không dùng useScreenSubPages nữa
  const [step, setStep] = useState<0 | 1>(0);

  const page = pages[step];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[820px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[8%]
          pb-32
          pt-12
        "
      >
        {/* =====================================================
            LARGE ILLUSTRATION
        ====================================================== */}

        <img
          src="/illustrations/s18-can.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            right-[4%]
            top-[70px]
            z-10
            h-[500px]
            w-auto
            max-w-[33%]
            select-none
            object-contain
          "
        />

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div
          className="
            relative
            z-20
            max-w-[850px]
            pr-[10%]
          "
        >
          {/* 21/1 OR 21/2 */}

          <div
            className="
              mb-5
              inline-flex
              items-center
              justify-center
              rounded-full
              border-2
              border-black
              bg-[#FFE77A]
              px-4
              py-1.5
              font-display
              text-[15px]
              font-semibold
              text-[#241b3f]
              shadow-[0_4px_0_rgba(0,0,0,0.15)]
            "
          >
            {page.label}
          </div>

          {/* TITLE */}

          <h1
            className="
              font-display
              text-[clamp(42px,3.6vw,60px)]
              font-semibold
              leading-[1.05]
              text-[#FFE77A]
            "
          >
            {tr("Vahvuuksien käyttökielto")}
          </h1>

          {/* INTRO */}

          <p
            className="
              mt-9
              max-w-[820px]
              font-display
              text-[clamp(21px,1.7vw,28px)]
              font-semibold
              leading-[1.35]
              text-[#FFE77A]
            "
          >
            {tr("Kuvittele tilanne, jossa ydinvahvuutesi on kielletty seuraavaksi kuukaudeksi.")}
          </p>

          {/* QUESTION */}

          <h2
            className="
              mt-9
              max-w-[700px]
              font-display
              text-[clamp(26px,2vw,36px)]
              font-semibold
              leading-[1.2]
              text-white
            "
          >
            {tr(page.question)}
          </h2>

          {/* =====================================================
              ONE TEXTBOX ONLY
          ====================================================== */}

          <div
            className="
              relative
              mt-6
              h-[380px]
              w-full
              max-w-[700px]
              overflow-hidden
              rounded-[22px]
              border-[3px]
              border-black
              bg-[#fffdf8]
              shadow-[0_7px_0_rgba(0,0,0,0.16)]

              [&_label]:hidden

              [&>div]:h-full
              [&>div]:min-h-0
              [&>div]:w-full

              [&_div]:border-0
              [&_div]:bg-transparent
              [&_div]:p-0
              [&_div]:shadow-none

              [&_textarea]:h-full
              [&_textarea]:min-h-[380px]
              [&_textarea]:w-full
              [&_textarea]:resize-none
              [&_textarea]:rounded-[18px]
              [&_textarea]:border-0
              [&_textarea]:bg-transparent
              [&_textarea]:px-6
              [&_textarea]:py-5
              [&_textarea]:font-display
              [&_textarea]:text-[18px]
              [&_textarea]:leading-[1.6]
              [&_textarea]:text-[#241b3f]
              [&_textarea]:outline-none
              [&_textarea]:shadow-none
              [&_textarea]:ring-0

              [&_textarea:focus]:outline-none
              [&_textarea:focus]:ring-0
            "
          >
            <ReflectionTextarea
              key={page.fieldKey}
              fieldKey={page.fieldKey}
              label=""
              rows={12}
              onSaveStateChange={onSaveStateChange}
            />
          </div>

          {/* =====================================================
              SUBPAGE NAVIGATION
          ====================================================== */}

          <div
            className="
              mt-7
              flex
              max-w-[700px]
              items-center
              justify-between
            "
          >
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(0)}
              className="
                rounded-full
                border-2
                border-white
                px-5
                py-2.5
                font-display
                text-[16px]
                font-semibold
                text-white
                transition

                disabled:cursor-not-allowed
                disabled:opacity-30

                enabled:hover:bg-white
                enabled:hover:text-[#56368f]
              "
            >
              ← {tr("Takaisin")}
            </button>

            {/* SUBPAGE DOT / NUMBER */}

            <div
              className="
                font-display
                text-[16px]
                font-semibold
                text-white
              "
            >
              {step + 1} / 2
            </div>

            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(1)}
              className="
                rounded-full
                bg-[#ff6c6b]
                px-5
                py-2.5
                font-display
                text-[16px]
                font-semibold
                text-white
                transition

                disabled:cursor-not-allowed
                disabled:opacity-30

                enabled:hover:brightness-95
              "
            >
              {tr("Seuraava sivu")} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ----- Screen22 (PDF p24): Idea: Vahvuusjulisteet — informational, no required input -----
// FIX: 3 đoạn <p> giờ qua tr()
function Screen22() {
  const tr = useTr();
  const { language } = useLanguage();

  const illustrationSrc =
    language === "en"
      ? "/illustrations/s19-karin-poster-en.png"
      : language === "sv"
        ? "/illustrations/s19-karin-poster-sv.png"
        : "/illustrations/s19-karin-poster.png";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[5%]
        pb-[72px]
        pt-8
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          mx-auto
          grid
          min-h-[620px]
          w-full
          max-w-[1380px]
          grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]
          gap-10
          pb-2
        "
      >
        {/* =========================
            LEFT — TEXT
        ========================== */}

        <div
          className="
            min-w-0
            pb-10
            pt-6
          "
        >
          <h1
            className="
              max-w-[700px]
              font-display
              text-[clamp(34px,3.1vw,52px)]
              font-semibold
              leading-[1.1]
              tracking-[-0.015em]
              text-white
            "
          >
            {tr("Idea: Vahvuusjulisteet")}
          </h1>

          <p
            className="
              mt-8
              max-w-[660px]
              font-display
              text-[clamp(16px,1.25vw,21px)]
              font-semibold
              leading-[1.42]
              text-white
            "
          >
            {tr(
              "Jokainen opiskelija tekee itsestään ja ydinvahvuuksistaan julisteen, jossa on oma kuva ja viisi ydinvahvuutta.",
            )}
          </p>

          <div
            className="
              mt-8
              max-w-[660px]
              space-y-8
              font-display
              text-[clamp(18px,1.35vw,23px)]
              font-semibold
              leading-[1.42]
              text-white
            "
          >
            <p>
              {tr(
                "Millä tavoin voisit tehdä ydinvahvuutesi näkyväksi muille hauskalla ja luovalla tavalla?",
              )}
            </p>

            <p>
              {tr(
                "Miten haluat visualisoida omat vahvuutesi? Ne parhaat puolesi, jotka tulevat mukanasi päivittäin lukioon.",
              )}
            </p>
          </div>
        </div>

        {/* =========================
            RIGHT — ILLUSTRATION
        ========================== */}

        <div
          className="
            relative
            flex
            min-h-[590px]
            min-w-0
            items-end
            justify-center
            pb-4
          "
        >
          <img
            src={illustrationSrc}
            alt={tr("Esimerkki Karin vahvuusjulisteesta")}
            className="
              pointer-events-none
              block
              h-auto
              max-h-[590px]
              w-auto
              max-w-[100%]
              select-none
              object-contain
              object-bottom
            "
          />
        </div>
      </div>
    </div>
  );
}

// ----- Screen23 (PDF p25): Muistele onnistumista -----
// FIX: title + 4 câu hỏi (kể cả phần có <strong>) giờ đều qua tr(), tách phần in đậm thành tr() riêng
function Screen23({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[5.5%]
        pb-16
        pt-10
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[720px]
          w-full
          max-w-[1420px]
          border-2
          border-black
          rounded-[36px]
          bg-white
          px-[6%]
          pb-16
          pt-12
          text-[#241b3f]
          shadow-[0_8px_24px_rgba(44,27,78,0.08)]
        "
      >
        <h1
          className="
            font-display
            text-[clamp(36px,3vw,52px)]
            font-semibold
            leading-[1.08]
            text-black
          "
        >
          {tr("Muistele onnistumista")}
        </h1>

        <div className="mt-10 space-y-8">
          <section className="grid grid-cols-[16px_1fr] gap-x-4">
            <span
              aria-hidden="true"
              className="
                mt-[12px]
                h-[9px]
                w-[9px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <div className="min-w-0">
              <p
                className="
                  max-w-[1200px]
                  text-[clamp(18px,1.45vw,25px)]
                  font-normal
                  leading-[1.5]
                  text-[#241b3f]
                "
              >
                {tr(
                  "Mieti jotain tilannetta opinnoissa tai vapaa-ajalla, joka sujui hyvin, josta olet ylpeä ja jossa huomasit onnistuvasi sinulle tärkeissä asioissa.",
                )}{" "}
                <strong className="font-semibold">
                  {tr(
                    "Mitä silloin tapahtui? Mikä siinä meni hyvin? Minkälaista palautetta sait toisilta? Mikä siinä oli sinulle tärkeää?",
                  )}
                </strong>
              </p>

              <div
                className="
                  mt-3
                  min-h-[88px]
                  w-full
                  overflow-hidden
                  border-2
                  border-black
                  rounded-[14px]
                  bg-transparent

                  focus-within:bg-[#fbf9fe]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-[88px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[12px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[17px]
                  [&_textarea]:leading-[1.55]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#aaa1b5]

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey="screen_20_onnistuminen"
                  label=""
                  rows={4}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[16px_1fr] gap-x-4">
            <span
              aria-hidden="true"
              className="
                mt-[12px]
                h-[9px]
                w-[9px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <div className="min-w-0">
              <p
                className="
                  max-w-[1180px]
                  text-[clamp(18px,1.45vw,25px)]
                  font-normal
                  leading-[1.4]
                  text-[#171717]
                "
              >
                {tr("Mitä tämä onnistuminen kertoo")}{" "}
                <strong className="font-semibold">{tr("ydinvahvuuksistasi:")}</strong>{" "}
                {tr("mitä omia ydinvahvuuksia käyttämällä onnistuit?")}
              </p>

              <div
                className="
                  mt-3
                  min-h-[78px]
                  w-full
                  overflow-hidden
                  border-2
                  border-black
                  rounded-[14px]
                  bg-transparent

                  focus-within:bg-[#fbf9fe]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-[78px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[12px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[17px]
                  [&_textarea]:leading-[1.55]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey="screen_20_ydinvahvuudet"
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[16px_1fr] gap-x-4">
            <span
              aria-hidden="true"
              className="
                mt-[12px]
                h-[9px]
                w-[9px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <div className="min-w-0">
              <p
                className="
                  max-w-[1200px]
                  text-[clamp(18px,1.45vw,25px)]
                  font-normal
                  leading-[1.4]
                  text-[#171717]
                "
              >
                {tr(
                  "Mieti onnistumista, jossa pystyit tukemaan ja auttamaan toisia omia vahvuuksiasi hyödyntämällä? Mitä teit ja kenen kanssa olit? Kerro esimerkki.",
                )}
              </p>

              <div
                className="
                  mt-3
                  min-h-[78px]
                  w-full
                  overflow-hidden
                  border-2
                  border-black
                  rounded-[14px]
                  bg-transparent

                  focus-within:bg-[#fbf9fe]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-[78px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[12px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[17px]
                  [&_textarea]:leading-[1.55]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey="screen_20_tuki"
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[16px_1fr] gap-x-4">
            <span
              aria-hidden="true"
              className="
                mt-[12px]
                h-[9px]
                w-[9px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <div className="min-w-0">
              <p
                className="
                  max-w-[1100px]
                  text-[clamp(18px,1.45vw,25px)]
                  font-normal
                  leading-[1.4]
                  text-[#171717]
                "
              >
                {tr("Mitä yhteistä hyvää vahvuutesi edistivät, miten?")}
              </p>

              <div
                className="
                  mt-3
                  min-h-[68px]
                  w-full
                  overflow-hidden
                  border-2
                  border-black
                  rounded-[14px]
                  bg-transparent

                  focus-within:bg-[#fbf9fe]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-[68px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[12px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[17px]
                  [&_textarea]:leading-[1.55]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey="screen_20_yhteinen"
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ----- Screen24 (PDF p26): Pohdi onnistumisia ja täydennä! -----
const PAGE_PURPLE = "#7654ad";
const PAGE_CORAL = "#ef6f70";
const PAGE_YELLOW = "#ffd85d";
const PAGE_MINT = "#acd9dc";
const PAPER_SHADOW = "rgba(48, 27, 74, 0.55)";

function WorkbookLogo({ dark = true }: { dark?: boolean }) {
  return (
    <img
      src="/illustrations/huomaa-hyva-logo.png"
      alt="Huomaa hyvä"
      className={cn(
        "pointer-events-none absolute bottom-[24px] right-[28px] z-40 h-auto w-[118px] object-contain",
        !dark && "brightness-0 invert",
      )}
    />
  );
}

function WorkbookCornerShapes({
  top = "coral",
  right = "yellow",
  bottomLeft = "mint",
  bottomRight = "mint",
}: {
  top?: "coral" | "mint" | "none";
  right?: "yellow" | "mint" | "none";
  bottomLeft?: "mint" | "yellow" | "none";
  bottomRight?: "mint" | "yellow" | "none";
}) {
  const color = {
    coral: PAGE_CORAL,
    yellow: PAGE_YELLOW,
    mint: PAGE_MINT,
    none: "transparent",
  } as const;

  return (
    <>
      {top !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[5%] top-[-92px] z-0 h-[142px] w-[190px] rounded-b-full"
          style={{ backgroundColor: color[top] }}
        />
      )}

      {right !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-72px] top-[145px] z-0 h-[185px] w-[170px] rotate-[14deg] rounded-[28px]"
          style={{ backgroundColor: color[right] }}
        />
      )}

      {bottomLeft !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-96px] left-[-62px] z-0 h-[185px] w-[290px] rotate-[15deg] rounded-[38px]"
          style={{ backgroundColor: color[bottomLeft] }}
        />
      )}

      {bottomRight !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-104px] right-[-48px] z-0 h-[195px] w-[270px] -rotate-[8deg] rounded-[38px]"
          style={{ backgroundColor: color[bottomRight] }}
        />
      )}
    </>
  );
}

function FlatReflectionTextarea({
  fieldKey,
  rows = 4,
  onSaveStateChange,
  minHeight = 130,
  textClass = "text-[16px]",
}: {
  fieldKey: string;
  rows?: number;
  onSaveStateChange?: (s: SaveState) => void;
  minHeight?: number;
  textClass?: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-h-0 w-full",
        "[&_label]:hidden [&>div]:h-full [&>div]:min-h-0",
        "[&_div]:border-0 [&_div]:bg-transparent [&_div]:p-0 [&_div]:shadow-none",
        "[&_textarea]:h-full [&_textarea]:w-full [&_textarea]:resize-none",
        "[&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:bg-transparent",
        "[&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:leading-[1.45]",
        "[&_textarea]:text-[#241b3f] [&_textarea]:outline-none [&_textarea]:shadow-none [&_textarea]:ring-0",
        "[&_textarea:focus]:outline-none [&_textarea:focus]:ring-0",
        textClass,
      )}
      style={{ minHeight }}
    >
      <ReflectionTextarea
        fieldKey={fieldKey}
        label=""
        rows={rows}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

function IrregularPaper({
  children,
  className,
  rotate = 0,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#fffefe]",
        "border-2 border-black",
        "shadow-[0_10px_0_var(--paper-shadow)]",
        className,
      )}
      style={
        {
          "--paper-shadow": PAPER_SHADOW,
          transform: `rotate(${rotate}deg)`,
          borderRadius: "12% 4% 11% 5% / 8% 6% 10% 6%",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

// ============================================================
// Screen24 — PDF page 27: Pohdi onnistumisia ja täydennä!
// ============================================================
function Screen24({ onSaveStateChange }: Props) {
  const tr = useTr();

  const notes = [
    {
      fieldKey: "screen_21_ylpea",
      label: "Tästä onnistumisesta olen ylpeä",
      rotate: -2.2,
      gridClass: "lg:col-start-2 lg:row-start-1",
    },
    {
      fieldKey: "screen_21_sinnikas",
      label: "Olin sinnikäs kun",
      rotate: -0.8,
      gridClass: "lg:col-start-3 lg:row-start-1",
    },
    {
      fieldKey: "screen_21_kehut",
      label: "Sain kehuja ja kannustusta seuraavista asioista",
      rotate: 1.2,
      gridClass: "lg:col-start-4 lg:row-start-1",
    },
    {
      fieldKey: "screen_21_rohkea",
      label: "Olin rohkea kohdatessani tämän uuden haasteen",
      rotate: -1.3,
      gridClass: "lg:col-start-2 lg:row-start-2",
    },
    {
      fieldKey: "screen_21_tavoite",
      label: "Saavutin tämän tärkeän tavoitteen",
      rotate: 0.8,
      gridClass: "lg:col-start-3 lg:row-start-2",
    },
    {
      fieldKey: "screen_21_tunne",
      label: "Minusta tuntuu tällä hetkellä tältä, kun muistelen kokemaani",
      rotate: -1.1,
      gridClass: "lg:col-start-4 lg:row-start-2",
    },
    {
      fieldKey: "screen_21_vahvuudet",
      label: "Tunnistin nämä vahvuudet, jotka mahdollistivat onnistumisen",
      rotate: -0.5,
      gridClass: "lg:col-start-2 lg:row-start-3",
    },
    {
      fieldKey: "screen_21_uudet",
      label: "Löysin itsestäni tilanteessa uusia tai yllättäviä puolia",
      rotate: 0.9,
      gridClass: "lg:col-start-3 lg:row-start-3",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[980px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[6%]
          pb-28
          pt-8
        "
      >
        {/* =========================
            BOTTOM LEFT ILLUSTRATION
        ========================== */}
        <img
          src="/illustrations/s24-bottom-left.png"
          alt=""
          aria-hidden="true"
          className="
    pointer-events-none
    absolute
    bottom-[230px]
    left-[-10px]
    z-10
    h-auto
    w-[240px]
    object-contain
    lg:w-[300px]
  "
        />

        {/* =========================
            BOTTOM RIGHT ILLUSTRATION
        ========================== */}
        <img
          src="/illustrations/s24-bottom-right.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            bottom-[-4px]
            right-[-8px]
            z-10
            h-auto
            w-[240px]
            object-contain
            lg:w-[300px]
          "
        />

        <div
          className="
            relative
            z-20
            grid
            grid-cols-1
            gap-x-12
            gap-y-16
            md:grid-cols-2
            lg:grid-cols-[25%_1fr_1fr_1fr]
            lg:grid-rows-[270px_270px_270px]
            lg:gap-x-10
            lg:gap-y-20
          "
        >
          {/* =========================
              TITLE
          ========================== */}

          <div
            className="
              relative
              z-30
              min-w-0
              pt-8
              md:col-span-2
              lg:col-span-1
              lg:col-start-1
              lg:row-span-2
              lg:row-start-1
              lg:pr-8
              lg:pt-12
            "
          >
            <h1
              className="
                max-w-[340px]
                font-display
                text-[clamp(40px,4vw,64px)]
                font-extrabold
                leading-[1.02]
                tracking-[-0.025em]
                text-[#FFD95D]
                drop-shadow-[0_5px_0_rgba(59,35,82,0.35)]
              "
            >
              {tr("Pohdi onnistumisia ja täytä!")}
            </h1>
          </div>

          {/* =========================
              NOTES
          ========================== */}

          {notes.map((note) => (
            <IrregularPaper
              key={note.fieldKey}
              rotate={note.rotate}
              className={cn(
                `
                  relative
                  z-20
                  flex
                  h-[250px]
                  min-w-0
                  flex-col
                  overflow-hidden
                  px-4
                  pb-4
                  pt-3
                  text-black
                  shadow-[0_10px_0_rgba(59,35,82,0.72)]

                  md:h-[260px]

                  lg:h-full
                  lg:min-h-[270px]
                `,
                note.gridClass,
              )}
            >
              <p
                className="
                  relative
                  z-20
                  mx-auto
                  flex
                  min-h-[44px]
                  max-w-[95%]
                  shrink-0
                  items-start
                  justify-center
                  text-center
                  font-display
                  text-[14px]
                  font-semibold
                  leading-[1.25]
                  text-black
                "
              >
                {tr(note.label)}
              </p>

              <div
                className="
                  relative
                  z-10
                  mt-2
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[16px]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-0
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[16px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-3
                  [&_textarea]:py-2
                  [&_textarea]:text-[15px]
                  [&_textarea]:leading-[30px]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#aaa1b5]

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    inset-x-3
                    inset-y-2
                    opacity-65
                    [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                  "
                />

                <div className="relative z-10 h-full">
                  <FlatReflectionTextarea
                    fieldKey={note.fieldKey}
                    rows={6}
                    minHeight={155}
                    textClass="text-[15px]"
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </IrregularPaper>
          ))}

          {/* EMPTY CELL */}
          <div
            aria-hidden="true"
            className="
              hidden
              lg:col-start-4
              lg:row-start-3
              lg:block
            "
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Screen25 — PDF page 28: Tulevaisuuden muistelu
// ============================================================
// FIX: tách 2 đoạn <p> có <strong> thành các tr() riêng
function Screen25({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
     
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
	          min-h-[840px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[5.5%]
	          pb-14
	          pt-12
        "
      >
        <div
          className="
            relative
            z-10
	            min-h-[720px]
            rounded-[62px]
            
            px-[5.5%]
	            pb-12
            pt-12
            text-white
          "
        >
          <h1
            className="
              max-w-[800px]
              font-display
              text-[clamp(34px,2.6vw,48px)]
              font-semibold
              leading-[1.05]
              text-[#ffd95d]
            "
          >
            {tr(
              "Tulevaisuusmuisto – Mieti opiskelussasi tai vapaa-ajalla tilannetta, jossa voit lähitulevaisuudessa käyttää vahvuuksiasi.",
            )}
          </h1>

          <div className="mt-10 space-y-12">
            <section
              className="
                grid
                grid-cols-[12px_minmax(0,1fr)]
                items-start
                gap-x-4
              "
            >
              <span
                aria-hidden="true"
                className="
                  mt-[10px]
                  h-[8px]
                  w-[8px]
                  rounded-full
                  bg-[#ffc936]
                "
              />

              <div className="min-w-0">
                <div className="pr-[18%]">
                  <p
                    className="
	                      max-w-[1040px]
                      text-[clamp(17px,1.25vw,22px)]
                      leading-[1.42]
                      text-white
                    "
                  >
                    {tr(
                      "Mieti jotain tilannetta opinnoissa tai vapaa-ajalla, jossa voit lähitulevaisuudessa hyödyntää vahvuuksiasi?",
                    )}{" "}
                    <strong>
                      {tr(
                        "Mikä tulee menemään hyvin? Mistä voit huomata, että olet hyödyntänyt vahvuuksiasi tietoisemmin?",
                      )}
                    </strong>
                  </p>
                </div>

                <div
                  className="
                    relative
                    mt-6
	                    min-h-[175px]
                    w-full
                    overflow-hidden
                    border-2
                    border-black
                    rounded-[18px]
                    bg-[#fffefa]
                    shadow-[0_6px_0_#4f267d]

                    focus-within:bg-white
                  "
                >
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-5
                      inset-y-4
                      z-0
                      opacity-65
                      [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                    "
                  />

                  <div
                    className="
                      relative
                      z-10
                      h-full
	                      min-h-[175px]

                      [&_label]:hidden

                      [&>div]:h-full
                      [&>div]:min-h-0
                      [&>div]:border-0
                      [&>div]:bg-transparent
                      [&>div]:p-0
                      [&>div]:shadow-none

                      [&_textarea]:h-full
	                      [&_textarea]:min-h-[175px]
                      [&_textarea]:w-full
                      [&_textarea]:resize-none
                      [&_textarea]:rounded-[16px]
                      [&_textarea]:border-0
                      [&_textarea]:bg-transparent
                      [&_textarea]:px-5
                      [&_textarea]:py-4
                      [&_textarea]:text-[16px]
                      [&_textarea]:leading-[30px]
                      [&_textarea]:text-[#241b3f]
                      [&_textarea]:outline-none
                      [&_textarea]:shadow-none
                      [&_textarea]:ring-0
                      [&_textarea]:placeholder:text-[#aaa1b5]

                      [&_textarea:focus]:outline-none
                      [&_textarea:focus]:ring-0
                    "
                  >
                    <FlatReflectionTextarea
                      fieldKey="screen_22_tulevaisuus"
                      rows={5}
                      minHeight={175}
                      onSaveStateChange={onSaveStateChange}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              className="
                grid
                grid-cols-[12px_minmax(0,1fr)]
                items-start
                gap-x-4
              "
            >
              <span
                aria-hidden="true"
                className="
                  mt-[10px]
                  h-[8px]
                  w-[8px]
                  rounded-full
                  bg-[#ffc936]
                "
              />

              <div className="min-w-0">
                <p
                  className="
                    max-w-[980px]
                    text-[clamp(17px,1.25vw,22px)]
                    leading-[1.42]
                    text-white
                  "
                >
                  {tr(
                    "Mieti jotain tilannetta, jossa et onnistunut hyödyntämään vahvuuksiasi, tai käytit niitä liikaa?",
                  )}{" "}
                  <strong>{tr("Mitä tämä tilanne opetti sinulle?")}</strong>
                </p>

                <div
                  className="
                    relative
                    mt-6
	                    min-h-[155px]
                    w-full
                    overflow-hidden
                    border-2
                    border-black
                    rounded-[18px]
                    bg-[#fffefa]
                    shadow-[0_6px_0_#4f267d]

                    focus-within:bg-white
                  "
                >
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-5
                      inset-y-4
                      z-0
                      opacity-65
                      [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                    "
                  />

                  <div
                    className="
                      relative
                      z-10
                      h-full
	                      min-h-[155px]

                      [&_label]:hidden

                      [&>div]:h-full
                      [&>div]:min-h-0
                      [&>div]:border-0
                      [&>div]:bg-transparent
                      [&>div]:p-0
                      [&>div]:shadow-none

                      [&_textarea]:h-full
	                      [&_textarea]:min-h-[155px]
                      [&_textarea]:w-full
                      [&_textarea]:resize-none
                      [&_textarea]:rounded-[16px]
                      [&_textarea]:border-0
                      [&_textarea]:bg-transparent
                      [&_textarea]:px-5
                      [&_textarea]:py-4
                      [&_textarea]:text-[16px]
                      [&_textarea]:leading-[30px]
                      [&_textarea]:text-[#241b3f]
                      [&_textarea]:outline-none
                      [&_textarea]:shadow-none
                      [&_textarea]:ring-0
                      [&_textarea]:placeholder:text-[#aaa1b5]

                      [&_textarea:focus]:outline-none
                      [&_textarea:focus]:ring-0
                    "
                  >
                    <FlatReflectionTextarea
                      fieldKey="screen_22_oppi"
                      rows={5}
                      minHeight={155}
                      onSaveStateChange={onSaveStateChange}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <img
          src="/illustrations/s22-future-book.png"
          alt={tr("Back to the Future -kirja")}
          className="
            pointer-events-none
            absolute
	            right-[0.75%]
	            top-[4px]
	            z-20
	            h-[350px]
	            w-auto
	            max-w-[24%]
            object-contain
          "
        />
      </div>
    </div>
  );
}

// ============================================================
// Screen26 — PDF page 29: Ydinvahvuudet parin kanssa
// ============================================================
// FIX: đoạn intro giờ qua tr()
function Screen26({ onSaveStateChange }: Props) {
  const tr = useTr();

  const questions = [
    {
      fieldKey: "screen_23_innostus",
      text: "Mistä innostut?",
    },
    {
      fieldKey: "screen_23_kevyelta",
      text: "Minkä tekeminen tuntuu kevyeltä?",
    },
    {
      fieldKey: "screen_23_palaute",
      text: "Mistä luonteenvahvuuksista saat kiitosta ja palautetta toisilta?",
    },
    {
      fieldKey: "screen_23_parasta_opinnoissa",
      text: "Mikä on parasta opinnoissa?",
    },
    {
      fieldKey: "screen_23_love_to_do",
      text: "Mitkä asiat päätyvät love-to-do -listalle?",
    },
    {
      fieldKey: "screen_23_flow",
      text: "Mitä tehdessä aika ja paikka unohtuvat ja pääset flow-tilaan?",
    },
    {
      fieldKey: "screen_23_lukioon",
      text: "Mitkä vahvuudet tulevat lukioon, kun sinä tulet paikalle?",
    },
    {
      fieldKey: "screen_23_arvostat",
      text: "Mitä vahvuuksia arvostat eniten itsessäsi?",
    },
    {
      fieldKey: "screen_23_lapsena",
      text: "Mitä samoja vahvuuksia sinussa oli jo lapsena?",
    },
    {
      fieldKey: "screen_23_vapaalla",
      text: "Mitä luonteenvahvuuksia hyödynnät eniten vapaalla?",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
	          min-h-[1840px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[8%]
	          pb-16
	          pt-12
        "
      >
        <div className="relative z-20">
          {/* HEADER */}
          <div className="pr-[24%]">
            <h1
              className="
                font-display
                text-[clamp(36px,3vw,52px)]
                font-semibold
                leading-[1.05]
                text-[#ffd95d]
              "
            >
              {tr(
                "Ydinvahvuudet pareittain – Keskustele parin kanssa. Vastatkaa kysymyksiin. Käyttäkää vahvuuskarkkejanne tukena.",
              )}
            </h1>

            <p
              className="
                mt-6
                max-w-[1050px]
                text-[clamp(17px,1.35vw,23px)]
                font-semibold
                leading-[1.45]
                text-white
              "
            >
              {tr(
                "Keskustele parin kanssa. Vastaa kysymyksiin. Käyttäkää omia vahvuuskarkkeja apuna keskustelussa.",
              )}
            </p>
          </div>

          {/* ILLUSTRATION */}
          <img
            src="/illustrations/s23-candy-banana-shoe.png"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              right-[-1%]
              top-[-55px]
              z-30
              h-[320px]
              w-auto
              max-w-[30%]
              object-contain
              drop-shadow-[0_10px_0_rgba(59,35,82,0.18)]
            "
          />

          {/* QUESTIONS */}
          <div
            className="
	              mt-10
              grid
              grid-cols-1
              gap-x-12
	              gap-y-5
              lg:grid-cols-2
            "
          >
            {questions.map((question, index) => (
              <section
                key={question.fieldKey}
                className="
                  min-w-0
                "
              >
                {/* QUESTION */}
                <div
                  className="
                    grid
                    min-h-[40px]
                    grid-cols-[10px_minmax(0,1fr)]
                    items-start
                    gap-x-4
                  "
                >
                  <span
                    aria-hidden="true"
                    className="
                      mt-[9px]
                      h-[8px]
                      w-[8px]
                      rounded-full
                      bg-[#ffc936]
                    "
                  />

                  <h2
                    className="
                      text-[clamp(18px,1.4vw,24px)]
                      font-medium
                      leading-[1.28]
                      text-white
                    "
                  >
                    {index + 1}. {tr(question.text)}
                  </h2>
                </div>

                {/* ANSWER BOX */}
                <div
                  className="
                    relative
	                    mt-1.5
	                    min-h-[165px]
                    w-full
                    overflow-hidden
                    rounded-[18px]
                    border-2
                    border-black
                    bg-[#fffefa]
                    shadow-[0_6px_0_rgba(68,42,105,0.18)]

                    focus-within:bg-white
                  "
                >
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-5
                      inset-y-4
                      z-0
                      opacity-65
                      [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                    "
                  />

                  <div
                    className="
                      relative
                      z-10
                      h-full
	                      min-h-[165px]

                      [&_label]:hidden

                      [&>div]:h-full
                      [&>div]:min-h-0

                      [&_div]:border-0
                      [&_div]:bg-transparent
                      [&_div]:p-0
                      [&_div]:shadow-none

                      [&_textarea]:h-full
	                      [&_textarea]:min-h-[165px]
                      [&_textarea]:w-full
                      [&_textarea]:resize-none
                      [&_textarea]:rounded-[16px]
                      [&_textarea]:border-0
                      [&_textarea]:bg-transparent
                      [&_textarea]:px-5
                      [&_textarea]:py-4
                      [&_textarea]:text-[16px]
                      [&_textarea]:leading-[30px]
                      [&_textarea]:text-[#241b3f]
                      [&_textarea]:outline-none
                      [&_textarea]:shadow-none
                      [&_textarea]:ring-0
                      [&_textarea]:placeholder:text-[#aaa1b5]

                      [&_textarea:focus]:outline-none
                      [&_textarea:focus]:ring-0
                    "
                  >
                    <ReflectionTextarea
                      fieldKey={question.fieldKey}
                      label=""
                      rows={5}
                      onSaveStateChange={onSaveStateChange}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Screen27 — Give feedback and compliments
// ============================================================

function Screen27() {
  const tr = useTr();
  const { language } = useLanguage();

  // Use the current language-specific illustration.
  // Replace these files later when the approved artwork is available.
  const illustrationSrc =
    language === "en"
      ? "/illustrations/s27-feedback-bubbles-en.png"
      : language === "sv"
        ? "/illustrations/s27-feedback-bubbles-sv.png"
        : "/illustrations/s27-feedback-bubbles-fi.png";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          flex
          min-h-[680px]
          w-full
          max-w-[1500px]
          flex-col
          px-[7%]
          pb-20
          pt-10
        "
      >
        {/* =====================================================
            TITLE
        ====================================================== */}

        <h1
          className="
            relative
            z-20
            max-w-[1120px]
            shrink-0
            font-display
            text-[clamp(30px,2.6vw,46px)]
            font-semibold
            leading-[1.12]
            text-white
          "
        >
          {trLines(tr, "Anna palautetta ja kehuja täydentämällä\nseuraavia lauseenalkuja:")}
        </h1>

        {/* =====================================================
            LANGUAGE-SPECIFIC ILLUSTRATION
        ====================================================== */}

        <div
          className="
            relative
            z-10
            mt-4
            flex
            min-h-0
            flex-1
            items-start
            justify-center
          "
        >
          <img
            src={illustrationSrc}
            alt={tr("Anna palautetta ja kehuja täydentämällä seuraavia lauseenalkuja:")}
            className="
              pointer-events-none
              block
              h-auto
              max-h-[600px]
              w-full
              max-w-[1180px]
              select-none
              object-contain
              object-top
            "
          />
        </div>
      </div>
    </div>
  );
}
// ============================================================
// Screen28 — PDF page 32: Tässä olen minä
// ============================================================
function Screen28({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();

  const notes = [
    {
      key: "screen_25_tassa_1",
      label: "Minulle tärkeää on",
      rotate: -1,
    },
    {
      key: "screen_25_tassa_2",
      label: "Tulen iloiseksi, kun",
      rotate: 1,
    },
    {
      key: "screen_25_tassa_3",
      label: "Läheisissäni parasta on",
      rotate: 2,
    },
    {
      key: "screen_25_tassa_4",
      label: "Osaan hyvin ja tykkään tehdä",
      rotate: -2,
    },
    {
      key: "screen_25_tassa_5",
      label: "Parasta ryhmässäni on",
      rotate: 1,
    },
    {
      key: "screen_25_tassa_6",
      label: "Opinnoissa lempiaineita ovat",
      rotate: -1,
    },
    {
      key: "screen_25_tassa_7",
      label: "Minulle on vaikeaa",
      rotate: 2,
    },
    {
      key: "screen_25_tassa_8",
      label: "Lempitekemistä",
      rotate: 1,
    },
    {
      key: "screen_25_tassa_9",
      label: "Vapaa-ajalla tykkään",
      rotate: -1,
    },
    {
      key: "screen_25_tassa_10",
      label: "Lukiossa haluaisin oppia",
      rotate: 1,
    },
    {
      key: "screen_25_tassa_11",
      label: "Lukiossa minua innostaa",
      rotate: -1,
    },
  ];

  /*
   * Illustration theo ngôn ngữ.
   *
   * FI = Finnish
   * EN = English
   * SV = Swedish
   */
  const cornerIllustration =
    language === "fi"
      ? "/illustrations/s28-corner-fi.png"
      : language === "sv"
        ? "/illustrations/s28-corner-sv.png"
        : "/illustrations/s28-corner-en.png";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          w-full
          max-w-[1520px]
          px-[5%]
          pb-24
          pt-8
        "
      >
        {/* =========================
            TITLE
        ========================== */}

        <div
          className="
            relative
            z-20
            mb-10
            max-w-[360px]
          "
        >
          <h1
            className="
              font-display
              text-[clamp(40px,4vw,60px)]
              font-extrabold
              leading-[1.03]
              tracking-[-0.025em]
              text-[#FFD95D]
              drop-shadow-[0_5px_0_rgba(59,35,82,0.35)]
            "
          >
            {tr("Täällä olen minä:")}
          </h1>
        </div>

        {/* =========================
            GRID

            4 cột:
            hàng 1 = 4 box
            hàng 2 = 4 box
            hàng 3 = 3 box + illustration
        ========================== */}

        <div
          className="
            relative
            z-20
            grid
            grid-cols-1
            gap-x-8
            gap-y-10

            sm:grid-cols-2

            lg:grid-cols-4
          "
        >
          {notes.map((note) => (
            <IrregularPaper
              key={note.key}
              rotate={note.rotate}
              className={cn(
                `
                  relative
                  flex
                  h-[280px]
                  min-w-0
                  flex-col
                  overflow-visible
                  px-4
                  pb-4
                  pt-4
                  text-black
                  shadow-[0_10px_0_rgba(59,35,82,0.55)]
                `,
              )}
            >
              {/* =========================
                  LABEL
              ========================== */}

              <p
                className="
                  mx-auto
                  mb-3
                  flex
                  min-h-[40px]
                  max-w-[92%]
                  shrink-0
                  items-center
                  justify-center
                  text-center
                  font-display
                  text-[16px]
                  font-semibold
                  leading-[1.18]
                  text-black
                "
              >
                {tr(note.label)}
              </p>

              {/* =========================
                  TEXT BOX
              ========================== */}

              <div
                className="
                  relative
                  min-h-0
                  flex-1
                  overflow-hidden

                  rounded-[30px]
                  border-[5px]
                  border-black

                  bg-[#f7f4ee]

                  shadow-[2px_2px_0_rgba(0,0,0,0.08)_inset]
                "
              >
                {/* PAPER LINES */}

                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    inset-0

                    rounded-[24px]

                    [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_29px,#ddd4ea_30px,#ddd4ea_31px)]
                    [background-position:0_18px]
                  "
                />

                {/* TEXTAREA */}

                <div
                  className="
                    relative
                    z-10
                    h-full

                    [&_label]:hidden

                    [&>div]:h-full
                    [&>div]:min-h-0

                    [&_div]:border-0
                    [&_div]:bg-transparent
                    [&_div]:p-0
                    [&_div]:shadow-none

                    [&_textarea]:h-full
                    [&_textarea]:min-h-0
                    [&_textarea]:w-full
                    [&_textarea]:resize-none

                    [&_textarea]:rounded-[24px]
                    [&_textarea]:border-0
                    [&_textarea]:bg-transparent

                    [&_textarea]:px-4
                    [&_textarea]:pb-4
                    [&_textarea]:pt-[18px]

                    [&_textarea]:text-[15px]
                    [&_textarea]:leading-[30px]
                    [&_textarea]:text-[#241b3f]

                    [&_textarea]:outline-none
                    [&_textarea]:shadow-none
                    [&_textarea]:ring-0

                    [&_textarea]:placeholder:text-[#aaa1b5]

                    [&_textarea:focus]:outline-none
                    [&_textarea:focus]:ring-0
                  "
                >
                  <FlatReflectionTextarea
                    fieldKey={note.key}
                    rows={5}
                    minHeight={170}
                    textClass="text-[15px]"
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </IrregularPaper>
          ))}

          {/* =========================
              ILLUSTRATION
              HÀNG CUỐI - GÓC PHẢI

              Đây chính là vị trí thứ 12
              sau 11 box.
          ========================== */}

          <div
            className="
              relative
              hidden
              h-[280px]
              min-w-0
              items-center
              justify-center

              lg:flex
            "
          >
            <img
              src={cornerIllustration}
              alt=""
              aria-hidden="true"
              className="
                pointer-events-none
                block
                h-auto
                w-full
                max-w-[250px]
                object-contain
                select-none
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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
] as const;

// ============================================================
// Likert helper restyled for Screen29
// ============================================================

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
  const tr = useTr();

  const [value, setValue] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const report = useReportCompletion();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedValue = await loadResponse(fieldKey);

      if (cancelled) return;

      if (typeof savedValue === "number") {
        setValue(savedValue);
      }

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldKey]);

  const state = useAutosave(fieldKey, value, {
    enabled: loaded && value !== null,
  });

  useEffect(() => {
    onSaveStateChange?.(state);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;

    report(fieldKey, value !== null);

    if (value !== null) {
      onValue?.(value);
    }
  }, [value, loaded, fieldKey, report, onValue]);

  return (
    <div
      className="
        flex
        min-h-[62px]
        w-full
        items-center
        justify-between
        gap-5
        rounded-[16px]
        border-2
        border-black
        bg-white/10
        px-5
        py-3
        text-white
      "
    >
      {/* STATEMENT */}
      <div
        className="
          min-w-0
          flex-1
          text-[clamp(14px,1.1vw,18px)]
          font-medium
          leading-[1.35]
          text-white
        "
      >
        <span className="mr-2 font-semibold text-[#ffd95d]">{index + 1}.</span>

        {tr(label)}
      </div>

      {/* 1–5 */}
      <div className="flex shrink-0 items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={cn(
              `
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                border-0
                text-[13px]
                font-semibold
                transition
                duration-150
              `,
              value === n
                ? `
                    bg-white
                    text-[#7654ad]
                    shadow-[0_3px_0_rgba(42,24,74,0.32)]
                  `
                : `
                    bg-white/15
                    text-white
                    hover:bg-white/25
                  `,
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

// ============================================================
// Screen29 — PDF page 33: Omien vahvuuksien käyttö
// ============================================================

function Screen29({ onSaveStateChange }: Props) {
  const tr = useTr();

  const [scores, setScores] = useState<Record<number, number>>({});

  const sum = Object.values(scores).reduce((total, currentValue) => total + currentValue, 0);

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[1100px]
          w-full
          max-w-[1500px]
          px-[8%]
          pb-28
          pt-14
        "
      >
        {/* ========================================
            TITLE
        ========================================= */}

        <div className="max-w-[1180px]">
          <h1
            className="
              font-display
              text-[clamp(34px,3vw,50px)]
              font-semibold
              leading-[1.08]
              tracking-[-0.015em]
              text-[#ffd95d]
            "
          >
            {tr("Omien vahvuuksien käyttäminen")}
          </h1>

          <h2
            className="
              mt-3
              max-w-[1100px]
              font-display
              text-[clamp(17px,1.4vw,23px)]
              font-semibold
              leading-[1.35]
              text-white
            "
          >
            {tr(
              "Asteikko (Govindji & Linley, 2007) – Vastaa seuraavaan asteikolla 1 (täysin eri mieltä) – 5 (täysin samaa mieltä).",
            )}
          </h2>
        </div>

        {/* ========================================
            DESCRIPTION
        ========================================= */}

        <p
          className="
            mt-6
            max-w-[1120px]
            text-[clamp(16px,1.3vw,21px)]
            leading-[1.45]
            text-white
          "
        >
          {tr(
            "Asteikolla 1 täysin eri mieltä, 2.. 3.. 4.. ja 5 täysin samaa mieltä, vastaa seuraavaan mittariin vahvuuksien käytöstä.",
          )}
        </p>

        {/* ========================================
            SCALE EXPLANATION
        ========================================= */}

        <div
          className="
            mt-7
            flex
            flex-wrap
            items-center
            gap-x-8
            gap-y-3
            rounded-[16px]
            border-2
            border-black
            bg-white/10
            px-5
            py-4
            text-[14px]
            text-white
          "
        >
          <span>
            <strong>1</strong> = {tr("täysin eri mieltä")}
          </span>

          <span>
            <strong>2</strong> = {tr("eri mieltä")}
          </span>

          <span>
            <strong>3</strong> = {tr("ei samaa eikä eri mieltä")}
          </span>

          <span>
            <strong>4</strong> = {tr("samaa mieltä")}
          </span>

          <span>
            <strong>5</strong> = {tr("täysin samaa mieltä")}
          </span>
        </div>

        {/* ========================================
            LIKERT QUESTIONS
        ========================================= */}

        <div
          className="
            mt-8
            grid
            gap-y-3
          "
        >
          {LIKERT_STATEMENTS.map((statement, index) => (
            <LikertRow
              key={statement}
              fieldKey={`screen_26_likert_${index + 1}`}
              index={index}
              label={statement}
              onSaveStateChange={onSaveStateChange}
              onValue={(value) =>
                setScores((current) => ({
                  ...current,
                  [index]: value,
                }))
              }
            />
          ))}
        </div>

        {/* ========================================
            TOTAL
        ========================================= */}

        <div
          className="
            ml-auto
            mt-12
            flex
            w-fit
            max-w-full
            items-center
            gap-5
            rounded-[20px]
            border-2
            border-black
            bg-white/10
            px-7
            py-5
            text-white
          "
        >
          <span
            aria-hidden="true"
            className="
              font-display
              text-[64px]
              font-semibold
              leading-[1.12]
              text-[#ffd95d]
            "
          >
            ›
          </span>

          <div
            className="
              text-[clamp(18px,1.4vw,24px)]
              font-semibold
              leading-[1.4]
            "
          >
            <p>{tr("Vastaa kyselyyn.")}</p>

            <p className="mt-1">
              {tr("Laske yhteen pisteesi:")}{" "}
              <span
                className="
                  ml-2
                  inline-flex
                  min-w-[88px]
                  items-center
                  justify-center
                  border-b-2
                  border-[#ffd95d]
                  px-3
                  text-[#ffd95d]
                "
              >
                {sum || ""}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// Screen30 — Module 2 title card
// ============================================================
// FIX: "Tasot  2" và h1 (đổi <br/> thành trLines) giờ qua tr()
function Screen30() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden  text-white">
      <div className="absolute right-[4%] top-0 rounded-b-[12px] border-2 border-t-0 border-black bg-[#7654ad] px-5 py-3 text-white"></div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <h1 className="text-center font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08] tracking-[-0.02em]">
          {trLines(tr, "2. Omat vahvuudet lukiossa")}
        </h1>
      </div>
    </div>
  );
}

// ============================================================
// Screen31 — Omat vahvuuteni lukiossa
// ============================================================
// FIX: 3 đoạn <p> giờ qua tr()
function Screen31() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto  text-white [scrollbar-gutter:stable]">
      <div className="relative mx-auto min-h-[720px] w-full max-w-[1500px] overflow-hidden px-[8%] pb-20 pt-16">
        <div className="relative z-20 max-w-[1150px]">
          <h1 className="font-display text-[clamp(38px,3vw,54px)] font-semibold leading-[1.12] text-[#ffd95d]">
            {tr("Mina styrkor i gymnasiet")}
          </h1>

          <div className="mt-10 space-y-8 text-[clamp(18px,1.5vw,25px)] leading-[1.42]">
            <p>
              {tr(
                "Tässä kokonaisuudessa pääset tutustumaan ja työstämään omia vahvuuksiasi lukiolaisena.",
              )}
            </p>

            <p>
              {tr(
                "Koulukulttuurissa ja opinnoissa virheiden ja puutteiden tunnistaminen tapahtuu kuin itsestään, mutta sen vastavoima, eli vahvuudet ja onnistumiset, eivät tavallisesti pääsekään esiin arvolleen kuuluvalla tavalla. Opiskelussa huomio saattaa kiinnittyä kaikkeen siihen, mitä ei vielä osaa, missä ei ole onnistunut ja mitä kaikkea pitäisi vielä kehittää ja oppia.",
              )}
            </p>

            <p>
              {tr(
                "Kasvamme ja kehitymme ihmisenä läpi opintojen ja koko elämän. On hyvä muistaa, että luonteenvahvuudet eivät ole syntymässä fiksattuja ominaisuuksia, vaan niitä voi tavoitteellisesti kehittää. Lähtökohta on, että opit tunnistamaan omat vahvuutesi opiskelijana jotta voit hyödyntää niitä osana opintoja.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Reusable Vahvuuskarkkini worksheet — design used by Screen32
// ============================================================
// FIX: "Valitse 1–2 vahvuuskarkkia ja" / "Kirjoita vahvuudet tähän" / "Pohdi, mitä teit, koit ja opit."
// / "Täydennä oheinen tehtävä." giờ đều qua tr()
function VahvuuskarkkiOverlayInput({
  fieldKey,
  onSaveStateChange,
}: {
  fieldKey: string;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  return (
    <div
      className="
        h-full
        w-full
        overflow-hidden
        rounded-[18px]

        [&_label]:hidden

        [&>div]:h-full
        [&>div]:min-h-0

        [&_div]:h-full
        [&_div]:border-0
        [&_div]:bg-transparent
        [&_div]:p-0
        [&_div]:shadow-none

        [&_textarea]:h-full
        [&_textarea]:min-h-0
        [&_textarea]:w-full
        [&_textarea]:resize-none
        [&_textarea]:rounded-[18px]
        [&_textarea]:border-0
        [&_textarea]:bg-transparent
        [&_textarea]:px-4
        [&_textarea]:py-3
        [&_textarea]:text-[15px]
        [&_textarea]:leading-[1.45]
        [&_textarea]:text-[#241b3f]
        [&_textarea]:outline-none
        [&_textarea]:shadow-none
        [&_textarea]:ring-0

        [&_textarea:focus]:outline-none
        [&_textarea:focus]:ring-0
      "
    >
      <FlatReflectionTextarea
        fieldKey={fieldKey}
        rows={4}
        minHeight={0}
        onSaveStateChange={onSaveStateChange}
      />
    </div>
  );
}

function VahvuuskarkkiSheet({
  title,
  context,
  fieldPrefix,
  onSaveStateChange,
}: {
  title: string;
  context: string;
  fieldPrefix: string;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);

  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }, []);

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          grid
          min-h-[760px]
          w-full
          max-w-[1220px]
          grid-cols-1
          gap-10
          px-6
          pb-24
          pt-3
          lg:grid-cols-[minmax(0,1fr)_360px]
        "
      >
        <div className="min-w-0">
          <h1
            className="
              font-display
              text-[clamp(34px,3vw,50px)]
              font-semibold
              leading-[1.05]
              text-white
            "
          >
            {tr(title)}
          </h1>

          <p
            className="
              mt-4
              font-display
              text-[clamp(17px,1.35vw,21px)]
              font-semibold
              text-white
            "
          >
            {tr("Valitse 1–2 vahvuuskarkkia ja")} {tr("hyödynnä")} {tr(context)}.
          </p>

          <p
            className="
              mt-12
              font-display
              text-[clamp(18px,1.35vw,22px)]
              font-semibold
              text-white
            "
          >
            {tr("Pohdi, mitä teit, koit ja opit.")}
          </p>

          <div className="mt-7 grid gap-6">
            <ReflectionTextarea
              fieldKey={`${fieldPrefix}_teit`}
              label={tr("1. Mitä teit?")}
              rows={3}
              onSaveStateChange={onSaveStateChange}
            />
            <ReflectionTextarea
              fieldKey={`${fieldPrefix}_seuraavaksi`}
              label={tr("2. Mitä tapahtui seuraavaksi?")}
              rows={3}
              onSaveStateChange={onSaveStateChange}
            />
            <ReflectionTextarea
              fieldKey={`${fieldPrefix}_opit`}
              label={tr("3. Mitä opit?")}
              rows={3}
              onSaveStateChange={onSaveStateChange}
            />
            <ReflectionTextarea
              fieldKey={`${fieldPrefix}_hyodynnat`}
              label={tr("4. Miten hyödynnät oppimaasi?")}
              rows={3}
              onSaveStateChange={onSaveStateChange}
            />
          </div>
        </div>

        <StickyNote tone="coral" seed={`${fieldPrefix}-candies`} className="self-start">
          <div
            className="
              mb-4
              text-center
              font-display
              text-xl
              font-bold
              leading-tight
              text-[color:var(--purple-dark)]
            "
          >
            {tr("Valitse 1–2 vahvuuskarkkia")}
          </div>

          <div className="grid gap-3">
            <Screen42StrengthSelect
              index={0}
              fieldKey={`${fieldPrefix}_karkki_1`}
              language={language}
              selectedValues={selectedStrengths}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />
            <Screen42StrengthSelect
              index={1}
              fieldKey={`${fieldPrefix}_karkki_2`}
              language={language}
              selectedValues={selectedStrengths}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />
          </div>
        </StickyNote>

        <img
          src="/illustrations/s16-bottom-right.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            bottom-4
            right-4
            z-20
            h-auto
            w-[500px]
            max-w-[100%]
            select-none
            object-contain
          "
        />
      </div>
    </div>
  );
}

// ============================================================
// Screen32
// ============================================================

function Screen32(p: Props) {
  return (
    <VahvuuskarkkiSheet
      title="Vahvuuskarkkini"
      context="opinnoissa"
      fieldPrefix="screen_29"
      {...p}
    />
  );
}

// ============================================================
// Screen33 — Osaamisen osa-alueiden palapeli
// ============================================================
// FIX: đoạn <p> phụ (trùng h1) giờ qua tr()
function Screen33({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();

  const pieces = [
    {
      key: "screen_30_lahjakkuudet",
      tab: "LAHJAKKUUDET",
      question: "MISSÄ OLET HYVÄ?",
      wrapper: "left-[2.4%] top-[8%] h-[45%] w-[45%]",
      tabClass: "left-[54%] top-[-25%]",
      questionClass: "top-[6%]",
      textareaClass: "left-[22%] right-[11%] top-[31%] bottom-[24%]",
    },
    {
      key: "screen_30_taidot",
      tab: "TAIDOT",
      question: "MITÄ TAITOJA SINULLA JO ON, JOITA HYÖDYNNÄT OPINNOISSA?",
      wrapper: "left-[49%] top-[5.2%] h-[46%] w-[49%]",
      tabClass: "left-[61%] top-[-25%]",
      questionClass: "top-[6%]",
      textareaClass: "left-[42%] right-[9%] top-[35%] bottom-[25%]",
    },
    {
      key: "screen_30_kiinnostukset",
      tab: "KIINNOSTUKSEN KOHTEET",
      question: "MITÄ HARRASTAT? MITKÄ OVAT INNOSTUKSEN JA INTOHIMON KOHTEITA VAPAA-AJALLASI?",
      wrapper: "left-[2%] top-[56.5%] h-[42%] w-[46%]",
      tabClass: "left-[91%] top-[-20%] -rotate-[8deg]",
      questionClass: "top-[6%]",
      textareaClass: "left-[24%] right-[10%] top-[33%] bottom-[21%]",
    },
    {
      key: "screen_30_resurssit",
      tab: "RESURSSIT",
      question:
        "MITKÄ ASIAT TAI HENKILÖT OVAT VOIMAVAROJASI? MIKÄ AUTTAA SINUA PYSYMÄÄN VAHVANA VAIKEINA AIKOINA? MIKÄ TUO ELÄMÄÄSI MERKITYSTÄ?",
      wrapper: "left-[49.5%] top-[53.5%] h-[44.5%] w-[48.5%]",
      tabClass: "left-[24%] top-[-25%] -rotate-[6deg]",
      questionClass: "top-[5%]",
      textareaClass: "left-[42%] right-[9%] top-[35%] bottom-[22%]",
    },
  ];

  const puzzleIllustration =
    language === "fi"
      ? "/illustrations/s33-puzzle-layout-fi.png"
      : language === "sv"
        ? "/illustrations/s33-puzzle-layout-sv.png"
        : "/illustrations/s33-puzzle-layout-en.png";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      {/* =====================================================
          CANVAS
      ====================================================== */}

      <div
        className="
          relative
          mx-auto
          min-h-[920px]
          w-full
          max-w-[1500px]
          overflow-hidden
          pb-28
        "
      >
        {/* =====================================================
            LEFT TEXT
        ====================================================== */}

        <div
          className="
            absolute
            left-[6.5%]
            top-[8%]
            z-30
            w-[24%]
            max-w-[330px]
          "
        >
          <h1
            className="
              font-display
              text-[clamp(36px,3.2vw,54px)]
              font-semibold
              leading-[1.08]
              text-white
            "
          >
            {tr("Osaamisen osa-alueiden palapeli")}
          </h1>

          <p
            className="
              mt-8
              font-display
              text-[clamp(18px,1.45vw,24px)]
              font-normal
              leading-[1.4]
              text-white
            "
          >
            {tr(
              "Meillä kaikilla on osaamisia ja tukipilareita elämässämme. Nämä voidaan jakaa neljään osa-alueeseen:",
            )}{" "}
            <strong className="font-semibold">
              {tr("lahjakkuuksiin, taitoihin, kiinnostuksen kohteisiin ja resursseihin.")}
            </strong>
          </p>

          <p
            className="
              mt-14
              text-[16px]
              text-white
            "
          >
            (Niemiec, 2018)
          </p>
        </div>

        {/* =====================================================
            RIGHT PUZZLE AREA
        ====================================================== */}

        <div
          className="
            absolute
            left-[30%]
            top-[6%]
            z-10
            aspect-[99/86]
            w-[67%]
            max-w-[1020px]
          "
        >
          {/* =====================================================
              LANGUAGE-SPECIFIC ILLUSTRATION
          ====================================================== */}

          <img
            src={puzzleIllustration}
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-0
              z-0
              h-full
              w-full
              object-fill
              select-none
            "
          />

          {/* =====================================================
              PUZZLE INPUTS
          ====================================================== */}

          {pieces.map((piece) => (
            <div
              key={piece.key}
              className={cn(
                `
                  absolute
                  z-20
                `,
                piece.wrapper,
              )}
            >
              <div
                className={cn(
                  `
                    absolute
                    z-20
                    overflow-hidden
                    rounded-[24px]
                    border-[6px]
                    border-black
                    bg-[#fffdf8]
                    shadow-[inset_0_7px_0_0_#000]

                    [&_label]:hidden

                    [&>div]:h-full
                    [&>div]:min-h-0

                    [&_div]:h-full
                    [&_div]:border-0
                    [&_div]:bg-transparent
                    [&_div]:p-0
                    [&_div]:shadow-none

                    [&_textarea]:h-full
                    [&_textarea]:min-h-0
                    [&_textarea]:w-full
                    [&_textarea]:resize-none

                    [&_textarea]:border-0
                    [&_textarea]:bg-transparent

                    [&_textarea]:px-5
                    [&_textarea]:pb-4
                    [&_textarea]:pt-7

                    [&_textarea]:font-display
                    [&_textarea]:text-[15px]
                    [&_textarea]:leading-[26px]
                    [&_textarea]:text-[#241b3f]

                    [&_textarea]:outline-none
                    [&_textarea]:shadow-none
                    [&_textarea]:ring-0

                    [&_textarea]:placeholder:text-[#aaa1b5]

                    [&_textarea:focus]:outline-none
                    [&_textarea:focus]:ring-0
                  `,
                  piece.textareaClass,
                )}
              >
                <FlatReflectionTextarea
                  fieldKey={piece.key}
                  rows={6}
                  minHeight={172}
                  textClass="text-[15px]"
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen34 (PDF p37): Unelmien tiekartta opinnoissa -----

function Screen34({ onSaveStateChange }: Props) {
  const tr = useTr();

  const qs = [
    "Keneltä saan tukea ja opastusta?",
    "Mitä vahvuuksiani voin hyödyntää?",
    "Mitä minun kannattaisi vielä oppia?",
    "Mitä jo osaan hyvin?",
    "Unelmieni ammatti",
  ];

  const CANVAS_WIDTH = 1450;
  const CANVAS_HEIGHT = 720;

  const boxes = [
    { cx: 250, cy: 300, w: 285, h: 185 },
    { cx: 500, cy: 548, w: 285, h: 185 },
    { cx: 785, cy: 260, w: 295, h: 190 },
    { cx: 1035, cy: 525, w: 285, h: 185 },
    { cx: 1235, cy: 255, w: 285, h: 185 },
  ] as const;

  const roadPath = `
    M 55 450
    C 120 385, 165 320, 250 300
    C 355 274, 420 405, 500 548
    C 610 675, 690 385, 785 260
    C 900 110, 980 350, 1035 525
    C 1105 645, 1165 355, 1235 255
    C 1288 178, 1358 196, 1410 238
  `;

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full

        overflow-x-hidden
        overflow-y-scroll
        overscroll-y-contain

        text-black

        [scrollbar-gutter:stable]
        [-webkit-overflow-scrolling:touch]
      "
    >
      {/* =====================================================
          SCROLL CONTENT

 
      ====================================================== */}

      <div
        className="
          relative
          mx-auto
          min-h-[980px]
          w-full
          max-w-[1500px]

          px-[1.5%]
          pb-[180px]
          pt-5
        "
      >
        {/* =====================================================
            DESIGN CANVAS

           
        ====================================================== */}

        <div
          className="
            relative
            mx-auto
            h-[720px]
            w-full
            max-w-[1450px]
            overflow-visible
          "
        >
          {/* =================================================
              TITLE
          ================================================== */}

          <h1
            className="
              absolute
              left-[1.5%]
              top-[5%]
              z-30

              max-w-[360px]

              text-left
              font-display
              text-[clamp(34px,2.8vw,52px)]
              font-semibold
              leading-[1.03]

              text-white
            "
          >
            {tr("Unelmien tiekartta opinnoissa")}
          </h1>

          {/* =================================================
              ROAD
          ================================================== */}

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="
              pointer-events-none
              absolute
              inset-0
              z-0

              h-full
              w-full

              overflow-visible
            "
          >
            {/* ROAD SHADOW */}

            <path
              d={roadPath}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="62"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* WHITE ROAD */}

            <path
              d={roadPath}
              fill="none"
              stroke="#fffdfc"
              strokeWidth="48"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* CENTER DASHED LINE */}

            <path
              d={roadPath}
              fill="none"
              stroke="rgba(118,84,173,0.22)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12 18"
            />

            {/* ===============================================
                START
            ================================================ */}

            <g transform="translate(32 425)">
              <path
                d="
                  M 0 0
                  H 100
                  L 118 24
                  L 100 48
                  H 0
                  Z
                "
                fill="#f3cbd1"
                stroke="#241b3f"
                strokeWidth="2"
              />

              <text x="56" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7654ad">
                {tr("Aloita tästä")}
              </text>
            </g>

            {/* ===============================================
                FINISH
            ================================================ */}

            <g transform="translate(1345 208)">
              <line
                x1="8"
                y1="0"
                x2="8"
                y2="62"
                stroke="#241b3f"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <rect
                x="10"
                y="0"
                width="82"
                height="36"
                rx="9"
                fill="#ffd95d"
                stroke="#241b3f"
                strokeWidth="2"
              />

              <text x="51" y="23" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7654ad">
                {tr("Maali")}
              </text>
            </g>
          </svg>

          {/* =================================================
              QUESTION BOXES
          ================================================== */}

          {qs.map((q, i) => {
            const box = boxes[i];

            if (!box) return null;

            const left = ((box.cx - box.w / 2) / CANVAS_WIDTH) * 100;

            const top = ((box.cy - box.h / 2) / CANVAS_HEIGHT) * 100;

            const width = (box.w / CANVAS_WIDTH) * 100;

            const height = (box.h / CANVAS_HEIGHT) * 100;

            return (
              <section
                key={q}
                className="
                  absolute
                  z-20

                  flex
                  min-w-0
                  flex-col

                  overflow-hidden

                  bg-[#f8f6f1]

                  px-4
                  pb-4
                  pt-3

                  text-black

                  transition-transform
                  duration-200

                  hover:z-30
                  hover:-translate-y-1

                  focus-within:z-30
                "
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,

                  minWidth: "0",
                  minHeight: "0",

                  border: "5px solid #111",

                  borderRadius: i % 2 === 0 ? "30px 26px 32px 27px" : "26px 31px 26px 32px",

                  boxShadow: "5px 6px 0 rgba(0,0,0,0.12)",

                  transform: `rotate(${i % 2 === 0 ? "-0.35deg" : "0.3deg"})`,
                }}
              >
                {/* ===========================================
                    QUESTION
                ============================================ */}

                <p
                  className="
                    mb-3
                    shrink-0

                    text-left
                    font-display
                    text-[12px]
                    font-semibold
                    leading-[1.2]

                    text-[#6c50a8]
                  "
                >
                  {i + 1}. {tr(q)}
                </p>

                {/* ===========================================
                    TEXTBOX
                ============================================ */}

                <div
                  className="
                    relative
                    mt-1

                    min-h-0
                    flex-1

                    overflow-hidden

                    rounded-[18px]
                    border-[5px]
                    border-black

                    bg-[#f8f6f1]

                    [&_label]:hidden

                    [&>div]:h-full
                    [&>div]:min-h-0
                    [&>div]:border-0
                    [&>div]:shadow-none
                    [&>div]:outline-none
                    [&>div]:ring-0

                    [&_div]:border-0
                    [&_div]:bg-transparent
                    [&_div]:p-0
                    [&_div]:shadow-none

                    [&_textarea]:relative
                    [&_textarea]:z-10

                    [&_textarea]:h-full
                    [&_textarea]:min-h-[92px]
                    [&_textarea]:w-full

                    [&_textarea]:resize-none

                    [&_textarea]:rounded-[14px]
                    [&_textarea]:border-0
                    [&_textarea]:bg-transparent

                    [&_textarea]:px-3
                    [&_textarea]:py-2

                    [&_textarea]:font-display
                    [&_textarea]:text-[13px]
                    [&_textarea]:font-normal
                    [&_textarea]:leading-[28px]

                    [&_textarea]:text-[#241b3f]

                    [&_textarea]:outline-none
                    [&_textarea]:shadow-none
                    [&_textarea]:ring-0

                    [&_textarea:focus]:border-0
                    [&_textarea:focus]:outline-none
                    [&_textarea:focus]:shadow-none
                    [&_textarea:focus]:ring-0
                  "
                >
                  {/* PAPER LINES */}

                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none

                      absolute
                      inset-0
                      z-0

                      opacity-75

                      [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_26px,#d9ccef_27px,#d9ccef_29px)]
                    "
                  />

                  {/* SAVED TEXTAREA */}

                  <div className="relative z-10 h-full">
                    <ReflectionTextarea
                      fieldKey={`screen_31_tiekartta_${i + 1}`}
                      label=""
                      rows={4}
                      onSaveStateChange={onSaveStateChange}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* =====================================================
            EXTRA SPACE
        ====================================================== */}

        <div aria-hidden="true" className="h-[80px] w-full" />
      </div>
    </div>
  );
}

// ----- Screen35 (PDF p38): Minä opiskelijana -----
function Screen35({ onSaveStateChange }: Props) {
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
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[7%] pb-10 pt-9 text-black">
      <div className="mx-auto w-full max-w-[1150px] rounded-[30px] px-10 py-8 pb-12">
        <h1 className="font-display text-[clamp(30px,2.8vw,42px)] font-medium leading-[1.12] text-[#f1f1ef]">
          {tr(
            "Minä opiskelijana – Listaa seuraavalle sivulle kaikki vahvuutesi opiskelijana – myös sellaiset, jotka voivat tuntua sinusta itsestäänselvyyksiltä.",
          )}
        </h1>

        <p className="mt-6 max-w-[980px] text-[19px] font-normal leading-[1.45] text-[#f1f1ef]">
          {tr(
            "Listaa seuraavalle sivulle aivan kaikki vahvuutesi opiskelijana, myös sellaiset, jotka saattavat tuntua sinulle itsestään selvyydeltä. Oletko hyvä kielissä, keksitkö luovia ratkaisuja ongelmiin, autatko mielelläsi toisia, keksitkö parhaat vitsit, kiitätkö toisia, oletko ryhmähengen luoja?",
          )}
        </p>

        <p className="mt-4 max-w-[980px] text-[19px] font-normal leading-[1.45] text-[#f1f1ef]">
          {tr(
            "Pohdi ensin seuraavia kysymyksiä ja selvitä, mitä oikeasti rakastat tehdä ja missä olet erityisen hyvä. Mieti, millä uudella tavalla voit hyödyntää vahvuuksiasi lukiossa.",
          )}
        </p>

        <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
          {qs.map((q, i) => (
            <section
              key={q}
              className="
                relative
                flex
                min-h-[230px]
                min-w-0
                flex-col
                rounded-[22px]
                border-[3px]
                border-black
                bg-[#faf8ff]
                px-5
                pb-5
                pt-5
                shadow-[0_6px_0_rgba(0,0,0,0.18)]
              "
            >
              <h2
                className="
                  min-h-[56px]
                  text-left
                  font-display
                  text-[18px]
                  font-medium
                  leading-[1.35]
                  text-black
                "
              >
                {tr(q)}
              </h2>

              <div
                className="
                  mt-4
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[16px]
                  border-2
                  border-black
                  bg-white

                  [&_label]:hidden
                  [&>div]:h-full
                  [&>div]:min-h-0
                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none
                  [&_textarea]:h-full
                  [&_textarea]:min-h-[120px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[14px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[16px]
                  [&_textarea]:font-normal
                  [&_textarea]:leading-[1.5]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#9a93a6]
                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey={`screen_32_minaopisk_${i + 1}`}
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen36 (PDF p39): Listaa erityistaidot — 5 slots -----
// FIX: placeholder giờ qua tr()
function Screen36({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[7%] pb-12 pt-9 text-black">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <h1 className="max-w-[820px] font-display text-[clamp(34px,3vw,48px)] font-medium leading-[1.08] text-[#f1f1ef]">
            <span className="block">{tr("Täytä kaikki erityisosaamisesi tähän listaan.")}</span>
            <span className="block">{tr("(Täytettävät kohdat 1–5)")}</span>
          </h1>

          <div className="mt-8 grid gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
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

        <img
          src="/illustrations/s23-candy-banana-shoe.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            mx-auto
            mt-2
            h-auto
            w-full
            max-w-[360px]
            select-none
            object-contain
            drop-shadow-[0_14px_24px_rgba(0,0,0,0.22)]
          "
        />
      </div>
    </div>
  );
}

// ----- Screen37 (PDF p40): Koulu-kokemuksia -----
function Screen37({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs: Array<{ k: string; q: string }> = [
    { k: "screen_34_oppi", q: "Minkälaisia asioita opit nopeasti ja helposti?" },
    {
      k: "screen_34_palaute",
      q: "Mistä sait rohkaisevaa palautetta peruskoulussa opettajilta entä luokkakavereilta?",
    },
    { k: "screen_34_aiheet", q: "Mistä tykkäsit koulussa ala-asteella, entä yläasteella?" },
    {
      k: "screen_34_onnistuminen",
      q: "Mikä onnistuminen sinulle on jäänyt mieleen peruskoulusta?",
    },
  ];
  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[7%] pb-10 pt-9 text-black">
      <div className="mx-auto w-full max-w-[1150px] rounded-[30px] px-10 py-8 pb-12">
        <h1 className="font-display text-[clamp(32px,3vw,46px)] font-medium leading-[1.1] text-[#f1f1ef]">
          {tr("Koulumuistot")}
          <br />
          <span className="text-[clamp(24px,2.1vw,34px)]">
            {tr(
              "Katso taaksepäin omia aiempia opiskelukokemuksiasi ja huomaa, mitä vahvuuksia sinulla on.",
            )}
          </span>
        </h1>

        <p className="mt-6 max-w-[980px] text-[19px] font-normal leading-[1.45] text-[#f1f1ef]">
          {tr(
            "Tarkastele omia aiempia kokemuksiasi opinnoissa ja huomaa, millaisia vahvuuksia sinulla on.",
          )}
        </p>

        <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
          {qs.map((x) => (
            <section
              key={x.k}
              className="
                relative
                flex
                min-h-[245px]
                min-w-0
                flex-col
                rounded-[22px]
                border-[3px]
                border-black
                bg-[#faf8ff]
                px-5
                pb-5
                pt-5
                shadow-[0_6px_0_rgba(0,0,0,0.18)]
              "
            >
              <h2 className="min-h-[70px] text-left font-display text-[clamp(23px,1.9vw,31px)] font-semibold leading-[1.12] text-[black] [paint-order:stroke_fill] [-webkit-text-stroke:0.8px_#241b3f]">
                {tr(x.q)}
              </h2>

              <div
                className="
                  mt-4
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[16px]
                  border-2
                  border-black
                  bg-white

                  [&_label]:hidden
                  [&>div]:h-full
                  [&>div]:min-h-0
                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none
                  [&_textarea]:h-full
                  [&_textarea]:min-h-[120px]
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[14px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-4
                  [&_textarea]:py-3
                  [&_textarea]:text-[16px]
                  [&_textarea]:font-normal
                  [&_textarea]:leading-[1.5]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <ReflectionTextarea
                  fieldKey={x.k}
                  label=""
                  rows={3}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen38 (PDF p41): Tavoitteeni opiskelijana 1/2 — informational -----
function Screen38(_props: Props) {
  const tr = useTr();

  const questions = [
    "Mikä on sinulle se iso tavoite, jonka haluat elämässäsi saavuttaa?",
    "Kirjoita tavoitteesi jäävuoren pinnan päällä näkyvään osaan.",
    "Pohdi ja kirjaa jäävuoren pinnan alapuolelle kaikki vahvuudet, joiden käyttäminen ja kehittäminen tukee tavoitteen saavuttamista.",
    "Pohdi ja konkretisoi, miten voit hyödyntää kyseisiä vahvuuksia tavoitteen saavuttamisessa.",
    "Kirjoita myös, mitä muita taitoja tulet tarvitsemaan ja kehittämään tavoitteen saavuttamisessa.",
  ];

  return (
    <div
      className="
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[8%]
        pb-12
        pt-12
        text-white
      "
    >
      <div className="mx-auto max-w-[1180px]">
        <h1
          className="
            font-display
            text-[clamp(38px,4vw,64px)]
            font-semibold
            leading-[1.08]
            text-[#ffd33f]
          "
        >
          {tr("Tavoitteeni opiskelijana 1/2")}
        </h1>

        <div className="mt-12 max-w-[1080px] space-y-9">
          {questions.map((question, index) => (
            <div
              key={question}
              className="
                grid
                grid-cols-[34px_minmax(0,1fr)]
                items-start
                gap-4
              "
            >
              <span
                className="
                  font-display
                  text-[clamp(22px,1.8vw,30px)]
                  font-semibold
                  leading-[1.35]
                  text-[#ffd33f]
                "
              >
                {index + 1}.
              </span>

              <p
                className="
                  font-display
                  text-[clamp(22px,1.8vw,30px)]
                  font-medium
                  leading-[1.4]
                  text-white
                "
              >
                {tr(question)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen39 (PDF p42): Tavoitteeni opiskelijana 2/2 — iceberg quadrants -----
function Screen39({ onSaveStateChange }: Props) {
  const tr = useTr();

  const boxes = [
    {
      k: "screen_36_tavoite",
      label: "1. Tavoitteeni ja miksi se on minulle tärkeä",
      position: "left-[5%] top-[20%] w-[22%]",
      height: 190,
    },
    {
      k: "screen_36_vahvuudet",
      label: "2. Vaaditut vahvuudet",
      position: "left-[5%] top-[57%] w-[22%]",
      height: 180,
    },
    {
      k: "screen_36_hyodynnan",
      label: "3. Miten hyödynnän vahvuuksia",
      position: "right-[5%] top-[20%] w-[22%]",
      height: 190,
    },
    {
      k: "screen_36_taidot",
      label: "4. Mitä muita taitoja tarvitsen",
      position: "right-[5%] top-[57%] w-[22%]",
      height: 180,
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[760px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[5%]
          pb-10
          pt-6
        "
      >
        {/* TITLE */}
        <h1
          className="
            relative
            z-30
            font-display
            text-[clamp(38px,3.6vw,56px)]
            font-semibold
            leading-[1.05]
            tracking-[-0.02em]
            text-[#ffd33f]
          "
        >
          {tr("Tavoitteeni opiskelijana 2/2")}
        </h1>

        {/* WATER LINE */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-[5%]
            right-[5%]
            top-[54%]
            z-[1]
            border-t-[2px]
            border-dashed
            border-[#b7dfe0]
          "
        />

        {/* ICEBERG */}
        <svg
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[13%]
            z-[2]
            h-[590px]
            w-[510px]
            -translate-x-1/2
            select-none
          "
          viewBox="0 0 510 590"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="screen39Ice" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#c5e9e9" />
              <stop offset="100%" stopColor="#9dd5d5" />
            </linearGradient>
          </defs>

          {/* ICEBERG ABOVE WATER */}
          <path
            d="
              M70 290
              C74 260 100 222 124 190
              C148 158 173 118 194 81
              C206 61 212 112 227 93
              C244 70 252 22 273 12
              C291 45 297 93 316 75
              C332 59 340 26 354 74
              C366 112 372 157 389 184
              C401 202 414 167 427 194
              C439 219 440 253 453 262
              C464 269 469 282 468 294
              C375 303 167 303 70 294
              C68 292 68 291 70 290
              Z
            "
            fill="url(#screen39Ice)"
          />

          {/* ICEBERG BELOW WATER */}
          <path
            d="
              M64 315
              C105 306 389 307 451 315
              C463 326 467 344 475 356
              C487 373 501 375 507 388
              C486 402 478 412 479 432
              C481 447 487 462 476 470
              C461 477 451 462 442 478
              C427 505 431 543 409 551
              C390 557 381 530 366 546
              C348 566 337 579 320 572
              C301 563 290 543 273 552
              C253 563 244 586 224 577
              C206 569 202 518 183 504
              C169 494 158 546 141 527
              C129 513 121 489 105 484
              C88 479 74 474 61 458
              C45 439 56 414 38 395
              C22 378 32 350 49 338
              C55 332 57 323 64 315
              Z
            "
            fill="url(#screen39Ice)"
          />

          {/* ARROW */}
          <path
            d="
              M8 68
              C90 24 181 -6 240 2
              C276 6 295 22 305 44
            "
            fill="none"
            stroke="#b89ae8"
            strokeLinecap="round"
            strokeWidth="2.5"
          />

          <path d="M305 44 L295 34 L311 36 Z" fill="#b89ae8" />
        </svg>

        {/* QUESTIONS + TEXTBOXES */}
        {boxes.map((box) => {
          const isRight = box.position.includes("right-");

          return (
            <section
              key={box.k}
              className={`
                absolute
                z-20
                flex
                flex-col
                ${isRight ? "items-end" : "items-start"}
                ${box.position}
              `}
            >
              {/* QUESTION */}
              <h2
                className="
                  w-full
                  max-w-[290px]
                  font-display
                  text-[clamp(16px,1.2vw,21px)]
                  font-semibold
                  leading-[1.12]
                  text-white
                "
              >
                {tr(box.label)}
              </h2>

              {/* TEXTBOX */}
              <div
                className="
                  relative
                  mt-1
                  w-full
                  max-w-[290px]
                  overflow-hidden
                  rounded-[20px]
                  border-[4px]
                  border-solid
                  border-black
                  bg-transparent
                "
                style={{
                  height: `${box.height}px`,
                }}
              >
                <div
                  className="
                    h-full
                    w-full

                    [&_label]:hidden

                    [&>div]:h-full
                    [&>div]:w-full
                    [&>div]:border-0
                    [&>div]:bg-transparent
                    [&>div]:p-0
                    [&>div]:shadow-none
                    [&>div]:outline-none
                    [&>div]:ring-0

                    [&_div]:border-0
                    [&_div]:bg-transparent
                    [&_div]:shadow-none

                    [&_textarea]:block
                    [&_textarea]:h-full
                    [&_textarea]:min-h-0
                    [&_textarea]:w-full
                    [&_textarea]:resize-none
                    [&_textarea]:rounded-[16px]
                    [&_textarea]:border-0
                    [&_textarea]:bg-transparent
                    [&_textarea]:px-4
                    [&_textarea]:py-3
                    [&_textarea]:font-display
                    [&_textarea]:text-[15px]
                    [&_textarea]:font-normal
                    [&_textarea]:leading-[27px]
                    [&_textarea]:text-white
                    [&_textarea]:outline-none
                    [&_textarea]:shadow-none
                    [&_textarea]:ring-0

                    [&_textarea::placeholder]:text-white/50

                    [&_textarea:focus]:border-0
                    [&_textarea:focus]:outline-none
                    [&_textarea:focus]:shadow-none
                    [&_textarea:focus]:ring-0
                  "
                >
                  <ReflectionTextarea
                    fieldKey={box.k}
                    label=""
                    rows={6}
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ----- Screen40 (PDF p43): Vahvuuteni opiskelijana — 3 columns -----
function Screen40({ onSaveStateChange }: Props) {
  const tr = useTr();
  const columns = [
    {
      fieldKey: "screen_37_arvostan",
      group: "Mukavia asioita",
      label: "Arvostan itsessäni",
    },
    {
      fieldKey: "screen_37_vahvuuksiani",
      group: "Omia vahvuuksia",
      label: "Vahvuuksiani ovat mielestäni",
    },
    {
      fieldKey: "screen_37_paikkoja",
      group: "Paikkoja",
      label: "Näissä paikoissa viihdyn ja pääsen käyttämään vahvuuksiani",
    },
  ];
  return (
    <div className="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[5%] pb-12 pt-10 text-white">
      <div className="mx-auto max-w-[1240px] rounded-[48px] px-[6%] pb-8 pt-9">
        <h1 className="font-display text-[clamp(38px,4vw,62px)] font-semibold leading-[1.08] text-yellow">
          {tr("Vahvuuteni opiskelijana")}
        </h1>
        <p className="mt-5 max-w-[1040px] text-[clamp(20px,1.55vw,28px)] font-semibold leading-[1.28] text-white">
          {tr(
            "Tunnista omia vahvuuksiasi. Arvosta ja ole ylpeä omista vahvuuksistasi. Kirjoita itsellesi muistiin omia parhaita puoliasi opiskelijana!",
          )}
        </p>

        <div className="mt-7 grid min-h-[480px] grid-cols-1 border-[black] text-[white] md:grid-cols-3">
          {columns.map((column, index) => (
            <section
              key={column.fieldKey}
              className={cn(
                "flex min-h-[480px] flex-col border-[black]",
                index === 0 ? "border-l-2" : "border-l-2",
                index === columns.length - 1 && "border-r-2",
              )}
            >
              <h2 className="border-b-2 border-[black] px-4 pb-3 text-center font-display text-[clamp(20px,1.8vw,30px)] font-semibold leading-[1.15]">
                {tr(column.group)}
              </h2>
              <p className="min-h-[92px] px-6 pt-5 text-center font-display text-[clamp(20px,1.75vw,29px)] font-semibold leading-[1.15]">
                {tr(column.label)}
              </p>
              <div className="min-h-0 flex-1 px-5 pb-2 [&_label]:hidden [&>div]:h-full [&>div]:min-h-0 [&_div]:border-0 [&_div]:bg-transparent [&_div]:p-0 [&_div]:shadow-none [&_textarea]:h-full [&_textarea]:min-h-[320px] [&_textarea]:resize-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:text-[18px] [&_textarea]:text-[#241b3f] [&_textarea]:outline-none [&_textarea]:ring-0">
                <ReflectionTextarea
                  fieldKey={column.fieldKey}
                  label=""
                  rows={10}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen41 (PDF p44): Vahvuuspalaute opiskelukavereilta -----
function Screen41({ onSaveStateChange }: Props) {
  const tr = useTr();
  const questions = [
    { key: "screen_38_uutta", text: "Mitä uutta opin palautteista?" },
    { key: "screen_38_tarkeaa", text: "Mikä palautteessa on minulle tärkeää?" },
    {
      key: "screen_38_muistetaan",
      text: "Millaisista asioista minut muistetaan / tunnistetaan parhaiten?",
    },
    { key: "screen_38_yhteisoon", text: "Mitä hyvää vahvuuteni tuovat yhteisööni?" },
  ];
  return (
    <div className="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[8%] pb-12 pt-12 text-white">
      <div className="mx-auto max-w-[1180px]">
        <h1 className="font-display text-[clamp(38px,4vw,64px)] font-semibold leading-[1.08] text-[#ffd33f]">
          {tr(
            "Vahvuuspalaute opiskelukavereilla – Kirjoita palautetta ja kehuja ryhmässä 2–4 opiskelukaverin kanssa. Nimeä vahvuuksia, joita arvostat toisissanne.",
          )}
        </h1>
        <p className="mt-8 max-w-[1080px] text-[clamp(20px,1.6vw,28px)] font-normal leading-[1.42] text-white">
          {tr(
            "Kirjoita palautetta ja kehuja ryhmässä 2–4 opiskelukaverin kanssa. Käytä sivua 10 pohjana. Nimetkää ne vahvuudet, joita toisissanne arvostatte. Kertokaa myös, missä vahvuudet näkyvät ja miten ne vaikuttavat kanssaihmisiin.",
          )}
        </p>

        <div className="mt-9 grid gap-x-8 gap-y-8 md:grid-cols-2">
          {questions.map((question, index) => (
            <section key={question.key} className="min-w-0">
              <h2 className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 font-display text-[clamp(20px,1.65vw,29px)] font-semibold leading-[1.18] text-white">
                <span
                  className="mt-[0.45em] h-3 w-3 rounded-full bg-[#ffd33f]"
                  aria-hidden="true"
                />
                <span>
                  {index + 1}. {tr(question.text)}
                </span>
              </h2>
              <div className="mt-4 overflow-hidden rounded-[24px] border-[5px] border-black bg-[#fffdf8] shadow-[inset_0_6px_0_0_#000,0_8px_0_rgba(0,0,0,0.16)]">
                <FlatReflectionTextarea
                  fieldKey={question.key}
                  rows={6}
                  minHeight={172}
                  textClass="text-[16px] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,#e7d8ff_28px,#e7d8ff_29px)]"
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen42 (PDF p45): Minä olen (M2) -----
function Screen42({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const [selectedStrengths, setSelectedStrengths] = useState<Record<number, string>>({});
  const selectedValues = Object.values(selectedStrengths).filter(Boolean);

  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      if (current[index] === value) return current;
      return { ...current, [index]: value };
    });
  }, []);

  const cardPositions = ["", "", "", "", "", "", "md:col-start-2 xl:col-start-3"];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div
        className="
          relative
          z-20
          mx-auto
          min-h-[900px]
          w-full
          max-w-[1500px]
          px-[4%]
          pb-28
          pt-8
        "
      >
        {/* =====================================================
            LEFT SIDE
        ====================================================== */}

        <div
          className="
            relative
            z-30
            w-[300px]
            max-w-[24%]
          "
        >
          <h1
            className="
              font-display
              text-[clamp(38px,3.4vw,56px)]
              font-semibold
              leading-[1.05]
              text-[#FFE77A]
            "
          >
            {tr("Minä olen")}
          </h1>

          <p
            className="
              mt-8
              font-display
              text-[clamp(18px,1.45vw,24px)]
              font-semibold
              leading-[1.4]
              text-white
            "
          >
            {tr("Muuta muilta saamasi palaute lauseiksi minä muotoon:")}
          </p>

          <p
            className="
              mt-7
              font-display
              text-[clamp(17px,1.35vw,22px)]
              font-medium
              leading-[1.4]
              text-white
            "
          >
            {tr('"Olet sinnikäs" → "Minä olen sinnikäs."')}
          </p>
        </div>

        {/* =====================================================
            7 RESPONSE CARDS
        ====================================================== */}

        <div
          className="
            absolute
            z-30
            right-[4%]
            top-8
            w-[70%]
          "
        >
          <div
            className="
              grid
              min-w-0
              auto-rows-[minmax(170px,auto)]
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  `
                    flex
                    min-h-[170px]
                    flex-col
                    overflow-visible
                    rounded-[18px_14px_24px_16px]
                    border-[3px]
                    border-black
                    bg-[#fffefa]
                    px-5
                    pb-4
                    pt-4
                    text-black
                    shadow-[0_10px_0_#4b326c]
                    transition-all
                    duration-200
                    hover:z-30
                    hover:-translate-y-1
                    hover:scale-[1.02]
                    focus-within:z-40
                    focus-within:ring-2
                    focus-within:ring-[#d5c2ef]
                  `,
                  cardPositions[i],
                )}
              >
                <p
                  className="
                    mb-5
                    shrink-0
                    text-center
                    font-display
                    text-[15px]
                    font-medium
                    uppercase
                    leading-[1.2]
                    tracking-[0.2px]
                    text-black
                  "
                >
                  {tr("Minä olen ...")}
                </p>

                <div className="flex flex-1 items-center">
                  <Screen42StrengthSelect
                    index={i}
                    fieldKey={`screen_39_mina_olen_${i + 1}`}
                    language={language}
                    selectedValues={selectedValues}
                    onValueChange={updateStrength}
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================
            ILLUSTRATION
        ====================================================== */}

        <img
          src="/illustrations/illustration-screen42-3.png"
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            top-[310px]
            left-[-18px]
            z-40
            h-[470px]
            w-auto
            max-w-none
            object-contain
            object-bottom
            select-none
            drop-shadow-[0_12px_18px_rgba(0,0,0,0.22)]
          "
        />
      </div>
    </div>
  );
}

function Screen42StrengthSelect({
  index,
  fieldKey,
  language,
  selectedValues,
  onValueChange,
  onSaveStateChange,
}: {
  index: number;
  fieldKey: string;
  language: "fi" | "sv" | "en";
  selectedValues: string[];
  onValueChange: (index: number, value: string) => void;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [initialValueWasValid, setInitialValueWasValid] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadResponse<string>(fieldKey);
      if (cancelled) return;
      const savedNumber = Number(saved);
      const isValidSavedStrength =
        typeof saved === "string" &&
        Number.isInteger(savedNumber) &&
        savedNumber >= 1 &&
        savedNumber <= 26;
      if (isValidSavedStrength) {
        setValue(saved);
        setInitialValueWasValid(true);
        onValueChange(index, saved);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldKey, index, onValueChange]);

  const state = useAutosave(fieldKey, value, {
    enabled: loaded && (dirty || initialValueWasValid),
  });

  useEffect(() => {
    onSaveStateChange?.(state);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (loaded) report(fieldKey, value.trim().length > 0);
  }, [fieldKey, loaded, report, value]);

  function handleChange(nextValue: string) {
    setDirty(true);
    setValue(nextValue);
    onValueChange(index, nextValue);
  }

  const selectedStrengthNumber = Number(value);
  const hasSelectedStrength =
    Number.isInteger(selectedStrengthNumber) &&
    selectedStrengthNumber >= 1 &&
    selectedStrengthNumber <= 26;

  return (
    <div className="relative w-full">
      {hasSelectedStrength && (
        <span
          className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/20"
          style={{ backgroundColor: getStrengthColor(selectedStrengthNumber) }}
        />
      )}
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        aria-label={tr("Minä olen ...")}
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 pr-10 font-display text-sm font-bold text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--purple-dark)] focus:ring-2 focus:ring-[#d5c2ef]",
          hasSelectedStrength && "pl-10",
        )}
      >
        <option value="">{tr("Valitse vahvuus")}</option>
        {Array.from({ length: 26 }).map((_, strengthIndex) => {
          const strengthNumber = strengthIndex + 1;
          const optionValue = String(strengthNumber);
          const alreadyUsed = selectedValues.includes(optionValue) && optionValue !== value;
          return (
            <option key={strengthNumber} value={optionValue} disabled={alreadyUsed}>
              {getStrengthName(strengthNumber, language)}
            </option>
          );
        })}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[color:var(--purple-dark)]">
        ▼
      </span>
    </div>
  );
}

// ----- S40 (PDF p46): Moduuli 3 title card -----
// FIX: trước đây component này KHÔNG có tr() nào. Nay bọc "Moduuli 3" và h1.
function Screen43() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden text-white">
      <div className="absolute right-[4%] top-0 rounded-b-[12px] border-2 border-t-0 border-black bg-[#7654ad] px-5 py-3 text-white"></div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <h1 className="text-center font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08] tracking-[-0.02em]">
          {trLines(tr, "3. Omat vahvuudet kotona")}
        </h1>
      </div>
    </div>
  );
}
// ----- Screen44: Vahvuuskarkkini kotona -----
// ============================================================
// Screen44 implementation
// ============================================================
// ============================================================
// Screen44 — Strength Candy at Home
// ============================================================

// ============================================================
// Screen44 — Strength Candy at Home
// ============================================================

function Screen44StrengthCandyHome({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();

  const [selectedStrengths, setSelectedStrengths] = useState<Record<number, string>>({});

  const selectedValues = Object.values(selectedStrengths).filter(Boolean);

  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      if (current[index] === value) return current;

      return {
        ...current,
        [index]: value,
      };
    });
  }, []);

  // Use the existing language-specific worksheet illustration.
  const sheetIllustration =
    language === "fi"
      ? "/illustrations/s29-lukiossa-sheet-fi.png"
      : language === "sv"
        ? "/illustrations/s29-lukiossa-sheet-sv.png"
        : "/illustrations/s29-lukiossa-sheet-en.png";

  // Screen44 uses the same worksheet artwork structure,
  // but the context label must represent "At home".
  const homeLabel = language === "fi" ? "KOTONA" : language === "sv" ? "HEMMA" : "AT HOME";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          grid
          min-h-[780px]
          w-full
          max-w-[1500px]
          grid-cols-1
          gap-12
          px-[6%]
          pb-24
          pt-8
          lg:grid-cols-[44%_56%]
        "
      >
        {/* =====================================================
            LEFT SIDE
        ====================================================== */}

        <div className="relative min-w-0 pt-4">
          {/* Main title */}

          <h1
            className="
              max-w-[520px]
              font-display
              text-[clamp(36px,3.2vw,52px)]
              font-semibold
              leading-[1.05]
              text-[#FFE77A]
            "
          >
            {tr("Täytä viikon aikana")}
          </h1>

          {/* Exercise title */}

          <h2
            className="
              mt-6
              max-w-[520px]
              font-display
              text-[clamp(30px,2.7vw,44px)]
              font-semibold
              leading-[1.08]
              text-white
            "
          >
            {tr("Vahvuuskarkkini")}
          </h2>

          {/* Strength selection instruction */}

          <p
            className="
              mt-7
              max-w-[440px]
              font-display
              text-[clamp(19px,1.5vw,25px)]
              font-semibold
              leading-[1.3]
              text-white
            "
          >
            {tr("Valitse 1–2 vahvuuskarkkia ja")} {tr("hyödynnä")} {tr("kotona")}.
          </p>

          <p
            className="
              mt-2
              max-w-[440px]
              font-display
              text-[clamp(18px,1.4vw,23px)]
              font-semibold
              leading-[1.3]
              text-white
            "
          >
            {tr("Kirjoita vahvuudet tähän")}
          </p>

          {/* Strength selectors */}

          <div
            className="
              mt-5
              grid
              max-w-[420px]
              gap-3
            "
          >
            <Screen42StrengthSelect
              index={0}
              fieldKey="screen_41_karkki_1"
              language={language}
              selectedValues={selectedValues}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />

            <Screen42StrengthSelect
              index={1}
              fieldKey="screen_41_karkki_2"
              language={language}
              selectedValues={selectedValues}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />
          </div>

          {/* Reflection instruction */}

          <p
            className="
              mt-12
              max-w-[440px]
              font-display
              text-[clamp(19px,1.55vw,25px)]
              font-semibold
              leading-[1.35]
              text-white
            "
          >
            {tr("Pohdi, mitä teit, koit ja opit.")}
          </p>

          <div
            className="
              mt-6
              grid
              max-w-[460px]
              grid-cols-[10px_minmax(0,1fr)]
              gap-x-4
            "
          >
            <span
              aria-hidden="true"
              className="
                mt-[10px]
                h-[8px]
                w-[8px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <p
              className="
                text-[clamp(18px,1.4vw,23px)]
                leading-[1.35]
                text-white
              "
            >
              {tr("Täydennä oheinen tehtävä.")}
            </p>
          </div>
        </div>

        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}

        <div
          className="
            relative
            flex
            min-h-[700px]
            min-w-0
            items-start
            justify-center
          "
        >
          <div
            className="
              relative
              h-[700px]
              w-[560px]
              max-w-full
              shrink-0
            "
          >
            {/* Existing worksheet illustration */}

            <img
              src={sheetIllustration}
              alt=""
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                z-0
                h-full
                w-full
                object-fill
                select-none
              "
            />

            {/* =================================================
                HOME LABEL OVERLAY

                The existing illustration contains the original
                school-context tab. This overlay changes only the
                context label without recreating the worksheet.
            ================================================== */}

            {/* =================================================
                TOP BOX — 3. WHAT DID YOU LEARN?
            ================================================== */}

            <div
              className="
                absolute
                left-[25.39%]
                top-[13.09%]
                z-20
                h-[18.95%]
                w-[50%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_41_opit"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* =================================================
                MIDDLE LEFT — 2. WHAT HAPPENED NEXT?
            ================================================== */}

            <div
              className="
                absolute
                left-[14.75%]
                top-[39.65%]
                z-20
                h-[18.65%]
                w-[33.59%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_41_seuraavaksi"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* =================================================
                MIDDLE RIGHT — 4. HOW WILL YOU USE IT?
            ================================================== */}

            <div
              className="
                absolute
                left-[51.86%]
                top-[39.65%]
                z-20
                h-[18.65%]
                w-[33.40%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_41_hyodynnat"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* =================================================
                BOTTOM BOX — 1. WHAT DID YOU DO?
            ================================================== */}

            <div
              className="
                absolute
                left-[24.71%]
                top-[69.73%]
                z-20
                h-[16.02%]
                w-[50.49%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_41_teit"
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen44(p: Props) {
  return <Screen44StrengthCandyHome {...p} />;
}

// ----- Screen45: Vahvuudet perheessä -----
function Screen45({ onSaveStateChange }: Props) {
  const tr = useTr();
  const notes = [
    {
      fieldKey: "screen_43_vahvuudet",
      label: "Minkälaisia vahvuuksia sinulla on perheenjäsenenä? Miten ne näkyvät?",
    },
    {
      fieldKey: "screen_43_parasta",
      label:
        "Mikä on parasta perheessäsi? Miten erilaiset vahvuudet näkyvät perheen vuorovaikutuksessa?",
    },
    {
      fieldKey: "screen_43_kiitollinen",
      label: "Mistä olet kiitollinen perheessäsi?",
    },
    {
      fieldKey: "screen_43_yhdessa",
      label: "Mitä tykkäätte tehdä yhdessä?",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div
        className="
          relative
          mx-auto
          min-h-[940px]
          w-full
          max-w-[1500px]
          overflow-hidden
          px-[5%]
          pb-28
          pt-10
        "
      >
        <div
          className="
            relative
            z-20
            flex
            min-h-[190px]
            items-start
            justify-between
            gap-10
          "
        >
          <div className="max-w-[560px] pt-10">
            <h1
              className="
                font-display
                text-[clamp(42px,4vw,66px)]
                font-semibold
                leading-[1.05]
                tracking-[0]
                text-white
              "
            >
              {tr("Vahvuudet perheessä")}
            </h1>

            <p
              className="
                mt-8
                font-display
                text-[clamp(24px,2vw,34px)]
                font-semibold
                leading-[1.15]
                text-white
              "
            >
              {tr("Täydennä laput.")}
            </p>
          </div>

          <img
            src="/illustrations/s45-mouse.png"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              mt-2
              h-auto
              w-[min(420px,30vw)]
              shrink-0
              object-contain
              select-none
            "
          />
        </div>

        <div
          className="
            relative
            z-20
            mt-8
            grid
            grid-cols-1
            gap-x-10
            gap-y-9
            lg:grid-cols-2
          "
        >
          {notes.map((note) => (
            <div
              key={note.fieldKey}
              className="
                relative
                z-20
                flex
                h-[320px]
                min-w-0
                flex-col
                px-2
                text-white
                lg:h-[330px]
              "
            >
              <p
                className="
                  relative
                  z-20
                  mx-auto
                  min-h-[54px]
                  max-w-[92%]
                  shrink-0
                  text-center
                  font-display
                  text-[clamp(17px,1.25vw,22px)]
                  font-semibold
                  leading-[1.18]
                  text-white
                "
              >
                {tr(note.label)}
              </p>

              <div
                className="
                  relative
                  z-10
                  mt-5
                  min-h-0
                  flex-1
                  overflow-hidden
                  rounded-[28px]
                  border-[5px]
                  border-black
                  bg-[#fffdf6]
                  shadow-[14px_14px_0_rgba(44,27,78,0.55)]

                  [&_label]:hidden

                  [&>div]:h-full
                  [&>div]:min-h-0

                  [&_div]:border-0
                  [&_div]:bg-transparent
                  [&_div]:p-0
                  [&_div]:shadow-none

                  [&_textarea]:h-full
                  [&_textarea]:min-h-0
                  [&_textarea]:w-full
                  [&_textarea]:resize-none
                  [&_textarea]:rounded-[24px]
                  [&_textarea]:border-0
                  [&_textarea]:bg-transparent
                  [&_textarea]:px-6
                  [&_textarea]:py-8
                  [&_textarea]:font-display
                  [&_textarea]:text-[16px]
                  [&_textarea]:leading-[32px]
                  [&_textarea]:text-[#241b3f]
                  [&_textarea]:outline-none
                  [&_textarea]:shadow-none
                  [&_textarea]:ring-0
                  [&_textarea]:placeholder:text-[#aaa1b5]

                  [&_textarea:focus]:outline-none
                  [&_textarea:focus]:ring-0
                "
              >
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    inset-x-0
                    inset-y-8
                    opacity-80
                    [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_30px,#ddd0ff_31px,#ddd0ff_32px)]
                  "
                />

                <div className="relative z-10 h-full">
                  <FlatReflectionTextarea
                    fieldKey={note.fieldKey}
                    rows={7}
                    minHeight={210}
                    textClass="text-[16px]"
                    onSaveStateChange={onSaveStateChange}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Screen46: Minä perheenjäsenenä -----
function Screen46({ onSaveStateChange }: Props) {
  const tr = useTr();

  return (
    <div
      className="
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        [scrollbar-gutter:stable]
      "
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 py-5">
        {/* Title */}
        <h1 className="font-display text-[46px] font-bold leading-tight text-[#FFE77A]">
          {tr("Minä perheenjäsenenä")}
        </h1>

        {/* Instruction */}
        <p className="mt-4 text-[26px] font-semibold leading-snug text-white">
          {tr(
            "Haastattele perheenjäseniä ja kerää tietoa omista vahvuuksistasi. Täydennä lauseet:",
          )}
        </p>

        {/* Two-column table */}
        <div className="mt-10 grid grid-cols-2 border-x border-white/80">
          {/* Left column */}
          <div className="border-r border-white/80">
            <div className="flex min-h-[82px] items-center justify-center border-b border-white/80 px-6">
              <h2 className="text-center text-[25px] font-semibold leading-tight text-white">
                {tr("Perheeni mielestä vahvuuksiani ovat")}
              </h2>
            </div>

            <div className="min-h-[430px] p-5">
              <ReflectionTextarea
                fieldKey="screen_46_perheeni_vahvuudet"
                label=""
                rows={15}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="flex min-h-[82px] items-center justify-center border-b border-white/80 px-6">
              <h2 className="max-w-[520px] text-center text-[25px] font-semibold leading-tight text-white">
                {tr("Perheenjäsenten vahvuuksia ovat minun mielestäni")}
              </h2>
            </div>

            <div className="min-h-[430px] p-5">
              <ReflectionTextarea
                fieldKey="screen_46_perheenjasenten_vahvuudet"
                label=""
                rows={15}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Screen47: Muistele ja kysy vanhemmilta -----
function Screen47({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const [selectedStrengths, setSelectedStrengths] = useState<Record<number, string>>({});
  const selectedValues = Object.values(selectedStrengths).filter(Boolean);

  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      if (current[index] === value) return current;
      return { ...current, [index]: value };
    });
  }, []);

  const notes = [
    {
      id: 1,
      question: "Mieti, millainen toiminta oli minulle tyypillistä lapsena?",
      position: "left-[0%] top-[3%] h-[205px] w-[29%] -rotate-[2deg]",
    },
    {
      id: 2,
      question: "Mikä oli minulle tärkeää?",
      position: "left-[35.5%] top-[0%] h-[205px] w-[29%] rotate-[1deg]",
    },
    {
      id: 3,
      question: "Mistä ammatista haaveilin?",
      position: "right-[0%] top-[3%] h-[205px] w-[29%] rotate-[2deg]",
    },
    {
      id: 4,
      question: "Mitä leikin mielelläni?",
      position: "left-[2%] top-[34%] h-[195px] w-[29%] rotate-[1deg]",
    },
    {
      id: 5,
      question: "Mitä rakastin tehdä, mihin uppouduin?",
      position: "left-[36%] top-[32%] h-[195px] w-[29%] -rotate-[1deg]",
    },
    {
      id: 6,
      question: "Millaisia vahvuuksia minulla oli lapsena?",
      position: "right-[0%] top-[34%] h-[195px] w-[29%] -rotate-[2deg]",
    },
    {
      id: 7,
      question: "Mikä myönteinen muisto sinulle on jäänyt erityisen vahvasti mieleen minusta?",
      position: "left-[18%] top-[64%] h-[190px] w-[29%] rotate-[1deg]",
    },
    {
      id: 8,
      question: "Mitä samoja vahvuuksia minulla on nykyään?",
      position: "right-[18%] top-[64%] h-[190px] w-[29%] -rotate-[1deg]",
    },
  ];

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        px-[3%]
        pb-16
        pt-6
        text-white
      "
    >
      <div className="grid min-h-[760px] grid-cols-[0.25fr_0.75fr] gap-7">
        {/* CỘT TRÁI */}
        <div className="relative min-w-0">
          <h1
            className="
              max-w-[300px]
              font-display
              text-[43px]
              font-medium
              leading-[1.12]
              tracking-[-0.01em]
            "
          >
            {tr("Muistele ja kysy vanhemmilta")}
          </h1>
          <img
            src="/illustrations/illustration-screen42-4.png"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              top-[260px]
              left-[-62px]
              h-[470px]
              w-auto
              max-w-none
              select-none
              object-contain
              drop-shadow-[0_12px_18px_rgba(0,0,0,0.22)]
            "
          />
        </div>

        {/* CỘT PHẢI */}
        <div className="relative min-h-[760px] min-w-0">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`
                absolute
                flex
                flex-col
                overflow-visible
                rounded-[18px_14px_24px_16px]
                border-[3px]
                border-black
                bg-[#fffefa]
                px-5
                pb-4
                pt-4
                text-black
                shadow-[0_10px_0_#4b326c]
                transition-all
                duration-200

                hover:z-30
                hover:-translate-y-1
                hover:scale-[1.02]

                focus-within:z-40
                focus-within:ring-2
                focus-within:ring-[#d5c2ef]

                ${note.position}
              `}
            >
              {/* CÂU HỎI */}
              <p
                className="
                  mb-3
                  min-h-[38px]
                  shrink-0
                  text-center
                  font-display
                  text-[15px]
                  font-medium
                  leading-[1.2]
                  text-black
                "
              >
                {tr(note.question)}
              </p>

              <div className="flex flex-1 items-center">
                <Screen47StrengthSelect
                  index={note.id - 1}
                  fieldKey={`screen_45_vanhemmat_${note.id}`}
                  language={language}
                  selectedValues={selectedValues}
                  onValueChange={updateStrength}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screen47StrengthSelect({
  index,
  fieldKey,
  language,
  selectedValues,
  onValueChange,
  onSaveStateChange,
}: {
  index: number;
  fieldKey: string;
  language: "fi" | "sv" | "en";
  selectedValues: string[];
  onValueChange: (index: number, value: string) => void;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [initialValueWasValid, setInitialValueWasValid] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadResponse<string>(fieldKey);
      if (cancelled) return;
      const savedNumber = Number(saved);
      const isValidSavedStrength =
        typeof saved === "string" &&
        Number.isInteger(savedNumber) &&
        savedNumber >= 1 &&
        savedNumber <= 26;
      if (isValidSavedStrength) {
        setValue(saved);
        setInitialValueWasValid(true);
        onValueChange(index, saved);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldKey, index, onValueChange]);

  const state = useAutosave(fieldKey, value, {
    enabled: loaded && (dirty || initialValueWasValid),
  });

  useEffect(() => {
    onSaveStateChange?.(state);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (loaded) report(fieldKey, value.trim().length > 0);
  }, [fieldKey, loaded, report, value]);

  function handleChange(nextValue: string) {
    setDirty(true);
    setValue(nextValue);
    onValueChange(index, nextValue);
  }

  const selectedStrengthNumber = Number(value);
  const hasSelectedStrength =
    Number.isInteger(selectedStrengthNumber) &&
    selectedStrengthNumber >= 1 &&
    selectedStrengthNumber <= 26;

  return (
    <div className="relative w-full">
      {hasSelectedStrength && (
        <span
          className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/20"
          style={{ backgroundColor: getStrengthColor(selectedStrengthNumber) }}
        />
      )}
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        aria-label={tr("Valitse vahvuus")}
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 pr-10 font-display text-sm font-bold text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--purple-dark)] focus:ring-2 focus:ring-[#d5c2ef]",
          hasSelectedStrength && "pl-10",
        )}
      >
        <option value="">{tr("Valitse vahvuus")}</option>
        {Array.from({ length: 26 }).map((_, strengthIndex) => {
          const strengthNumber = strengthIndex + 1;
          const optionValue = String(strengthNumber);
          const alreadyUsed = selectedValues.includes(optionValue) && optionValue !== value;
          return (
            <option key={strengthNumber} value={optionValue} disabled={alreadyUsed}>
              {getStrengthName(strengthNumber, language)}
            </option>
          );
        })}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[color:var(--purple-dark)]">
        ▼
      </span>
    </div>
  );
}
// ----- Screen48: Vahvuuskirje vanhemmalta — informational -----
function Screen48({ onSaveStateChange }: Props) {
  const tr = useTr();

  const boxClass = `
    min-h-[74px]
    overflow-hidden
    rounded-[26px]
    border-[4px]
    border-black
    bg-[#fffdf6]
    shadow-[8px_9px_0_rgba(48,31,88,0.42)]

    [&_label]:hidden

    [&>div]:h-full
    [&>div]:min-h-0

    [&>div]:border-0
    [&>div]:bg-transparent
    [&>div]:p-0
    [&>div]:shadow-none

    [&_textarea]:w-full
    [&_textarea]:resize-none
    [&_textarea]:rounded-[22px]
    [&_textarea]:border-0
    [&_textarea]:bg-transparent
    [&_textarea]:px-5
    [&_textarea]:py-4
    [&_textarea]:text-[16px]
    [&_textarea]:font-normal
    [&_textarea]:leading-[28px]
    [&_textarea]:tracking-[0]
    [&_textarea]:text-[#241b3f]
    [&_textarea]:outline-none
    [&_textarea]:shadow-none
    [&_textarea]:ring-0

    [&_textarea:focus]:outline-none
    [&_textarea:focus]:ring-0
  `;
  const labelClass =
    "font-display text-[clamp(18px,1.35vw,23px)] font-semibold leading-[1.25] tracking-[0] text-white";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-y-auto
        px-[5%]
        pb-20
        pt-7
        text-white
        [scrollbar-gutter:stable]
      "
    >
      <div className="mx-auto w-full max-w-[1220px]">
        {/* PAGE HEADING */}
        <p
          className="
            text-center
            font-display
            text-[25px]
            font-medium
            leading-[1.18]
            tracking-[0]
            text-white
          "
        >
          {tr("Pyydä vanhempaasi täydentämään!")}
        </p>

        {/* MAIN TITLE */}
        <h1
          className="
            mt-7
            font-display
            text-[clamp(34px,3vw,50px)]
            font-semibold
            leading-[1.08]
            tracking-[0]
            text-[#FFE77A]
          "
        >
          {tr("Kirjoita vahvuuskirje nuorellesi:")}
        </h1>

        {/* FORM */}
        <div className="mt-8 space-y-6">
          {/* HEI */}
          <div>
            <p className={labelClass}>{tr("Hei")}</p>

            <div className={`mt-2 ${boxClass}`}>
              <ReflectionTextarea
                fieldKey="screen_48_hei"
                label=""
                rows={2}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>

          {/* VAHVUUDET */}
          <div>
            <p className={labelClass}>{tr("Sinun vahvuuksiasi ovat")}</p>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_vahvuus_1"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
              <span className="font-display text-[20px] font-semibold leading-none text-white">
                ,
              </span>
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_vahvuus_2"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
              <span className="font-display text-[20px] font-semibold leading-none text-white">
                {tr("ja")}
              </span>
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_vahvuus_3"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </div>

          {/* KÄYTÄT NIITÄ */}
          <div>
            <p className={labelClass}>{tr("Olen huomannut, että käytät niitä, kun")}</p>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_kaytat_1"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
              <span className="font-display text-[20px] font-semibold leading-none text-white">
                {tr("ja")}
              </span>
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_kaytat_2"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </div>

          {/* ARVOSTAN */}
          <div>
            <p className={labelClass}>{tr("Arvostan sinussa erityisesti")}</p>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_arvostan_1"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
              <span className="font-display text-[20px] font-semibold leading-none text-white">
                {tr("ja")}
              </span>
              <div className={boxClass}>
                <ReflectionTextarea
                  fieldKey="screen_48_arvostan_2"
                  label=""
                  rows={2}
                  onSaveStateChange={onSaveStateChange}
                />
              </div>
            </div>
          </div>

          {/* KOTONA */}
          <div>
            <p className={labelClass}>{tr("Kun käytät vahvuuksiasi kotona, se vaikuttaa")}</p>

            <div className={`mt-2 ${boxClass}`}>
              <ReflectionTextarea
                fieldKey="screen_48_kotona"
                label=""
                rows={3}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>

          {/* OPETTANUT */}
          <div>
            <p className={labelClass}>{tr("Olet opettanut minulle erityisesti")}</p>

            <div className={`mt-2 ${boxClass}`}>
              <ReflectionTextarea
                fieldKey="screen_48_opettanut"
                label=""
                rows={3}
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            <p className="mt-2 text-right font-display text-[18px] font-semibold leading-[1.2] tracking-[0] text-white">
              {tr("käytöstä.")}
            </p>
          </div>

          {/* TULEVAISUUS */}
          <div>
            <p className={labelClass}>
              {tr("Kun käytät vahvuuksiasi, näen sinut tulevaisuudessa")}
            </p>

            <div className={`mt-2 ${boxClass}`}>
              <ReflectionTextarea
                fieldKey="screen_48_tulevaisuus"
                label=""
                rows={4}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>

          {/* FINAL TEXT */}
          <p className="pt-1 font-display text-[22px] font-semibold leading-[1.2] tracking-[0] text-white">
            {tr("Anna vahvuuksiesi loistaa.")}
          </p>

          {/* SIGNATURE */}
          <div>
            <p className={labelClass}>{tr("Rakkain terveisin,")}</p>

            <div className={`mt-2 ${boxClass}`}>
              <ReflectionTextarea
                fieldKey="screen_48_terveisin"
                label=""
                rows={2}
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- S46 (PDF p52): Moduuli 4 title card -----
function Screen49() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden text-white">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <h1 className="font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08] tracking-[0]">
          {trLines(tr, "4. Omat vahvuudet vapaa-ajalla ja harrastuksissa")}
        </h1>
      </div>
    </div>
  );
}

// ----- Screen50 (PDF p53): Vahvuuskarkkini vapaa-ajalla -----
// ============================================================
// Screen50 — Strength Candy in Free Time
// ============================================================

function Screen50({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();

  const [selectedStrengths, setSelectedStrengths] = useState<Record<number, string>>({});

  const [images, setImages] = useState<Array<string | null>>([null, null, null, null]);

  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const selectedValues = Object.values(selectedStrengths).filter(Boolean);

  // Keep both strength selectors synchronized.
  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      if (current[index] === value) return current;

      return {
        ...current,
        [index]: value,
      };
    });
  }, []);

  // Read a selected image from the user's device.
  function loadImage(index: number, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      setImages((current) => {
        const next = [...current];
        next[index] = reader.result as string;
        return next;
      });
    };

    reader.readAsDataURL(file);
  }

  // Remove an image from one slot.
  function removeImage(index: number) {
    setImages((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });

    const input = imageInputRefs.current[index];

    if (input) {
      input.value = "";
    }
  }

  const selectedImageCount = images.filter(Boolean).length;

  // Use the existing language-specific worksheet illustration.
  const sheetIllustration =
    language === "fi"
      ? "/illustrations/s29-lukiossa-sheet-fi.png"
      : language === "sv"
        ? "/illustrations/s29-lukiossa-sheet-sv.png"
        : "/illustrations/s29-lukiossa-sheet-en.png";

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        w-full
        overflow-x-hidden
        overflow-y-auto
        text-white
        [scrollbar-gutter:stable]
      "
    >
      {/* =====================================================
          MAIN WORKSHEET
      ====================================================== */}

      <section
        className="
          relative
          mx-auto
          grid
          min-h-[780px]
          w-full
          max-w-[1500px]
          grid-cols-1
          gap-12
          px-[6%]
          pb-20
          pt-8
          lg:grid-cols-[44%_56%]
        "
      >
        {/* ===================================================
            LEFT SIDE
        ==================================================== */}

        <div className="relative min-w-0 pt-6">
          <h1
            className="
              max-w-[520px]
              font-display
              text-[clamp(36px,3.2vw,54px)]
              font-semibold
              leading-[1.05]
              text-[#FFE77A]
            "
          >
            {tr("Vahvuuskarkkini")}
          </h1>

          <p
            className="
              mt-8
              max-w-[430px]
              font-display
              text-[clamp(20px,1.55vw,27px)]
              font-semibold
              leading-[1.25]
              text-white
            "
          >
            {tr("Valitse 1–2 vahvuuskarkkia ja")} {tr("hyödynnä")} {tr("vapaa-ajalla")}.
          </p>

          <p
            className="
              mt-2
              max-w-[430px]
              font-display
              text-[clamp(18px,1.4vw,24px)]
              font-semibold
              text-white
            "
          >
            {tr("Kirjoita vahvuudet tähän")}
          </p>

          {/* =================================================
              TWO STRENGTH SELECTORS
          ================================================== */}

          <div
            className="
              mt-5
              grid
              max-w-[420px]
              gap-3
            "
          >
            <Screen42StrengthSelect
              index={0}
              fieldKey="screen_48_karkki_1"
              language={language}
              selectedValues={selectedValues}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />

            <Screen42StrengthSelect
              index={1}
              fieldKey="screen_48_karkki_2"
              language={language}
              selectedValues={selectedValues}
              onValueChange={updateStrength}
              onSaveStateChange={onSaveStateChange}
            />
          </div>

          {/* =================================================
              SCROLL NOTICE
          ================================================== */}

          <div
            className="
              mt-7
              flex
              max-w-[460px]
              items-center
              gap-4
              rounded-[18px]
              border-2
              border-black
              bg-[#FFE77A]
              px-5
              py-4
              text-[#241b3f]
              shadow-[0_5px_0_rgba(0,0,0,0.15)]
            "
          >
            <span
              aria-hidden="true"
              className="
                inline-flex
                shrink-0
                animate-bounce
                font-display
                text-[32px]
                font-bold
                leading-none
              "
            >
              ↓
            </span>

            <p
              className="
                font-display
                text-[15px]
                font-semibold
                leading-[1.3]
              "
            >
              {tr("Vieritä alaspäin – lisää 4 kuvaa ja tee niistä yksi kuvakollaasi.")}
            </p>
          </div>

          <p
            className="
              mt-9
              max-w-[440px]
              font-display
              text-[clamp(19px,1.6vw,26px)]
              font-semibold
              leading-[1.35]
              text-white
            "
          >
            {tr("Pohdi, mitä teit, koit ja opit.")}
          </p>

          <div
            className="
              mt-6
              grid
              max-w-[460px]
              grid-cols-[10px_minmax(0,1fr)]
              gap-x-4
            "
          >
            <span
              aria-hidden="true"
              className="
                mt-[10px]
                h-[8px]
                w-[8px]
                rounded-full
                bg-[#ffc936]
              "
            />

            <p
              className="
                text-[clamp(18px,1.45vw,24px)]
                leading-[1.35]
                text-white
              "
            >
              {tr("Täydennä oheinen tehtävä.")}
            </p>
          </div>
        </div>

        {/* ===================================================
            RIGHT SIDE
        ==================================================== */}

        <div
          className="
            relative
            flex
            min-h-[700px]
            min-w-0
            items-start
            justify-center
          "
        >
          <div
            className="
              relative
              h-[700px]
              w-[560px]
              max-w-full
              shrink-0
            "
          >
            {/* Existing worksheet illustration */}

            <img
              src={sheetIllustration}
              alt=""
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                z-0
                h-full
                w-full
                object-fill
                select-none
              "
            />

            {/* Top box — What did you learn? */}

            <div
              className="
                absolute
                left-[25.39%]
                top-[13.09%]
                z-20
                h-[18.95%]
                w-[50%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_48_opit"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* Middle left box — What happened next? */}

            <div
              className="
                absolute
                left-[14.75%]
                top-[39.65%]
                z-20
                h-[18.65%]
                w-[33.59%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_48_seuraavaksi"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* Middle right box — How will you use it? */}

            <div
              className="
                absolute
                left-[51.86%]
                top-[39.65%]
                z-20
                h-[18.65%]
                w-[33.40%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_48_hyodynnat"
                onSaveStateChange={onSaveStateChange}
              />
            </div>

            {/* Bottom box — What did you do? */}

            <div
              className="
                absolute
                left-[24.71%]
                top-[69.73%]
                z-20
                h-[16.02%]
                w-[50.49%]
              "
            >
              <VahvuuskarkkiOverlayInput
                fieldKey="screen_48_teit"
                onSaveStateChange={onSaveStateChange}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SCROLL TRANSITION
      ====================================================== */}

      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[1380px]
          items-center
          gap-5
          px-[6%]
          py-6
        "
      >
        <div className="h-px flex-1 bg-white/30" />

        <div
          className="
            flex
            items-center
            gap-3
            rounded-full
            bg-[#FFE77A]
            px-6
            py-3
            font-display
            text-[15px]
            font-semibold
            text-[#241b3f]
          "
        >
          <span aria-hidden="true">↓</span>

          {tr("Lisää kuvasi alle")}

          <span aria-hidden="true">↓</span>
        </div>

        <div className="h-px flex-1 bg-white/30" />
      </div>

      {/* =====================================================
          FOUR-PHOTO ACTIVITY
      ====================================================== */}

      <section
        className="
          mx-auto
          w-full
          max-w-[1380px]
          px-[6%]
          pb-32
          pt-8
        "
      >
        <div className="max-w-[900px]">
          <h2
            className="
              font-display
              text-[clamp(32px,2.8vw,46px)]
              font-semibold
              leading-[1.08]
              text-[#FFE77A]
            "
          >
            {tr("Lisää 4 kuvaa vapaa-ajastasi")}
          </h2>

          <p
            className="
              mt-3
              max-w-[760px]
              font-display
              text-[clamp(17px,1.35vw,22px)]
              leading-[1.4]
              text-white
            "
          >
            {tr("Vedä kuvat paikoilleen tai valitse ne omista tiedostoistasi.")}
          </p>
        </div>

        <div
          className="
            mt-8
            grid
            grid-cols-1
            gap-12
            lg:grid-cols-[1fr_1fr]
          "
        >
          {/* =================================================
              FOUR IMAGE SLOTS
          ================================================== */}

          <div
            className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
            "
          >
            {images.map((image, index) => (
              <div
                key={index}
                className="
                  relative
                  aspect-[4/3]
                  min-w-0
                "
              >
                <input
                  ref={(element) => {
                    imageInputRefs.current[index] = element;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    loadImage(index, event.target.files?.[0]);
                  }}
                />

                <button
                  type="button"
                  onClick={() => imageInputRefs.current[index]?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();

                    loadImage(index, event.dataTransfer.files?.[0]);
                  }}
                  className="
                    group
                    relative
                    flex
                    h-full
                    w-full
                    overflow-hidden
                    rounded-[24px]
                    border-[3px]
                    border-dashed
                    border-white
                    bg-white/10
                    text-white
                    transition
                    duration-200

                    hover:-translate-y-1
                    hover:bg-white/15

                    focus-visible:outline-none
                    focus-visible:ring-4
                    focus-visible:ring-[#FFE77A]/60
                  "
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        w-full
                        flex-col
                        items-center
                        justify-center
                        px-5
                        text-center
                      "
                    >
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-full
                          bg-[#FFE77A]
                          font-display
                          text-[27px]
                          font-semibold
                          text-[#241b3f]
                          shadow-[0_4px_0_rgba(0,0,0,0.15)]
                        "
                      >
                        +
                      </div>

                      <div
                        className="
                          mt-4
                          font-display
                          text-[17px]
                          font-semibold
                          text-white
                        "
                      >
                        {tr("Lisää kuva")} {index + 1}
                      </div>

                      <div
                        className="
                          mt-2
                          max-w-[190px]
                          text-[13px]
                          leading-[1.35]
                          text-white/75
                        "
                      >
                        {tr("Vedä kuva tähän tai valitse tiedosto")}
                      </div>
                    </div>
                  )}

                  <div
                    className="
                      absolute
                      left-3
                      top-3
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      border-black
                      bg-[#FFE77A]
                      font-display
                      text-[14px]
                      font-semibold
                      text-[#241b3f]
                    "
                  >
                    {index + 1}
                  </div>

                  {image && (
                    <div
                      className="
                        absolute
                        inset-x-0
                        bottom-0
                        bg-black/55
                        px-3
                        py-2.5
                        text-center
                        font-display
                        text-[13px]
                        font-semibold
                        text-white
                        opacity-0
                        transition
                        group-hover:opacity-100
                      "
                    >
                      {tr("Vaihda kuva")}
                    </div>
                  )}
                </button>

                {image && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={tr("Poista kuva")}
                    className="
                      absolute
                      right-3
                      top-3
                      z-30
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      border-black
                      bg-[#ef706e]
                      font-display
                      text-[18px]
                      font-semibold
                      leading-none
                      text-white
                      shadow-md
                      transition

                      hover:scale-110
                    "
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* =================================================
              COLLAGE / MASH-UP PREVIEW
          ================================================== */}

          <div
            className="
              flex
              min-w-0
              flex-col
            "
          >
            <div
              className="
                flex
                items-end
                justify-between
                gap-4
              "
            >
              <h3
                className="
                  font-display
                  text-[clamp(26px,2.2vw,36px)]
                  font-semibold
                  text-white
                "
              >
                {tr("Kuvakollaasi")}
              </h3>

              <span
                className="
                  font-display
                  text-[15px]
                  font-semibold
                  text-[#FFE77A]
                "
              >
                {selectedImageCount} / 4
              </span>
            </div>

            <p
              className="
                mt-2
                max-w-[560px]
                text-[14px]
                leading-[1.4]
                text-white/75
              "
            >
              {tr("Kuvasi yhdistyvät tähän yhdeksi kollaasiksi.")}
            </p>

            <div
              className="
                mt-5
                aspect-square
                w-full
                max-w-[560px]
                overflow-hidden
                rounded-[30px]
                border-[4px]
                border-black
                bg-[#fffdf8]
                p-3
                shadow-[0_9px_0_rgba(36,27,63,0.28)]
              "
            >
              <div
                className="
                  grid
                  h-full
                  w-full
                  grid-cols-2
                  grid-rows-2
                  gap-2
                  overflow-hidden
                  rounded-[20px]
                "
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="
                      relative
                      flex
                      min-h-0
                      min-w-0
                      items-center
                      justify-center
                      overflow-hidden
                      bg-[#eee8f5]
                    "
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-full
                          w-full
                          items-center
                          justify-center
                          font-display
                          text-[42px]
                          font-semibold
                          text-[#7654ad]/25
                        "
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedImageCount === 4 && (
              <div
                className="
                  mt-5
                  max-w-[560px]
                  rounded-[16px]
                  bg-[#acd8b1]
                  px-5
                  py-3
                  text-center
                  font-display
                  text-[15px]
                  font-semibold
                  text-[#241b3f]
                "
              >
                {tr("Kuvakollaasi on valmis!")}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdventureWorkbookPage({
  title,
  kicker,
  intro,
  children,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  intro?: ReactNode;
  accent?: "yellow" | "coral" | "mint" | "purple";
  children: ReactNode;
}) {
  return (
    <div className="relative h-full min-h-0 w-full overflow-y-auto px-[4%] pb-20 pt-8 text-white [scrollbar-gutter:stable]">
      <div className="relative mx-auto min-h-[760px] w-full max-w-[1320px]">
        <header className="max-w-[980px]">
          {kicker && (
            <div className="mb-3 inline-flex rounded-full border-2 border-black bg-[#FFE77A] px-4 py-1 font-display text-[14px] font-semibold leading-none tracking-[0] text-[#2a194c] shadow-[0_4px_0_rgba(0,0,0,0.28)]">
              {kicker}
            </div>
          )}
          <h1 className="font-display text-[clamp(36px,4vw,66px)] font-semibold leading-[1.05] tracking-[0] text-[#FFE77A]">
            {title}
          </h1>
          {intro && (
            <p className="mt-5 max-w-[900px] text-[clamp(17px,1.25vw,22px)] font-semibold leading-[1.42] tracking-[0] text-white">
              {intro}
            </p>
          )}
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function WorkbookTextBox({
  fieldKey,
  label,
  rows = 4,
  onSaveStateChange,
}: {
  fieldKey: string;
  label: ReactNode;
  rows?: number;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 min-h-[44px] font-display text-[clamp(16px,1.1vw,20px)] font-semibold leading-[1.22] tracking-[0] text-white">
        {label}
      </div>
      <div
        className="
          overflow-hidden
          rounded-[24px]
          border-[4px]
          border-black
          bg-[#fffdf6]
          shadow-[7px_8px_0_rgba(48,31,88,0.45)]
          [&_label]:hidden
          [&>div]:border-0
          [&>div]:bg-transparent
          [&>div]:p-0
          [&>div]:shadow-none
          [&_textarea]:rounded-[20px]
          [&_textarea]:border-0
          [&_textarea]:bg-transparent
          [&_textarea]:px-5
          [&_textarea]:py-4
          [&_textarea]:text-[16px]
          [&_textarea]:leading-[28px]
          [&_textarea]:tracking-[0]
          [&_textarea]:text-[#241b3f]
          [&_textarea]:outline-none
          [&_textarea]:ring-0
        "
      >
        <ReflectionTextarea
          fieldKey={fieldKey}
          label=""
          rows={rows}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </div>
  );
}

function WorkbookInfoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[clamp(17px,1.25vw,22px)] font-semibold leading-[1.48] tracking-[0] text-white">
      {children}
    </div>
  );
}

// ----- S48 (PDF p54): Minä vapaa-ajalla -----
function Screen51({ onSaveStateChange }: Props) {
  const tr = useTr();
  const cols = [
    { k: "screen_49_tykkaat", q: "Mitä tykkäät tehdä vapaa-ajalla?" },
    { k: "screen_49_harrastukset", q: "Mitä harrastuksia sinulla on?" },
    {
      k: "screen_49_vahvuudet",
      q: "Mitä vahvuuksia tunnistat itsessäsi vapaa-ajalla ja harrastuksissa?",
    },
    { k: "screen_49_enemman", q: "Mitä vahvuuksiasi haluaisit hyödyntää enemmän vapaa-ajallasi?" },
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Minä vapaa-ajalla")}
      intro={tr(
        "Kirjoita itsellesi muistiin mitä teet vapaa-ajallasi ja millaisia vahvuuksia hyödynnät.",
      )}
      accent="yellow"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {cols.map((c) => (
          <WorkbookTextBox
            key={c.k}
            fieldKey={c.k}
            label={tr(c.q)}
            rows={4}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S49 (PDF p55): Love to-do -lista 1/3 — informational -----
// FIX: h1 "Love to-do -lista 1/3" giờ qua tr()
function Screen52() {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Love to-do -lista 1/3")} accent="mint">
      <WorkbookInfoPanel>
        <p>
          {tr(
            "Mitkä asiat päätyvät sinun love-to-do listalle? Tee lista viidestä asiasta, joita rakastat tehdä vapaa-ajalla.",
          )}
        </p>
        <p className="mt-4">
          {tr("Mieti seuraavaksi, kuinka vahvuutesi liittyvät näihin tekemisiin.")}
        </p>
        <p className="mt-5 text-[0.9em] italic opacity-80">
          {tr(
            "Ps. Todennäköisesti harrastukset ja tekemiset, joista pidät eniten, ovat myös tyydyttäviä, koska ne tarjoavat sinulle mahdollisuuden hyödyntää vahvuuksiasi.",
          )}
        </p>
        <p className="mt-5 font-display text-[1.05em] text-[#FFE77A]">
          {tr("→ Love to-do -lista seuraavalla sivulla.")}
        </p>
      </WorkbookInfoPanel>
    </AdventureWorkbookPage>
  );
}

// ----- S50 (PDF p56): Love to-do -lista 2/3 — 5 inputs -----
// FIX: h1 "Love to-do -lista" giờ qua tr()
function Screen53({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={tr("Love to-do -lista 2/3")}
      intro={tr(
        "Kirjoita viisi asiaa, joita rakastat tehdä vapaa-ajallasi. Merkkaa sydämiin miten paljon teet kyseistä asiaa.",
      )}
      accent="coral"
    >
      <div className="grid max-w-[1050px] gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[42px_minmax(0,1fr)_minmax(170px,auto)] items-center gap-4"
          >
            <div className="font-display text-[28px] font-semibold leading-none text-white">
              {i + 1}.
            </div>
            <ReflectionInput
              fieldKey={`screen_51_love_${i + 1}`}
              prefix=""
              placeholder={tr("Asia, jota rakastan tehdä…")}
              onSaveStateChange={onSaveStateChange}
            />
            <div
              className="flex items-center gap-2 font-display text-[28px] leading-none text-[#ff7c7a]"
              aria-hidden="true"
            >
              <span>♡</span>
              <span>♡</span>
              <span>♡</span>
              <span>♡</span>
              <span>♡</span>
            </div>
          </div>
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S51 (PDF p57): Love to-do -lista 3/3 -----
// FIX: h1 "Love to-do -lista" giờ qua tr()
function Screen54({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Love to-do -lista 3/3")} accent="mint">
      <div className="grid gap-6">
        <WorkbookTextBox
          fieldKey="screen_52_konkreettisesti"
          label={tr(
            "Kuvittele, että voisit tehdä eniten rakastamaasi asiaa enemmän — miltä se konkreettisesti tuntuisi? Mihin haluaisit käyttää enemmän aikaa?",
          )}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_52_vahvuudet"
          label={tr(
            "Kirjoita mitä vahvuuksiasi hyödynnät tehdessäsi rakastamiasi asioita vapaa-ajalla!",
          )}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S52 (PDF p58): Kuvakollaasi 1/2 — informational -----
// FIX: h1 "Kuvakollaasi 1/2" giờ qua tr()
function Screen55() {
  const tr = useTr();
  const bullets = [
    "Kerää kollaasi asioista / tavaroista, jotka ovat sinulle tärkeitä, joista olet kiinnostunut ja joissa voit hyödyntää vahvuuksiasi. Esimerkiksi koripallo, kirja, tietokone ja kissa.",
    "Tee näistä kollaasi ja ota siitä kuva.",
    "Esitelkää kuvat ryhmässä. Tutustukaa toistenne vahvuuksiin vapaa-ajalla.",
    "Mitkä tavarat tai tekemiset valitsit kuvaasi? Miksi?",
    "Kirjoita, mitä vahvuuksiasi kiinnostuksen kohteesi ovat kehittäneet? Miten?",
    "Mitä uusia taitoja olet oppinut kiinnostuksen kohteiden parissa?",
    "Käykää ystävän kanssa syvempi keskustelu vahvuuksien ja kiinnostuksen kohteiden välisestä yhteydestä.",
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Kuvakollaasi 1/2")}
      intro={tr("Mitkä asiat sinua kiinnostavat vapaa-ajalla? Miksi?")}
      accent="yellow"
    >
      <WorkbookInfoPanel>
        <ul className="grid gap-3">
          {bullets.map((b) => (
            <li key={b} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
              <span className="mt-[10px] h-2 w-2 rounded-full bg-[#FFE77A]" aria-hidden="true" />
              <span>{tr(b)}</span>
            </li>
          ))}
        </ul>
      </WorkbookInfoPanel>
    </AdventureWorkbookPage>
  );
}

// ----- S53 (PDF p59): Kuvakollaasi 2/2 -----
// FIX: h1 "Kuvakollaasi 2/2" giờ qua tr()
function Screen56({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={tr("Kuvakollaasi 2/2")}
      intro={tr("Jutelkaa ystävien kanssa vahvuuksistanne ja kiinnostuksen kohteistanne!")}
      accent="coral"
    >
      <div className="grid gap-6">
        <WorkbookTextBox
          fieldKey="screen_54_valitsin"
          label={tr("Mitä valitsin kuvaani ja miksi?")}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_54_kehittaneet"
          label={tr("Mitä vahvuuksia kiinnostuksen kohteeni ovat kehittäneet ja miten?")}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_54_uudet"
          label={tr("Mitä uusia taitoja olet oppinut kiinnostuksen kohteiden parissa?")}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S54 (PDF p60): Moduuli 5 title card -----
function Screen57() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden text-white">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <h1 className="font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08] tracking-[0]">
          {trLines(tr, "5. Omat vahvuudet ystävyyssuhteissa")}
        </h1>
      </div>
    </div>
  );
}

// ----- Screen58 (PDF p61): Vahvuuskarkkini ystävyyssuhteissa -----
function Screen58(p: Props) {
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
// FIX: h1 "Minä ystävänä" giờ qua tr()
function Screen59({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={tr("Minä ystävänä")}
      intro={tr(
        "Haastattele ystäviäsi. Pyydä heitä kertomaan tai lähettämään viesti. Täydennä lauseet:",
      )}
      accent="mint"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <WorkbookTextBox
          fieldKey="screen_57_ystavien"
          label={tr("Ystävieni mielestä vahvuuksiani ovat")}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_57_parasta"
          label={tr("Parasta ystävissäni on")}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S57 (PDF p63): Vahvuuspalaute ystäviltä -----
// FIX: h1 "Vahvuuspalaute ystäviltä" giờ qua tr()
function Screen60({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={tr("Vahvuuspalaute ystäviltä")}
      intro={tr(
        "Kirjoita palautetta ja kehuja ystäviesi kesken. Kerätkää yhdessä 2–4 ystävältä palautetta vahvuuksistanne. Käytä sivua 11 pohjana. Nimetkää ne vahvuudet, joita toisissanne arvostatte. Kertokaa myös, missä toisen vahvuudet erityisesti näkyvät ja miten positiivisesti ne vaikuttavat ystävyyssuhteissa.",
      )}
      accent="yellow"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <WorkbookTextBox
          fieldKey="screen_58_uutta"
          label={tr("Mitä uutta opin palautteista?")}
          rows={3}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_58_tarkeaa"
          label={tr("Mikä palautteessa on minulle tärkeää?")}
          rows={3}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_58_muistavat"
          label={tr("Millaisista asioista ystäväni muistavat minut parhaiten?")}
          rows={3}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_58_parasta"
          label={tr("Mikä on parasta ystävissäni?")}
          rows={3}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S58 (PDF p64): Moduuli 6 title card -----
function Screen61() {
  const tr = useTr();
  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden text-white">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <h1 className="font-display text-[clamp(48px,5vw,78px)] font-semibold leading-[1.08] tracking-[0]">
          {trLines(tr, "6. Vahvuusportfolion kokoaminen")}
        </h1>
      </div>
    </div>
  );
}

// ----- S59 (PDF p65): Vahvuuksien yhteenveto -----
// FIX: h1 "Vahvuuksien yhteenveto" giờ qua tr()
function Screen62({ onSaveStateChange }: Props) {
  const tr = useTr();
  const cols = [
    { k: "screen_60_koulusta", label: "Koulusta" },
    { k: "screen_60_perheelta", label: "Perheeltä" },
    { k: "screen_60_vapaa_ajalta", label: "Vapaa-ajalta" },
    { k: "screen_60_ystavilta", label: "Ystäviltä" },
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Vahvuuksien yhteenveto")}
      intro={tr(
        "Kokoa saamasi palautteet. Kirjoita ylös vahvuudet joita sinussa on huomattu eri ympäristöissä.",
      )}
      accent="coral"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {cols.map((c) => (
          <WorkbookTextBox
            key={c.k}
            fieldKey={c.k}
            label={tr(c.label)}
            rows={5}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S60 (PDF p66): Pohdi ja hyödynnä saamaasi palautetta -----
// FIX: h1 giờ qua tr()
function Screen63({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    { k: "screen_61_samaa", q: "Mitä samaa niissä on?" },
    { k: "screen_61_huomataan", q: "Mitä vahvuuksia sinussa huomataan?" },
    { k: "screen_61_ilahdutti", q: "Mikä palautteissa ilahdutti?" },
    { k: "screen_61_yllatti", q: "Mikä palautteissa yllätti?" },
    { k: "screen_61_muistaa", q: "Mitä haluat muistaa palautteista?" },
    { k: "screen_61_eroavat", q: "Miten ne eroavat?" },
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Pohdi ja hyödynnä saamaasi palautetta")}
      intro={tr("Tutustu muilta saamiisi palautteisiin.")}
      accent="mint"
    >
      <div className="grid gap-6">
        {qs.map((x) => (
          <WorkbookTextBox
            key={x.k}
            fieldKey={x.k}
            label={tr(x.q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S61 (PDF p67): Visioni ja tavoitteeni -----
// FIX: h1 "Visioni ja tavoitteeni" giờ qua tr()
function Screen64({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Millainen ihminen haluat olla?",
    "Mitä vahvuuksia ja taitoja haluaisit kehittää itsessäsi ja miksi?",
    "Onko sinulla joku esikuva, jolla on näitä ominaisuuksia? Kuka ja mitä?",
    "Miten voit kompensoida omia heikkouksiasi vahvuuksiesi avulla?",
    "Mitä toivoisit, että ystäväsi ja perheesi kertoisivat sinusta, kun et ole paikalla? Millaisena haluat tulla muistetuksi?",
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Visioni ja tavoitteeni")}
      intro={tr("Pohdi lopuksi:")}
      accent="yellow"
    >
      <div className="grid gap-6">
        {qs.map((q, i) => (
          <WorkbookTextBox
            key={i}
            fieldKey={`screen_62_visioni_${i + 1}`}
            label={tr(q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S62 (PDF p68): Kerro vahvuuksistasi videon tai esityksen avulla -----
function Screen65({ onSaveStateChange }: Props) {
  const tr = useTr();
  const qs = [
    "Mitkä ovat ydinvahvuuksiasi? Mitä rakastat tehdä? Milloin olet aidoimmillasi? Mistä saat energiaa? Mitkä vahvuuksia voisit nostaa esiin videolla entä työhaastattelussa?",
    "Missä ammateissa tai työtehtävissä vahvuutesi pääsisivät oikeuksiinsa?",
    "Miten hyödynnät vahvuuksiasi eri ihmisten kanssa?",
    "Missä ympäristöissä vahvuutesi pääsevät esiin parhaiten?",
    "Mistä saat usein positiivista palautetta toisilta?",
    "Miten käytät vahvuuksiasi ryhmässä? Mihin se vaikuttaa?",
  ];
  return (
    <AdventureWorkbookPage
      title={tr("Kerro vahvuuksistasi videon tai esityksen avulla")}
      accent="coral"
    >
      <div className="grid gap-6">
        {qs.map((q, i) => (
          <WorkbookTextBox
            key={i}
            fieldKey={`screen_63_kerro_${i + 1}`}
            label={tr(q)}
            rows={3}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S63 (PDF p69): Muistiinpanoja — stems -----
// FIX: h1 "Muistiinpanoja" giờ qua tr()
function Screen66({ onSaveStateChange }: Props) {
  const tr = useTr();
  const stems = [
    { k: "screen_64_havainnot", q: "Omat havainnot vahvuuksistani…" },
    { k: "screen_64_muistaa", q: "Tämän haluan muistaa ainakin…" },
    { k: "screen_64_tarkeaa", q: "Minulle on tärkeää…" },
  ];
  return (
    <AdventureWorkbookPage title={tr("Muistiinpanoja")} accent="mint">
      <div className="grid gap-6">
        {stems.map((s) => (
          <WorkbookTextBox
            key={s.k}
            fieldKey={s.k}
            label={tr(s.q)}
            rows={4}
            onSaveStateChange={onSaveStateChange}
          />
        ))}
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S64 (PDF p70): Muistiinpanoja — free notes -----
// FIX: h1 "Muistiinpanoja" giờ qua tr()
function Screen67({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Muistiinpanoja")} accent="yellow">
      <WorkbookTextBox
        fieldKey="screen_65_notes"
        label={tr("Vapaita muistiinpanoja")}
        rows={10}
        onSaveStateChange={onSaveStateChange}
      />
    </AdventureWorkbookPage>
  );
}

// ----- S65 (PDF p71): Muistiinpanoja — free notes -----
// FIX: h1 "Muistiinpanoja" giờ qua tr()
function Screen68({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Muistiinpanoja")} accent="coral">
      <WorkbookTextBox
        fieldKey="screen_66_notes"
        label={tr("Vapaita muistiinpanoja")}
        rows={10}
        onSaveStateChange={onSaveStateChange}
      />
    </AdventureWorkbookPage>
  );
}

// ----- S66 (PDF p72): Anna itsellesi ja toisille palautetta — informational -----
function Screen69() {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={trLines(tr, "Anna itselle\nja toisille\npalautetta!")}
      accent="mint"
    >
      <p className="font-display text-[clamp(28px,3vw,52px)] font-semibold leading-none text-[#FFE77A]">
        {tr("VINKKI!")}
      </p>
    </AdventureWorkbookPage>
  );
}

// ----- S67 (PDF p73): 5 vinkkiä sinulle — informational -----
// FIX: h1 "5 vinkkiä sinulle" giờ qua tr()
function Screen70() {
  const tr = useTr();
  const tips = [
    "Huomaa hyvä itsessäsi ja ole siitä ylpeä siitä, mitä jo osaat.",
    "Tunnista ja hyödynnä omia vahvuuksiasi.",
    "Kannusta ja kehu toisia.",
    "Ole ystävällinen myös itseäsi kohtaan.",
    "Uskalla näyttää innostuksesi. Se tarttuu!",
  ];
  return (
    <AdventureWorkbookPage title={tr("5 vinkkiä sinulle")} accent="yellow">
      <ol className="grid gap-4">
        {tips.map((t, i) => (
          <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-4">
            <span className="font-display text-[clamp(26px,2.2vw,38px)] font-semibold leading-none text-[#FFE77A]">
              {i + 1}.
            </span>
            <span className="pt-1 text-[clamp(18px,1.35vw,24px)] font-semibold leading-[1.35] text-white">
              {tr(t)}
            </span>
          </li>
        ))}
      </ol>
    </AdventureWorkbookPage>
  );
}

// ----- S68 (PDF p74): Reflektoi tuloksia -----
// FIX: h1 "Reflektoi tuloksia" giờ qua tr()
function Screen71({ onSaveStateChange }: Props) {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Reflektoi tuloksia")} accent="coral">
      <div className="grid gap-6">
        <WorkbookTextBox
          fieldKey="screen_69_kertovat"
          label={tr("Mitä vahvuutesi kertovat sinusta?")}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_69_kehittamisesta"
          label={tr("Minkä vahvuuksien kehittämisestä olisi sinulle eniten iloa?")}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_69_tilanteissa"
          label={tr(
            "Missä tilanteissa ja ympäristöissä pääset käyttämään vahvuuksiasi päivittäin?",
          )}
          rows={4}
          onSaveStateChange={onSaveStateChange}
        />
        <WorkbookTextBox
          fieldKey="screen_69_toimia"
          label={tr(
            "Miten sinun kannattaisi toimia, jos haluaisit hyödyntää vahvuuksiasi enemmän — opinnoissa, vapaa-ajalla ja ystävyyssuhteissa?",
          )}
          rows={5}
          onSaveStateChange={onSaveStateChange}
        />
      </div>
    </AdventureWorkbookPage>
  );
}

// ----- S69 (PDF p75): Täydennä vahvuusmittari — finale -----
function Screen72() {
  const tr = useTr();
  return (
    <AdventureWorkbookPage
      title={tr("Täydennä vahvuusmittari ja vertaa tuloksia itse valitsemiisi vahvuuskarkkeihin.")}
      intro={tr("Mitä huomaat?")}
      accent="yellow"
    >
      <WorkbookInfoPanel>
        <p>
          {tr(
            "Suurin osa meistä ihmisistä pystyy tunnistamaan helposti ainakin osan omista ydinvahvuuksistaan. Tämä on osa itsetuntemusta, joka on yhteydessä hyvinvointiin.",
          )}
        </p>
        <p className="mt-4">
          {tr(
            "Vahvuustyöskentelyn tavoitteena on tuoda sinut tietoiseksi vahvuuskielestä, joka ohjaa sinua tunnistamaan entistä monipuolisemmin vahvuuksia itsessäsi ja ihmisissä ympärilläsi.",
          )}
        </p>
        <p className="mt-5">{tr("Ohje: Vahvuusmittari löytyy liitteenä lopussa.")}</p>
      </WorkbookInfoPanel>
    </AdventureWorkbookPage>
  );
}

// ----- S70: Loppuyhteenveto -----
function Screen73() {
  const tr = useTr();
  return (
    <AdventureWorkbookPage title={tr("Vahvuusmittari")} accent="mint">
      <div className="mx-auto max-w-[860px] text-center">
        <WorkbookInfoPanel>
          <p>
            {tr("Yksi keino oppia tunnistamaan omia vahvuuksia on täyttää oheinen vahvuusmittari.")}
          </p>
        </WorkbookInfoPanel>
      </div>
    </AdventureWorkbookPage>
  );
}

// ============================================================
// Screen44 implementation
// ============================================================

const REGISTRY: Record<number, (p: Props) => ReactNode> = {
  // =========================================================
  // Prologue
  // =========================================================

  1: () => <Screen1 />,
  2: () => <Screen2 />,
  3: () => <Screen3 />,
  4: () => <Screen4 />,
  5: (p) => <Screen5 {...p} />,
  6: (p) => <Screen6 {...p} />,
  7: () => <Screen7 />,
  8: (p) => <Screen8 {...p} />,
  9: (p) => <Screen9 {...p} />,
  10: (p) => <Screen10 {...p} />,

  // =========================================================
  // Newly restored screens 11–13
  // =========================================================

  11: () => <Screen11 />,
  12: () => <Screen12 />,
  13: (p) => <Screen13 {...p} />,

  // =========================================================
  // Module 1
  // Old screens 11–26 are shifted forward by 3
  // =========================================================

  14: () => <Screen14 />,
  15: (p) => <Screen15 {...p} />,
  16: (p) => <Screen16 {...p} />,
  17: (p) => <Screen17 {...p} />,
  18: () => <Screen18 />,
  19: (p) => <Screen19 {...p} />,
  20: (p) => <Screen20 {...p} />,
  21: (p) => <Screen21 {...p} />,
  22: () => <Screen22 />,
  23: (p) => <Screen23 {...p} />,
  24: (p) => <Screen24 {...p} />,
  25: (p) => <Screen25 {...p} />,
  26: (p) => <Screen26 {...p} />,
  27: (p) => <Screen27 {...p} />,
  28: (p) => <Screen28 {...p} />,
  29: (p) => <Screen29 {...p} />,

  // =========================================================
  // Module 2
  // =========================================================

  30: () => <Screen30 />,
  31: () => <Screen31 />,
  32: (p) => <Screen32 {...p} />,
  33: (p) => <Screen33 {...p} />,
  34: (p) => <Screen34 {...p} />,
  35: (p) => <Screen35 {...p} />,
  36: (p) => <Screen36 {...p} />,
  37: (p) => <Screen37 {...p} />,
  38: () => <Screen38 />,
  39: (p) => <Screen39 {...p} />,
  40: (p) => <Screen40 {...p} />,
  41: (p) => <Screen41 {...p} />,
  42: (p) => <Screen42 {...p} />,

  // =========================================================
  // Module 3
  // =========================================================

  43: () => <Screen43 />,
  44: (p) => <Screen44 {...p} />,

  45: (p) => <Screen45 {...p} />,
  46: (p) => <Screen46 {...p} />,
  47: (p) => <Screen47 {...p} />,
  48: () => <Screen48 />,

  // =========================================================
  // Module 4
  // =========================================================

  49: () => <Screen49 />,
  50: (p) => <Screen50 {...p} />,
  51: (p) => <Screen51 {...p} />,
  52: () => <Screen52 />,
  53: (p) => <Screen53 {...p} />,
  54: (p) => <Screen54 {...p} />,
  55: () => <Screen55 />,
  56: (p) => <Screen56 {...p} />,

  // =========================================================
  // Module 5
  // =========================================================

  57: () => <Screen57 />,
  58: (p) => <Screen58 {...p} />,
  59: (p) => <Screen59 {...p} />,
  60: (p) => <Screen60 {...p} />,

  // =========================================================
  // Module 6
  // =========================================================

  61: () => <Screen61 />,
  62: (p) => <Screen62 {...p} />,
  63: (p) => <Screen63 {...p} />,
  64: (p) => <Screen64 {...p} />,
  65: (p) => <Screen65 {...p} />,
  66: (p) => <Screen66 {...p} />,
  67: (p) => <Screen67 {...p} />,
  68: (p) => <Screen68 {...p} />,
  69: () => <Screen69 />,
  70: () => <Screen70 />,
  71: (p) => <Screen71 {...p} />,
  72: () => <Screen72 />,
  73: () => <Screen73 />,
};

export function hasContent(n: number): boolean {
  if (REGISTRY[n]) {
    return true;
  }

  if (n >= METER_FIRST_SCREEN && n <= METER_TOP) {
    return true;
  }

  return false;
}

export function ScreenContent({
  n,
  onSaveStateChange,
}: {
  n: number;
} & Props): ReactNode {
 
  const screenComponent = REGISTRY[n];

  if (screenComponent) {
    return screenComponent({
      onSaveStateChange,
    });
  }

  if (n >= METER_FIRST_SCREEN && n <= METER_TOP) {
    return meterContentFor(n, {
      onSaveStateChange,
    });
  }

  return null;
}
