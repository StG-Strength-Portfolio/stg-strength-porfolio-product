import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { ensureAgeoFont } from "@/lib/ageo-font";

import appCss from "../styles.css?url";
import schoolAdminMetricsCss from "../styles/school-admin-metrics.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const DOCUMENT_TITLE = {
  fi: "Vahvuusportfolio",
  en: "Strength Portfolio",
  sv: "Styrkeportfolio",
} as const;

const LANGUAGE_STORAGE_KEY = "student_language";
const FINNISH_DOMAIN = "vahvuusportfolio.fi";

function applyHostnameLanguageDefault() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) return;

  const hostname = window.location.hostname.toLowerCase().replace(/\.$/, "");
  const isFinnishDomain =
    hostname === FINNISH_DOMAIN || hostname.endsWith(`.${FINNISH_DOMAIN}`);

  if (isFinnishDomain) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fi");
  }
}

function LocalizedDocumentTitle() {
  const { language } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    document.title = DOCUMENT_TITLE[language];
    document.documentElement.lang = language;
  }, [language, pathname]);

  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Strength Portfolio" },
      { name: "description", content: "Digitaalinen vahvuusportfolio lukiolaiselle." },
      { property: "og:title", content: "Vahvuusportfolio" },
      { property: "og:description", content: "Digitaalinen vahvuusportfolio lukiolaiselle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Vahvuusportfolio" },
      { name: "twitter:description", content: "Digitaalinen vahvuusportfolio lukiolaiselle." },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4b7dc069-b709-4271-9829-d897597a5143/id-preview-8b285e5b--296c2e6a-eba3-4f80-8a32-dc17ef466616.lovable.app-1782209552390.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4b7dc069-b709-4271-9829-d897597a5143/id-preview-8b285e5b--296c2e6a-eba3-4f80-8a32-dc17ef466616.lovable.app-1782209552390.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: schoolAdminMetricsCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  applyHostnameLanguageDefault();

  useEffect(() => {
    void ensureAgeoFont();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LocalizedDocumentTitle />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-center" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}