export function missingSupabaseEnvMessage(missing: string[]): string {
  return `Missing Supabase environment variable(s): ${missing.join(", ")}. Configure these variables in your deployment host runtime environment.`;
}
