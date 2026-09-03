export interface Env {
  AI: Ai;
  STG_LORA_NAME?: string;
  STG_BASE_MODEL?: string;
  STG_LM_MODE?: string;
}

type FollowupRequest = {
  task: "reflection_followup";
  language?: "en" | "fi" | "sv";
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
};

type CloseRequest = {
  task: "reflection_close";
  language?: "en" | "fi" | "sv";
  moduleTitle: string;
  reflectionPrompt: string;
  answer: string;
  question: string;
  clarification: string;
};

type StgLmRequest = FollowupRequest | CloseRequest;

type FollowupResponse = { compliment: string; question: string };
type CloseResponse = { thanks: string };

type ModelRunResult = {
  response?: string;
  result?: { response?: string };
  text?: string;
};

const DEFAULT_MODEL = "@cf/google/gemma-7b-it-lora";
const MAX_INPUT_CHARS = 5000;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clampText(value: unknown, max = MAX_INPUT_CHARS): string {
  return String(value ?? "").trim().slice(0, max);
}

function languageLabel(language: StgLmRequest["language"]): string {
  if (language === "fi") return "Finnish";
  if (language === "sv") return "Swedish";
  return "English";
}

function fallbackFollowup(language: StgLmRequest["language"]): FollowupResponse {
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

function fallbackClose(language: StgLmRequest["language"]): CloseResponse {
  if (language === "fi") {
    return { thanks: "Kiitos pohdinnasta — tuollainen pieni, tietoinen huomio on juuri se, josta vahvuuskieli kasvaa." };
  }
  if (language === "sv") {
    return { thanks: "Tack för reflektionen — sådana små, medvetna iakttagelser är precis det som får styrkespråket att växa." };
  }
  return { thanks: "Thank you for reflecting — small, deliberate observations like that are exactly how strength language grows." };
}

function validateRequest(body: unknown): StgLmRequest | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const task = raw.task;
  if (task !== "reflection_followup" && task !== "reflection_close") return null;

  const common = {
    task,
    language: raw.language === "fi" || raw.language === "sv" ? raw.language : "en",
    moduleTitle: clampText(raw.moduleTitle, 300),
    reflectionPrompt: clampText(raw.reflectionPrompt, 1200),
    answer: clampText(raw.answer, 2500),
  } as const;

  if (!common.moduleTitle || !common.reflectionPrompt || !common.answer) return null;

  if (task === "reflection_followup") return common;

  const question = clampText(raw.question, 1000);
  const clarification = clampText(raw.clarification, 2500);
  if (!question || !clarification) return null;
  return { ...common, task, question, clarification };
}

function systemPrompt(req: StgLmRequest): string {
  const language = languageLabel(req.language);
  const common = [
    "You are STG-LM-1, the narrow See the Good language model for a strengths-based online course for educators.",
    `Write in ${language}.`,
    "Your job is reflection support, not general chat.",
    "Stay inside the supplied course module and strengths-based education context.",
    "Reference concrete details from the teacher's own words; never use generic praise when a specific detail is available.",
    "Do not diagnose, label, rank, score, or make clinical claims about a teacher, student, child, family, or colleague.",
    "Do not invent research, citations, facts, or personal details.",
    "Do not ask for names or identifying information about students.",
    "Keep the tone warm, human, concise, practical, and non-judgmental.",
  ];

  if (req.task === "reflection_followup") {
    return [
      ...common,
      'Return ONLY compact JSON with exactly two keys: {"compliment":"...","question":"..."}.',
      "compliment: one short sentence tied to a specific detail in the teacher answer.",
      "question: one short curious question that goes one layer deeper or makes the reflection more concrete.",
      "Keep both fields together under 45 words in English-equivalent length.",
    ].join("\n");
  }

  return [
    ...common,
    'Return ONLY compact JSON with exactly one key: {"thanks":"..."}.',
    "thanks: one warm sentence that specifically affirms something in the teacher's latest clarification.",
    "Keep it under 25 words in English-equivalent length.",
  ].join("\n");
}

function userPrompt(req: StgLmRequest): string {
  const lines = [
    `Module: ${req.moduleTitle}`,
    `Reflection prompt: ${req.reflectionPrompt}`,
    `Teacher answer: ${req.answer}`,
  ];
  if (req.task === "reflection_close") {
    lines.push(`STG-LM follow-up question: ${req.question}`);
    lines.push(`Teacher follow-up answer: ${req.clarification}`);
  }
  return lines.join("\n");
}

function modelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const r = result as ModelRunResult;
  return String(r.response ?? r.result?.response ?? r.text ?? "").trim();
}

function parseFollowup(text: string): FollowupResponse | null {
  try {
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const data = JSON.parse(clean) as Record<string, unknown>;
    const compliment = clampText(data.compliment, 600);
    const question = clampText(data.question, 600);
    if (!compliment || !question) return null;
    return { compliment, question };
  } catch {
    return null;
  }
}

function parseClose(text: string): CloseResponse | null {
  try {
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const data = JSON.parse(clean) as Record<string, unknown>;
    const thanks = clampText(data.thanks, 600);
    if (!thanks) return null;
    return { thanks };
  } catch {
    return null;
  }
}

async function runModel(env: Env, req: StgLmRequest): Promise<FollowupResponse | CloseResponse> {
  const fallback = req.task === "reflection_followup" ? fallbackFollowup(req.language) : fallbackClose(req.language);

  // Until the reviewed STG-LM-1 adapter is uploaded, the endpoint is fully functional
  // but deterministic. This also prevents accidental paid inference during development.
  if (env.STG_LM_MODE !== "live" || !env.STG_LORA_NAME) return fallback;

  const model = env.STG_BASE_MODEL || DEFAULT_MODEL;
  try {
    const result = await env.AI.run(model as Parameters<Ai["run"]>[0], {
      messages: [
        { role: "system", content: systemPrompt(req) },
        { role: "user", content: userPrompt(req) },
      ],
      lora: env.STG_LORA_NAME,
      max_tokens: req.task === "reflection_followup" ? 180 : 100,
      temperature: 0.35,
      top_p: 0.9,
    } as never);

    const text = modelText(result);
    if (req.task === "reflection_followup") return parseFollowup(text) ?? fallback;
    return parseClose(text) ?? fallback;
  } catch (error) {
    console.error("[STG-LM] inference failed", error);
    return fallback;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        model: "STG-LM-1",
        mode: env.STG_LM_MODE === "live" && env.STG_LORA_NAME ? "live" : "deterministic",
      });
    }

    if (request.method !== "POST" || url.pathname !== "/api/stg-lm") {
      return json({ error: "not_found" }, 404);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const req = validateRequest(raw);
    if (!req) return json({ error: "invalid_request" }, 400);

    const response = await runModel(env, req);
    return json({ ...response, model: "STG-LM-1" });
  },
} satisfies ExportedHandler<Env>;
