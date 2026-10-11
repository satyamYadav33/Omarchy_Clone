/* ============================================================================
 * Omarchy Web Clone — system.js
 * ----------------------------------------------------------------------------
 * The part of the shell that talks to "hardware": audio, brightness, nightlight,
 * display scaling, wallpapers, fonts, theme persistence, package management,
 * updates, channels, and the About screen.
 *
 * Every `omarchy <group> <command>` the menu invokes lands here.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, fmt = OMA.fmt, I = OMA.Shell.icons;

  var Sys = {
    volume: 46, mic: 62, brightness: 78, muted: false,
    nightlight: false, btOn: true, stayAwake: false, recording: false,
    themeId: 'tokyo-night', wallIndex: 0, font: 'JetBrainsMono Nerd Font',
    clockAlt: false, tzLabel: 'Copenhagen', scaleLabel: '1.6x',
    barPos: 'top', barTransparent: false, animations: true,
    channel: 'stable', updates: 2, silenced: false,
    defaults: { agent: 'Claude', browser: 'Chromium', terminal: 'Foot', editor: 'Neovim', dictation: 'Voxtype' },
    packages: {}
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ----------------------------------------------------------------- audio */
  Sys.applyAudio = function () {
    OMA.bus.emit('audio:changed', { volume: Sys.volume, muted: Sys.muted });
  };
  Sys.setVolume = function (v, quiet) {
    Sys.volume = clamp(Math.round(v), 0, 100);
    if (Sys.volume > 0 && Sys.muted) Sys.muted = false;
    Sys.applyAudio();
    if (!quiet) OMA.Shell.osd({ type: 'level', icon: Sys.muted ? 'mute' : 'volume', label: 'Volume', value: Sys.volume });
    OMA.Shell.renderBar();
  };
  Sys.setMuted = function (m) {
    Sys.muted = m;
    Sys.applyAudio();
    OMA.Shell.osd({ type: 'level', icon: m ? 'mute' : 'volume', label: m ? 'Muted' : 'Volume', value: Sys.volume });
    OMA.Shell.renderBar();
  };
  Sys.volumeStep = function (d) { Sys.setVolume(Sys.volume + d); };

  /* ------------------------------------------------------------ brightness */
  Sys.applyDisplay = function () {
    document.documentElement.style.setProperty('--screen-brightness', (0.45 + (Sys.brightness / 100) * 0.55).toFixed(3));
    OMA.bus.emit('display:changed', { brightness: Sys.brightness });
  };
  Sys.stepBrightness = function (d) {
    Sys.brightness = clamp(Sys.brightness + d, 10, 100);
    Sys.applyDisplay();
    OMA.Shell.osd({ type: 'level', icon: 'sun', label: 'Brightness', value: Sys.brightness });
    OMA.Shell.renderBar();
  };
  Sys.setBrightnessMax = function (v) {
    Sys.brightness = v ? 100 : 10;
    Sys.applyDisplay();
    OMA.Shell.osd({ icon: 'sun', label: 'Brightness', value: Sys.brightness + '%' });
  };

  /* ------------------------------------------------------------ nightlight */
  Sys.toggleNightlight = function (force) {
    Sys.nightlight = force == null ? !Sys.nightlight : !!force;
    document.documentElement.classList.toggle('nightlight', Sys.nightlight);
    OMA.Shell.osd({ icon: 'moon', label: 'Nightlight', value: Sys.nightlight ? '4000K' : '6500K' });
    OMA.Shell.renderBar();
  };

  /* --------------------------------------------------------- notifications */
  Sys.toggleSilence = function () {
    Sys.silenced = !Sys.silenced;
    OMA.Shell.osd({ icon: 'bell', label: 'Notifications', value: Sys.silenced ? 'silenced' : 'on' });
    OMA.Shell.renderBar();
  };

  /* -------------------------------------------------------------- theming */
  Sys.setTheme = function (id, quiet) {
    var t = OMA.Themes.apply(id);
    Sys.themeId = t.id;
    OMA.Store.set('theme', t.id);
    if (!quiet) {
      OMA.Shell.osd({ icon: 'palette', label: 'Theme', value: t.name });
      OMA.Shell.renderBar();
      OMA.Syslog && OMA.Syslog.push('omarchy-theme-set', 'Tokyo Night' === t.name ? 'default theme' : t.name);
    }
    OMA.bus.emit('theme:changed', t);
  };
  Sys.nextTheme = function (back) {
    var idx = OMA.Themes.list.findIndex(function (t) { return t.id === Sys.themeId; });
    idx = (idx + (back ? -1 : 1) + OMA.Themes.list.length) % OMA.Themes.list.length;
    Sys.setTheme(OMA.Themes.list[idx].id);
  };
  Sys.cycleTheme = function () { Sys.nextTheme(false); };

  /* ------------------------------------------------------------ wallpaper */
  Sys.setWallpaper = function (idx) {
    Sys.wallIndex = ((idx % OMA.Wallpapers.set.length) + OMA.Wallpapers.set.length) % OMA.Wallpapers.set.length;
    Sys.paintWallpaper();
    OMA.bus.emit('wallpaper:changed', OMA.Wallpapers.set[Sys.wallIndex]);
  };
  Sys.nextWallpaper = function () {
    Sys.setWallpaper(Sys.wallIndex + 1);
    OMA.Shell.osd({ icon: 'monitor', label: 'Background', value: OMA.Wallpapers.set[Sys.wallIndex].name });
  };
  Sys.paintWallpaper = function () {
    var host = OMA.$('#omarchy-wallpaper');
    if (!host) return;
    var t = OMA.Themes.current;
    var wp = OMA.Wallpapers.cssFor(Sys.wallIndex, t);
    OMA.clear(host);
    var layer = h('div.oma-wall', { style: { backgroundImage: 'url("' + wp.url + '")' } });
    host.appendChild(layer);
    OMA.Store.set('wallpaper', Sys.wallIndex);
    void layer.offsetWidth;
    layer.classList.add('is-in');
  };

  /* ----------------------------------------------------------------- font */
  Sys.setFont = function (name) {
    Sys.font = name;
    document.documentElement.style.setProperty('--font-mono', '"' + name + '", "JetBrainsMono Nerd Font", ui-monospace, monospace');
    OMA.Shell.osd({ icon: 'edit', label: 'Font', value: name });
    OMA.Store.set('font', name);
  };

  Sys.setDefault = function (kind, value) {
    Sys.defaults[kind] = value;
    OMA.Store.set('defaults', Sys.defaults);
    OMA.Shell.osd({ icon: 'check', label: 'Default ' + kind, value: value });
    OMA.bus.emit('defaults:changed', Sys.defaults);
  };

  Sys.setChannel = function (ch) {
    Sys.channel = ch;
    OMA.Shell.osd({ icon: 'globe', label: 'Channel', value: ch + (ch === 'stable' ? ' (mirror lags a month)' : '') });
    OMA.Syslog && OMA.Syslog.push('omarchy-channel', ch);
  };

  /* ---------------------------------------------------------- packages */
  Sys.install = function (pkg, group) {
    if (Sys.packages[pkg] === 'installed') {
      OMA.Shell.notify({ app: 'omarchy', icon: 'info', summary: pkg + ' is already installed', body: group ? 'From the ' + group + ' group.' : '' });
      return;
    }
    Sys.packages[pkg] = 'installing';
    var term = OMA.WM.open('terminal', { run: 'omarchy install "' + pkg + '"' });
    OMA.bus.emit('pkg:install', { pkg: pkg, group: group });
  };
  Sys.remove = function (pkg) {
    Sys.packages[pkg] = 'removing';
    OMA.WM.open('terminal', { run: 'omarchy remove "' + pkg + '"' });
  };

  /* ------------------------------------------------------------- updates */
  Sys.update = function () {
    var term = OMA.WM.open('terminal', { run: 'omarchy update' });
    OMA.bus.emit('update:started');
  };

  Sys.speedTest = function (kind) {
    if (kind === 'disk') {
      OMA.Shell.notify({ app: 'Speed Test', icon: 'activity', summary: 'Disk', body: 'Sequential read 5.4 GB/s · write 4.1 GB/s (NVMe)' });
    } else {
      OMA.Shell.notify({ app: 'Speed Test', icon: 'globe', summary: 'Network', body: 'Ping 8 ms · down 512 Mb/s · up 508 Mb/s' });
    }
  };

  /* --------------------------------------------------------------- about */
  Sys.about = function () {
    var t = OMA.Themes.current;
    var lines = [
      '                    ///                    ',
      '                 ///////                  ' + (OMA.Store.get('name') || 'Omarchy User') + '@oma-arch',
      '              ///////////                ' + '-----------------------',
      '           ///////  ///////              OS: Omarchy 4.0.4 (Quattro) x86_64',
      '        ///////        ///////           Host: Omarchy Web Clone',
      '     ////////////////////////////        Kernel: linux-omarchy 6.16.4',
      '   ///////                    ///////    Uptime: ' + OMA.Syslog.uptime(),
      '  /////////////////////////////////      Shell: bash 5.3.3',
      '                                         WM: Hyprland (Lua config)',
      '                                         Bar: Quickshell (omarchy-shell)',
      '                                         Terminal: Foot',
      '                                         Editor: Neovim + LazyVim',
      '                                         Theme: ' + t.name + ' (' + t.mode + ')',
      '                                         Accent: ' + t.accent,
      '                                         Font: ' + Sys.font,
      '                                         Channel: ' + Sys.channel,
      '                                         Packages: ' + (1180 + Object.keys(Sys.packages).length),
      '                                         Memory: 3.1 GiB / 32 GiB',
      '                                         Disk (/): 84 GiB / 1.9 TiB (5%)'
    ];
    OMA.Menu.overlay('about', 'About — fastfetch', lines);
  };

  /* ------------------------------------------------------------ reminders */
  Sys.reminders = [];
  Sys.addReminder = function (text, when) {
    Sys.reminders.push({ text: text, when: when, ts: Date.now() });
    OMA.Shell.notify({ app: 'Reminders', icon: 'bell', summary: 'Reminder set', body: text + (when ? ' — ' + when : '') });
  };

  /* -------------------------------------------------------------- screens */
  Sys.applyFromStore = function () {
    var st = OMA.Store;
    Sys.themeId = st.get('theme') || 'tokyo-night';
    Sys.wallIndex = st.get('wallpaper') || 0;
    Sys.brightness = st.get('brightness') || 78;
    Sys.volume = st.get('volume') || 46;
    Sys.defaults = st.get('defaults') || Sys.defaults;
    Sys.font = st.get('font') || Sys.font;
    Sys.animations = st.get('animations') !== false;
  };
  Sys.persist = function () {
    var st = OMA.Store;
    st.set('brightness', Sys.brightness);
    st.set('volume', Sys.volume);
    st.set('animations', Sys.animations);
  };

  OMA.System = Sys;
})(window.OMA = window.OMA || {});
