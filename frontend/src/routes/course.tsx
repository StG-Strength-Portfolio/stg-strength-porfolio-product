import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { requestStgClose, requestStgFollowup } from "@/lib/stg-lm";

export const Route = createFileRoute("/course")({
  component: TeacherCourse,
});

type Section = { heading: string; body?: string; list?: string[] };
type McModule = {
  id: string;
  mode: "mc";
  title: string;
  sections: Section[];
  prompt: string;
  choices: string[];
  responses: string[];
};
type ChatModule = {
  id: string;
  mode: "chat";
  title: string;
  sections: Section[];
  prompt: string;
  placeholder: string;
};
type Module = McModule | ChatModule;

type ModuleProgress = {
  done?: boolean;
  choice?: number;
  answer?: string;
  compliment?: string;
  question?: string;
  clarification?: string;
  thanks?: string;
};

type CourseProgress = Record<string, ModuleProgress>;

const MODULES: Module[] = [
  {
    id: "m1",
    mode: "mc",
    title: "What are character strengths?",
    sections: [
      {
        heading: "Skills we all need",
        body: "Reading, coding, or learning a swimming jump are visible skills. Underneath them are character strengths such as curiosity, perseverance, self-regulation and many others that help everyday learning and life work.",
      },
      {
        heading: "They can grow, whatever the starting point",
        body: "We can develop courage, creativity, humour and other character strengths from different starting points. The goal is not to change a student's temperament, but to help strengths grow.",
      },
    ],
    prompt: "Think of a recent moment with a student. Which best fits what you saw?",
    choices: [
      "A student pushed through something that was genuinely hard for them.",
      "A student tried something new despite feeling unsure.",
      "A student's curiosity pulled a whole activity forward.",
    ],
    responses: [
      "That's perseverance in action — the kind of moment that can be easy to miss but says a lot about a student's character.",
      "That's courage — stepping into something uncertain even when it would have been easier not to.",
      "That's curiosity doing what it does best — creating energy and pulling learning forward.",
    ],
  },
  {
    id: "m2",
    mode: "chat",
    title: "The language of strengths",
    sections: [
      {
        heading: "Naming it comes first",
        body: "Strength teaching starts with vocabulary. We cannot intentionally discuss or develop perseverance, courage or kindness if we do not yet have words for them.",
      },
      {
        heading: "Weaving strengths into everyday speech",
        body: 'Once the words are familiar, they can become part of ordinary feedback: “You had perspective when you figured out where to start.” “That was a brave step.” “You said that so kindly.”',
      },
    ],
    prompt: 'Try it now — finish this sentence: “You had ___, when you ___.” Write one line of strength language you could say out loud tomorrow.',
    placeholder: "You had courage, when you raised your hand even though you weren't sure of the answer.",
  },
  {
    id: "m3",
    mode: "mc",
    title: "Different environments, different strengths",
    sections: [
      {
        heading: "The classroom is only one stage",
        body: "A student's strengths may look different at home, with friends, during a hobby, or in a new setting. School is only one place where strengths can become visible.",
      },
      {
        heading: "What school asks of students",
        body: "Waiting for a turn can draw on self-regulation, sharing an opinion can draw on courage, inviting someone into play can draw on social intelligence, and understanding a classmate can draw on compassion.",
      },
    ],
    prompt: "Where have you noticed a student's strengths look different from how they show up in class?",
    choices: ["At home or with family", "During free play or break time", "In a hobby or activity outside school"],
    responses: [
      "Home can reveal strengths that school rarely gets to see — useful information for an educator.",
      "Break time can be a strength gym in disguise: social intelligence, courage, fairness and more.",
      "Hobbies can reveal core strengths clearly because students often have different roles and fewer classroom pressures there.",
    ],
  },
  {
    id: "m4",
    mode: "chat",
    title: "Discover your own core strengths",
    sections: [
      {
        heading: "Start with yourself",
        body: "Before guiding students toward their strengths, it helps to know your own. Core strengths tend to feel characteristic and natural rather than forced.",
      },
      {
        heading: "Questions to help you spot your strengths",
        list: [
          "What activities make you feel most like yourself?",
          "What gives you energy, even when it takes effort?",
          "What do you naturally notice, value, or respond to?",
          "What do people often turn to you for?",
          "When you are at your best, what strengths tend to show up?",
        ],
      },
    ],
    prompt: "Which of those questions gave you the clearest answer — and what core strength did it point to?",
    placeholder: "The energy question pointed me toward curiosity and love of learning.",
  },
  {
    id: "m5",
    mode: "chat",
    title: "Spotting the strengths of your students",
    sections: [
      {
        heading: "Every student has strengths worth discovering",
        body: 'A core strength may become especially visible in a new or difficult situation. If courage is a student’s strength, a useful invitation can be: “What would courage do here?”',
      },
      {
        heading: "Why this matters",
        body: "Knowing about a strength is not enough. Students need concrete experiences of using strengths for themselves and for others, because real successes build competence and wellbeing.",
      },
    ],
    prompt: "Think of one student. What core strength have you noticed in them — even if it doesn't always show up in their schoolwork?",
    placeholder: "One student rarely finishes worksheets quickly, but shows real compassion toward younger students.",
  },
  {
    id: "m6",
    mode: "mc",
    title: "Guiding students to use their own strengths",
    sections: [
      {
        heading: "Awareness isn't enough on its own",
        body: "Knowing core strengths becomes useful when students learn to use them consciously in different situations — for themselves and for others.",
      },
      {
        heading: "Everyday questions worth asking",
        list: [
          '“What went well?”',
          '“Where did you use your strengths?”',
          '“How did you use courage today?”',
          '“How will you use your self-regulation today?”',
        ],
      },
    ],
    prompt: "Which everyday question could you try this week?",
    choices: [
      '“Where did you use your strengths today?”',
      '“What would courage do here?”',
      '“What strengths did you bring to others?”',
    ],
    responses: [
      "Simple and repeatable reflection questions are easier to turn into a classroom habit.",
      "That question turns a strength into a tool a student can intentionally reach for.",
      "That helps students see strengths not only as personal qualities but also as contributions to the group.",
    ],
  },
  {
    id: "m7",
    mode: "chat",
    title: "Giving strength-based feedback",
    sections: [
      {
        heading: "Be specific, and name the strength",
        body: "Positive feedback becomes more useful when it names the strength behind an action rather than only praising the outcome.",
      },
      {
        heading: "Sentence starters to keep handy",
        list: [
          '“I especially noticed your [strength] when…”',
          '“I really appreciate the way you use your [strength] to…”',
          '“I have learned something from the way you use your [strength]…”',
          '“It was wonderful to see your [strength] in action when…”',
        ],
      },
    ],
    prompt: "Using one of the sentence starters, draft a piece of strength-based feedback you could give a student this week.",
    placeholder: '“I especially noticed your kindness when you helped find the missing mittens.”',
  },
  {
    id: "m8",
    mode: "mc",
    title: "Bringing families in to See the Good!",
    sections: [
      {
        heading: "Strength spotting doesn't stop at the school gate",
        body: "Families can help children recognise strengths in everyday life — at home, in hobbies, friendships, learning and challenges. Shared strength language gives children more chances to notice what is good and strong in themselves.",
      },
      {
        heading: "Help families see, name and use strengths",
        body: "Families can also notice strengths across the whole family, talk about how those strengths help in daily life, and practise developing them together.",
      },
    ],
    prompt: "How would you rather start the conversation with families?",
    choices: [
      "A short note home introducing the idea",
      "A simple colouring or reflection task for home",
      "A conversation at pickup or a parent evening",
    ],
    responses: [
      "A short note can be a low-effort way to introduce shared strength language.",
      "A hands-on task can make strength spotting concrete for families straight away.",
      "A face-to-face conversation can open space for richer examples from home and school.",
    ],
  },
];

const STORAGE_KEY = "stg.teacher-course-1.v1";

function TeacherCourse() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState<CourseProgress>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProgress(JSON.parse(saved) as CourseProgress);
    } catch {
      // A corrupted local draft should never block the course.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Persistence is a convenience; the course remains usable without it.
    }
  }, [progress]);

  const completed = useMemo(() => MODULES.filter((module) => progress[module.id]?.done).length, [progress]);
  const module = MODULES[active];
  const state = progress[module.id] ?? {};

  const update = (patch: ModuleProgress) =>
    setProgress((current) => ({ ...current, [module.id]: { ...(current[module.id] ?? {}), ...patch } }));

  async function submitReflection() {
    if (module.mode !== "chat" || !state.answer?.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const reply = await requestStgFollowup({
        moduleTitle: `Module ${active + 1} — ${module.title}`,
        reflectionPrompt: module.prompt,
        answer: state.answer.trim(),
      });
      update({ compliment: reply.compliment, question: reply.question });
    } catch {
      setError("Kaisa could not respond just now. Your reflection is saved; you can try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitClarification() {
    if (module.mode !== "chat" || !state.answer || !state.question || !state.clarification?.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const reply = await requestStgClose({
        moduleTitle: `Module ${active + 1} — ${module.title}`,
        reflectionPrompt: module.prompt,
        answer: state.answer,
        question: state.question,
        clarification: state.clarification.trim(),
      });
      update({ thanks: reply.thanks, done: true });
    } catch {
      setError("Kaisa could not respond just now. Your answer is saved; you can try again.");
    } finally {
      setBusy(false);
    }
  }

  function choose(index: number) {
    if (module.mode !== "mc") return;
    update({ choice: index, done: true });
  }

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#26302c]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fffdf9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#dd4e43]">See the Good!</p>
            <p className="font-semibold">Teacher Course 1: Basics</p>
          </div>
          <div className="flex min-w-48 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eaf7f2]">
              <div className="h-full rounded-full bg-[#6fc2ad] transition-all" style={{ width: `${(completed / MODULES.length) * 100}%` }} />
            </div>
            <span className="text-sm font-semibold text-[#63736c]">{completed}/8</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2 lg:sticky lg:top-24 lg:self-start">
          {MODULES.map((item, index) => {
            const done = progress[item.id]?.done;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActive(index); setError(""); }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  index === active ? "border-[#6fc2ad] bg-[#eaf7f2]" : "border-black/10 bg-white hover:border-[#afe1d3]"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-[#efeafb] text-[#6f58b0]" : "bg-[#eaf7f2]"}`}>
                  {done ? "✓" : index + 1}
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wide text-[#63736c]">Module {index + 1}</span>
                  <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <section>
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#dd4e43]">Module {active + 1} of 8</p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{module.title}</h1>
          </div>

          <div className="space-y-4">
            {module.sections.map((section) => (
              <article key={section.heading} className="rounded-[22px] border border-black/10 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-[#dd4e43]">{section.heading}</h2>
                {section.body && <p className="leading-7">{section.body}</p>}
                {section.list && (
                  <ul className="list-disc space-y-2 pl-5 leading-7">
                    {section.list.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </article>
            ))}
          </div>

          {module.mode === "mc" ? (
            <div className="mt-5 rounded-[22px] border border-[#f0b93e]/40 bg-[#fdf3dc] p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#dd4e43]">Try it yourself</p>
              <h2 className="mb-4 text-xl font-bold">{module.prompt}</h2>
              <div className="space-y-2">
                {module.choices.map((choice, index) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => choose(index)}
                    className={`w-full rounded-2xl border-2 bg-white p-4 text-left transition ${state.choice === index ? "border-[#f2665a]" : "border-black/10 hover:border-[#f2665a]"}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {state.choice !== undefined && (
                <div className="mt-4 rounded-2xl border border-[#afe1d3] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6fc2ad]">Kaisa</p>
                  <p className="mt-1 leading-7">{module.responses[state.choice]}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-[#f0b93e]/40 bg-[#fdf3dc] p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#dd4e43]">Reflect with Kaisa</p>
              <h2 className="mb-4 text-xl font-bold">{module.prompt}</h2>
              <textarea
                value={state.answer ?? ""}
                onChange={(event) => update({ answer: event.target.value, compliment: undefined, question: undefined, clarification: undefined, thanks: undefined, done: false })}
                disabled={Boolean(state.question)}
                placeholder={module.placeholder}
                className="min-h-28 w-full rounded-2xl border-2 border-[#f0b93e]/50 bg-white p-4 outline-none focus:border-[#f2665a] disabled:opacity-70"
              />
              {!state.question && (
                <button
                  type="button"
                  disabled={busy || !state.answer?.trim()}
                  onClick={submitReflection}
                  className="mt-3 rounded-full bg-[#26302c] px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                  {busy ? "Kaisa is thinking…" : "Continue reflection"}
                </button>
              )}

              {state.question && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#afe1d3] bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6fc2ad]">Kaisa</p>
                    <p className="mt-1 leading-7">{state.compliment}</p>
                    <p className="mt-3 font-semibold leading-7">{state.question}</p>
                  </div>
                  <textarea
                    value={state.clarification ?? ""}
                    onChange={(event) => update({ clarification: event.target.value, thanks: undefined, done: false })}
                    disabled={Boolean(state.thanks)}
                    placeholder="Write a short answer…"
                    className="min-h-24 w-full rounded-2xl border-2 border-[#afe1d3] bg-white p-4 outline-none focus:border-[#6fc2ad] disabled:opacity-70"
                  />
                  {!state.thanks && (
                    <button
                      type="button"
                      disabled={busy || !state.clarification?.trim()}
                      onClick={submitClarification}
                      className="rounded-full bg-[#26302c] px-5 py-3 font-bold text-white disabled:opacity-40"
                    >
                      {busy ? "Kaisa is thinking…" : "Finish reflection"}
                    </button>
                  )}
                  {state.thanks && (
                    <div className="rounded-2xl border border-[#f0b93e]/50 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#dd4e43]">Kaisa</p>
                      <p className="mt-1 leading-7">{state.thanks}</p>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="mt-3 text-sm font-semibold text-[#dd4e43]">{error}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={active === 0}
              onClick={() => setActive((value) => Math.max(0, value - 1))}
              className="rounded-full border border-black/15 bg-white px-5 py-3 font-semibold disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={active === MODULES.length - 1}
              onClick={() => setActive((value) => Math.min(MODULES.length - 1, value + 1))}
              className="rounded-full border border-black/15 bg-white px-5 py-3 font-semibold disabled:opacity-30"
            >
              Next →
            </button>
          </div>

          {completed === MODULES.length && (
            <div className="mt-8 rounded-[22px] border-2 border-[#f0b93e] bg-white p-7 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#dd4e43]">Course complete</p>
              <h2 className="mt-2 text-2xl font-extrabold">All eight modules completed</h2>
              <p className="mt-2 text-[#63736c]">Your See the Good! Teacher Course 1 progress is complete.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
