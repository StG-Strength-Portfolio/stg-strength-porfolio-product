import { createFileRoute, Link } from "@tanstack/react-router";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";
import { useTeacherData } from "@/lib/teacher-dashboard-data";

export const Route = createFileRoute("/teacher/classrooms/teachers")({
  component: TeacherClassroomChooser,
});

const COPY = {
  fi: {
    title: "Luokan opettajat",
    description: "Valitse luokka, jonka opettajia haluat hallita.",
    empty: "Sinulla ei ole vielä luokkia.",
    manage: "Hallinnoi opettajia",
    students: "opiskelijaa",
  },
  en: {
    title: "Class teachers",
    description: "Choose the class whose teachers you want to manage.",
    empty: "You do not have any classes yet.",
    manage: "Manage teachers",
    students: "students",
  },
  sv: {
    title: "Klassens lärare",
    description: "Välj den klass vars lärare du vill hantera.",
    empty: "Du har inga klasser ännu.",
    manage: "Hantera lärare",
    students: "elever",
  },
} as const;

function TeacherClassroomChooser() {
  const guard = useRoleGuard(["teacher"]);
  const { language } = useLanguage();
  const text = COPY[language];
  const { classes, students } = useTeacherData();

  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={text.title}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
    >
      <StickyNote seed="teacher-classroom-chooser" className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{text.title}</h1>
          <p className="mt-1 text-sm opacity-70">{text.description}</p>
        </div>

        {classes.length === 0 ? (
          <p className="opacity-70">{text.empty}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {classes.map((klass) => {
              const studentCount = students.filter((student) => student.classId === klass.id).length;
              return (
                <div
                  key={klass.id}
                  className="rounded-2xl border border-black/10 bg-white/70 p-4 text-slate-900"
                >
                  <h2 className="text-lg font-bold">{klass.name}</h2>
                  <p className="mt-1 text-sm opacity-70">
                    {studentCount} {text.students}
                  </p>
                  <Link
                    to="/teacher/classroom/$classId/teachers"
                    params={{ classId: klass.id }}
                    className="mt-3 inline-flex"
                  >
                    <Button
                      type="button"
                      className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
                    >
                      {text.manage}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </StickyNote>
    </DashboardShell>
  );
}
