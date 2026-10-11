# Publishing and deploying

Repository: <https://github.com/satyamYadav33/Omarchy_Clone>
Static hosting: **Vercel** — no build step, no environment variables, no framework.

> **Status: the initial commit is already pushed.** `main` is at `974c3bd` with all
> 54 files. The remaining step is the Vercel import below.

---

## Deploying on Vercel

**Option A — dashboard (easiest).** Go to <https://vercel.com/new>, import
`Omarchy_Clone`, and click Deploy. **Accept every default** — there is nothing to
configure:

| Vercel setting | Value | Why |
|---|---|---|
| Framework Preset | **Other** (auto-detected) | There is no framework |
| Build Command | *(empty)* | `index.html` at the root **is** the built output |
| Output Directory | *(empty / root)* | The deliverable is committed, not generated on the host |
| Install Command | *(empty)* | `dependencies: {}` — nothing to install |
| Root Directory | `./` | — |
| Environment Variables | **none** | Nothing is configurable at runtime |

**Option B — CLI** (installed on this machine, v2.x, needs a login):

```bash
vercel login
vercel          # preview deployment
vercel --prod   # production deployment
```

Either way, every later `git push` to `main` redeploys automatically.

`vercel.json` only adds caching and security headers, plus `cleanUrls`. Delete it
and the site still deploys and works.

The whole deployment is roughly **3.5 MB**, most of which is the screenshots.

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
node tools/ci.mjs        # syntax, bundle up to date, invariants — no browser needed
node tools/serve.mjs     # preview exactly what Vercel will serve (localhost:4173)
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
