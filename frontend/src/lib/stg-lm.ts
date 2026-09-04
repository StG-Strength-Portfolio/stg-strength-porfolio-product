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

export type ReflectionFollowupReply = {
  compliment: string;
  question: string;
  model: "STG-LM-1";
  mode: "live" | "deterministic";
  knowledgeIds?: string[];
};

export type ReflectionCloseReply = {
  thanks: string;
  model: "STG-LM-1";
  mode: "live" | "deterministic";
  knowledgeIds?: string[];
};

async function post<T>(input: StgLmInput): Promise<T> {
  const response = await fetch("/api/stg-lm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`STG-LM request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function askStgLm(input: StgLmInput) {
  return post<ReflectionFollowupReply | ReflectionCloseReply>(input);
}

export function requestStgFollowup(input: {
  language?: StgLmLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
}) {
  return post<ReflectionFollowupReply>({
    task: "reflection_followup",
    language: input.language ?? "en",
    moduleTitle: input.moduleTitle,
    reflectionPrompt: input.reflectionPrompt,
    answer: input.answer,
  });
}

export function requestStgClose(input: {
  language?: StgLmLanguage;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
  question: string;
  clarification: string;
}) {
  return post<ReflectionCloseReply>({
    task: "reflection_close",
    language: input.language ?? "en",
    moduleTitle: input.moduleTitle,
    reflectionPrompt: input.reflectionPrompt,
    answer: input.answer,
    question: input.question,
    clarification: input.clarification,
  });
}
