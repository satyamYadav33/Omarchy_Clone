/* ============================================================================
 * Omarchy Web Clone — appnet.js
 * ----------------------------------------------------------------------------
 * Chromium (Omarchy's default browser, Super + Shift + Return) plus the framed
 * web apps (Super + Shift + A/X/Y/O/G/E/C …).
 *
 * Honesty note: a browser inside a browser cannot always load a real site —
 * most big sites send X-Frame-Options / frame-ancestors and refuse to be
 * embedded. So this does the real thing where it is permitted (Wikipedia,
 * example.com, small static sites) and otherwise renders an Omarchy-themed
 * preview page, clearly badged, rather than pretending.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, I = OMA.Shell.icons;

  /* Sites that genuinely allow being framed in a browser. */
  var EMBEDDABLE = [/^https?:\/\/([\w-]+\.)?wikipedia\.org/, /^https?:\/\/(www\.)?example\.com/, /^https?:\/\/omarchy\.org/, /^https?:\/\/wiki\.archlinux\.org/, /^https?:\/\/developer\.mozilla\.org/];

  var BOOKMARKS = [
    { title: 'Omarchy', url: 'https://omarchy.org' },
    { title: 'Manual', url: 'omarchy://manual' },
    { title: 'Arch Wiki', url: 'https://wiki.archlinux.org' },
    { title: 'Hyprland', url: 'https://wiki.hypr.land' },
    { title: 'LazyVim', url: 'https://lazyvim.org' },
    { title: 'Themes', url: 'omarchy://themes' },
    { title: 'Keybindings', url: 'omarchy://keys' }
  ];

  var SEARCH = 'https://duckduckgo.com/?q=';

  function normalize(input) {
    if (!input) return 'omarchy://home';
    input = String(input).trim();
    if (/^omarchy:\/\//.test(input)) return input;
    if (/^https?:\/\//.test(input)) return input;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(input)) return 'https://' + input;
    return SEARCH + encodeURIComponent(input);
  }

  function prettify(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  /* ------------------------------------------------------- internal pages */
  function internalPage(url) {
    var t = OMA.Themes.current;
    if (url === 'omarchy://home') return homePage(t);
    if (url === 'omarchy://manual') return [OMA.ManualText()];
    if (url === 'omarchy://keys') {
      var wrap = h('div.oma-page');
      OMA.Keys.groups().forEach(function (g) {
        wrap.appendChild(h('h2', { text: g.title }));
        var tbl = h('table.oma-page-table');
        g.binds.forEach(function (b) {
          tbl.appendChild(h('tr', [
            h('td', b.keys.map(function (k) { return h('span.oma-key', { text: k }); })),
            h('td', { text: b.desc })
          ]));
        });
        wrap.appendChild(tbl);
      });
      return [wrap];
    }
    if (url === 'omarchy://themes') {
      var w2 = h('div.oma-page');
      w2.appendChild(h('h1', { text: 'Themes' }));
      w2.appendChild(h('p', { text: 'Omarchy ships 23 themes. Selecting one restyles the desktop, terminal, Neovim, Chromium, and the whole shell — bar, menu, notifications, OSD and lock screen.' }));
      var grid = h('div.oma-theme-grid');
      OMA.Themes.list.forEach(function (th) {
        var card = h('div.oma-theme-card' + (th.id === OMA.System.themeId ? '.is-active' : ''), {
          onclick: function () { OMA.System.setTheme(th.id); refreshAll(); }
        });
        card.appendChild(h('div.oma-theme-swatch', {
          html: [th.bg, th.bgDark, th.accent, th.fg, th.red, th.green, th.blue, th.magenta].map(function (c) {
            return '<i style="background:' + c + '"></i>';
          }).join('')
        }));
        card.appendChild(h('div.oma-theme-name', { text: th.name }));
        card.appendChild(h('div.oma-theme-mode', { text: th.mode + ' · ' + th.accent }));
        grid.appendChild(card);
      });
      w2.appendChild(grid);
      return [w2];
    }
    if (url.indexOf('omarchy://about') === 0) {
      return [h('div.oma-page', [h('h1', { text: 'Omarchy 4.0.4 (Quattro)' }),
        h('p', { text: 'An omakase Linux distribution based on Arch, Hyprland and the desktop construction-kit Quickshell. Beautiful, fun & agentic Linux by DHH — the malleable OS for the age of agents.' })])];
    }
    return null;
  }

  function homePage(t) {
    var page = h('div.oma-page.oma-page-home');
    page.appendChild(h('div.oma-home-logo', { html: OMA.Art.mark(96) }));
    page.appendChild(h('h1.oma-home-title', { text: 'Omarchy' }));
    page.appendChild(h('p.oma-home-sub', { text: 'Beautiful, fun & agentic Linux — the malleable OS for the age of agents.' }));
    var search = h('input.oma-home-search', { placeholder: 'Search the web — or type a URL', spellcheck: 'false' });
    search.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') OMA.bus.emit('browser:navigate', normalize(search.value));
    });
    page.appendChild(search);
    var tiles = h('div.oma-home-tiles');
    BOOKMARKS.concat([
      { title: 'GitHub', url: 'https://github.com/basecamp/omarchy' },
      { title: 'Rails', url: 'https://rubyonrails.org' },
      { title: 'MDN', url: 'https://developer.mozilla.org' }
    ]).forEach(function (b) {
      tiles.appendChild(h('div.oma-home-tile', {
        text: b.title, onclick: function () { OMA.bus.emit('browser:navigate', b.url); }
      }));
    });
    page.appendChild(tiles);
    page.appendChild(h('div.oma-home-note', { text: 'Theme: ' + t.name + ' — try Style > Theme in the Omarchy menu (Super + Space), or Super + Ctrl + Shift + Space.' }));
    return [page];
  }

  /* --------------------------------------------------- browser app -------- */
  OMA.WM.registry.register({
    id: 'browser', name: 'Chromium', icon: 'browser', comment: 'Chromium — the Omarchy default browser',
    title: function (arg) { return (arg ? prettify(arg) : 'New Tab') + ' — Chromium'; },

    mount: function (body, win) {
      var tabs = [{ url: normalize(win.props.arg || 'omarchy://home'), title: 'New Tab' }];
      var active = 0;

      var wrap = h('div.oma-browser');
      var tabBar = h('div.oma-browser-tabs');
      var addr = h('input.oma-browser-addr', { spellcheck: 'false' });
      var view = h('div.oma-browser-view');
      var status = h('div.oma-browser-status');

      function nav(d) {
        var t = tabs[active];
        t.hist = t.hist || [t.url];
        if (d < 0 && t.hist.length > 1) { t.hist.pop(); t.url = t.hist[t.hist.length - 1]; render(); }
        else if (d > 0 && t.fwd && t.fwd.length) { t.url = t.fwd.pop(); t.hist.push(t.url); render(); }
      }

      function newTab(url) {
        tabs.push({ url: normalize(url || 'omarchy://home'), title: 'New Tab', hist: [normalize(url || 'omarchy://home')], fwd: [] });
        active = tabs.length - 1;
        render();
      }
      function closeTab(i) {
        tabs.splice(i, 1);
        if (!tabs.length) newTab('omarchy://home');
        active = Math.min(active, tabs.length - 1);
        render();
      }

      var toolbar = h('div.oma-browser-toolbar', [
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '<', title: 'Back', onclick: function () { nav(-1); } }),
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '>', title: 'Forward', onclick: function () { nav(1); } }),
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '⟳', title: 'Reload', onclick: function () { render(); } }),
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '⌂', title: 'Home', onclick: function () { go('omarchy://home'); } }),
        addr,
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '＋', title: 'New tab', onclick: function () { newTab(); } }),
        h('button.oma-btn.oma-btn-sm.oma-browser-btn', { text: '☰', title: 'Menu', onclick: function () { OMA.Menu.open('all', 'style'); } })
      ]);
      var bookmarks = h('div.oma-browser-bookmarks');
      BOOKMARKS.forEach(function (b) {
        bookmarks.appendChild(h('div.oma-bookmark', { text: b.title, onclick: function () { go(b.url); } }));
      });

      wrap.appendChild(tabBar);
      wrap.appendChild(toolbar);
      wrap.appendChild(bookmarks);
      wrap.appendChild(view);
      wrap.appendChild(status);
      body.appendChild(wrap);

      function go(url) {
        var t = tabs[active];
        t.hist = t.hist || [t.url];
        t.url = normalize(url);
        t.hist.push(t.url);
        render();
      }

      function renderTabs() {
        clear(tabBar);
        tabs.forEach(function (t, i) {
          tabBar.appendChild(h('div.oma-browser-tab' + (i === active ? '.is-active' : ''), {
            onclick: function () { active = i; render(); }
          }, [
            h('span.oma-browser-tabtitle', { text: t.title || prettify(t.url) }),
            h('span.oma-browser-tabclose', { text: '×', onclick: function (e) { e.stopPropagation(); closeTab(i); } })
          ]));
        });
        tabBar.appendChild(h('div.oma-browser-newtab', { text: '＋', onclick: function () { newTab(); } }));
      }

      function render() {
        var t = tabs[active];
        renderTabs();
        addr.value = t.url;
        clear(view);
        var internal = internalPage(t.url);
        var theme = OMA.Themes.current;

        if (internal) {
          t.title = t.url.replace('omarchy://', '') === 'home' ? 'New Tab' : OMA.fmt.title(t.url.replace('omarchy://', ''));
          t.title = t.url === 'omarchy://home' ? 'New Tab' : t.title;
          var page = h('div.oma-browser-page.oma-browser-internal');
          internal.forEach(function (n) { page.appendChild(n); });
          view.appendChild(page);
          status.textContent = 'omarchy:// · ' + theme.name;
          renderTabs();
          return;
        }

        var canEmbed = EMBEDDABLE.some(function (re) { return re.test(t.url); });
        if (canEmbed) {
          var frame = h('iframe.oma-browser-frame', { src: t.url, sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', referrerpolicy: 'no-referrer' });
          var loaded = false;
          frame.addEventListener('load', function () { loaded = true; status.textContent = 'loaded · ' + prettify(t.url); });
          view.appendChild(h('div.oma-browser-page', [frame]));
          status.textContent = 'loading ' + prettify(t.url) + ' …';
          /* if it never fires, fall back to a preview */
          setTimeout(function () {
            if (!loaded && view.parentNode) { showPreview(t); }
          }, 2500);
          t.title = prettify(t.url);
        } else {
          showPreview(t);
        }
        renderTabs();
      }

      function showPreview(t) {
        clear(view);
        var host = t.url.replace(/^https?:\/\//, '').split('/')[0];
        var known = {
          'youtube.com': ['YouTube', 'Video streaming web app — framed with Super + Shift + Y.'],
          'www.youtube.com': ['YouTube', 'Video streaming web app — framed with Super + Shift + Y.'],
          'x.com': ['X', 'Timeline web app — framed with Super + Shift + X. Compose opens with Super + Shift + Alt + X.'],
          'chatgpt.com': ['ChatGPT', 'The AI web app Omarchy frames with Super + Shift + A.'],
          'github.com': ['GitHub', 'basecamp/omarchy — source of the distribution this clone reproduces.'],
          'rubyonrails.org': ['Ruby on Rails', 'One-click via Install > Development > Ruby on Rails (mise + Rails 8.1).'],
          'duckduckgo.com': ['Search', 'Search results are not available offline in this clone.']
        };
        var match = null;
        Object.keys(known).forEach(function (k) { if (host.indexOf(k) >= 0) match = known[k]; });
        var title = match ? match[0] : OMA.fmt.title(host.split('.')[0]);
        var blurb = match ? match[1] : 'This site refuses to be embedded inside another page (X-Frame-Options / frame-ancestors).';

        var page = h('div.oma-browser-page.oma-preview');
        page.appendChild(h('div.oma-preview-badge', { html: I.info + '<span>offline preview</span>' }));
        page.appendChild(h('div.oma-preview-host', { text: prettify(t.url) }));
        page.appendChild(h('h1.oma-preview-title', { text: title }));
        page.appendChild(h('p.oma-preview-blurb', { text: blurb }));
        page.appendChild(h('div.oma-preview-card', [
          h('div.oma-preview-cardhead', { text: 'Why you are seeing this' }),
          h('p', { text: 'Real Chromium is a native application: it can load any page. This clone runs inside your browser, and browsers refuse to let one page frame another when the site sets X-Frame-Options or a frame-ancestors policy. The Omarchy-themed preview is the honest fallback instead of a blank frame.' }),
          h('p', { text: 'Pages this clone does load for real: Wikipedia, example.com, omarchy.org, the Arch wiki and MDN.' })
        ]));
        var actions = h('div.oma-preview-actions');
        actions.appendChild(h('button.oma-btn', { text: 'Open in your real browser', onclick: function () { window.open(t.url, '_blank', 'noopener'); } }));
        actions.appendChild(h('button.oma-btn', { text: 'Copy URL', onclick: function () { OMA.Capture.copy(t.url); OMA.Shell.osd({ icon: 'clipboard', label: 'Copied', value: t.url }); } }));
        page.appendChild(actions);
        view.appendChild(page);
        status.textContent = 'preview · ' + theme.name;
        t.title = title;
      }

      addr.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') go(addr.value);
        if (e.key === 'Escape') { addr.value = tabs[active].url; addr.blur(); }
      });
      addr.addEventListener('focus', function () { addr.select(); });

      var offNav = OMA.bus.on('browser:navigate', go);
      win._disposers = [offNav];
      OMA.bus.on('theme:changed', function () { render(); });

      render();
    },

    onClose: function (win) { (win._disposers || []).forEach(function (d) { try { d(); } catch (e) { } }); }
  });

  /* ------------------------------------------------------ framed web apps */
  var WEBAPPS = [
    { id: 'web-x', name: 'X', icon: 'browser', url: 'https://x.com', key: 'Super + Shift + X', body: 'The X web app. Omarchy frames it so it behaves like a native window.' },
    { id: 'web-youtube', name: 'YouTube', icon: 'browser', url: 'https://youtube.com', key: 'Super + Shift + Y', body: 'Video without a browser chrome — framed like a desktop app.' },
    { id: 'web-gpt', name: 'ChatGPT', icon: 'agent', url: 'https://chatgpt.com', key: 'Super + Shift + A', body: 'The AI web app. Setup > Defaults > Agent picks which agent is default.' },
    { id: 'web-grok', name: 'Grok', icon: 'agent', url: 'https://grok.com', key: 'Super + Shift + Alt + A', body: 'Second AI web app, bound to Super + Shift + Alt + A.' },
    { id: 'web-obsidian', name: 'Obsidian', icon: 'edit', url: 'https://obsidian.md', key: 'Super + Shift + O', body: 'Obsidian needs the Omarchy theme selected manually via Appearance > Themes.' },
    { id: 'web-hey', name: 'HEY Mail', icon: 'file', url: 'https://app.hey.com', key: 'Super + Shift + E', body: 'Email as a framed web app. New message is Super + Shift + Alt + E.' },
    { id: 'web-google-maps', name: 'Google Maps', icon: 'globe', url: 'https://maps.google.com', key: 'Super + Shift + S', body: 'Maps as a web app.' },
    { id: 'web-photos', name: 'Google Photos', icon: 'camera', url: 'https://photos.google.com', key: 'Super + Shift + P', body: 'Photos as a web app.' }
  ];

  WEBAPPS.forEach(function (app) {
    OMA.WM.registry.register({
      id: app.id, name: app.name, icon: app.icon, comment: 'Web app · ' + app.key, single: true,
      title: function () { return app.name + ' — web app'; },
      mount: function (body, win) {
        var wrap = h('div.oma-webapp');
        var bar = h('div.oma-webapp-bar', [
          h('div.oma-webapp-dot', { style: { background: OMA.Themes.current.red } }),
          h('div.oma-webapp-dot', { style: { background: OMA.Themes.current.yellow } }),
          h('div.oma-webapp-dot', { style: { background: OMA.Themes.current.green } }),
          h('div.oma-webapp-url', { text: prettify(app.url) }),
          h('div.oma-webapp-key', { text: app.key })
        ]);
        var frameWrap = h('div.oma-webapp-frame');
        var loaded = false;
        var frame = h('iframe', { src: app.url, sandbox: 'allow-scripts allow-same-origin allow-forms', referrerpolicy: 'no-referrer' });
        frame.addEventListener('load', function () { loaded = true; });
        frameWrap.appendChild(frame);
        wrap.appendChild(bar); wrap.appendChild(frameWrap);
        body.appendChild(wrap);

        setTimeout(function () {
          if (loaded) return;
          clear(frameWrap);
          var page = h('div.oma-browser-page.oma-preview');
          page.appendChild(h('div.oma-preview-badge', { html: I.info + '<span>framed web app</span>' }));
          page.appendChild(h('h1.oma-preview-title', { text: app.name }));
          page.appendChild(h('p.oma-preview-blurb', { text: app.body }));
          page.appendChild(h('div.oma-preview-card', [
            h('div.oma-preview-cardhead', { text: 'Bound to ' + app.key }),
            h('p', { text: app.name + ' cannot be framed by ' + prettify(app.url) + ' from inside a browser — the site forbids embedding. On real Omarchy this window is a Chromium app frame, so it behaves like a native application.' })
          ]));
          page.appendChild(h('div.oma-preview-actions', [
            h('button.oma-btn', { text: 'Open in your real browser', onclick: function () { window.open(app.url, '_blank', 'noopener'); } })
          ]));
          frameWrap.appendChild(page);
        }, 2400);
      }
    });
  });
})(window.OMA = window.OMA || {});
