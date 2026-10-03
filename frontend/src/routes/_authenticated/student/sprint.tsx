import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { SprintSessionView } from "@/components/sprint/SprintSessionView";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { joinSprintSession } from "@/lib/sprint.functions";
import { getMyOpenSprint } from "@/lib/sprint-resume.functions";

export const Route = createFileRoute("/_authenticated/student/sprint")({
  component: StudentSprintPage,
});

const COPY = {
  fi: {
    title: "Vahvuussprintti",
    joinTitle: "Liity sprinttiin koodilla",
    joinBody: "Syötä tämän Vahvuussprintti-session yksilöllinen koodi. Voit antaa ja saada vahvuuspalautetta vain tämän session osallistujien kanssa.",
    code: "Sprintin koodi",
    join: "Liity sprinttiin",
    invalid: "Koodi ei ole voimassa, sprintti on jo alkanut tai session luoja on sulkenut sen.",
    checking: "Tarkistetaan avointa sprinttiä…",
  },
  en: {
    title: "Strength Sprint",
    joinTitle: "Join a Sprint with a code",
    joinBody: "Enter this Strength Sprint session's unique code. You can give and receive strength feedback only with people who joined this session.",
    code: "Sprint code",
    join: "Join Sprint",
    invalid: "The code is not valid, the Sprint has already started, or the creator has closed the session.",
    checking: "Checking for an open Sprint…",
  },
  sv: {
    title: "Styrkesprint",
    joinTitle: "Gå med i en sprint med kod",
    joinBody: "Ange den unika koden för den här Styrkesprint-sessionen. Du kan bara ge och få styrkefeedback med personer som deltar i samma session.",
    code: "Sprintkod",
    join: "Gå med i sprinten",
    invalid: "Koden är inte giltig, sprinten har redan startat eller skaparen har stängt sessionen.",
    checking: "Kontrollerar om det finns en öppen sprint…",
  },
} as const;

function StudentSprintPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const text = COPY[language];
  const joinSprint = useServerFn(joinSprintSession);
  const findOpenSprint = useServerFn(getMyOpenSprint);
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([supabase.auth.getUser(), findOpenSprint()])
      .then(([userResult, openSprint]) => {
        if (cancelled) return;
        setUserId(userResult.data.user?.id ?? null);
        if (openSprint?.sprintId) setSprintId(openSprint.sprintId);
      })
      .catch((error) => console.error("[student-open-sprint]", error))
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [findOpenSprint]);

  async function join() {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    setBusy(true);
    try {
      const result = await joinSprint({ data: { code: normalized } });
      setSprintId(result.sprintId);
    } catch (error) {
      console.error("[student-sprint-join]", error);
      toast.error(text.invalid);
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">
          <StickyNote seed="student-sprint-checking">
            <p className="text-sm opacity-70">{text.checking}</p>
          </StickyNote>
        </div>
      </div>
    );
  }

  if (sprintId && userId) {
    return (
      <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <SprintSessionView
            sprintId={sprintId}
            userId={userId}
            onExit={() => navigate({ to: "/seikkailu" })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <h1 className="font-display text-3xl">{text.title}</h1>
        <StickyNote seed="sprint-join" className="max-w-lg space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl">{text.joinTitle}</h2>
            <p className="text-sm opacity-75">{text.joinBody}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-sprint-code">{text.code}</Label>
            <Input
              id="student-sprint-code"
              value={code}
              maxLength={6}
              autoComplete="off"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="max-w-sm bg-white text-center font-mono text-2xl tracking-[0.4em] text-[color:var(--ink)]"
              placeholder="ABC123"
            />
          </div>
          <Button
            disabled={busy || !userId || code.trim().length < 4}
            onClick={() => void join()}
            className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
          >
            {text.join}
          </Button>
        </StickyNote>
      </div>
    </div>
  );
}
