import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type RuntimeEnv = Record<string, string | undefined>;
type ExecutionContextLike = {
  waitUntil?: (promise: Promise<unknown>) => void;
};
type ScheduledControllerLike = {
  scheduledTime?: number;
};
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function exposeRuntimeEnv(env: unknown) {
  if (env && typeof env === "object") {
    (globalThis as { __env__?: RuntimeEnv }).__env__ = env as RuntimeEnv;
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function runScheduledMonthlyReports(
  controller: ScheduledControllerLike,
  env: unknown,
): Promise<void> {
  exposeRuntimeEnv(env);
  const { runMonthlyReports } = await import("./lib/monthly-report.server");
  const runAt = controller.scheduledTime ? new Date(controller.scheduledTime) : new Date();
  const result = await runMonthlyReports(runAt);
  console.log("[monthly-reports]", JSON.stringify(result));
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    exposeRuntimeEnv(env);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  scheduled(controller: ScheduledControllerLike, env: unknown, ctx: ExecutionContextLike) {
    const task = runScheduledMonthlyReports(controller, env).catch((error) => {
      console.error("[monthly-reports] scheduled run failed", error);
      throw error;
    });
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },
};