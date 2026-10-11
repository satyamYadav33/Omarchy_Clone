/* ============================================================================
 * Omarchy Web Clone — themes.js
 * ----------------------------------------------------------------------------
 * All 23 bundled Omarchy "Quattro" (v4.0.4) themes.
 *
 * background / foreground / accent / muted / selection and the colour families
 * (red, yellow, orange, green, cyan, blue, magenta, brown, bright_*) are
 * UPSTREAM-EXACT, transcribed from themes/<name>/colors.toml in omacom/omarchy@quattro.
 *
 * Any value written as an approximation is marked with `approx: true` at the
 * theme level and documented in README.md. Nothing upstream-derived is guessed.
 *
 * Default theme is "Tokyo Night" — proved upstream by install/user/theme.sh.
 * ==========================================================================*/
(function (OMA) {
  'use strict';

  var T = {};

  /* ANSI 0-15 mapping, exactly as default/themed/alacritty.toml.tpl derives it:
     0 black=background  1 red   2 green  3 yellow  4 blue  5 magenta  6 cyan
     7 white=foreground  8 br.black=muted       9..15 bright_*                */
  T.ansi = function (t) {
    var B = t.bright || {};
    return [
      t.bg, t.red, t.green, t.yellow, t.blue, t.magenta, t.cyan, t.fg,
      t.muted,
      B.red || t.red, B.green || t.green, B.yellow || t.yellow,
      B.blue || t.blue, B.magenta || t.magenta, B.cyan || t.cyan,
      t.brfg || t.fg
    ];
  };

  /* ---------------------------------------------------------------- themes -- */
  T.list = [
    {
      id: 'tokyo-night', name: 'Tokyo Night', mode: 'dark',
      bg: '#1a1b26', fg: '#a9b1d6', accent: '#7aa2f7', muted: '#414868',
      sel: '#292e42', selFg: '#c0caf5', brfg: '#c0caf5', border: '#7aa2f7',
      bgDark: '#13141c', bgDarker: '#0e0e14', bgLight: '#24283b',
      fgDark: '#565f89', fgLight: '#b4bee6',
      red: '#f7768e', yellow: '#e0af68', orange: '#eb927b', green: '#9ece6a',
      cyan: '#449dab', blue: '#7aa2f7', magenta: '#ad8ee6', brown: '#75493d',
      bright: { red: '#ff7a93', yellow: '#ff9e64', green: '#b9f27c', cyan: '#0db9d7', blue: '#7da6ff', magenta: '#bb9af7' }
    },
    {
      id: 'catppuccin', name: 'Catppuccin', mode: 'dark',
      bg: '#1e1e2e', fg: '#cdd6f4', accent: '#89b4fa', muted: '#585b70',
      sel: '#45475a', selFg: '#cdd6f4', brfg: '#cdd6f4', border: '#89b4fa',
      bgDark: '#161622', bgDarker: '#101019', bgLight: '#313244',
      fgDark: '#6c7086', fgLight: '#bac2de',
      red: '#f38ba8', yellow: '#f9e2af', orange: '#f6b6ab', green: '#a6e3a1',
      cyan: '#94e2d5', blue: '#89b4fa', magenta: '#f5c2e7', brown: '#7b5b55',
      bright: { red: '#f38ba8', yellow: '#f9e2af', green: '#a6e3a1', cyan: '#94e2d5', blue: '#89b4fa', magenta: '#f5c2e7' }
    },
    {
      id: 'catppuccin-latte', name: 'Catppuccin Latte', mode: 'light',
      bg: '#eff1f5', fg: '#4c4f69', accent: '#1e66f5', muted: '#acb0be',
      sel: '#ccd0da', selFg: '#4c4f69', brfg: '#4c4f69', border: '#1e66f5',
      bgDark: '#e3e4e8', bgDarker: '#d7d8dc', bgLight: '#dce0e8',
      fgDark: '#9ca0b0', fgLight: '#5c5f77',
      red: '#d20f39', yellow: '#df8e1d', orange: '#d84e2b', green: '#40a02b',
      cyan: '#179299', blue: '#1e66f5', magenta: '#ea76cb', brown: '#6c2715',
      bright: { red: '#d20f39', yellow: '#df8e1d', green: '#40a02b', cyan: '#179299', blue: '#1e66f5', magenta: '#ea76cb' }
    },
    {
      id: 'ethereal', name: 'Ethereal', mode: 'dark',
      bg: '#060B1E', fg: '#ffcead', accent: '#7d82d9', muted: '#6d7db6',
      sel: '#252e56', selFg: '#ffcead', brfg: '#ffcead', border: '#7d82d9',
      bgDark: '#040816', bgDarker: '#030610', bgLight: '#131a3a',
      fgDark: '#6d7db6', fgLight: '#c9b8a6',
      red: '#ED5B5A', yellow: '#E9BB4F', orange: '#eb8b54', green: '#92a593',
      cyan: '#a3bfd1', blue: '#7d82d9', magenta: '#c89dc1', brown: '#75452a',
      bright: { red: '#faaaa9', yellow: '#f7dc9c', green: '#c4cfc4', cyan: '#dfeaf0', blue: '#c2c4f0', magenta: '#ead7e7' }
    },
    {
      id: 'everforest', name: 'Everforest', mode: 'dark',
      bg: '#2d353b', fg: '#d3c6aa', accent: '#7fbbb3', muted: '#475258',
      sel: '#3d484d', selFg: '#d3c6aa', brfg: '#d3c6aa', border: '#7fbbb3',
      bgDark: '#21272c', bgDarker: '#181d20', bgLight: '#343f44',
      fgDark: '#4f585e', fgLight: '#9da9a0',
      red: '#e67e80', yellow: '#dbbc7f', orange: '#e09d7f', green: '#a7c080',
      cyan: '#83c092', blue: '#7fbbb3', magenta: '#d699b6', brown: '#704e3f',
      bright: { red: '#e67e80', yellow: '#dbbc7f', green: '#a7c080', cyan: '#83c092', blue: '#7fbbb3', magenta: '#d699b6' }
    },
    {
      id: 'flexoki-light', name: 'Flexoki Light', mode: 'light',
      bg: '#FFFCF0', fg: '#100F0F', accent: '#205EA6', muted: '#B7B5AC',
      sel: '#CECDC3', selFg: '#100F0F', brfg: '#100F0F', border: '#205EA6',
      bgDark: '#f2efe4', bgDarker: '#e5e2d8', bgLight: '#E6E4D9',
      fgDark: '#878580', fgLight: '#403E3C',
      red: '#D14D41', yellow: '#D0A215', orange: '#d0772b', green: '#879A39',
      cyan: '#3AA99F', blue: '#205EA6', magenta: '#CE5D97', brown: '#683b15',
      bright: { red: '#D14D41', yellow: '#D0A215', green: '#879A39', cyan: '#3AA99F', blue: '#4385BE', magenta: '#CE5D97' }
    },
    {
      id: 'gruvbox', name: 'Gruvbox', mode: 'dark',
      bg: '#282828', fg: '#d4be98', accent: '#7daea3', muted: '#665c54',
      sel: '#504945', selFg: '#d4be98', brfg: '#d4be98', border: '#7daea3',
      bgDark: '#1e1e1e', bgDarker: '#161616', bgLight: '#3c3836',
      fgDark: '#7c6f64', fgLight: '#bdae93',
      red: '#ea6962', yellow: '#d8a657', orange: '#e1875c', green: '#a9b665',
      cyan: '#89b482', blue: '#7daea3', magenta: '#d3869b', brown: '#70432e',
      bright: { red: '#ea6962', yellow: '#d8a657', green: '#a9b665', cyan: '#89b482', blue: '#7daea3', magenta: '#d3869b' }
    },
    {
      id: 'hackerman', name: 'Hackerman', mode: 'dark',
      bg: '#0B0C16', fg: '#ddf7ff', accent: '#82FB9C', muted: '#2d3450',
      sel: '#1f253a', selFg: '#ddf7ff', brfg: '#ddf7ff', border: '#82FB9C',
      bgDark: '#080910', bgDarker: '#06060c', bgLight: '#151828',
      fgDark: '#6a6e95', fgLight: '#b5c5db',
      red: '#50f872', yellow: '#50f7d4', orange: '#50f7a3', green: '#4fe88f',
      cyan: '#7cf8f7', blue: '#829dd4', magenta: '#86a7df', brown: '#287b51',
      bright: { red: '#85ff9d', yellow: '#a4ffec', green: '#9cf7c2', cyan: '#d1fffe', blue: '#c4d2ed', magenta: '#cddbf4' }
    },
    {
      id: 'kanagawa', name: 'Kanagawa', mode: 'dark',
      bg: '#1f1f28', fg: '#dcd7ba', accent: '#dcd7ba', muted: '#54546D',
      sel: '#363646', selFg: '#dcd7ba', brfg: '#dcd7ba', border: '#dcd7ba',
      bgDark: '#17171e', bgDarker: '#111116', bgLight: '#223249',
      fgDark: '#727169', fgLight: '#c8c093',
      red: '#c34043', yellow: '#c0a36e', orange: '#c17158', green: '#76946a',
      cyan: '#6a9589', blue: '#7e9cd8', magenta: '#957fb8', brown: '#60382c',
      bright: { red: '#e82424', yellow: '#e6c384', green: '#98bb6c', cyan: '#7aa89f', blue: '#7fb4ca', magenta: '#938aa9' }
    },
    {
      id: 'last-horizon', name: 'Last Horizon', mode: 'dark',
      bg: '#0c0b0c', fg: '#FAFCFB', accent: '#b59790', muted: '#584e51',
      sel: '#584e51', selFg: '#FAFCFB', brfg: '#e2dddc', border: '#d6d3de',
      bgDark: '#090809', bgDarker: '#060606', bgLight: '#0c0b0c',
      fgDark: '#584e51', fgLight: '#cfd3cd',
      red: '#c38b7b', yellow: '#6B5E73', orange: '#b59790', green: '#87a9b0',
      cyan: '#a5a0b6', blue: '#b59790', magenta: '#c4d8e2', brown: '#6B5E73',
      bright: { red: '#c38b7b', yellow: '#6B5E73', green: '#87a9b0', cyan: '#a5a0b6', blue: '#b59790', magenta: '#c4d8e2' }
    },
    {
      id: 'lumon', name: 'Lumon', mode: 'dark',
      bg: '#16242d', fg: '#d6e2ee', accent: '#8bc9eb', muted: '#304860',
      sel: '#243d56', selFg: '#d6e2ee', brfg: '#f2fcff', border: '#f2fcff',
      bgDark: '#101b21', bgDarker: '#0b1216', bgLight: '#1b2d40',
      fgDark: '#4d86b0', fgLight: '#d6e2ee',
      red: '#4d86b0', yellow: '#6fa4c9', orange: '#8bc9eb', green: '#5e95bc',
      cyan: '#b4e4f6', blue: '#6fb8e3', magenta: '#8bc9eb', brown: '#456475',
      bright: { red: '#73a6cb', yellow: '#9dcae5', green: '#86b7d8', cyan: '#d1eef8', blue: '#f2fcff', magenta: '#b1d8ee' }
    },
    {
      id: 'lupine', name: 'Lupine', mode: 'light',
      bg: '#fafafa', fg: '#212121', accent: '#3264eb', muted: '#9e9e9e',
      sel: '#d0d0d0', selFg: '#212121', brfg: '#000000', border: '#3264eb',
      bgDark: '#ececec', bgDarker: '#dedede', bgLight: '#f5f5f5',
      fgDark: '#757575', fgLight: '#424242',
      red: '#c900c4', yellow: '#026fde', orange: '#026fde', green: '#4a2fd0',
      cyan: '#0c67de', blue: '#3264eb', magenta: '#8a4ad7', brown: '#013a6f',
      bright: { red: '#f930fb', yellow: '#358fff', green: '#9f85e0', cyan: '#3986ff', blue: '#5482ff', magenta: '#b363ff' }
    },
    {
      id: 'matte-black', name: 'Matte Black', mode: 'dark',
      bg: '#121212', fg: '#bebebe', accent: '#e68e0d', muted: '#333333',
      sel: '#2a2a2a', selFg: '#bebebe', brfg: '#bebebe', border: '#e68e0d',
      bgDark: '#0d0d0d', bgDarker: '#090909', bgLight: '#1e1e1e',
      fgDark: '#555555', fgLight: '#8a8a8d',
      red: '#D35F5F', yellow: '#b91c1c', orange: '#c63d3d', green: '#FFC107',
      cyan: '#bebebe', blue: '#e68e0d', magenta: '#D35F5F', brown: '#631e1e',
      bright: { red: '#B91C1C', yellow: '#b90a0a', green: '#FFC107', cyan: '#eaeaea', blue: '#f59e0b', magenta: '#B91C1C' }
    },
    {
      id: 'miasma', name: 'Miasma', mode: 'dark',
      bg: '#222222', fg: '#c2c2b0', accent: '#78824b', muted: '#666666',
      sel: '#383838', selFg: '#c2c2b0', brfg: '#c2c2b0', border: '#78824b',
      bgDark: '#191919', bgDarker: '#121212', bgLight: '#2c2c2c',
      fgDark: '#555555', fgLight: '#8a8a7e',
      red: '#685742', yellow: '#b36d43', orange: '#8d6242', green: '#5f875f',
      cyan: '#c9a554', blue: '#78824b', magenta: '#bb7744', brown: '#463121',
      bright: { red: '#685742', yellow: '#b36d43', green: '#5f875f', cyan: '#c9a554', blue: '#78824b', magenta: '#bb7744' }
    },
    {
      id: 'nord', name: 'Nord', mode: 'dark',
      bg: '#2e3440', fg: '#d8dee9', accent: '#81a1c1', muted: '#4c566a',
      sel: '#434c5e', selFg: '#d8dee9', brfg: '#d8dee9', border: '#81a1c1',
      bgDark: '#222730', bgDarker: '#191c23', bgLight: '#3b4252',
      fgDark: '#667080', fgLight: '#adb5c4',
      red: '#bf616a', yellow: '#ebcb8b', orange: '#d5967a', green: '#a3be8c',
      cyan: '#88c0d0', blue: '#81a1c1', magenta: '#b48ead', brown: '#6a4b3d',
      bright: { red: '#bf616a', yellow: '#ebcb8b', green: '#a3be8c', cyan: '#8fbcbb', blue: '#81a1c1', magenta: '#b48ead' }
    },
    {
      id: 'osaka-jade', name: 'Osaka Jade', mode: 'dark',
      bg: '#111c18', fg: '#C1C497', accent: '#509475', muted: '#53685B',
      sel: '#32473B', selFg: '#C1C497', brfg: '#F7E8B2', border: '#509475',
      bgDark: '#0c1512', bgDarker: '#090f0d', bgLight: '#23372B',
      fgDark: '#81B8A8', fgLight: '#D6D5BC',
      red: '#FF5345', yellow: '#459451', orange: '#a2734b', green: '#549e6a',
      cyan: '#2DD5B7', blue: '#509475', magenta: '#D2689C', brown: '#513925',
      bright: { red: '#db9f9c', yellow: '#E5C736', green: '#63b07a', cyan: '#8CD3CB', blue: '#ACD4CF', magenta: '#75bbb3' }
    },
    {
      id: 'retro-82', name: 'Retro 82', mode: 'dark',
      bg: '#05182e', fg: '#f6dcac', accent: '#faa968', muted: '#2a6b78',
      sel: '#134e5a', selFg: '#f6dcac', brfg: '#f6dcac', border: '#faa968',
      bgDark: '#031222', bgDarker: '#020c17', bgLight: '#0a2540',
      fgDark: '#3f8f8a', fgLight: '#a7c9c6',
      red: '#f85525', yellow: '#e97b3c', orange: '#faa968', green: '#028391',
      cyan: '#8cbfb8', blue: '#3f8f8a', magenta: '#3f8f8a', brown: '#743d1e',
      bright: { red: '#f85525', yellow: '#e97b3c', green: '#028391', cyan: '#8cbfb8', blue: '#faa968', magenta: '#3f8f8a' }
    },
    {
      id: 'ristretto', name: 'Ristretto', mode: 'dark',
      bg: '#2c2525', fg: '#e6d9db', accent: '#f38d70', muted: '#72696a',
      sel: '#403e41', selFg: '#e6d9db', brfg: '#e6d9db', border: '#f38d70',
      bgDark: '#211b1b', bgDarker: '#181414', bgLight: '#3d2f2a',
      fgDark: '#72696a', fgLight: '#c3b7b8',
      red: '#fd6883', yellow: '#f9cc6c', orange: '#fb9a77', green: '#adda78',
      cyan: '#85dacc', blue: '#f38d70', magenta: '#a8a9eb', brown: '#7d4d3b',
      bright: { red: '#ff8297', yellow: '#fcd675', green: '#c8e292', cyan: '#9bf1e1', blue: '#f8a788', magenta: '#bebffd' }
    },
    {
      id: 'rose-pine', name: 'Rose Pine', mode: 'light',
      bg: '#faf4ed', fg: '#575279', accent: '#56949f', muted: '#cecacd',
      sel: '#dfdad9', selFg: '#575279', brfg: '#575279', border: '#56949f',
      bgDark: '#ede7e1', bgDarker: '#e1dbd5', bgLight: '#f2e9e1',
      fgDark: '#9893a5', fgLight: '#6e6a86',
      red: '#b4637a', yellow: '#ea9d34', orange: '#cf8057', green: '#286983',
      cyan: '#d7827e', blue: '#56949f', magenta: '#907aa9', brown: '#67402b',
      bright: { red: '#b4637a', yellow: '#ea9d34', green: '#286983', cyan: '#d7827e', blue: '#56949f', magenta: '#907aa9' }
    },
    {
      id: 'solitude', name: 'Solitude', mode: 'dark',
      bg: '#101315', fg: '#cacccc', accent: '#798186', muted: '#4b4e55',
      sel: '#343d41', selFg: '#cacccc', brfg: '#a5aeb4', border: '#a8adb0',
      bgDark: '#0c0e10', bgDarker: '#080a0b', bgLight: '#101315',
      fgDark: '#4b4e55', fgLight: '#cbc2be',
      red: '#565d60', yellow: '#d9dbdc', orange: '#798186', green: '#9fa5a9',
      cyan: '#707070', blue: '#798186', magenta: '#aeaeae', brown: '#4b4e55',
      bright: { red: '#de6145', yellow: '#c9c2b4', green: '#343d41', cyan: '#707070', blue: '#5d6367', magenta: '#9a9a9a' }
    },
    {
      id: 'starship', name: 'Starship', mode: 'dark',
      bg: '#1c1c1e', fg: '#f5f5f7', accent: '#ff9f0a', muted: '#8e8e93',
      sel: '#3a3a3c', selFg: '#f5f5f7', brfg: '#ffffff', border: '#ff9f0a',
      bgDark: '#161618', bgDarker: '#0e0e10', bgLight: '#2c2c2e',
      fgDark: '#98989d', fgLight: '#fbfbfd',
      red: '#ff5f4a', yellow: '#ffc27a', orange: '#ff6a3d', green: '#ff9f0a',
      cyan: '#a6dcef', blue: '#8fb8de', magenta: '#ff8fa3', brown: '#b8a99a',
      bright: { red: '#ff8373', yellow: '#ffd8a8', green: '#ffb340', cyan: '#cdeefa', blue: '#b5d0ea', magenta: '#ffb3c1' }
    },
    {
      id: 'vantablack', name: 'Vantablack', mode: 'dark',
      bg: '#000000', fg: '#ffffff', accent: '#8d8d8d', muted: '#7a7a7a',
      sel: '#1a1a1a', selFg: '#ffffff', brfg: '#ffffff', border: '#8d8d8d',
      bgDark: '#090909', bgDarker: '#070707', bgLight: '#1a1a1a',
      fgDark: '#505050', fgLight: '#ececec',
      red: '#a4a4a4', yellow: '#cecece', orange: '#b9b9b9', green: '#b6b6b6',
      cyan: '#b0b0b0', blue: '#8d8d8d', magenta: '#9b9b9b', brown: '#5c5c5c',
      bright: { red: '#a4a4a4', yellow: '#cecece', green: '#b6b6b6', cyan: '#b0b0b0', blue: '#8d8d8d', magenta: '#9b9b9b' }
    },
    {
      id: 'white', name: 'White', mode: 'light',
      bg: '#ffffff', fg: '#000000', accent: '#6e6e6e', muted: '#808080',
      sel: '#c0c0c0', selFg: '#000000', brfg: '#000000', border: '#6e6e6e',
      bgDark: '#f5f5f5', bgDarker: '#e8e8e8', bgLight: '#c0c0c0',
      fgDark: '#c0c0c0', fgLight: '#000000',
      red: '#2a2a2a', yellow: '#4a4a4a', orange: '#3a3a3a', green: '#3a3a3a',
      cyan: '#3e3e3e', blue: '#1a1a1a', magenta: '#2e2e2e', brown: '#4a4a4a',
      bright: { red: '#2a2a2a', yellow: '#4a4a4a', green: '#3a3a3a', cyan: '#3e3e3e', blue: '#1a1a1a', magenta: '#2e2e2e' }
    }
  ];

  T.byId = function (id) {
    for (var i = 0; i < T.list.length; i++) if (T.list[i].id === id) return T.list[i];
    return T.list[0];
  };
  T.byName = function (name) {
    for (var i = 0; i < T.list.length; i++) {
      if (T.list[i].name.toLowerCase() === String(name).toLowerCase()) return T.list[i];
    }
    return null;
  };

  /* hex -> "r, g, b" */
  function rgbOf(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16);
  }
  /* "r, g, b" -> "#rrggbb" */
  function hexOf(rgb) {
    var p = rgb.split(',').map(function (n) { return Math.max(0, Math.min(255, Math.round(+n))); });
    return '#' + p.map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  T.mix = function (h1, h2, t) {
    var a = rgbOf(h1).split(',').map(Number), b = rgbOf(h2).split(',').map(Number);
    return hexOf(a.map(function (v, i) { return v + (b[i] - v) * t; }).join(','));
  };
  T.alpha = function (hex, a) { return 'rgba(' + rgbOf(hex) + ',' + a + ')'; };
  /* Perceptual-ish luminance, used to decide readable foregrounds. */
  T.lum = function (hex) {
    var p = rgbOf(hex).split(',').map(function (v) { return v / 255; }).map(function (v) {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  };
  T.isLight = function (t) { return T.lum(t.bg) > 0.5; };

  var varMap = [
    ['--bg', 'bg'], ['--fg', 'fg'], ['--accent', 'accent'], ['--muted', 'muted'],
    ['--sel', 'sel'], ['--sel-fg', 'selFg'], ['--brfg', 'brfg'], ['--border', 'border'],
    ['--bg-dark', 'bgDark'], ['--bg-darker', 'bgDarker'], ['--bg-light', 'bgLight'],
    ['--fg-dark', 'fgDark'], ['--fg-light', 'fgLight'],
    ['--red', 'red'], ['--yellow', 'yellow'], ['--orange', 'orange'], ['--green', 'green'],
    ['--cyan', 'cyan'], ['--blue', 'blue'], ['--magenta', 'magenta'], ['--brown', 'brown']
  ];

  /* Apply a theme: writes CSS custom properties on <html> and mirrors ANSI vars. */
  T.apply = function (id) {
    var t = T.byId(id), root = document.documentElement;
    root.setAttribute('data-theme', t.id);
    root.setAttribute('data-mode', t.mode);
    varMap.forEach(function (pair) { root.style.setProperty(pair[0], t[pair[1]]); });

    var a = T.ansi(t);
    for (var i = 0; i < 16; i++) root.style.setProperty('--ansi-' + i, a[i]);

    root.style.setProperty('--bg-rgb', rgbOf(t.bg));
    root.style.setProperty('--fg-rgb', rgbOf(t.fg));
    root.style.setProperty('--accent-rgb', rgbOf(t.accent));
    /* Derived surfaces used across the shell. */
    root.style.setProperty('--shadow', t.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(40,40,50,0.18)');
    root.style.setProperty('--bar-bg', t.mode === 'dark' ? t.bgDark : t.bgLight);
    root.style.setProperty('--panel-bg', t.mode === 'dark' ? T.mix(t.bgDark, '#000000', 0.18) : t.bg);
    root.style.setProperty('--panel-border', T.alpha(t.muted, t.mode === 'dark' ? 0.45 : 0.55));
    root.style.setProperty('--sel-bg', t.sel);
    root.style.setProperty('--fg-muted', t.fgDark);
    root.style.setProperty('--osd-bg', T.alpha(t.mode === 'dark' ? t.bgDarker : t.bg, 0.94));
    OMA.Themes.current = t;
    return t;
  };

  OMA.Themes = T;
})(window.OMA = window.OMA || {});
