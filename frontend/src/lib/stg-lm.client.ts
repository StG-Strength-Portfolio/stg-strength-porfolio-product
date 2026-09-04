export type StgLanguage = "en" | "fi" | "sv";

export type FollowupReply = {
  compliment: string;
  question: string;
  model: "STG-LM-1";
  mode: "live" | "deterministic";
  knowledgeIds: string[];
};

export type CloseReply = {
  thanks: string;
  model: "STG-LM-1";
  mode: "live" | "deterministic";
  knowledgeIds: string[];
};

async function post<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/stg-lm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`STG-LM request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function requestStgFollowup(input: {
  language?: StgLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
}) {
  return post<FollowupReply>({
    task: "reflection_followup",
    language: input.language ?? "en",
    moduleTitle: input.moduleTitle,
    reflectionPrompt: input.reflectionPrompt,
    answer: input.answer,
  });
}

export function requestStgClose(input: {
  language?: StgLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
  question: string;
  clarification: string;
}) {
  return post<CloseReply>({
    task: "reflection_close",
    language: input.language ?? "en",
    moduleTitle: input.moduleTitle,
    reflectionPrompt: input.reflectionPrompt,
    answer: input.answer,
    question: input.question,
    clarification: input.clarification,
  });
}
