// Multilingual system for Vahvuusseikkailu.
// - `Language` = 'en' | 'fi' | 'sv'. Default is 'en'.
// - The student's language is resolved from the class they joined.
// - Teachers see the app in the current UI language they picked, defaulting
//   to 'en'; they choose the class language separately when they create a
//   class (that language is what students of the class see).
// - Content translations come from the uploaded Excel workbook
//   (`translations-generated.json`), keyed by the exact Finnish source text.
// - UI chrome strings live in the typed `UI` dictionary below.
//
// If a Finnish content string is not in the Excel dictionary, `tFi()`
// returns the Finnish source unchanged and logs a one-time warning per
// unknown key so we can find gaps.

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import generated from "./translations-generated.json";
import { TRANSLATIONS, translateFinnish, type AppLanguage } from "./translations-generated";

// ---------------- Types ----------------

export type Language = "en" | "fi" | "sv";
export const LANGUAGES: Language[] = ["en", "fi", "sv"];
export const DEFAULT_LANGUAGE: Language = "fi";

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: "English",
  fi: "Suomi",
  sv: "Svenska",
};

export const LANGUAGE_FLAG: Record<Language, string> = {
  en: "🇬🇧",
  fi: "🇫🇮",
  sv: "🇸🇪",
};

export function isLanguage(v: unknown): v is Language {
  return v === "en" || v === "fi" || v === "sv";
}

export function languageFromDisplayName(name?: string | null): Language | null {
  const match = name?.trim().match(/\+(EN|FI|SV)\s*$/i);
  if (!match) return null;
  const lang = match[1].toLowerCase();
  return isLanguage(lang) ? lang : null;
}

// ---------------- Content dictionary (Excel-derived) ----------------

type Entry = { en?: string; sv?: string };
const CONTENT_DICT: Record<string, Entry> = generated as Record<string, Entry>;

// Normalize a Finnish source string so that trivial whitespace / quote /
// punctuation variants still match the Excel keys.
function normalize(s: string): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/\s+/g, " ")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .trim();
}

// Lookup with graceful fallback + one-time console warning per missing key.
const warned = new Set<string>();
export function lookupContent(fi: string, lang: Language): string {
  if (lang === "fi") return fi;
  const key = normalize(fi);
  const hit = CONTENT_DICT[key];
  const out = hit && hit[lang];
  if (out && out.trim()) return out;
  if (!warned.has(key)) {
    warned.add(key);
    // eslint-disable-next-line no-console
    console.warn(
      `[i18n] Missing ${lang.toUpperCase()} translation for FI source (falling back to Finnish):`,
      key.slice(0, 100),
    );
  }
  return fi;
}

// ---------------- UI dictionary (typed) ----------------

// UI keys are kept small and are the ONLY human-authored translations in
// this repo. Everything else defers to the Excel dictionary above.
type UIDict = {
  en: Record<string, string>;
  fi: Record<string, string>;
  sv: Record<string, string>;
};

export const UI: UIDict = {
  fi: {
    "common.loading": "Ladataan…",
    "common.save.idle": "Valmis",
    "common.save.saving": "Tallennetaan…",
    "common.save.saved": "Tallennettu",
    "common.save.error": "Tallennus epäonnistui",
    "common.previous": "Edellinen",
    "common.next": "Seuraava",
    "common.continue": "Jatka",
    "common.back": "Takaisin",
    "common.logout": "Kirjaudu ulos",
    "common.login": "Kirjaudu sisään",
    "common.signup": "Rekisteröidy",
    "common.email": "Sähköposti",
    "common.password": "Salasana",
    "common.name": "Nimi",
    "common.copy": "Kopioi",
    "common.refresh": "Päivitä",
    "common.print": "Tulosta",
    "common.locked": "Lukittu",

    "app.title": "Vahvuusseikkailu",
    "app.tagline": "Huomaa hyvä! — vahvuusportfolio lukiolaiselle",
    "app.screenOfTotal": "Näyttö {n} / {total}",
    "app.screensSuffix": "näyttöä",

    "sidebar.general": "Yleiset",
    "sidebar.modules": "Tasot",
    "sidebar.worldmap": "Maailmankartta",

    "worldmap.title": "Maailmankartta",
    "worldmap.subtitle": "Valitse maailma tai jatka siitä, mihin jäit.",
    "worldmap.resumeHeader": "Jatka seikkailua",
    "worldmap.resumeAt": "{world} — näyttö {n}",

    "auth.landing.loginBtn": "Kirjaudu sisään",
    "auth.landing.signupBtn": "Luo opiskelija-tunnus",
    "auth.idle.expired": "Istunto vanheni — kirjaudu sisään uudelleen.",

    "auth.login.title": "Kirjaudu sisään",
    "auth.login.submit": "Kirjaudu",
    "auth.login.busy": "Hetki…",
    "auth.login.wrong": "Sähköposti tai salasana ei ole oikea",
    "auth.login.newAccount": "Luo uusi tunnus",

    "auth.student.title": "Luo opiskelija-tunnus",
    "auth.student.subtitle": "Liity seikkailuun luokan koodilla",
    "auth.student.submit": "Rekisteröidy opiskelijana",
    "auth.student.emailPh": "etunimi.sukunimi@koulu.fi",
    "auth.student.passwordPh": "Luo vahva salasana",
    "auth.student.passwordHint":
      "Vähintään 8 merkkiä. Sisällytä kirjaimia, numeroita ja erikoismerkkejä.",
    "auth.student.nameLabel": "Nimi (Etunimi Sukunimi)",
    "auth.student.namePh": "esim. Anni Paatsila",
    "auth.student.nameHint": "Kirjoita sinun etunimi ja sukunimi",
    "auth.student.codeLabel": "Luokan koodi",
    "auth.student.codePh": "esim. ABC123",
    "auth.student.err.emailInvalid": "Sähköposti ei ole voimassa.",
    "auth.student.err.passwordShort": "Salasana pitää olla vähintään 8 merkkiä.",
    "auth.student.err.nameMissing": "Anna nimesi.",
    "auth.student.err.codeMissing": "Anna luokan koodi.",
    "auth.student.err.emailTaken": "Tällä sähköpostilla on jo tunnus.",
    "auth.student.err.codeInvalid": "Koodi ei ole voimassa. Tarkista opettajaltasi.",

    "auth.teacher.title": "Opettajille",
    "auth.teacher.school": "Koulun nimi",
    "auth.teacher.schoolPh": "esim. Espoo High School",
    "auth.teacher.teacherCode": "Opettajan koodi",
    "auth.teacher.teacherCodePh": "esim. OPETTAJA-2026",
    "auth.teacher.submit": "Rekisteröidy opettajana",
    "auth.teacher.err.badCode": "Opettajan koodi ei kelpaa. Pyydä koodi koulustasi.",
    "auth.teacher.hasAccount": "Onko sinulla jo opettajatunnus?",

    "join.title": "Liity yhteisöön",
    "join.subtitle": "Syötä opettajaltasi saamasi koodi.",
    "join.codeLabel": "Luokan koodi",
    "join.codePh": "esim. 9A-VAHVUUS-25",
    "join.submit": "Liity luokkaan",
    "join.busy": "Liitytään…",
    "join.hint": "Et voi aloittaa seikkailua ennen kuin olet liittynyt opettajasi luokkaan.",
    "join.err.notFound": "Koodia ei löytynyt. Tarkista koodi opettajaltasi.",
    "join.success": "Olet liittynyt luokkaan: {name}",

    "teacher.title": "Opettajan näkymä",
    "teacher.create.title": "Luo uusi luokka",
    "teacher.create.hint": "Luokan koodin avulla oppilaat liittyvät luokkaan.",
    "teacher.create.nameLabel": "Luokan nimi",
    "teacher.create.namePh": "esim. 9A — Vahvuusryhmä",
    "teacher.create.langLabel": "Luokan kieli",
    "teacher.create.langHint":
      "Oppilaat näkevät sovelluksen tällä kielellä liittyessään luokkaan tällä koodilla.",
    "teacher.create.submit": "Luo luokka",
    "teacher.create.busy": "Luodaan…",
    "teacher.create.success": "Luokka luotu.",
    "teacher.mine": "Luokkani ({n})",
    "teacher.mine.empty": "Ei vielä luokkia. Luo ensimmäinen yllä.",
    "teacher.classCard.class": "Luokka",
    "teacher.classCard.joinCode": "Liittymiskoodi",
    "teacher.classCard.language": "Kieli",
    "teacher.classCard.language.edit": "Muokkaa",
    "teacher.classCard.language.updated": "Luokan kieli päivitetty.",
    "teacher.classCard.language.updateFailed": "Kielen päivitys epäonnistui.",
    "teacher.classCard.students": "Oppilaita",
    "teacher.classCard.avg": "Keskimäärin",
    "teacher.classCard.screensAvg": "Näytöt täytetty (ka.)",
    "teacher.classCard.lastActive": "Viimeksi aktiivinen",
    "teacher.classCard.sort": "Lajittele:",
    "teacher.classCard.sort.progress": "Edistyminen (jäljessä ensin)",
    "teacher.classCard.sort.nameAsc": "Nimi (A–Z)",
    "teacher.classCard.sort.leastActive": "Vähiten aktiiviset ensin",
    "teacher.classCard.exportCsv": "Lataa tiedot (CSV)",
    "teacher.classCard.copyCode": "Kopioi koodi",
    "teacher.classCard.copyCode.ok": "Koodi kopioitu.",
    "teacher.classCard.copyCode.fail": "Kopiointi epäonnistui — kopioi käsin.",
    "teacher.classCard.empty": "Ei oppilaita vielä. Jaa luokan koodi oppilaiden kanssa.",
    "teacher.roster.student": "Oppilas",
    "teacher.roster.progress": "Edistyminen",
    "teacher.roster.worlds": "Maailmat",
    "teacher.roster.viewPortfolio": "Näytä portfolio",
    "teacher.roster.nameMissing": "Nimi puuttuu",
    "teacher.roster.worldScreens": "Maailma {w}, näytöt",

    "portfolio.title": "{name} — Portfolio",
    "portfolio.progress": "Edistyminen",
    "portfolio.filledOfTotal": "{done} / {total} näyttöä täytetty",
    "portfolio.currentScreen": "Nykyinen näyttö: {n} / {total}",
    "portfolio.meter": "Vahvuusmittari",
    "portfolio.meter.done": "Suoritettu ✓",
    "portfolio.meter.inProgress": "Kesken",
    "portfolio.meter.top5": "Top 5 ydinvahvuutta",
    "portfolio.meter.growth3": "Top 3 kasvuvahvuutta",
    "portfolio.result": "Vahvuustulos",
    "portfolio.screenLabel": "Näyttö {n} — {world}",
    "portfolio.print": "Tulosta Portfolio",

    "nav.finishFirst": "Täytä ensin tämän sivun tehtävä, niin pääset jatkamaan.",
    "nav.previousScreensFirst": "Suorita edelliset näytöt ensin.",
  },
  en: {
    "common.loading": "Loading…",
    "common.save.idle": "Ready",
    "common.save.saving": "Saving…",
    "common.save.saved": "Saved",
    "common.save.error": "Save failed",
    "common.previous": "Previous",
    "common.next": "Next",
    "common.continue": "Continue",
    "common.back": "Back",
    "common.logout": "Log out",
    "common.login": "Log in",
    "common.signup": "Sign up",
    "common.email": "Email",
    "common.password": "Password",
    "common.name": "Name",
    "common.copy": "Copy",
    "common.refresh": "Refresh",
    "common.print": "Print",
    "common.locked": "Locked",

    "app.title": "Strength Adventure",
    "app.tagline": "See the Good! — a strength portfolio for upper secondary students",
    "app.screenOfTotal": "Screen {n} of {total}",
    "app.screensSuffix": "screens",

    "sidebar.general": "General",
    "sidebar.modules": "Levels",
    "sidebar.worldmap": "World map",

    "worldmap.title": "World map",
    "worldmap.subtitle": "Pick a world or continue where you left off.",
    "worldmap.resumeHeader": "Resume adventure",
    "worldmap.resumeAt": "{world} — screen {n}",

    "auth.landing.loginBtn": "Log in",
    "auth.landing.signupBtn": "Create student account",
    "auth.idle.expired": "Your session expired — please log in again.",

    "auth.login.title": "Log in",
    "auth.login.submit": "Log in",
    "auth.login.busy": "One moment…",
    "auth.login.wrong": "Email or password is incorrect",
    "auth.login.newAccount": "Create a new account",

    "auth.student.title": "Create student account",
    "auth.student.subtitle": "Join the adventure with a class code",
    "auth.student.submit": "Sign up as a student",
    "auth.student.emailPh": "firstname.lastname@school.example",
    "auth.student.passwordPh": "Create a strong password",
    "auth.student.passwordHint": "At least 8 characters. Include letters, numbers and symbols.",
    "auth.student.nameLabel": "Name (First Last)",
    "auth.student.namePh": "e.g. Anna Andersson",
    "auth.student.nameHint": "Enter your first and last name",
    "auth.student.codeLabel": "Class code",
    "auth.student.codePh": "e.g. ABC123",
    "auth.student.err.emailInvalid": "That email address is not valid.",
    "auth.student.err.passwordShort": "Password must be at least 8 characters.",
    "auth.student.err.nameMissing": "Please enter your name.",
    "auth.student.err.codeMissing": "Please enter your class code.",
    "auth.student.err.emailTaken": "An account already exists for this email.",
    "auth.student.err.codeInvalid": "That code is not valid. Please check with your teacher.",

    "auth.teacher.title": "For teachers",
    "auth.teacher.school": "School name",
    "auth.teacher.schoolPh": "e.g. Espoo High School",
    "auth.teacher.teacherCode": "Teacher code",
    "auth.teacher.teacherCodePh": "e.g. OPETTAJA-2026",
    "auth.teacher.submit": "Sign up as a teacher",
    "auth.teacher.err.badCode": "That teacher code is not valid. Ask your school for the code.",
    "auth.teacher.hasAccount": "Already have a teacher account?",

    "join.title": "Join your community",
    "join.subtitle": "Enter the code your teacher gave you.",
    "join.codeLabel": "Class code",
    "join.codePh": "e.g. 9A-STRENGTH-25",
    "join.submit": "Join class",
    "join.busy": "Joining…",
    "join.hint": "You can start the adventure once you've joined your teacher's class.",
    "join.err.notFound": "Code not found. Please double-check with your teacher.",
    "join.success": "You joined class: {name}",

    "teacher.title": "Teacher dashboard",
    "teacher.create.title": "Create a new class",
    "teacher.create.hint": "Students use the class code to join your class.",
    "teacher.create.nameLabel": "Class name",
    "teacher.create.namePh": "e.g. 9A — Strength group",
    "teacher.create.langLabel": "Class language",
    "teacher.create.langHint":
      "Students who join with this code will see the app in this language.",
    "teacher.create.submit": "Create class",
    "teacher.create.busy": "Creating…",
    "teacher.create.success": "Class created.",
    "teacher.mine": "My classes ({n})",
    "teacher.mine.empty": "No classes yet. Create your first one above.",
    "teacher.classCard.class": "Class",
    "teacher.classCard.joinCode": "Join code",
    "teacher.classCard.language": "Language",
    "teacher.classCard.language.edit": "Change",
    "teacher.classCard.language.updated": "Class language updated.",
    "teacher.classCard.language.updateFailed": "Failed to update the class language.",
    "teacher.classCard.students": "Students",
    "teacher.classCard.avg": "Average",
    "teacher.classCard.screensAvg": "Screens filled (avg.)",
    "teacher.classCard.lastActive": "Last active",
    "teacher.classCard.sort": "Sort:",
    "teacher.classCard.sort.progress": "Progress (behind first)",
    "teacher.classCard.sort.nameAsc": "Name (A–Z)",
    "teacher.classCard.sort.leastActive": "Least active first",
    "teacher.classCard.exportCsv": "Download data (CSV)",
    "teacher.classCard.copyCode": "Copy code",
    "teacher.classCard.copyCode.ok": "Code copied.",
    "teacher.classCard.copyCode.fail": "Copy failed — copy it manually.",
    "teacher.classCard.empty": "No students yet. Share the class code with your students.",
    "teacher.roster.student": "Student",
    "teacher.roster.progress": "Progress",
    "teacher.roster.worlds": "Worlds",
    "teacher.roster.viewPortfolio": "View portfolio",
    "teacher.roster.nameMissing": "Name missing",
    "teacher.roster.worldScreens": "World {w}, screens",

    "portfolio.title": "{name} — Portfolio",
    "portfolio.progress": "Progress",
    "portfolio.filledOfTotal": "{done} of {total} screens filled",
    "portfolio.currentScreen": "Current screen: {n} / {total}",
    "portfolio.meter": "Strength Meter",
    "portfolio.meter.done": "Completed ✓",
    "portfolio.meter.inProgress": "In progress",
    "portfolio.meter.top5": "Top 5 core strengths",
    "portfolio.meter.growth3": "Top 3 growth strengths",
    "portfolio.result": "Strength results",
    "portfolio.screenLabel": "Screen {n} — {world}",
    "portfolio.print": "Print portfolio",

    "nav.finishFirst": "Please complete this page's task before continuing.",
    "nav.previousScreensFirst": "Complete the previous screens first.",
  },
  sv: {
    "common.loading": "Laddar…",
    "common.save.idle": "Klar",
    "common.save.saving": "Sparar…",
    "common.save.saved": "Sparat",
    "common.save.error": "Sparning misslyckades",
    "common.previous": "Föregående",
    "common.next": "Nästa",
    "common.continue": "Fortsätt",
    "common.back": "Tillbaka",
    "common.logout": "Logga ut",
    "common.login": "Logga in",
    "common.signup": "Registrera",
    "common.email": "E-post",
    "common.password": "Lösenord",
    "common.name": "Namn",
    "common.copy": "Kopiera",
    "common.refresh": "Uppdatera",
    "common.print": "Skriv ut",
    "common.locked": "Låst",

    "app.title": "Styrkeäventyret",
    "app.tagline": "Se det goda! — en styrkeportfölj för gymnasiet",
    "app.screenOfTotal": "Sida {n} av {total}",
    "app.screensSuffix": "sidor",

    "sidebar.general": "Allmänt",
    "sidebar.modules": "Nivåer",
    "sidebar.worldmap": "Världskarta",

    "worldmap.title": "Världskarta",
    "worldmap.subtitle": "Välj en värld eller fortsätt där du slutade.",
    "worldmap.resumeHeader": "Fortsätt äventyret",
    "worldmap.resumeAt": "{world} — sida {n}",

    "auth.landing.loginBtn": "Logga in",
    "auth.landing.signupBtn": "Skapa elevkonto",
    "auth.idle.expired": "Sessionen gick ut — logga in igen.",

    "auth.login.title": "Logga in",
    "auth.login.submit": "Logga in",
    "auth.login.busy": "Ett ögonblick…",
    "auth.login.wrong": "E-post eller lösenord är fel",
    "auth.login.newAccount": "Skapa nytt konto",

    "auth.student.title": "Skapa elevkonto",
    "auth.student.subtitle": "Gå med i äventyret med en klasskod",
    "auth.student.submit": "Registrera som elev",
    "auth.student.emailPh": "fornamn.efternamn@skola.se",
    "auth.student.passwordPh": "Skapa ett starkt lösenord",
    "auth.student.passwordHint": "Minst 8 tecken. Använd bokstäver, siffror och specialtecken.",
    "auth.student.nameLabel": "Namn (Förnamn Efternamn)",
    "auth.student.namePh": "t.ex. Anna Andersson",
    "auth.student.nameHint": "Skriv ditt för- och efternamn",
    "auth.student.codeLabel": "Klasskod",
    "auth.student.codePh": "t.ex. ABC123",
    "auth.student.err.emailInvalid": "E-postadressen är ogiltig.",
    "auth.student.err.passwordShort": "Lösenordet måste vara minst 8 tecken.",
    "auth.student.err.nameMissing": "Ange ditt namn.",
    "auth.student.err.codeMissing": "Ange klasskoden.",
    "auth.student.err.emailTaken": "Det finns redan ett konto med den här e-posten.",
    "auth.student.err.codeInvalid": "Koden är ogiltig. Kontrollera med din lärare.",

    "auth.teacher.title": "För lärare",
    "auth.teacher.school": "Skolans namn",
    "auth.teacher.schoolPh": "t.ex. Espoo gymnasium",
    "auth.teacher.teacherCode": "Lärarkod",
    "auth.teacher.teacherCodePh": "t.ex. OPETTAJA-2026",
    "auth.teacher.submit": "Registrera som lärare",
    "auth.teacher.err.badCode": "Lärarkoden är ogiltig. Be din skola om koden.",
    "auth.teacher.hasAccount": "Har du redan ett lärarkonto?",

    "join.title": "Gå med i gemenskapen",
    "join.subtitle": "Skriv in koden du fått av din lärare.",
    "join.codeLabel": "Klasskod",
    "join.codePh": "t.ex. 9A-STYRKA-25",
    "join.submit": "Gå med i klassen",
    "join.busy": "Ansluter…",
    "join.hint": "Du kan börja äventyret när du har gått med i din lärares klass.",
    "join.err.notFound": "Koden hittades inte. Kontrollera koden med din lärare.",
    "join.success": "Du har gått med i klassen: {name}",

    "teacher.title": "Lärarvy",
    "teacher.create.title": "Skapa en ny klass",
    "teacher.create.hint": "Eleverna använder klasskoden för att gå med i din klass.",
    "teacher.create.nameLabel": "Klassens namn",
    "teacher.create.namePh": "t.ex. 9A — Styrkegrupp",
    "teacher.create.langLabel": "Klassens språk",
    "teacher.create.langHint": "Elever som går med med den här koden ser appen på det här språket.",
    "teacher.create.submit": "Skapa klass",
    "teacher.create.busy": "Skapar…",
    "teacher.create.success": "Klass skapad.",
    "teacher.mine": "Mina klasser ({n})",
    "teacher.mine.empty": "Inga klasser ännu. Skapa din första ovan.",
    "teacher.classCard.class": "Klass",
    "teacher.classCard.joinCode": "Anslutningskod",
    "teacher.classCard.language": "Språk",
    "teacher.classCard.language.edit": "Ändra",
    "teacher.classCard.language.updated": "Klassens språk har uppdaterats.",
    "teacher.classCard.language.updateFailed": "Det gick inte att uppdatera klassens språk.",
    "teacher.classCard.students": "Elever",
    "teacher.classCard.avg": "Genomsnitt",
    "teacher.classCard.screensAvg": "Ifyllda sidor (snitt)",
    "teacher.classCard.lastActive": "Senast aktiv",
    "teacher.classCard.sort": "Sortera:",
    "teacher.classCard.sort.progress": "Framsteg (efter först)",
    "teacher.classCard.sort.nameAsc": "Namn (A–Z)",
    "teacher.classCard.sort.leastActive": "Minst aktiva först",
    "teacher.classCard.exportCsv": "Ladda ner data (CSV)",
    "teacher.classCard.copyCode": "Kopiera kod",
    "teacher.classCard.copyCode.ok": "Kod kopierad.",
    "teacher.classCard.copyCode.fail": "Kopiering misslyckades — kopiera manuellt.",
    "teacher.classCard.empty": "Inga elever ännu. Dela klasskoden med dina elever.",
    "teacher.roster.student": "Elev",
    "teacher.roster.progress": "Framsteg",
    "teacher.roster.worlds": "Världar",
    "teacher.roster.viewPortfolio": "Visa portfölj",
    "teacher.roster.nameMissing": "Namn saknas",
    "teacher.roster.worldScreens": "Värld {w}, sidor",

    "portfolio.title": "{name} — Portfölj",
    "portfolio.progress": "Framsteg",
    "portfolio.filledOfTotal": "{done} av {total} sidor ifyllda",
    "portfolio.currentScreen": "Aktuell sida: {n} / {total}",
    "portfolio.meter": "Styrkemätaren",
    "portfolio.meter.done": "Slutförd ✓",
    "portfolio.meter.inProgress": "Pågår",
    "portfolio.meter.top5": "Topp 5 kärnstyrkor",
    "portfolio.meter.growth3": "Topp 3 tillväxtstyrkor",
    "portfolio.result": "Styrkeresultat",
    "portfolio.screenLabel": "Sida {n} — {world}",
    "portfolio.print": "Skriv ut portfölj",

    "nav.finishFirst": "Fyll först i uppgiften på den här sidan för att gå vidare.",
    "nav.previousScreensFirst": "Slutför de föregående sidorna först.",
  },
};

// ---------------- React context ----------------

type LangCtx = {
  language: Language;
  /** True while we are still resolving the student's class language. */
  loading: boolean;
  /** Set the language manually. Used by teachers/no-class users only. */
  setLanguage: (lang: Language) => void;
};

const LangContext = createContext<LangCtx>({
  language: DEFAULT_LANGUAGE,
  loading: false,
  setLanguage: () => {},
});

/** Canonical persisted key for the student's (class-inherited) language. */
const STORAGE_KEY = "student_language";

function readStored(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return isLanguage(v) ? v : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The language is a *derived* value: it comes from the class the student
  // joined and is persisted on their profile. There is no student-facing
  // switcher. `setLanguage` is only called by the join / resolve flows.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setLanguageState(readStored());
    setLoading(false);
  }, []);

  // Authoritative source: the student's own profile row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data, error } = await supabase
          .from("profiles" as never)
          .select("language, display_name")
          .eq("id", u.user.id)
          .maybeSingle();
        let profile = data as { language?: string; display_name?: string | null } | null;
        if (error) {
          const { data: nameOnly } = await supabase
            .from("profiles" as never)
            .select("display_name")
            .eq("id", u.user.id)
            .maybeSingle();
          profile = nameOnly as { display_name?: string | null } | null;
        }
        const lang = languageFromDisplayName(profile?.display_name) ?? profile?.language;
        if (!cancelled && isLanguage(lang)) {
          setLanguageState(lang);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, lang);
          }
        }
      } catch {
        /* keep persisted value */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ language, loading, setLanguage }),
    [language, loading, setLanguage],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLanguage(): LangCtx {
  return useContext(LangContext);
}

// ---------------- Hooks: UI + content translators ----------------

function formatTemplate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined ? "{" + k + "}" : String(v);
  });
}

// ---- Finnish-source lookup (Prompt 1 dictionary) ----
const trWarned = new Set<string>();
function trFinnish(finnish: string, language: Language): string {
  // Defensive: callers occasionally pass an undefined lookup result.
  if (typeof finnish !== "string" || !finnish) return "";
  if (language === "fi") return finnish;
  const out = translateFinnish(finnish, language as AppLanguage);
  if (out !== finnish && TRANSLATIONS[finnish]) return out;
  // Fall back to the Excel-derived dictionary (normalized key match).
  const hit = CONTENT_DICT[normalize(finnish)];
  const alt = hit && hit[language];
  if (alt && alt.trim()) return alt;
  if (out === finnish && !TRANSLATIONS[finnish]) {
    const key = `${language}:${finnish}`;
    if (!trWarned.has(key)) {
      trWarned.add(key);
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n] Missing ${language.toUpperCase()} chrome translation (rendering Finnish):`,
        finnish,
      );
    }
  }
  return out;
}

/**
 * Translate a Finnish source string into the active language.
 * Finnish returns unchanged; a missing translation returns the Finnish original.
 */
export function useTr(): (finnish: string, vars?: Record<string, string | number>) => string {
  const { language } = useLanguage();
  return useCallback(
    (finnish, vars) => formatTemplate(trFinnish(finnish, language), vars),
    [language],
  );
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const { language } = useLanguage();
  return useCallback(
    (key, vars) => {
      const raw = UI[language]?.[key] ?? UI.fi[key];
      if (!raw) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing UI translation: ${key}`);
        return formatTemplate(key, vars);
      }
      return formatTemplate(raw, vars);
    },
    [language],
  );
}

/** Screen BODY text stays Finnish in this step (Prompt 4 handles it). */
export function useTFi(): (fi: string | undefined | null) => string {
  return useCallback((fi) => fi ?? "", []);
}

// ---------------- Recursive text translator ----------------
export function TranslateFi({ children }: { children: ReactNode }) {
  const tr = useTr();

  const translateNode = useCallback(
    (node: ReactNode): ReactNode => {
      if (typeof node === "string") {
        if (!node.trim()) return node;
        const leading = node.match(/^\s*/)?.[0] ?? "";
        const trailing = node.match(/\s*$/)?.[0] ?? "";
        return `${leading}${tr(node.trim())}${trailing}`;
      }

      if (Array.isArray(node)) {
        return node.map(translateNode);
      }

      if (!isValidElement(node)) return node;

      const element = node as ReactElement<{ children?: ReactNode }>;
      if (
        typeof element.type === "string" &&
        ["script", "style", "textarea"].includes(element.type)
      ) {
        return element;
      }

      const childNodes = element.props.children;
      if (childNodes === undefined) return element;
      return cloneElement(element, undefined, Children.map(childNodes, translateNode));
    },
    [tr],
  );

  return <>{Children.map(children, translateNode)}</>;
}
