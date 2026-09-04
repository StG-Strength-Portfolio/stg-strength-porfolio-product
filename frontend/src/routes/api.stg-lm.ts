import { createFileRoute } from "@tanstack/react-router";
import { runStgLm, type StgLmRequest } from "@/lib/stg-lm.server";

const MAX_BODY_BYTES = 12_000;
const COURSE_MODULES = new Set([
  "Module 2 — The language of strengths",
  "Module 4 — Discover your own core strengths",
  "Module 5 — Spotting the strengths of your students",
  "Module 7 — Giving strength-based feedback",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function isLanguage(value: unknown): value is "en" | "fi" | "sv" {
  return value === "en" || value === "fi" || value === "sv";
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function validate(raw: unknown): StgLmRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const task = input.task;
  const language = isLanguage(input.language) ? input.language : "en";
  const moduleTitle = clean(input.moduleTitle, 120);
  const reflectionPrompt = clean(input.reflectionPrompt, 900);
  const answer = clean(input.answer, 1800);

  // STG-LM is intentionally not a general chat endpoint. Only the course
  // modules designed for reflective language-model interaction are accepted.
  if (!COURSE_MODULES.has(moduleTitle) || !reflectionPrompt || !answer) return null;

  if (task === "reflection_followup") {
    return { task, language, moduleTitle, reflectionPrompt, answer };
  }

  if (task === "reflection_close") {
    const question = clean(input.question, 700);
    const clarification = clean(input.clarification, 1800);
    if (!question || !clarification) return null;
    return { task, language, moduleTitle, reflectionPrompt, answer, question, clarification };
  }

  return null;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export const Route = createFileRoute("/api/stg-lm")({
  server: {
    handlers: {
      GET: async () => json({ ok: true, model: "STG-LM-1", scope: "teacher-course-reflections" }),
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
          return json({ error: "request_too_large" }, 413);
        }

        let raw: unknown;
        try {
          const text = await request.text();
          if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
            return json({ error: "request_too_large" }, 413);
          }
          raw = JSON.parse(text);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const body = validate(raw);
        if (!body) return json({ error: "invalid_request" }, 400);

        const result = await runStgLm(body);
        return json(result);
      },
    },
  },
});
