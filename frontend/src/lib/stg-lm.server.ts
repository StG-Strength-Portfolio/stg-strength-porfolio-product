import { formatKnowledgeContext, retrieveStgKnowledge } from "./stg-knowledge.server";

type Language = "en" | "fi" | "sv";

type FollowupRequest = {
  task: "reflection_followup";
  language: Language;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
};

type CloseRequest = {
  task: "reflection_close";
  language: Language;
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
  question: string;
  clarification: string;
};

export type StgLmRequest = FollowupRequest | CloseRequest;
export type StgLmResponse =
  | { compliment: string; question: string; model: "STG-LM-1"; mode: "live" | "deterministic"; knowledgeIds: string[] }
  | { thanks: string; model: "STG-LM-1"; mode: "live" | "deterministic"; knowledgeIds: string[] };

type AiBinding = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

type RuntimeEnv = {
  AI?: AiBinding;
  STG_LORA_NAME?: string;
  STG_BASE_MODEL?: string;
  STG_LM_MODE?: string;
};

const DEFAULT_MODEL = "@cf/google/gemma-7b-it-lora";

function env(): RuntimeEnv {
  return ((globalThis as typeof globalThis & { __env__?: RuntimeEnv }).__env__ ?? {}) as RuntimeEnv;
}

function languageName(language: Language) {
  return language === "fi" ? "Finnish" : language === "sv" ? "Swedish" : "English";
}

function fallbackFollowup(language: Language) {
  if (language === "fi") {
    return {
      compliment: "Kiitos — huomasit tilanteessa jotain konkreettista, jonka varaan voi rakentaa.",
      question: "Mitä voisit huomata tai sanoa seuraavan kerran hieman tietoisemmin?",
    };
  }
  if (language === "sv") {
    return {
      compliment: "Tack — du lade märke till något konkret i situationen som går att bygga vidare på.",
      question: "Vad skulle du kunna lägga märke till eller säga ännu mer medvetet nästa gång?",
    };
  }
  return {
    compliment: "Thank you — you noticed something concrete in the situation that you can build on.",
    question: "What could you notice or say a little more deliberately next time?",
  };
}

function fallbackClose(language: Language) {
  if (language === "fi") return { thanks: "Kiitos pohdinnasta — juuri tällaisista pienistä, tietoisista havainnoista vahvuuskieli kasvaa." };
  if (language === "sv") return { thanks: "Tack för reflektionen — just sådana små, medvetna iakttagelser får styrkespråket att växa." };
  return { thanks: "Thank you for reflecting — small, deliberate observations like that are exactly how strength language grows." };
}

function systemPrompt(request: StgLmRequest, hasKnowledge: boolean) {
  const rules = [
    "You are STG-LM-1, the narrow See the Good language model for a strengths-based online course for educators.",
    `Write in ${languageName(request.language)}.`,
    "The supplied APPROVED SEE THE GOOD KNOWLEDGE is authoritative. Use it when making pedagogical claims.",
    "Do not contradict, embellish, or invent See the Good pedagogy beyond the supplied approved knowledge.",
    hasKnowledge
      ? "Ground the response in the teacher's own words and, where relevant, the approved knowledge. Do not mention source IDs to the teacher."
      : "No approved knowledge matched. Do not make new pedagogical or factual claims; respond only to the teacher's own reflection in a neutral reflective way.",
    "Stay inside the supplied module and strengths-based education context.",
    "Reference concrete details from the teacher's words instead of generic praise.",
    "Do not diagnose, label, rank, score, or make clinical claims about people.",
    "Do not invent research, citations, facts, or personal details.",
    "Never ask for identifying information about students.",
    "Be warm, concise, practical, curious, and non-judgmental.",
  ];
  if (request.task === "reflection_followup") {
    rules.push('{"compliment":"...","question":"..."} is the ONLY allowed JSON shape. Return JSON only, with no markdown or extra keys.');
    rules.push("The compliment is one short sentence tied to a specific detail. The question is one short question that goes one layer deeper or more concrete. Keep both fields together under 45 words in English-equivalent length.");
  } else {
    rules.push('{"thanks":"..."} is the ONLY allowed JSON shape. Return JSON only, with no markdown or extra keys.');
    rules.push("The thanks field is one warm sentence tied to the teacher's latest clarification, under 25 words in English-equivalent length.");
  }
  return rules.join("\n");
}

function userPrompt(request: StgLmRequest, knowledgeContext: string) {
  const lines = [
    "APPROVED SEE THE GOOD KNOWLEDGE:",
    knowledgeContext,
    "",
    "CURRENT COURSE REFLECTION:",
    `Module: ${request.moduleTitle}`,
    `Reflection prompt: ${request.reflectionPrompt}`,
    `Teacher answer: ${request.answer}`,
  ];
  if (request.task === "reflection_close") {
    lines.push(`STG-LM follow-up question: ${request.question}`);
    lines.push(`Teacher follow-up answer: ${request.clarification}`);
  }
  return lines.join("\n");
}

function extractText(result: unknown) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const value = result as { response?: unknown; result?: { response?: unknown }; text?: unknown };
  return String(value.response ?? value.result?.response ?? value.text ?? "").trim();
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runStgLm(request: StgLmRequest): Promise<StgLmResponse> {
  const runtime = env();
  const knowledge = retrieveStgKnowledge({
    moduleTitle: request.moduleTitle,
    reflectionPrompt: request.reflectionPrompt,
    answer: request.answer,
    clarification: request.task === "reflection_close" ? request.clarification : undefined,
    language: request.language,
  });
  const knowledgeIds = knowledge.map((chunk) => chunk.id);
  const knowledgeContext = formatKnowledgeContext(knowledge);
  const live = runtime.STG_LM_MODE === "live" && Boolean(runtime.STG_LORA_NAME) && Boolean(runtime.AI);
  const mode = live ? "live" : "deterministic";

  if (!live) {
    return request.task === "reflection_followup"
      ? { ...fallbackFollowup(request.language), model: "STG-LM-1", mode, knowledgeIds }
      : { ...fallbackClose(request.language), model: "STG-LM-1", mode, knowledgeIds };
  }

  try {
    const result = await runtime.AI!.run(runtime.STG_BASE_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: "system", content: systemPrompt(request, knowledge.length > 0) },
        { role: "user", content: userPrompt(request, knowledgeContext) },
      ],
      lora: runtime.STG_LORA_NAME,
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: request.task === "reflection_followup" ? 180 : 100,
    });
    const parsed = parseObject(extractText(result));

    if (request.task === "reflection_followup") {
      const compliment = String(parsed?.compliment ?? "").trim();
      const question = String(parsed?.question ?? "").trim();
      if (compliment && question) return { compliment, question, model: "STG-LM-1", mode, knowledgeIds };
      return { ...fallbackFollowup(request.language), model: "STG-LM-1", mode, knowledgeIds };
    }

    const thanks = String(parsed?.thanks ?? "").trim();
    if (thanks) return { thanks, model: "STG-LM-1", mode, knowledgeIds };
    return { ...fallbackClose(request.language), model: "STG-LM-1", mode, knowledgeIds };
  } catch (error) {
    console.error("[STG-LM-1] inference failed", error);
    return request.task === "reflection_followup"
      ? { ...fallbackFollowup(request.language), model: "STG-LM-1", mode, knowledgeIds }
      : { ...fallbackClose(request.language), model: "STG-LM-1", mode, knowledgeIds };
  }
}
