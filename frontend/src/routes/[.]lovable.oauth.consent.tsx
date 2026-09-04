import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { CornerBlobs } from "@/components/CornerBlobs";
import { useTr } from "@/lib/i18n";

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// The supabase.auth.oauth namespace is beta; wrap with a local typed shim.
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) {
      throw redirect({ to: "/auth/login", search: { next } as never });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="p-8">
      Emme voineet ladata pyyntöä: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const tr = useTr();
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? tr("sovellus");

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError(tr("Palvelin ei palauttanut uudelleenohjausta."));
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-6">
      <CornerBlobs />
      <StickyNote className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">
          {tr("Yhdistä {name} tiliisi", { name: clientName })}
        </h1>
        <p className="mb-4">
          {tr(
            "{name} pyytää lupaa käyttää Huomaa Hyvä -sovellusta sinun nimissäsi. Näkyviin tulevat vain sinun omat tietosi.",
            { name: clientName },
          )}
        </p>
        {error && (
          <p role="alert" className="mb-3 text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)}>
            {tr("Hyväksy")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            {tr("Hylkää")}
          </Button>
        </div>
      </StickyNote>
    </main>
  );
}
