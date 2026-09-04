import { createFileRoute } from "@tanstack/react-router";
import { runStgLm, type StgLmRequest } from "@/lib/stg-lm.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
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
  const moduleTitle = clean(input.moduleTitle, 300);
  const reflectionPrompt = clean(input.reflectionPrompt, 1200);
  const answer = clean(input.answer, 2500);
  if (!moduleTitle || !reflectionPrompt || !answer) return null;

  if (task === "reflection_followup") {
    return { task, language, moduleTitle, reflectionPrompt, answer };
  }

  if (task === "reflection_close") {
    const question = clean(input.question, 1000);
    const clarification = clean(input.clarification, 2500);
    if (!question || !clarification) return null;
    return { task, language, moduleTitle, reflectionPrompt, answer, question, clarification };
  }

  return null;
}

export const Route = createFileRoute("/api/stg-lm")({
  server: {
    handlers: {
      GET: async () => json({ ok: true, model: "STG-LM-1" }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
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
