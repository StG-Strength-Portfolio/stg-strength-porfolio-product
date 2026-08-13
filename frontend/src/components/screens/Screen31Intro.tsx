import { useTr } from "@/lib/i18n";

/**
 * Screen 31 — Omat vahvuuteni lukiossa.
 *
 * This screen is kept as a small dedicated component so its Finnish source
 * title stays Finnish before the shared FI/EN/SV translation layer runs.
 */
export function Screen31Intro() {
  const tr = useTr();

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto text-white [scrollbar-gutter:stable]">
      <div className="relative mx-auto min-h-[720px] w-full max-w-[1500px] overflow-hidden px-[8%] pb-20 pt-16">
        <div className="relative z-20 max-w-[1150px]">
          <h1 className="font-display text-[clamp(38px,3vw,54px)] font-semibold leading-[1.12] text-[#ffd95d]">
            {tr("Omat vahvuuteni lukiossa")}
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
