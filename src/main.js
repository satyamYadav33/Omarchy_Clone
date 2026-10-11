/* ============================================================================
 * Omarchy Web Clone — main.js
 * ----------------------------------------------------------------------------
 * Boots the desktop: store -> theme -> wallpaper -> compositor -> bar -> keys,
 * then runs the cold-start sequence (Limine, LUKS, systemd, SDDM, installer)
 * and drops you into a Hyprland session with the Omarchy welcome.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, fmt = OMA.fmt, I = OMA.Shell.icons;

  function bootScreen() {
    var el = h('div#omarchy-power');
    el.appendChild(h('div.oma-power-inner', [
      h('div.oma-power-mark', { html: OMA.Art.mark(96) }),
      h('div.oma-power-title', { text: 'OMARCHY' }),
      h('div.oma-power-sub', { text: '4.0.4 (Quattro) — Beautiful, fun & agentic Linux' }),
      h('div.oma-power-hint', { text: 'Click anywhere or press Enter to power on' }),
      h('div.oma-power-note', {
        html: 'Your Super key is <b>Caps Lock</b> — press <b>Caps + Space</b> for the menu, <b>Caps + K</b> for every keybinding.'
      })
    ]));
    el.style.cssText = 'position:fixed;inset:0;z-index:5000;background:#000;color:#a9b1d6;' +
      'font-family:var(--font-mono);display:flex;align-items:center;justify-content:center;cursor:pointer';
    document.body.appendChild(el);
    return new Promise(function (resolve) {
      function go() {
        window.removeEventListener('keydown', onKey, true);
        el.removeEventListener('click', go);
        el.style.transition = 'opacity 300ms ease';
        el.style.opacity = '0';
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
        resolve();
      }
      function onKey(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }
      el.addEventListener('click', go);
      window.addEventListener('keydown', onKey, true);
      setTimeout(go, 9000);
    });
  }

  function welcome() {
    setTimeout(function () {
      OMA.Shell.notify({
        app: 'Omarchy', icon: 'layers',
        summary: 'Welcome to Omarchy 4.0.4 (Quattro)',
        body: 'Super = Caps Lock. Caps + Space opens the one menu, Caps + K lists every keybinding, Caps + Return opens the terminal.',
        timeout: 12000,
        actions: [
          { label: 'Keybindings', run: function () { OMA.Menu.keybindingsOverlay(); } },
          { label: 'Take the tour', run: tour }
        ]
      });
      setTimeout(function () {
        OMA.Shell.notify({
          app: 'Style', icon: 'palette',
          summary: '23 themes bundled',
          body: 'Caps + Ctrl + Shift + Space cycles them. Everything restyles at once: bar, menu, terminal, Neovim, browser.',
          timeout: 9000
        });
      }, 6500);
    }, 900);
    OMA.WM.open('terminal', { run: 'neofetch' });
  }

  function tour() {
    var steps = [
      ['The Super key', 'Your OS and browser own the real Windows/Cmd key, so Super is <b>Caps Lock</b> here. Every binding from Omarchy\'s manual works with it. Change it in Settings → Keybindings.'],
      ['The one menu', '<b>Caps + Space</b> opens the unified menu — apps and every command in one place, exactly as Quattro merged Walker into the menu. <b>Caps + Alt + Space</b> is apps-only.'],
      ['Tiling', 'Windows tile themselves. <b>Caps + arrows</b> moves focus, <b>Caps + Shift + arrows</b> swaps, <b>Caps + L</b> cycles dwindle → scrolling → floating, <b>Caps + T</b> floats.'],
      ['Themes', '<b>Caps + Ctrl + Shift + Space</b> changes the theme for the bar, menu, notifications, OSD, lock screen, terminal, Neovim and the browser simultaneously. That coherence is the whole point of Omarchy.'],
      ['Everything is real', 'The terminal runs a real shell over a virtual filesystem with pipes, tab completion and the Omarchy CLI. Neovim edits and saves. btop is live. Screenshots land in ~/Pictures/Screenshots.'],
      ['Honest limits', 'There is no kernel here: no Wayland, no pacman, no LUKS. Framed web apps show a badged preview where a site forbids embedding. Everything else is reproduced faithfully.']
    ];
    var i = 0;
    var el = h('div.oma-overlay', [
      h('div.oma-overlay-panel', { style: { width: 'min(620px, 92vw)' } }, [
        h('div.oma-overlay-head', [
          h('div.oma-overlay-title', { text: 'Tour — ' + (i + 1) + ' of ' + steps.length }),
          h('button.oma-btn.oma-btn-sm', { text: 'Close', onclick: function () { document.body.removeChild(el); } })
        ]),
        h('div.oma-overlay-body')
      ])
    ]);
    var body = OMA.$('.oma-overlay-body', el);
    var titleEl = OMA.$('.oma-overlay-title', el);
    function paint() {
      clearBody();
      titleEl.textContent = 'Tour — ' + (i + 1) + ' of ' + steps.length;
      body.appendChild(h('h2', { text: steps[i][0], style: { marginTop: '0', color: 'var(--accent)', fontSize: '15px' } }));
      body.appendChild(h('p', { html: steps[i][1], style: { lineHeight: '1.75', fontSize: '13px' } }));
      var row = h('div', { style: { display: 'flex', gap: '8px', marginTop: '18px' } });
      row.appendChild(h('button.oma-btn', {
        text: i === 0 ? 'Skip' : 'Back',
        onclick: function () { if (i === 0) document.body.removeChild(el); else { i--; paint(); } }
      }));
      row.appendChild(h('button.oma-btn.oma-btn-primary', {
        text: i === steps.length - 1 ? 'Start using it' : 'Next',
        onclick: function () { if (i === steps.length - 1) document.body.removeChild(el); else { i++; paint(); } }
      }));
      body.appendChild(row);
    }
    function clearBody() { OMA.clear(body); }
    paint();
    document.body.appendChild(el);
  }

  function installDesktop() {
    var desktop = h('div#omarchy-desktop');
    desktop.appendChild(h('div#omarchy-wallpaper'));
    desktop.appendChild(h('div#omarchy-windows'));
    document.body.appendChild(desktop);
    return desktop;
  }

  /* ---------------------------------------------------------- diagnostics
   * `?capture=1` collects every error and console message into the DOM so the
   * page can be inspected with a plain DOM dump — no devtools, no server.
   * `?fast=1`    skips the power screen and the installer (CI and screenshots).
   * `?tour=1`    opens the tour on start.
   * ---------------------------------------------------------------------- */
  var DIAG = { on: false, fast: false, log: [] };
  function initDiagnostics() {
    var q = String(location.search || '');
    DIAG.on = /[?&]capture=1/.test(q);
    /* Any deep link implies fast: nobody wants to click through Limine, LUKS,
       systemd and SDDM just to look at one window. A flag set before this script
       ran (by the harness or the page launcher) wins. */
    DIAG.fast = /[?&]fast=1/.test(q) || /[?&](open|demo|theme)=/.test(q);
    var flags = window.__OMA_FLAGS__;
    if (flags) {
      if (flags.capture != null) DIAG.on = !!flags.capture;
      if (flags.fast != null) DIAG.fast = !!flags.fast;
    }
    if (!DIAG.on) return;
    function rec(kind, args) {
      var parts = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        try { parts.push(a && a.stack ? a.stack : (typeof a === 'object' ? JSON.stringify(a) : String(a))); }
        catch (e) { parts.push('[unserialisable]'); }
      }
      DIAG.log.push(kind + ': ' + parts.join(' '));
    }
    ['warn', 'error'].forEach(function (k) {
      var orig = console[k];
      console[k] = function () { rec(k.toUpperCase(), arguments); if (orig) orig.apply(console, arguments); };
    });
    window.addEventListener('error', function (e) {
      rec('WINDOW-ERROR', [e.message + ' @ ' + (e.filename || '?') + ':' + e.lineno + ':' + e.colno]);
    });
    window.addEventListener('unhandledrejection', function (e) {
      rec('UNHANDLED', [String((e.reason && e.reason.stack) || e.reason)]);
    });
  }
  function diagReport() {
    if (!DIAG.on) return;
    var W = OMA.WM, T = OMA.Themes;
    var lines = ['===REPORT==='];
    lines.push('stage ' + DIAG.stage + '  fast=' + DIAG.fast + '  capture=' + DIAG.on);
    lines.push('errors ' + DIAG.log.length);
    DIAG.log.forEach(function (l) { lines.push('  ' + l); });
    lines.push('theme ' + (T.current ? T.current.name + ' ' + T.current.bg : 'none'));
    lines.push('themes ' + T.list.length);
    lines.push('apps ' + Object.keys(W.registry).length + ' [' + Object.keys(W.registry).join(',') + ']');
    lines.push('windows ' + Object.keys(W.windows).length + ' [' + Object.keys(W.windows).map(function (k) { return W.windows[k].appId; }).join(',') + ']');
    lines.push('workspace ' + W.active + ' leaves ' + W.treeLeaves(W.active).length);
    lines.push('vfs ' + OMA.FS.glob('/**/*').length + ' files');
    lines.push('dom desktop=' + !!OMA.$('#omarchy-desktop') + ' bar=' + !!OMA.$('#omarchy-bar') +
      ' win=' + OMA.$$('.oma-win').length + ' boot=' + !!OMA.$('#omarchy-boot') +
      ' installer=' + !!OMA.$('.installer') + ' power=' + !!OMA.$('#omarchy-power'));
    lines.push('keys ' + OMA.Keys.groups().length + ' groups');
    var cv = OMA.$$('canvas');
    lines.push('canvas ' + cv.length + ' [' + cv.map(function (c) {
      var card = c.parentNode;
      return 'store=' + (c.width || 0) + 'x' + (c.height || 0) +
        ' css=' + Math.round(c.clientWidth) + 'x' + Math.round(c.clientHeight) +
        ' card=' + Math.round(card.clientWidth) + 'x' + Math.round(card.clientHeight) +
        ' styleH=' + (c.style.height || '-') + ' display=' + getComputedStyle(c).display;
    }).join(' | ') + ']');
    var imgs = OMA.$$('.oma-viewer-img svg, .oma-files-previmg svg, .oma-wall');
    lines.push('visual ' + imgs.length);
    lines.push('launch ran=' + !!OMA.__launchRan + ' args=' + JSON.stringify(OMA.__launchArgs || null) +
      ' state=' + JSON.stringify(OMA.__launchState || null));
    var menuEl = OMA.$('#omarchy-menu');
    lines.push('menu el=' + !!menuEl + ' open=' + !!(menuEl && menuEl.classList.contains('is-open')) +
      ' rows=' + (menuEl ? menuEl.querySelectorAll('.oma-menu-row').length : 0) +
      ' stack=' + OMA.Menu.stack.map(function (n) { return n.name; }).join('/') +
      ' display=' + (menuEl ? getComputedStyle(menuEl).display : '-') +
      ' children=' + (menuEl ? menuEl.children.length : 0));
    var ov = OMA.$$('.oma-overlay');
    lines.push('overlays ' + ov.length);
    lines.push('===END===');
    var pre = document.createElement('pre');
    pre.id = 'oma-report';
    pre.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99999;background:#000;color:#0f0;font:11px monospace;padding:6px;max-height:60vh;overflow:auto;white-space:pre-wrap;width:100%';
    pre.textContent = lines.join('\n');
    document.body.appendChild(pre);
  }

  function desktopContextMenu() {
    var host = OMA.$('#omarchy-desktop');
    host.addEventListener('mousedown', function (e) {
      if (e.button === 2) {
        e.preventDefault();
        OMA.Shell.closePanel();
        OMA.Menu.open('all');
      }
    });
    /* Middle-click on empty space toggles the scratchpad, like a WM gesture. */
    host.addEventListener('mousedown', function (e) {
      if (e.button === 1 && !e.target.closest('.oma-win')) {
        e.preventDefault();
        OMA.WM.toggleScratch();
      }
    });
    host.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function dragSupport() {
    /* Super + left drag moves a float, Super + right drag resizes it. */
    var drag = null;
    window.addEventListener('mousedown', function (e) {
      if (!OMA.Keys.superDown) return;
      var winEl = e.target.closest ? e.target.closest('.oma-win') : null;
      if (!winEl) return;
      var w = OMA.WM.windows[winEl.dataset.wid];
      if (!w) return;
      if (e.button === 0) {
        w.props.floating = true;
        drag = {
          mode: 'move', wid: w.wid,
          x0: e.clientX, y0: e.clientY,
          fx: w.props.floatX != null ? w.props.floatX : 60,
          fy: w.props.floatY != null ? w.props.floatY : 48
        };
      } else if (e.button === 2) {
        drag = {
          mode: 'resize', wid: w.wid,
          x0: e.clientX, y0: e.clientY,
          fw: w.props.floatW || 720, fh: w.props.floatH || 460
        };
      } else return;
      e.preventDefault();
      OMA.WM.focus(w.wid);
    }, true);
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var w = OMA.WM.windows[drag.wid];
      if (!w) { drag = null; return; }
      if (drag.mode === 'move') {
        w.props.floatX = drag.fx + (e.clientX - drag.x0);
        w.props.floatY = drag.fy + (e.clientY - drag.y0);
      } else {
        w.props.floating = true;
        w.props.floatW = Math.max(240, drag.fw + (e.clientX - drag.x0));
        w.props.floatH = Math.max(160, drag.fh + (e.clientY - drag.y0));
      }
      OMA.WM.render();
    }, true);
    window.addEventListener('mouseup', function () { drag = null; }, true);

    /* Super + scroll wheel walks the workspaces. */
    window.addEventListener('wheel', function (e) {
      if (!OMA.Keys.superDown) return;
      e.preventDefault();
      OMA.WM.nextWs(e.deltaY > 0);
    }, { passive: false, capture: true });

    /* Double-click empty bar centre toggles transparency, like the real bar. */
    document.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('.oma-bar-center')) {
        OMA.System.barTransparent = !OMA.System.barTransparent;
        document.body.classList.toggle('bar-transparent', OMA.System.barTransparent);
        OMA.Shell.osd({ icon: 'monitor', label: 'Bar', value: OMA.System.barTransparent ? 'transparent' : 'opaque' });
      }
    });
  }

  function windowResize() { OMA.WM.render(); }

  function start() {
    initDiagnostics();
    /* ---- state ---- */
    OMA.System.applyFromStore();
    var themeId = OMA.Store.get('theme') || 'tokyo-night';
    OMA.System.setTheme(themeId, true);
    OMA.System.scaleLabel = OMA.Store.get('scale') || '1.6x';
    if (OMA.Store.get('animations') === false) document.documentElement.classList.add('no-anim');

    /* ---- virtual filesystem ---- */
    var fs = new OMA.VFS();
    OMA.FS = fs;
    fs.home = OMA.seedHome(fs, {
      user: OMA.Store.get('user') || 'oma',
      name: OMA.Store.get('name') || 'Omarchy User',
      email: OMA.Store.get('email') || 'oma@omarchy.org'
    });
    if (OMA.Art && OMA.Art.seedFiles) OMA.Art.seedFiles(fs);

    /* ---- surfaces ---- */
    installDesktop();
    OMA.System.applyDisplay();
    OMA.System.paintWallpaper();
    OMA.Shell.buildBar();
    OMA.Keys.install();
    OMA.Keys.superKey = OMA.Store.get('superKey') || 'CapsLock';
    desktopContextMenu();
    dragSupport();
    window.addEventListener('resize', windowResize);

    OMA.bus.on('theme:changed', function () { OMA.System.paintWallpaper(); });
    OMA.bus.on('keys:super', function (down) {
      document.body.classList.toggle('super-down', down);
    });
    OMA.bus.on('wm:edge', function (dir) {
      OMA.bus.emit('osd', { icon: 'arrow', label: 'Focus', value: 'edge — no window that way' });
    });

    /* Idle handling, mirroring shell.json (screensaver 150 s, lock 300 s). */
    var idle = 0;
    ['mousemove', 'mousedown', 'keydown', 'wheel'].forEach(function (evt) {
      window.addEventListener(evt, function () { idle = 0; }, { passive: true });
    });
    setInterval(function () {
      idle += 5;
      if (OMA.Store.get('idleDisabled')) return;
      if (idle === 150) OMA.Shell.screensaver();
      if (idle >= 300 && !OMA.Shell.S.lockEl) { idle = -10000; OMA.Shell.lock(); }
    }, 5000);

    /* ---- global OSD / notify buses so any module can post without importing */
    OMA.bus.on('osd', function (d) { OMA.Shell.osd(d); });

    /* ---- cold start ----
     * A stuck step in here would otherwise leave a black screen with no
     * explanation, so a watchdog reports whatever stage was reached. */
    DIAG.stage = 'power';
    var watchdog = setTimeout(function () {
      DIAG.log.push('WATCHDOG: still at stage "' + DIAG.stage + '" after 9s');
      diagReport();
    }, 9000);
    (DIAG.fast ? Promise.resolve() : bootScreen()).then(function () {
      DIAG.stage = 'boot';
      if (DIAG.fast) { OMA.Boot.enabled = false; }
      return OMA.Boot.run();
    }).then(function () {
      DIAG.stage = 'session';
      OMA.WM.render();
      OMA.sessionReady = true;
      if (!DIAG.fast) welcome();
      OMA.bus.emit('session:ready');
      clearTimeout(watchdog);
      setTimeout(diagReport, 2600);
    }).catch(function (e) {
      DIAG.log.push('START-REJECTED at ' + DIAG.stage + ': ' + ((e && e.stack) || e));
      clearTimeout(watchdog);
      OMA.log('start', e);
      OMA.Shell.notify({ app: 'Omarchy', icon: 'info', summary: 'Session started with an error', body: String((e && e.message) || e) });
      setTimeout(diagReport, 200);
    });
  }

  OMA.Main = { start: start, tour: tour };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.OMA = window.OMA || {});
