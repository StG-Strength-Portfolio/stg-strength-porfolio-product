# Lovable Changelog

## 2026-08-04 — Bug fixes, Sprint completion, Teach section, Canva slides

### Bug fixes

- `src/components/reports/ReportTrends.tsx` — strength growth tooltip resolved
  real strength names instead of `Strength NaN`; "Näytä kaikki" / "Näytä top 10"
  now go through `tr()`.

### Strength Sprint (Parts C–F)

- **New** `src/routes/_authenticated/student/sprint.tsx` — student join code,
  realtime waiting room, one-by-one classmate rating, results with auto-collect.
- **New** `src/routes/_authenticated/student/give-strength.tsx` — student → own
  class teacher gifting.
- **New** `src/routes/school-admin.give-strength.tsx` — principal → any teacher
  in the school.
- **New** `src/routes/teacher.received-strengths.tsx` — teacher feed + Top 5 of
  strengths received from students and the principal.
- `src/lib/sprint.functions.ts`, `src/lib/give-strength.functions.ts` — server
  functions backing the above (created 2026-07-31).
- `src/components/strengths/StrengthPickerGrid.tsx` — shared 26-strength picker.

### Teach section (Part 3)

- **New** `src/components/teach/PresentationOverlay.tsx` — shared fullscreen
  projector (arrow keys, click zones, auto-hiding toolbar, Esc to exit).
- **New** `src/routes/teacher.teach.portfolio.tsx` — all 106 adventure screens
  grouped by level, read-only fullscreen presentation.
- **New** `src/components/teach/MaterialsGrid.tsx` — trilingual deck browser
  (exported slide images, Canva embed fallback).
- **New** `src/routes/teacher.teach.materials.tsx` and
  `src/routes/school-admin.teach.materials.tsx` — teacher/principal access.
- **New** `src/components/superadmin/TeachingMaterialsTab.tsx` — super admin
  import/edit/publish/reorder/delete of Canva decks. Accepts a Canva design ID
  or share link plus optional exported slide image URLs.
- Database: `public.teaching_presentations` with RLS (authenticated users read
  published rows, super admins manage everything).

### Navigation & i18n (Parts G + wiring)

- `src/components/DashboardShell.tsx` — new `sections` prop for grouped sidebar
  links (used by the "Opeta" / Teach group).
- `src/components/AppSidebar.tsx` — student links for Strength Game and
  "Give strength to your teacher".
- `src/routes/teacher.dashboard.tsx` — Sprint, Received strengths, Teach group.
- `src/routes/school-admin.dashboard.tsx` — Give strength, Teach group.
- `src/routes/superadmin.dashboard.tsx` — new "Opetusmateriaalit" tab.
- `src/lib/i18n/translations-generated.json` — 58 new FI/EN/SV keys for sprint,
  gifting, teach and materials management.

## 2026-07-31 — Strength Sprint foundations

- Database: `sprint_sessions`, `sprint_players`, `sprint_strengths` with RLS and
  Realtime; bidirectional columns on `teacher_assigned_strengths`
  (`from_role`, `to_role`, `from_user_id`, `to_user_id`).
- **New** `src/lib/sprint.functions.ts`, `src/lib/give-strength.functions.ts`,
  `src/components/strengths/StrengthPickerGrid.tsx`, `src/routes/teacher.sprint.tsx`.
- `src/components/DashboardShell.tsx` — `links` prop for route-based sidebar items.
