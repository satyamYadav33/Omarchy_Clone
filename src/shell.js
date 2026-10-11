/* ============================================================================
 * Omarchy Web Clone — shell.js  (part 1 of 2: rendering)
 * ----------------------------------------------------------------------------
 * Omarchy 4 replaced Waybar + Walker + Mako + SwayOSD + hyprlock + swaybg with
 * ONE Quickshell process ("omarchy-shell"). This file is that process.
 *
 * Bar layout, sizes and module order are taken from the upstream default
 * config/omarchy/shell.json:
 *   barSize 26, position top, centerAnchor omarchy.clock
 *   left   : omarchy.menu, omarchy.workspaces
 *   center : indicators, clock, elsewhen, weather, system-update
 *   right  : keyboard-layout, tray, agents, bluetooth, network, audio,
 *            monitor, power
 * Clock format "dddd HH:mm" (primary) / "d MMMM 'W'ww yyyy" (alternate).
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt;

  var S = {
    barEl: null, menuEl: null, notifEl: null, osdEl: null, panelEl: null,
    lockEl: null, menuStack: [], menuMode: null, query: '',
    notifSilenced: false, reminders: [], history: [],
    panels: {}, activePanel: null, osdTimer: 0, menuSel: 0, menuItems: []
  };

  /* ------------------------------------------------------------------ icons */
  var I = {
    menu: '<svg viewBox="0 0 16 16"><path d="M8 2.2a5.8 5.8 0 1 0 3.2 10.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11.9 4.4 6.6 8l4.6 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    power: '<svg viewBox="0 0 16 16"><path d="M8 2v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4.6 4.2a4.6 4.6 0 1 0 6.8 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    battery: '<svg viewBox="0 0 16 16"><rect x="1.5" y="5" width="11" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="6.4" width="6" height="3.2" rx="0.6" fill="currentColor"/><path d="M13.6 6.8v2.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    wifi: '<svg viewBox="0 0 16 16"><path d="M2 6.2a9 9 0 0 1 12 0M4.4 8.7a5.6 5.6 0 0 1 7.2 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.8" r="1.2" fill="currentColor"/></svg>',
    bt: '<svg viewBox="0 0 16 16"><path d="M6 3.6 10 11l-2 2.2V2.8L10 5 6 12.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    volume: '<svg viewBox="0 0 16 16"><path d="M3 6h2.4L8.6 3.4v9.2L5.4 10H3z" fill="currentColor"/><path d="M10.6 5.8a3.2 3.2 0 0 1 0 4.4M12.4 4a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 16 16"><path d="M3 6h2.4L8.6 3.4v9.2L5.4 10H3z" fill="currentColor"/><path d="m11 6.2 3.4 3.6M14.4 6.2 11 9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.6V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    monitor: '<svg viewBox="0 0 16 16"><rect x="1.6" y="3" width="12.8" height="8.4" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 13.6h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    update: '<svg viewBox="0 0 16 16"><path d="M13 8a5 5 0 1 1-1.6-3.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.4 2v3h-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    keyboard: '<svg viewBox="0 0 16 16"><rect x="1.4" y="4.4" width="13.2" height="7.2" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 7h1M6.6 7h1M9.2 7h1M11.8 7h1M4.6 9.6h6.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    agent: '<svg viewBox="0 0 16 16"><rect x="3" y="5" width="10" height="7.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="6.2" cy="8.4" r="1" fill="currentColor"/><circle cx="9.8" cy="8.4" r="1" fill="currentColor"/><path d="M8 2.6v2.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    tray: '<svg viewBox="0 0 16 16"><path d="M2.4 10.4h11.2M8 2.8v5.4m0 0L5.6 5.8M8 8.2l2.4-2.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    weather: '<svg viewBox="0 0 16 16"><circle cx="6" cy="6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.6 11.6h6.2a2.4 2.4 0 0 0 0-4.8 3 3 0 0 0-5.6 1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.4 8h11.2M8 2.2c1.8 2 2.6 3.9 2.6 5.8S9.8 13.8 8 13.8 5.4 11.9 5.4 8 6.2 4.2 8 2.2z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
    check: '<svg viewBox="0 0 16 16"><path d="m3.4 8.4 3 3 6.2-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevron: '<svg viewBox="0 0 16 16"><path d="m6.2 3.6 4.4 4.4-4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    layers: '<svg viewBox="0 0 16 16"><path d="m8 2.4 5.4 3-5.4 3-5.4-3z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="m3.4 9 4.6 2.6L12.6 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    layout: '<svg viewBox="0 0 16 16"><rect x="2" y="2.6" width="5.2" height="10.8" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8.8" y="2.6" width="5.2" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8.8" y="8.8" width="5.2" height="4.6" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    clipboard: '<svg viewBox="0 0 16 16"><rect x="3.4" y="3" width="9.2" height="11" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 3V2.2h4V3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    lock: '<svg viewBox="0 0 16 16"><rect x="3.4" y="7" width="9.2" height="6.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    moon: '<svg viewBox="0 0 16 16"><path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    sun: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    camera: '<svg viewBox="0 0 16 16"><rect x="1.8" y="4.6" width="12.4" height="8.2" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 4.6l1-1.8h2l1 1.8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    terminal: '<svg viewBox="0 0 16 16"><rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m4.6 6.4 1.8 1.8-1.8 1.8M8.4 10.2h3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    file: '<svg viewBox="0 0 16 16"><path d="M4 2.4h5l3 3v8.2H4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 2.6v3h3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    folder: '<svg viewBox="0 0 16 16"><path d="M2 4.4h4.2l1.2 1.6h6.6v6.4H2z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    music: '<svg viewBox="0 0 16 16"><path d="M6 11.4V4.2l6-1.4v7.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="4.4" cy="11.8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="10.4" cy="10.4" r="1.7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    edit: '<svg viewBox="0 0 16 16"><path d="M11.2 2.6 13.4 4.8 6 12.2l-3 .8.8-3z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    browser: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.4 8h11.2M8 2.2c1.8 2 2.6 3.9 2.6 5.8S9.8 13.8 8 13.8 5.4 11.9 5.4 8 6.2 4.2 8 2.2z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
    activity: '<svg viewBox="0 0 16 16"><path d="M1.6 9.4h2.8L6 4.6l2.4 7 1.8-4.2h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    palette: '<svg viewBox="0 0 16 16"><path d="M8 2.2a5.8 5.8 0 0 0 0 11.6c1 0 1.6-.7 1.6-1.5 0-.9-.7-1.4-.7-2.1 0-.7.6-1.2 1.4-1.2h1.2A2.5 2.5 0 0 0 14 6.5C14 4 11.3 2.2 8 2.2z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="5.6" cy="6.4" r="1" fill="currentColor"/><circle cx="8.4" cy="5" r="1" fill="currentColor"/></svg>',
    install: '<svg viewBox="0 0 16 16"><path d="M8 2.4v7.2m0 0L5.2 6.8M8 9.6l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11.6v1.8h10v-1.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    remove: '<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 16 16"><path d="M2.6 3.2h4.2a1.6 1.6 0 0 1 1.6 1.6v8a1.4 1.4 0 0 0-1.4-1.4H2.6zM13.4 3.2H9.2a1.6 1.6 0 0 0-1.6 1.6v8a1.4 1.4 0 0 1 1.4-1.4h4.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4M8 5.1v.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 16 16"><path d="M4.4 7a3.6 3.6 0 1 1 7.2 0c0 3 1.2 3.8 1.2 3.8H3.2S4.4 10 4.4 7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.6 12.6a1.4 1.4 0 0 0 2.8 0" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    emoji: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6.6" r="1" fill="currentColor"/><circle cx="10" cy="6.6" r="1" fill="currentColor"/><path d="M5.4 9.6a3.2 3.2 0 0 0 5.2 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    calc: '<svg viewBox="0 0 16 16"><rect x="3.4" y="2.2" width="9.2" height="11.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.6 5h4.8M5.6 8h1.4M8 8h1.4M10.4 8h.1M5.6 10.4h1.4M8 10.4h1.4M10.4 10.4h.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 16 16"><path d="M3 8h9M9 4.8 12.2 8 9 11.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    refresh: '<svg viewBox="0 0 16 16"><path d="M13.2 8A5.2 5.2 0 1 1 11.5 4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.6 1.8v3h-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  S.icons = I;

  /* =========================================================== top bar ===== */
  function buildBar() {
    var el = h('div#omarchy-bar.oma-bar');
    S.barEl = el;
    document.body.appendChild(el);
    renderBar();
    setInterval(function () {
      var c = OMA.$('#bar-clock', S.barEl);
      if (c) tickClock(c);
      var m = OMA.$('#bar-monitor', S.barEl);
      if (m && OMA.System) m.textContent = OMA.System.brightness + '%';
    }, 1000);
    OMA.bus.on('theme:changed', function () {
      var idx = OMA.System ? OMA.System.wallIndex : 0;
      renderBar();
    });
    OMA.bus.on('notify', function () { renderBar(); });
    OMA.bus.on('wm:changed', renderWorkspaces);
    OMA.bus.on('update:available', renderBar);
    return el;
  }

  function modButton(key, icon, label, onclick, id) {
    return h('div.oma-mod' + (icon ? '.oma-mod-icon' : ''), {
      id: id, title: label, onclick: onclick,
      html: icon ? I[icon] : null, text: icon ? null : label
    });
  }

  function renderBar() {
    var el = S.barEl; if (!el) return;
    clear(el);
    el.classList.toggle('is-hidden', !OMA.WM.barVisible);

    /* left: omarchy.menu + omarchy.workspaces */
    var left = h('div.oma-bar-group.oma-bar-left');
    left.appendChild(h('div.oma-mod.oma-mod-menu', {
      title: 'Omarchy menu — Super + Space',
      html: I.menu,
      onclick: function (e) { e.stopPropagation(); OMA.Shell.openMenu(); }
    }));
    left.appendChild(h('div#bar-workspaces.oma-workspaces'));

    /* center: indicators, clock, elsewhen, weather, system-update */
    var center = h('div.oma-bar-group.oma-bar-center');
    var ind = h('div.oma-indicators');
    if (OMA.System && OMA.System.nightlight) ind.appendChild(h('div.oma-mod.oma-mod-icon', { html: I.moon, title: 'Nightlight on' }));
    if (OMA.System && OMA.System.silenced) ind.appendChild(h('div.oma-mod.oma-mod-icon', { html: I.bell, title: 'Notifications silenced' }));
    if (OMA.System && OMA.System.recording) ind.appendChild(h('div.oma-mod.oma-mod-icon.oma-rec', { html: I.camera, title: 'Screen recording' }));
    if (OMA.Term && OMA.Term.running) ind.appendChild(h('div.oma-mod.oma-mod-icon.oma-rec', { html: I.terminal, title: 'Job running in terminal' }));
    if (ind.childNodes.length) center.appendChild(ind);

    var clock = h('div.oma-mod.oma-clock', {
      id: 'bar-clock', title: 'Calendar — click for month view',
      onclick: function (e) { e.stopPropagation(); togglePanel('calendar', e.currentTarget); }
    });
    tickClock(clock);
    center.appendChild(clock);

    var tz = (OMA.System && OMA.System.clockAlt) ? 'alt' : 'main';
    center.appendChild(h('div.oma-mod', {
      title: 'Toggle clock format',
      text: tz === 'alt' ? fmt.altDate() : OMA.System.tzLabel,
      onclick: function () {
        OMA.System.clockAlt = !OMA.System.clockAlt;
        OMA.System.tzLabel = ['Seoul', 'Berlin', 'New York', 'Tokyo', 'London'][Math.floor(Math.random() * 5)];
        renderBar();
      }
    }));
    center.appendChild(h('div.oma-mod.oma-weather', {
      title: 'Weather — click for forecast',
      html: I.weather + '<span>Copenhagen 14&deg;</span>',
      onclick: function () { OMA.Shell.notify({ app: 'Weather', summary: 'Copenhagen', body: 'Partly cloudy, 14°C. Wind 6 m/s from the west.' }); }
    }));
    if (OMA.System && OMA.System.updates > 0) {
      center.appendChild(h('div.oma-mod.oma-mod-icon.oma-update', {
        html: I.update, title: OMA.System.updates + ' update(s) — Super + Space > Update > Omarchy',
        onclick: function () { OMA.Shell.notify({ app: 'Omarchy', summary: 'Updates available', body: OMA.System.updates + ' package update(s) pending. Run Update > Omarchy.' }); }
      }));
    }

    /* right: keyboard-layout, tray, agents, bluetooth, network, audio, monitor, power */
    var right = h('div.oma-bar-group.oma-bar-right');
    right.appendChild(modButton(null, 'keyboard', 'Keyboard layout: us', function () {
      OMA.Shell.notify({ app: 'Input', summary: 'Keyboard layout', body: 'us — Setup > Typing to change.' });
    }));
    right.appendChild(h('div.oma-mod.oma-mod-icon.oma-tray', {
      html: I.tray, title: 'Tray — hover for items', 'data-tray': '1'
    }));
    right.appendChild(modButton(null, 'agent', 'AI agents — click to launch default', function () {
      OMA.Shell.notify({ app: 'Agents', summary: 'Default agent', body: 'Setup > Defaults > Agent to choose Claude, Codex, OpenCode…' });
    }));
    right.appendChild(modButton(null, 'bt', 'Bluetooth', function (e) { e.stopPropagation(); togglePanel('bluetooth', e.currentTarget); }));
    right.appendChild(modButton(null, 'wifi', 'Network', function (e) { e.stopPropagation(); togglePanel('network', e.currentTarget); }));
    right.appendChild(modButton(OMA.System && OMA.System.muted ? 'mute' : 'volume', null, 'Audio', function (e) { e.stopPropagation(); togglePanel('audio', e.currentTarget); }, 'bar-audio'));
    right.appendChild(h('div.oma-mod.oma-mod-icon', {
      id: 'bar-monitor', html: I.monitor, title: 'Display brightness — scroll to change',
      onclick: function (e) { e.stopPropagation(); togglePanel('display', e.currentTarget); }
    }));
    right.appendChild(modButton(null, 'power', 'Power', function (e) { e.stopPropagation(); togglePanel('power', e.currentTarget); }));

    el.appendChild(left); el.appendChild(center); el.appendChild(right);
    renderWorkspaces();
    applyBarWheel(el);
  }

  function tickClock(node) {
    node.textContent = (OMA.System && OMA.System.clockAlt) ? fmt.altDate() : fmt.longClock();
  }

  function applyBarWheel(el) {
    el.addEventListener('wheel', function (e) {
      var t = e.target.closest('.oma-mod');
      if (!t) return;
      e.preventDefault();
      var d = e.deltaY < 0 ? 1 : -1;
      if (t.id === 'bar-monitor') { OMA.System.brightness = clamp(OMA.System.brightness + d * 2, 10, 100); OMA.System.applyDisplay(); OMA.Shell.osd({ icon: 'sun', label: 'Brightness', value: OMA.System.brightness + '%' }); }
      else OMA.System.setVolume(OMA.System.volume + d * 2);
    }, { passive: false });
  }

  function renderWorkspaces() {
    var host = OMA.$('#bar-workspaces', S.barEl); if (!host) return;
    clear(host);
    var ids = [1, 2, 3, 4, 5];
    ids.forEach(function (id) {
      var occupied = OMA.WM.occupied(id);
      host.appendChild(h('div.oma-ws', {
        text: String(id),
        class: (id === OMA.WM.active ? 'is-active' : '') + (occupied ? ' is-occupied' : ''),
        title: 'Workspace ' + id + ' — Super + ' + id,
        onclick: function () { OMA.WM.gotoWs(id); }
      }));
    });
    if (OMA.WM.ws().layout) {
      host.appendChild(h('div.oma-ws-layout', { text: OMA.WM.ws().layout, title: 'Layout — Super + L' }));
    }
  }

  /* ============================================================== OSD ====== */
  function osd(data) {
    if (!S.osdEl) {
      S.osdEl = h('div#omarchy-osd.oma-osd');
      document.body.appendChild(S.osdEl);
    }
    var el = S.osdEl;
    clear(el);
    if (data.type === 'level') {
      el.appendChild(h('div.oma-osd-icon', { html: I[data.icon] || I.volume }));
      el.appendChild(h('div.oma-osd-bar', [
        h('div.oma-osd-fill', { style: { width: Math.max(0, Math.min(100, data.value)) + '%' } })
      ]));
      el.appendChild(h('div.oma-osd-val', { text: data.label + ' ' + Math.round(data.value) + '%' }));
    } else {
      el.appendChild(h('div.oma-osd-icon', { html: I[data.icon] || I.info }));
      el.appendChild(h('div.oma-osd-text', [
        h('div.oma-osd-label', { text: data.label }),
        data.value ? h('div.oma-osd-value', { text: data.value }) : null
      ]));
    }
    el.classList.add('is-visible');
    clearTimeout(S.osdTimer);
    S.osdTimer = setTimeout(function () { el.classList.remove('is-visible'); }, data.sticky ? 6000 : 1500);
  }

  /* ========================================================== notify ===== */
  function notify(n) {
    n = n || {};
    var item = {
      id: 'n' + (++S._n || (S._n = 1)),
      app: n.app || 'Omarchy',
      summary: n.summary || '',
      body: n.body || '',
      icon: n.icon || 'info',
      ts: Date.now(),
      actions: n.actions || null
    };
    S.history.unshift(item);
    if (S.history.length > 60) S.history.pop();
    if (S.notifSilenced) { renderBar(); return item; }
    if (!S.notifEl) {
      S.notifEl = h('div#omarchy-notifications.oma-notifications');
      document.body.appendChild(S.notifEl);
    }
    var card = h('div.oma-notif', { dataset: { id: item.id } });
    card.appendChild(h('div.oma-notif-icon', { html: I[item.icon] || I.bell }));
    var content = h('div.oma-notif-content', [
      h('div.oma-notif-app', { text: item.app }),
      h('div.oma-notif-summary', { text: item.summary }),
      item.body ? h('div.oma-notif-body', { text: item.body }) : null
    ]);
    if (item.actions) {
      var row = h('div.oma-notif-actions');
      item.actions.forEach(function (a) {
        row.appendChild(h('button.oma-btn.oma-btn-sm', { text: a.label, onclick: function (e) { e.stopPropagation(); a.run(); dismiss(card); } }));
      });
      content.appendChild(row);
    }
    card.appendChild(content);
    card.appendChild(h('div.oma-notif-close', { html: I.remove, onclick: function () { dismiss(card); } }));
    card.onclick = function () { OMA.bus.emit('notify:invoke', item); dismiss(card); };
    S.notifEl.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('is-in'); });
    if (n.timeout !== 0) setTimeout(function () { dismiss(card); }, n.timeout || 6000);
    if (S.notifEl.childNodes.length > 4) dismiss(S.notifEl.firstChild);
    OMA.bus.emit('notify:shown', item);
    return item;
  }
  function dismiss(card) {
    if (!card || !card.parentNode) return;
    card.classList.remove('is-in');
    card.classList.add('is-out');
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 200);
  }
  function dismissLatest() {
    if (!S.notifEl) return;
    var kids = S.notifEl.childNodes;
    if (kids.length) dismiss(kids[kids.length - 1]);
  }
  function dismissAll() {
    if (!S.notifEl) return;
    while (S.notifEl.firstChild) dismiss(S.notifEl.firstChild);
  }
  function notificationHistory() {
    var body = h('div.oma-hist');
    if (!S.history.length) body.appendChild(h('div.oma-panel-empty', { text: 'No notifications yet.' }));
    S.history.slice(0, 20).forEach(function (n) {
      body.appendChild(h('div.oma-hist-row', [
        h('div.oma-hist-icon', { html: I[n.icon] || I.bell }),
        h('div.oma-hist-main', [
          h('div.oma-hist-sum', { text: n.summary || n.app }),
          h('div.oma-hist-body', { text: n.body })
        ]),
        h('div.oma-hist-time', { text: fmt.clock(new Date(n.ts)) })
      ]));
    });
    var p = openPanelCustom('Notification history', body, 'bell');
    p.appendChild(h('button.oma-btn.oma-btn-wide', {
      text: 'Clear history', onclick: function () { S.history = []; closePanel(); }
    }));
    return p;
  }

  /* =========================================================== panels ===== */
  function panelHost() {
    if (!S.panelEl) {
      S.panelEl = h('div#omarchy-panel-host');
      document.body.appendChild(S.panelEl);
    }
    return S.panelEl;
  }
  function closePanel() {
    if (!S.panelEl) return;
    clear(S.panelEl);
    S.panelEl.classList.remove('is-open');
    S.activePanel = null;
    OMA.bus.emit('panel:closed');
  }
  function openPanelCustom(title, bodyNode, icon) {
    var host = panelHost();
    clear(host);
    host.classList.add('is-open');
    var p = h('div.oma-panel', [
      h('div.oma-panel-head', [
        h('div.oma-panel-icon', { html: I[icon] || I.gear }),
        h('div.oma-panel-title', { text: title })
      ]),
      h('div.oma-panel-body', bodyNode)
    ]);
    host.appendChild(p);
    S.activePanel = p;
    return p;
  }
  function togglePanel(name, anchor) {
    if (S.activePanel && S.activePanel.dataset.name === name) { closePanel(); return; }
    var fn = S.panels[name];
    if (!fn) return;
    var p = fn();
    p.dataset.name = name;
    positionPanel(p, anchor);
  }
  function positionPanel(p, anchor) {
    if (!anchor) return;
    var r = anchor.getBoundingClientRect();
    var w = p.offsetWidth || 320;
    var x = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    clearTimeout(p._t);
    p._t = setTimeout(function () {
      w = p.offsetWidth || 320;
      x = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
      p.style.left = x + 'px';
      p.style.top = '30px';
    }, 0);
  }

  function sliderRow(label, value, onInput, icon, unit) {
    var val = h('span.oma-slider-val', { text: Math.round(value) + (unit || '%') });
    var bar = h('div.oma-slider-bar');
    var fill = h('div.oma-slider-fill', { style: { width: Math.max(0, Math.min(100, value)) + '%' } });
    bar.appendChild(fill);
    var wrap = h('div.oma-slider', [
      h('div.oma-slider-head', [
        h('div.oma-slider-label', { html: (icon ? I[icon] : '') + '<span>' + label + '</span>' }),
        val
      ]),
      bar
    ]);
    function set(v) {
      v = Math.max(0, Math.min(100, v));
      fill.style.width = v + '%';
      val.textContent = Math.round(v) + (unit || '%');
      onInput(v);
    }
    var dragging = false;
    function fromEvent(e) {
      var r = bar.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      set(((cx - r.left) / r.width) * 100);
    }
    bar.addEventListener('mousedown', function (e) { dragging = true; fromEvent(e); e.preventDefault(); });
    window.addEventListener('mousemove', function (e) { if (dragging) fromEvent(e); });
    window.addEventListener('mouseup', function () { dragging = false; });
    bar.addEventListener('wheel', function (e) { e.preventDefault(); set(parseFloat(fill.style.width) + (e.deltaY < 0 ? 2 : -2)); }, { passive: false });
    wrap._set = set;
    return wrap;
  }

  S.panels.audio = function () {
    var body = h('div');
    body.appendChild(sliderRow('Output volume', OMA.System.volume, function (v) { OMA.System.setVolume(v); }, 'volume'));
    body.appendChild(sliderRow('Microphone', OMA.System.mic, function (v) { OMA.System.mic = v; }, 'volume'));
    var mute = h('button.oma-btn.oma-btn-wide', {
      text: OMA.System.muted ? 'Unmute' : 'Mute',
      onclick: function () { OMA.System.setMuted(!OMA.System.muted); closePanel(); togglePanel('audio', OMA.$('#bar-audio')); }
    });
    body.appendChild(h('div.oma-panel-row', [
      h('div.oma-panel-row-label', { text: 'Mute' }), mute
    ]));
    body.appendChild(h('div.oma-panel-sub', { text: 'Playback devices' }));
    ['Built-in Audio Analog Stereo', 'Yeti Nano USB', 'AirPods Pro'].forEach(function (d, i) {
      body.appendChild(h('div.oma-panel-item' + (i === 0 ? '.is-active' : ''), [
        h('div', { text: d }),
        i === 0 ? h('div.oma-panel-check', { html: I.check }) : null
      ]));
    });
    return openPanelCustom('Audio', body, 'volume');
  };

  S.panels.bluetooth = function () {
    var body = h('div');
    body.appendChild(h('div.oma-panel-row', [
      h('div.oma-panel-row-label', { text: 'Bluetooth' }),
      h('button.oma-btn.oma-btn-sm', {
        text: OMA.System.btOn ? 'On' : 'Off',
        onclick: function () { OMA.System.btOn = !OMA.System.btOn; closePanel(); togglePanel('bluetooth', OMA.$('.oma-bar-right .oma-mod:nth-child(4)')); }
      })
    ]));
    body.appendChild(h('div.oma-panel-sub', { text: 'Devices' }));
    [['AirPods Pro', 82, true], ['MX Master 3S', 64, false], ['Keychron K3', 41, false]].forEach(function (d) {
      body.appendChild(h('div.oma-panel-item', [
        h('div', { text: d[0] }),
        h('div.oma-panel-meta', { text: d[1] + '%' }),
        d[2] ? h('div.oma-panel-check', { html: I.check }) : null
      ]));
    });
    return openPanelCustom('Bluetooth', body, 'bt');
  };

  S.panels.network = function () {
    var body = h('div');
    body.appendChild(h('div.oma-panel-item.is-active', [
      h('div', [h('div', { text: 'omarchy-5G' }), h('div.oma-panel-meta', { text: 'Connected · WPA3 · 192.168.1.42' })]),
      h('div.oma-panel-check', { html: I.check })
    ]));
    body.appendChild(h('div.oma-panel-sub', { text: 'Available' }));
    [['Cafe_WiFi', 78], ['37signals-guest', 62], ['iPhone Hotspot', 44]].forEach(function (n) {
      body.appendChild(h('div.oma-panel-item', [
        h('div', { text: n[0] }),
        h('div.oma-panel-meta', { text: n[1] + '%' })
      ]));
    });
    body.appendChild(h('div.oma-panel-sub', { text: 'Tailscale' }));
    body.appendChild(h('div.oma-panel-item', [
      h('div', { text: 'oma-arch' }), h('div.oma-panel-meta', { text: '100.84.12.7 · online' })
    ]));
    return openPanelCustom('Network', body, 'wifi');
  };

  S.panels.display = function () {
    var body = h('div');
    body.appendChild(sliderRow('Brightness', OMA.System.brightness, function (v) { OMA.System.brightness = v; OMA.System.applyDisplay(); }, 'sun'));
    body.appendChild(h('div.oma-panel-sub', { text: 'Scale' }));
    var scales = ['1x', '1.25x', '1.5x', '1.6x', '1.75x', '2x'];
    var row = h('div.oma-chip-row');
    scales.forEach(function (s) {
      row.appendChild(h('button.oma-chip' + ((OMA.System.scaleLabel === s) ? '.is-active' : ''), {
        text: s, onclick: function () { OMA.System.scaleLabel = s; closePanel(); togglePanel('display', OMA.$('#bar-monitor')); }
      }));
    });
    body.appendChild(row);
    body.appendChild(h('div.oma-panel-sub', { text: 'Nightlight' }));
    body.appendChild(h('div.oma-panel-item', [
      h('div', { text: 'Temperature 4000K' }),
      h('div.oma-panel-check', { html: OMA.System.nightlight ? I.check : '' })
    ]));
    return openPanelCustom('Display', body, 'monitor');
  };

  S.panels.power = function () {
    var body = h('div');
    body.appendChild(h('div.oma-power-grid', [
      powerBtn('Lock', 'lock', function () { OMA.Shell.lock(); }),
      powerBtn('Suspend', 'moon', function () { OMA.Shell.suspend(); }),
      powerBtn('Logout', 'arrow', function () { OMA.Shell.logout(); }),
      powerBtn('Reboot', 'refresh', function () { OMA.Shell.reboot(); }),
      powerBtn('Shutdown', 'power', function () { OMA.Shell.shutdown(); }),
      powerBtn('Screensaver', 'sun', function () { OMA.Shell.screensaver(); })
    ]));
    return openPanelCustom('System', body, 'power');
  };

  function powerBtn(label, icon, fn) {
    return h('button.oma-power-btn', { onclick: fn }, [
      h('div.oma-power-icon', { html: I[icon] }), h('div', { text: label })
    ]);
  }

  S.panels.calendar = function () {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1), startPad = first.getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var grid = h('div.oma-cal-grid');
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { grid.appendChild(h('div.oma-cal-dow', { text: d })); });
    for (var i = 0; i < startPad; i++) grid.appendChild(h('div.oma-cal-day.is-blank'));
    for (var d = 1; d <= days; d++) {
      grid.appendChild(h('div.oma-cal-day' + (d === now.getDate() ? '.is-today' : ''), { text: String(d) }));
    }
    var body = h('div', [
      h('div.oma-cal-head', { text: fmt.monthName(now) + ' ' + y }),
      grid,
      h('div.oma-panel-sub', { text: 'World clock' }),
      h('div.oma-worldclock')
    ]);
    var wc = h('div.oma-worldclock');
    ['Seoul', 'Berlin', 'New York', 'Tokyo'].forEach(function (city, idx) {
      var off = [9, 2, -4, 9][idx] - now.getTimezoneOffset() / 60;
      var t = new Date(now.getTime() + (off - (-now.getTimezoneOffset() / 60)) * 3600000);
      wc.appendChild(h('div.oma-panel-item', [
        h('div', { text: city }), h('div.oma-panel-meta', { text: fmt.clock(t) })
      ]));
    });
    return openPanelCustom('Calendar', body, 'clock');
  };

  /* ============================================================ lock screen */
  function lock() {
    if (S.lockEl) return;
    var t = OMA.Themes.current;
    var el = h('div#omarchy-lock.oma-lock');
    var time = h('div.oma-lock-time', { text: fmt.clock() });
    var date = h('div.oma-lock-date', { text: fmt.weekday() + ', ' + new Date().getDate() + ' ' + fmt.monthName() });
    var pw = h('input.oma-lock-input', { type: 'password', placeholder: 'Enter password…', autocomplete: 'off' });
    var hint = h('div.oma-lock-hint', { text: 'Press Enter to unlock — any password works here' });
    var ring = h('div.oma-lock-avatar', { text: (OMA.Store.get('name') || 'Omarchy User').slice(0, 1).toUpperCase() });
    el.appendChild(h('div.oma-lock-inner', [time, date, ring, pw, hint]));
    document.body.appendChild(el);
    S.lockEl = el;
    el.classList.add('is-in');
    setTimeout(function () { pw.focus(); }, 120);
    var tick = setInterval(function () { time.textContent = fmt.clock(); }, 1000);
    pw.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') unlock();
      if (e.key === 'Escape') unlock();
    });
    window.addEventListener('keydown', escUnlock, true);
    function escUnlock(e) { if (e.key === 'Escape' && S.lockEl) unlock(); }
    function unlock() {
      clearInterval(tick);
      window.removeEventListener('keydown', escUnlock, true);
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); S.lockEl = null; }, 320);
      OMA.bus.emit('lock:unlocked');
    }
  }

  OMA.Shell = {
    S: S, icons: I,
    buildBar: buildBar, renderBar: renderBar, renderWorkspaces: renderWorkspaces,
    osd: osd, notify: notify, dismissLatest: dismissLatest, dismissAll: dismissAll,
    notificationHistory: notificationHistory,
    closePanel: closePanel, togglePanel: togglePanel, openPanelCustom: openPanelCustom,
    sliderRow: sliderRow, lock: lock
  };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
})(window.OMA = window.OMA || {});
