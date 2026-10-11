/* ============================================================================
 * Omarchy Web Clone — appterm.js
 * ----------------------------------------------------------------------------
 * Foot, Omarchy's default terminal, plus a working shell:
 *   · real command set over the virtual filesystem
 *   · quoting, pipes, redirection, &&
 *   · tab completion for commands and paths
 *   · history (persisted), Ctrl+R style search, Ctrl+C / Ctrl+L
 *   · Omarchy's own commands: omarchy, tdl, tsl, lg, ic …
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, P = OMA.fsPaths;
  function FS() { return OMA.FS; }

  var HOSTNAME = 'oma-arch';

  function user() { return (OMA.Store && OMA.Store.get('user')) || 'oma'; }
  function HOME() { return '/home/' + user(); }
  function cwdDisplay(cwd) { return cwd.indexOf(HOME()) === 0 ? '~' + cwd.slice(HOME().length) : cwd; }

  /* ------------------------------------------------------------ tokenizer */
  function tokenize(line) {
    var toks = [], cur = '', q = null, esc = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (esc) { cur += c; esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (q) { if (c === q) q = null; else cur += c; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (/\s/.test(c)) { if (cur !== '') { toks.push(cur); cur = ''; } continue; }
      cur += c;
    }
    if (cur !== '') toks.push(cur);
    return toks;
  }

  /* Split a pipeline into stages, honouring quotes. */
  function splitPipeline(line) {
    var stages = [], cur = '', q = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '|') { stages.push(cur); cur = ''; continue; }
      cur += c;
    }
    stages.push(cur);
    return stages.map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
  }

  function expand(p, cwd) {
    if (!p) return p;
    if (p === '~') return HOME();
    if (p.indexOf('~/') === 0) return HOME() + p.slice(1);
    if (p[0] !== '/') return P.norm(P.join(cwd, p));
    return P.norm(p);
  }

  /* ------------------------------------------------------------- commands */
  var CMDS = {};
  function cmd(name, help, fn) { CMDS[name] = { name: name, help: help, fn: fn }; }

  cmd('help', 'list available commands', function (a, o) {
    var names = Object.keys(CMDS).sort();
    o.out('Omarchy shell — ' + names.length + ' built-ins');
    o.out('');
    var rows = [];
    names.forEach(function (n) { rows.push([n, CMDS[n].help]); });
    o.table(rows);
    o.out('');
    o.out('Also: omarchy, tdl, tsl, lg, ic, ix — and pipes, &&, >, >>.');
  });

  cmd('ls', 'list directory contents', function (a, o) {
    var flags = a.filter(function (x) { return x[0] === '-'; }).join('');
    var paths = a.filter(function (x) { return x[0] !== '-'; });
    var long = flags.indexOf('l') >= 0, all = flags.indexOf('a') >= 0;
    var target = paths.length ? expand(paths[0], o.cwd) : o.cwd;
    var node = FS().lookup(target);
    if (!node) { o.err('ls: cannot access \'' + paths[0] + '\': No such file or directory'); return; }
    if (node.type === 'file') { o.out(paths[0] || node.name); return; }
    var items = FS().list(target).filter(function (n) { return all || n.name[0] !== '.'; });
    if (!items.length) return;
    if (long) {
      var rows = items.map(function (n) {
        return [fmt.perms(n), '1', user(), user(), String(n.type === 'dir' ? 4096 : (n.content || '').length).padStart(6),
          fmt.date(n.mtime).padEnd(12), n.type === 'dir' ? n.name + '/' : n.name];
      });
      o.table(rows, true);
    } else if (flags.indexOf('1') >= 0) {
      items.forEach(function (n) { o.out(n.type === 'dir' ? n.name + '/' : n.name); });
    } else {
      var perLine = 4, line = [];
      for (var i = 0; i < items.length; i++) {
        var n = items[i];
        line.push((n.type === 'dir' ? n.name + '/' : n.name).padEnd(22));
        if (line.length === perLine || i === items.length - 1) { o.out(line.join('')); line = []; }
      }
    }
  });

  cmd('cd', 'change directory', function (a, o) {
    var target = a.length ? expand(a[0], o.cwd) : HOME();
    if (!FS().exists(target)) { o.err('cd: no such file or directory: ' + a[0]); return; }
    if (!FS().isDir(target)) { o.err('cd: not a directory: ' + a[0]); return; }
    o.setCwd(target);
  });

  cmd('pwd', 'print working directory', function (a, o) { o.out(o.cwd); });

  cmd('cat', 'print file contents', function (a, o) {
    if (!a.length) { o.err('cat: missing operand'); return; }
    a.forEach(function (p) {
      var f = expand(p, o.cwd);
      var c = FS().read(f);
      if (c == null) { o.err('cat: ' + p + ': No such file or directory'); return; }
      o.out(c.replace(/\n$/, ''));
    });
  });

  cmd('echo', 'print arguments', function (a, o) { o.out(a.join(' ')); });
  cmd('printf', 'print formatted arguments', function (a, o) { o.out(a.join(' ').replace(/\\n/g, '\n')); });

  cmd('mkdir', 'create directories', function (a, o) {
    a.filter(function (x) { return x[0] !== '-'; }).forEach(function (p) { FS().mkdirp(expand(p, o.cwd)); });
  });

  cmd('rm', 'remove files or directories', function (a, o) {
    var flags = a.filter(function (x) { return x[0] === '-'; }).join('');
    var targets = a.filter(function (x) { return x[0] !== '-'; });
    if (flags.indexOf('r') < 0) {
      targets.forEach(function (p) {
        var f = expand(p, o.cwd);
        if (FS().isDir(f)) { o.err('rm: cannot remove \'' + p + '\': Is a directory'); return; }
        if (!FS().rm(f)) o.err('rm: cannot remove \'' + p + '\': No such file or directory');
      });
      return;
    }
    targets.forEach(function (p) {
      var f = expand(p, o.cwd);
      if (f === '/' || f === HOME()) { o.err('rm: refusing to remove \'' + p + '\''); return; }
      FS().walk(f, function (n, full) { FS().rm(full); });
      FS().rm(f);
    });
  });

  cmd('cp', 'copy a file', function (a, o) {
    if (a.length < 2) { o.err('cp: missing destination file operand'); return; }
    var src = expand(a[0], o.cwd), dst = expand(a[1], o.cwd);
    var c = FS().read(src);
    if (c == null) { o.err('cp: cannot stat \'' + a[0] + '\''); return; }
    if (FS().isDir(dst)) dst = P.join(dst, P.basename(src));
    FS().write(dst, c);
  });

  cmd('mv', 'move or rename', function (a, o) {
    if (a.length < 2) { o.err('mv: missing destination file operand'); return; }
    var src = expand(a[0], o.cwd), dst = expand(a[1], o.cwd);
    var n = FS().lookup(src);
    if (!n) { o.err('mv: cannot stat \'' + a[0] + '\''); return; }
    if (FS().isDir(dst)) dst = P.join(dst, P.basename(src));
    if (n.type === 'file') { FS().write(dst, n.content); FS().rm(src); }
    else { FS().mkdirp(dst); FS().list(src).forEach(function (c) { FS().write(P.join(dst, c.name), c.content || ''); }); FS().rm(src); }
  });

  cmd('touch', 'create an empty file', function (a, o) {
    a.forEach(function (p) { var f = expand(p, o.cwd); if (!FS().exists(f)) FS().write(f, ''); });
  });

  cmd('tree', 'show the directory tree', function (a, o) {
    var root = a.length ? expand(a[0], o.cwd) : o.cwd;
    if (!FS().isDir(root)) { o.err('tree: ' + (a[0] || root) + ': not a directory'); return; }
    var dirs = 0, files = 0;
    o.out('.' );
    (function rec(p, prefix) {
      var items = FS().list(p);
      items.forEach(function (n, i) {
        var last = i === items.length - 1;
        o.out(prefix + (last ? '└── ' : '├── ') + n.name + (n.type === 'dir' ? '/' : ''));
        if (n.type === 'dir') { dirs++; rec(P.join(p, n.name), prefix + (last ? '    ' : '│   ')); }
        else files++;
      });
    })(root, '');
    o.out('');
    o.out(dirs + ' directories, ' + files + ' files');
  });

  cmd('grep', 'search text (works with pipes)', function (a, o) {
    var flags = a.filter(function (x) { return x[0] === '-'; }).join('');
    var rest = a.filter(function (x) { return x[0] !== '-'; });
    var needle = rest.shift();
    if (!needle) { o.err('usage: grep [-i] PATTERN [FILE…]'); return; }
    var re;
    try { re = new RegExp(needle, flags.indexOf('i') >= 0 ? 'i' : ''); }
    catch (e) { re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
    var texts = [];
    if (!rest.length) texts = [o.stdin || ''];
    else rest.forEach(function (p) { texts.push(FS().read(expand(p, o.cwd)) || ''); });
    var n = 0;
    texts.forEach(function (txt) {
      txt.split('\n').forEach(function (line) {
        if (re.test(line)) { o.out(line); n++; }
      });
    });
    if (!n) o.code = 1;
  });

  cmd('wc', 'count lines, words and bytes', function (a, o) {
    var txt = a.length ? (FS().read(expand(a[0], o.cwd)) || '') : (o.stdin || '');
    var lines = txt ? txt.replace(/\n$/, '').split('\n').length : 0;
    var words = txt.split(/\s+/).filter(Boolean).length;
    o.out(String(lines).padStart(7) + String(words).padStart(8) + String(txt.length).padStart(8) + (a.length ? ' ' + a[0] : ''));
  });

  cmd('head', 'first lines', function (a, o) {
    var n = 10, i = a.indexOf('-n');
    if (i >= 0) { n = parseInt(a[i + 1], 10) || 10; a = a.slice(0, i).concat(a.slice(i + 2)); }
    var txt = a.length ? (FS().read(expand(a[0], o.cwd)) || '') : (o.stdin || '');
    o.out(txt.replace(/\n$/, '').split('\n').slice(0, n).join('\n'));
  });

  cmd('tail', 'last lines', function (a, o) {
    var n = 10, i = a.indexOf('-n');
    if (i >= 0) { n = parseInt(a[i + 1], 10) || 10; a = a.slice(0, i).concat(a.slice(i + 2)); }
    var txt = a.length ? (FS().read(expand(a[0], o.cwd)) || '') : (o.stdin || '');
    var ls = txt.replace(/\n$/, '').split('\n');
    o.out(ls.slice(Math.max(0, ls.length - n)).join('\n'));
  });

  cmd('find', 'find files by name', function (a, o) {
    var root = o.cwd, pat = null, i = a.indexOf('-name');
    if (i >= 0) pat = a[i + 1];
    var dirs = a.filter(function (x) { return x[0] !== '-'; });
    if (dirs.length && dirs[0] !== '-name') root = expand(dirs[0], o.cwd);
    var re = pat ? new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
    FS().walk(root, function (n, full) {
      if (!re || re.test(n.name)) o.out(full);
    });
  });

  cmd('which', 'locate a command', function (a, o) {
    a.forEach(function (n) { o.out(CMDS[n] ? '/usr/bin/' + n : 'which: no ' + n + ' in (/usr/bin:/usr/local/bin)'); });
  });

  cmd('whoami', 'print the current user', function (a, o) { o.out(user()); });
  cmd('hostname', 'print the hostname', function (a, o) { o.out(HOSTNAME); });
  cmd('date', 'print the date', function (a, o) { o.out(new Date().toString()); });
  cmd('uptime', 'show uptime and load', function (a, o) { o.out(OMA.Syslog.uptimeLine()); });

  cmd('uname', 'print system information', function (a, o) {
    var f = a.join('');
    if (f.indexOf('a') >= 0) o.out('Linux ' + HOSTNAME + ' 6.16.4-omarchy #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
    else if (f.indexOf('r') >= 0) o.out('6.16.4-omarchy');
    else o.out('Linux');
  });

  cmd('clear', 'clear the screen', function (a, o) { o.clearScreen(); });

  cmd('history', 'show command history', function (a, o) {
    o.history().forEach(function (c, i) { o.out(String(i + 1).padStart(5) + '  ' + c); });
  });

  cmd('alias', 'list shell aliases', function (a, o) {
    o.out("alias ls='eza --icons --group-directories-first'");
    o.out("alias cat='bat'");
    o.out("alias lg='lazygit'");
    o.out("alias v='nvim'");
    o.out("alias ic='mise exec --'");
  });

  cmd('env', 'print environment', function (a, o) {
    o.out('USER=' + user());
    o.out('HOME=' + HOME());
    o.out('SHELL=/bin/bash');
    o.out('EDITOR=nvim');
    o.out('VISUAL=nvim');
    o.out('TERM=foot');
    o.out('XDG_SESSION_TYPE=wayland');
    o.out('XDG_CURRENT_DESKTOP=Hyprland');
    o.out('OMARCHY_THEME=' + OMA.System.themeId);
  });

  cmd('neofetch', 'system summary', function (a, o) { o.out(neofetchLines().join('\n')); o.out(''); });
  cmd('fastfetch', 'system summary', function (a, o) { o.out(neofetchLines().join('\n')); o.out(''); });
  cmd('btop', 'open the activity monitor', function (a, o) { OMA.WM.open('btop'); });
  cmd('nvim', 'open the editor', function (a, o) { OMA.WM.open('editor', a[0] ? expand(a[0], o.cwd) : null); });
  cmd('vim', 'open the editor', function (a, o) { OMA.WM.open('editor', a[0] ? expand(a[0], o.cwd) : null); });
  cmd('lazygit', 'open the git TUI', function (a, o) { OMA.WM.open('lazygit', o.cwd); });
  cmd('lg', 'open the git TUI', function (a, o) { OMA.WM.open('lazygit', o.cwd); });
  cmd('chromium', 'open the browser', function (a, o) { OMA.WM.open('browser', a[0]); });
  cmd('xdg-open', 'open a file or URL', function (a, o) {
    var t = a[0] || '';
    if (/^https?:/.test(t)) OMA.WM.open('browser', t);
    else if (/\.(png|jpe?g|webp|gif|svg)$/i.test(t)) OMA.WM.open('viewer', expand(t, o.cwd));
    else if (/\.(mp4|mkv|webm|mov)$/i.test(t)) OMA.WM.open('media', expand(t, o.cwd));
    else OMA.WM.open('editor', expand(t, o.cwd));
  });
  cmd('omarchy-launch-terminal', 'open a terminal', function (a, o) { OMA.WM.open('terminal'); });
  cmd('omarchy-launch-browser', 'open the browser', function (a, o) { OMA.WM.open('browser'); });
  cmd('omarchy-launch-editor', 'open the editor', function (a, o) { OMA.WM.open('editor'); });
  cmd('omarchy-launch-about', 'open About', function (a, o) { OMA.System.about(); });

  cmd('omarchy-theme-set', 'apply a theme', function (a, o) {
    var name = a.join(' ');
    var t = OMA.Themes.byName(name);
    if (!t) { o.err('omarchy-theme-set: unknown theme "' + name + '"'); o.out('Available: ' + OMA.Themes.list.map(function (x) { return x.name; }).join(', ')); return; }
    OMA.System.setTheme(t.id);
    o.out('Theme set to ' + t.name);
  });

  cmd('omarchy-theme-list', 'list bundled themes', function (a, o) {
    OMA.Themes.list.forEach(function (t) {
      o.h('  ' + (t.id === OMA.System.themeId ? '• ' : '  ') + t.name.padEnd(20) + t.mode.padEnd(7) + t.accent);
    });
  });

  cmd('omarchy', 'the unified Omarchy command', function (a, o) {
    var group = a[0], sub = a[1];
    if (!group) {
      o.out('Usage: omarchy <command> [args…]');
      o.out('');
      o.table([
        ['theme', 'list | set <name> | bg <n>'], ['pkg', 'add <pkg> | drop <pkg>'],
        ['update', 'install the latest release, run migrations, update packages'],
        ['menu', 'summon <path> | toggle | close'], ['bar', 'position top|bottom|left|right'],
        ['plugin', 'list | enable | disable'], ['channel', 'stable | rc | edge | dev'],
        ['screenshot', 'capture the screen'], ['toggle', 'nightlight | stay-awake | gaps'],
        ['font', 'list | set <name>'], ['default', 'browser <name> | terminal <name>'],
        ['clipboard', 'show | clear'], ['reminder', 'set | show | clear'],
        ['transcode', '<file> mp4 1080p'], ['tailscale', 'send <machine> [file…]'],
        ['reinstall', 'restore the default system'], ['debug', 'system information']
      ]);
      o.out('');
      o.out('Run `omarchy commands` for the full group list.');
      return;
    }
    if (group === 'commands') {
      var groups = ['agent', 'ascii', 'audio', 'bar', 'battery', 'bluetooth', 'branch', 'branding', 'brightness',
        'capture', 'channel', 'clipboard', 'cmd', 'config', 'crash', 'debug', 'default', 'dev', 'dictation',
        'disk', 'display', 'dns', 'drive', 'file', 'finalize', 'font', 'games', 'hibernation', 'hook', 'hw',
        'hyprland', 'install', 'installed', 'launch', 'menu', 'migrate', 'mise', 'monitor', 'network',
        'notification', 'openclaw', 'osd', 'pkg', 'plugin', 'plymouth', 'power', 'powerprofiles', 'refresh',
        'reinstall', 'reminder', 'remove', 'restart', 'screensaver', 'setup', 'shell', 'snapshot', 'sudo',
        'system', 'tailscale', 'theme', 'toggle', 'transcode', 'tui', 'update', 'version', 'voxtype',
        'weather', 'webapp', 'wifi', 'windows'];
      var rows = [];
      for (var i = 0; i < groups.length; i += 3) rows.push(groups.slice(i, i + 3));
      o.table(rows);
      return;
    }
    if (group === 'version') { o.out('omarchy 4.0.4 (Quattro)'); return; }
    if (group === 'channel') { o.out('Channel: ' + OMA.System.channel); return; }
    if (group === 'theme') {
      if (sub === 'list') { CMDS['omarchy-theme-list'].fn([], o); return; }
      if (sub === 'set') { CMDS['omarchy-theme-set'].fn(a.slice(2), o); return; }
      if (sub === 'bg') {
        var n = parseInt(a[2], 10);
        OMA.System.setWallpaper(isNaN(n) ? OMA.System.wallIndex + 1 : n);
        o.out('Background set to ' + OMA.Wallpapers.set[OMA.System.wallIndex].name);
        return;
      }
      o.out('Usage: omarchy theme list | set <name> | bg <n>');
      return;
    }
    if (group === 'update') {
      o.stream([
        '[omarchy] channel: ' + OMA.System.channel,
        '[omarchy] fetching release manifest…',
        '[omarchy] 4.0.4 is the latest release',
        '[omarchy] running pending migrations…',
        '  migrate/1758000000-add-spotify-panel.sh ......... ok',
        '  migrate/1758100000-owe-video-backgrounds.sh .... ok',
        '[omarchy] pacman -Syu',
        ':: Synchronising package databases…',
        ' omarchy           12.4 MiB  8.1 MiB/s 00:02 [######] 100%',
        ' core             131.2 MiB  22.6 MiB/s 00:06 [######] 100%',
        ':: Starting full system upgrade…',
        ' linux-omarchy  4.0.3-1 -> 4.0.4-1',
        ' omarchy        4.0.3-1 -> 4.0.4-1',
        ' hyprland       0.56.0-1 -> 0.56.1-1',
        ' quickshell     0.3.2-1 -> 0.3.3-1',
        '[omarchy] system is up to date',
        'Updating the Omarchy package repository… done'
      ], function () {
        OMA.System.updates = 0;
        OMA.Shell.renderBar();
        OMA.Shell.notify({ app: 'Omarchy', icon: 'check', summary: 'System updated', body: 'Omarchy 4.0.4 · migrations applied · packages current.' });
        o.out('');
        o.prompt();
      });
      return;
    }
    if (group === 'pkg') {
      var pkg = a.slice(2).join(' ').replace(/"/g, '');
      if (!pkg) { o.out('Usage: omarchy pkg add <pkg> | drop <pkg>'); return; }
      var verb = sub === 'drop' ? 'Removing' : 'Installing';
      o.stream([
        '[omarchy] ' + verb.toLowerCase() + ' ' + pkg,
        'resolving dependencies…',
        ':: ' + pkg + '  (1 of 3)',
        ':: ' + pkg + '-libs  (2 of 3)',
        ':: ' + pkg + '-docs  (3 of 3)',
        'installing… [######] 100%',
        '[omarchy] ' + pkg + ' ' + (sub === 'drop' ? 'removed' : 'installed')
      ], function () {
        OMA.System.packages[pkg] = sub === 'drop' ? 'removed' : 'installed';
        o.out('');
        o.prompt();
      });
      return;
    }
    if (group === 'install') {
      var target = a.slice(1).join(' ').replace(/"/g, '');
      o.stream([
        '[omarchy] installing ' + target,
        ':: resolving package set for "' + target + '"',
        ':: mise install … ok',
        ':: docker compose up -d db redis … ok',
        ':: writing configs to ~/.config/' + target.toLowerCase().replace(/[^a-z]/g, ''),
        '[omarchy] ' + target + ' ready'
      ], function () {
        OMA.System.packages[target] = 'installed';
        OMA.Shell.notify({ app: 'omarchy install', icon: 'check', summary: target + ' installed', body: 'From the Omarchy menu — Install.' });
        o.out('');
        o.prompt();
      });
      return;
    }
    if (group === 'remove') {
      var t2 = a.slice(1).join(' ').replace(/"/g, '');
      o.stream(['[omarchy] removing ' + t2, ':: pacman -Rns …', '[omarchy] ' + t2 + ' removed'], function () {
        OMA.System.packages[t2] = 'removed';
        o.out(''); o.prompt();
      });
      return;
    }
    if (group === 'menu') { OMA.Menu.open(a[2] === 'apps' ? 'apps' : 'all', a[2] && a[2] !== 'apps' ? a[2] : null); o.out('menu summoned'); return; }
    if (group === 'bar') {
      if (sub === 'position' && a[2]) { document.body.dataset.barPos = a[2]; o.out('bar position: ' + a[2]); }
      else if (sub === 'transparent') { OMA.System.barTransparent = !OMA.System.barTransparent; document.body.classList.toggle('bar-transparent', OMA.System.barTransparent); o.out('bar transparency toggled'); }
      else o.out('Usage: omarchy bar position top|bottom|left|right | transparent toggle');
      return;
    }
    if (group === 'toggle') {
      if (sub === 'nightlight') { OMA.System.toggleNightlight(); o.out('nightlight toggled'); }
      else if (sub === 'gaps') { OMA.WM.setGaps(!OMA.WM.gaps); o.out('gaps toggled'); }
      else if (sub === 'stay-awake') { OMA.System.stayAwake = !OMA.System.stayAwake; o.out('stay awake toggled'); }
      else o.out('Usage: omarchy toggle nightlight|gaps|stay-awake|…');
      return;
    }
    if (group === 'font') { o.out('JetBrainsMono Nerd Font  (default)'); o.out('Cascadia Code · MesloLGS NF · FiraCode Nerd Font · Victor Mono · Iosevka Nerd Font'); return; }
    if (group === 'screenshot') { OMA.Capture.screenshot(); o.out('capture overlay opened'); return; }
    if (group === 'clipboard') { OMA.Capture.clipboardHistory(); return; }
    if (group === 'reminder') { OMA.Shell.remind(); return; }
    if (group === 'plugin') { o.out('omarchy.menu        enabled   (left)'); o.out('omarchy.workspaces  enabled   (left)'); o.out('omarchy.clock       enabled   (center)'); o.out('omarchy.media       disabled'); o.out('omarchy.microphone  disabled'); return; }
    if (group === 'debug') { o.out('omarchy 4.0.4 · hyprland 0.56.1 · quickshell 0.3.3 · bash 5.3.3 · foot 1.23.1'); return; }
    if (group === 'reinstall') { o.out('omarchy reinstall would restore default packages and reset configs.'); return; }
    if (group === 'installed') {
      var rows2 = Object.keys(OMA.System.packages).map(function (k) { return [k, OMA.System.packages[k]]; });
      if (!rows2.length) o.out('nothing installed through this session');
      else o.table(rows2);
      return;
    }
    o.err('omarchy: unknown command "' + group + '" — try `omarchy commands`');
  });

  cmd('pacman', 'package manager', function (a, o) {
    if (a.indexOf('-Syu') >= 0 || a.indexOf('-Syu'.replace('y', 'yy')) >= 0 || a.join('').indexOf('Syu') >= 0) {
      o.err('error: direct `pacman -Syu` is blocked by Omarchy.');
      o.out('Use `omarchy update` — it also runs migrations and keeps snapshots.');
      return;
    }
    if (a.indexOf('-Ss') >= 0) {
      var q = a[a.indexOf('-Ss') + 1] || '';
      o.out('omarchy/' + q + ' 4.0.4-1');
      o.out('    ' + (q || 'package') + ' — from the Omarchy package repository');
      return;
    }
    if (a.indexOf('-Q') >= 0) { o.out('omarchy 4.0.4-1'); o.out('linux-omarchy 6.16.4-1'); o.out('hyprland 0.56.1-1'); o.out('quickshell 0.3.3-1'); return; }
    if (a.indexOf('-S') >= 0) { var p = a[a.indexOf('-S') + 1] || ''; CMDS['omarchy'].fn(['pkg', 'add', p], o); return; }
    o.out('usage: pacman -Ss <query> | -Q | -S <pkg>   (upgrades go through `omarchy update`)');
  });
  cmd('yay', 'AUR helper', function (a, o) {
    var p = a[a.length - 1];
    o.stream([':: Searching AUR for ' + p + '…', ':: building ' + p + ' (1/1)', 'installing… [######] 100%', '[yay] ' + p + ' installed'], function () { o.out(''); o.prompt(); });
  });

  cmd('git', 'version control', function (a, o) {
    var sub = a[0];
    if (sub === 'status') {
      o.out('On branch main');
      o.out('Your branch is up to date with \'origin/main\'.');
      o.out('');
      o.out('Changes not staged for commit:');
      o.out('  modified:   src/themes.js');
      o.out('  modified:   src/wm.js');
      o.out('');
      o.out('Untracked files:');
      o.out('  src/appterm.js');
      return;
    }
    if (sub === 'log') {
      [['a91f3c2', 'add Quattro bar layout'], ['7d2e881', 'dwindle: alternate split axis on insert'],
      ['31b0a44', 'themes: all 23 palettes'], ['e04c9aa', 'shell: native OSD replaces SwayOSD']].forEach(function (c) {
        o.out(c[0] + ' ' + c[1]);
      });
      return;
    }
    if (sub === 'branch') { o.out('* main'); o.out('  quattro'); o.out('  edge'); return; }
    if (sub === 'diff') { o.out('diff --git a/src/wm.js b/src/wm.js'); o.out('@@ -128,6 +128,9 @@'); o.out('+  ws.tree = replaceLeaf(ws.tree, ws.focus, split(dir, leaf(ws.focus), nl));'); return; }
    o.out('usage: git status | log | branch | diff');
  });

  cmd('docker', 'containers', function (a, o) {
    if (a[0] === 'ps') {
      o.table([['CONTAINER ID', 'IMAGE', 'STATUS', 'PORTS', 'NAMES'],
      ['8f2c1a9b3d41', 'postgres:17', 'Up 3 hours', '5432->5432', 'omarchy-db'],
      ['c41d0e7a2f88', 'redis:7', 'Up 3 hours', '6379->6379', 'omarchy-redis']], true);
      return;
    }
    if (a[0] === 'compose') { o.out('docker compose: db and redis are up'); return; }
    o.out('usage: docker ps | compose up -d');
  });

  cmd('mise', 'dev tool manager', function (a, o) {
    if (a[0] === 'ls') {
      o.table([['ruby', '3.4.1'], ['node', '24.11.1'], ['go', '1.24.0'], ['elixir', '1.18.2']]);
      return;
    }
    var g = a.indexOf('exec') >= 0 ? a.slice(a.indexOf('exec') + 2) : a.slice(1);
    if (g.length) { execute(g.join(' '), o, true); return; }
    o.out('usage: mise ls | mise exec -- <cmd> | mise install <tool>@<version>');
  });
  cmd('ic', 'run a command through mise', function (a, o) { if (a.length) execute(a.join(' '), o, true); else o.out('usage: ic <cmd>'); });
  cmd('ix', 'run a command through mise', function (a, o) { if (a.length) execute(a.join(' '), o, true); else o.out('usage: ix <cmd>'); });

  cmd('rails', 'Ruby on Rails', function (a, o) {
    if (a[0] === 's' || a[0] === 'server') { o.stream(['=> Booting Puma', '=> Rails 8.1.0 application starting in development', '=> Listening on http://127.0.0.1:3000'], function () { o.out(''); o.prompt(); }); return; }
    o.out('usage: rails server | new | console');
  });
  cmd('mix', 'Elixir', function (a, o) { o.out('mix 1.18.2'); });
  cmd('go', 'Go toolchain', function (a, o) { o.out('go version go1.24.0 linux/amd64'); });

  cmd('systemctl', 'service control', function (a, o) {
    if (a.indexOf('status') >= 0) {
      var svc = a[a.indexOf('status') + 1] || 'omarchy-shell';
      o.out('• ' + svc + '.service - ' + svc);
      o.out('     Loaded: loaded (/usr/lib/systemd/user/' + svc + '.service; enabled)');
      o.out('     Active: active (running) since ' + fmt.date());
      return;
    }
    o.out('systemctl: try `systemctl status omarchy-shell`');
  });

  cmd('journalctl', 'system log', function (a, o) {
    ['[omarchy-shell] bar layout loaded from ~/.config/omarchy/shell.json',
      '[omarchy-shell] theme Tokyo Night applied to 6 surfaces',
      '[hyprland] dwindle: new window split on axis v',
      '[omarchy] update channel stable',
      '[systemd] Reached target Graphical Interface.'].forEach(function (l) { o.out(l); });
  });

  cmd('df', 'disk usage', function (a, o) {
    o.table([['Filesystem', 'Size', 'Used', 'Avail', 'Use%', 'Mounted on'],
    ['/dev/nvme0n1p2', '1.9T', '84G', '1.7T', '5%', '/'],
    ['/dev/nvme0n1p1', '1G', '312M', '688M', '32%', '/boot'],
    ['tmpfs', '16G', '42M', '16G', '1%', '/tmp']], true);
  });
  cmd('free', 'memory usage', function (a, o) {
    o.table([['', 'total', 'used', 'free', 'shared', 'cache', 'available'],
    ['Mem:', '32Gi', '3.1Gi', '24Gi', '412Mi', '4.6Gi', '28Gi'],
    ['Swap:', '8.0Gi', '0B', '8.0Gi', '', '', '']], true);
  });
  cmd('ps', 'process list', function (a, o) {
    o.table(OMA.Syslog.procs().map(function (p) {
      return [String(p.pid), p.user, p.cpu.toFixed(1), p.mem.toFixed(1), p.cmd];
    }), true);
  });
  cmd('top', 'live process view', function (a, o) { OMA.WM.open('btop'); });

  cmd('tdl', 'dev layout: editor + AI + terminal', function (a, o) {
    var ai = a[0] || OMA.System.defaults.agent.toLowerCase();
    OMA.WM.open('editor');
    OMA.WM.open('agent', ai);
    OMA.WM.open('terminal', { run: 'git status' });
    o.out('tdl: created dev layout with ' + ai);
  });
  cmd('tdlm', 'dev layout per subdirectory', function (a, o) { CMDS['tdl'].fn(a, o); o.out('tdlm: layout created per subdirectory'); });
  cmd('tsl', 'swarm layout', function (a, o) {
    var n = Math.min(6, parseInt(a[0], 10) || 3);
    for (var i = 0; i < n; i++) OMA.WM.open('terminal', { run: 'echo pane ' + (i + 1) });
    o.out('tsl: spawned ' + n + ' panes running: ' + (a.slice(1).join(' ') || 'bash'));
  });
  cmd('tds', 'dev layout, single pane', function (a, o) { CMDS['tdl'].fn(a, o); });
  cmd('herdr', 'agent manager', function (a, o) { OMA.WM.open('agent'); o.out('herdr: workspace manager'); });

  cmd('sudo', 'run as root', function (a, o) {
    if (!a.length) { o.err('usage: sudo <command>'); return; }
    o.out('[sudo] password for ' + user() + ': ********');
    execute(a.join(' '), o, true);
  });

  cmd('exit', 'close this terminal', function (a, o) { o.close(); });
  cmd('logout', 'close this terminal', function (a, o) { o.close(); });

  cmd('curl', 'fetch a URL', function (a, o) {
    o.out('HTTP/2 200');
    o.out('content-type: text/html; charset=utf-8');
    o.out('');
    o.out('<!doctype html><title>Omarchy</title><h1>Beautiful, fun & agentic Linux</h1>');
  });
  cmd('htop', 'open the activity monitor', function (a, o) { OMA.WM.open('btop'); });

  /* --------------------------------------------------------------- output */
  function neofetchLines() {
    var t = OMA.Themes.current;
    var art = [
      '                    ///                    ',
      '                 ///////                  ',
      '              ///////////                 ',
      '           ///////  ///////               ',
      '        ///////        ///////            ',
      '     ////////////////////////////         ',
      '   ///////                    ///////     ',
      '  /////////////////////////////////       '
    ];
    var info = [
      user() + '@' + HOSTNAME,
      '-----------------------',
      'OS: Omarchy 4.0.4 (Quattro) x86_64',
      'Kernel: linux-omarchy 6.16.4',
      'WM: Hyprland (Lua config)',
      'Shell: bash 5.3.3',
      'Terminal: Foot',
      'Theme: ' + t.name + ' [' + t.mode + ']',
      'Uptime: ' + OMA.Syslog.uptime()
    ];
    var out = [];
    for (var i = 0; i < Math.max(art.length, info.length); i++) {
      out.push((art[i] || '').padEnd(44) + (info[i] || ''));
    }
    return out;
  }

  /* ------------------------------------------------------------ executor */
  function execute(line, io, silent) {
    var stages = splitPipeline(line);
    if (!stages.length) return;
    var stdin = '';
    stages.forEach(function (stage, si) {
      var toks = tokenize(stage);
      if (!toks.length) return;
      var name = toks[0], args = toks.slice(1);

      /* redirection */
      var redirect = null, append = false, filtered = [];
      for (var i = 0; i < args.length; i++) {
        if (args[i] === '>' || args[i] === '>>') { redirect = args[i + 1]; append = args[i] === '>>'; i++; continue; }
        filtered.push(args[i]);
      }
      args = filtered;

      var buf = [];
      var sub = Object.create(io);
      sub.out = function (s) { buf.push(s == null ? '' : String(s)); };
      sub.err = function (s) { buf.push(OMA.Themes.current.red + (s == null ? '' : String(s)) + '\u0000reset'); };
      sub.h = function (s) { buf.push('\u0000html:' + s); };
      sub.table = function (rows, raw) {
        var cols = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        var widths = [];
        rows.forEach(function (r) { r.forEach(function (c, i) { widths[i] = Math.max(widths[i] || 0, String(c).length); }); });
        rows.forEach(function (r) {
          var line = r.map(function (c, i) { return raw ? String(c).padEnd(widths[i]) : String(c).padEnd(widths[i] + 2); }).join('');
          buf.push(line.replace(/\s+$/, ''));
        });
      };
      sub.stdin = stdin;
      sub.stream = function (lines, done) {
        var i = 0;
        var each = setInterval(function () {
          if (i >= lines.length) {
            clearInterval(each);
            done && done();
            return;
          }
          var s = lines[i++];
          io.out(s);
          OMA.bus.emit('term:line', s);
        }, 110);
      };

      var c = CMDS[name];
      if (!c) {
        io.err('bash: ' + name + ': command not found');
        io.code = 127;
      } else {
        try { c.fn(args, sub); } catch (e) { io.err(name + ': ' + e.message); OMA.log('cmd:' + name, e); }
      }

      var text = buf.join('\n');
      if (redirect) {
        var path = expand(redirect, io.cwd);
        var existing = append ? (FS().read(path) || '') : '';
        FS().write(path, existing + text + '\n');
      } else {
        text.split('\n').forEach(function (l) { io.raw(l); });
      }
      stdin = text;
    });
  }

  /* ---------------------------------------------------------------- mount */
  OMA.WM.registry.register({
    id: 'terminal', name: 'Terminal', icon: 'terminal', comment: 'Foot — the Omarchy default terminal',
    title: function () { return 'foot — ' + (OMA.Store.get('user') || 'oma') + '@' + HOSTNAME; },
    defaultArg: function () { return { }; },

    mount: function (body, win) {
      var arg = win.props.arg || {};
      var wrap = h('div.oma-term');
      var scroll = h('div.oma-term-scroll');
      var inputRow = h('div.oma-term-inputrow');
      var promptEl = h('span.oma-term-prompt');
      var input = h('input.oma-term-input', { spellcheck: 'false', autocomplete: 'off' });
      inputRow.appendChild(promptEl);
      inputRow.appendChild(input);
      wrap.appendChild(scroll);
      wrap.appendChild(inputRow);
      body.appendChild(wrap);

      var cwd = HOME();
      var history = OMA.Store.get('termHistory') || [];
      var histIdx = history.length;
      var draft = '';
      var io = {
        cwd: cwd,
        stdin: '',
        out: function (s) { line(s); },
        err: function (s) { line('\u0000color:' + OMA.Themes.current.red + ':' + s); },
        h: function (s) { OMA.append(scroll, h('div.oma-term-line', { html: s })); scrollTop(); },
        table: function (rows, raw) {
          var widths = [];
          rows.forEach(function (r) { r.forEach(function (c, i) { widths[i] = Math.max(widths[i] || 0, String(c).length); }); });
          rows.forEach(function (r) {
            line(r.map(function (c, i) { return String(c).padEnd(widths[i] + (raw ? 0 : 2)); }).join('').replace(/\s+$/, ''));
          });
        },
        raw: function (s) {
          if (s == null || s === '') { line(''); return; }
          if (s.indexOf('\u0000reset') >= 0) { line(s.replace('\u0000reset', '')); return; }
          line(s);
        },
        setCwd: function (p) { cwd = p; io.cwd = p; paintPrompt(); },
        clearScreen: function () { clear(scroll); },
        close: function () { OMA.WM.close(win.wid); },
        prompt: function () { input.focus(); }
      };
      io.history = function () { return history; };

      function line(s) {
        if (s && s.indexOf('\u0000color:') === 0) {
          var rest = s.slice(8), idx = rest.indexOf(':');
          var col = rest.slice(0, idx), msg = rest.slice(idx + 1);
          scroll.appendChild(h('div.oma-term-line', { style: { color: col }, text: msg }));
        } else {
          scroll.appendChild(h('div.oma-term-line', { text: s == null ? '' : String(s) }));
        }
        scrollTop();
      }
      function scrollTop() { scroll.scrollTop = scroll.scrollHeight; }

      function paintPrompt() {
        clear(promptEl);
        promptEl.appendChild(h('span.pt-user', { text: user() }));
        promptEl.appendChild(h('span.pt-at', { text: '@' }));
        promptEl.appendChild(h('span.pt-host', { text: HOSTNAME }));
        promptEl.appendChild(h('span.pt-colon', { text: ':' }));
        promptEl.appendChild(h('span.pt-dir', { text: cwdDisplay(cwd) }));
        promptEl.appendChild(h('span.pt-arrow', { text: ' ❯ ' }));
      }

      function submit(lineText) {
        /* echo the command into the transcript */
        var echo = h('div.oma-term-line.oma-term-echo');
        echo.appendChild(h('span.pt-user', { text: user() }));
        echo.appendChild(h('span.pt-at', { text: '@' }));
        echo.appendChild(h('span.pt-host', { text: HOSTNAME }));
        echo.appendChild(h('span.pt-colon', { text: ':' }));
        echo.appendChild(h('span.pt-dir', { text: cwdDisplay(cwd) }));
        echo.appendChild(h('span.pt-arrow', { text: ' ❯ ' }));
        echo.appendChild(document.createTextNode(lineText));
        scroll.appendChild(echo);

        /* && chains */
        var parts = lineText.split('&&');
        parts.forEach(function (part) {
          var t = part.trim();
          if (!t) return;
          if (/\|\s*less\s*$/.test(t)) t = t.replace(/\|\s*less\s*$/, '');
          execute(t, io);
        });
        io.prompt();
        scrollTop();
      }

      /* completion */
      function complete() {
        var val = input.value;
        var toks = val.split(/\s+/);
        var last = toks[toks.length - 1] || '';
        if (toks.length === 1) {
          var matches = Object.keys(CMDS).filter(function (c) { return c.indexOf(last) === 0; });
          if (matches.length === 1) { input.value = matches[0] + ' '; }
          else if (matches.length > 1) {
            line(val);
            line(matches.join('   '));
          }
          return;
        }
        var base = last, dir = cwd, frag = base;
        if (base.indexOf('/') >= 0) {
          dir = expand(base.slice(0, base.lastIndexOf('/') + 1), cwd);
          frag = base.slice(base.lastIndexOf('/') + 1);
        }
        var items = FS().list(dir).filter(function (n) { return n.name.indexOf(frag) === 0; });
        if (items.length === 1) {
          var done = items[0].name + (items[0].type === 'dir' ? '/' : '');
          toks[toks.length - 1] = (base.indexOf('/') >= 0 ? base.slice(0, base.lastIndexOf('/') + 1) : '') + done;
          input.value = toks.join(' ');
        } else if (items.length > 1) {
          line(val);
          line(items.map(function (n) { return n.name + (n.type === 'dir' ? '/' : ''); }).join('   '));
        }
      }

      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
          var v = input.value;
          input.value = '';
          if (v.trim()) {
            history.push(v);
            if (history.length > 300) history.shift();
            OMA.Store.set('termHistory', history);
            histIdx = history.length;
          }
          submit(v);
        } else if (e.key === 'Tab') {
          e.preventDefault(); complete();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (histIdx > 0) { if (histIdx === history.length) draft = input.value; histIdx--; input.value = history[histIdx]; }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (histIdx < history.length) { histIdx++; input.value = histIdx === history.length ? draft : history[histIdx]; }
        } else if (e.key === 'l' && e.ctrlKey) {
          e.preventDefault(); clear(scroll);
        } else if (e.key === 'c' && e.ctrlKey) {
          e.preventDefault();
          line(input.value + '^C');
          input.value = '';
        } else if (e.key === 'u' && e.ctrlKey) {
          e.preventDefault(); input.value = '';
        }
      });
      wrap.addEventListener('mousedown', function (e) {
        if (window.getSelection().toString()) return;
        if (e.target === input) return;
        setTimeout(function () { input.focus(); }, 0);
      });

      paintPrompt();

      /* banner */
      line('\u0000color:' + OMA.Themes.current.cyan + ':Omarchy 4.0.4 (Quattro)  ·  foot 1.23.1  ·  bash 5.3.3');
      line('Type `help` for commands, `omarchy` for the Omarchy CLI, `neofetch` for the summary.');
      line('');

      if (arg && arg.run) setTimeout(function () { submit(String(arg.run)); }, 240);
      setTimeout(function () { input.focus(); }, 60);

      win.term = { submit: submit, io: io, focus: function () { input.focus(); } };
    },

    onReopen: function (win) { if (win.term) win.term.focus(); }
  });

  OMA.Term = { CMDS: CMDS, execute: execute, HOME: HOME, tokenize: tokenize, hostname: HOSTNAME };
})(window.OMA = window.OMA || {});
