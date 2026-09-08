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
   - `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` / `MAILJET_FROM_EMAIL` / `MAILJET_FROM_NAME` — optional; set these to email participants their token from **Access & tokens → Kirim token via email**. The sender address must be a verified Mailjet sender. Leave blank to disable — the UI shows a "not configured" state.
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
2. Add the same environment variables from `.env` in the Vercel project settings (use your Neon/production Postgres URL, a fresh `SESSION_SECRET`, and set `NEXT_PUBLIC_APP_URL` to your Vercel domain).
3. Vercel runs `npm run build` (which runs `prisma generate` first) automatically.
4. Run `npm run db:push && npm run db:seed` once against the production `DATABASE_URL` (e.g. from your local machine with the prod URL set) to create the schema and your first admin login.

## Notes / intentional simplifications

- Admin auth is a single-role login (no user management UI) — add admins directly via `prisma.admin.create` or another seed run if you need more than one.
- Device fingerprinting is a simple per-browser random ID stored in `localStorage`; it blocks re-registering the same token from a second device but isn't tamper-proof against a determined user clearing storage. Combined with one-vote-per-stage at the DB level, this matches the mockup's stated guarantees.
- QR code generation on the tokens page is a placeholder — wire in a QR library (e.g. `qrcode`) if you want a scannable code instead of typed tokens.
