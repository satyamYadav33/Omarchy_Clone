/* ============================================================================
 * Omarchy Web Clone — keys.js
 * ----------------------------------------------------------------------------
 * The complete Quattro (v4.0.4) keybinding table, wired to this compositor.
 *
 * Two substitutions are unavoidable inside a browser, and they are stated
 * plainly rather than hidden:
 *   1. The OS owns the real Windows/Cmd/Super key and the browser owns Alt,
 *      Ctrl+W, Ctrl+T, F11 and so on. So the Super key here is Caps Lock
 *      (remappable in settings) and a few system actions move to Ctrl+Alt.
 *   2. There is no Print Screen key on most laptops. Capture therefore lives on
 *      Ctrl + Alt + S / R, while the documented Print Screen names still
 *      appear in the keybinding list.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h;

  var Keys = { superKey: 'CapsLock', superDown: false, lastChord: '', fontScale: 1 };

  var MODS = { ctrl: false, alt: false, shift: false, meta: false };

  function keyName(e) {
    var k = e.key;
    if (k === ' ') return 'Space';
    if (k === 'Escape') return 'Esc';
    if (k === 'ArrowUp') return 'Up';
    if (k === 'ArrowDown') return 'Down';
    if (k === 'ArrowLeft') return 'Left';
    if (k === 'ArrowRight') return 'Right';
    if (k === 'Enter') return 'Enter';
    if (k === 'Tab') return 'Tab';
    if (k === 'Backspace') return 'Backspace';
    if (k === 'Delete') return 'Delete';
    if (k === 'Home') return 'Home';
    if (k === 'End') return 'End';
    if (k === 'PageUp') return 'PgUp';
    if (k === 'PageDown') return 'PgDn';
    if (k === ',') return 'Comma';
    if (k === '.') return 'Period';
    if (k === '/') return 'Slash';
    if (k === ';') return 'Semicolon';
    if (k === "'") return 'Apostrophe';
    if (k === '`') return 'Grave';
    if (k === '-') return 'Minus';
    if (k === '=') return 'Equal';
    if (k === '[') return 'BracketLeft';
    if (k === ']') return 'BracketRight';
    if (k === '\\') return 'Backslash';
    if (k.length === 1) return k.toUpperCase();
    return k;
  }

  function chordOf(e) {
    var parts = [];
    var sup = e.getModifierState && e.getModifierState('CapsLock');
    if (Keys.superDown || (Keys.superKey === 'CapsLock' && sup)) parts.push('Super');
    else if (Keys.superDown) parts.push('Super');
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(keyName(e));
    return parts.join('+');
  }

  /* Is this window a text surface that should receive raw typing? */
  function isTextTarget(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      /* Terminal and editor handle their own keys via their own listeners. */
      return true;
    }
    return false;
  }

  function focusOwnsKeys() {
    var a = document.activeElement;
    if (!a) return false;
    /* The terminal input and the editor both stopPropagation, so reaching here
       means they did not claim the chord. Still, never steal plain typing. */
    return isTextTarget(a) && a.classList &&
      (a.classList.contains('oma-term-input') || a.classList.contains('oma-nvim') ||
        a.classList.contains('oma-agent-input') || a.classList.contains('oma-menu-input'));
  }

  function handle(e, phase) {
    /* Never fight the user's own modifier state. */
    var name = keyName(e);
    var superOn = Keys.superDown || (Keys.superKey === 'CapsLock' && e.getModifierState && e.getModifierState('CapsLock'));

    /* Let the lock screen have everything. */
    if (OMA.Shell.S.lockEl) return;

    /* Menu owns its keys while open (except the chords that re-open/close it). */
    if (OMA.Menu && OMA.Menu.el && OMA.Menu.el.classList.contains('is-open')) {
      if (OMA.Menu.keydown(e)) { e.preventDefault(); return; }
    }

    /* A focused app that owns typing keeps plain keys. */
    var texty = isTextTarget(e.target);
    var isChord = superOn || e.ctrlKey || e.altKey || e.metaKey;
    if (texty && !isChord) return;

    /* Universal clipboard — works everywhere, including inside the terminal. */
    if (superOn && e.ctrlKey && name === 'V') { e.preventDefault(); OMA.Capture.clipboardHistory(); return; }
    if (superOn && !e.ctrlKey && !e.altKey && name === 'C') { e.preventDefault(); copySelection(); return; }
    if (superOn && !e.ctrlKey && !e.altKey && name === 'X' && !texty) { e.preventDefault(); cutSelection(); return; }
    if (superOn && !e.ctrlKey && !e.altKey && name === 'V') { e.preventDefault(); pasteClipboard(e); return; }

    /* Inside the terminal, don't hijack the app's own editing keys beyond the
       clipboard chords handled above. */
    if (texty && e.target.classList && e.target.classList.contains('oma-term-input')) {
      /* Allow the Super chords that are global (menu, workspaces, windows). */
      if (!superOn) return;
    }

    /* Ctrl+Alt captures (no Print Screen key on most machines). */
    if (!superOn && e.ctrlKey && e.altKey) {
      if (name === 'S') { e.preventDefault(); OMA.Capture.screenshot('region'); return; }
      if (name === 'R') { e.preventDefault(); OMA.Capture.record('desktop'); return; }
      if (name === 'C') { e.preventDefault(); OMA.Capture.screenshot('region'); return; }
      if (name === 'Q') { e.preventDefault(); OMA.Capture.colorPicker(); return; }
      if (name === 'T') { e.preventDefault(); openTerminal(); return; }
      if (name === 'ArrowLeft' || name === 'ArrowRight') { e.preventDefault(); cycleWindows(name === 'ArrowRight' ? 1 : -1); return; }
    }

    /* Media / brightness / volume hardware-ish keys. */
    if (name === 'AudioVolumeUp' || name === 'VolumeUp') { e.preventDefault(); OMA.System.volumeStep(e.shiftKey ? 100 : (e.altKey ? 1 : 5)); return; }
    if (name === 'AudioVolumeDown' || name === 'VolumeDown') { e.preventDefault(); OMA.System.volumeStep(-(e.shiftKey ? 100 : (e.altKey ? 1 : 5))); return; }
    if (name === 'AudioVolumeMute' || name === 'VolumeMute') { e.preventDefault(); OMA.System.setMuted(!OMA.System.muted); return; }
    if (name === 'BrightnessUp' || name === 'F2') { e.preventDefault(); OMA.System.stepBrightness(e.shiftKey ? 100 : (e.altKey ? 1 : 5)); return; }
    if (name === 'BrightnessDown' || name === 'F1') { e.preventDefault(); OMA.System.stepBrightness(-(e.shiftKey ? 100 : (e.altKey ? 1 : 5))); return; }
    if (name === 'F11') { e.preventDefault(); OMA.WM.toggleFullscreen(); return; }

    if (!superOn) return;

    /* ---------------------------------------------------------- Super ---- */
    e.preventDefault();
    e.stopPropagation();

    var wm = OMA.WM, menu = OMA.Menu, cap = OMA.Capture, sys = OMA.System;

    /* The one menu, the apps menu, the system menu. */
    if (name === 'Space' && !e.ctrlKey && !e.altKey && !e.shiftKey) { menu.toggle('all'); return; }
    if (name === 'Space' && e.altKey) { menu.toggle('apps'); return; }
    if (name === 'Space' && e.ctrlKey && !e.shiftKey) { sys.nextWallpaper(); return; }
    if (name === 'Space' && e.ctrlKey && e.shiftKey) { sys.nextTheme(false); return; }
    if (name === 'Space' && e.shiftKey && !e.ctrlKey && !e.altKey) { wm.setBar(!wm.barVisible); OMA.Shell.osd({ icon: 'monitor', label: 'Top bar', value: wm.barVisible ? 'shown' : 'hidden' }); return; }
    if (name === 'Esc') { menu.open('all'); menu.stack = []; menu.render(); return; }

    /* Lock, close, layouts. */
    if (name === 'L' && e.ctrlKey) { OMA.Shell.lock(); return; }
    if (name === 'Q' || name === 'W') { if (!e.ctrlKey && !e.altKey) { wm.close(); return; } }
    if (name === 'Delete' && e.ctrlKey && e.altKey) { wm.closeAll(); OMA.Shell.osd({ icon: 'remove', label: 'All windows closed' }); return; }
    if (name === 'T' && !e.ctrlKey && !e.altKey) { wm.toggleFloat(); OMA.Shell.osd({ icon: 'copy', label: 'Window', value: wm.activeWin() && wm.activeWin().props.floating ? 'floating' : 'tiled' }); return; }
    if (name === 'T' && e.ctrlKey) { OMA.WM.open('btop'); return; }
    if (name === 'J' && !e.ctrlKey && !e.altKey) { wm.toggleSplit(); return; }
    if (name === 'O' && !e.ctrlKey && !e.altKey) { wm.toggleSticky(); return; }
    if (name === 'L' && !e.ctrlKey && !e.altKey) { wm.cycleLayout(false); return; }
    if (name === 'L' && e.altKey) { wm.cycleLayout(true); return; }
    if (name === 'P' && !e.ctrlKey && !e.altKey) { wm.togglePseudo(); return; }
    if (name === 'P' && e.ctrlKey) { openPanelSafe('power'); return; }
    if (name === 'F' && !e.ctrlKey && !e.altKey) { wm.toggleFullscreen(); return; }
    if (name === 'F' && e.altKey) { wm.toggleFullwidth(); return; }
    if (name === 'F' && e.ctrlKey) { wm.toggleMaximize(); return; }
    if (name === 'F' && e.ctrlKey && e.altKey) { toggleFullDesktop(); return; }

    /* Workspaces. */
    if (/^[1-9]$/.test(name)) {
      var n = parseInt(name, 10);
      if (e.shiftKey && e.altKey) wm.moveToWs(n, false);
      else if (e.shiftKey) wm.moveToWs(n, true);
      else wm.gotoWs(n);
      return;
    }
    if (name === 'Tab') {
      if (e.shiftKey && e.altKey) { cycleGroup(-1); return; }
      if (e.altKey) { cycleGroup(1); return; }
      if (e.ctrlKey && e.shiftKey) { cycleMonitors(-1); return; }
      if (e.ctrlKey) { wm.gotoFormerWs(); return; }
      if (e.shiftKey) { wm.nextWs(true); return; }
      wm.nextWs(false); return;
    }
    /* Scratchpad. */
    if ((name === 'S' && !e.ctrlKey && !e.altKey) || name === 'Grave') { wm.toggleScratch(); return; }
    if ((name === 'S' && e.altKey) || (name === 'Grave' && e.shiftKey)) { wm.moveToScratch(); return; }

    /* Directional focus and swap. */
    if (/^(Left|Right|Up|Down)$/.test(name)) {
      var dir = { Left: 'l', Right: 'r', Up: 'u', Down: 'd' }[name];
      if (e.shiftKey && e.altKey) { OMA.Shell.osd({ icon: 'monitor', label: 'Workspace', value: 'moved to monitor' }); return; }
      if (e.shiftKey) { wm.swapDir(dir); return; }
      if (e.ctrlKey && (dir === 'l' || dir === 'r')) { cycleGroup(dir === 'r' ? 1 : -1); return; }
      if (e.altKey) { groupMove(dir); return; }
      wm.focusDir(dir);
      return;
    }

    /* Resize. */
    if (name === 'Minus' || name === 'Equal') {
      var grow = name === 'Equal';
      var big = e.ctrlKey ? 0.06 : (e.altKey ? 0.008 : 0.03);
      if (e.shiftKey) wm.resize(0, grow ? big : -big);
      else wm.resize(grow ? -big : big, 0);
      return;
    }
    if (name === 'Home') {
      if (e.altKey) wm.saveWidth(); else wm.restoreWidth();
      return;
    }

    /* Grouping. */
    if (name === 'G' && !e.ctrlKey && !e.altKey) { wm.toggleGroup(); return; }
    if (name === 'G' && e.altKey) { wm.moveOutOfGroup(); return; }

    /* Zoom / scaling. */
    if (name === 'Z' && e.ctrlKey && e.altKey) { wm.zoomReset(); return; }
    if (name === 'Z' && e.ctrlKey) { wm.zoomIn(); return; }
    if (name === 'Slash') {
      if (e.altKey) wm.scaleStep(true);
      else if (e.shiftKey) OMA.WM.open('web-x');
      else wm.scaleStep(false);
      return;
    }

    /* Style. */
    if (name === 'Backspace') {
      if (e.ctrlKey) wm.toggleSquare();
      else if (e.shiftKey) { wm.setGaps(!wm.gaps); OMA.Shell.osd({ icon: 'layout', label: 'Window gaps', value: wm.gaps ? 'on' : 'off' }); }
      else wm.toggleTransparency();
      return;
    }

    /* Launching apps. */
    if (name === 'Enter') {
      if (e.shiftKey && e.altKey) { OMA.WM.open('browser'); return; }
      if (e.shiftKey) { OMA.WM.open('browser'); return; }
      if (e.ctrlKey) { OMA.WM.open('agent'); return; }
      if (e.altKey) { openTmux(); return; }
      openTerminal(); return;
    }
    if (name === 'N' && e.shiftKey) { OMA.WM.open('editor'); return; }
    if (name === 'F' && e.shiftKey) { OMA.WM.open('files'); return; }
    if (name === 'F' && e.shiftKey && e.altKey) { OMA.WM.open('files', OMA.Term.HOME()); return; }
    if (name === 'A' && e.shiftKey && e.altKey) { OMA.WM.open('web-grok'); return; }
    if (name === 'A' && e.shiftKey && e.ctrlKey) { OMA.Shell.notify({ app: 'Agents', icon: 'agent', summary: 'Pick an AI agent', body: 'Setup → Defaults → Agent' }); return; }
    if (name === 'A' && e.shiftKey) { OMA.WM.open('web-gpt'); return; }
    if (name === 'G' && e.shiftKey && e.altKey) { OMA.WM.open('web-x'); return; }
    if (name === 'X' && e.shiftKey && e.altKey) { OMA.Shell.osd({ icon: 'browser', label: 'X Compose', value: 'opening' }); OMA.WM.open('web-x'); return; }
    if (name === 'X' && e.shiftKey && e.ctrlKey) { OMA.Shell.osd({ icon: 'browser', label: 'Google Messages' }); return; }
    if (name === 'B' && e.shiftKey) { OMA.WM.open('browser'); return; }
    if (name === 'M' && e.shiftKey && e.altKey) { OMA.WM.open('cliamp'); return; }
    if (name === 'M' && e.shiftKey) { OMA.Shell.notify({ app: 'Music', icon: 'music', summary: 'Spotify', body: 'Spotify is an optional Install → Service app.' }); return; }
    if (name === 'N' && e.shiftKey) { OMA.WM.open('editor'); return; }
    if (name === 'O' && e.shiftKey) { OMA.WM.open('web-obsidian'); return; }
    if (name === 'P' && e.shiftKey) { OMA.WM.open('web-photos'); return; }
    if (name === 'S' && e.shiftKey) { OMA.WM.open('web-google-maps'); return; }
    if (name === 'W' && e.shiftKey) { OMA.WM.open('editor', OMA.Term.HOME() + '/Documents/omarchy-notes.md'); return; }
    if (name === 'Y' && e.shiftKey) { OMA.WM.open('web-youtube'); return; }
    if (name === 'E' && e.shiftKey && e.altKey) { OMA.WM.open('web-hey'); return; }
    if (name === 'E' && e.shiftKey) { OMA.WM.open('web-hey'); return; }
    if (name === 'C' && e.shiftKey) { OMA.WM.open('web-hey'); return; }
    if (name === 'G' && e.shiftKey) { OMA.WM.open('web-whatsapp' in OMA.WM.registry ? 'web-whatsapp' : 'web-x'); return; }

    /* System controls. */
    if (name === 'A' && e.ctrlKey) { openPanelSafe('audio'); return; }
    if (name === 'B' && e.ctrlKey) { openPanelSafe('bluetooth'); return; }
    if (name === 'W' && e.ctrlKey) { openPanelSafe('network'); return; }
    if (name === 'D' && e.ctrlKey && e.altKey) { openPanelSafe('calendar'); return; }
    if (name === 'D' && e.ctrlKey) { openPanelSafe('display'); return; }
    if (name === 'E' && e.ctrlKey && e.altKey) { worldClock(); return; }
    if (name === 'E' && e.ctrlKey) { cap.emojiPicker(); return; }
    if (/^[1-9]$/.test(name) && e.ctrlKey) { OMA.Shell.osd({ icon: 'layout', label: 'Bar indicators', value: 'toggled' }); return; }
    if (name === 'S' && e.ctrlKey) { OMA.Shell.notify({ app: 'LocalSend', icon: 'globe', summary: 'Share', body: 'Pick a file, folder or the clipboard to share.' }); return; }
    if (name === 'T' && e.ctrlKey) { OMA.WM.open('btop'); return; }
    if (name === 'C' && e.ctrlKey) { cap.screenshot('region'); return; }
    if (name === 'O' && e.ctrlKey) { OMA.Menu.toggle('all'); return; }
    if (name === 'H' && e.ctrlKey) { OMA.WM.open('btop'); return; }
    if (name === 'Q' && e.ctrlKey) { OMA.WM.open('calc'); return; }
    if (name === 'Period' && e.ctrlKey) { OMA.WM.open('terminal', { run: 'omarchy transcode ~/Videos/demo.mov mp4 1080p' }); return; }
    if (name === 'X' && e.ctrlKey) { cap.dictate(!OMA.System.dictating); return; }
    if (name === 'K' && e.altKey) { tmuxHelp(); return; }
    if (name === 'K' && e.ctrlKey) { OMA.WM.open('agent'); return; }
    if (name === 'K') { OMA.Menu.keybindingsOverlay(); return; }

    /* Toggles. */
    if (name === 'I' && e.ctrlKey) { OMA.Shell.osd({ icon: 'lock', label: 'Idle locking', value: 'toggled' }); return; }
    if (name === 'N' && e.ctrlKey) { sys.toggleNightlight(); return; }
    if (name === 'Delete' && e.ctrlKey) { OMA.Shell.osd({ icon: 'monitor', label: 'Laptop display', value: 'toggled' }); return; }
    if (name === 'Comma' && !e.ctrlKey) { if (e.shiftKey) OMA.Shell.dismissAll(); else if (e.altKey) OMA.Shell.notificationHistory(); else OMA.Shell.dismissLatest(); return; }
    if (name === 'Comma' && e.ctrlKey) { sys.toggleSilence(); return; }

    /* Reminders. */
    if (name === 'R' && e.ctrlKey && e.shiftKey) { OMA.Shell.clearReminders(); return; }
    if (name === 'R' && e.ctrlKey && e.altKey) { OMA.Shell.showReminders(); return; }
    if (name === 'R' && e.ctrlKey) { OMA.Shell.remind(); return; }

    /* Notices. */
    if (name === 'T' && e.ctrlKey && e.altKey) { OMA.Shell.notify({ app: 'Clock', icon: 'clock', summary: fmtClock() }); return; }
    if (name === 'B' && e.ctrlKey && e.altKey) { OMA.Shell.notify({ app: 'Power', icon: 'battery', summary: 'Battery 84%', body: '2 h 10 min remaining (charged to 80% limit).' }); return; }
    if (name === 'W' && e.ctrlKey && e.altKey) { OMA.Shell.notify({ app: 'Weather', icon: 'weather', summary: 'Copenhagen', body: 'Partly cloudy, 14°C, wind 6 m/s west.' }); return; }

    /* Theme picker as a menu. */
    if (name === 'Backslash') { OMA.System.nextTheme(e.shiftKey); return; }

    /* Anything else with Super: nudge the user rather than doing nothing. */
    Keys.lastChord = chordOf(e);
  }

  function fmtClock() { return OMA.fmt.longClock(); }

  function copySelection() {
    var sel = window.getSelection().toString();
    if (sel) { OMA.Capture.copy(sel, 'selection'); OMA.Shell.osd({ icon: 'clipboard', label: 'Copied', value: sel.slice(0, 40) }); }
    else OMA.Shell.osd({ icon: 'clipboard', label: 'Nothing selected' });
  }
  function cutSelection() {
    var sel = window.getSelection().toString();
    if (sel) { OMA.Capture.copy(sel, 'selection'); OMA.Shell.osd({ icon: 'clipboard', label: 'Cut', value: sel.slice(0, 40) }); }
  }
  function pasteClipboard() {
    var text = OMA.Capture.paste();
    var target = document.activeElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      var start = target.selectionStart || 0;
      target.value = target.value.slice(0, start) + text + target.value.slice(target.selectionEnd || start);
      target.selectionStart = target.selectionEnd = start + text.length;
    }
    OMA.Shell.osd({ icon: 'clipboard', label: 'Pasted', value: (text || '').slice(0, 40) || 'clipboard empty' });
  }

  function openTerminal() { OMA.WM.open('terminal'); }
  function openTmux() {
    OMA.WM.open('terminal', { run: 'tmux new -s omarchy' });
  }
  function openPanelSafe(name) {
    OMA.Shell.closePanel();
    OMA.Shell.togglePanel(name, OMA.$('.oma-bar') || document.body);
    var p = OMA.$('#omarchy-panel-host .oma-panel');
    if (p) { p.style.left = Math.round(window.innerWidth / 2 - (p.offsetWidth || 320) / 2) + 'px'; p.style.top = '34px'; }
  }
  function worldClock() {
    var body = h('div');
    var now = new Date();
    [['Copenhagen', 1], ['Seoul', 9], ['New York', -4], ['San Francisco', -7], ['Tokyo', 9], ['Berlin', 2]].forEach(function (c) {
      var off = c[1] - (-now.getTimezoneOffset() / 60);
      var t = new Date(now.getTime() + off * 3600000);
      body.appendChild(h('div.oma-panel-item', [
        h('div', { text: c[0] }), h('div.oma-panel-meta', { text: OMA.fmt.clock(t) })
      ]));
    });
    OMA.Shell.openPanelCustom('World clock', body, 'globe');
  }
  function tmuxHelp() {
    OMA.Menu.overlay('tmux2', 'Tmux — Super + Alt + K', [
      'Prefix is Ctrl + Space (Ctrl + B also works).',
      '',
      'Panes      Prefix + v (beside)   Prefix + h (below)   Prefix + x (kill)   Prefix + z (zoom)',
      '           Alt + Enter (split below, no prefix)   Alt + Shift + Enter (split beside)',
      '           Ctrl + Alt + arrows (move)   Ctrl + Alt + Shift + arrows (resize)',
      'Windows    Prefix + c / k / r      Alt + 1-9      Alt + ←/→',
      'Sessions   Prefix + C / K / R / N / P      Alt + ↑/↓      Prefix + s / d',
      'Copy mode  Prefix + [      then v to select, y to copy',
      'General    Prefix + q (reload)   Prefix + ? (keys)   Prefix + : (command)',
      'Layouts    tdl <ai>   tdlm <ai>   tsl <count> <command>'
    ]);
  }
  function cycleWindows(d) {
    var list = OMA.WM.listActive();
    if (list.length < 2) return;
    var cur = OMA.WM.ws().focus;
    var i = list.findIndex(function (w) { return w.wid === cur; });
    i = (i + d + list.length) % list.length;
    OMA.WM.focus(list[i].wid);
  }
  function cycleMonitors(d) {
    OMA.Shell.osd({ icon: 'monitor', label: 'Monitor', value: 'eDP-1 (only display attached)' });
  }
  function cycleGroup(d) {
    var members = OMA.WM.groupMembers(OMA.WM.ws().focus);
    if (!members || members.length < 2) { cycleWindows(d); return; }
    var cur = OMA.WM.ws().focus;
    var i = (members.indexOf(cur) + d + members.length) % members.length;
    OMA.WM.focus(members[i]);
    OMA.Shell.osd({ icon: 'layers', label: 'Group', value: (i + 1) + ' / ' + members.length });
  }
  function groupMove(dir) {
    OMA.WM.focusDir(dir);
    OMA.Shell.osd({ icon: 'layers', label: 'Grouping', value: 'moved ' + dir });
  }
  function toggleFullDesktop() {
    OMA.WM.setBar(!OMA.WM.barVisible);
    OMA.WM.setGaps(!OMA.WM.gaps);
    OMA.Shell.osd({ icon: 'monitor', label: 'Full screen desktop', value: 'toggled' });
  }

  /* ------------------------------------------------- keybinding reference */
  Keys.groups = function () {
    var S = OMA.Settings ? OMA.Settings.superLabel() : 'Super';
    function k(s) { return s.replace(/Super/g, S).split(' + '); }
    return [
      {
        title: 'The menu', binds: [
          { keys: k('Super + Space'), desc: 'Omarchy menu — every app and every command' },
          { keys: k('Super + Alt + Space'), desc: 'Apps-only menu (the old Walker launcher)' },
          { keys: k('Super + Esc'), desc: 'System menu: screensaver, lock, suspend, logout, reboot, shutdown' },
          { keys: k('Super + K'), desc: 'This keybinding list' },
          { keys: k('Super + Ctrl + O'), desc: 'Toggle the menu' }
        ]
      },
      {
        title: 'Windows', binds: [
          { keys: k('Super + Arrow'), desc: 'Move focus to the window in that direction' },
          { keys: k('Super + Shift + Arrow'), desc: 'Swap the window with its neighbour' },
          { keys: k('Super + T'), desc: 'Toggle tiling / floating' },
          { keys: k('Super + O'), desc: 'Pop the window into sticky and floating' },
          { keys: k('Super + W / Super + Q'), desc: 'Close the focused window' },
          { keys: k('Ctrl + Alt + Del'), desc: 'Close every window' },
          { keys: k('Super + J'), desc: 'Toggle the window split direction' },
          { keys: k('Super + P'), desc: 'Toggle pseudo (stretch) window style' },
          { keys: k('Super + F'), desc: 'Fullscreen the focused window' },
          { keys: k('Super + Alt + F'), desc: 'Full width' },
          { keys: k('Super + Ctrl + F'), desc: 'Maximise inside the tiling area' },
          { keys: k('Super + Ctrl + Alt + F'), desc: 'Full screen desktop — hide bar and gaps' },
          { keys: k('Super + L'), desc: 'Cycle dwindle → scrolling → floating' },
          { keys: k('Super + Alt + L'), desc: 'Cycle layouts in reverse' },
          { keys: k('Super + Minus / Equal'), desc: 'Resize (smaller with Alt, bigger with Ctrl)' },
          { keys: k('Super + Alt + Home'), desc: 'Save the window width' },
          { keys: k('Super + Home'), desc: 'Restore the saved width' }
        ]
      },
      {
        title: 'Workspaces, groups, scratchpad', binds: [
          { keys: k('Super + 1…9'), desc: 'Jump to a workspace' },
          { keys: k('Super + Shift + 1…9'), desc: 'Move the window to a workspace' },
          { keys: k('Super + Shift + Alt + 1…9'), desc: 'Move it without following' },
          { keys: k('Super + Tab'), desc: 'Next workspace' },
          { keys: k('Super + Shift + Tab'), desc: 'Previous workspace' },
          { keys: k('Super + Ctrl + Tab'), desc: 'Jump to the former workspace' },
          { keys: k('Super + S / Super + Grave'), desc: 'Toggle the scratchpad' },
          { keys: k('Super + Alt + S'), desc: 'Move the window into the scratchpad' },
          { keys: k('Super + G'), desc: 'Toggle grouping (tabbed stack)' },
          { keys: k('Super + Alt + G'), desc: 'Move the window out of the group' },
          { keys: k('Super + Alt + Tab'), desc: 'Cycle windows inside the group' },
          { keys: k('Super + Ctrl + Left/Right'), desc: 'Move between windows in a group' }
        ]
      },
      {
        title: 'Launching', binds: [
          { keys: k('Super + Return'), desc: 'Terminal (Foot)' },
          { keys: k('Super + Alt + Return'), desc: 'Terminal running tmux' },
          { keys: k('Super + Ctrl + Return'), desc: 'Herdr — the agent manager' },
          { keys: k('Super + Shift + Return'), desc: 'Browser (Chromium)' },
          { keys: k('Super + Shift + N'), desc: 'Editor (Neovim)' },
          { keys: k('Super + Shift + F'), desc: 'File manager' },
          { keys: k('Super + Ctrl + T'), desc: 'Activity (btop)' },
          { keys: k('Super + Shift + M'), desc: 'Music (cliamp is Super + Shift + Alt + M)' },
          { keys: k('Super + Shift + A'), desc: 'AI (ChatGPT) — Grok is Super + Shift + Alt + A' },
          { keys: k('Super + Shift + X'), desc: 'X — compose with Super + Shift + Alt + X' },
          { keys: k('Super + Shift + Y'), desc: 'YouTube' },
          { keys: k('Super + Shift + O'), desc: 'Obsidian' },
          { keys: k('Super + Shift + E'), desc: 'Email (HEY) — new mail is Super + Shift + Alt + E' },
          { keys: k('Super + Shift + S'), desc: 'Google Maps' },
          { keys: k('Super + Ctrl + Q'), desc: 'Calculator' }
        ]
      },
      {
        title: 'Clipboard', binds: [
          { keys: k('Super + C'), desc: 'Copy — works everywhere, including the terminal' },
          { keys: k('Super + X'), desc: 'Cut' },
          { keys: k('Super + V'), desc: 'Paste' },
          { keys: k('Super + Ctrl + V'), desc: 'Clipboard history' }
        ]
      },
      {
        title: 'Capture', binds: [
          { keys: k('Print Screen'), desc: 'Screenshot (here: Ctrl + Alt + S)' },
          { keys: k('Alt + Print Screen'), desc: 'Screen record (here: Ctrl + Alt + R)' },
          { keys: k('Super + Print Screen'), desc: 'Colour picker (here: Ctrl + Alt + Q)' },
          { keys: k('Super + Ctrl + Print Screen'), desc: 'Text extraction via OCR' },
          { keys: k('Super + Ctrl + C'), desc: 'Capture menu' },
          { keys: k('Super + Ctrl + X'), desc: 'Start / stop dictation' }
        ]
      },
      {
        title: 'Style and toggles', binds: [
          { keys: k('Super + Ctrl + Shift + Space'), desc: 'Pick a new theme' },
          { keys: k('Super + Ctrl + Space'), desc: 'Pick a theme background' },
          { keys: k('Super + Shift + Space'), desc: 'Toggle the top bar' },
          { keys: k('Super + Shift + Backspace'), desc: 'Toggle window gaps' },
          { keys: k('Super + Backspace'), desc: 'Toggle transparency on the window' },
          { keys: k('Super + Ctrl + Backspace'), desc: 'Toggle square aspect' },
          { keys: k('Super + Ctrl + N'), desc: 'Toggle nightlight' },
          { keys: k('Super + Ctrl + I'), desc: 'Toggle locking on idle' },
          { keys: k('Super + Ctrl + Z'), desc: 'Zoom in (Super + Ctrl + Alt + Z resets)' },
          { keys: k('Super + /'), desc: 'Step through monitor scaling' }
        ]
      },
      {
        title: 'Panels, notices, reminders', binds: [
          { keys: k('Super + Ctrl + A'), desc: 'Audio panel' },
          { keys: k('Super + Ctrl + B'), desc: 'Bluetooth panel' },
          { keys: k('Super + Ctrl + W'), desc: 'Network panel' },
          { keys: k('Super + Ctrl + D'), desc: 'Display panel' },
          { keys: k('Super + Ctrl + P'), desc: 'Power panel' },
          { keys: k('Super + Ctrl + Alt + D'), desc: 'Calendar panel' },
          { keys: k('Super + Ctrl + Alt + E'), desc: 'World clock panel' },
          { keys: k('Super + ,'), desc: 'Dismiss the latest notification' },
          { keys: k('Super + Shift + ,'), desc: 'Dismiss all notifications' },
          { keys: k('Super + Ctrl + ,'), desc: 'Silence notifications' },
          { keys: k('Super + Alt + ,'), desc: 'Invoke the most recent notification' },
          { keys: k('Super + Shift + Alt + ,'), desc: 'Notification history' },
          { keys: k('Super + Ctrl + R'), desc: 'Set a reminder' },
          { keys: k('Super + Ctrl + Alt + T'), desc: 'Show the time as a notification' },
          { keys: k('Super + Ctrl + Alt + B'), desc: 'Show the battery as a notification' }
        ]
      },
      {
        title: 'Media and brightness', binds: [
          { keys: ['Volume Up / Down'], desc: '5% steps — hold Alt for 1%, hold Shift for maximum' },
          { keys: ['Mute'], desc: 'Toggle mute — hold Shift for the next audio output' },
          { keys: ['Brightness Up / Down'], desc: '5% steps — Alt for 1%, Shift for maximum or minimum' },
          { keys: ['Play / Pause'], desc: 'Media transport — Alt skips, Alt + Shift goes back' }
        ]
      },
      {
        title: 'Inside the terminal', binds: [
          { keys: ['Tab'], desc: 'Complete commands and paths' },
          { keys: ['↑ / ↓'], desc: 'Walk the history' },
          { keys: ['Ctrl + L'], desc: 'Clear the screen' },
          { keys: ['Ctrl + C'], desc: 'Cancel the current line' },
          { keys: ['Ctrl + U'], desc: 'Clear the line' }
        ]
      },
      {
        title: 'Inside Neovim', binds: [
          { keys: ['Space'], desc: 'Show command options' },
          { keys: ['Space E'], desc: 'Toggle the sidebar' },
          { keys: ['Space G G'], desc: 'lazygit' },
          { keys: ['Space B D'], desc: 'Close the buffer' },
          { keys: ['H / L'], desc: 'Previous / next buffer' },
          { keys: [':w :q :wq :e <file>'], desc: 'Write, quit, write-and-quit, edit' }
        ]
      }
    ];
  };

  Keys.install = function () {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'CapsLock') {
        Keys.superDown = true;
        OMA.bus.emit('keys:super', true);
        /* Caps Lock would otherwise toggle; suppress that where possible. */
        e.preventDefault();
        return;
      }
      try { handle(e, 'down'); } catch (err) { OMA.log('keys', err); }
    }, true);

    window.addEventListener('keyup', function (e) {
      if (e.key === 'CapsLock') {
        Keys.superDown = false;
        OMA.bus.emit('keys:super', false);
        e.preventDefault();
      }
    }, true);

    /* A lost focus must not leave Super stuck down. */
    window.addEventListener('blur', function () { Keys.superDown = false; });
  };

  Keys.handle = handle;
  Keys.chordOf = chordOf;
  OMA.Keys = Keys;
})(window.OMA = window.OMA || {});
