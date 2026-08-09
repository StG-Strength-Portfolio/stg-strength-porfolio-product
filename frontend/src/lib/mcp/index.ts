import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import getMyProgress from "./tools/get-my-progress";
import listMyResponses from "./tools/list-my-responses";
import listMyClasses from "./tools/list-my-classes";
import listClassStudents from "./tools/list-class-students";

// The OAuth issuer must be the direct Supabase host — never the .lovable.cloud
// proxy — because mcp-js verifies tokens against the issuer's discovery document
// (RFC 8414). VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "huomaa-hyva-mcp",
  title: "Huomaa Hyvä — Vahvuusseikkailu",
  version: "0.1.0",
  instructions:
    "Tools for the Huomaa Hyvä strengths workbook. Students can read their own progress and workbook responses. Teachers can list their classes and see student progress for classes they own. All access is scoped to the signed-in user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, getMyProgress, listMyResponses, listMyClasses, listClassStudents],
});
