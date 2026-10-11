/* ============================================================================
 * Omarchy Web Clone — capture.js
 * ----------------------------------------------------------------------------
 * Omarchy's capture stack: Omasnap screenshots (region / window / fullscreen,
 * saved to ~/Pictures/Screenshots), gpu-screen-recorder screen recording,
 * hyprpicker colour picking, the emoji picker, the universal clipboard and its
 * history, dictation, and reminders.
 * Also defines OMA.Syslog (process table, load average, uptime).
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, P = OMA.fsPaths, getFS = function () { return OMA.FS; }, I = OMA.Shell.icons;

  /* ============================================================== syslog == */
  var BASE_PROCS = [
    { pid: 1, user: 'root', cmd: '/sbin/init' },
    { pid: 412, user: 'root', cmd: 'systemd-journald' },
    { pid: 806, user: 'oma', cmd: 'Hyprland --config ~/.config/hypr/hyprland.lua' },
    { pid: 901, user: 'oma', cmd: 'omarchy-shell (Quickshell)' },
    { pid: 923, user: 'oma', cmd: 'omarchy-owe --restore' },
    { pid: 947, user: 'oma', cmd: 'hyprsunset --temperature 6500' },
    { pid: 1024, user: 'oma', cmd: 'foot --server' },
    { pid: 1108, user: 'oma', cmd: 'nvim' },
    { pid: 1233, user: 'oma', cmd: 'chromium --enable-features=WaylandWindowDecorations' },
    { pid: 1401, user: 'oma', cmd: 'docker-proxy -container-ip 172.18.0.2' },
    { pid: 1512, user: 'oma', cmd: 'postgres: checkpointer' },
    { pid: 1602, user: 'oma', cmd: 'redis-server 127.0.0.1:6379' },
    { pid: 1710, user: 'oma', cmd: 'puma 6.5.0 (tcp://127.0.0.1:3000)' },
    { pid: 1888, user: 'oma', cmd: 'node /home/oma/Projects/omarchy-web/tools/dev.mjs' },
    { pid: 2004, user: 'oma', cmd: 'pipewire' },
    { pid: 2140, user: 'oma', cmd: 'tailscaled' }
  ];
  var bootTime = Date.now() - (4 * 3600 + 17 * 60) * 1000;

  var Syslog = {
    entries: [],
    push: function (tag, msg) {
      Syslog.entries.push({ ts: Date.now(), tag: tag, msg: msg });
      if (Syslog.entries.length > 200) Syslog.entries.shift();
      OMA.bus.emit('syslog', { tag: tag, msg: msg });
    },
    procs: function () {
      var t = (Date.now() - bootTime) / 1000;
      return BASE_PROCS.map(function (p, i) {
        var wobble = Math.sin(t / (7 + i) + i) * 0.5 + 0.5;
        var cpu = Math.max(0.1, (i % 5 === 0 ? 14 : 2.4) * wobble + (OMA.Term && OMA.Term.running ? 6 : 0));
        var mem = 0.4 + ((i * 37) % 90) / 22;
        return { pid: p.pid, user: p.user, cmd: p.cmd, cpu: cpu, mem: mem };
      }).sort(function (a, b) { return b.cpu - a.cpu; });
    },
    loadAvg: function () {
      var t = Date.now() / 60000;
      return [1.24 + Math.sin(t) * 0.5, 0.98 + Math.cos(t / 2) * 0.3, 0.72 + Math.sin(t / 3) * 0.2].map(function (v) { return v.toFixed(2); });
    },
    uptime: function () {
      var s = Math.round((Date.now() - bootTime) / 1000);
      var d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60);
      return (d ? d + ' days, ' : '') + hh + ' hours, ' + mm + ' mins';
    },
    uptimeLine: function () {
      return ' ' + fmt.clock() + ' up ' + Syslog.uptime() + ',  2 users,  load average: ' + Syslog.loadAvg().join(', ');
    }
  };
  OMA.Syslog = Syslog;
  Syslog.push('boot', 'Omarchy 4.0.4 (Quattro) — linux-omarchy 6.16.4');

  /* ========================================================== clipboard == */
  var clip = { items: [], text: '' };
  function copy(text, label) {
    clip.text = String(text);
    var existing = clip.items.findIndex(function (c) { return c.text === text; });
    if (existing >= 0) clip.items.splice(existing, 1);
    clip.items.unshift({ text: String(text), ts: Date.now(), app: label || 'clipboard' });
    if (clip.items.length > 40) clip.items.pop();
    try { navigator.clipboard && navigator.clipboard.writeText(String(text)); } catch (e) { }
    OMA.bus.emit('clipboard:changed', clip);
  }
  function paste() { return clip.text; }

  /* ============================================================ overlays == */
  function overlay(id, cls) {
    var el = OMA.$('#oma-cap-' + id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = h('div#oma-cap-' + id + '.oma-cap.' + (cls || ''));
    document.body.appendChild(el);
    return el;
  }

  var Cap = {};

  /* Omasnap: screenshot with region / window / fullscreen. */
  Cap.screenshot = function (mode) {
    mode = mode || 'region';
    var el = overlay('shot', 'oma-cap-shot');
    var stage = h('div.oma-shot-stage');
    var hint = h('div.oma-shot-hint', {
      text: mode === 'region'
        ? 'Omasnap — drag to capture a region · Esc to cancel · press F for fullscreen, W for window'
        : (mode === 'window' ? 'Omasnap — click a window to capture it' : 'Omasnap — capturing the full screen')
    });
    var rect = h('div.oma-shot-rect');
    stage.appendChild(rect);
    el.appendChild(stage);
    el.appendChild(hint);

    var modeBtns = h('div.oma-shot-modes');
    [['Region', 'region'], ['Window', 'window'], ['Fullscreen', 'full'], ['Text (OCR)', 'text'], ['Colour', 'color']].forEach(function (m) {
      modeBtns.appendChild(h('button.oma-btn.oma-btn-sm' + (m[1] === mode ? '.is-active' : ''), {
        text: m[0],
        onclick: function () {
          if (m[1] === 'color') { cleanup(); Cap.colorPicker(); return; }
          if (m[1] === 'text') { cleanup(); Cap.textExtract(); return; }
          if (m[1] === 'full') { cleanup(); finish('full', { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }); return; }
          mode = m[1];
          hint.textContent = mode === 'region'
            ? 'Omasnap — drag to capture a region · Esc to cancel'
            : 'Omasnap — click a window to capture it';
          OMA.$$('.oma-shot-modes .oma-btn', el).forEach(function (b) { b.classList.remove('is-active'); });
          m[0] && null;
        }
      }));
    });
    el.appendChild(modeBtns);

    var start = null;
    function onDown(e) {
      if (e.target.closest('.oma-shot-modes') || e.target.closest('.oma-shot-hint')) return;
      start = { x: e.clientX, y: e.clientY };
      rect.style.display = 'block';
      draw(e.clientX, e.clientY);
    }
    function onMove(e) { if (start) draw(e.clientX, e.clientY); }
    function onUp(e) {
      if (!start) return;
      var r = box(start, { x: e.clientX, y: e.clientY });
      start = null;
      rect.style.display = 'none';
      if (r.w < 6 || r.h < 6) {
        if (mode === 'window') { finish('window', { x: 120, y: 90, w: 720, h: 460 }); return; }
        cleanup(); return;
      }
      finish(mode, r);
    }
    function draw(cx, cy) {
      var r = box(start, { x: cx, y: cy });
      rect.style.left = r.x + 'px'; rect.style.top = r.y + 'px';
      rect.style.width = r.w + 'px'; rect.style.height = r.h + 'px';
      hint.textContent = 'Omasnap — ' + r.w + '×' + r.h + ' · release to capture';
    }
    function box(a, b) {
      return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
    }
    function finish(m, r) {
      var name = 'Screenshot from ' + fmt.iso() + ' ' + fmt.clock().replace(':', '-') + '.png';
      var path = P.join(OMA.Term.HOME(), 'Pictures/Screenshots', name);
      getFS().write(path, '<svg-image>' + name);
      OMA.Capture.copy(path, 'omasnap');
      OMA.Shell.notify({
        app: 'Omasnap', icon: 'camera', summary: 'Screenshot saved',
        body: '~/' + P.join('Pictures/Screenshots', name).split('/').slice(-2).join('/') + '  ·  ' + (r ? r.w + '×' + r.h : m) +
          '  ·  path copied to clipboard',
        actions: [{ label: 'Open viewer', run: function () { OMA.WM.open('viewer'); } }]
      });
      Syslog.push('omasnap', 'captured ' + m + ' ' + (r ? r.w + 'x' + r.h : '') + ' -> ' + path);
      cleanup();
    }
    function cleanup() {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('keydown', onKey, true);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    function onKey(e) {
      e.preventDefault();
      if (e.key === 'Escape') cleanup();
      if (e.key === 'f' || e.key === 'F') { cleanup(); Cap.screenshot('full'); }
      if (e.key === 'w' || e.key === 'W') { cleanup(); Cap.screenshot('window'); }
      if (e.key === 't' || e.key === 'T') { cleanup(); Cap.textExtract(); }
    }
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('keydown', onKey, true);
  };

  /* gpu-screen-recorder */
  Cap.record = function (audio) {
    if (OMA.System.recording) { Cap.stopRecord(); return; }
    OMA.System.recording = true;
    OMA.Shell.renderBar();
    var el = overlay('rec', 'oma-cap-rec');
    var timerEl = h('div.oma-rec-time', { text: '0:00' });
    var badge = h('div.oma-rec-badge', { html: '<i></i><span>REC · ' + (audio || 'no audio') + '</span>' });
    var stop = h('button.oma-btn.oma-btn-sm', { text: 'Stop (Alt + PrtSc)', onclick: function () { Cap.stopRecord(); } });
    el.appendChild(badge);
    el.appendChild(timerEl);
    el.appendChild(h('div.oma-rec-controls', [
      stop,
      h('button.oma-btn.oma-btn-sm', { text: 'Webcam −', onclick: function () { OMA.Shell.osd({ icon: 'camera', label: 'Webcam overlay', value: 'smaller' }); } }),
      h('button.oma-btn.oma-btn-sm', { text: 'Webcam +', onclick: function () { OMA.Shell.osd({ icon: 'camera', label: 'Webcam overlay', value: 'larger' }); } })
    ]));
    var t0 = Date.now();
    var timer = setInterval(function () {
      timerEl.textContent = fmt.dur((Date.now() - t0) / 1000);
    }, 1000);
    Cap._recTimer = timer; Cap._recEl = el; Cap._recStart = t0; Cap._recAudio = audio;
  };
  Cap.stopRecord = function () {
    if (!OMA.System.recording) return;
    clearInterval(Cap._recTimer);
    if (Cap._recEl && Cap._recEl.parentNode) Cap._recEl.parentNode.removeChild(Cap._recEl);
    var secs = Math.round((Date.now() - Cap._recStart) / 1000);
    OMA.System.recording = false;
    OMA.Shell.renderBar();
    var name = 'Recording ' + fmt.iso() + ' ' + fmt.clock().replace(':', '-') + '.mp4';
    getFS().write(P.join(OMA.Term.HOME(), 'Videos', name), '<svg-image>' + name);
    OMA.Shell.notify({
      app: 'gpu-screen-recorder', icon: 'camera', summary: 'Recording saved',
      body: '~/' + name + ' · ' + fmt.dur(secs) + ' · ' + (Cap._recAudio === 'none' ? 'no audio' : Cap._recAudio) + ' · normalised to −14 LUFS',
      actions: [{ label: 'Play', run: function () { OMA.WM.open('media', name); } }]
    });
    Syslog.push('gpu-screen-recorder', 'saved ' + name + ' (' + secs + 's)');
  };

  /* hyprpicker */
  Cap.colorPicker = function () {
    var el = overlay('color', 'oma-cap-color');
    var preview = h('div.oma-color-preview');
    var code = h('div.oma-color-code', { text: '#000000' });
    var formats = h('div.oma-color-formats');
    el.appendChild(h('div.oma-color-panel', [
      h('div.oma-color-title', { text: 'hyprpicker — click anywhere to sample a colour' }),
      preview, code, formats,
      h('div.oma-color-note', { text: 'Sampling the interface palette. Click outside the panel.' })
    ]));
    function sample(e) {
      var target = e.target;
      var cs = getComputedStyle(target);
      var bg = cs.backgroundColor;
      var rgb = /rgba?\(([^)]+)\)/.exec(bg);
      var hex = '#000000';
      if (rgb) {
        var parts = rgb[1].split(',').map(function (s) { return parseFloat(s); });
        hex = '#' + parts.slice(0, 3).map(function (n) { return Math.round(n).toString(16).padStart(2, '0'); }).join('');
      }
      preview.style.background = hex;
      code.textContent = hex.toUpperCase();
      clear(formats);
      var p = parts || [0, 0, 0];
      [['HEX', hex.toUpperCase()], ['RGB', 'rgb(' + p.slice(0, 3).map(Math.round).join(', ') + ')'],
      ['HSL', hsl(p[0], p[1], p[2])], ['ANSI', '' + (OMA.Themes.ansi(OMA.Themes.current).indexOf(hex.toLowerCase()) >= 0 ? 'palette index ' + OMA.Themes.ansi(OMA.Themes.current).indexOf(hex.toLowerCase()) : '—')]
      ].forEach(function (row) {
        formats.appendChild(h('div.oma-color-row', [h('span', { text: row[0] }), h('code', { text: row[1] })]));
      });
      copy(hex.toUpperCase(), 'hyprpicker');
    }
    function onKey(e) { if (e.key === 'Escape') done(); }
    function done() {
      window.removeEventListener('keydown', onKey, true);
      if (el.parentNode) el.parentNode.removeChild(el);
      OMA.Shell.notify({ app: 'hyprpicker', icon: 'palette', summary: 'Colour copied', body: code.textContent + ' is on the clipboard.' });
    }
    el.addEventListener('click', function (e) {
      if (e.target.closest('.oma-color-panel')) return;
      sample(e);
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); done(); });
    window.addEventListener('keydown', onKey, true);
  };
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hh = 0;
    if (d) {
      if (mx === r) hh = ((g - b) / d) % 6;
      else if (mx === g) hh = (b - r) / d + 2;
      else hh = (r - g) / d + 4;
      hh *= 60; if (hh < 0) hh += 360;
    }
    var l = (mx + mn) / 2;
    var s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return 'hsl(' + Math.round(hh) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
  }

  /* Tesseract OCR stand-in */
  Cap.textExtract = function () {
    OMA.Shell.notify({ app: 'Omasnap', icon: 'edit', summary: 'Extracting text…', body: 'Tesseract OCR over the selected region.', timeout: 1800 });
    setTimeout(function () {
      var lines = [
        'Omarchy 4.0.4 (Quattro)',
        'Super + Space is the one menu for apps and commands.',
        'Waybar, Walker, Mako, SwayOSD, hyprlock, hypridle, swaybg and polkit-gnome',
        'were all replaced by a single Quickshell process in 4.0.0.'
      ].join('\n');
      copy(lines, 'omasnap OCR');
      OMA.Shell.notify({
        app: 'Omasnap', icon: 'edit', summary: 'Text extracted to clipboard',
        body: lines.split('\n')[0] + ' …'
      });
      Syslog.push('omasnap', 'tesseract extracted 4 lines');
    }, 1400);
  };

  /* Emoji picker */
  var EMOJI = ('😄 😂 😍 ✌️ ❤️ 👍 👎 🤞 🤘 😘 🙄 😉 🙏 🤤 💰 🎉 💯 🥂 👌 👋 💪 🤯 🚀 🔥 ✨ 🎯 🧠 🐧 🖥️ ⌨️ 🗂️ 🔒 🌙 ☀️ 🌊 🍜 ☕ 🎧 📷 🎨 🛠️ ⚙️ 📦 🧪 🐳 🦀 🐍 💎 🍺 🌮 🍕 🥑 🍓').split(' ');
  Cap.emojiPicker = function () {
    var el = overlay('emoji', 'oma-cap-picker');
    var grid = h('div.oma-emoji-grid');
    var input = h('input.oma-picker-input', { placeholder: 'Search emoji…', spellcheck: 'false' });
    function paint(filter) {
      clear(grid);
      EMOJI.filter(function (e) { return !filter || e.indexOf(filter) >= 0 || true; }).forEach(function (e) {
        grid.appendChild(h('div.oma-emoji', {
          text: e, onclick: function () {
            copy(e, 'emoji');
            OMA.Shell.osd({ icon: 'emoji', label: 'Copied', value: e });
            done();
          }
        }));
      });
    }
    el.appendChild(h('div.oma-picker-panel', [
      h('div.oma-picker-head', { text: 'Emoji — Super + Ctrl + E' }), input, grid,
      h('div.oma-picker-note', { text: 'Also available as XCompose sequences: Shift + CapsLock M S > 😄, M C > 😂, M H > ❤️' })
    ]));
    function onKey(e) { if (e.key === 'Escape') done(); }
    function done() {
      window.removeEventListener('keydown', onKey, true);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.addEventListener('mousedown', function (e) { if (e.target === el) done(); });
    window.addEventListener('keydown', onKey, true);
    paint('');
    setTimeout(function () { input.focus(); }, 50);
  };

  /* Clipboard history */
  Cap.clipboardHistory = function () {
    var body = h('div');
    if (!clip.items.length) body.appendChild(h('div.oma-panel-empty', { text: 'Clipboard history is empty.' }));
    clip.items.forEach(function (c) {
      body.appendChild(h('div.oma-clip-row', {
        onclick: function () { copy(c.text, 'history'); OMA.Shell.osd({ icon: 'clipboard', label: 'Copied', value: c.text.slice(0, 40) }); }
      }, [
        h('div.oma-clip-app', { text: c.app || 'clipboard' }),
        h('div.oma-clip-text', { text: c.text.length > 160 ? c.text.slice(0, 160) + '…' : c.text }),
        h('div.oma-clip-time', { text: fmt.clock(new Date(c.ts)) })
      ]));
    });
    var p = OMA.Shell.openPanelCustom('Clipboard history', body, 'clipboard');
    p.appendChild(h('button.oma-btn.oma-btn-wide', {
      text: 'Clear clipboard history',
      onclick: function () { clip.items = []; OMA.Shell.closePanel(); }
    }));
  };

  /* Dictation */
  Cap.dictate = function (on) {
    OMA.System.dictating = on;
    if (on) {
      OMA.Shell.osd({ icon: 'volume', label: 'Dictation', value: OMA.System.defaults.dictation + ' · listening', sticky: true });
    } else {
      OMA.Shell.osd({ icon: 'volume', label: 'Dictation', value: 'stopped' });
    }
    OMA.Shell.renderBar();
  };

  /* --------------------------------------------------------- reminders UI */
  OMA.Shell.remind = function () {
    var body = h('div');
    var input = h('input.oma-picker-input', { placeholder: 'Remind me to…', spellcheck: 'false' });
    var when = h('input.oma-picker-input', { placeholder: 'when (e.g. 18:00, in 20 minutes)', spellcheck: 'false' });
    body.appendChild(h('div.oma-panel-sub', { text: 'New reminder' }));
    body.appendChild(input); body.appendChild(when);
    body.appendChild(h('button.oma-btn.oma-btn-wide', {
      text: 'Set reminder (Super + Ctrl + R)',
      onclick: function () {
        OMA.System.addReminder(input.value || 'Take a break', when.value);
        OMA.Shell.closePanel();
      }
    }));
    body.appendChild(h('div.oma-panel-sub', { text: 'Upcoming' }));
    if (!OMA.System.reminders.length) body.appendChild(h('div.oma-panel-empty', { text: 'No reminders.' }));
    OMA.System.reminders.forEach(function (r) {
      body.appendChild(h('div.oma-panel-item', [h('div', { text: r.text }), h('div.oma-panel-meta', { text: r.when || 'soon' })]));
    });
    OMA.Shell.openPanelCustom('Reminders', body, 'bell');
    setTimeout(function () { input.focus(); }, 60);
  };
  OMA.Shell.showReminders = function () { OMA.Shell.remind(); };
  OMA.Shell.clearReminders = function () {
    OMA.System.reminders = [];
    OMA.Shell.osd({ icon: 'remove', label: 'Reminders', value: 'all cleared' });
  };

  /* ------------------------------------------------------------ screensaver */
  OMA.Shell.screensaver = function () {
    var el = overlay('saver', 'oma-cap-saver');
    var t = OMA.Themes.current;
    el.innerHTML = '<div class="oma-saver-inner">' +
      '<div class="oma-saver-mark">' + OMA.Art.mark(120) + '</div>' +
      '<div class="oma-saver-time">' + fmt.clock() + '</div>' +
      '<div class="oma-saver-hint">Screensaver — move the mouse or press any key</div></div>';
    function done() {
      window.removeEventListener('keydown', done, true);
      window.removeEventListener('mousemove', done, true);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    setTimeout(function () {
      window.addEventListener('keydown', done, true);
      window.addEventListener('mousemove', done, true);
    }, 400);
  };

  /* ------------------------------------------------------- suspend / power */
  OMA.Shell.suspend = function () {
    var el = overlay('sleep', 'oma-cap-sleep');
    el.innerHTML = '<div class="oma-sleep-inner"><div class="oma-sleep-title">Suspended</div>' +
      '<div class="oma-sleep-hint">Press any key to wake</div></div>';
    function wake() {
      window.removeEventListener('keydown', wake, true);
      if (el.parentNode) el.parentNode.removeChild(el);
      OMA.Shell.osd({ icon: 'sun', label: 'Resumed' });
    }
    setTimeout(function () { window.addEventListener('keydown', wake, true); }, 500);
  };
  OMA.Shell.logout = function () { OMA.Shell.confirm('Log out?', 'This reloads the desktop session.', function () { location.reload(); }); };
  OMA.Shell.reboot = function () {
    OMA.Shell.confirm('Reboot?', 'The machine will restart.', function () { OMA.Boot.reboot(); });
  };
  OMA.Shell.shutdown = function () {
    OMA.Shell.confirm('Shut down?', 'The machine will power off.', function () { OMA.Boot.shutdown(); });
  };

  OMA.Shell.confirm = function (title, body, onYes) {
    var el = overlay('confirm', 'oma-cap-confirm');
    el.appendChild(h('div.oma-confirm-panel', [
      h('div.oma-confirm-title', { text: title }),
      h('div.oma-confirm-body', { text: body }),
      h('div.oma-confirm-actions', [
        h('button.oma-btn', { text: 'Cancel', onclick: function () { el.parentNode.removeChild(el); } }),
        h('button.oma-btn.oma-btn-primary', { text: 'Yes', onclick: function () { el.parentNode.removeChild(el); onYes(); } })
      ])
    ]));
  };

  Cap.copy = copy;
  Cap.paste = paste;
  Cap.clip = clip;
  OMA.Capture = Cap;
})(window.OMA = window.OMA || {});
