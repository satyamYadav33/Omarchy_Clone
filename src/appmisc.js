/* ============================================================================
 * Omarchy Web Clone — appmisc.js
 * ----------------------------------------------------------------------------
 * Image viewer, media player, the omarchy-agent dashboard, the calculator and
 * a floating game (there to show the compositor's float/sticky behaviour).
 *
 * Also defines OMA.Art — procedural artwork so the clone ships zero image
 * assets while still having real pictures to open in the viewer.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, P = OMA.fsPaths, getFS = function () { return OMA.FS; }, I = OMA.Shell.icons;

  /* ================================================================ Art == */
  var Art = {};
  Art.mark = function (size) {
    var t = OMA.Themes.current;
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" fill="none">' +
      '<circle cx="50" cy="50" r="40" stroke="' + t.accent + '" stroke-width="9" stroke-linecap="round" ' +
      'stroke-dasharray="176 76" transform="rotate(-58 50 50)"/>' +
      '<circle cx="50" cy="50" r="15" fill="' + t.accent + '" opacity="0.85"/>' +
      '<circle cx="50" cy="50" r="26" fill="' + t.accent + '" opacity="0.16"/></svg>';
  };

  /* Named procedural pictures, used by the viewer and the file manager. */
  var PICS = {
    'oma-cityscape.png': function (t, w, hgt) {
      var s = '', r = seed(11);
      s += bg(t, w, hgt, t.bgDarker, t.bg);
      for (var i = 0; i < 80; i++) s += circle(r() * w, r() * hgt * 0.5, 0.4 + r(), t.fgLight, 0.1 + r() * 0.5);
      for (var L = 0; L < 2; L++) {
        var x = -10;
        while (x < w + 10) {
          var bw = 14 + r() * 46, bh = 30 + r() * (L ? hgt * 0.24 : hgt * 0.36);
          var base = hgt * (L ? 0.98 : 0.86);
          s += rect(x, base - bh, bw, bh, L ? t.bgDarker : t.bgDark, L ? 1 : 0.7);
          if (L) for (var y = base - bh + 6; y < base - 6; y += 10) for (var xx = x + 3; xx < x + bw - 6; xx += 8)
            if (r() > 0.7) s += rect(xx, y, 3, 4, r() > 0.7 ? t.yellow : t.accent, 0.4 + r() * 0.5);
          x += bw + 3 + r() * 7;
        }
      }
      return svgWrap(s, w, hgt);
    },
    'sunset-lake.png': function (t, w, hgt) {
      var s = '', r = seed(29), hor = hgt * 0.58;
      s += '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + t.bgDarker + '"/><stop offset="0.65" stop-color="' + OMA.Themes.mix(t.bg, t.magenta, 0.3) + '"/>' +
        '<stop offset="1" stop-color="' + OMA.Themes.mix(t.bg, t.orange, 0.45) + '"/></linearGradient>' +
        '<linearGradient id="wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + OMA.Themes.mix(t.bg, t.orange, 0.35) + '"/>' +
        '<stop offset="1" stop-color="' + t.bgDarker + '"/></linearGradient></defs>';
      s += rect(0, 0, w, hor, 'url(#sk)', 1);
      s += rect(0, hor, w, hgt - hor, 'url(#wt)', 1);
      s += circle(w * 0.66, hor - hgt * 0.09, hgt * 0.07, t.orange, 0.85);
      s += circle(w * 0.66, hor - hgt * 0.09, hgt * 0.14, t.orange, 0.12);
      for (var i = 0; i < 24; i++) {
        var y = hor + Math.pow(i / 24, 1.7) * (hgt - hor), wd = (8 + i * 14) * (0.4 + r() * 0.8);
        s += rect(w * 0.66 - wd / 2, y, wd, 1 + r() * 2, t.orange, Math.max(0, 0.28 - i * 0.009));
      }
      var d = 'M 0 ' + hor;
      [[0.1, 0.09], [0.2, 0.03], [0.34, 0.15], [0.46, 0.05], [0.58, 0.12], [0.74, 0.02], [0.86, 0.08], [1, 0.01]].forEach(function (p) {
        d += ' L ' + (w * p[0]) + ' ' + (hor - hgt * p[1]);
      });
      s += d + ' L ' + w + ' ' + hor + ' L 0 ' + hor + ' Z" fill="' + t.bgDarker + '" opacity="0.92"/>';
      return svgWrap(s, w, hgt);
    },
    'swirl-buck.png': function (t, w, hgt) {
      var s = '', r = seed(53);
      s += bg(t, w, hgt, OMA.Themes.mix(t.bg, t.accent, 0.3), t.bgDarker);
      for (var i = 0; i < 54; i++) {
        var a0 = r() * Math.PI * 2, rad = 30 + r() * Math.min(w, hgt) * 0.5;
        var x1 = w / 2 + Math.cos(a0) * rad, y1 = hgt / 2 + Math.sin(a0) * rad;
        var a1 = a0 + 0.7 + r() * 1.6, x2 = w / 2 + Math.cos(a1) * rad * 1.25, y2 = hgt / 2 + Math.sin(a1) * rad * 1.25;
        s += '<path d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q ' + (w / 2) + ' ' + (hgt / 2) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
          '" stroke="' + [t.accent, t.magenta, t.cyan, t.blue][i % 4] + '" stroke-opacity="' + (0.06 + r() * 0.18).toFixed(2) +
          '" stroke-width="' + (0.6 + r() * 2.4).toFixed(2) + '" fill="none" stroke-linecap="round"/>';
      }
      return svgWrap(s, w, hgt);
    },
    'winding-road.png': function (t, w, hgt) {
      var s = '', vx = w * 0.5, vy = hgt * 0.6;
      s += bg(t, w, hgt, t.bgDarker, OMA.Themes.mix(t.bg, t.accent, 0.2));
      s += circle(vx, vy, hgt * 0.13, t.yellow, 0.14);
      s += circle(vx, vy, hgt * 0.06, t.yellow, 0.2);
      s += '<path d="M ' + (vx - w * 0.6) + ' ' + hgt + ' L ' + vx + ' ' + vy + ' L ' + (vx + w * 0.6) + ' ' + hgt + ' Z" fill="' + t.bgDarker + '" opacity="0.9"/>';
      for (var i = 1; i <= 9; i++) {
        var p = Math.pow(i / 9, 2.1);
        s += rect(vx - (1 + p * 8), vy + (hgt - vy) * p, 2 + p * 16, 2 + p * 12, t.fgLight, 0.2 + p * 0.4);
      }
      s += '<path d="M 0 ' + vy + ' L ' + w * 0.18 + ' ' + (vy - hgt * 0.13) + ' L ' + w * 0.34 + ' ' + vy + ' L ' + w * 0.62 + ' ' + (vy - hgt * 0.17) +
        ' L ' + w * 0.8 + ' ' + (vy - hgt * 0.04) + ' L ' + w + ' ' + (vy - hgt * 0.1) + ' L ' + w + ' ' + vy + ' L 0 ' + vy + ' Z" fill="' + t.bgDarker + '"/>';
      return svgWrap(s, w, hgt);
    },
    'quattro.png': function (t, w, hgt) {
      var s = '', r = seed(7), cols = [t.accent, t.blue, t.magenta, t.cyan];
      s += bg(t, w, hgt, t.bgDarker, t.bg);
      for (var b = 0; b < 4; b++) {
        var y = hgt * (0.3 + b * 0.13), amp = 24 + b * 16, d = 'M -60 ' + y;
        for (var x = -60; x <= w + 60; x += 40) d += ' Q ' + (x + 20) + ' ' + (y + (r() - 0.5) * amp) + ' ' + (x + 40) + ' ' + y;
        d += ' L ' + (w + 60) + ' ' + (y + 60) + ' L -60 ' + (y + 60) + ' Z';
        s += '<path d="' + d + '" fill="' + cols[b] + '" opacity="' + (0.34 - b * 0.05).toFixed(2) + '"/>';
      }
      return svgWrap(s, w, hgt);
    }
  };
  function seed(n) { var s = n >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function rect(x, y, w, h2, fill, op) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h2 + '" fill="' + fill + '" opacity="' + (op == null ? 1 : op) + '"/>'; }
  function circle(cx, cy, r, fill, op) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" opacity="' + (op == null ? 1 : op) + '"/>'; }
  function bg(t, w, hgt, c1, c2) {
    return '<defs><linearGradient id="bgp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + hgt + '" fill="url(#bgp)"/>';
  }
  function svgWrap(inner, w, hgt) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + hgt + '" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' + inner + '</svg>';
  }

  Art.uri = function (name) {
    var gen = PICS[name];
    if (!gen) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(gen(OMA.Themes.current, 1280, 800));
  };
  Art.svgFor = function (name) {
    var gen = PICS[name] || PICS['quattro.png'];
    return gen(OMA.Themes.current, 1280, 800);
  };
  Art.names = function () { return Object.keys(PICS); };
  OMA.Art = Art;

  /* ------------------------------------------------------ seed some images
   * Called by main.js once the virtual filesystem exists — never at load time. */
  Art.seedFiles = function (fs) {
    fs = fs || OMA.FS;
    if (!fs) return;
    Art.names().forEach(function (n) {
      var p = P.join(OMA.Term.HOME(), 'Pictures', n);
      if (!fs.exists(p)) fs.write(p, '<svg-image:' + n + '>');
    });
  };

  /* ============================================================= viewer == */
  OMA.WM.registry.register({
    id: 'viewer', name: 'Image Viewer', icon: 'camera', comment: 'Open a picture from ~/Pictures',
    title: function (arg) { return P.basename(arg || 'Pictures') + ' — Image Viewer'; },
    mount: function (body, win) {
      var name = P.basename(win.props.arg || 'quattro.png');
      var pics = Art.names();
      var idx = Math.max(0, pics.indexOf(name));
      var wrap = h('div.oma-viewer');
      var stage = h('div.oma-viewer-stage');
      var info = h('div.oma-viewer-info');
      var zoom = 1;

      function render() {
        var n = pics[idx];
        clear(stage);
        var img = h('div.oma-viewer-img', { html: Art.svgFor(n) });
        img.style.transform = 'scale(' + zoom + ')';
        stage.appendChild(img);
        info.textContent = n + '   ' + Math.round(zoom * 100) + '%   < > to browse   + / − to zoom';
      }
      wrap.appendChild(stage); wrap.appendChild(info); body.appendChild(wrap);
      render();

      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'ArrowRight') { idx = (idx + 1) % pics.length; zoom = 1; render(); }
        if (e.key === 'ArrowLeft') { idx = (idx - 1 + pics.length) % pics.length; zoom = 1; render(); }
        if (e.key === '+' || e.key === '=') { zoom = Math.min(4, zoom * 1.25); render(); }
        if (e.key === '-') { zoom = Math.max(0.4, zoom / 1.25); render(); }
        if (e.key === '0') { zoom = 1; render(); }
      });
      stage.addEventListener('wheel', function (e) {
        e.preventDefault();
        zoom = Math.max(0.4, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
        render();
      }, { passive: false });
      setTimeout(function () { wrap.focus(); }, 60);
    }
  });

  /* ============================================================== media == */
  OMA.WM.registry.register({
    id: 'media', name: 'Video', icon: 'camera', comment: 'gpu-screen-recorder output and videos',
    title: function (arg) { return P.basename(arg || 'clip') + ' — Video'; },
    mount: function (body, win) {
      var name = P.basename(win.props.arg || 'omarchy-intro.mp4');
      var playing = false, t = 0, dur = 214;
      var wrap = h('div.oma-media');
      var screen = h('div.oma-media-screen');
      var bar = h('div.oma-media-bar');
      var fill = h('div.oma-media-fill');
      var timeEl = h('div.oma-media-time', { text: '0:00 / 3:34' });
      var playBtn = h('button.oma-btn.oma-btn-sm', { text: '▶', onclick: toggle });

      bar.appendChild(fill);
      bar.addEventListener('mousedown', function (e) {
        var r = bar.getBoundingClientRect();
        t = ((e.clientX - r.left) / r.width) * dur;
        paint();
      });
      wrap.appendChild(screen);
      wrap.appendChild(h('div.oma-media-controls', [
        playBtn,
        bar,
        timeEl,
        h('button.oma-btn.oma-btn-sm', { text: '🔊', onclick: function () { OMA.System.setVolume(OMA.System.volume + 5); } })
      ]));
      body.appendChild(wrap);

      function paint() {
        fill.style.width = (t / dur * 100) + '%';
        timeEl.textContent = fmt.dur(t) + ' / ' + fmt.dur(dur);
        var p = t / dur;
        var band = Math.sin(p * 22) * 12 + Math.sin(p * 7) * 8;
        screen.innerHTML = '<div class="oma-media-art" style="background:' +
          'linear-gradient(160deg,' + OMA.Themes.mix(OMA.Themes.current.bg, OMA.Themes.current.accent, 0.3 + p * 0.3) + ',' +
          OMA.Themes.current.bgDarker + ')">' +
          '<div class="oma-media-bars">' + new Array(28).fill(0).map(function (_, i) {
            var hh = 12 + Math.abs(Math.sin((i * 0.7) + p * 9)) * 60 + band;
            return '<i style="height:' + Math.max(4, hh) + 'px;background:' + OMA.Themes.current.accent + '"></i>';
          }).join('') + '</div>' +
          '<div class="oma-media-name">' + name + '</div></div>';
      }
      function toggle() { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; }
      var timer = setInterval(function () {
        if (!playing) return;
        t = Math.min(dur, t + 1);
        if (t >= dur) { playing = false; playBtn.textContent = '▶'; }
        paint();
      }, 1000);
      win._disposers = [function () { clearInterval(timer); }];
      paint();
    },
    onClose: function (win) { (win._disposers || []).forEach(function (d) { try { d(); } catch (e) { } }); }
  });

  /* ============================================================== agent == */
  OMA.WM.registry.register({
    id: 'agent', name: 'Agent', icon: 'agent', comment: 'Coding agent manager (Herdr)',
    title: function (arg) { return 'agent — ' + (arg || OMA.System.defaults.agent); },
    mount: function (body, win) {
      var name = win.props.arg || OMA.System.defaults.agent;
      var wrap = h('div.oma-agent');
      var log = h('div.oma-agent-log');
      var input = h('input.oma-agent-input', { placeholder: 'Describe a change…', spellcheck: 'false' });
      wrap.appendChild(h('div.oma-agent-head', [
        h('div.oma-agent-avatar', { html: I.agent }),
        h('div', [h('div.oma-agent-name', { text: name }), h('div.oma-agent-sub', { text: 'running in ' + OMA.Term.HOME() + '/Projects/omarchy-web · channel ' + OMA.System.channel })])
      ]));
      wrap.appendChild(log);
      wrap.appendChild(h('div.oma-agent-inputrow', [h('span.oma-agent-caret', { text: '❯' }), input]));
      body.appendChild(wrap);

      function say(who, text) {
        log.appendChild(h('div.oma-agent-msg.' + who, [
          h('div.oma-agent-who', { text: who === 'me' ? (OMA.Store.get('user') || 'oma') : name }),
          h('div.oma-agent-text', { text: text })
        ]));
        log.scrollTop = log.scrollHeight;
      }
      say('bot', 'Ready. I have the repo indexed. Ask me to change the compositor, a theme or an app.');
      say('me', 'add scrolling layout to the workspace cycle');
      say('bot', 'Done: WM.cycleLayout now walks dwindle > scrolling > floating, and Super + L reports the new layout through the OSD. 3 files changed.');
      say('me', 'check that every theme defines bright_foreground');
      say('bot', 'All 23 palettes define bright_foreground. tokyo-night > #c0caf5, catppuccin > #cdd6f4, vantablack > #ffffff.');

      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key !== 'Enter' || !input.value.trim()) return;
        var v = input.value; input.value = '';
        say('me', v);
        setTimeout(function () {
          var replies = [
            'Working on it. I will keep changes inside src/ and run the build after.',
            'Done. I touched ' + (1 + Math.floor(Math.random() * 3)) + ' file(s) and verified the theme still applies cleanly.',
            'That is outside this clone\'s scope — on real Omarchy I would run `omarchy update` and check the migration first.',
            'Added. The Omarchy menu picks it up automatically because menu entries are data, not code.'
          ];
          say('bot', replies[Math.floor(Math.random() * replies.length)]);
        }, 500);
      });
      setTimeout(function () { input.focus(); }, 80);
    }
  });

  /* =============================================================== calc == */
  OMA.WM.registry.register({
    id: 'calc', name: 'Calculator', icon: 'calc', comment: 'Super + Ctrl + Q',
    floating: true, floatW: 300, floatH: 400, single: true,
    title: function () { return 'Calculator'; },
    mount: function (body, win) {
      var wrap = h('div.oma-calc');
      var out = h('div.oma-calc-out', { text: '0' });
      var expr = h('div.oma-calc-expr', { text: '' });
      wrap.appendChild(expr); wrap.appendChild(out);
      var keys = [['C', '±', '%', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['0', '.', '⌫', '=']];
      var acc = '', cur = '0';
      function paint() { out.textContent = cur; expr.textContent = acc; }
      function press(k) {
        if (/[0-9.]/.test(k)) { cur = cur === '0' && k !== '.' ? k : cur + k; }
        else if (k === 'C') { acc = ''; cur = '0'; }
        else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
        else if (k === '±') { cur = cur[0] === '-' ? cur.slice(1) : '-' + cur; }
        else if (k === '%') { cur = String(parseFloat(cur) / 100); }
        else if (k === '=') {
          try {
            var e = (acc + cur).replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
            /* eslint-disable no-new-func */
            var v = Function('"use strict";return (' + e + ')')();
            acc = ''; cur = String(Math.round(v * 1e10) / 1e10);
          } catch (err) { cur = 'error'; }
        } else { /* operator */
          acc = (acc && /[÷×−+]$/.test(acc)) ? acc.slice(0, -1) + k : acc + cur + k;
          cur = '0';
        }
        paint();
      }
      var pad = h('div.oma-calc-pad');
      keys.forEach(function (row) {
        row.forEach(function (k) {
          pad.appendChild(h('button.oma-calc-key' + (/[÷×−+=]/.test(k) ? '.is-op' : (/[0-9.]/.test(k) ? '' : '.is-fn')), {
            text: k, onclick: function () { press(k); }
          }));
        });
      });
      wrap.appendChild(pad);
      body.appendChild(wrap);
      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (e) {
        e.preventDefault(); e.stopPropagation();
        var map = { '/': '÷', '*': '×', '-': '−', '+': '+', 'Enter': '=', 'Backspace': '⌫', 'Escape': 'C' };
        if (/^[0-9.]$/.test(e.key)) press(e.key);
        else if (map[e.key]) press(map[e.key]);
      });
      setTimeout(function () { wrap.focus(); }, 60);
    }
  });

  /* =============================================================== game == */
  OMA.WM.registry.register({
    id: 'game', name: '2048', icon: 'activity', comment: 'A tiling-compositor demo in a floating window',
    floating: true, floatW: 360, floatH: 440, single: true,
    title: function () { return '2048'; },
    mount: function (body, win) {
      var N = 4, grid, score = 0, best = OMA.Store.get('best2048') || 0;
      var wrap = h('div.oma-game');
      var head = h('div.oma-game-head');
      var board = h('div.oma-game-board');
      wrap.appendChild(head); wrap.appendChild(board); body.appendChild(wrap);

      function reset() {
        grid = [];
        for (var i = 0; i < N; i++) grid.push(new Array(N).fill(0));
        score = 0; add(); add(); paint();
      }
      function add() {
        var free = [];
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (!grid[y][x]) free.push([x, y]);
        if (!free.length) return;
        var c = free[Math.floor(Math.random() * free.length)];
        grid[c[1]][c[0]] = Math.random() < 0.9 ? 2 : 4;
      }
      function slide(row) {
        var r = row.filter(function (v) { return v; });
        for (var i = 0; i < r.length - 1; i++) {
          if (r[i] === r[i + 1]) { r[i] *= 2; score += r[i]; r.splice(i + 1, 1); }
        }
        while (r.length < N) r.push(0);
        return r;
      }
      function move(dir) {
        var before = JSON.stringify(grid);
        for (var i = 0; i < N; i++) {
          var line = [];
          for (var j = 0; j < N; j++) {
            line.push(dir === 'l' || dir === 'r' ? grid[i][j] : grid[j][i]);
          }
          if (dir === 'r' || dir === 'd') line.reverse();
          line = slide(line);
          if (dir === 'r' || dir === 'd') line.reverse();
          for (var j2 = 0; j2 < N; j2++) {
            if (dir === 'l' || dir === 'r') grid[i][j2] = line[j2];
            else grid[j2][i] = line[j2];
          }
        }
        if (JSON.stringify(grid) !== before) { add(); paint(); }
      }
      function paint() {
        clear(head);
        head.appendChild(h('div.oma-game-score', { html: '<b>' + score + '</b><span>score</span>' }));
        head.appendChild(h('div.oma-game-score', { html: '<b>' + best + '</b><span>best</span>' }));
        head.appendChild(h('button.oma-btn.oma-btn-sm', { text: 'New', onclick: reset }));
        clear(board);
        var t = OMA.Themes.current;
        var palette = [null, t.muted, t.blue, t.cyan, t.green, t.yellow, t.orange, t.red, t.magenta];
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          var v = grid[y][x];
          var lvl = v ? Math.min(palette.length - 1, Math.log2(v)) : 0;
          var bgc = v ? palette[lvl] : t.bgLight;
          board.appendChild(h('div.oma-game-cell' + (v ? '.is-set' : ''), {
            text: v ? String(v) : '',
            style: { background: bgc, color: v && lvl > 3 ? t.bgDarker : t.fg }
          }));
        }
        if (score > best) { best = score; OMA.Store.set('best2048', best); }
      }
      reset();
      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (e) {
        var m = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', h: 'l', l: 'r', k: 'u', j: 'd' }[e.key];
        if (!m) return;
        e.preventDefault(); e.stopPropagation();
        move(m);
      });
      setTimeout(function () { wrap.focus(); }, 80);
    }
  });
})(window.OMA = window.OMA || {});
