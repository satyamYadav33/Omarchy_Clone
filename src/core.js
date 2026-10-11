/* ============================================================================
 * Omarchy Web Clone — core.js
 * ----------------------------------------------------------------------------
 * Engine primitives shared by every subsystem:
 *   Bus    — tiny pub/sub
 *   h/el   — hyperscript-style DOM builder
 *   Store  — persisted reactive state (localStorage)
 *   VFS    — virtual filesystem pre-populated with a realistic Omarchy home,
 *            including ~/.config/hypr/bindings.lua, ~/.config/omarchy/shell.json
 *            and ~/.config/omarchy/themes/<name>/colors.toml, mirroring the
 *            real v4.0.4 layout (configs are Lua/JSON/TOML, not .conf).
 *   fmt    — time / size / path formatting
 * ==========================================================================*/
(function (OMA) {
  'use strict';

  /* ------------------------------------------------------------------ Bus -- */
  function Bus() { this._m = {}; }
  Bus.prototype.on = function (evt, fn) {
    (this._m[evt] = this._m[evt] || []).push(fn);
    return function () { this.off(evt, fn); }.bind(this);
  };
  Bus.prototype.off = function (evt, fn) {
    var a = this._m[evt]; if (!a) return;
    var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  };
  Bus.prototype.emit = function (evt, data) {
    var a = this._m[evt]; if (!a) return;
    a.slice().forEach(function (fn) { try { fn(data); } catch (e) { OMA.log('bus:' + evt, e); } });
  };

  /* ------------------------------------------------------- DOM (hyperscript) */
  /* h('div.cls#id', {props}, children...) */
  function h(sel, props, children) {
    if (props && (props instanceof Node || Array.isArray(props) || typeof props === 'string')) {
      children = props; props = null;
    }
    var tag = 'div', id = null, cls = [];
    var m = String(sel).match(/^([a-zA-Z0-9-]+)?((?:[.#][^.#]+)*)$/);
    if (m) {
      if (m[1]) tag = m[1];
      (m[2] || '').split(/(?=[.#])/).forEach(function (tok) {
        if (tok[0] === '.') cls.push(tok.slice(1));
        else if (tok[0] === '#') id = tok.slice(1);
      });
    }
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (cls.length) el.className = cls.join(' ');
    if (props) {
      for (var k in props) {
        var v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = (el.className ? el.className + ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') { for (var s in v) el.style.setProperty(s, v[s]); }
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'dataset') { for (var d in v) el.dataset[d] = v[d]; }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'ref' && typeof v === 'function') v(el);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    append(el, children);
    return el;
  }
  function append(parent, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) { children.forEach(function (c) { append(parent, c); }); return; }
    if (children instanceof Node) { parent.appendChild(children); return; }
    parent.appendChild(document.createTextNode(String(children)));
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function frag(children) { var f = document.createDocumentFragment(); append(f, children); return f; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------- Store -- */
  var LS_KEY = 'omarchy-web-clone/v1';
  function Store(defaults) {
    this.data = JSON.parse(JSON.stringify(defaults || {}));
    this.bus = new Bus();
    this._load();
  }
  Store.prototype._load = function () {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      for (var k in saved) if (Object.prototype.hasOwnProperty.call(this.data, k)) this.data[k] = saved[k];
    } catch (e) { /* storage may be unavailable; run in-memory */ }
  };
  Store.prototype._save = function () {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch (e) { }
  };
  Store.prototype.get = function (k) { return this.data[k]; };
  Store.prototype.set = function (k, v) {
    var old = this.data[k];
    this.data[k] = v; this._save();
    this.bus.emit('change', { key: k, value: v, old: old });
    this.bus.emit('change:' + k, v, old);
  };
  Store.prototype.patch = function (obj) { for (var k in obj) this.set(k, obj[k]); };
  Store.prototype.on = function (k, fn) { return this.bus.on('change:' + k, fn); };

  /* ------------------------------------------------------------------ VFS -- */
  function VFS() { this.root = { type: 'dir', name: '', children: {} }; }

  VFS.prototype.mkdirp = function (path) {
    var segs = norm(path).split('/').filter(Boolean);
    var node = this.root;
    segs.forEach(function (s) {
      if (!node.children[s]) node.children[s] = { type: 'dir', name: s, children: {}, mtime: Date.now() };
      node = node.children[s];
      if (node.type !== 'dir') { node.type = 'dir'; node.children = node.children || {}; }
    });
    return node;
  };
  VFS.prototype.write = function (path, content, opts) {
    var p = norm(path), segs = p.split('/').filter(Boolean);
    var file = segs.pop();
    var dir = this.mkdirp('/' + segs.join('/'));
    dir.children[file] = {
      type: 'file', name: file, content: String(content),
      mtime: Date.now(), mode: (opts && opts.mode) || '-rw-r--r--'
    };
    return dir.children[file];
  };
  VFS.prototype.rm = function (path) {
    var p = norm(path), segs = p.split('/').filter(Boolean);
    var file = segs.pop();
    var dir = this.lookup('/' + segs.join('/'));
    if (dir && dir.children && dir.children[file]) { delete dir.children[file]; return true; }
    return false;
  };
  VFS.prototype.lookup = function (path) {
    var segs = norm(path).split('/').filter(Boolean);
    var node = this.root;
    for (var i = 0; i < segs.length; i++) {
      if (!node.children || !node.children[segs[i]]) return null;
      node = node.children[segs[i]];
    }
    return node;
  };
  VFS.prototype.isDir = function (path) { var n = this.lookup(path); return !!(n && n.type === 'dir'); };
  VFS.prototype.exists = function (path) { return !!this.lookup(path); };
  VFS.prototype.read = function (path) {
    var n = this.lookup(path);
    if (!n) return null;
    if (n.type === 'dir') return null;
    return n.content;
  };
  VFS.prototype.list = function (path) {
    var n = this.lookup(path);
    if (!n || n.type !== 'dir') return [];
    return Object.keys(n.children).sort(function (a, b) {
      var A = n.children[a], B = n.children[b];
      if (A.type !== B.type) return A.type === 'dir' ? -1 : 1;
      return a.localeCompare(b);
    }).map(function (k) { return n.children[k]; });
  };
  /* Recursive walk; cb(node, path). */
  VFS.prototype.walk = function (path, cb) {
    var self = this;
    (function rec(p) {
      self.list(p).forEach(function (n) {
        var full = (p === '/' ? '' : p) + '/' + n.name;
        cb(n, full);
        if (n.type === 'dir') rec(full);
      });
    })(norm(path));
  };
  VFS.prototype.glob = function (pattern) {
    var out = [];
    var re = new RegExp('^' + String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\u0001/g, '.*').replace(/\?/g, '.') + '$');
    this.walk('/', function (n, p) { if (re.test(p)) out.push(p); });
    return out.sort();
  };

  function norm(p) {
    if (!p) return '/';
    var abs = p[0] === '/';
    var out = [];
    String(p).split('/').forEach(function (s) {
      if (!s || s === '.') return;
      if (s === '..') { out.pop(); return; }
      out.push(s);
    });
    return (abs ? '/' : '') + out.join('/');
  }
  function joinPath() {
    var parts = Array.prototype.slice.call(arguments).filter(function (x) { return x !== '' && x != null; });
    var p = parts.join('/').replace(/\/+/g, '/');
    return p || '/';
  }
  function dirname(p) { var s = norm(p).split('/'); s.pop(); return s.join('/') || '/'; }
  function basename(p) { var s = norm(p).split('/'); return s[s.length - 1] || '/'; }
  function isAbs(p) { return !!p && p[0] === '/'; }

  /* -------------------------------------------------------- seeded home fs */
  function seedHome(fs, cfg) {
    cfg = cfg || { user: 'oma', name: 'Omarchy User', email: 'oma@omarchy.org', host: 'oma-arch' };
    var H = '/home/' + cfg.user;

    ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Pictures/Screenshots',
      'Videos', 'Public', 'Templates', '.local/share', '.local/state', '.cache', '.ssh',
      '.config', '.config/hypr', '.config/omarchy', '.config/omarchy/themes',
      '.config/omarchy/extensions', '.config/omarchy/backgrounds', '.config/nvim',
      '.config/nvim/lua/plugins', '.config/foot', '.config/tmux', '.config/btop',
      '.config/lazygit', '.config/omarchy/plugins', 'Projects', 'Projects/omarchy-web',
      'Projects/rails-app', 'Projects/rails-app/app/controllers', 'Projects/rails-app/app/models',
      'Projects/rails-app/config', 'Projects/go-service', 'Projects/phoenix-app'
    ].forEach(function (d) { fs.mkdirp(joinPath(H, d)); });

    /* --- /etc-ish and system paths so the terminal feels real --------------- */
    ['/etc', '/etc/omarchy', '/usr', '/usr/bin', '/usr/share', '/var', '/var/log', '/tmp', '/opt', '/boot'].forEach(function (d) { fs.mkdirp(d); });
    fs.write('/etc/os-release',
      'NAME="Omarchy"\nPRETTY_NAME="Omarchy 4.0.4 (Quattro)"\nID=omarchy\nID_LIKE=arch\n' +
      'BUILD_ID=rolling\nANSI_COLOR="38;2;23;147;209"\nHOME_URL="https://omarchy.org/"\n' +
      'DOCUMENTATION_URL="https://omarchy.org/manual/"\nLOGO=omarchy\n');
    fs.write('/etc/hostname', cfg.host + '\n');
    fs.write('/etc/hosts', '127.0.0.1\tlocalhost\n::1\t\tlocalhost\n127.0.1.1\t' + cfg.host + '.localdomain\t' + cfg.host + '\n');
    fs.write('/etc/omarchy/version', '4.0.4-quattro\n');
    fs.write('/etc/omarchy/channel', 'stable\n');
    fs.write('/etc/pacman.conf',
      '[options]\nHoldPkg     = pacman glibc\nArchitecture = auto\nColor\nILoveCandy\n' +
      'CheckSpace\nParallelDownloads = 5\nSigLevel    = Required DatabaseOptional\n\n' +
      '[omarchy]\nServer = https://pkgs.omarchy.org/$arch\n\n' +
      '[core]\nInclude = /etc/pacman.d/mirrorlist\n');
    fs.write('/var/log/pacman.log',
      '[2026-09-15T09:12:02+0000] [PACMAN] Running \'pacman -Syu\'\n' +
      '[2026-09-15T09:12:41+0000] [PACMAN] synchronizing package lists\n' +
      '[2026-09-15T09:13:07+0000] [PACMAN] starting full system upgrade\n' +
      '[2026-09-15T09:14:22+0000] [ALPM] upgraded linux-omarchy (4.0.3-1 -> 4.0.4-1)\n' +
      '[2026-09-15T09:14:25+0000] [ALPM] upgraded omarchy (4.0.3-1 -> 4.0.4-1)\n');

    /* --- Hyprland configs are Lua in v4 ----------------------------------- */
    fs.write(joinPath(H, '.config/hypr/hyprland.lua'),
      '-- Omarchy 4 / Hyprland (Lua configuration)\n' +
      '-- Executed by the compositor at startup.\n\n' +
      'require("monitors")\nrequire("input")\nrequire("looknfeel")\n' +
      'require("bindings")\nrequire("autostart")\n\n' +
      'hl.config({\n  general = {\n    gaps_in = 4,\n    gaps_out = 8,\n' +
      '    border_size = 2,\n    layout = "dwindle",\n  },\n' +
      '  decoration = {\n    rounding = 10,\n    blur = { enabled = true, size = 6, passes = 2 },\n  },\n' +
      '  animations = { enabled = true },\n})\n');
    fs.write(joinPath(H, '.config/hypr/bindings.lua'),
      '-- Omarchy keybindings (Super = the modifier; Ctrl+Alt in a browser)\n' +
      '-- Shown in-app with Super + K.\n\n' +
      'hl.bind("SUPER + SPACE",           hl.dsp.exec("omarchy-menu"))\n' +
      'hl.bind("SUPER + ALT + SPACE",     hl.dsp.exec("omarchy-menu summon apps"))\n' +
      'hl.bind("SUPER + ESCAPE",          hl.dsp.exec("omarchy-menu summon system"))\n' +
      'hl.bind("SUPER + RETURN",          hl.dsp.exec("omarchy-launch-terminal"))\n' +
      'hl.bind("SUPER + ALT + RETURN",    hl.dsp.exec("omarchy-launch-tmux"))\n' +
      'hl.bind("SUPER + CTRL + RETURN",   hl.dsp.exec("herdr"))\n' +
      'hl.bind("SUPER + SHIFT + RETURN",  hl.dsp.exec("omarchy-launch-browser"))\n' +
      'hl.bind("SUPER + W",               hl.dsp.window.close())\n' +
      'hl.bind("SUPER + Q",               hl.dsp.window.close())\n' +
      'hl.bind("SUPER + T",               hl.dsp.window.float({ action = "toggle" }))\n' +
      'hl.bind("SUPER + J",               hl.dsp.layout("togglesplit"))\n' +
      'hl.bind("SUPER + L",               hl.dsp.exec("omarchy-cycle-layout"))\n' +
      'hl.bind("SUPER + F",               hl.dsp.window.fullscreen({ action = "toggle" }))\n' +
      'hl.bind("SUPER + SHIFT + SPACE",   hl.dsp.exec("omarchy-toggle-bar"))\n' +
      'hl.bind("SUPER + CTRL + SHIFT + SPACE", hl.dsp.exec("omarchy-theme-next"))\n' +
      'hl.bind("SUPER + CTRL + SPACE",    hl.dsp.exec("omarchy-theme-bg-next"))\n' +
      'hl.bind("SUPER + CTRL + L",        hl.dsp.exec("omarchy-system-lock"))\n' +
      'hl.bind("SUPER + SHIFT + N",       hl.dsp.exec("omarchy-launch-editor"))\n' +
      'hl.bind("SUPER + SHIFT + F",       hl.dsp.exec("omarchy-launch-file-manager"))\n' +
      'hl.bind("SUPER + CTRL + T",        hl.dsp.exec("omarchy-launch-activity"))\n' +
      'hl.bind("SUPER + K",               hl.dsp.exec("omarchy-menu summon learn.keybindings"))\n' +
      '\n-- 1..9 focus workspaces, SHIFT moves the focused window\n' +
      'for i = 1, 9 do\n' +
      '  hl.bind("SUPER + " .. i,            hl.dsp.workspace.focus(i))\n' +
      '  hl.bind("SUPER + SHIFT + " .. i,    hl.dsp.window.move({ workspace = i }))\n' +
      'end\n');
    fs.write(joinPath(H, '.config/hypr/looknfeel.lua'),
      '-- Style > Hyprland edits this file.\nhl.config({\n' +
      '  general = { gaps_out = 8, gaps_in = 4, border_size = 2 },\n' +
      '  decoration = { rounding = 10, active_opacity = 1.0, inactive_opacity = 0.97 },\n})\n');
    fs.write(joinPath(H, '.config/hypr/monitors.lua'),
      '-- Written by Setup > Monitors\nhl.monitor({ output = "eDP-1", mode = "preferred", scale = 1.6 })\n');
    fs.write(joinPath(H, '.config/hypr/input.lua'),
      'hl.config({ input = { kb_layout = "us", follow_mouse = 2, sensitivity = 0 } })\n');
    fs.write(joinPath(H, '.config/hypr/autostart.lua'),
      '-- Quickshell provides bar, launcher, notifications, OSD, lock and polkit.\n' +
      'hl.exec_once("omarchy-shell")\nhl.exec_once("omarchy-owe --restore")\n' +
      'hl.exec_once("hyprsunset --temperature 6500")\n');

    /* --- Omarchy shell config (Quickshell bar layout) --------------------- */
    fs.write(joinPath(H, '.config/omarchy/shell.json'), JSON.stringify({
      bar: {
        position: 'top', transparent: false, barSize: 26, centerAnchor: 'omarchy.clock',
        layout: {
          left: ['omarchy.menu', 'omarchy.workspaces'],
          center: ['omarchy.indicators', 'omarchy.clock', 'omarchy.elsewhen', 'omarchy.weather', 'omarchy.system-update'],
          right: ['omarchy.keyboard-layout', 'omarchy.tray', 'omarchy.agents', 'omarchy.bluetooth',
            'omarchy.network', 'omarchy.audio', 'omarchy.monitor', 'omarchy.power']
        }
      },
      idle: { screensaver: 150, lock: 300 }
    }, null, 2) + '\n');
    fs.write(joinPath(H, '.config/omarchy/theme'), 'Tokyo Night\n');
    fs.write(joinPath(H, '.config/omarchy/channel'), 'stable\n');
    fs.write(joinPath(H, '.config/omarchy/backgrounds/tokyo-night/README'),
      'Extra backgrounds for the Tokyo Night theme.\nPicked with Style > Background (Super + Ctrl + Space).\n');

    /* The bundled theme in colours.toml form, exactly like upstream. */
    var tn = OMA.Themes.byId('tokyo-night');
    var toml = '';
    ['bg:background', 'fg:foreground', 'accent:accent', 'muted:muted', 'sel:selection_background',
      'selFg:selection_foreground', 'red:red', 'yellow:yellow', 'green:green', 'cyan:cyan',
      'blue:blue', 'magenta:magenta', 'orange:orange', 'brown:brown',
      'bgDark:dark_background', 'bgDarker:darker_background', 'bgLight:lighter_background',
      'fgDark:dark_foreground', 'fgLight:light_foreground', 'brfg:bright_foreground'
    ].forEach(function (pair) {
      var kv = pair.split(':');
      toml += kv[1] + ' = "' + tn[kv[0]] + '"\n';
    });
    fs.write(joinPath(H, '.config/omarchy/themes/tokyo-night/colors.toml'), toml);

    /* --- tmux / foot / btop / nvim --------------------------------------- */
    fs.write(joinPath(H, '.config/tmux/tmux.conf'),
      '# Omarchy tmux: prefix is C-Space (C-b also works)\n' +
      'set -g prefix C-Space\nbind C-b send-prefix\n' +
      'set -g mouse on\nset -g base-index 1\nsetw -g pane-base-index 1\n' +
      'set -g escape-time 0\nset -sg escape-time 0\n' +
      'bind v split-window -h -c "#{pane_current_path}"\n' +
      'bind h split-window -v -c "#{pane_current_path}"\n' +
      'bind x kill-pane\nbind z resize-pane -Z\n' +
      'set -g status-style "bg=default,fg=default"\n');
    fs.write(joinPath(H, '.config/foot/foot.ini'),
      '[main]\nfont=JetBrainsMono Nerd Font:size=11\npad=16x16\n' +
      '[colors]\n' + OMA.Themes.ansi(tn).map(function (c, i) { return 'regular' + i + '=' + c; }).join('\n') + '\n');
    fs.write(joinPath(H, '.config/btop/btop.conf'),
      'color_theme = "omarchy"\nproc_sorting = "cpu lazy"\n' +
      'update_ms = 1000\nshow_gpu_info = "Auto"\ntemp_scale = "celsius"\n');
    fs.write(joinPath(H, '.config/nvim/init.lua'),
      '-- LazyVim bootstrap (matches Omarchy default editor)\n' +
      'require("config.lazy")\n' +
      'vim.opt.relativenumber = true\nvim.g.mapleader = " "\n' +
      'vim.keymap.set("n", "<leader>e", "<cmd>Neotree toggle<cr>", { desc = "Toggle sidebar" })\n');
    fs.write(joinPath(H, '.config/nvim/lua/plugins/omarchy.lua'),
      'return {\n  { "LazyVim/LazyVim", opts = { colorscheme = "tokyonight" } },\n' +
      '  { "folke/snacks.nvim", opts = { explorer = { enabled = true } } },\n}\n');
    fs.write(joinPath(H, '.config/lazygit/config.yml'), 'gui:\n  theme:\n    activeBorderColor:\n      - cyan\n      - bold\n');

    /* --- Neovim + project content ---------------------------------------- */
    fs.write(joinPath(H, 'Projects/omarchy-web/README.md'),
      '# omarchy-web\n\nA web-native reconstruction of the Omarchy desktop experience.\n\n' +
      '## Stack\n\n- Hyprland-style tiling compositor (dwindle + scrolling + floating)\n' +
      '- Quickshell-style bar, launcher, notifications, OSD, lock screen\n' +
      '- 23 bundled Omarchy themes\n\n' +
      '## Run\n\nOpen `omarchy.html` in any modern browser.\n');
    fs.write(joinPath(H, 'Projects/omarchy-web/package.json'),
      '{\n  "name": "omarchy-web",\n  "version": "4.0.4",\n  "private": true,\n' +
      '  "description": "Web-native Omarchy desktop",\n  "scripts": { "build": "node tools/build.mjs" }\n}\n');
    fs.write(joinPath(H, 'Projects/omarchy-web/.gitignore'), 'node_modules\ndist\n*.log\n');
    fs.write(joinPath(H, 'Projects/omarchy-web/tools/build.mjs'),
      '// Bundles src/* into the single-file omarchy.html\nimport { readFileSync, writeFileSync } from "node:fs";\nexport const build = () => true;\n');
    fs.write(joinPath(H, 'Projects/rails-app/Gemfile'),
      'source "https://rubygems.org"\nruby "3.4.1"\n\ngem "rails", "~> 8.1"\ngem "pg"\ngem "puma"\n' +
      'gem "propshaft"\ngem "solid_queue"\n');
    fs.write(joinPath(H, 'Projects/rails-app/app/controllers/welcome_controller.rb'),
      'class WelcomeController < ApplicationController\n  def index\n    @theme = Omarchy.theme\n  end\nend\n');
    fs.write(joinPath(H, 'Projects/rails-app/app/models/theme.rb'),
      'class Theme < ApplicationRecord\n  validates :name, presence: true\n\n' +
      '  def ansi\n    Omarchy::Palette.ansi(name)\n  end\nend\n');
    fs.write(joinPath(H, 'Projects/go-service/main.go'),
      'package main\n\nimport (\n\t"fmt"\n\t"net/http"\n)\n\n' +
      'func main() {\n\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {\n' +
      '\t\tfmt.Fprintln(w, "omarchy")\n\t})\n\thttp.ListenAndServe(":8080", nil)\n}\n');
    fs.write(joinPath(H, 'Projects/phoenix-app/mix.exs'),
      'defmodule PhoenixApp.MixProject do\n  use Mix.Project\n\n  def project do\n    [app: :phoenix_app, version: "0.1.0", elixir: "~> 1.18"]\n  end\nend\n');

    /* --- Documents -------------------------------------------------------- */
    fs.write(joinPath(H, 'Documents/omarchy-notes.md'),
      '# Omarchy notes\n\n- Super + Space is the menu (apps *and* commands).\n' +
      '- Super + Alt + Space is the apps-only menu.\n' +
      '- Super + Ctrl + Shift + Space changes the theme everywhere at once.\n' +
      '- Quattro replaced Waybar/Walker/Mako/hyprlock with one Quickshell process.\n');
    fs.write(joinPath(H, 'Documents/roadmap.txt'),
      'Q4  - bespoke linux-omarchy kernel for all\nQ1  - plugin marketplace GA\nQ2  - Omarchy on ARM laptops\n');
    fs.write(joinPath(H, 'Desktop/welcome.txt'),
      'Welcome to Omarchy 4.0.4 (Quattro).\nPress Super + K to see every keybinding.\n');
    fs.write(joinPath(H, 'Downloads/omarchy-4.0.4.iso.sha256'),
      'ddeded2758c48318d201dfdac905ecb28f570441883f0c052ea3cd5d05acf92d  omarchy-4.0.4.iso\n');
    fs.write(joinPath(H, '.ssh/config'),
      'Host omarchy\n  HostName omarchy.local\n  User ' + cfg.user + '\n  IdentityFile ~/.ssh/id_ed25519\n');
    fs.write(joinPath(H, '.bashrc'),
      '# Omarchy shell setup\nexport EDITOR=nvim\nexport VISUAL=nvim\n' +
      'alias ls="eza --icons --group-directories-first"\nalias cat="bat"\n' +
      'alias lg=lazygit\nalias v=nvim\nalias ic="mise exec --"\n' +
      'eval "$(zoxide init bash)"\n');
    fs.write(joinPath(H, '.zshrc'), '# zsh is available; bash is the Omarchy default\nautoload -Uz compinit && compinit\n');
    fs.write(joinPath(H, '.gitconfig'),
      '[user]\n\tname = ' + cfg.name + '\n\temail = ' + cfg.email + '\n' +
      '[init]\n\tdefaultBranch = main\n[core]\n\teditor = nvim\n');
    fs.write('/home/' + cfg.user + '/.config/omarchy/shell.json.bak', '{}\n');
    return H;
  }

  /* ------------------------------------------------------------------ fmt -- */
  var fmt = {
    pad: function (n, w) { w = w || 2; return String(n).padStart(w, '0'); },
    clock: function (d, withSeconds) {
      d = d || new Date();
      return fmt.pad(d.getHours()) + ':' + fmt.pad(d.getMinutes()) + (withSeconds ? ':' + fmt.pad(d.getSeconds()) : '');
    },
    /* Omarchy's default clock format is "dddd HH:mm". */
    longClock: function (d) {
      d = d || new Date();
      return fmt.weekday(d) + ' ' + fmt.clock(d);
    },
    weekday: function (d) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(d || new Date()).getDay()]; },
    monthName: function (d) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][(d || new Date()).getMonth()]; },
    /* "d MMMM 'W'ww yyyy" — the bar's alternate clock format. */
    altDate: function (d) {
      d = d || new Date();
      var jan1 = new Date(d.getFullYear(), 0, 1);
      var week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      return d.getDate() + ' ' + fmt.monthName(d) + ' W' + fmt.pad(week) + ' ' + d.getFullYear();
    },
    size: function (bytes) {
      var u = ['B', 'K', 'M', 'G', 'T'], i = 0, n = Number(bytes) || 0;
      while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
      return (i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)) + u[i];
    },
    dur: function (secs) {
      secs = Math.max(0, Math.round(secs));
      var m = Math.floor(secs / 60), s = secs % 60;
      return m + ':' + fmt.pad(s);
    },
    perms: function (node) {
      if (node.type === 'dir') return 'drwxr-xr-x';
      return node.mode || '-rw-r--r--';
    },
    date: function (ts) {
      var d = new Date(ts || Date.now());
      return fmt.monthName(d).slice(0, 3) + ' ' + fmt.pad(d.getDate()) + ' ' + fmt.clock(d);
    },
    iso: function (ts) { var d = new Date(ts || Date.now()); return d.toISOString().slice(0, 10); },
    title: function (s) { return String(s).replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  };

  /* ----------------------------------------------------------------- anim -- */
  /* JS-driven tween so the compositor can animate layout geometry. */
  function tween(from, to, ms, onFrame, ease) {
    ease = ease || function (t) { return 1 - Math.pow(1 - t, 3); };
    var start = performance.now();
    var raf = 0, cancelled = false;
    function step(now) {
      if (cancelled) return;
      var t = Math.min(1, (now - start) / ms);
      onFrame(from + (to - from) * ease(t), t);
      if (t < 1) raf = requestAnimationFrame(step); else onFrame(to, 1);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelled = true; cancelAnimationFrame(raf); };
  }

  function log(scope, err) {
    if (window.console && console.warn) console.warn('[omarchy:' + scope + ']', err);
  }

  /* ----------------------------------------------------------------- export */
  OMA.Bus = Bus;
  OMA.bus = new Bus();
  OMA.h = h; OMA.append = append; OMA.clear = clear; OMA.frag = frag; OMA.$ = $; OMA.$$ = $$;
  OMA.StoreClass = Store;
  /* One shared store instance. Modules depend on this existing from the moment
     they load, because some of them seed files or defaults at load time. */
  OMA.store = new Store({
    theme: 'tokyo-night',
    wallpaper: 0,
    user: 'oma',
    name: 'Omarchy User',
    email: 'oma@omarchy.org',
    brightness: 78,
    volume: 46,
    font: 'JetBrainsMono Nerd Font',
    superKey: 'CapsLock',
    scale: '1.6x',
    animations: true,
    onboarded: false,
    skipBootMenu: false,
    termHistory: [],
    defaults: { agent: 'Claude', browser: 'Chromium', terminal: 'Foot', editor: 'Neovim', dictation: 'Voxtype' }
  });
  OMA.Store = OMA.store;
  OMA.VFS = VFS;
  OMA.fsPaths = { norm: norm, join: joinPath, dirname: dirname, basename: basename, isAbs: isAbs };
  OMA.seedHome = seedHome;
  OMA.fmt = fmt;
  OMA.tween = tween;
  OMA.log = log;
})(window.OMA = window.OMA || {});
