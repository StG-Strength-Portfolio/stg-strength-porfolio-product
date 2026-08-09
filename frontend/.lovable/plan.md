## Fix: "Näytä portfolio" navigates but page doesn't change

### Root cause

TanStack flat routing nests `opettaja.oppilas.$userId.tsx` under `opettaja.tsx`. The parent must render `<Outlet />` for the child to appear. Currently `opettaja.tsx` renders the dashboard UI directly with no outlet, so:

- URL correctly changes to `/opettaja/oppilas/1c373bf5-…`
- Route matches
- But the dashboard component keeps rendering and the portfolio component never mounts

### Change

Split the teacher dashboard into a layout + index:

1. **Rename** `src/routes/_authenticated/opettaja.tsx` → `src/routes/_authenticated/opettaja.index.tsx`
   - Update `createFileRoute("/_authenticated/opettaja")` to `createFileRoute("/_authenticated/opettaja/")` (TanStack's index convention)
   - No other changes to the dashboard code
2. **Create** a new `src/routes/_authenticated/opettaja.tsx` containing only a layout:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/_authenticated/opettaja")({
     component: () => <Outlet />,
   });
   ```

That's it — no changes to the portfolio file, no DB/RLS changes, no role-check changes. `routeTree.gen.ts` regenerates automatically.

### Why this works

- `/opettaja` keeps rendering the dashboard (now via the index leaf inside the new layout's outlet)
- `/opettaja/oppilas/$userId` renders the portfolio inside the same outlet, replacing the dashboard

### Verification

- Sign in as teacher → `/opettaja` shows roster (unchanged)
- Click "Näytä portfolio" on Louis Bui → page swaps to the portfolio for `1c373bf5-…`
- "Takaisin" returns to `/opettaja`
