# Omarchy Web Clone

A high-fidelity, zero-install reconstruction of the **Omarchy** Linux desktop — the
opinionated Arch Linux + Hyprland distribution by DHH / 37signals.

It is **one file**. Double-click it and you are looking at the Omarchy desktop:
a Hyprland-style tiling compositor, the Quattro Quickshell bar and menu, all 23
bundled themes, the full hotkey table, and a working terminal, editor, file
manager and system monitor.

```
omarchy.html        437 KB   ← open this. No server, no install, no network.
index.html          437 KB   identical copy, so the folder has an entry point
public/                      the same bundle in the conventional static output
                             directory, so any host deploys with no config
src/                         the 17 modules it is built from
tools/                       build + verification tooling
```

There is no build step to *use* it. `omarchy.html` is complete and self-contained.

**Deploying:** ready for Vercel (and Netlify, Cloudflare Pages, GitHub Pages) with
no per-host configuration. See [DEPLOY.md](DEPLOY.md) for the deploy steps, the
configuration rationale, and the post-mortem of the first failed deployment.

---

## Read this first: which Omarchy this is

**"Umachi" is Omarchy.** Korean sources transliterate it 우마치 and Persian sources
اُمارچی; both refer to [omarchy.org](https://omarchy.org), the Arch + Hyprland distro
incubated at 37signals.

One detail changes everything, and it is the reason this clone looks like it does:

> Omarchy's current release is **v4.0.4 "Quattro"** (v4.0.0 shipped 2026-08-14).
> In 4.0.0 the entire desktop shell was rewritten in **Quickshell** as a single
> process. Quoting the release notes: *"the bar, launcher, menus, notifications,
> on-screen displays, control panels, lock screen, and polkit agent now all live
> inside a single long-running shell process… That means **Waybar, Walker, Mako,
> SwayOSD, hyprlock, hypridle, swaybg, and polkit-gnome are all gone**."*

So this is a clone of **Quattro**, not of the older Waybar-era Omarchy that most
articles and screenshots on the internet still show. There is deliberately no
Waybar, no Walker and no Mako here, because there is none in current Omarchy.

Other upstream facts this build follows, rather than assumes:

| Fact | Value | Source |
|---|---|---|
| Default theme | **Tokyo Night** | `install/user/theme.sh`: `omarchy-theme-set "Tokyo Night"` |
| Default terminal | **Foot** (not Alacritty) | `manual/15-terminal.md` |
| Default browser | **Chromium** | `manual/23-browsers.md` |
| Default font | **JetBrainsMono Nerd Font** | `manual/38-fonts.md` |
| Bar size | **26 px** horizontal / 28 px vertical | `config/omarchy/shell.json` |
| Clock format | `dddd HH:mm`, alt `d MMMM 'W'ww yyyy` | same |
| Hyprland configs | **Lua** (`~/.config/hypr/bindings.lua`), not `.conf` | `manual/07-hotkeys.md` |
| Themes bundled | **23** theme directories | `themes/` on branch `quattro` |
| Capture stack | Omasnap + hyprpicker + tesseract + gpu-screen-recorder | `manual/12-screenshots-recording.md` |

---

## Using it

Press a key or click to power on, then you have a machine.

### The Super key

Omarchy is built around the Super key. Your operating system and browser own the
real Windows/Cmd key, so this clone puts **Super on Caps Lock** — the same physical
position, and otherwise a dead key. Every binding below works with it.

You can move it to `;`, `'` or `\` in **Settings → Keybindings**.

| | |
|---|---|
| `Caps + Space` | the Omarchy menu — apps **and** every command |
| `Caps + Alt + Space` | apps-only menu |
| `Caps + Esc` | system menu |
| `Caps + K` | every keybinding, in-app |
| `Caps + Return` | terminal |
| `Caps + Shift + N` | Neovim |
| `Caps + Shift + F` | file manager |
| `Caps + Ctrl + T` | btop |
| `Caps + Ctrl + Shift + Space` | change theme everywhere at once |
| `Caps + arrows` | move focus · `Caps + Shift + arrows` swaps |
| `Caps + L` | cycle dwindle → scrolling → floating |
| `Caps + T` | float/tile · `Caps + F` fullscreen |
| `Caps + 1…9` | workspaces · `Caps + Shift + 1…9` moves the window |
| `Caps + C / X / V` | copy / cut / paste, everywhere including the terminal |
| `Caps + Ctrl + L` | lock |

**Two substitutions are unavoidable** inside a browser, and both are surfaced in
the UI rather than hidden — the documented upstream keys are still shown in the
keybinding list so nothing silently differs:

| Upstream | Here | Why |
|---|---|---|
| `Print Screen` | `Ctrl + Alt + S` | Most laptops have no Print Screen key |
| `Alt + Print Screen` | `Ctrl + Alt + R` | as above |
| `Super + Print Screen` | `Ctrl + Alt + Q` | as above |

### Deep links

```
omarchy.html?open=editor,files,btop     open apps on workspace 1
omarchy.html?theme=Gruvbox              boot into a specific theme
omarchy.html?demo=menu                  root menu open
omarchy.html?demo=theme                 the theme picker, all 23
omarchy.html?demo=tiling                four tiled windows
omarchy.html?demo=keys                  keybinding reference
omarchy.html?demo=capture               the Omasnap overlay
omarchy.html?demo=notify                notifications
omarchy.html?capture=1                  pin a state report to the page
omarchy.html?fast=1                     skip the power screen and installer
```

`?capture=1` is the interesting one: it makes the page print its own runtime state
— errors, theme, registered apps, open windows, canvas sizes — into the DOM. It is
how this build was verified without devtools.

---

## What is faithfully reproduced

**The compositor.** A dwindle layout that splits the focused window on the
alternating axis and keeps a real split tree, so focus/swap/resize walk the tree
exactly as Hyprland's does. Plus `scrolling` (niri-style strip, focused column
widest) and `floating`. Directional focus and swap pick geometrically. Windows are
absolutely positioned and animated between layouts, so changing workspace glides.

- 9 workspaces, sticky+floating windows, scratchpad, grouping into a tabbed stack
- fullscreen / fullwidth / maximise, pseudo (stretch) style, window transparency,
  square corners, saved-and-restored window width, Super+drag move and Super+right-drag resize
- window gaps, hiding the bar, zoom, monitor scale stepping, 9 workspaces

**The shell.** A 26 px bar with the upstream module order — left `omarchy.menu`
+ `omarchy.workspaces`; centre `indicators`, `clock`, `elsewhen`, `weather`,
`system-update`; right `keyboard-layout`, `tray`, `agents`, `bluetooth`,
`network`, `audio`, `monitor`, `power`. Modules respond as documented: audio
scrolls to change volume, the monitor widget scrolls brightness, the clock cycles
formats, double-clicking empty centre space toggles transparency.

- the unified `Super + Space` menu with the real Quattro tree: **Apps · Learn ·
  Trigger · Style · Setup · Install · Remove · Update · About · System**, including
  nested Trigger → Appearance/Toggle/Capture/Reminder, Style → Theme/Background/
  Font, Setup → Monitors/Input/Defaults/Plugins/Security/Config, the four update
  channels, and the full Install → AI/Service/Development/Editor/Gaming/Browser/
  Web App/Terminal/TUI trees
- a real launcher with fuzzy search across the whole command tree
- notifications with history, actions and silencing; native OSDs for volume,
  brightness and every toggle; control panels for audio, bluetooth, network,
  display, power, calendar and world clock
- the lock screen, screensaver, suspend overlay, confirm dialogs, and a fastfetch About

**The applications.** These are not screenshots.

- **Foot terminal** — a working shell over a virtual filesystem with ~60 commands,
  quoting, pipes, `&&`, redirection, tab completion, persisted history, `Ctrl+L`,
  plus `omarchy` (with its subcommand groups), `tdl`, `tslm`, `tsl`, `pacman`,
  `yay`, `git`, `docker`, `mise`, `ic`/`ix`, `neofetch`. `pacman -Syu` is blocked
  and points you at `omarchy update`, exactly as upstream.
- **Neovim + LazyVim** — modal editing with a dashboard, file tree, tabs,
  statusline, live Lua/JS/Ruby/Go/TOML syntax highlighting, and saves that persist
  into the filesystem.
- **btop** — live process table from a simulated process list, load average, uptime,
  and working sparkline graphs.
- **File manager** (Miller columns), **Chromium**, **image viewer**, **media player**,
  **agent dashboard**, **lazygit**, **calculator**, and a floating 2048.
- **Capture**: Omasnap region/window/fullscreen with the annotate hint strip,
  hyprpicker colour sampling that reports HEX/RGB/HSL/ANSI, OCR text extraction,
  emoji picker, and clipboard history.
- **Settings** — Appearance, Keybindings, Defaults, Input, Monitors, About.

**The filesystem.** A seeded Omarchy home: `~/.config/hypr/*.lua` (Hyprland, with a
`bindings.lua` holding the real binding table), `~/.config/omarchy/shell.json` with
the upstream bar layout, `themes/tokyo-night/colors.toml` in upstream format,
`pacman.conf`, `~/.config/nvim`, tmux/foot/btop/lazygit configs, and Rails, Go and
Elixir projects in `~/Projects`. `/etc/os-release` reports Omarchy 4.0.4 (Quattro).

**Boot.** The cold start in upstream order: Limine boot menu (with snapshot entries
and "direct boot"), the LUKS passphrase screen, a systemd boot log, the SDDM login,
and — on first run — the installer, which asks keyboard, disk, encryption, account
and extras before reporting the install line by line.

### Themes

All 23 palettes in `src/themes.js`. The **background, foreground, accent, muted,
selection, and every named colour plus the bright variants are transcribed
verbatim** from `themes/<name>/colors.toml` on branch `quattro` — not eyeballed
from screenshots. The ANSI 0–15 mapping the terminal uses is derived exactly as
`default/themed/alacritty.toml.tpl` derives it.

Tokyo Night, Catppuccin, Catppuccin Latte, Ethereal, Everforest, Flexoki Light,
Gruvbox, Hackerman, Kanagawa, Last Horizon, Lumon, Lupine, Matte Black, Miasma,
Nord, Osaka Jade, Retro 82, Ristretto, Rose Pine, Solitude, Starship, Vantablack,
White.

Everything is styled from those values through CSS custom properties, so one
selection restyles the bar, menu, notifications, OSD, lock screen, terminal,
Neovim, btop and the browser simultaneously — which is the actual point of Omarchy.

---

## What a browser cannot reproduce

Stated plainly, because a clone that oversells itself is worthless:

- **There is no kernel.** No Wayland, no GPU compositing, no `systemd`, no PAM, no
  LUKS, no btrfs snapshots, no initramfs. The boot sequence is a faithful
  *reproduction* of what those stages look like, not those stages.
- **No pacman/AUR.** Package installs, updates and migrations are simulated end to
  end, including output and notifications.
- **No real OS-level Super key.** Hence the Caps Lock mapping.
- **Framed web apps cannot always load.** Chrome refuses to frame a page whose site
  sends `X-Frame-Options`/`frame-ancestors`. Where a site allows it (Wikipedia,
  example.com, omarchy.org, the Arch wiki, MDN) the clone loads it **for real**;
  otherwise it renders a clearly badged preview page explaining why, rather than a
  silent blank frame or a fake screenshot.
- **Wallpapers are generated.** The real ISO ships photographic `.webp` files per
  theme, which would add megabytes and defeat the point of a small file. Each
  wallpaper here is layered SVG generated from the live palette, and the Tokyo
  Night set names match upstream (`1-quattro`, `0-winding-road`, `2-swirl-buck`,
  `3-sunset-lake`, `5-oma-cityscape`, `6-oma`).
- **Idle timers** use upstream's configured 150 s screensaver / 300 s lock.

Not every detail could be verified upstream. Where a value was not obtainable it was
chosen sensibly rather than invented and is not claimed as exact: the bundled theme
count (the repo has 23 directories, the manual says "twenty-two"); which specific
wallpaper file is the shipped default per theme; exact v4 bar font pixel size and
pill padding; and the per-theme background filename lists beyond Tokyo Night and
Catppuccin.

---

## Architecture

The build concatenates 17 modules in dependency order into one HTML file. Each is an
IIFE over a shared `window.OMA` namespace, so load order is the only coupling.

```
core.js        event bus, DOM builder, persisted store, virtual filesystem, seed home
themes.js      the 23 palettes + CSS custom property application
wallpapers.js  procedural wallpaper generation
wm.js          the Hyprland-style compositor: dwindle/scrolling/floating, workspaces
shell.js       bar, OSD, notifications, panels, lock screen, screensaver
system.js      audio, brightness, nightlight, themes, packages, updates, About
menu.js        the Quattro menu tree, launcher, fuzzy search, overlays
capture.js     Omasnap, hyprclip, emoji, clipboard, reminders, power screens
appterm.js     Foot + the shell, ~60 commands over the VFS
appeditor.js   Neovim/LazyVim
apputil.js     btop, file manager, lazygit
appnet.js      Chromium + framed web apps
appmisc.js     viewer, media, agent, calculator, 2048, procedural art
settings.js    omarchy Settings
keys.js        the full Quattro keybinding table
boot.js        Limine, LUKS, systemd, SDDM, installer
main.js        wiring and startup
```

### Rebuilding

```bash
node tools/build.mjs        # src/ -> omarchy.html + index.html
```

The build needs nothing but Node — there is no `node_modules`, no lockfile and no
package manager involved. `pnpm`/`npm` scripts exist for convenience:

```bash
npm run build      # bundle
npm run verify     # headless state check
npm run release    # build + diag + verify
```

### Verifying

Verification is headless and reads state back out of the DOM, so it needs no
devtools. `tools/diag.mjs` builds a bundle that self-reports; `tools/verify.mjs`
loads it in headless Chrome and prints the report.

```bash
node tools/diag.mjs
node tools/verify.mjs                              # baseline
node tools/verify.mjs --query "&demo=tiling"       # four tiled windows
node tools/verify.mjs --query "&demo=theme"        # theme picker
node tools/shots.mjs                               # render screenshots
```

`tools/repair-encoding.mjs` and `tools/repair2.mjs` repair UTF-8 sources that were
double-encoded through a Windows-1252 misread — a real hazard when scripted tooling
touches UTF-8 files on Windows, and the reason this repo keeps the fix rather than
just the fix's output. `tools/ci.mjs` (and `npm run ci`) is the browser-free gate:
it parses every source, rebuilds the bundle and fails if the committed
`omarchy.html` no longer matches `src/`.

Screenshots from the verification runs are in `screenshots/` (power screen, boot,
tiling, menu, theme picker, terminal, file manager, capture, notifications, btop,
Neovim, light theme).

---

## Credits

Everything that matters here is someone else's work:

- **[Omarchy](https://omarchy.org)** by **DHH** / 37signals — the distribution, its
  design, its menu tree, its hotkeys, its theme palettes, its opinions. This project
  is an unaffiliated tribute and reproduces its *behaviour*, not its code.
- **Hyprland** — the tiling compositor whose semantics the `wm.js` engine imitates.
- **Quickshell** — the shell toolkit Omarchy 4 is built on.
- The theme authors — Tokyo Night, Catppuccin, Everforest, Gruvbox, Nord, Kanagawa,
  Rose Pine, Flexoki and the rest.

Upstream: <https://omarchy.org> · <https://github.com/omacom/omarchy>
