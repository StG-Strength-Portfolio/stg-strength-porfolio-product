import { TRANSLATIONS } from "./translations-generated";

// Small runtime overrides for exact Finnish keys that are used by screens but
// are missing from the generated translation map.
TRANSLATIONS["Vahvuusjulisteet"] = {
  en: "Strength Posters",
  sv: "Styrkeaffischer",
};

TRANSLATIONS["Muistele omia onnistumisia"] = {
  en: "Think Back on Your Successes",
  sv: "Tänk tillbaka på dina framgångar",
};

// Screen 69 currently compiles its line-continued Finnish title into this
// exact key, so provide the intended localized title until the source string
// itself is normalized.
TRANSLATIONS["Anna itselleja toisillepalautetta!"] = {
  en: "Give Yourself and Others Feedback!",
  sv: "Ge respons till dig själv och andra!",
};

TRANSLATIONS[
  "Vahvuustyöskentelyn tavoitteena on tuoda sinut tietoiseksi vahvuuskielestä, joka ohjaa sinua tunnistamaan entistä monipuolisemmin vahvuuksia itsessäsi ja ihmisissä ympärilläsi."
] = {
  en: "The goal of strength-based work is to help you become familiar with the language of strengths, so you can recognize a wider range of strengths in yourself and the people around you.",
  sv: "Målet med styrkearbetet är att göra dig mer medveten om styrkespråket, så att du kan känna igen fler olika styrkor hos dig själv och människorna omkring dig.",
};

TRANSLATIONS["Ohje: Vahvuusmittari löytyy liitteenä lopussa."] = {
  en: "Note: The Strengths Meter is included in the appendix at the end.",
  sv: "Obs: Styrkemätaren finns i bilagan i slutet.",
};
