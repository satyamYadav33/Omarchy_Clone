# Publishing and deploying

Target repository: <https://github.com/satyamYadav33/Omarchy_Clone>
Static hosting: **Vercel** — no build step, no environment variables, no framework.

---

## The short version

```bash
git add -A
git commit -m "Omarchy (Quattro) web clone: single-file desktop, 23 themes, CI, Vercel config"
git push -u origin main
```

Then on Vercel: **Add New → Project → import `Omarchy_Clone` → Deploy**. Accept
every default. There is nothing to configure.

---

## Why Vercel needs no configuration here

Vercel treats a repository with a root `index.html` and no framework as a static
site and serves it as-is. This project is deliberately built for that:

| Vercel setting | Value | Why |
|---|---|---|
| Framework Preset | **Other** (auto) | There is no framework |
| Build Command | *(empty)* | `index.html` at the root **is** the built output |
| Output Directory | *(empty / root)* | The deliverable is committed, not generated on the host |
| Install Command | *(empty)* | `dependencies: {}` — nothing to install |
| Root Directory | `./` | — |
| Environment Variables | **none** | Nothing is configurable at runtime |

`vercel.json` only adds caching and security headers, plus `cleanUrls`. If you ever
delete it, the site still deploys and works.

The whole deployment is roughly **2.5 MB**, of which most is the screenshots.

### Routes

| Path | Serves |
|---|---|
| `/` | `index.html` — the full desktop |
| `/omarchy.html` | byte-identical copy of the same file |
| `/screenshots/*.png` | the verification screenshots |

Deep links are **query strings, not routes**, so no rewrites are needed —
`/?demo=theme` and `/?open=editor,files` both work on a plain static host:

```
/                        power on, cold boot, desktop
/?demo=tiling            four tiled windows
/?demo=theme             the 23-theme picker
/?demo=menu              the unified Omarchy menu
/?demo=keys              the full keybinding reference
/?open=editor,files      open specific apps
/?theme=Gruvbox          boot into a theme
/?capture=1              pin a runtime state report to the page
```

---

## Step-by-step

### 1. Push to GitHub

The repository already exists and is empty. From the project folder:

```bash
git init
git branch -M main
git remote add origin https://github.com/satyamYadav33/Omarchy_Clone.git
git add -A
git commit -m "Omarchy (Quattro) web clone: single-file desktop, 23 themes, CI, Vercel config"
git push -u origin main
```

**Authentication.** No credential helper is configured on this machine and there
are no SSH keys, so the push needs a credential. Easiest route:

```bash
gh auth login          # GitHub CLI is installed (v2.97.0)
gh auth setup-git      # makes git use gh's credentials
git push -u origin main
```

Or create a Personal Access Token with `repo` scope and paste it when git prompts
for a password:

```bash
git push https://<TOKEN>@github.com/satyamYadav33/Omarchy_Clone.git main
```

### 2. Deploy on Vercel

**Option A — dashboard.** <https://vercel.com/new> → import `Omarchy_Clone` →
Deploy. Every default is already correct.

**Option B — CLI** (installed, needs `vercel login`):

```bash
vercel login
vercel          # preview deployment
vercel --prod   # production deployment
```

Either way, later `git push` to `main` redeploys automatically.

---

## Windows note: `schannel` fails, use OpenSSL

On this machine git's default TLS backend fails before it reaches GitHub:

```
fatal: unable to access '…': schannel: AcquireCredentialsHandle failed:
SEC_E_NO_CREDENTIALS (0x8009030e) - No credentials are available in the
security package
```

The bundled OpenSSL backend works. Set it once for this repository:

```bash
git config http.sslBackend openssl
```

That writes to `.git/config`, so it is local and never committed.

---

## Verifying before you deploy

```bash
node tools/ci.mjs        # syntax, bundle up to date, invariants — no browser needed
node tools/serve.mjs     # preview exactly what Vercel will serve
```

`tools/ci.mjs` fails if `src/` was edited without rebuilding `omarchy.html`,
which is the one mistake that would otherwise ship a stale bundle. It runs in
GitHub Actions on every push and pull request (`.github/workflows/ci.yml`).

With a browser available you can also run the deeper checks:

```bash
node tools/diag.mjs
node tools/verify.mjs --query "&demo=tiling"
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Deployed page is blank | A stale or un-rebuilt bundle was pushed | `node tools/build.mjs`, commit, push |
| `fatal: … schannel … SEC_E_NO_CREDENTIALS` | Windows TLS backend | `git config http.sslBackend openssl` |
| Vercel build fails | A framework preset or build command was set manually | Clear both; leave the defaults |
| `push` rejected, non-fast-forward | The repo already has commits | `git pull --rebase origin main` first |
| Screenshots 404 | `.vercelignore` was edited to exclude them | Remove the `screenshots/` rule |

---

## What is committed, and why

| Path | Committed | Reason |
|---|---|---|
| `omarchy.html`, `index.html` | **yes** | They are the deliverable — clone and double-click, or deploy with no build |
| `src/`, `tools/` | **yes** | So anyone can rebuild and re-verify |
| `screenshots/` | **yes** | Documentation, and the README embeds them |
| `vercel.json`, `.vercelignore`, `.gitattributes` | **yes** | Hosting and line-ending correctness |
| `.github/workflows/ci.yml` | **yes** | The CI gate |
| `.verify/` | **no** | Throwaway headless-Chrome profiles (`.gitignore`) |
| `node_modules/` | **no** | There are no dependencies |
