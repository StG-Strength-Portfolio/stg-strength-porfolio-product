import { createFileRoute } from "@tanstack/react-router";
import { SchoolGiftPanel } from "@/components/strengths/SchoolGiftPanel";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/student/give-strength")({
  head: () => ({
    meta: [
      { title: "Give a strength — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Give strength feedback to a teacher or school admin in your school.",
      },
    ],
  }),
  component: StudentGiveStrengthPage,
});

const TITLE = {
  fi: "Anna vahvuus opettajalle tai koulun adminille",
  en: "Give a strength to a teacher or school admin",
  sv: "Ge en styrka till en lärare eller skoladministratör",
} as const;

function StudentGiveStrengthPage() {
  const { language } = useLanguage();
  return (
    <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <SchoolGiftPanel title={TITLE[language]} />
      </div>
    </div>
  );
}
