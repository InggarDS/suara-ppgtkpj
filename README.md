# Suara — Multi-stage voting platform

Admin dashboard + mobile participant flow for running multi-stage organizational elections (built from the "Suara" mockup for PPGT KPJ).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Prisma 6 + PostgreSQL** for persistence (works with Neon, Supabase, or any Postgres)
- Cookie-based admin session auth (JWT via `jose`), no third-party auth provider
- `swr` polling for live monitoring / shared-screen / participant waiting screens (no websocket infra needed)
- Participant photos are stored as compressed base64 strings directly in the database (fine for a few hundred participants; swap for object storage like Vercel Blob if you scale up)

## Local setup

1. **Get a Postgres database.** Easiest is a free [Neon](https://neon.tech) project — copy its pooled connection string.
2. Copy the env file and fill it in:
   ```
   cp .env.example .env
   ```
   - `DATABASE_URL` — your Postgres connection string
   - `SESSION_SECRET` — random string, e.g. `openssl rand -base64 32`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — used only by the seed script to create your first admin login
   - `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` locally, your production URL once deployed (used to build the participant invite link shown to admins)
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` — optional; set these to email participants their token from **Access & tokens → Kirim token via email**. `RESEND_FROM_EMAIL` must be on a domain verified in [Resend](https://resend.com). Leave blank to disable — the UI shows a "not configured" state.
3. Install dependencies and push the schema:
   ```
   npm install
   npm run db:push
   npm run db:seed
   ```
   The seed creates your admin account and one sample event (`evt_001`).
4. Run the app:
   ```
   npm run dev
   ```
   Admin: http://localhost:3000/admin/login
   Participant flow: http://localhost:3000/event/evt_001

## How it works

- **Admin** (`/admin/...`, cookie-authenticated): create events, configure multi-stage voting flows with per-stage thresholds and rules, monitor turnout live, control the projector/shared-screen reveal, generate participant tokens, export the audit log, and reset/archive events.
- **Participants** (`/event/[publicId]`): register once with the personal token an admin generated for them (name + photo, compressed client-side), then wait for their device to poll into the live ballot automatically when a stage opens. One vote per stage is enforced at the database level (`Stage+Participant` unique constraint).
- **Auto-advance**: when a stage's vote count reaches its configured threshold and "auto-advance" is on, the stage closes and the next one opens automatically — no admin action needed. Admins can also close a stage manually at any time.
- **Shared screen**: candidate identities stay hidden ("Candidate A/B/C") until an admin explicitly unlocks them (with a typed confirmation), matching a "results announced in the room, not on phones" ceremony.

## Deploying

This app is built to deploy straight to **Vercel**:

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables from `.env` in the Vercel project settings (a fresh `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL` = your domain, the Resend keys, …).
3. **Database connections on serverless.** Vercel runs many concurrent function instances, each with its own Prisma pool, so a small Postgres will hit `FATAL: too many connections`. Point the production **`DATABASE_URL` at a connection pooler** (PgBouncer / pgbouncer-compatible):
   - Aiven: *Pools* tab → create a transaction-mode pool → use its URI as `DATABASE_URL`.
   - Self-hosted (VPS): run PgBouncer in `transaction` mode on port `6432` and connect through it.
   - Neon/Supabase: use their pooled connection string.
   - Append these params to the pooled `DATABASE_URL`:
     `?sslmode=require&pgbouncer=true&connection_limit=3&pool_timeout=20&connect_timeout=15`
     (`pgbouncer=true` disables prepared statements, required for transaction pooling. `connection_limit=3` keeps a single function instance from serializing its own queries while staying well under the DB's `max_connections` — PgBouncer is the real pool. Raise `pool_timeout` / `connect_timeout` so a slow/distant DB doesn't surface as an unhandled 500.)
   - Set `DIRECT_DATABASE_URL` to a working non-pooled (or same pooled) URL — `prisma generate` needs it present or the build fails.
4. **Function region.** If the database is not in a US region, pin the functions next to it or every request pays a cross-region round trip per query (intermittent pool-timeout 500s: *"A server error occurred. Reload to try again."*). `vercel.json` sets `"regions": ["sin1"]` (Singapore) — change it to whichever [Vercel region](https://vercel.com/docs/edge-network/regions) is closest to your Postgres. Hobby plan allows exactly one region.
5. Vercel runs `npm run build` (which runs `prisma generate` first) automatically.
6. Run `npm run db:push && npm run db:seed` once against the production `DIRECT_DATABASE_URL` to create the schema and your first admin login.

## Notes / intentional simplifications

- Admin auth is a single-role login (no user management UI) — add admins directly via `prisma.admin.create` or another seed run if you need more than one.
- Device fingerprinting is a simple per-browser random ID stored in `localStorage`; it blocks re-registering the same token from a second device but isn't tamper-proof against a determined user clearing storage. Combined with one-vote-per-stage at the DB level, this matches the mockup's stated guarantees.
- QR code generation on the tokens page is a placeholder — wire in a QR library (e.g. `qrcode`) if you want a scannable code instead of typed tokens.
