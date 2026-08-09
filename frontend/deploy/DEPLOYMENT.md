# Vahvuusseikkailu — Self-Hosting & Deployment Guide

This guide walks you from an empty Supabase project + empty hosting account to a fully running, independent copy of Vahvuusseikkailu.

Stack:

- **Frontend**: TanStack Start (React 19 + Vite 7), Tailwind v4
- **Backend**: Supabase (Postgres + Auth + Realtime). All app logic runs inside TanStack `createServerFn` — no Edge Functions required.

You will need:

- A GitHub account (for the codebase)
- A Supabase account (free tier is fine) **or** a self-hosted Postgres with the Supabase auth schema
- A hosting provider for the frontend (Vercel, Netlify, Cloudflare Pages, or your own Node host)
- Node 20+ and `bun` (or `npm`) locally for build/test

---

## 1. Create a fresh Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name (e.g. `vahvuusseikkailu`), generate a strong DB password, choose a region close to your students, click **Create**.
3. Wait ~2 minutes for provisioning.
4. From **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **Project Ref** (the subdomain part) → `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`
   - **Publishable / anon key** → `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Service role key** (only if you plan to add admin server functions) → `SUPABASE_SERVICE_ROLE_KEY`

> **Self-hosted Postgres alternative**: any Postgres 15+ with the Supabase `auth` schema installed (e.g. via the Supabase self-host docker bundle) will work. The rest of the steps are identical; replace the dashboard URLs with your self-hosted Studio URL.

---

## 2. Run the database schema

1. Open the Supabase dashboard → **SQL Editor → New query**.
2. Paste the entire contents of `deploy/schema.sql`.
3. Click **Run**.

The script is idempotent-safe on a fresh DB and creates:

- 7 tables: `profiles`, `user_roles`, `classes`, `class_members`, `responses`, `share_links`, `external_responses`
- RLS policies enforcing the privacy invariant (students only see their own data; teachers see only their own classes; anon has no direct table access)
- RPCs: `claim_teacher_role`, `join_class`, `submit_external_response`, `get_share_link_info`, `has_role`, `is_teacher_of`
- A trigger that creates a `profiles` row + default `student` role on every new signup
- Adds `responses` to the `supabase_realtime` publication for live progress updates

Verify: in **Table Editor** you should see all 7 tables, each with the green "RLS enabled" badge.

---

## 3. Configure Auth (email/password, no email confirmation)

In **Authentication → Providers**:

1. **Email**: Enabled ✅
2. **Confirm email**: **Off** (so students can sign in immediately after signup)
3. **Secure email change**: On (recommended)
4. Disable any other providers you do not use (Google, etc.) unless you've configured them.

In **Authentication → URL Configuration**:

- **Site URL**: your production frontend URL (e.g. `https://vahvuusseikkailu.example.com`)
- **Redirect URLs**: add the same URL, plus `http://localhost:8080` for local dev.

(Optional) In **Authentication → Policies → Password**: enable **HIBP leaked-password protection**.

---

## 4. Promote your first teacher account

Two options:

- **Easiest**: sign up normally in the app, then go to `/auth/opettaja`, enter the teacher code **`OPETTAJA-2026`**. (You can rotate the code by editing `v_expected` inside `claim_teacher_role` in `schema.sql` and re-running just that function.)
- **Manual**: after signing up, run in the SQL Editor:
  ```sql
  UPDATE public.user_roles SET role = 'teacher'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
  ```

---

## 5. Get the codebase onto GitHub

From inside Lovable, open the **+** menu (bottom-left of the chat) → **GitHub → Connect project** → authorize the Lovable GitHub App → choose the GitHub org/user → **Create Repository**. Lovable will push the full codebase and keep it bidirectionally synced.

If you'd rather start fully detached: download the code via **Code Editor → Download codebase** (paid workspace), then `git init && git remote add origin … && git push` to your own repo.

---

## 6. Configure environment variables

Copy `deploy/.env.example` to `.env` (for local dev) and fill in the values from step 1.

On your hosting provider, set the same variables as project / deployment environment variables. **`SUPABASE_SERVICE_ROLE_KEY` must be marked server-only / secret** — never expose it to the browser.

---

## 7. Build and deploy the frontend

### Local sanity check

```bash
bun install         # or: npm install
bun run dev         # http://localhost:8080
bun run build       # produces .output/
```

### Vercel

1. **New Project** → import your GitHub repo.
2. **Framework preset**: Other (Vercel auto-detects TanStack Start).
3. **Build command**: `bun run build` (or `npm run build`)
4. **Output directory**: `.output/public`
5. **Install command**: `bun install` (or `npm install`)
6. Add all variables from `.env.example` under **Settings → Environment Variables**.
7. Deploy.

### Netlify

1. **Add new site → Import from Git**.
2. Build command: `bun run build`, Publish directory: `.output/public`.
3. Add env vars under **Site settings → Environment variables**.
4. Deploy.

### Self-hosted (Node)

```bash
bun run build
node .output/server/index.mjs
```

Put it behind a reverse proxy (nginx/Caddy) terminating TLS on your domain.

### Cloudflare Pages / Workers

TanStack Start ships a Worker-compatible build. Use the Pages "TanStack Start" preset; set the same env vars in the Pages dashboard.

After the first deploy, return to step 3 and put your production URL into **Auth → URL Configuration**.

---

## 8. Smoke-test the deployed app

1. Open the production URL → land on `/auth`.
2. Click **Rekisteröidy** → fill name + email + password → submit. You should land on `/seikkailu`.
3. Confirm the world map renders and progress autosaves (open S1, type into the textarea, refresh — text persists).
4. Sign out, sign back in via `/auth/login`.
5. Visit `/auth/opettaja`, enter code `OPETTAJA-2026` → you should be redirected to `/opettaja` with the teacher dashboard.
6. As a teacher: create a class, copy the join code. As a different student account: sign up and visit `/auth/student` (or run the join flow) to confirm the student appears in the teacher roster with a real display name.
7. Click **Näytä portfolio** → student responses render read-only and the **Tulosta Portfolio** button opens print preview.

If something fails, check:

- Browser console for `VITE_SUPABASE_*` undefined → env vars not set on host
- Supabase **Logs → API** for 401/403 → check RLS policies were created (re-run `schema.sql`)
- `auth.users` exists but `public.profiles` is empty → the `on_auth_user_created` trigger didn't run (re-create with the trigger block from `schema.sql`)

---

## 9. You are independent

At this point your data lives in **your** Supabase project, your code lives in **your** GitHub repo, and your frontend runs on **your** hosting account. You can keep using Lovable for further development (sync is bidirectional), or detach entirely — the project is a standard TanStack Start app and will build anywhere Node 20 runs.

Files in this folder:

- `schema.sql` — single-file Postgres setup
- `.env.example` — variable template
- `DEPLOYMENT.md` — this guide
