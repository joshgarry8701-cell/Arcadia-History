# Deployment guide

The site is one Node.js process plus one database file. Any host that runs Node 22.5+ (or Docker) and gives you a **persistent disk** will work. Without a persistent disk, student progress is lost whenever the host restarts.

## Settings (environment variables)

| Variable | Required | Meaning |
|---|---|---|
| `TEACHER_PASSWORD` | First start | Creates the teacher account. Change it later in Teacher area › AI and limits. |
| `TEACHER_USERNAME` | No | Defaults to `mrgarry`. |
| `PORT` | No | Defaults to 3000 (most hosts set this for you). |
| `DB_FILE` | Recommended | Where the database lives, e.g. `/data/hub.sqlite` on the persistent disk. |
| `COOKIE_SECURE` | On HTTPS | Set to `true` once the site is served over https (all the hosts below do this). |
| `ANTHROPIC_API_KEY` | For AI feedback | A key from console.anthropic.com, owned by you or the school. Never put it in the code or give it to students. |

AI feedback also needs **input and output token prices** typed into Teacher area › AI and limits. Copy them from Anthropic's pricing page for the model you choose. Without prices the site refuses to send AI requests, because it cannot enforce your monthly ceiling.

## Option A — Render (simplest)

1. Put this folder in a private GitHub repository (it already has git history).
2. On render.com: New › Web Service › connect the repo. Runtime: Docker (uses the included `Dockerfile`).
3. Add a **Disk** mounted at `/data` (1 GB is plenty).
4. Environment: `DB_FILE=/data/hub.sqlite`, `COOKIE_SECURE=true`, `TEACHER_PASSWORD=…`, and later `ANTHROPIC_API_KEY=…`.
5. Deploy, open the URL, sign in as `mrgarry`.

A persistent disk needs a paid instance on Render; the free tier has no disk.

## Option B — Railway, Fly.io or a school server

Same pattern: build with the `Dockerfile`, attach a volume at `/data`, set the variables above. On a plain Linux server without Docker: install Node 22, copy the folder, run `npm start` under a process manager (e.g. systemd) behind an HTTPS reverse proxy (Caddy or nginx).

## Second safeguard on spending

The website refuses any AI request that could take the month over your ceiling, using the prices you entered. Also set a monthly spend limit in your Anthropic Console account, so a mistake in the prices you typed cannot cost more than you expect.

## Moving to a different host

1. Teacher area › Backup and export › **Download full backup**.
2. Deploy the same code on the new host.
3. Sign in with the `TEACHER_PASSWORD` you set there, open Backup and export › Restore, choose the file, confirm.

(Alternatively copy the `hub.sqlite` file across while the site is stopped.)
