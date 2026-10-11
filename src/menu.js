/* ============================================================================
 * Omarchy Web Clone — menu.js
 * ----------------------------------------------------------------------------
 * The unified Omarchy menu. In Quattro, `Super + Space` is ONE menu holding
 * both apps and every command (the Walker launcher was folded into it), while
 * `Super + Alt + Space` opens the apps-only view.
 *
 * Root keys, in upstream file order (default/omarchy/omarchy-menu.jsonc):
 *   Apps · Learn · Trigger · Style · Setup · Install · Remove · Update ·
 *   About · System
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, I = OMA.Shell.icons;

  var M = { stack: [], mode: 'all', query: '', sel: 0, items: [], el: null, apps: {}, installed: {} };

  /* -------------------------------------------------------- installed pkgs */
  M.installed = {
    'foot': true, 'neovim': true, 'btop': true, 'lazygit': true, 'chromium': true,
    'herdr': true, 'cliamp': true, 'mise': true, 'docker': true, 'hyprsunset': true,
    'fastfetch': true, 'jq': true, 'ripgrep': true, 'fzf': true, 'zoxide': true,
    'tmux': true, 'obsidian': true, 'signal-desktop': true, 'libreoffice-fresh': true,
    '1password': false, 'spotify': false, 'slack': false, 'tailscale': false
  };

  /* ------------------------------------------------------------- base tree */
  function T(name, icon, children, action, hint) {
    return { name: name, icon: icon, children: children || null, action: action || null, hint: hint || '' };
  }

  function themeChildren() {
    return OMA.Themes.list.map(function (t) {
      return T(t.name, 'palette', null, function () { OMA.System.setTheme(t.id); }, t.mode);
    });
  }

  M.build = function () {
    var learn = [
      T('Keybindings', 'keyboard', null, function () { M.keybindingsOverlay(); }, 'Super + K'),
      T('Omarchy', 'book', null, function () { M.manualOverlay(); }),
      T('Hyprland', 'layout', null, function () { OMA.WM.open('browser', 'https://wiki.hypr.land'); }),
      T('Arch', 'book', null, function () { OMA.WM.open('browser', 'https://wiki.archlinux.org'); }),
      T('Neovim', 'edit', null, function () { OMA.WM.open('editor', OMA.VFS ? '/home/oma/.config/nvim/init.lua' : null); }),
      T('Bash', 'terminal', null, function () { OMA.WM.open('terminal', { run: 'help' }); }),
      T('Tmux', 'layout', null, function () { M.overlay('tmux', 'Tmux cheat sheet', [
        'Prefix is Ctrl + Space (Ctrl + B also works).',
        'Prefix + v   split beside        Prefix + h   split below',
        'Prefix + x   kill pane           Prefix + z   zoom pane',
        'Alt + Enter  split below (no prefix)',
        'Ctrl + Alt + arrows  move between panes',
        'Prefix + c / k / r   new / kill / rename window',
        'Prefix + d   detach              Prefix + [   copy mode',
        'tdl <ai>     dev layout with editor, AI and terminal',
        'tsl <n> <cmd>  swarm layout'
      ]); }),
      T('Herdr', 'agent', null, function () { OMA.WM.open('terminal', { run: 'herdr' }); }, 'Super + Ctrl + Return'),
      T('Community', 'globe', null, function () { OMA.WM.open('browser', 'https://omarchy.org'); })
    ];

    var appearance = [
      T('Animations', 'layout', null, function () {
        OMA.System.animations = !OMA.System.animations;
        document.documentElement.classList.toggle('no-anim', !OMA.System.animations);
        M.flash('Animations ' + (OMA.System.animations ? 'enabled' : 'disabled'));
      }),
      T('Menu Bar', 'monitor', [
        T('Hide Bar', 'monitor', null, function () { OMA.WM.setBar(false); M.flash('Bar hidden — Super + Shift + Space'); }),
        T('Show Bar', 'monitor', null, function () { OMA.WM.setBar(true); M.flash('Bar shown'); }),
        T('Position Bar', 'monitor', null, function () {
          var seq = ['top', 'bottom', 'left', 'right'];
          OMA.System.barPos = seq[(seq.indexOf(OMA.System.barPos) + 1) % 4];
          document.body.dataset.barPos = OMA.System.barPos;
          M.flash('Bar position: ' + OMA.System.barPos);
        }),
        T('Transparent Bar', 'monitor', null, function () {
          OMA.System.barTransparent = !OMA.System.barTransparent;
          document.body.classList.toggle('bar-transparent', OMA.System.barTransparent);
          M.flash('Bar transparency: ' + (OMA.System.barTransparent ? 'transparent' : 'opaque'));
        })
      ]),
      T('Indicators', 'activity', [
        T('Battery Percentage', 'battery', null, function () { M.flash('Battery percentage toggled'); })
      ]),
      T('Clock', 'clock', [
        T('dddd HH:mm', 'clock', null, function () { OMA.System.clockAlt = false; OMA.Shell.renderBar(); }),
        T("d MMMM 'W'ww yyyy", 'clock', null, function () { OMA.System.clockAlt = true; OMA.Shell.renderBar(); }),
        T('HH:mm', 'clock', null, function () { OMA.System.clockAlt = false; OMA.Shell.renderBar(); })
      ]),
      T('Window Gaps', 'layout', null, function () {
        OMA.WM.setGaps(!OMA.WM.gaps);
        M.flash('Window gaps ' + (OMA.WM.gaps ? 'on' : 'off'));
      }, 'Super + Shift + Backspace'),
      T('Window Corners', 'layout', [
        T('Theme Default', 'layout', null, function () { document.documentElement.style.setProperty('--radius', '10px'); M.flash('Corners: theme'); }),
        T('Sharp', 'layout', null, function () { document.documentElement.style.setProperty('--radius', '0px'); M.flash('Corners: sharp'); }),
        T('Rounded', 'layout', null, function () { document.documentElement.style.setProperty('--radius', '16px'); M.flash('Corners: rounded'); })
      ]),
      T('1-Window Ratio', 'layout', null, function () { M.flash('1-window ratio: 60%'); }),
      T('Workspace Layout', 'layout', [
        T('Tiling', 'layout', null, function () { OMA.WM.ws().layout = 'dwindle'; OMA.WM.render(); M.flash('Workspace layout: tiling'); }),
        T('Scrolling', 'layout', null, function () { OMA.WM.ws().layout = 'scrolling'; OMA.WM.render(); M.flash('Workspace layout: scrolling'); }),
        T('Floating', 'layout', null, function () { OMA.WM.ws().layout = 'floating'; OMA.WM.render(); M.flash('Workspace layout: floating'); })
      ]),
      T('Herdr Theme Sync', 'agent', null, function () { M.flash('Herdr theme synced'); })
    ];

    var toggle = [
      T('Stay Awake', 'sun', null, function () { OMA.System.stayAwake = !OMA.System.stayAwake; M.flash('Stay awake: ' + OMA.System.stayAwake); }),
      T('Notifications', 'bell', null, function () { OMA.System.toggleSilence(); }),
      T('Nightlight', 'moon', null, function () { OMA.System.toggleNightlight(); }, 'Super + Ctrl + N'),
      T('Screensaver', 'monitor', null, function () { OMA.Shell.screensaver(); }),
      T('Crash Capture', 'camera', null, function () { M.flash('Crash capture: on'); })
    ];

    var capture = [
      T('Screenshot', 'camera', null, function () { OMA.Capture.screenshot(); }, 'Print Screen'),
      T('Screenrecord — no audio', 'camera', null, function () { OMA.Capture.record('none'); }, 'Alt + Print Screen'),
      T('Screenrecord — desktop audio', 'camera', null, function () { OMA.Capture.record('desktop'); }),
      T('Screenrecord — desktop + mic', 'camera', null, function () { OMA.Capture.record('desktop+mic'); }),
      T('Screenrecord — desktop + mic + webcam', 'camera', null, function () { OMA.Capture.record('all'); }),
      T('Stop Screenrecording', 'remove', null, function () { OMA.Capture.stopRecord(); }),
      T('Text', 'edit', null, function () { OMA.Capture.textExtract(); }, 'Super + Ctrl + PrtSc'),
      T('QR Code', 'layers', null, function () { M.flash('QR code copied to clipboard'); }),
      T('Color', 'palette', null, function () { OMA.Capture.colorPicker(); }, 'Super + Print Screen')
    ];

    var trigger = [
      T('Appearance', 'palette', appearance),
      T('Toggle', 'check', toggle),
      T('Emoji', 'emoji', null, function () { OMA.Capture.emojiPicker(); }, 'Super + Ctrl + E'),
      T('Clipboard History', 'clipboard', null, function () { OMA.Capture.clipboardHistory(); }, 'Super + Ctrl + V'),
      T('Reminder', 'bell', [
        T('Set one', 'bell', null, function () { OMA.Shell.remind(); }, 'Super + Ctrl + R'),
        T('Show all', 'bell', null, function () { OMA.Shell.showReminders(); }, 'Super + Ctrl + Alt + R'),
        T('Clear all', 'remove', null, function () { OMA.Shell.clearReminders(); }, 'Super + Ctrl + Shift + R')
      ]),
      T('Capture', 'camera', capture),
      T('Transcode', 'refresh', null, function () { OMA.WM.open('terminal', { run: 'omarchy transcode ~/Videos/demo.mov mp4 1080p' }); }),
      T('Share', 'globe', [
        T('Clipboard', 'clipboard', null, function () { M.flash('Shared clipboard via LocalSend'); }),
        T('File', 'file', null, function () { M.flash('LocalSend: pick a file'); })
      ]),
      T('Hardware', 'activity', [
        T('Laptop Display', 'monitor', null, function () { M.flash('Laptop display toggled'); }, 'Super + Ctrl + Delete'),
        T('Mirror Display', 'monitor', null, function () { M.flash('Display mirroring toggled'); }, 'Super + Ctrl + Alt + Delete'),
        T('Hybrid GPU', 'activity', null, function () { M.flash('Hybrid GPU mode'); }),
        T('Touchpad', 'layout', null, function () { M.flash('Touchpad toggled'); })
      ]),
      T('Speed Test', 'activity', [
        T('Network', 'globe', null, function () { OMA.System.speedTest('network'); }),
        T('Disk', 'activity', null, function () { OMA.System.speedTest('disk'); })
      ])
    ];

    var style = [
      T('Theme', 'palette', themeChildren(), null, 'Super + Ctrl + Shift + Space'),
      T('Background', 'monitor', null, function () { OMA.System.nextWallpaper(); }, 'Super + Ctrl + Space'),
      T('Unlock', 'lock', themeChildren(), null, 'Boot decryption art'),
      T('Font', 'edit', null, function () {
        var fonts = ['JetBrainsMono Nerd Font', 'Cascadia Code', 'MesloLGS NF', 'FiraCode Nerd Font', 'Victor Mono', 'Iosevka Nerd Font'];
        var cur = fonts.indexOf(OMA.System.font);
        OMA.System.setFont(fonts[(cur + 1) % fonts.length]);
      }),
      T('Hyprland', 'layout', null, function () { OMA.WM.open('editor', '/home/oma/.config/hypr/looknfeel.lua'); }),
      T('Screensaver', 'monitor', null, function () { OMA.Shell.screensaver(); }),
      T('About', 'info', [
        T('Edit Text', 'edit', null, function () { M.flash('About text editor opened'); }),
        T('Restore Default', 'refresh', null, function () { M.flash('About text restored'); })
      ])
    ];

    var defaults = T('Defaults', 'gear', [
      T('Agent', 'agent', ['Antigravity', 'Claude', 'Codex', 'Copilot', 'Crush', 'Cursor CLI', 'Grok', 'Hermes', 'Muse Code', 'omp', 'OpenClaw', 'OpenCode', 'Ori', 'Pi'].map(function (a) {
        return T(a, 'agent', null, function () { OMA.System.setDefault('agent', a); });
      })),
      T('Browser', 'browser', ['Chromium', 'Chrome', 'Brave', 'Brave Origin', 'Edge', 'Firefox', 'Zen'].map(function (b) {
        return T(b, 'browser', null, function () { OMA.System.setDefault('browser', b); });
      })),
      T('Dictation', 'volume', ['Superwhisper', 'Voxtype'].map(function (d) {
        return T(d, 'volume', null, function () { OMA.System.setDefault('dictation', d); });
      })),
      T('Terminal', 'terminal', ['Alacritty', 'Foot', 'Ghostty', 'Kitty'].map(function (t) {
        return T(t, 'terminal', null, function () { OMA.System.setDefault('terminal', t); });
      })),
      T('Editor', 'edit', ['Neovim', 'VSCode', 'Cursor', 'Zed', 'Sublime Text', 'Helix', 'Vim', 'Emacs'].map(function (e) {
        return T(e, 'edit', null, function () { OMA.System.setDefault('editor', e); });
      }))
    ]);

    var security = T('Security', 'lock', [
      T('Fingerprint', 'lock', null, function () { M.flash('Fingerprint enrolment is hardware auth'); }),
      T('Fido2', 'lock', null, function () { M.flash('FIDO2 hardware key'); }),
      T('SSHD', 'terminal', null, function () { M.flash('sshd toggled'); }),
      T('Sudoless Docker', 'layers', null, function () { M.flash('Sudoless Docker enabled'); }),
      T('Passwordless Sudo', 'lock', null, function () { M.flash('Passwordless sudo toggled'); })
    ]);

    var setup = [
      T('Monitors', 'monitor', null, function () { OMA.WM.open('settings', 'Monitors'); }),
      T('Keybindings', 'keyboard', null, function () { M.keybindingsOverlay(); }),
      T('Input', 'layout', null, function () { OMA.WM.open('settings', 'Input'); }),
      T('Typing', 'keyboard', [
        T('Keyboard Layouts', 'keyboard', null, function () { M.flash('Keyboard layouts: us, de, kr'); }),
        T('Input Methods', 'keyboard', null, function () { M.flash('Input methods: fcitx5'); })
      ]),
      T('Network', 'wifi', [
        T('DNS — DHCP', 'globe', null, function () { M.flash('DNS: DHCP'); }),
        T('DNS — Cloudflare', 'globe', null, function () { M.flash('DNS: 1.1.1.1'); }),
        T('DNS — Google', 'globe', null, function () { M.flash('DNS: 8.8.8.8'); }),
        T('QR Code', 'layers', null, function () { M.flash('Wi-Fi QR code shown'); })
      ]),
      defaults,
      T('Plugins', 'layers', [
        T('Enable', 'check', null, function () { M.flash('Plugin enabled'); }),
        T('Disable', 'remove', null, function () { M.flash('Plugin disabled'); }),
        T('Add', 'install', null, function () { M.flash('Plugin added'); })
      ]),
      security,
      T('Config', 'edit', [
        T('Hyprland', 'edit', null, function () { OMA.WM.open('editor', '/home/oma/.config/hypr/hyprland.lua'); }),
        T('Hyprsunset', 'edit', null, function () { OMA.WM.open('editor', '/home/oma/.config/hypr/autostart.lua'); }),
        T('XCompose', 'edit', null, function () { M.flash('XCompose is where the emoji shortcuts live'); })
      ]),
      T('Direct Boot', 'refresh', null, function () { M.flash('Direct boot toggled'); }),
      T('Reset Computer', 'remove', null, function () {
        OMA.Shell.confirm('Reset this computer?', 'Every setting in this clone goes back to defaults.', function () {
          try { localStorage.removeItem('omarchy-web-clone/v1'); } catch (e) { }
          location.reload();
        });
      })
    ];

    function installList(pkgs, group) {
      return pkgs.map(function (p) {
        return T(p, 'install', null, function () { OMA.System.install(p, group); });
      });
    }

    var install = [
      T('Package', 'install', null, function () { OMA.WM.open('terminal', { run: 'sudo pacman -S ' }); }),
      T('AI', 'agent', installList(['ChatGPT Desktop', 'Claude Desktop', 'Grok Bot', 'Hermes Desktop', 'LM Studio', 'Ollama', 'OpenClaw', 'Perplexity', 'T3 Code'], 'AI')),
      T('Service', 'globe', installList(['1Password', 'Dropbox', 'Spotify', 'Signal', 'Slack', 'Tailscale', 'NordVPN', 'ONCE', 'Bitwarden', 'Microsoft', 'Chromium Account'], 'Service')),
      T('Development', 'terminal', installList(['Ruby on Rails', 'Docker DB', 'Node', 'Bun', 'Deno', 'Go', 'PHP', 'Laravel', 'Symfony', 'Python', 'Elixir', 'Phoenix', 'Zig', 'Rust', 'Java', '.NET', 'OCaml', 'Clojure', 'Scala'], 'Development')),
      T('Editor', 'edit', installList(['VSCode', 'Cursor', 'Zed', 'Sublime Text', 'Helix', 'Vim', 'Emacs'], 'Editor')),
      T('Style', 'palette', [
        T('Theme', 'palette', themeChildren()),
        T('Background', 'monitor', null, function () { OMA.System.nextWallpaper(); }),
        T('Font', 'edit', installList(['Cascadia Code', 'MesloLGS NF', 'FiraCode Nerd Font', 'Victor Mono', 'Bitstream Vera', 'Iosevka Nerd Font'], 'Font'))
      ]),
      T('Gaming', 'activity', installList(['Steam', 'RetroArch', 'Minecraft', 'NVIDIA GeForce NOW', 'Xbox Cloud Gaming', 'Battle.net', 'Lutris', 'Heroic'], 'Gaming')),
      T('Browser', 'browser', installList(['Chrome', 'Edge', 'Brave', 'Brave Origin', 'Firefox', 'Zen'], 'Browser')),
      T('Web App', 'globe', installList(['HEY Mail', 'HEY Calendar', 'Basecamp', 'ChatGPT', 'Grok', 'WhatsApp', 'Google Messages', 'Google Photos', 'Google Maps', 'X', 'YouTube', 'Zoom', 'Discord'], 'Web App')),
      T('Terminal', 'terminal', installList(['Alacritty', 'Foot', 'Ghostty', 'Kitty'], 'Terminal')),
      T('TUI', 'layout', installList(['lazygit', 'btop', 'cliamp', 'herdr', 'yazi', 'k9s'], 'TUI')),
      T('Windows', 'monitor', null, function () { M.flash('Windows VM install wizard'); }),
      T('AUR', 'install', null, function () { OMA.WM.open('terminal', { run: 'yay -S ' }); }),
      T('Preinstalls', 'check', null, function () { M.flash('Preinstalls are: foot, neovim, btop, lazygit, chromium, mise, docker'); })
    ];

    var remove = [
      T('Package', 'remove', null, function () { OMA.WM.open('terminal', { run: 'omarchy pkg drop ' }); }),
      T('AI', 'remove', installList(['ChatGPT Desktop', 'Claude Desktop', 'LM Studio', 'Ollama'], 'AI')),
      T('Services', 'remove', installList(['1Password', 'Spotify', 'Signal', 'Slack', 'Tailscale'], 'Service')),
      T('Development', 'remove', installList(['Ruby on Rails', 'Go', 'Python', 'Elixir'], 'Development')),
      T('Theme', 'remove', null, function () { M.flash('Extra themes removed'); }),
      T('Gaming', 'remove', installList(['Steam', 'RetroArch', 'Minecraft'], 'Gaming')),
      T('Browser', 'remove', installList(['Chrome', 'Firefox', 'Brave'], 'Browser')),
      T('Web App', 'remove', installList(['X', 'YouTube', 'Discord'], 'Web App')),
      T('TUI', 'remove', installList(['cliamp', 'yazi', 'k9s'], 'TUI')),
      T('Windows', 'remove', null, function () { M.flash('Windows VM removed'); }),
      T('Preinstalls', 'remove', null, function () { M.flash('Preinstalls kept — they are the base system'); })
    ];

    var update = [
      T('Omarchy', 'refresh', null, function () { OMA.System.update(); }, 'Runs migrations + pacman -Syu'),
      T('Channel', 'globe', [
        T('Stable 🟢', 'check', null, function () { OMA.System.setChannel('stable'); }),
        T('RC 🟡', 'check', null, function () { OMA.System.setChannel('rc'); }),
        T('Edge 🟠', 'check', null, function () { OMA.System.setChannel('edge'); }),
        T('Dev 🔴', 'check', null, function () { OMA.System.setChannel('dev'); })
      ]),
      T('Config', 'edit', [
        T('Reset Hyprland', 'refresh', null, function () { M.flash('Hyprland config reset'); }),
        T('Reset Omarchy Shell', 'refresh', null, function () { M.flash('Shell config reset'); }),
        T('Reset Tmux', 'refresh', null, function () { M.flash('Tmux config reset'); })
      ]),
      T('Extra Themes', 'palette', null, function () { M.flash('Extra themes fetched from omarchy.org/themes'); }),
      T('Process', 'refresh', [
        T('Restart Hyprsunset', 'refresh', null, function () { M.flash('hyprsunset restarted'); }),
        T('Restart Shell', 'refresh', null, function () { M.flash('omarchy-shell restarted'); })
      ]),
      T('Hardware', 'activity', [
        T('Restart Audio', 'volume', null, function () { M.flash('PipeWire restarted'); }),
        T('Restart Wi-Fi', 'wifi', null, function () { M.flash('NetworkManager restarted'); }),
        T('Restart Bluetooth', 'bt', null, function () { M.flash('Bluetooth restarted'); }),
        T('Restart Trackpad', 'layout', null, function () { M.flash('Trackpad restarted'); })
      ]),
      T('Firmware', 'install', null, function () { M.flash('fwupd: firmware up to date'); }),
      T('Password', 'lock', [
        T('Drive Encryption', 'lock', null, function () { M.flash('LUKS passphrase wizard'); }),
        T('User', 'lock', null, function () { M.flash('Password change wizard'); })
      ]),
      T('Timezone', 'globe', null, function () { M.flash('Timezone: Europe/Copenhagen'); }),
      T('Time', 'clock', null, function () { M.flash('NTP sync: active'); })
    ];

    var system = [
      T('Screensaver', 'monitor', null, function () { OMA.Shell.screensaver(); }),
      T('Lock', 'lock', null, function () { OMA.Shell.lock(); }, 'Super + Ctrl + L'),
      T('Suspend', 'moon', null, function () { OMA.Shell.suspend(); }),
      T('Hibernate', 'moon', null, function () { OMA.Shell.suspend(); }),
      T('Logout', 'arrow', null, function () { OMA.Shell.logout(); }),
      T('Reboot', 'refresh', null, function () { OMA.Shell.reboot(); }),
      T('Shutdown', 'power', null, function () { OMA.Shell.shutdown(); })
    ];

    return [
      T('Apps', 'layers', null, function () { M.setMode('apps'); }, 'every installed app'),
      T('Learn', 'book', learn),
      T('Trigger', 'activity', trigger),
      T('Style', 'palette', style),
      T('Setup', 'gear', setup),
      T('Install', 'install', install),
      T('Remove', 'remove', remove),
      T('Update', 'refresh', update),
      T('About', 'info', null, function () { OMA.System.about(); }),
      T('System', 'power', system)
    ];
  };

  /* -------------------------------------------------------- app catalogue */
  M.buildApps = function () {
    var list = [];
    Object.keys(OMA.WM.registry).forEach(function (id) {
      var def = OMA.WM.registry[id];
      if (def.hidden) return;
      list.push(T(def.name + (def.single ? '' : ''), def.icon || 'layers', null, function () {
        OMA.WM.open(id, def.defaultArg ? def.defaultArg() : null);
      }, def.comment || ''));
    });
    return list;
  };

  /* ----------------------------------------------------------------- fuzzy */
  function fuzzy(needle, hay) {
    needle = needle.toLowerCase(); hay = String(hay).toLowerCase();
    if (!needle) return 0;
    var idx = 0, score = 0, streak = 0;
    for (var i = 0; i < hay.length && idx < needle.length; i++) {
      if (hay[i] === needle[idx]) { idx++; streak++; score += 1 + streak * 1.5; if (i === 0) score += 6; }
      else streak = 0;
    }
    return idx === needle.length ? score : -1;
  }

  /* ---------------------------------------------------------------- render */
  function currentLevel() {
    var node = M.stack.length ? M.stack[M.stack.length - 1] : { children: M.rootChildren() };
    return node.children || [];
  }
  M.rootChildren = function () {
    if (M.mode === 'apps') return M.buildApps();
    return M.tree;
  };

  M.open = function (mode, path) {
    M.mode = mode || 'all';
    M.tree = M.tree || M.build();
    M.stack = [];
    M.query = '';
    if (path) {
      var segs = String(path).split('.');
      var level = M.rootChildren();
      segs.forEach(function (s) {
        var found = level.filter(function (n) { return n.name.toLowerCase() === s.toLowerCase(); })[0];
        if (found) { M.stack.push(found); level = found.children || []; }
      });
    }
    if (!M.el) {
      M.el = h('div#omarchy-menu.oma-menu');
      document.body.appendChild(M.el);
      M.el.addEventListener('mousedown', function (e) { if (e.target === M.el) M.close(); });
    }
    M.el.classList.add('is-open');
    M.render();
    setTimeout(function () { if (M.input) M.input.focus(); }, 30);
  };

  M.close = function () {
    if (!M.el) return;
    M.el.classList.remove('is-open');
    M.stack = []; M.query = '';
  };
  M.toggle = function (mode) {
    if (M.el && M.el.classList.contains('is-open') && M.mode === (mode || 'all')) M.close();
    else M.open(mode);
  };
  M.setMode = function (mode) { M.mode = mode; M.stack = []; M.query = ''; M.render(); };
  M.back = function () {
    if (M.query) { M.query = ''; M.render(); return; }
    if (M.stack.length) { M.stack.pop(); M.render(); return; }
    M.close();
  };

  M.render = function () {
    if (!M.el) return;
    var el = M.el;
    clear(el);
    var panel = h('div.oma-menu-panel');

    /* breadcrumb + search */
    var crumbs = ['Omarchy', M.mode === 'apps' ? 'Apps' : 'Menu'].concat(M.stack.map(function (n) { return n.name; }));
    var crumb = h('div.oma-menu-crumbs');
    crumbs.forEach(function (c, i) {
      if (i) crumb.appendChild(h('span.oma-menu-sep', { html: OMA.Shell.icons.chevron }));
      crumb.appendChild(h('span.oma-menu-crumb' + (i === crumbs.length - 1 ? '.is-last' : ''), { text: c }));
    });

    M.input = h('input.oma-menu-input', {
      type: 'text', placeholder: 'Search apps and commands…', value: M.query,
      spellcheck: 'false', autocomplete: 'off'
    });
    M.input.addEventListener('input', function () { M.query = M.input.value; M.sel = 0; M.renderList(); });
    var head = h('div.oma-menu-head', [
      h('div.oma-menu-brand', { html: OMA.Shell.icons.menu }),
      h('div.oma-menu-headmain', [crumb, M.input])
    ]);
    panel.appendChild(head);

    M.listEl = h('div.oma-menu-list');
    panel.appendChild(M.listEl);

    var foot = h('div.oma-menu-foot', [
      h('span.oma-key', { text: '^v' }), h('span', { text: 'navigate' }),
      h('span.oma-key', { text: 'Enter' }), h('span', { text: 'select' }),
      h('span.oma-key', { text: 'Esc' }), h('span', { text: 'back' }),
      h('span.oma-key', { text: '~' }), h('span', { text: 'apps-only' })
    ]);
    panel.appendChild(foot);
    el.appendChild(panel);

    M.renderList();
    M.input.focus();
  };

  M.renderList = function () {
    var host = M.listEl; if (!host) return;
    clear(host);
    var level = currentLevel();
    var items = level.slice();
    if (M.query) {
      var pool = [];
      (function collect(nodes, prefix) {
        nodes.forEach(function (n) {
          pool.push({ node: n, prefix: prefix });
          if (n.children) collect(n.children, prefix.concat([n.name]));
        });
      })(level, []);
      pool.forEach(function (p) {
        p.score = Math.max(fuzzy(M.query, p.node.name), fuzzy(M.query, p.prefix.join(' ')) * 0.6);
      });
      items = pool.filter(function (p) { return p.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 60)
        .map(function (p) { var n = Object.create(p.node); n._path = p.prefix; return n; });
    }
    M.items = items;
    if (M.sel >= items.length) M.sel = Math.max(0, items.length - 1);

    if (!items.length) {
      host.appendChild(h('div.oma-menu-empty', { text: 'Nothing matches “' + M.query + '”' }));
      return;
    }
    items.forEach(function (n, i) {
      var hasKids = !!(n.children && n.children.length);
      var row = h('div.oma-menu-row' + (i === M.sel ? '.is-sel' : '') + (hasKids ? '.has-kids' : ''), {
        onmouseenter: function () { M.sel = i; M.markSel(); },
        onclick: function (e) { e.stopPropagation(); M.activate(n); }
      });
      row.appendChild(h('div.oma-menu-icon', { html: OMA.Shell.icons[n.icon] || OMA.Shell.icons.layers }));
      var main = h('div.oma-menu-main', [h('div.oma-menu-name', { text: n.name })]);
      if (n._path && n._path.length) main.appendChild(h('div.oma-menu-path', { text: n._path.join(' › ') }));
      else if (n.hint) main.appendChild(h('div.oma-menu-path', { text: n.hint }));
      row.appendChild(main);
      var isTheme = !!(n.action && n.icon === 'palette' && OMA.Themes.byName(n.name));
      if (isTheme) {
        var t = OMA.Themes.byName(n.name);
        row.appendChild(h('div.oma-menu-swatch', {
          html: [t.bg, t.accent, t.fg, t.green, t.red].map(function (c) {
            return '<i style="background:' + c + '"></i>';
          }).join('')
        }));
        if (OMA.Themes.current.id === t.id) row.appendChild(h('div.oma-menu-check', { html: OMA.Shell.icons.check }));
      } else if (hasKids) {
        row.appendChild(h('div.oma-menu-chev', { html: OMA.Shell.icons.chevron }));
      }
      host.appendChild(row);
    });
    var selRow = host.querySelector('.is-sel');
    if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: 'nearest' });
  };

  M.markSel = function () {
    if (!M.listEl) return;
    OMA.$$('.oma-menu-row', M.listEl).forEach(function (r, i) { r.classList.toggle('is-sel', i === M.sel); });
  };

  M.activate = function (n) {
    if (!n) return;
    if (n.children && n.children.length) {
      /* A leaf-with-action that also has children (e.g. Theme) enters the list. */
      M.stack.push(n);
      M.query = ''; M.sel = 0;
      if (M.input) M.input.value = '';
      M.render();
      return;
    }
    var act = n.action;
    M.close();
    if (act) setTimeout(function () { act(); }, 60);
  };

  M.moveSel = function (d) {
    if (!M.items.length) return;
    M.sel = (M.sel + d + M.items.length) % M.items.length;
    M.markSel();
    if (M.listEl) {
      var row = OMA.$$('.oma-menu-row', M.listEl)[M.sel];
      if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }
  };

  M.flash = function (msg) {
    OMA.Shell.osd({ icon: 'check', label: msg });
    if (OMA.Syslog) OMA.Syslog.push('omarchy', msg);
  };

  /* -------------------------------------------------------------- overlays */
  M.overlay = function (id, title, lines, mono) {
    var existing = OMA.$('#oma-overlay-' + id);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var body = h('div.oma-overlay-body' + (mono === false ? '' : '.is-mono'));
    lines.forEach(function (l) {
      if (typeof l === 'string') body.appendChild(h('div.oma-overlay-line', { text: l }));
      else body.appendChild(l);
    });
    var el = h('div#oma-overlay-' + id + '.oma-overlay', [
      h('div.oma-overlay-panel', [
        h('div.oma-overlay-head', [h('div.oma-overlay-title', { text: title }),
          h('button.oma-btn.oma-btn-sm', { text: 'Close', onclick: function () { el.parentNode.removeChild(el); } })]),
        body
      ])
    ]);
    el.addEventListener('mousedown', function (e) { if (e.target === el) el.parentNode.removeChild(el); });
    document.body.appendChild(el);
    return el;
  };

  M.keybindingsOverlay = function () {
    var groups = OMA.Keys.groups();
    var wrap = h('div.oma-kb-wrap');
    groups.forEach(function (g) {
      var sec = h('div.oma-kb-group', [h('div.oma-kb-title', { text: g.title })]);
      g.binds.forEach(function (b) {
        sec.appendChild(h('div.oma-kb-row', [
          h('div.oma-kb-keys', b.keys.map(function (k) { return h('span.oma-key', { text: k }); })),
          h('div.oma-kb-desc', { text: b.desc })
        ]));
      });
      wrap.appendChild(sec);
    });
    M.overlay('keys', 'Keybindings — Super + K', [wrap]);
  };

  M.manualOverlay = function () {
    M.overlay('manual', 'Omarchy — the manual, condensed', [
      'omakase Linux: Arch + Hyprland + the Quickshell desktop construction kit.',
      '',
      'Super + Space        the one menu: every app and every command',
      'Super + Alt + Space  apps-only menu',
      'Super + Escape       system menu',
      'Super + Ctrl + Shift + Space   change theme everywhere at once',
      'Super + Ctrl + Space           change the background',
      'Super + K            this keybinding list',
      'Super + Shift + Space          hide/show the top bar',
      'Super + Return       terminal        Super + Shift + N   Neovim',
      'Super + Shift + F    file manager    Super + Ctrl + T    btop',
      '',
      'Everything is themed together: bar, menu, notifications, OSD, lock screen,',
      'terminal, Neovim and the browser. That coherence is the point.',
      '',
      'Quattro (4.0.0) replaced Waybar, Walker, Mako, SwayOSD, hyprlock, hypridle,',
      'swaybg and polkit-gnome with a single long-running shell process.'
    ]);
  };

  /* ------------------------------------------------------------ keyboard */
  M.keydown = function (e) {
    if (!M.el || !M.el.classList.contains('is-open')) return false;
    if (e.key === 'ArrowDown') { M.moveSel(1); return true; }
    if (e.key === 'ArrowUp') { M.moveSel(-1); return true; }
    if (e.key === 'Enter') { M.activate(M.items[M.sel]); return true; }
    if (e.key === 'Escape') { M.back(); return true; }
    if (e.key === 'Backspace' && !M.query) { M.back(); return true; }
    if (e.key === 'Tab') { M.setMode(M.mode === 'apps' ? 'all' : 'apps'); return true; }
    return false;
  };

  OMA.Menu = M;
})(window.OMA = window.OMA || {});
