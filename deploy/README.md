# Deploying Suara to a VPS with Docker

Target: **one VPS** (Biznet, Ubuntu 20.04, `202.155.13.171`) running the
Next.js app + Redis + Caddy in Docker, talking to **host** PostgreSQL 12 through
**host** PgBouncer. Domain `www.suarappgtkpj.site`, currently on Vercel — Vercel
stays live as an instant rollback until DNS is switched.

```
Internet ──443──> caddy (container) ──> app (container) ──6432──> PgBouncer (host) ──5432──> Postgres (host)
                                         │
                                         └──> redis (container, cache)
```

Commands are prefixed **[local]** (your Windows machine, PowerShell) or
**[vps]** (SSH session on the server).

---

## 0. One-time: prerequisites

### 0.1 [vps] Install Docker Engine + Compose plugin

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER          # log out / back in for this to apply
docker version && docker compose version
```

### 0.2 [vps] Add swap (small boxes thrash on image pulls)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 0.3 [vps] Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
# 6432 no longer needs to be open to the internet once the app runs on the VPS:
sudo ufw delete allow 6432/tcp
```

---

## 1. Migrate data Aiven -> host Postgres

The VPS Postgres is **12.22**, Aiven is **18** — `pg_dump` across that gap is not
reliable, so use the Prisma copy script (version-agnostic). Both run **inside a
one-off app container** so you never need `npm install` on the VPS. Do this after
steps 2–3 (repo + `.env` + host DB reachable from the bridge), before step 4.4.

### 1.1 [vps] Create the schema on the host DB

`prisma/schema.sql` is the full DDL, generated from `prisma/schema.prisma`
(regenerate after any schema change with:
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/schema.sql`).
Apply it with `psql` (already installed on the host with Postgres 12) — this
avoids needing the Prisma CLI in the container:

```bash
cd /opt/suara

# fresh schema, owned by the app role (data comes from Aiven in 1.2)
sudo -u postgres psql -d suara -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION suara;"
psql "postgresql://suara:PW@127.0.0.1:5432/suara" -f prisma/schema.sql
```

Connect as `suara` (not `postgres`) so the tables are owned by the app role.

### 1.2 [vps] Copy every row from Aiven

```bash
docker compose run --rm \
  -e NEON_DATABASE_URL="postgres://avnadmin:AIVEN_PW@suarappgt-suarappgt.b.aivencloud.com:14227/defaultdb?sslmode=require" \
  -e DATABASE_URL="postgresql://suara:PW@host.docker.internal:5432/suara" \
  app node scripts/migrate-neon-to-aiven.mjs
```

Prints per-table counts read and written. **The script clears the target tables
first** — safe to re-run, but only ever point `DATABASE_URL` at the fresh VPS DB.

### 1.3 [vps] Spot-check

```bash
docker compose run --rm app node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('events',await p.event.count(),'participants',await p.participant.count(),'votes',await p.vote.count());process.exit(0)})()"
```

---

## 2. Put the repo on the VPS

```bash
sudo mkdir -p /opt/suara && sudo chown $USER:$USER /opt/suara
git clone https://github.com/InggarDS/suara-ppgtkpj.git /opt/suara
cd /opt/suara
```

Private repo -> use a **read-only deploy key** or a fine-grained PAT. Do **not**
`sudo git clone` (uses root's credentials, wrong owner).

### 2.1 [vps] Create the env file

```bash
cp deploy/env.example .env
nano .env            # fill in every CHANGE_ME
chmod 600 .env
```

`SESSION_SECRET`: `openssl rand -base64 32`.
Keep `host.docker.internal` as the DB host — compose maps it to the host gateway.

---

## 3. Host Postgres / PgBouncer must accept the Docker bridge

Containers reach the host from the `172.16.0.0/12` bridge range, not `127.0.0.1`.

### 3.1 [vps] Postgres listen + auth

```bash
sudo sed -i "s/^#\?listen_addresses.*/listen_addresses = 'localhost,172.17.0.1'/" \
  /etc/postgresql/12/main/postgresql.conf

echo "host  suara  suara  172.16.0.0/12  scram-sha-256" | \
  sudo tee -a /etc/postgresql/12/main/pg_hba.conf

sudo systemctl restart postgresql
```

### 3.2 [vps] PgBouncer

In `/etc/pgbouncer/pgbouncer.ini`:

```ini
[pgbouncer]
listen_addr = 127.0.0.1, 172.17.0.1
pool_mode = transaction
max_client_conn = 300
default_pool_size = 15
reserve_pool_size = 5
reserve_pool_timeout = 3
```

```bash
sudo systemctl restart pgbouncer
```

On a 2 GB+ box you can raise `default_pool_size` to 40 and `max_client_conn`
to 500.

### 3.3 [vps] Tune Postgres for the box size

`/etc/postgresql/12/main/postgresql.conf` — **1 GB VPS sharing the box with
Docker** (this is the conservative default):

```ini
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 32MB
max_connections = 50
wal_buffers = 4MB
```

For reference, a dedicated 4 GB box would use `shared_buffers = 1GB`,
`effective_cache_size = 3GB`, `work_mem = 16MB`, `max_connections = 200`.

```bash
sudo systemctl restart postgresql
```

### 3.4 [vps] Swap is mandatory on a 1 GB box

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf && sudo sysctl -p /etc/sysctl.d/99-swap.conf
```

The compose file caps the containers (app 420 MB, redis 96 MB, caddy 64 MB) so
they cannot collectively OOM the host. Never run `docker build` / `npm run
build` on a 1 GB box — CI builds the image, the VPS only pulls it.

---

## 4. First deploy

### 4.1 GitHub Actions builds the image

Push to `main` (step 6) runs `.github/workflows/deploy.yml`, which builds and
pushes `ghcr.io/inggards/suara-ppgtkpj:<sha>` + `:latest` to GHCR.

Make the package readable by the VPS:
- GHCR package -> **Package settings** -> either make it **public**, or keep it
  private and create a PAT with `read:packages` for `docker login` on the VPS.

### 4.2 [vps] Log in to GHCR and pull

```bash
echo "<PAT_with_read:packages>" | docker login ghcr.io -u InggarDS --password-stdin
cd /opt/suara
export TAG=latest        # or a specific 12-char sha
docker compose pull
```

### 4.3 [vps] Schema (skip if step 1.1 already done)

See step 1.1 — apply `prisma/schema.sql` with `psql`.

### 4.4 [vps] Start the stack

```bash
docker compose up -d
docker compose ps
docker compose logs -f app        # watch for "Ready in ..."
```

### 4.5 [vps] Smoke test on the server, before DNS

```bash
curl -s http://127.0.0.1:3000/api/health           # {"ok":true,"db":"up"}
curl -sI -H "Host: www.suarappgtkpj.site" http://127.0.0.1/   # via Caddy :80
```

Caddy will fail to get a certificate until DNS points here — that is expected at
this stage; the `:80` host-header test still proves the proxy path.

---

## 5. DNS cutover

1. A day ahead: at your DNS provider lower the TTL on `www` and the apex to
   **300s**.
2. Change records:
   - `www.suarappgtkpj.site`  A  ->  `202.155.13.171`
   - `suarappgtkpj.site`      A  ->  `202.155.13.171`  (apex; drop the Vercel
     ALIAS/CNAME)
3. Within a minute Caddy obtains certificates automatically. Watch:
   ```bash
   docker compose logs -f caddy
   ```
4. Verify: `https://www.suarappgtkpj.site/api/health`, then log in, run a full
   participant flow on a phone.

**Rollback:** point the two A records back to Vercel's values. Nothing else to
undo; the database is already independent of Vercel.

---

## 6. Day-to-day: ship a change

```bash
# [local]
git add -A && git commit -m "..." && git push        # CI builds + pushes image
```

```bash
# [vps]  (or enable ENABLE_SSH_DEPLOY repo variable to automate this)
cd /opt/suara && git pull --ff-only
export TAG=$(git rev-parse --short=12 HEAD)
docker image prune -af   # -a, not just -f — every deploy tags a new :<sha>, plain
                          # prune never reclaims those and the disk fills over time
docker compose pull app
# only if the schema changed this release — --user root: the CLI's engine check
# needs to write into node_modules, which the non-root "node" user can't do:
docker compose run --rm --user root app npx prisma db push --skip-generate
docker compose up -d
docker image prune -af
```

**Rollback to a previous build:**

```bash
export TAG=<older-sha> && docker compose up -d
```

---

## 7. Operating notes

| Concern | Where |
|---|---|
| App logs | `docker compose logs -f app` |
| Restart just the app | `docker compose restart app` |
| Email worker logs | `docker compose logs app \| grep email-worker` |
| Redis | cache + realtime pub/sub + BullMQ queue; AOF-persisted in the `redisdata` volume, `maxmemory-policy noeviction` |
| DB backups | host cron: `pg_dump suara \| gzip > /var/backups/suara-$(date +\%F).sql.gz` |
| Caddy certs | in the `caddy_data` volume; survives `up`/`down` |
| SSE not streaming | check `flush_interval -1` in `deploy/Caddyfile` |
| `prisma db push` fails with a permission error | the CLI needs to write into `node_modules` as root: `docker compose run --rm --user root app npx prisma db push --skip-generate` |
| Deploy fails with "no space left on device" | old `:<sha>` images piling up on a small disk — `df -h /`, then `docker image prune -af` (the `-a`, not `docker image prune -f`, is what actually reclaims them; both the workflow and step 6 above already prune this way after every deploy) |
| `prisma db push` fails through PgBouncer | it must use `DIRECT_DATABASE_URL` (port 5432), already wired in `env.example` |
| Bump app instances later | run `app` with `--scale app=2` behind Caddy — Redis pub/sub (`src/lib/realtime.ts`) already fans out across instances |

---

## 8. Enable auto-deploy (optional)

`.github/workflows/deploy.yml` already has a `deploy` job that runs after every successful image build on `main` — it SSHes into the VPS and does the same `git pull` → `docker compose pull` → `prisma db push` → `docker compose up -d` sequence from step 6, automatically. It's gated off by default.

### 8.1 [vps] Create a dedicated deploy key

```bash
ssh-keygen -t ed25519 -f ~/suara_deploy_key -N "" -C "github-actions-deploy"
cat ~/suara_deploy_key.pub >> ~/.ssh/authorized_keys
cat ~/suara_deploy_key          # copy this — it's the GitHub secret, not the VPS's own key
rm ~/suara_deploy_key ~/suara_deploy_key.pub   # keep only authorized_keys on the VPS
```

Use the account that owns `/opt/suara` and is in the `docker` group (the one you already SSH in as) — not root.

### 8.2 [GitHub] Add repository secrets

Repo → **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Value |
|---|---|
| `VPS_HOST` | the VPS IP or hostname |
| `VPS_USER` | the SSH user from 8.1 |
| `VPS_SSH_KEY` | the **private** key printed by `cat ~/suara_deploy_key` above |

No `GHCR_PAT` needed — the deploy job authenticates to GHCR with the workflow's own short-lived token.

### 8.3 [GitHub] Turn it on

**Settings → Secrets and variables → Actions → Variables** → add `ENABLE_SSH_DEPLOY` = `true`.

Next push to `main` (or merged PR) builds the image **and** deploys it — no manual VPS steps. Watch it in the Actions tab; the `deploy` job's SSH output mirrors what you'd type by hand. A schema change still runs safely (`prisma db push` is a no-op when nothing changed); a step failing (e.g. destructive schema change without `--accept-data-loss`) fails the whole workflow loudly instead of silently applying.

**Rollback** still works the same manual way — `export TAG=<older-sha> && docker compose up -d` on the VPS — auto-deploy doesn't add a rollback button.
