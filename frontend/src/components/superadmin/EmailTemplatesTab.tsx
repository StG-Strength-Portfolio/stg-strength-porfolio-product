/**
 * Monthly email content is managed in Resend, not inside Strength Portfolio.
 *
 * This component intentionally renders nothing so the existing Super Admin
 * dashboard can keep its email analytics section without exposing the legacy
 * Supabase email_templates editor. The legacy table/data remains untouched for
 * rollback/history and is no longer part of the active editing workflow.
 */
export function EmailTemplatesTab() {
  return null;
}
