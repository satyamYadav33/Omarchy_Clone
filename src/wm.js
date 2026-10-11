/* ============================================================================
 * Omarchy Web Clone — wm.js
 * ----------------------------------------------------------------------------
 * A Hyprland-style tiling compositor for the DOM.
 *
 *   Layouts   : dwindle (alternating BSP split), scrolling (niri-style strip),
 *               floating (free placement)
 *   Semantics : directional focus/swap, resize, split toggle, pseudo, grouping,
 *               sticky+floating, fullscreen / fullwidth / maximize, scratchpad,
 *               gaps + hiding the bar, 9 workspaces per monitor.
 *
 * Windows are absolutely positioned and animated between layouts, so switching
 * a workspace or reshuffling a tree glides instead of snapping — that motion is
 * a large part of what Omarchy feels like.
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear;

  var GAP_IN = 4, GAP_OUT = 8;

  var WM = {
    barVisible: true,
    gaps: true,
    layout: 'dwindle',
    workspaces: {},          // id -> {tree, focus, fullscreen, layout, lastSplit}
    active: 1,
    former: 1,
    order: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    scratchpad: null,
    zoom: 1,
    windows: {},             // wid -> {wid, appId, title, props}
    registry: {},
    area: { x: 0, y: 0, w: 1280, h: 720 },
    _els: {},                // wid -> DOM node
    _groups: {},             // group leader wid -> [wid]
    _shader: false
  };

  WM.registry.register = function (def) { WM.registry[def.id] = def; };
  WM.registry.get = function (id) { return WM.registry[id]; };

  /* --------------------------------------------------------------- geometry */
  function inset(r, n) { return { x: r.x + n, y: r.y + n, w: Math.max(0, r.w - n * 2), h: Math.max(0, r.h - n * 2) }; }

  WM.computeArea = function () {
    var root = OMA.$('#omarchy-desktop');
    var w = root ? root.clientWidth : window.innerWidth;
    var hgt = root ? root.clientHeight : window.innerHeight;
    var top = WM.barVisible ? 26 : 0;
    var a = { x: 0, y: top, w: w, h: hgt - top };
    if (WM.gaps) a = inset(a, GAP_OUT);
    WM.area = a;
    return a;
  };

  /* ------------------------------------------------------------------- tree */
  var splitSeq = 0;
  function leaf(wid) { return { type: 'leaf', wid: wid, size: 1 }; }
  function split(dir, a, b) { return { type: 'split', id: 'sp' + (++splitSeq), dir: dir, a: a, b: b, ratio: 0.5 }; }

  WM.ws = function (id) {
    id = id || WM.active;
    if (!WM.workspaces[id]) {
      WM.workspaces[id] = { id: id, tree: null, focus: null, fullscreen: false, fullwidth: false, maximize: false, layout: null, lastSplit: 'v' };
    }
    return WM.workspaces[id];
  };

  /* Every leaf wid in visual order. */
  function leaves(node, out) {
    out = out || [];
    if (!node) return out;
    if (node.type === 'leaf') { out.push(node); return out; }
    leaves(node.a, out); leaves(node.b, out);
    return out;
  }
  function findLeaf(node, wid) {
    if (!node) return null;
    if (node.type === 'leaf') return node.wid === wid ? node : null;
    return findLeaf(node.a, wid) || findLeaf(node.b, wid);
  }
  /* Replace a leaf with a subtree, keeping proportions. */
  function replaceLeaf(node, wid, sub) {
    if (!node) return sub;
    if (node.type === 'leaf') return node.wid === wid ? sub : node;
    node.a = replaceLeaf(node.a, wid, sub);
    node.b = replaceLeaf(node.b, wid, sub);
    return node;
  }
  function removeLeaf(node, wid) {
    if (!node) return null;
    if (node.type === 'leaf') return node.wid === wid ? null : node;
    node.a = removeLeaf(node.a, wid);
    node.b = removeLeaf(node.b, wid);
    if (!node.a) return node.b;
    if (!node.b) return node.a;
    return node;
  }
  /* Collapse single-child splits and normalise sizes. */
  function prune(node) {
    if (!node || node.type === 'leaf') return node;
    node.a = prune(node.a); node.b = prune(node.b);
    if (!node.a) return node.b;
    if (!node.b) return node.a;
    /* Two leaves side by side is a valid split; keep it. */
    return node;
  }

  function alloc(node, rect, out) {
    if (!node) return out;
    if (node.type === 'leaf') { out[node.wid] = rect; return out; }
    var r = Math.max(0.08, Math.min(0.92, node.ratio || 0.5));
    var g = WM.gaps ? GAP_IN : 0;
    if (node.dir === 'v') {
      var aw = Math.round((rect.w - g) * r);
      alloc(node.a, { x: rect.x, y: rect.y, w: aw, h: rect.h }, out);
      alloc(node.b, { x: rect.x + aw + g, y: rect.y, w: rect.w - aw - g, h: rect.h }, out);
    } else {
      var ah = Math.round((rect.h - g) * r);
      alloc(node.a, { x: rect.x, y: rect.y, w: rect.w, h: ah }, out);
      alloc(node.b, { x: rect.x, y: rect.y + ah + g, w: rect.w, h: rect.h - ah - g }, out);
    }
    return out;
  }

  /* --------------------------------------------------------------- placement */
  WM.layoutRects = function (wsId) {
    var ws = WM.ws(wsId);
    var rects = {};
    var ls = leaves(ws.tree);
    var mode = ws.layout === 'floating' ? 'floating' : (ws.layout || WM.layout);

    if (mode === 'scrolling') {
      /* niri-style: a horizontal strip, focused column widest. */
      var n = ls.length, colW = 0.62, sideW = 0.16;
      var focusIdx = Math.max(0, ls.findIndex(function (l) { return l.wid === ws.focus; }));
      var total = colW + sideW * (n - 1);
      var x = WM.area.x, y = WM.area.y;
      var offset = Math.max(0, Math.min(total - 1, focusIdx * sideW + sideW - 0.5));
      var shift = -offset * WM.area.w;
      ls.forEach(function (l, i) {
        var wdt = (i === focusIdx ? colW : sideW) * WM.area.w;
        var xx = WM.area.x + shift + i * sideW * WM.area.w + (i > focusIdx ? (colW - sideW) * WM.area.w : 0);
        rects[l.wid] = { x: xx, y: y, w: wdt, h: WM.area.h };
      });
      /* leave a little air between columns */
      Object.keys(rects).forEach(function (k) {
        rects[k].w -= GAP_IN; rects[k].x += GAP_IN / 2;
      });
    } else if (mode === 'floating') {
      ls.forEach(function (l, i) {
        var w = WM.windows[l.wid] || {};
        var fw = (w.props && w.props.floatW) || Math.min(760, WM.area.w * 0.6);
        var fh = (w.props && w.props.floatH) || Math.min(520, WM.area.h * 0.68);
        rects[l.wid] = {
          x: WM.area.x + (w.props && w.props.floatX != null ? w.props.floatX : 40 + i * 34),
          y: WM.area.y + (w.props && w.props.floatY != null ? w.props.floatY : 30 + i * 30),
          w: fw, h: fh, floating: true
        };
      });
    } else {
      alloc(ws.tree, WM.area, rects);
    }

    /* Single-window aspect tweak + explicit float/fullscreen overrides. */
    Object.keys(rects).forEach(function (wid) {
      var w = WM.windows[wid];
      if (!w) return;
      var r = rects[wid];
      if (w.props.floating) {
        r.w = w.props.floatW || Math.min(760, WM.area.w * 0.62);
        r.h = w.props.floatH || Math.min(520, WM.area.h * 0.7);
        r.x = WM.area.x + (w.props.floatX != null ? w.props.floatX : Math.round((WM.area.w - r.w) / 2));
        r.y = WM.area.y + (w.props.floatY != null ? w.props.floatY : Math.round((WM.area.h - r.h) / 2));
        r.floating = true;
      }
      if (w.props.maximize) { rects[wid] = { x: WM.area.x, y: WM.area.y, w: WM.area.w, h: WM.area.h }; }
      if (w.props.fullwidth) { r.x = WM.area.x; r.w = WM.area.w; }
      if (ws.maximize) rects[wid] = { x: WM.area.x, y: WM.area.y, w: WM.area.w, h: WM.area.h };
      if (ws.fullscreen && wid === ws.focus) {
        var host = OMA.$('#omarchy-desktop');
        rects[wid] = { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
      }
    });
    return rects;
  };

  /* ------------------------------------------------------------------- ops */
  WM.open = function (appId, arg, opts) {
    opts = opts || {};
    var def = WM.registry.get(appId);
    if (!def) { OMA.log('wm', 'unknown app: ' + appId); return null; }
    if (def.single) {
      var existing = WM.findByApp(appId);
      if (existing) { WM.focus(existing.wid); if (def.onReopen) def.onReopen(existing, arg); return existing; }
    }
    var wsId = opts.ws || WM.active;
    var ws = WM.ws(wsId);
    WM._seq = (WM._seq || 0) + 1;
    var wid = 'w' + WM._seq;
    var win = {
      wid: wid, appId: appId, ws: wsId,
      title: opts.title || (def.title ? def.title(arg) : def.name),
      props: {
        floating: !!(opts.floating || def.floating),
        arg: arg,
        floatW: opts.floatW || def.floatW,
        floatH: opts.floatH || def.floatH
      }
    };
    WM.windows[wid] = win;
    if (opts.floating || def.floating) {
      win.props.floatX = 60 + (Object.keys(WM.windows).length % 6) * 26;
      win.props.floatY = 48 + (Object.keys(WM.windows).length % 6) * 24;
    }

    /* Dwindle insert: split the focused leaf on the alternating axis. */
    var fl = ws.focus ? findLeaf(ws.tree, ws.focus) : null;
    var nl = leaf(wid);
    if (!ws.tree) {
      ws.tree = nl;
    } else if (!fl) {
      ws.tree = split(ws.lastSplit === 'v' ? 'h' : 'v', ws.tree, nl);
      ws.lastSplit = ws.lastSplit === 'v' ? 'h' : 'v';
    } else {
      var dir = ws.lastSplit === 'v' ? 'h' : 'v';   // alternate axis
      ws.tree = replaceLeaf(ws.tree, ws.focus, split(dir, leaf(ws.focus), nl));
      ws.lastSplit = dir;
    }
    ws.focus = wid;
    WM.active = wsId;
    OMA.bus.emit('wm:open', win);
    WM.render();
    OMA.bus.emit('wm:changed');
    return win;
  };

  WM.findByApp = function (appId) {
    var out = null;
    Object.keys(WM.windows).forEach(function (wid) {
      var w = WM.windows[wid];
      if (w.appId === appId && w.ws === WM.active && !w.props.scratch) out = out || w;
    });
    return out;
  };
  WM.countApp = function (appId) {
    return Object.keys(WM.windows).filter(function (k) { return WM.windows[k].appId === appId; }).length;
  };

  WM.close = function (wid) {
    wid = wid || WM.ws().focus;
    if (!wid || !WM.windows[wid]) return;
    var win = WM.windows[wid];
    var ws = WM.ws(win.ws);
    var def = WM.registry.get(win.appId);
    if (def && def.onClose) { try { def.onClose(win); } catch (e) { OMA.log('onClose', e); } }
    ws.tree = prune(removeLeaf(ws.tree, wid));
    var rest = leaves(ws.tree).map(function (l) { return l.wid; });
    if (ws.focus === wid) ws.focus = rest[0] || null;
    if (win.props.scratch) WM.scratchpad = null;
    delete WM.windows[wid];
    OMA.bus.emit('wm:close', win);
    WM.render();
    OMA.bus.emit('wm:changed');
  };

  WM.closeAll = function () {
    Object.keys(WM.windows).filter(function (k) { return WM.windows[k].ws === WM.active; })
      .forEach(function (k) { WM.close(k); });
  };

  WM.focus = function (wid) {
    var w = WM.windows[wid]; if (!w) return;
    var ws = WM.ws(w.ws);
    ws.focus = wid;
    if (ws.fullscreen) { /* keep fullscreen on the focused window */ }
    WM.render();
    OMA.bus.emit('wm:changed');
  };

  /* Directional focus. Direction is a vector in screen space. */
  WM.focusDir = function (dir) {
    var ws = WM.ws(), cur = ws.focus;
    if (!cur) return;
    var rects = WM.layoutRects();
    var from = rects[cur]; if (!from) return;
    var fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    var best = null, bestScore = Infinity;
    leaves(ws.tree).forEach(function (l) {
      if (l.wid === cur) return;
      var r = rects[l.wid]; if (!r) return;
      var c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      var dx = c.x - fc.x, dy = c.y - fc.y;
      var ok = (dir === 'l' && dx < -8) || (dir === 'r' && dx > 8) || (dir === 'u' && dy < -8) || (dir === 'd' && dy > 8);
      if (!ok) return;
      var primary = (dir === 'l' || dir === 'r') ? Math.abs(dx) : Math.abs(dy);
      var secondary = (dir === 'l' || dir === 'r') ? Math.abs(dy) : Math.abs(dx);
      var score = primary + secondary * 2.2;
      if (score < bestScore) { bestScore = score; best = l.wid; }
    });
    if (best) WM.focus(best);
    else OMA.bus.emit('wm:edge', dir);
  };

  /* Swap the focused window with its neighbour in a direction. */
  WM.swapDir = function (dir) {
    var ws = WM.ws(), cur = ws.focus;
    if (!cur) return;
    var rects = WM.layoutRects(), from = rects[cur];
    if (!from) return;
    var fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    var best = null, bestScore = Infinity;
    leaves(ws.tree).forEach(function (l) {
      if (l.wid === cur) return;
      var r = rects[l.wid]; if (!r) return;
      var c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      var dx = c.x - fc.x, dy = c.y - fc.y;
      var ok = (dir === 'l' && dx < -8) || (dir === 'r' && dx > 8) || (dir === 'u' && dy < -8) || (dir === 'd' && dy > 8);
      if (!ok) return;
      var primary = (dir === 'l' || dir === 'r') ? Math.abs(dx) : Math.abs(dy);
      var secondary = (dir === 'l' || dir === 'r') ? Math.abs(dy) : Math.abs(dx);
      var score = primary + secondary * 2.2;
      if (score < bestScore) { bestScore = score; best = l.wid; }
    });
    if (!best) return;
    WM.swap(cur, best);
  };

  WM.swap = function (a, b) {
    var ws = WM.ws();
    function sw(node) {
      if (!node) return node;
      if (node.type === 'leaf') {
        if (node.wid === a) node.wid = b;
        else if (node.wid === b) node.wid = a;
        return node;
      }
      node.a = sw(node.a); node.b = sw(node.b);
      return node;
    }
    ws.tree = sw(ws.tree);
    WM.render();
    OMA.bus.emit('wm:changed');
  };

  /* Resize the focused window by nudging every ancestor split it sits in. */
  WM.resize = function (dw, dh) {
    var ws = WM.ws(), target = ws.focus;
    if (!target) return;
    var touched = false;
    (function walk(node) {
      if (!node || node.type === 'leaf') return;
      var inA = !!findLeaf(node.a, target), inB = !!findLeaf(node.b, target);
      if (node.dir === 'v' && dw) {
        var step = dw * (inA ? 1 : -1);
        node.ratio = Math.max(0.10, Math.min(0.90, (node.ratio || 0.5) + step));
        touched = true;
      }
      if (node.dir === 'h' && dh) {
        var step2 = dh * (inA ? 1 : -1);
        node.ratio = Math.max(0.10, Math.min(0.90, (node.ratio || 0.5) + step2));
        touched = true;
      }
      walk(node.a); walk(node.b);
    })(ws.tree);
    if (touched) { WM.render(); OMA.bus.emit('wm:changed'); }
  };

  WM.toggleSplit = function () {
    var ws = WM.ws(), target = ws.focus;
    if (!target) return;
    var did = false;
    (function walk(node) {
      if (!node || node.type === 'leaf' || did) return;
      var inA = !!findLeaf(node.a, target), inB = !!findLeaf(node.b, target);
      if (inA !== inB) { node.dir = node.dir === 'v' ? 'h' : 'v'; did = true; return; }
      walk(node.a); walk(node.b);
    })(ws.tree);
    WM.render();
  };

  WM.toggleFloat = function (wid) {
    var ws = WM.ws();
    wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.floating = !w.props.floating;
    if (w.props.floating) { delete w.props.maximize; }
    WM.render();
    OMA.bus.emit('wm:changed');
  };
  WM.toggleMaximize = function (wid) {
    var ws = WM.ws();
    wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.maximize = !w.props.maximize;
    WM.render();
  };
  WM.toggleFullscreen = function (wid) {
    var ws = WM.ws();
    wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    if (ws.fullscreen && w.props._fs) { ws.fullscreen = false; w.props._fs = false; }
    else { ws.fullscreen = true; w.props._fs = true; }
    OMA.bus.emit('wm:fullscreen', ws.fullscreen);
    WM.render();
  };
  WM.toggleFullwidth = function (wid) {
    var ws = WM.ws(); wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.fullwidth = !w.props.fullwidth;
    WM.render();
  };
  WM.togglePseudo = function (wid) {
    var ws = WM.ws(); wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.pseudo = !w.props.pseudo;
    OMA.bus.emit('osd', { icon: 'layout', label: 'Pseudo', value: w.props.pseudo ? 'stretch' : 'natural' });
  };
  WM.toggleSticky = function (wid) {
    var ws = WM.ws(); wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.floating = true;
    w.props.sticky = !w.props.sticky;
    OMA.bus.emit('osd', { icon: 'pin', label: 'Sticky', value: w.props.sticky ? 'on' : 'off' });
    WM.render();
  };
  WM.toggleTransparency = function (wid) {
    var ws = WM.ws(); wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    w.props.transparent = !w.props.transparent;
    WM.render();
  };
  WM.toggleSquare = function (wid) {
    var w = WM.windows[wid || WM.ws().focus]; if (!w) return;
    w.props.square = !w.props.square;
    WM.render();
  };

  WM.cycleLayout = function (back) {
    var seq = ['dwindle', 'scrolling', 'floating'];
    var ws = WM.ws();
    var cur = ws.layout || WM.layout;
    var i = seq.indexOf(cur);
    i = (i + (back ? seq.length - 1 : 1)) % seq.length;
    ws.layout = seq[i];
    WM.render();
    OMA.bus.emit('osd', { icon: 'layout', label: 'Layout', value: OMA.fmt.title(seq[i]) });
    OMA.bus.emit('wm:changed');
  };

  WM.saveWidth = function () {
    var ws = WM.ws();
    ws.savedTree = JSON.parse(JSON.stringify(ws.tree));
    OMA.bus.emit('osd', { icon: 'arrow', label: 'Window width', value: 'saved' });
  };
  WM.restoreWidth = function () {
    var ws = WM.ws();
    if (ws.savedTree) { ws.tree = JSON.parse(JSON.stringify(ws.savedTree)); WM.render(); }
    OMA.bus.emit('osd', { icon: 'arrow', label: 'Window width', value: 'restored' });
  };

  /* ------------------------------------------------------------- grouping */
  WM.toggleGroup = function (wid) {
    var ws = WM.ws(); wid = wid || ws.focus;
    var w = WM.windows[wid]; if (!w) return;
    if (WM._groups[wid]) {
      var members = WM._groups[wid];
      delete WM._groups[wid];
      members.forEach(function (m) { if (WM.windows[m]) WM.windows[m].props.group = null; });
      OMA.bus.emit('osd', { icon: 'layers', label: 'Grouping', value: 'off' });
    } else {
      /* Group every window on this workspace into a tabbed stack. */
      var ls = leaves(ws.tree).map(function (l) { return l.wid; });
      WM._groups[wid] = ls;
      ls.forEach(function (m) { if (WM.windows[m]) WM.windows[m].props.group = wid; });
      OMA.bus.emit('osd', { icon: 'layers', label: 'Grouping', value: ls.length + ' windows' });
    }
    WM.render();
  };
  WM.groupMembers = function (wid) { return WM._groups[wid] || null; };
  WM.moveOutOfGroup = function (wid) {
    var w = WM.windows[wid || WM.ws().focus]; if (!w) return;
    w.props.group = null;
    var g = w.props.group;
    if (g && WM._groups[g]) WM._groups[g] = WM._groups[g].filter(function (x) { return x !== w.wid; });
    WM.render();
  };

  /* ---------------------------------------------------------- workspaces */
  WM.gotoWs = function (id) {
    if (id === WM.active) return;
    WM.former = WM.active;
    WM.active = id;
    if (WM.ws(id).focus == null) {
      var ls = leaves(WM.ws(id).tree);
      if (ls.length) WM.ws(id).focus = ls[ls.length - 1].wid;
    }
    WM.render();
    OMA.bus.emit('wm:workspace', id);
    OMA.bus.emit('wm:changed');
  };
  WM.nextWs = function (back) {
    var i = WM.order.indexOf(WM.active);
    i = (i + (back ? WM.order.length - 1 : 1)) % WM.order.length;
    WM.gotoWs(WM.order[i]);
  };
  WM.gotoFormerWs = function () { WM.gotoWs(WM.former); };
  WM.moveToWs = function (id, follow) {
    var ws = WM.ws(), wid = ws.focus;
    if (!wid) return;
    var w = WM.windows[wid];
    ws.tree = prune(removeLeaf(ws.tree, wid));
    var rest = leaves(ws.tree).map(function (l) { return l.wid; });
    if (ws.focus === wid) ws.focus = rest[0] || null;
    w.ws = id;
    var tws = WM.ws(id);
    var nl = leaf(wid);
    if (!tws.tree) tws.tree = nl;
    else {
      var fl = tws.focus ? findLeaf(tws.tree, tws.focus) : null;
      var dir = tws.lastSplit === 'v' ? 'h' : 'v';
      if (fl) { tws.tree = replaceLeaf(tws.tree, tws.focus, split(dir, leaf(tws.focus), nl)); tws.lastSplit = dir; }
      else tws.tree = split('v', tws.tree, nl);
    }
    tws.focus = wid;
    if (follow) WM.gotoWs(id); else { WM.render(); OMA.bus.emit('wm:changed'); }
  };

  /* ------------------------------------------------------------ scratchpad */
  WM.toggleScratch = function () {
    if (WM.scratchpad && WM.windows[WM.scratchpad]) {
      var w = WM.windows[WM.scratchpad];
      w.props.scratch = false; w.props.floating = false;
      WM.scratchpad = null;
      OMA.bus.emit('osd', { icon: 'terminal', label: 'Scratchpad', value: 'hidden' });
      WM.render();
    } else {
      var term = WM.open('terminal', { scratch: true }, { floating: true, floatW: 720, floatH: 420 });
      if (term) {
        term.props.scratch = true; term.props.floating = true;
        term.props.floatX = Math.round((WM.area.w - 720) / 2);
        term.props.floatY = Math.round(WM.area.h * 0.16);
        WM.scratchpad = term.wid;
        OMA.bus.emit('osd', { icon: 'terminal', label: 'Scratchpad', value: 'shown' });
      }
    }
  };
  WM.moveToScratch = function () {
    var ws = WM.ws(), wid = ws.focus;
    if (!wid) return;
    var w = WM.windows[wid];
    ws.tree = prune(removeLeaf(ws.tree, wid));
    var rest = leaves(ws.tree).map(function (l) { return l.wid; });
    if (ws.focus === wid) ws.focus = rest[0] || null;
    w.props.scratch = true; w.props.floating = true;
    WM.scratchpad = wid;
    OMA.bus.emit('osd', { icon: 'clipboard', label: 'Scratchpad', value: 'stored' });
    WM.render();
  };

  /* -------------------------------------------------------------- monitors */
  WM.scaleStep = function (back) {
    var steps = [1, 1.25, 1.5, 1.6, 1.75, 2];
    var i = steps.indexOf(WM.scale || 1);
    if (i < 0) i = 0;
    i = Math.max(0, Math.min(steps.length - 1, i + (back ? -1 : 1)));
    WM.scale = steps[i];
    OMA.bus.emit('osd', { icon: 'monitor', label: 'Monitor scale', value: steps[i] + 'x' });
  };
  WM.setZoom = function (z) {
    WM.zoom = z;
    var host = OMA.$('#omarchy-desktop');
    if (host) {
      if (z === 1) host.style.transform = '';
      else host.style.transform = 'scale(' + z + ')';
    }
    OMA.bus.emit('osd', { icon: 'zoom', label: 'Zoom', value: Math.round(z * 100) + '%' });
  };
  WM.zoomIn = function () { WM.setZoom(Math.min(3, WM.zoom + 0.25)); };
  WM.zoomReset = function () { WM.setZoom(1); };

  /* ---------------------------------------------------------------- render */
  WM.host = function () { return OMA.$('#omarchy-windows'); };

  WM.render = function () {
    var host = WM.host();
    if (!host) return;
    WM.computeArea();
    var rects = WM.layoutRects();
    var live = {};

    Object.keys(rects).forEach(function (wid) {
      var w = WM.windows[wid];
      if (!w) return;
      if (w.ws !== WM.active) return;   // windows live on their own workspace

      live[wid] = true;
      var d = WM._els[wid];
      if (!d) {
        var def = WM.registry.get(w.appId);
        d = h('div.oma-win', { dataset: { wid: wid, app: w.appId } });
        var chrome = h('div.oma-win-chrome', [
          h('div.oma-win-tabs'),
          h('div.oma-win-grip')
        ]);
        var body = h('div.oma-win-body');
        d.appendChild(chrome);
        d.appendChild(body);
        host.appendChild(d);
        WM._els[wid] = d;
        w.el = d; w.body = body; w.chrome = chrome;
        d.addEventListener('mousedown', function () { WM.focus(wid); }, true);
        if (def && def.mount) {
          try { def.mount(body, w); } catch (e) { OMA.log('mount:' + w.appId, e); }
        }
        OMA.bus.emit('wm:mounted', w);
      }
      /* geometry */
      var r = rects[wid];
      d.style.width = r.w + 'px';
      d.style.height = r.h + 'px';
      d.style.transform = 'translate3d(' + r.x + 'px,' + r.y + 'px,0)';
      d.classList.toggle('is-floating', !!r.floating);
      d.classList.toggle('is-max', !!w.props.maximize);
      d.classList.toggle('is-transparent', !!w.props.transparent);
      d.classList.toggle('is-square', !!w.props.square);
      d.classList.toggle('is-pseudo', !!w.props.pseudo);
      d.classList.toggle('is-sticky', !!w.props.sticky);
      d.classList.toggle('is-grouped', !!w.props.group);
      d.classList.toggle('is-active', WM.ws().focus === wid);
      d.classList.toggle('is-focused-monitor', true);
    });

    /* Unmount windows that left this workspace. */
    Object.keys(WM._els).forEach(function (wid) {
      if (!live[wid]) {
        var el = WM._els[wid];
        delete WM._els[wid];
        el.classList.add('oma-win-closing');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 180);
      }
    });

    OMA.bus.emit('wm:layout', { active: WM.active, rects: rects });
  };

  WM.elFor = function (wid) { return WM._els[wid]; };
  WM.activeWin = function () { var ws = WM.ws(); return ws.focus ? WM.windows[ws.focus] : null; };
  WM.listActive = function () {
    var ws = WM.ws();
    return leaves(ws.tree).map(function (l) { return WM.windows[l.wid]; }).filter(Boolean);
  };
  WM.treeLeaves = function (wsId) { return leaves(WM.ws(wsId).tree).map(function (l) { return l.wid; }); };
  WM.occupied = function (id) { return leaves(WM.ws(id).tree).length > 0; };
  WM.setBar = function (v) { WM.barVisible = v; WM.render(); OMA.bus.emit('wm:bar', v); };
  WM.setGaps = function (v) { WM.gaps = v; WM.render(); };

  OMA.WM = WM;
})(window.OMA = window.OMA || {});
