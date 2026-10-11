/* ============================================================================
 * Omarchy Web Clone — wallpapers.js
 * ----------------------------------------------------------------------------
 * The real ISO ships photographic .webp/.jpg backgrounds per theme
 * (Tokyo Night: 0-winding-road, 1-quattro, 2-swirl-buck, 3-sunset-lake,
 * 4-omakub, 5-oma-cityscape, 6-oma). Shipping those photos would add megabytes,
 * which defeats the entire point of this build.
 *
 * So every wallpaper here is GENERATED: layered SVG + gradients, coloured from
 * the live theme palette. The names mirror the upstream Tokyo Night set, and
 * the "Quattro" wallpaper reproduces the four-band motif of Omarchy 4.
 * ==========================================================================*/
(function (OMA) {
  'use strict';

  var W = {};

  /* Upstream Tokyo Night background filenames -> generator name. */
  W.set = [
    { file: '1-quattro.webp', name: 'Quattro', gen: 'quattro' },
    { file: '0-winding-road.webp', name: 'Winding Road', gen: 'road' },
    { file: '2-swirl-buck.webp', name: 'Swirl Buck', gen: 'swirl' },
    { file: '3-sunset-lake.webp', name: 'Sunset Lake', gen: 'lake' },
    { file: '5-oma-cityscape.jpg', name: 'Oma Cityscape', gen: 'city' },
    { file: '6-oma.webp', name: 'Oma', gen: 'oma' },
    { file: '4-omakub.webp', name: 'Omakub', gen: 'grid' }
  ];

  var seq = 0;
  function uid() { return 'wp' + (++seq) + '-' + Math.floor(Math.random() * 1e6).toString(36); }

  /* Deterministic pseudo-random so a given wallpaper never flickers on redraw. */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function svgOpen(w, h, id) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" id="' + id + '">';
  }

  /* ------------------------------------------------------------ generators -- */

  function quattro(t, w, h) {
    var id = uid(), r = rng(7);
    var cols = [t.accent, t.blue, t.magenta, t.cyan, t.green];
    var s = svgOpen(w, h, id);
    s += '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t.bgDarker + '"/><stop offset="1" stop-color="' + t.bg + '"/></linearGradient>';
    for (var i = 0; i < 4; i++) {
      s += '<linearGradient id="' + id + 'b' + i + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="' + cols[i % cols.length] + '" stop-opacity="0"/>' +
        '<stop offset="0.5" stop-color="' + cols[i % cols.length] + '" stop-opacity="0.85"/>' +
        '<stop offset="1" stop-color="' + cols[(i + 1) % cols.length] + '" stop-opacity="0.15"/></linearGradient>';
    }
    s += '</defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
    /* Four sweeping bands — the "Quattro" motif. */
    for (var b = 0; b < 4; b++) {
      var y = h * (0.30 + b * 0.13);
      var amp = 26 + b * 16;
      var d = 'M -60 ' + y;
      for (var x = -60; x <= w + 60; x += 40) {
        d += ' Q ' + (x + 20) + ' ' + (y + (r() - 0.5) * amp) + ' ' + (x + 40) + ' ' + y;
      }
      d += ' L ' + (w + 60) + ' ' + (y + 60 - b * 6) + ' L -60 ' + (y + 60 - b * 6) + ' Z';
      s += '<path d="' + d + '" fill="url(#' + id + 'b' + b + ')" opacity="' + (0.5 - b * 0.07) + '"/>';
    }
    /* Vignette + grain. */
    s += '<rect width="' + w + '" height="' + h + '" fill="none" stroke="' + t.accent + '" stroke-opacity="0.10" stroke-width="1"/>';
    s += '<ellipse cx="' + w * 0.5 + '" cy="' + h * 0.42 + '" rx="' + w * 0.72 + '" ry="' + h * 0.66 + '" fill="none" stroke="' + t.muted + '" stroke-opacity="0.10"/>';
    s += '</svg>';
    return s;
  }

  function road(t, w, h) {
    var id = uid(), s = svgOpen(w, h, id);
    s += '<defs><linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + t.bgDarker + '"/>' +
      '<stop offset="0.55" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.16) + '"/>' +
      '<stop offset="1" stop-color="' + t.bgDark + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'v" cx="0.5" cy="0.6" r="0.62">' +
      '<stop offset="0" stop-color="' + t.yellow + '" stop-opacity="0.30"/>' +
      '<stop offset="1" stop-color="' + t.bg + '" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 's)"/>';
    /* Sun low on the horizon. */
    s += '<circle cx="' + w * 0.5 + '" cy="' + h * 0.62 + '" r="' + h * 0.11 + '" fill="' + t.yellow + '" opacity="0.16"/>';
    s += '<circle cx="' + w * 0.5 + '" cy="' + h * 0.62 + '" r="' + h * 0.055 + '" fill="' + t.yellow + '" opacity="0.22"/>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'v)"/>';
    /* Receding highway. */
    var vx = w * 0.5, vy = h * 0.62;
    s += '<path d="M ' + (vx - w * 0.60) + ' ' + h + ' L ' + vx + ' ' + vy + ' L ' + (vx + w * 0.60) + ' ' + h + ' Z" fill="' + t.bgDarker + '" opacity="0.85"/>';
    s += '<path d="M ' + (vx - w * 0.055) + ' ' + h + ' L ' + vx + ' ' + vy + ' L ' + (vx + w * 0.055) + ' ' + h + ' Z" fill="' + t.muted + '" opacity="0.55"/>';
    for (var i = 1; i <= 9; i++) {
      var p = Math.pow(i / 9, 2.1);
      var yy = vy + (h - vy) * p, hh = 2 + p * 12, wd = 3 + p * 16;
      s += '<rect x="' + (vx - wd / 2) + '" y="' + yy + '" width="' + wd + '" height="' + hh + '" fill="' + t.fgLight + '" opacity="' + (0.22 + p * 0.4) + '"/>';
    }
    /* Distant ridges. */
    s += '<path d="M 0 ' + (vy - h * 0.02) + ' L ' + w * 0.18 + ' ' + (vy - h * 0.13) + ' L ' + w * 0.34 + ' ' + (vy - h * 0.02) +
      ' L ' + w * 0.62 + ' ' + (vy - h * 0.17) + ' L ' + w * 0.8 + ' ' + (vy - h * 0.04) + ' L ' + w + ' ' + (vy - h * 0.1) +
      ' L ' + w + ' ' + vy + ' L 0 ' + vy + ' Z" fill="' + t.bgDarker + '" opacity="0.9"/>';
    s += '</svg>';
    return s;
  }

  function swirl(t, w, h) {
    var id = uid(), r = rng(23), s = svgOpen(w, h, id);
    s += '<defs><radialGradient id="' + id + 'g" cx="0.5" cy="0.5" r="0.75">' +
      '<stop offset="0" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.35) + '"/>' +
      '<stop offset="0.5" stop-color="' + t.bg + '"/><stop offset="1" stop-color="' + t.bgDarker + '"/></radialGradient></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
    var cx = w * 0.5, cy = h * 0.5;
    for (var i = 0; i < 46; i++) {
      var a0 = r() * Math.PI * 2, len = 0.16 + r() * 0.5, rad = 40 + r() * Math.min(w, h) * 0.52;
      var x1 = cx + Math.cos(a0) * rad, y1 = cy + Math.sin(a0) * rad;
      var a1 = a0 + 0.7 + r() * 1.6;
      var x2 = cx + Math.cos(a1) * (rad * (1 + len * 0.5)), y2 = cy + Math.sin(a1) * (rad * (1 + len * 0.5));
      var col = [t.accent, t.magenta, t.cyan, t.blue][i % 4];
      s += '<path d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' +
        x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="' + col + '" stroke-opacity="' + (0.05 + r() * 0.16).toFixed(2) +
        '" stroke-width="' + (0.6 + r() * 2.6).toFixed(2) + '" fill="none" stroke-linecap="round"/>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.min(w, h) * 0.16 + '" fill="none" stroke="' + t.accent + '" stroke-opacity="0.18"/>';
    s += '</svg>';
    return s;
  }

  function lake(t, w, h) {
    var id = uid(), r = rng(41), s = svgOpen(w, h, id);
    var hor = h * 0.58;
    s += '<defs><linearGradient id="' + id + 'sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + t.bgDarker + '"/>' +
      '<stop offset="0.6" stop-color="' + OMA.Themes.mix(t.bg, t.magenta, 0.22) + '"/>' +
      '<stop offset="1" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.40) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'wat" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.34) + '"/>' +
      '<stop offset="1" stop-color="' + t.bgDarker + '"/></linearGradient></defs>';
    s += '<rect width="' + w + '" height="' + hor + '" fill="url(#' + id + 'sky)"/>';
    s += '<rect y="' + hor + '" width="' + w + '" height="' + (h - hor) + '" fill="url(#' + id + 'wat)"/>';
    /* Sun + its reflection. */
    s += '<circle cx="' + w * 0.64 + '" cy="' + (hor - h * 0.10) + '" r="' + h * 0.058 + '" fill="' + t.orange + '" opacity="0.75"/>';
    s += '<circle cx="' + w * 0.64 + '" cy="' + (hor - h * 0.10) + '" r="' + h * 0.10 + '" fill="' + t.orange + '" opacity="0.12"/>';
    for (var i = 0; i < 26; i++) {
      var y = hor + Math.pow(i / 26, 1.7) * (h - hor);
      var wdt = (10 + i * 16) * (0.4 + r() * 0.9);
      s += '<rect x="' + (w * 0.64 - wdt / 2) + '" y="' + y + '" width="' + wdt + '" height="' + (1 + r() * 2.4).toFixed(1) +
        '" fill="' + t.orange + '" opacity="' + (0.26 - i * 0.008).toFixed(3) + '" rx="1"/>';
    }
    /* Ridge line. */
    s += '<path d="M 0 ' + hor + ' L ' + w * 0.1 + ' ' + (hor - h * 0.09) + ' L ' + w * 0.2 + ' ' + (hor - h * 0.03) +
      ' L ' + w * 0.34 + ' ' + (hor - h * 0.14) + ' L ' + w * 0.46 + ' ' + (hor - h * 0.05) + ' L ' + w * 0.58 + ' ' + (hor - h * 0.11) +
      ' L ' + w * 0.74 + ' ' + (hor - h * 0.02) + ' L ' + w * 0.86 + ' ' + (hor - h * 0.07) + ' L ' + w + ' ' + (hor - h * 0.01) +
      ' L ' + w + ' ' + hor + ' Z" fill="' + t.bgDarker + '" opacity="0.92"/>';
    s += '</svg>';
    return s;
  }

  function city(t, w, h) {
    var id = uid(), r = rng(97), s = svgOpen(w, h, id);
    s += '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + t.bgDarker + '"/>' +
      '<stop offset="0.72" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.26) + '"/>' +
      '<stop offset="1" stop-color="' + t.bg + '"/></linearGradient></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
    /* Stars. */
    for (var i = 0; i < 90; i++) {
      s += '<circle cx="' + (r() * w).toFixed(0) + '" cy="' + (r() * h * 0.5).toFixed(0) + '" r="' + (0.5 + r()).toFixed(1) +
        '" fill="' + t.fgLight + '" opacity="' + (0.1 + r() * 0.5).toFixed(2) + '"/>';
    }
    /* Two skyline layers with lit windows. */
    for (var layer = 0; layer < 2; layer++) {
      var base = h * (layer === 0 ? 0.86 : 0.99), op = layer === 0 ? 0.65 : 1;
      var col = layer === 0 ? t.bgDark : t.bgDarker;
      var x = -20;
      while (x < w + 20) {
        var bw = 16 + r() * 54, bh = 40 + r() * (layer === 0 ? h * 0.34 : h * 0.22);
        s += '<rect x="' + x.toFixed(0) + '" y="' + (base - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) +
          '" fill="' + col + '" opacity="' + op + '"/>';
        if (layer === 1) {
          for (var wy = base - bh + 7; wy < base - 8; wy += 11) {
            for (var wx = x + 4; wx < x + bw - 7; wx += 9) {
              if (r() > 0.66) {
                s += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="3.4" height="4.6" fill="' +
                  (r() > 0.75 ? t.yellow : t.accent) + '" opacity="' + (0.35 + r() * 0.55).toFixed(2) + '"/>';
              }
            }
          }
        }
        x += bw + 3 + r() * 8;
      }
    }
    s += '</svg>';
    return s;
  }

  function oma(t, w, h) {
    var id = uid(), s = svgOpen(w, h, id);
    var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.3;
    s += '<defs><radialGradient id="' + id + 'g" cx="0.5" cy="0.5" r="0.7">' +
      '<stop offset="0" stop-color="' + OMA.Themes.mix(t.bg, t.accent, 0.24) + '"/>' +
      '<stop offset="1" stop-color="' + t.bgDarker + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t.accent + '"/><stop offset="0.5" stop-color="' + t.cyan + '"/>' +
      '<stop offset="1" stop-color="' + t.magenta + '"/></linearGradient></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
    for (var k = 0; k < 5; k++) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * (1 + k * 0.26)).toFixed(0) + '" fill="none" stroke="' +
        t.accent + '" stroke-opacity="' + (0.16 - k * 0.026).toFixed(3) + '" stroke-width="1"/>';
    }
    /* The Omarchy mark: a circle with a swoosh, drawn geometrically. */
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="url(#' + id + 'r)" stroke-width="' + (R * 0.16).toFixed(1) + '" stroke-linecap="round" stroke-dasharray="' + (R * 4.4).toFixed(1) + ' ' + (R * 2.0).toFixed(1) + '" transform="rotate(-58 ' + cx + ' ' + cy + ')"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * 0.34).toFixed(1) + '" fill="' + t.accent + '" opacity="0.18"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * 0.12).toFixed(1) + '" fill="' + t.accent + '" opacity="0.5"/>';
    s += '</svg>';
    return s;
  }

  function grid(t, w, h) {
    var id = uid(), s = svgOpen(w, h, id);
    s += '<defs><pattern id="' + id + 'p" width="46" height="46" patternUnits="userSpaceOnUse">' +
      '<path d="M 46 0 L 0 0 0 46" fill="none" stroke="' + t.accent + '" stroke-opacity="0.16" stroke-width="1"/></pattern>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t.bg + '"/><stop offset="1" stop-color="' + t.bgDarker + '"/></linearGradient></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'p)"/>';
    s += '<rect x="' + w * 0.5 + '" y="0" width="1" height="' + h + '" fill="' + t.accent + '" opacity="0.2"/>';
    s += '<rect x="0" y="' + h * 0.5 + '" width="' + w + '" height="1" fill="' + t.accent + '" opacity="0.2"/>';
    s += '<circle cx="' + w * 0.5 + '" cy="' + h * 0.5 + '" r="' + Math.min(w, h) * 0.2 + '" fill="none" stroke="' + t.cyan + '" stroke-opacity="0.2"/>';
    s += '</svg>';
    return s;
  }

  var gens = { quattro: quattro, road: road, swirl: swirl, lake: lake, city: city, oma: oma, grid: grid };

  /* Public: build a data-URI for a generated wallpaper. */
  W.render = function (genName, theme, w, h) {
    var fn = gens[genName] || quattro;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fn(theme, w || 1920, h || 1080));
  };

  /* Public: CSS background shorthand for a layer. */
  W.cssFor = function (index, theme) {
    var item = W.set[((index % W.set.length) + W.set.length) % W.set.length];
    return {
      item: item,
      url: W.render(item.gen, theme, 1920, 1080)
    };
  };

  OMA.Wallpapers = W;
})(window.OMA = window.OMA || {});
