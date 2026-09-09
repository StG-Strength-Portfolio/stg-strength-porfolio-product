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
