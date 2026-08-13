import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { SprintSessionView } from "@/components/sprint/SprintSessionView";
import { useLanguage } from "@/lib/i18n";
import { createSprintSession, joinSprintSession } from "@/lib/sprint.functions";
import { getMyOpenSprint } from "@/lib/sprint-resume.functions";

const COPY = {
  fi: {
    createTitle: "Luo uusi Vahvuussprintti",
    createBody: "Luo koulullesi uusi sprintti. Saat yksilöllisen koodin, jolla opiskelijat, opettajat ja koulun adminit voivat liittyä samaan sessioon.",
    create: "Luo sprintti",
    joinTitle: "Liity Vahvuussprinttiin",
    joinBody: "Jos joku muu on luonut sprintin, liity siihen sen yksilöllisellä koodilla.",
    code: "Sprintin koodi",
    join: "Liity sprinttiin",
    checking: "Tarkistetaan avointa sprinttiä…",
  },
  en: {
    createTitle: "Create a new Strength Sprint",
    createBody: "Create a new Sprint for your school. You will get a unique code that students, teachers and school admins can use to join the same session.",
    create: "Create Sprint",
    joinTitle: "Join a Strength Sprint",
    joinBody: "If someone else created the Sprint, join it with that session's unique code.",
    code: "Sprint code",
    join: "Join Sprint",
    checking: "Checking for an open Sprint…",
  },
  sv: {
    createTitle: "Skapa en ny Styrkesprint",
    createBody: "Skapa en ny sprint för skolan. Du får en unik kod som elever, lärare och skoladministratörer kan använda för att delta i samma session.",
    create: "Skapa sprint",
    joinTitle: "Gå med i en Styrkesprint",
    joinBody: "Om någon annan skapade sprinten kan du gå med med sessionens unika kod.",
    code: "Sprintkod",
    join: "Gå med i sprinten",
    checking: "Kontrollerar om det finns en öppen sprint…",
  },
} as const;

export function StaffSprintHub({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const text = COPY[language];
  const createSprint = useServerFn(createSprintSession);
  const joinSprint = useServerFn(joinSprintSession);
  const findOpenSprint = useServerFn(getMyOpenSprint);
  const [code, setCode] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void findOpenSprint()
      .then((result) => {
        if (!cancelled && result?.sprintId) setSprintId(result.sprintId);
      })
      .catch((error) => console.error("[staff-open-sprint]", error))
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [findOpenSprint]);

  async function create() {
    setBusy(true);
    try {
      const result = await createSprint();
      setSprintId(result.sprintId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    setBusy(true);
    try {
      const result = await joinSprint({ data: { code: normalized } });
      setSprintId(result.sprintId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <StickyNote seed="staff-sprint-checking">
        <p className="text-sm opacity-70">{text.checking}</p>
      </StickyNote>
    );
  }

  if (sprintId) {
    return <SprintSessionView sprintId={sprintId} userId={userId} onExit={() => setSprintId(null)} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <StickyNote seed="staff-sprint-create" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl">{text.createTitle}</h2>
          <p className="text-sm opacity-75">{text.createBody}</p>
        </div>
        <Button
          disabled={busy}
          onClick={() => void create()}
          className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
        >
          {text.create}
        </Button>
      </StickyNote>

      <StickyNote seed="staff-sprint-join" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl">{text.joinTitle}</h2>
          <p className="text-sm opacity-75">{text.joinBody}</p>
        </div>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="staff-sprint-code">{text.code}</Label>
          <Input
            id="staff-sprint-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={6}
            autoComplete="off"
            placeholder="ABC123"
            className="bg-white text-center font-mono text-xl tracking-[0.3em] text-[color:var(--ink)]"
          />
        </div>
        <Button
          disabled={busy || code.trim().length < 4}
          onClick={() => void join()}
          className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
        >
          {text.join}
        </Button>
      </StickyNote>
    </div>
  );
}
