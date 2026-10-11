/* ============================================================================
 * Omarchy Web Clone — apputil.js
 * ----------------------------------------------------------------------------
 * btop ("Activity", Super + Ctrl + T), the Miller-column file manager
 * (Super + Shift + F) and lazygit.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, P = OMA.fsPaths, getFS = function () { return OMA.FS; }, I = OMA.Shell.icons;

  /* ================================================================ btop == */
  /* A tiny sparkline renderer. Deliberately plain canvas 2D: absolute pixel
     coordinates, no transforms, no globalAlpha, no gradients — the boring
     subset that behaves identically in every engine and in headless Chrome. */
  function drawer(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var N = opts.points || 120;
    var series = opts.series || 1;
    var max = opts.max || 100;
    var cols = opts.colors || [OMA.Themes.current.accent];
    var data = [];
    for (var i = 0; i < N; i++) data.push(new Array(series).fill(0));

    function push(vals) {
      data.push(vals.slice(0, series));
      if (data.length > N) data.shift();
      draw();
    }

    function draw() {
      var cw = canvas.clientWidth || canvas.width;
      var ch = canvas.clientHeight || canvas.height;
      if (!cw || !ch) return;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      var theme = OMA.Themes.current;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
      ctx.lineJoin = 'round';

      /* quarter grid */
      ctx.strokeStyle = OMA.Themes.alpha(theme.muted, 0.3);
      ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) {
        var gy = (ch / 4) * g;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
      }

      for (var s = 0; s < series; s++) {
        var col = cols[s % cols.length];
        var pts = [];
        for (var k = 0; k < data.length; k++) {
          var v = Math.max(0, Math.min(max, data[k][s] || 0));
          pts.push([(k / (data.length - 1)) * cw, ch - (v / max) * (ch - 4) - 2]);
        }
        /* fill under the curve */
        ctx.beginPath();
        ctx.moveTo(pts[0][0], ch);
        for (var a = 0; a < pts.length; a++) ctx.lineTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[pts.length - 1][0], ch);
        ctx.closePath();
        ctx.fillStyle = OMA.Themes.alpha(col, 0.18);
        ctx.fill();
        /* the curve itself */
        ctx.beginPath();
        for (var b = 0; b < pts.length; b++) {
          if (b === 0) ctx.moveTo(pts[b][0], pts[b][1]);
          else ctx.lineTo(pts[b][0], pts[b][1]);
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
    }

    return {
      push: push,
      draw: draw,
      resize: draw,
      remeasure: draw,
      /* Fill the history so the graph is never blank when a window opens. */
      warm: function (fn) {
        for (var k = 0; k < N; k++) {
          var row = [];
          for (var s = 0; s < series; s++) row.push(fn(s, k));
          data.push(row);
          if (data.length > N) data.shift();
        }
        draw();
      }
    };
  }

  OMA.WM.registry.register({
    id: 'btop', name: 'Activity', icon: 'activity', comment: 'btop — floating resource monitor (Super + Ctrl + T)',
    floating: true, floatW: 940, floatH: 600, single: true,
    title: function () { return 'btop — Activity'; },

    mount: function (body, win) {
      var wrap = h('div.oma-btop');
      var cpuCanvas, memCanvas, netCanvas;
      wrap.appendChild(h('div.oma-btop-grid', [
        card('cpu', 'CPU  ' + (navigator.hardwareConcurrency || 8) + ' threads', function (c) { cpuCanvas = c; }),
        card('mem', 'Memory', function (c) { memCanvas = c; }),
        card('net', 'Network', function (c) { netCanvas = c; })
      ]));
      var procBody = h('tbody');
      wrap.appendChild(h('div.oma-btop-proc', [
        h('div.oma-btop-prochead', [
          h('span', { text: 'PID' }), h('span', { text: 'USER' }), h('span', { text: 'CPU%' }),
          h('span', { text: 'MEM%' }), h('span', { text: 'COMMAND' })
        ]),
        h('table.oma-btop-table', [procBody])
      ]));
      body.appendChild(wrap);

      var cpuD = drawer(cpuCanvas, { max: 100, series: 1, colors: [OMA.Themes.current.accent] });
      var memD = drawer(memCanvas, { max: 100, series: 2, colors: [OMA.Themes.current.cyan, OMA.Themes.current.magenta] });
      var netD = drawer(netCanvas, { max: 100, series: 2, colors: [OMA.Themes.current.green, OMA.Themes.current.yellow] });

      var cpuVal = 18, netA = 20, netB = 8;
      function tick() {
        var procs = OMA.Syslog.procs();
        cpuVal = Math.max(2, Math.min(96, 14 + procs.reduce(function (a, p) { return a + p.cpu; }, 0) * 0.9 + Math.random() * 6));
        var memUsed = procs.reduce(function (a, p) { return a + p.mem; }, 0) + 6;
        netA = Math.max(1, netA + (Math.random() - 0.5) * 22);
        netB = Math.max(1, netB + (Math.random() - 0.5) * 14);
        cpuD.push([cpuVal]);
        memD.push([Math.min(94, memUsed), Math.min(94, memUsed * 0.45)]);
        netD.push([netA, netB]);

        var c = wrap.querySelector('.oma-btop-card-cpu .oma-btop-val'); if (c) c.textContent = cpuVal.toFixed(0) + '%';
        var m = wrap.querySelector('.oma-btop-card-mem .oma-btop-val'); if (m) m.textContent = (memUsed / 100 * 32).toFixed(1) + ' GiB / 32 GiB';
        var n = wrap.querySelector('.oma-btop-card-net .oma-btop-val'); if (n) n.textContent = 'v' + netA.toFixed(1) + ' ^' + netB.toFixed(1) + ' Mb/s';

        clear(procBody);
        procs.slice(0, 22).forEach(function (p) {
          procBody.appendChild(h('tr', [
            h('td', { text: String(p.pid) }),
            h('td', { text: p.user }),
            h('td', { text: p.cpu.toFixed(1), class: p.cpu > 12 ? 'is-hot' : '' }),
            h('td', { text: p.mem.toFixed(1) }),
            h('td.oma-btop-cmd', { text: p.cmd })
          ]));
        });
        var load = wrap.querySelector('.oma-btop-load');
        if (load) load.textContent = 'load ' + OMA.Syslog.loadAvg().join(' ');
      }

      /* A little history immediately, so the graphs are never blank on open. */
      function seed() {
        cpuD.warm(function () { return 10 + Math.random() * 30; });
        memD.warm(function (s) { return s === 0 ? 12 + Math.random() * 18 : 6 + Math.random() * 9; });
        netD.warm(function (s) { return s === 0 ? 10 + Math.random() * 40 : 5 + Math.random() * 20; });
        tick();
      }
      seed();
      /* Re-measure once the compositor has finished placing the window. */
      [40, 160, 400].forEach(function (ms) { setTimeout(seed, ms); });
      var timer = setInterval(tick, 1000);
      win._disposers = [function () { clearInterval(timer); }];

      function card(kind, label, ref) {
        var canvas = h('canvas.oma-btop-canvas');
        if (ref) ref(canvas);
        return h('div.oma-btop-card.oma-btop-card-' + kind, [
          h('div.oma-btop-cardhead', [
            h('span.oma-btop-cardlabel', { text: label }),
            h('span.oma-btop-val', { text: '—' })
          ]),
          canvas,
          kind === 'cpu' ? h('div.oma-btop-load', { text: 'load —' }) : null
        ]);
      }
    },

    onClose: function (win) {
      (win._disposers || []).forEach(function (d) { try { d(); } catch (e) { } });
    }
  });

  /* ======================================================= file manager == */
  OMA.WM.registry.register({
    id: 'files', name: 'Files', icon: 'folder', comment: 'Miller-column file manager (Super + Shift + F)',
    single: true,
    title: function (arg) { return 'Files — ' + (arg || OMA.Term.HOME()); },

    mount: function (body, win) {
      var wrap = h('div.oma-files');
      var cols = h('div.oma-files-cols');
      var preview = h('div.oma-files-preview');
      var crumbs = h('div.oma-files-crumbs');
      var path = win.props.arg || OMA.Term.HOME();
      var hist = [path];

      wrap.appendChild(h('div.oma-files-toolbar', [
        h('button.oma-btn.oma-btn-sm', { text: '<', title: 'Back (Backspace)', onclick: back }),
        h('button.oma-btn.oma-btn-sm', { text: '^', title: 'Parent', onclick: function () { go(P.dirname(path)); } }),
        crumbs,
        h('div.oma-files-actions', [
          h('button.oma-btn.oma-btn-sm', { text: 'Edit', onclick: openInEditor }),
          h('button.oma-btn.oma-btn-sm', { text: 'Terminal here', onclick: function () { OMA.WM.open('terminal', { run: 'cd ' + path }); } })
        ])
      ]));
      wrap.appendChild(h('div.oma-files-main', [cols, preview]));
      body.appendChild(wrap);

      function back() {
        if (hist.length > 1) { hist.pop(); path = hist[hist.length - 1]; render(); }
      }
      function go(p) {
        p = P.norm(p);
        if (!getFS().isDir(p)) return;
        path = p; hist.push(p); render();
      }
      function openInEditor() {
        var sel = OMA.$('.oma-files-row.is-sel', cols);
        if (!sel) return;
        var t = sel.dataset.path;
        if (getFS().isDir(t)) go(t); else OMA.WM.open('editor', t);
      }

      function renderCrumbs() {
        clear(crumbs);
        var parts = path.split('/').filter(Boolean);
        crumbs.appendChild(h('span.oma-crumb', { text: '/', onclick: function () { go('/'); } }));
        var acc = '';
        parts.forEach(function (p) {
          acc += '/' + p;
          var target = acc;
          crumbs.appendChild(h('span.oma-crumb-sep', { html: I.chevron }));
          crumbs.appendChild(h('span.oma-crumb', { text: p, onclick: function () { go(target); } }));
        });
      }

      function render() {
        renderCrumbs();
        clear(cols);
        var items = getFS().list(path);
        if (!items.length) cols.appendChild(h('div.oma-empty', { text: 'empty' }));
        items.forEach(function (n, i) {
          var full = P.join(path, n.name);
          var size = n.type === 'dir' ? getFS().list(full).length + ' items' : fmt.size((n.content || '').length);
          var row = h('div.oma-files-row' + (i === 0 ? '.is-sel' : ''), {
            dataset: { path: full },
            onclick: function () {
              OMA.$$('.oma-files-row', cols).forEach(function (r) { r.classList.remove('is-sel'); });
              row.classList.add('is-sel');
              showPreview(n, full);
            },
            ondblclick: function () { if (n.type === 'dir') go(full); else OMA.WM.open('editor', full); }
          });
          row.appendChild(h('div.oma-files-icon', { html: n.type === 'dir' ? I.folder : I.file }));
          row.appendChild(h('div.oma-files-name', { text: n.name }));
          row.appendChild(h('div.oma-files-size', { text: size }));
          cols.appendChild(row);
        });
        if (items.length) showPreview(items[0], P.join(path, items[0].name));
        else showPreview(null, null);
      }

      function showPreview(n, full) {
        clear(preview);
        if (!n) { preview.appendChild(h('div.oma-empty', { text: 'nothing selected' })); return; }
        preview.appendChild(h('div.oma-files-prevhead', { text: n.name }));
        preview.appendChild(h('div.oma-files-prevmeta', { text: fmt.perms(n) + '  ' + fmt.size(n.type === 'dir' ? 4096 : (n.content || '').length) + '  ' + fmt.date(n.mtime) }));
        if (n.type === 'dir') {
          var kids = getFS().list(full);
          preview.appendChild(h('div.oma-files-prevlist', {
            text: kids.length ? kids.map(function (k) { return (k.type === 'dir' ? '├ ' : '  ') + k.name; }).join('\n') : '(empty directory)'
          }));
        } else {
          var content = (n.content || '');
          var isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(n.name);
          var isMedia = /\.(mp4|mkv|webm|mov)$/i.test(n.name);
          if (isImg) preview.appendChild(h('div.oma-files-previmg', { html: OMA.Art.svgFor(n.name) }));
          else if (isMedia) preview.appendChild(h('div.oma-files-prevmeta', { text: 'video · press Enter to open the player', onclick: function () { OMA.WM.open('media', full); } }));
          else preview.appendChild(h('pre.oma-files-prevtext', { text: content.slice(0, 2600) + (content.length > 2600 ? '\n…' : '') }));
        }
        var actions = h('div.oma-files-prevactions', [
          h('button.oma-btn.oma-btn-sm', { text: 'Open', onclick: function () { if (n.type === 'dir') go(full); else OMA.WM.open('editor', full); } }),
          h('button.oma-btn.oma-btn-sm', { text: 'Copy path', onclick: function () { OMA.Capture.copy(full); OMA.Shell.osd({ icon: 'clipboard', label: 'Copied', value: full }); } })
        ]);
        preview.appendChild(actions);
      }

      render();
      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace') { e.preventDefault(); back(); }
        if (e.key === 'Enter') { e.preventDefault(); openInEditor(); }
        if (e.key === ' ') {
          e.preventDefault();
          var rows = OMA.$$('.oma-files-row', cols);
          var idx = rows.findIndex(function (r) { return r.classList.contains('is-sel'); });
          if (idx >= 0) { var n = getFS().lookup(rows[idx].dataset.path); if (n) showPreview(n, rows[idx].dataset.path); }
        }
      });
      setTimeout(function () { wrap.focus(); }, 60);
    }
  });

  /* ============================================================ lazygit == */
  OMA.WM.registry.register({
    id: 'lazygit', name: 'lazygit', icon: 'activity', comment: 'Git TUI', single: true,
    title: function (arg) { return 'lazygit — ' + (arg || '~/Projects/omarchy-web'); },

    mount: function (body, win) {
      var dir = win.props.arg || (OMA.Term.HOME() + '/Projects/omarchy-web');
      var wrap = h('div.oma-lazygit');
      var panels = [
        ['Status', ['repo: ' + P.basename(dir), 'branch: main > origin/main', '^0 v0', '', 'Recent commits:', 'a91f3c2 add Quattro bar layout', '7d2e881 dwindle: alternate split axis', '31b0a44 themes: all 23 palettes', 'e04c9aa shell: native OSD']],
        ['Files', [' M src/themes.js', ' M src/wm.js', ' M src/shell.js', '?? src/appterm.js', '?? src/appeditor.js', '?? src/apputil.js']],
        ['Branches', ['* main', '  quattro', '  edge', '  remotes/origin/main']],
        ['Stash', ['(empty)']]
      ];
      var grid = h('div.oma-lazygit-grid');
      panels.forEach(function (p, i) {
        var panel = h('div.oma-lazygit-panel' + (i === 0 ? '.is-active' : ''), [
          h('div.oma-lazygit-title', { text: p[0] }),
          h('pre.oma-lazygit-body', { text: p[1].join('\n') })
        ]);
        panel.onclick = function () {
          OMA.$$('.oma-lazygit-panel', wrap).forEach(function (x) { x.classList.remove('is-active'); });
          panel.classList.add('is-active');
        };
        grid.appendChild(panel);
      });
      wrap.appendChild(grid);
      wrap.appendChild(h('div.oma-lazygit-help', {
        text: 'space stage/unstage   c commit   P push   p pull   q quit      (this is a mock of the real TUI)'
      }));
      body.appendChild(wrap);
    }
  });
})(window.OMA = window.OMA || {});
