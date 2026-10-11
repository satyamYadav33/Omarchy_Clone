# Publishing and deploying

Repository: <https://github.com/satyamYadav33/Omarchy_Clone>
Static hosting: **Vercel** — no build step, no environment variables, no framework.

> **Status: pushed and deploy-ready.** `main` carries the fix for the first
> deployment failure — see *Troubleshooting* for exactly what went wrong and why.

---

## Deploying on Vercel

**Option A — dashboard (easiest).** Go to <https://vercel.com/new>, import
`Omarchy_Clone`, and click Deploy. Everything is already configured in
`vercel.json`:

| Vercel setting | Value | Why |
|---|---|---|
| Framework Preset | `null` (none) | No framework to detect |
| Build Command | `node tools/build.mjs` | Declared explicitly, **never left to auto-detection** |
| Output Directory | `public` | Declared explicitly, so Vercel never guesses |
| Install Command | `echo "zero dependencies…"` | There is nothing to install |
| Root Directory | `./` | — |
| Environment Variables | **none** | Nothing is configurable at runtime |

**Option B — CLI** (installed here, needs a login):

```bash
vercel login
vercel          # preview deployment
vercel --prod   # production deployment
```

Either way, every later `git push` to `main` redeploys automatically.

### Why `public/` exists

`tools/build.mjs` writes the bundle to **three** places:

```
omarchy.html          double-click this, or serve the folder directly
index.html            the folder's entry point
public/index.html     the conventional static output directory
public/omarchy.html   same file
```

`public/` is committed so the repo is deployable on **any** static host with zero
configuration — Vercel, Netlify, Cloudflare Pages, GitHub Pages or
`npx serve public` all expect that folder by convention. The root copies stay so
that cloning and double-clicking keeps working with no build step at all.

All four files are byte-identical, and `npm run preflight` asserts that.

### Routes

| Path | Serves |
|---|---|
| `/` | `public/index.html` — the full desktop |
| `/omarchy.html` | the same bundle |
| `/screenshots/*.png` | *not served* — they live in the repo for the README only |

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

## Pushing further changes

```bash
git add -A
git commit -m "your message"
git push
```

`main` already tracks `origin/main`, so no `-u` is needed again.

### Authentication, as configured here

The push succeeded using **Git Credential Manager** (`credential.helper=manager`),
which already held a credential for GitHub. If you hit an auth prompt on another
machine, either let the GCM window sign you in, or:

```bash
gh auth login          # GitHub CLI is installed (v2.97.0)
gh auth setup-git      # makes git use gh's credentials
```

Or use a Personal Access Token with `repo` scope:

```bash
git push https://<TOKEN>@github.com/satyamYadav33/Omarchy_Clone.git main
```

### Windows note: `schannel` fails, use OpenSSL

On this machine git's default TLS backend fails before it reaches GitHub at all:

```
fatal: unable to access '…': schannel: AcquireCredentialsHandle failed:
SEC_E_NO_CREDENTIALS (0x8009030e) - No credentials are available in the
security package
```

The bundled OpenSSL backend works. It is already set for this clone:

```bash
git config http.sslBackend openssl
```

That writes to `.git/config`, so it is local and never committed. If you clone
fresh on Windows and see that error, re-run it.

*(Unrelated but similar-looking: PowerShell 5.1's `Invoke-WebRequest` fails against
GitHub with "underlying connection was closed" because it defaults to TLS 1.0/1.1.
Use `curl.exe`, `web_fetch`, or set `[Net.ServicePointManager]::SecurityProtocol`.
That is a client issue, not a repository one.)*

---

## Verifying before you deploy

```bash
npm run deploy:check   # ci (bundle up to date, invariants) + preflight (host config)
node tools/serve.mjs   # preview exactly what Vercel will serve (localhost:4173)
```

`tools/ci.mjs` fails if `src/` was edited without rebuilding, or if `public/` is
stale. `tools/preflight.mjs` fails if `vercel.json` is inconsistent with
`package.json` — the exact class of bug that broke the first deployment. Both run
in GitHub Actions on every push and pull request.

With a browser available you can also run the deeper checks:

```bash
node tools/diag.mjs
node tools/verify.mjs --query "&demo=tiling"
```

---

## Troubleshooting

### The first deployment failed like this

```
20:19:34.166  > omarchy-web-clone@4.0.4 build
20:19:34.166  > node tools/build.mjs
20:19:34.166  bundle    : omarchy.html + index.html  (436.6 KB, zero dependencies)
20:19:34.192  Error: No Output Directory named "public" found after the Build completed.
```

**Cause — a configuration contradiction, not a code bug.** The build ran and
succeeded. But `vercel.json` had `"buildCommand": null` and
`"outputDirectory": null`, while `package.json` defined a `build` script. Vercel
therefore auto-detected the build, ran it, and then required its conventional
output folder. `null` does not mean "no build" — it means "figure it out", and
what it figured out was `public`, which did not exist.

There was a second, quieter mistake: `npm run build` rewrote `omarchy.html` in
place, so the "build" produced **no artifact at all** — there was nothing to copy
into an output directory even if Vercel had known where to look.

**Fix (in this commit):**

1. `tools/build.mjs` now writes `public/index.html` and `public/omarchy.html` as well.
2. `vercel.json` states `"buildCommand": "node tools/build.mjs"` and
   `"outputDirectory": "public"` explicitly — nothing is inferred.
3. `installCommand` is set to a no-op echo, since there is genuinely nothing to install.
4. `tools/preflight.mjs` now fails locally if any of this drifts apart again.

### Other symptoms

| Symptom | Cause | Fix |
|---|---|---|
| `No Output Directory named "public"` | `outputDirectory` unset while a build command runs | `npm run preflight`, then commit the corrected `vercel.json` |
| Deployed page is blank | A stale bundle was pushed | `npm run build`, commit, push |
| `fatal: … schannel … SEC_E_NO_CREDENTIALS` | Windows TLS backend | `git config http.sslBackend openssl` |
| `push` rejected, non-fast-forward | The remote has commits you lack | `git pull --rebase origin main` first |
| Screenshots 404 on the deployed site | Expected — they are repo docs, not payload | Nothing to fix; they appear in the README on GitHub |

---

## What is committed, and why

| Path | Committed | Reason |
|---|---|---|
| `omarchy.html`, `index.html` | **yes** | The deliverable — clone and double-click, no build step |
| `public/` | **yes** | The same bundle in the conventional static output directory, so any host deploys with no config |
| `src/`, `tools/` | **yes** | So anyone can rebuild and re-verify; Vercel needs them for the build |
| `screenshots/` | **yes** | Documentation, embedded in the README. Not served by the site |
| `vercel.json`, `.vercelignore`, `.gitattributes` | **yes** | Hosting config and line-ending correctness |
| `.github/workflows/ci.yml` | **yes** | The CI gate |
| `.verify/` | **no** | Throwaway headless-Chrome profiles (`.gitignore`) |
| `node_modules/` | **no** | There are no dependencies |
