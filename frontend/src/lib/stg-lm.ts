export type StgLmLanguage = "en" | "fi" | "sv";

export type ReflectionFollowupInput = {
  task: "reflection_followup";
  language: StgLmLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
};

export type ReflectionCloseInput = {
  task: "reflection_close";
  language: StgLmLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
  question: string;
  clarification: string;
};

export type StgLmInput = ReflectionFollowupInput | ReflectionCloseInput;

export async function askStgLm(input: StgLmInput) {
  const response = await fetch("/api/stg-lm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`STG-LM request failed (${response.status})`);
  }

  return (await response.json()) as
    | { compliment: string; question: string; model: "STG-LM-1"; mode: "live" | "deterministic" }
    | { thanks: string; model: "STG-LM-1"; mode: "live" | "deterministic" };
}
