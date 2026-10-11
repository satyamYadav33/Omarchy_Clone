/* ============================================================================
 * Omarchy Web Clone — settings.js
 * ----------------------------------------------------------------------------
 * The Setup menu's GUI side: omarchy Settings. Mirrors Setup → Monitors /
 * Input / Keybindings / Defaults, and exposes the browser-only substitutions
 * (the Super key, the capture chords) so they are visible rather than hidden.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, I = OMA.Shell.icons;

  var SUPER_CHOICES = [
    { id: 'CapsLock', label: 'Caps Lock', note: 'Closest to a real Super key — it sits where Super/Cmd sits and is otherwise a dead key.' },
    { id: 'Semicolon', label: 'Semicolon ( ; )', note: 'Safest: never triggers a browser or OS shortcut.' },
    { id: 'Quote', label: "Quote ( ' )", note: 'Also safe, next to the semicolon.' },
    { id: 'Backslash', label: 'Backslash ( \\ )', note: 'Safe, sits above Return on ANSI keyboards.' }
  ];

  var Settings = {};

  Settings.superLabel = function () {
    var id = OMA.Store.get('superKey') || 'CapsLock';
    if (id === 'CapsLock') return 'Super (Caps Lock)';
    if (id === 'Semicolon') return 'Super ( ; )';
    if (id === 'Quote') return "Super ( ' )";
    if (id === 'Backslash') return 'Super ( \\ )';
    return 'Super';
  };

  Settings.setSuper = function (id) {
    OMA.Store.set('superKey', id);
    if (OMA.Keys) OMA.Keys.superKey = id;
    OMA.Shell.osd({ icon: 'keyboard', label: 'Super key', value: Settings.superLabel() });
  };

  /* ------------------------------------------------------------- the app */
  OMA.WM.registry.register({
    id: 'settings', name: 'Settings', icon: 'gear', comment: 'omarchy Settings — Setup',
    single: true, title: function (arg) { return 'Settings' + (arg ? ' — ' + arg : ''); },

    mount: function (body, win) {
      var tabs = [
        { id: 'appearance', label: 'Appearance' },
        { id: 'keys', label: 'Keybindings' },
        { id: 'defaults', label: 'Defaults' },
        { id: 'input', label: 'Input' },
        { id: 'monitors', label: 'Monitors' },
        { id: 'about', label: 'About' }
      ];
      var wrap = h('div.oma-settings');
      var nav = h('div.oma-settings-nav');
      var pane = h('div.oma-settings-pane');
      wrap.appendChild(nav); wrap.appendChild(pane);
      body.appendChild(wrap);

      var initial = (win.props.arg || 'appearance').toLowerCase();
      var active = tabs.findIndex(function (t) { return t.id === initial || t.label.toLowerCase() === initial; });
      if (active < 0) active = 0;

      function renderNav() {
        clear(nav);
        nav.appendChild(h('div.oma-settings-brand', { html: OMA.Art.mark(28) + '<span>omarchy</span>' }));
        tabs.forEach(function (t, i) {
          nav.appendChild(h('div.oma-settings-tab' + (i === active ? '.is-active' : ''), {
            text: t.label, onclick: function () { active = i; render(); }
          }));
        });
        nav.appendChild(h('div.oma-settings-note', { text: 'Every value here maps to a real Omarchy menu path.' }));
      }

      function section(title, nodes) {
        return h('div.oma-settings-section', [
          h('div.oma-settings-sechead', { text: title }),
          h('div.oma-settings-secbody', nodes)
        ]);
      }
      function field(label, control, note) {
        return h('div.oma-settings-field', [
          h('div.oma-settings-fieldlabel', [h('div', { text: label }), note ? h('div.oma-settings-fieldnote', { text: note }) : null]),
          h('div.oma-settings-fieldcontrol', control)
        ]);
      }
      function select(options, value, onChange) {
        var s = h('select.oma-select');
        options.forEach(function (o) {
          s.appendChild(h('option', { value: o.value || o, text: o.label || o, selected: (o.value || o) === value }));
        });
        s.addEventListener('change', function () { onChange(s.value); });
        return s;
      }
      function toggle(value, onChange) {
        var t = h('div.oma-toggle' + (value ? '.is-on' : ''), { onclick: function () { onChange(!value); } }, [h('i')]);
        return t;
      }

      function renderPane() {
        clear(pane);
        var t = tabs[active];

        if (t.id === 'appearance') {
          var themeGrid = h('div.oma-theme-grid.oma-theme-grid-sm');
          OMA.Themes.list.forEach(function (th) {
            themeGrid.appendChild(h('div.oma-theme-card' + (th.id === OMA.System.themeId ? '.is-active' : ''), {
              onclick: function () { OMA.System.setTheme(th.id); render(); }
            }, [
              h('div.oma-theme-swatch', {
                html: [th.bg, th.bgDark, th.accent, th.fg, th.red, th.green, th.blue, th.magenta].map(function (c) {
                  return '<i style="background:' + c + '"></i>';
                }).join('')
              }),
              h('div.oma-theme-name', { text: th.name }),
              h('div.oma-theme-mode', { text: th.mode })
            ]));
          });

          pane.appendChild(section('Theme — Style → Theme', [
            h('div.oma-settings-hint', { text: 'A theme restyles the desktop, bar, menu, notifications, OSD, lock screen, terminal, Neovim and the browser at once. Super + Ctrl + Shift + Space cycles them.' }),
            themeGrid
          ]));
          pane.appendChild(section('Background — Style → Background', [
            field('Wallpaper', (function () {
              var row = h('div.oma-chip-row');
              OMA.Wallpapers.set.forEach(function (w, i) {
                row.appendChild(h('button.oma-chip' + (i === OMA.System.wallIndex ? '.is-active' : ''), {
                  text: w.name, onclick: function () { OMA.System.setWallpaper(i); render(); }
                }));
              });
              return row;
            })(), 'Generated from the live palette — the real ISO ships photographs.')
          ]));
          pane.appendChild(section('Interface', [
            field('Bar position', select(['top', 'bottom', 'left', 'right'], OMA.System.barPos, function (v) {
              OMA.System.barPos = v; document.body.dataset.barPos = v;
            }), 'Trigger → Appearance → Menu Bar → Position Bar'),
            field('Transparent bar', toggle(OMA.System.barTransparent, function (v) {
              OMA.System.barTransparent = v; document.body.classList.toggle('bar-transparent', v);
            })),
            field('Window gaps', toggle(OMA.WM.gaps, function (v) { OMA.WM.setGaps(v); }), 'Super + Shift + Backspace'),
            field('Animations', toggle(OMA.System.animations, function (v) {
              OMA.System.animations = v;
              document.documentElement.classList.toggle('no-anim', !v);
            }), 'Trigger → Appearance → Animations'),
            field('Nightlight', toggle(OMA.System.nightlight, function (v) { OMA.System.toggleNightlight(v); }), 'Super + Ctrl + N'),
            field('Font', select(['JetBrainsMono Nerd Font', 'Cascadia Code', 'MesloLGS NF', 'FiraCode Nerd Font', 'Victor Mono', 'Iosevka Nerd Font'], OMA.System.font, function (v) {
              OMA.System.setFont(v);
            }), 'Style → Font'),
            field('Brightness', OMA.Shell.sliderRow('', OMA.System.brightness, function (v) { OMA.System.brightness = v; OMA.System.applyDisplay(); }, 'sun'))
          ]));
          return;
        }

        if (t.id === 'keys') {
          pane.appendChild(section('The Super key — a browser substitution', [
            h('div.oma-settings-hint', {
              text: 'Omarchy uses the Super key (the Windows/Cmd key). Your operating system and browser own that key, so this clone moves Super onto another key. Caps Lock is the default because it sits in the same place and is otherwise unused. Pick whatever suits your hands — every binding in the list below follows your choice.'
            }),
            (function () {
              var row = h('div.oma-chip-row');
              SUPER_CHOICES.forEach(function (c) {
                row.appendChild(h('button.oma-chip' + (((OMA.Store.get('superKey') || 'CapsLock') === c.id) ? '.is-active' : ''), {
                  text: c.label, title: c.note,
                  onclick: function () { Settings.setSuper(c.id); render(); }
                }));
              });
              return row;
            })(),
            h('div.oma-settings-note', { text: SUPER_CHOICES.filter(function (c) { return c.id === (OMA.Store.get('superKey') || 'CapsLock'); })[0].note })
          ]));
          pane.appendChild(section('Capture — no Print Screen key', [
            h('div.oma-settings-hint', {
              text: 'Most laptops have no Print Screen key, so capture lives on Ctrl + Alt chords here. The documented Print Screen bindings still appear in the reference so nothing is silently different from upstream.'
            }),
            field('Screenshot', h('span.oma-key', { text: 'Ctrl + Alt + S' }), 'upstream: Print Screen'),
            field('Screen record', h('span.oma-key', { text: 'Ctrl + Alt + R' }), 'upstream: Alt + Print Screen'),
            field('Colour picker', h('span.oma-key', { text: 'Ctrl + Alt + Q' }), 'upstream: Super + Print Screen'),
            field('Terminal', h('span.oma-key', { text: 'Ctrl + Alt + T' }), 'upstream: Super + Return')
          ]));
          var allGroups = OMA.Keys.groups();
          allGroups.forEach(function (g) {
            pane.appendChild(section(g.title, g.binds.map(function (b) {
              return h('div.oma-kb-row', [
                h('div.oma-kb-keys', b.keys.map(function (k) { return h('span.oma-key', { text: k }); })),
                h('div.oma-kb-desc', { text: b.desc })
              ]);
            })));
          });
          return;
        }

        if (t.id === 'defaults') {
          var kinds = [['agent', 'Agent', ['Antigravity', 'Claude', 'Codex', 'Copilot', 'Crush', 'Cursor CLI', 'Grok', 'Hermes', 'Muse Code', 'omp', 'OpenClaw', 'OpenCode', 'Ori', 'Pi']],
          ['browser', 'Browser', ['Chromium', 'Chrome', 'Brave', 'Brave Origin', 'Edge', 'Firefox', 'Zen']],
          ['dictation', 'Dictation', ['Superwhisper', 'Voxtype']],
          ['terminal', 'Terminal', ['Alacritty', 'Foot', 'Ghostty', 'Kitty']],
          ['editor', 'Editor', ['Neovim', 'VSCode', 'Cursor', 'Zed', 'Sublime Text', 'Helix', 'Vim', 'Emacs']]];
          pane.appendChild(section('Setup → Defaults', [
            h('div.oma-settings-hint', { text: 'Which application each role resolves to. Omarchy ships Foot, Chromium and Neovim; everything else is an Install → … choice.' })
          ].concat(kinds.map(function (k) {
            return field(k[1], select(k[2], OMA.System.defaults[k[0]], function (v) { OMA.System.setDefault(k[0], v); }));
          }))));
          return;
        }

        if (t.id === 'input') {
          pane.appendChild(section('Setup → Input', [
            field('Keyboard layout', select(['us', 'gb', 'de', 'dk', 'kr', 'fr'], 'us', function (v) {
              OMA.Shell.osd({ icon: 'keyboard', label: 'Keyboard layout', value: v });
            })),
            field('Input method', select(['none', 'fcitx5', 'ibus'], 'none', function (v) {
              OMA.Shell.osd({ icon: 'keyboard', label: 'Input method', value: v });
            })),
            field('Follow mouse', select(['0 — disabled', '1 — enabled', '2 — full', '3 — loose'], '2 — full', function () { })),
            field('Natural scroll', toggle(false, function (v) { OMA.Shell.osd({ icon: 'layout', label: 'Natural scroll', value: v ? 'on' : 'off' }); })),
            field('Touchpad tap to click', toggle(true, function () { })),
            field('DNS', select(['DHCP', 'Cloudflare 1.1.1.1', 'Google 8.8.8.8', 'Custom'], 'DHCP', function (v) {
              OMA.Shell.osd({ icon: 'globe', label: 'DNS', value: v });
            }))
          ]));
          return;
        }

        if (t.id === 'monitors') {
          pane.appendChild(section('Setup → Monitors', [
            field('Output', h('span.oma-value', { text: 'eDP-1 (laptop panel)' })),
            field('Resolution', select(['preferred', '2560x1600', '1920x1200', '1680x1050'], 'preferred', function (v) {
              OMA.Shell.osd({ icon: 'monitor', label: 'Resolution', value: v });
            })),
            field('Scale', (function () {
              var row = h('div.oma-chip-row');
              ['1x', '1.25x', '1.5x', '1.6x', '1.75x', '2x'].forEach(function (s) {
                row.appendChild(h('button.oma-chip' + (s === OMA.System.scaleLabel ? '.is-active' : ''), {
                  text: s, onclick: function () { OMA.System.scaleLabel = s; render(); }
                }));
              });
              return row;
            })(), 'Super + / steps through these'),
            field('Mirror display', toggle(false, function () { })),
            field('Laptop display', toggle(true, function () { }))
          ]));
          return;
        }

        /* about */
        var info = [
          ['Omarchy', '4.0.4 (Quattro)'],
          ['Kernel', 'linux-omarchy 6.16.4'],
          ['Compositor', 'Hyprland 0.56.1 (Lua config)'],
          ['Shell', 'Quickshell 0.3.3 — one omarchy-shell process'],
          ['Terminal', 'Foot 1.23.1'],
          ['Browser', 'Chromium'],
          ['Channel', OMA.System.channel],
          ['Themes bundled', OMA.Themes.list.length + ''],
          ['Palette source', 'themes/<name>/colors.toml from omacom/omarchy@quattro'],
          ['Renderer', 'this browser'],
          ['Upstream', 'https://omarchy.org']
        ];
        pane.appendChild(section('About this clone', info.map(function (r) {
          return h('div.oma-settings-info', [h('span', { text: r[0] }), h('code', { text: r[1] })]);
        })));
        pane.appendChild(section('What is faithfully reproduced', [
          h('div.oma-settings-hint', { text: 'The 26 px top bar with upstream module order and the dddd HH:mm clock; all 23 theme palettes with exact hex values; the full Quattro hotkey table; the unified Super + Space menu with the real group tree (Learn, Trigger, Style, Setup, Install, Remove, Update, About, System); dwindle/scrolling/floating layouts; the capture, clipboard, OSD, notification and lock surfaces.' })
        ]));
        pane.appendChild(section('What cannot be reproduced in a browser', [
          h('div.oma-settings-hint', { text: 'A real kernel, Wayland compositing, GPU acceleration, PAM/LUKS, btrfs snapshots, pacman, real Chromium frames, and the OS-level Super key — which is why this clone remaps Super to Caps Lock. Framed web apps render an honest preview where a site forbids embedding.' })
        ]));
      }

      function render() { renderNav(); renderPane(); }
      var off = OMA.bus.on('theme:changed', function () { if (document.body.contains(wrap)) render(); });
      win._disposers = [off];
      render();
    },

    onClose: function (win) { (win._disposers || []).forEach(function (d) { try { d(); } catch (e) { } }); }
  });

  OMA.Settings = Settings;
})(window.OMA = window.OMA || {});
