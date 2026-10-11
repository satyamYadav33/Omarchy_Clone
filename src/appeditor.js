/* ============================================================================
 * Omarchy Web Clone — appeditor.js
 * ----------------------------------------------------------------------------
 * Neovim + LazyVim: modal editing, a dashboard, a statusline, live Lua/JS/Ruby
 * syntax highlighting and a working file tree. Edits persist to the VFS.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, P = OMA.fsPaths, getFS = function () { return OMA.FS; };

  var KEYWORDS = {
    lua: ['local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'for', 'while', 'do', 'return', 'require', 'and', 'or', 'not', 'nil', 'true', 'false', 'in', 'break'],
    js: ['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'typeof', 'this', 'class', 'extends', 'import', 'export', 'default', 'null', 'undefined', 'true', 'false', 'try', 'catch', 'throw', 'switch', 'case', 'break', 'continue'],
    ruby: ['def', 'end', 'class', 'module', 'do', 'if', 'else', 'elsif', 'unless', 'while', 'return', 'require', 'attr_accessor', 'true', 'false', 'nil', 'yield', 'begin', 'rescue'],
    go: ['package', 'import', 'func', 'return', 'if', 'else', 'for', 'range', 'var', 'const', 'type', 'struct', 'interface', 'go', 'defer', 'nil', 'true', 'false'],
    json: ['true', 'false', 'null'],
    md: [],
    toml: ['true', 'false'],
    sh: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'export', 'alias', 'echo', 'case', 'esac', 'function']
  };

  function langOf(path) {
    var ext = (path || '').split('.').pop().toLowerCase();
    if (ext === 'lua') return 'lua';
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'js';
    if (ext === 'rb') return 'ruby';
    if (ext === 'go') return 'go';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'md';
    if (ext === 'toml' || ext === 'ini') return 'toml';
    if (ext === 'sh' || ext === 'bash') return 'sh';
    return 'txt';
  }

  /* Tiny highlighter: enough to look right, not a parser. */
  function highlight(line, lang) {
    var esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (lang === 'md') {
      if (/^#{1,6}\s/.test(line)) return '<span class="s-h1">' + esc + '</span>';
      if (/^\s*[-*]\s/.test(line)) return esc.replace(/^(\s*[-*])/, '<span class="s-bullet">$1</span>');
      return esc.replace(/(`[^`]+`)/g, '<span class="s-str">$1</span>');
    }
    /* comments first so their contents are not re-highlighted */
    var commentIdx = -1;
    var commentTok = (lang === 'lua' || lang === 'sh') ? '--' : (lang === 'toml' || lang === 'json' ? null : '#');
    if (commentTok) { var ci = esc.indexOf(commentTok); if (ci >= 0) commentIdx = ci; }
    if (lang === 'js' || lang === 'go') { var ci2 = esc.indexOf('//'); if (ci2 >= 0) commentIdx = commentIdx < 0 ? ci2 : Math.min(commentIdx, ci2); }

    var code = commentIdx >= 0 ? esc.slice(0, commentIdx) : esc;
    var comment = commentIdx >= 0 ? esc.slice(commentIdx) : '';

    code = code
      .replace(/(&quot;|")[^"]*?(\1)/g, '<span class="s-str">$1$2</span>')
      .replace(/'[^']*'/g, '<span class="s-str">$&#39;$&</span>');

    var kws = KEYWORDS[lang] || [];
    kws.forEach(function (k) {
      code = code.replace(new RegExp('\\b(' + k + ')\\b', 'g'), '<span class="s-kw">$1</span>');
    });
    code = code.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="s-num">$1</span>');
    code = code.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, '<span class="s-fn">$1</span>(');
    if (comment) comment = '<span class="s-com">' + comment + '</span>';
    return code + comment;
  }

  OMA.WM.registry.register({
    id: 'editor', name: 'Neovim', icon: 'edit', comment: 'LazyVim — the Omarchy default editor',
    title: function (arg) { return arg ? P.basename(arg) + ' — nvim' : 'nvim — LazyVim'; },

    mount: function (body, win) {
      var wrap = h('div.oma-nvim');
      var tabsEl = h('div.oma-nvim-tabs');
      var gutter = h('div.oma-nvim-gutter');
      var codeEl = h('div.oma-nvim-code');
      var statusEl = h('div.oma-nvim-status');
      var cmdEl = h('div.oma-nvim-cmdline');
      var treeEl = h('div.oma-nvim-tree');
      var editorPane = h('div.oma-nvim-pane', [h('div.oma-nvim-scroll', [gutter, codeEl])]);
      wrap.appendChild(h('div.oma-nvim-body', [treeEl, editorPane]));
      wrap.appendChild(tabsEl);
      wrap.appendChild(statusEl);
      wrap.appendChild(cmdEl);
      body.appendChild(wrap);

      var state = {
        tabs: [],
        active: 0,
        mode: 'n',
        pending: '',
        command: '',
        sidebar: true,
        dirty: {},
        treeCwd: OMA.Term.HOME() + '/Projects'
      };

      function openFile(path) {
        path = path || (OMA.Term.HOME() + '/Documents/omarchy-notes.md');
        if (!getFS().exists(path)) { getFS().write(path, ''); }
        var existing = state.tabs.findIndex(function (t) { return t.path === path; });
        if (existing >= 0) { state.active = existing; render(); return; }
        state.tabs.push({ path: path, content: getFS().read(path) || '', cursor: 0, col: 0, scroll: 0 });
        state.active = state.tabs.length - 1;
        render();
      }

      function active() { return state.tabs[state.active]; }

      function save() {
        var t = active(); if (!t) return;
        getFS().write(t.path, t.content.endsWith('\n') ? t.content : t.content + '\n');
        delete state.dirty[t.path];
        flash('written: ' + t.path);
      }

      function flash(msg) {
        cmdEl.textContent = msg;
        cmdEl.classList.add('is-msg');
        setTimeout(function () { cmdEl.classList.remove('is-msg'); renderCmd(); }, 1800);
      }

      function renderTree() {
        clear(treeEl);
        treeEl.appendChild(h('div.oma-nvim-treeroot', { text: P.basename(state.treeCwd) + '/' }));
        var items = getFS().list(state.treeCwd);
        items.slice(0, 40).forEach(function (n) {
          treeEl.appendChild(h('div.oma-nvim-treenode' + (n.type === 'dir' ? '.is-dir' : ''), {
            text: (n.type === 'dir' ? '├ ' : '  ') + n.name,
            onclick: function () {
              var full = P.join(state.treeCwd, n.name);
              if (n.type === 'dir') { state.treeCwd = full; renderTree(); }
              else openFile(full);
            }
          }));
        });
      }

      function renderTabs() {
        clear(tabsEl);
        state.tabs.forEach(function (t, i) {
          tabsEl.appendChild(h('div.oma-nvim-tab' + (i === state.active ? '.is-active' : ''), {
            text: P.basename(t.path) + (state.dirty[t.path] ? ' •' : ''),
            onclick: function () { state.active = i; render(); }
          }));
        });
      }

      function renderStatus() {
        var t = active();
        var modeLabel = { n: 'NORMAL', i: 'INSERT', v: 'VISUAL', ':': 'COMMAND' }[state.mode] || 'NORMAL';
        clear(statusEl);
        statusEl.appendChild(h('div.oma-nvim-mode.mode-' + state.mode, { text: modeLabel }));
        statusEl.appendChild(h('div.oma-nvim-file', { text: t ? P.basename(t.path) : '[No Name]' }));
        statusEl.appendChild(h('div.oma-nvim-meta', { text: (t ? t.content.split('\n').length : 0) + 'L  ' + (t ? t.content.length : 0) + 'B  utf-8  ' + langOf(t && t.path) }));
        statusEl.appendChild(h('div.oma-nvim-meta', { text: t ? (t.cursor + 1) + ':' + (t.col + 1) : '0:0' }));
        statusEl.appendChild(h('div.oma-nvim-meta', { text: state.sidebar ? 'sidebar' : '' }));
      }

      function renderCmd() {
        if (cmdEl.classList.contains('is-msg')) return;
        if (state.mode === ':') cmdEl.textContent = ':' + state.command;
        else if (state.pending) cmdEl.textContent = state.pending;
        else cmdEl.textContent = '';
      }

      function render() {
        var t = active();
        treeEl.style.display = state.sidebar ? '' : 'none';
        renderTabs(); renderStatus(); renderCmd(); renderTree();
        clear(gutter); clear(codeEl);
        if (state.tabs.length === 0) {
          renderDashboard();
          return;
        }
        var lines = t.content.split('\n');
        lines.forEach(function (ln, i) {
          var num = h('div.oma-nvim-ln' + (i === t.cursor ? '.is-cur' : ''), { text: String(i + 1).padStart(3) });
          num.onclick = function () { t.cursor = i; render(); };
          gutter.appendChild(num);
          var isCur = i === t.cursor && state.mode !== 'n';
          var row = h('div.oma-nvim-row' + (i === t.cursor ? '.is-cur' : ''), {
            html: highlight(ln, langOf(t.path)) || '&nbsp;'
          });
          row.onclick = function () { t.cursor = i; if (state.mode === 'n') { state.mode = 'i'; } render(); };
          codeEl.appendChild(row);
        });
        var curRow = OMA.$$('.oma-nvim-row', codeEl)[t.cursor];
        if (curRow && curRow.scrollIntoView) curRow.scrollIntoView({ block: 'nearest' });
        wrap.focus();
      }

      function renderDashboard() {
        var art = [
          '        ▄▄▄▄▄▄▄        ',
          '    ▄▄█████████████▄▄    ',
          '  ▄████▀         ▀████▄  ',
          ' ████▀   ▄▄▄▄▄▄▄   ▀████ ',
          ' ███    █████████    ███ ',
          ' ████▄   ▀▀▀▀▀▀▀   ▄████ ',
          '  ▀████▄         ▄████▀  ',
          '    ▀▀█████████████▀▀    ',
          '        ▀▀▀▀▀▀▀        '
        ];
        var d = h('div.oma-nvim-dash');
        d.appendChild(h('pre.oma-nvim-logo', { text: art.join('\n') }));
        d.appendChild(h('div.oma-nvim-dashtitle', { text: 'Omarchy · LazyVim' }));
        var keys = [
          ['SPC SPC', 'find a file'], ['SPC E', 'toggle sidebar'], ['SPC G G', 'lazygit'],
          ['SPC S G', 'search contents'], ['SPC B D', 'close buffer'], ['?', 'all keymaps']
        ];
        var rows = h('div.oma-nvim-dashkeys');
        keys.forEach(function (k) {
          rows.appendChild(h('div.oma-nvim-dashrow', [
            h('span.oma-key', { text: k[0] }), h('span', { text: k[1] })
          ]));
        });
        d.appendChild(rows);
        d.appendChild(h('div.oma-nvim-dashtip', { text: 'Press Enter to open ~/Documents/omarchy-notes.md' }));
        d.appendChild(h('div.oma-nvim-dashfiles', { text: getFS().glob(OMA.Term.HOME() + '/Projects/**/*.{lua,js,go,rb,toml,md}').slice(0, 8).map(function (p) { return '  ' + p.replace(OMA.Term.HOME(), '~'); }).join('\n') }));
        codeEl.appendChild(d);
        var openBtn = h('button.oma-btn', { text: 'Open notes', onclick: function () { openFile(OMA.Term.HOME() + '/Documents/omarchy-notes.md'); } });
        d.appendChild(openBtn);
        wrap.focus();
      }

      /* ---------------------------------------------------------- keymaps */
      function key(e) {
        var t = active();
        var k = e.key;

        if (state.mode === ':') {
          if (k === 'Enter') {
            var c = state.command.trim();
            state.command = ''; state.mode = 'n';
            runEx(c);
          } else if (k === 'Escape') { state.mode = 'n'; state.command = ''; }
          else if (k === 'Backspace') state.command = state.command.slice(0, -1);
          else if (k.length === 1) state.command += k;
          renderCmd();
          return true;
        }

        if (state.pending === ' ') {
          state.pending = '';
          if (k === 'e') { state.sidebar = !state.sidebar; render(); }
          else if (k === 'b') { state.pending = ' b'; }
          else if (k === 'g') { state.pending = ' g'; }
          else if (k === 's') { state.pending = ' s'; }
          else if (k === 'w') { save(); }
          return true;
        }
        if (state.pending === ' b') {
          state.pending = '';
          if (k === 'd') { state.tabs.splice(state.active, 1); state.active = Math.max(0, state.active - 1); render(); }
          return true;
        }
        if (state.pending === ' g') {
          state.pending = '';
          if (k === 'g') OMA.WM.open('lazygit', t && t.path ? P.dirname(t.path) : OMA.Term.HOME());
          return true;
        }
        if (state.pending === ' s') {
          state.pending = '';
          if (k === 'g') { flash('grep: use the terminal — `grep -r pattern`'); }
          return true;
        }

        if (state.mode === 'i') {
          if (k === 'Escape') { state.mode = 'n'; render(); return true; }
          if (k === 'Enter') { insertText('\n'); return true; }
          if (k === 'Backspace') {
            if (t) {
              var before = t.content.slice(0, pos(t)), after = t.content.slice(pos(t));
              if (before.length) {
                before = before.slice(0, -1);
                t.content = before + after;
                t.cursor = before.split('\n').length - 1;
                t.col = before.split('\n').pop().length;
                state.dirty[t.path] = true;
              }
              render();
            }
            return true;
          }
          if (k === 'Tab') { insertText('  '); return true; }
          if (k.length === 1) { insertText(k); return true; }
          return true;
        }

        /* NORMAL */
        if (!t && k !== ':' && k !== '/' && k !== 'i') {
          if (k === 'Enter') { openFile(OMA.Term.HOME() + '/Documents/omarchy-notes.md'); return true; }
          return true;
        }
        switch (k) {
          case 'i': state.mode = 'i'; render(); break;
          case 'a': state.mode = 'i'; moveCol(1); render(); break;
          case 'o': insertLineBelow(); break;
          case 'O': insertLineAbove(); break;
          case 'v': state.mode = 'v'; render(); break;
          case 'h': moveCol(-1); break;
          case 'l': moveCol(1); break;
          case 'j': moveLine(1); break;
          case 'k': moveLine(-1); break;
          case 'w': state.pending = ' '; break;
          case 'g': state.pending = ' '; break;
          case 'G': t.cursor = t.content.split('\n').length - 1; render(); break;
          case '0': t.col = 0; render(); break;
          case '$': t.col = t.content.split('\n')[t.cursor].length; render(); break;
          case 'd': state.pending = 'dd'; break;
          case 'x': deleteChar(); break;
          case ':': state.mode = ':'; state.command = ''; render(); break;
          case '/': flash('/ search: use SPC S G for project grep'); break;
          case 'u': flash('undo: this buffer keeps no undo history'); break;
          case 'H': state.active = Math.max(0, state.active - 1); render(); break;
          case 'L': state.active = Math.min(state.tabs.length - 1, state.active + 1); render(); break;
          case ' ': state.pending = ' '; break;
          default: break;
        }
        if (state.pending === 'dd') {
          state.pending = '';
          var ls = t.content.split('\n');
          ls.splice(t.cursor, 1);
          t.content = ls.join('\n');
          t.cursor = Math.max(0, t.cursor - 1);
          state.dirty[t.path] = true;
          render();
        }
        return true;
      }

      function pos(t) {
        var ls = t.content.split('\n');
        var n = 0;
        for (var i = 0; i < t.cursor; i++) n += ls[i].length + 1;
        return n + Math.min(t.col, ls[t.cursor].length);
      }
      function insertText(s) {
        var t = active(); if (!t) return;
        var p = pos(t);
        t.content = t.content.slice(0, p) + s + t.content.slice(p);
        state.dirty[t.path] = true;
        if (s === '\n') { t.cursor++; t.col = 0; }
        else t.col += s.length;
        render();
      }
      function insertLineBelow() {
        var t = active(); if (!t) return;
        var ls = t.content.split('\n');
        ls.splice(t.cursor + 1, 0, '');
        t.content = ls.join('\n'); t.cursor++; t.col = 0;
        state.mode = 'i'; state.dirty[t.path] = true; render();
      }
      function insertLineAbove() {
        var t = active(); if (!t) return;
        var ls = t.content.split('\n');
        ls.splice(t.cursor, 0, '');
        t.content = ls.join('\n'); t.col = 0;
        state.mode = 'i'; state.dirty[t.path] = true; render();
      }
      function deleteChar() {
        var t = active(); if (!t) return;
        var p = pos(t);
        t.content = t.content.slice(0, p) + t.content.slice(p + 1);
        state.dirty[t.path] = true; render();
      }
      function moveLine(d) {
        var t = active(); if (!t) return;
        t.cursor = Math.max(0, Math.min(t.content.split('\n').length - 1, t.cursor + d));
        render();
      }
      function moveCol(d) {
        var t = active(); if (!t) return;
        var line = t.content.split('\n')[t.cursor] || '';
        t.col = Math.max(0, Math.min(line.length, t.col + d));
        render();
      }
      function runEx(c) {
        if (c === 'w' || c === 'write') save();
        else if (c === 'q' || c === 'quit') { state.tabs.splice(state.active, 1); state.active = Math.max(0, state.active - 1); render(); }
        else if (c === 'wq' || c === 'x') { save(); state.tabs.splice(state.active, 1); state.active = Math.max(0, state.active - 1); render(); }
        else if (/^e\s+/.test(c)) openFile(OMA.fsPaths.norm(c.replace(/^e\s+/, '').replace('~', OMA.Term.HOME())));
        else if (/^\d+$/.test(c)) { var t = active(); if (t) { t.cursor = Math.min(parseInt(c, 10) - 1, t.content.split('\n').length - 1); render(); } }
        else if (c === 'Theme' || c === 'theme') { var names = OMA.Themes.list.map(function (x) { return x.name; }); OMA.Shell.osd({ icon: 'edit', label: 'Themes', value: names.length + ' available' }); }
        else flash('E492: Not an editor command: ' + c);
      }

      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (e) {
        e.preventDefault(); e.stopPropagation();
        key(e);
      });
      body.addEventListener('mousedown', function () { wrap.focus(); });

      openFile(win.props.arg || null);
      win.nvim = { openFile: openFile, save: save, state: state };
      setTimeout(function () { wrap.focus(); }, 90);
    },

    onReopen: function (win, arg) {
      if (win.nvim && arg) win.nvim.openFile(arg);
    }
  });
})(window.OMA = window.OMA || {});
