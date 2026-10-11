/* ============================================================================
 * Omarchy Web Clone — boot.js
 * ----------------------------------------------------------------------------
 * The whole cold-start path, in upstream order:
 *   Limine bootloader  (snapshots, "Direct Boot")
 *   LUKS unlock        (themed Plymouth unlock art)
 *   systemd            (Plymouth splash -> boot log)
 *   SDDM               (login, themed to match the unlock theme)
 *   first-run installer (full disk or free space, encryption by default)
 * ==========================================================================*/
(function (OMA) {
  'use strict';
  var h = OMA.h, clear = OMA.clear, fmt = OMA.fmt, I = OMA.Shell.icons;

  var Boot = { enabled: true, root: null };

  function host() {
    if (!Boot.root) {
      Boot.root = h('div#omarchy-boot');
      document.body.appendChild(Boot.root);
    }
    return Boot.root;
  }
  function finish() {
    var el = host();
    el.style.transition = 'opacity 420ms ease';
    el.style.opacity = '0';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); Boot.root = null; }, 460);
  }

  /* ------------------------------------------------------------- Limine */
  function limine() {
    return new Promise(function (resolve) {
      var el = host();
      clear(el);
      var entries = [
        { label: 'Omarchy 4.0.4 (Quattro)', sub: 'linux-omarchy 6.16.4 · encrypted root' },
        { label: 'Omarchy 4.0.4 — snapshots', sub: 'btrfs · pre-update rollback' },
        { label: 'Omarchy 4.0.3 (previous)', sub: 'linux-omarchy 6.16.2' },
        { label: 'UEFI firmware settings', sub: '' }
      ];
      var sel = 0;
      var menu = h('div.boot-menu');
      function paint() {
        clear(menu);
        entries.forEach(function (e, i) {
          menu.appendChild(h('div.boot-menu-item' + (i === sel ? '.is-sel' : ''), [
            h('span', { text: e.label }),
            h('span', { text: e.sub })
          ]));
        });
      }
      paint();
      el.appendChild(h('div.boot-logo', [
        h('div.boot-art', { html: OMA.Art.mark(74) }),
        h('div.boot-title', { text: 'OMARCHY' }),
        h('div.boot-sub', { text: 'Beautiful, fun & agentic Linux — Quattro 4.0.4' }),
        menu,
        h('div.boot-keys', { html: '<b>^ v</b> choose &nbsp;·&nbsp; <b>Enter</b> boot &nbsp;·&nbsp; <b>s</b> skip this menu next time' })
      ]));
      var t = setTimeout(function () { done(); }, 2600);
      function done() {
        clearTimeout(t);
        window.removeEventListener('keydown', onKey, true);
        resolve();
      }
      function onKey(e) {
        if (e.key === 'ArrowDown') { sel = (sel + 1) % entries.length; paint(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { sel = (sel - 1 + entries.length) % entries.length; paint(); e.preventDefault(); }
        else if (e.key === 'Enter') { e.preventDefault(); done(); }
        else if (e.key === 's' || e.key === 'S') { OMA.Store.set('skipBootMenu', true); done(); }
      }
      window.addEventListener('keydown', onKey, true);
    });
  }

  /* --------------------------------------------------------------- LUKS */
  function luks() {
    return new Promise(function (resolve) {
      var el = host();
      clear(el);
      var input = h('input.luks-input', { type: 'password', placeholder: '••••••••', autocomplete: 'off' });
      var err = h('div.luks-err', { text: '' });
      var tries = 0;
      el.appendChild(h('div.luks', [
        h('div.luks-art', { html: OMA.Art.mark(96) }),
        h('div.luks-title', { text: 'Enter the passphrase to unlock the disk' }),
        h('div.luks-hint', { text: 'nvme0n1p2 · LUKS2 · aes-xts-plain64 · argon2id' }),
        input,
        err,
        h('div.luks-hint', { text: 'Any passphrase unlocks this clone — press Enter (or leave it empty).' })
      ]));
      setTimeout(function () { input.focus(); }, 120);
      function attempt() {
        tries++;
        if (input.value.length === 0 && tries === 1) {
          err.textContent = 'An empty passphrase is accepted here because there is no real disk.';
        }
        window.removeEventListener('keydown', onKey, true);
        resolve();
      }
      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') attempt();
      });
      function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); attempt(); } }
      window.addEventListener('keydown', onKey, true);
    });
  }

  /* ------------------------------------------------------------- systemd */
  var BOOT_LINES = [
    ['[  OK  ]', 'Started Journal Service.', 'ok'],
    ['[  OK  ]', 'Reached target Basic System.', 'ok'],
    ['[  OK  ]', 'Started D-Bus System Message Bus.', 'ok'],
    ['[  OK  ]', 'Started Network Manager.', 'ok'],
    ['[  OK  ]', 'Started Bluetooth service.', 'ok'],
    ['[  OK  ]', 'Started PipeWire Multimedia Service.', 'ok'],
    ['[  OK  ]', 'Mounted /boot (vfat).', 'ok'],
    ['[  OK  ]', 'Mounted /home (btrfs, compress=zstd).', 'ok'],
    ['[  OK  ]', 'Started Snapper timeline snapshots.', 'ok'],
    ['[  OK  ]', 'Loaded Omarchy kernel: linux-omarchy 6.16.4.', 'ok'],
    ['[  OK  ]', 'Started hyprsunset night light.', 'ok'],
    ['[  OK  ]', 'Started omarchy-owe wallpaper engine.', 'ok'],
    ['[  OK  ]', 'Started omarchy-shell (Quickshell).', 'ok'],
    ['[  OK  ]', 'Started Hyprland compositor.', 'ok'],
    ['[  OK  ]', 'Reached target Graphical Interface.', 'ok']
  ];

  function systemd() {
    return new Promise(function (resolve) {
      var el = host();
      clear(el);
      var log = h('div.boot-log');
      var barFill = h('i');
      el.appendChild(log);
      el.appendChild(h('div.boot-progress', [barFill]));
      var i = 0;
      var timer = setInterval(function () {
        if (i >= BOOT_LINES.length) {
          clearInterval(timer);
          setTimeout(resolve, 380);
          return;
        }
        var l = BOOT_LINES[i++];
        log.appendChild(h('div.boot-line', [
          h('span.boot-ok', { text: l[0] + ' ' }),
          h('span', { text: l[1] })
        ]));
        log.scrollTop = log.scrollHeight;
        barFill.style.width = (i / BOOT_LINES.length * 100) + '%';
      }, 110);
      function onKey(e) { if (e.key === 'Enter') { clearInterval(timer); resolve(); } }
      window.addEventListener('keydown', onKey, true);
      resolve._cleanup = function () { window.removeEventListener('keydown', onKey, true); };
    });
  }

  /* ---------------------------------------------------------------- SDDM */
  function sddm() {
    return new Promise(function (resolve) {
      var el = host();
      clear(el);
      var user = OMA.Store.get('user') || 'oma';
      var input = h('input.sddm-input', { type: 'password', placeholder: 'Password', autocomplete: 'off' });
      var timeEl = h('div.sddm-time', { text: fmt.clock() });
      var timer = setInterval(function () { timeEl.textContent = fmt.clock(); }, 1000);
      el.appendChild(h('div.sddm', [
        timeEl,
        h('div.sddm-user', [
          h('div.sddm-avatar', { text: (OMA.Store.get('name') || 'Omarchy User').slice(0, 1).toUpperCase() }),
          h('div.sddm-name', { text: (OMA.Store.get('name') || 'Omarchy User') + ' — ' + user }),
          input,
          h('div.sddm-hint', { text: 'Session: Hyprland (uwsm) · any password works · Enter to log in' })
        ])
      ]));
      setTimeout(function () { input.focus(); }, 120);
      function login() {
        clearInterval(timer);
        window.removeEventListener('keydown', onKey, true);
        resolve();
      }
      input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') login(); });
      function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); login(); } }
      window.addEventListener('keydown', onKey, true);
    });
  }

  /* ------------------------------------------------- first-run installer */
  function installer() {
    return new Promise(function (resolve) {
      var el = h('div.installer');
      document.body.appendChild(el);
      var steps = ['Welcome', 'Keyboard', 'Disk', 'Encryption', 'Account', 'Extras', 'Install'];
      var state = {
        step: 1, layout: 'us', disk: 'full', encrypt: true,
        user: OMA.Store.get('user') || 'oma',
        name: OMA.Store.get('name') || 'Omarchy User',
        email: OMA.Store.get('email') || 'oma@omarchy.org',
        host: 'oma-arch', theme: 'tokyo-night', extras: { rails: true, docker: true, fonts: true }
      };

      function header() {
        var s = h('div.installer-steps');
        steps.forEach(function (t, i) {
          s.appendChild(h('div.installer-step' + (i < state.step ? '.is-done' : (i === state.step ? '.is-active' : '')), { text: (i + 1) + '. ' + t }));
        });
        return s;
      }

      function render() {
        clear(el);
        var panel = h('div.installer-panel');
        panel.appendChild(h('div.installer-head', [
          h('div', { html: OMA.Art.mark(30) }),
          h('div', [h('div.boot-title', { text: 'OMARCHY' }), h('div.boot-sub', { text: 'Installer · Quattro 4.0.4 · the ISO is under 6 GB and installs in minutes' })])
        ]));
        panel.appendChild(header());
        var body = h('div.installer-body');

        if (state.step === 0) {
          body.appendChild(h('div.installer-q', { text: 'Welcome to the Omarchy installer.' }));
          body.appendChild(h('div.installer-note', {
            text: 'Omarchy is an omakase Arch Linux distribution: Arch + Hyprland + the Quickshell desktop construction kit, with everything a savvy computer user needs to be productive immediately. This wizard is a faithful reproduction of the real install flow — it writes no partitions and erases nothing.'
          }));
        } else if (state.step === 1) {
          body.appendChild(h('div.installer-q', { text: 'Choose your keyboard layout.' }));
          var opts = h('div.installer-opts');
          ['us', 'gb', 'de', 'dk', 'kr', 'fr', 'no', 'se'].forEach(function (l) {
            opts.appendChild(h('div.installer-opt' + (state.layout === l ? '.is-sel' : ''), {
              text: l + (l === 'us' ? '  (English US)' : ''), onclick: function () { state.layout = l; render(); }
            }));
          });
          body.appendChild(opts);
        } else if (state.step === 2) {
          body.appendChild(h('div.installer-q', { text: 'Where should Omarchy live?' }));
          var opts2 = h('div.installer-opts');
          [['full', 'Full disk — erase the whole drive and install Omarchy'], ['free', 'Free space — dual boot alongside what is already there']].forEach(function (o) {
            opts2.appendChild(h('div.installer-opt' + (state.disk === o[0] ? '.is-sel' : ''), { text: o[1], onclick: function () { state.disk = o[0]; render(); } }));
          });
          body.appendChild(opts2);
          body.appendChild(h('div.installer-disk', {
            text: 'nvme0n1  1.9 TB  Samsung SSD 990 PRO\n' +
              '├─nvme0n1p1   1.0 GB   vfat    /boot          EFI System\n' +
              '├─nvme0n1p2   1.8 TB   btrfs   /              LUKS2 (aes-xts-plain64)\n' +
              '└─nvme0n1p3  16.0 GB   swap    [SWAP]         hibernation'
          }));
        } else if (state.step === 3) {
          body.appendChild(h('div.installer-q', { text: 'Full disk encryption is on by default.' }));
          var opts3 = h('div.installer-opts');
          [['on', 'Encrypt the disk (LUKS2 + argon2id) — recommended, and what Omarchy ships'], ['off', 'No encryption — skip the unlock passphrase at every boot']].forEach(function (o) {
            opts3.appendChild(h('div.installer-opt' + ((state.encrypt ? 'on' : 'off') === o[0] ? '.is-sel' : ''), {
              text: o[1], onclick: function () { state.encrypt = o[0] === 'on'; render(); }
            }));
          });
          body.appendChild(opts3);
          body.appendChild(h('div.installer-note', { text: 'Pressing Ctrl + C on the disk confirmation screen is how the real installer performs a no-encryption install.' }));
        } else if (state.step === 4) {
          body.appendChild(h('div.installer-q', { text: 'Who is this computer for?' }));
          [['name', 'Full name'], ['user', 'Username'], ['email', 'Email'], ['host', 'Hostname']].forEach(function (f) {
            var inp = h('input.installer-input', { value: state[f[0]], spellcheck: 'false' });
            inp.addEventListener('input', function () { state[f[0]] = inp.value; });
            inp.addEventListener('keydown', function (e) { e.stopPropagation(); });
            body.appendChild(h('label.installer-note', { text: f[1] }));
            body.appendChild(inp);
          });
          body.appendChild(h('div.installer-note', { text: 'Your name and email become the XCompose quick-completions (Shift + CapsLock Space N / E).' }));
        } else if (state.step === 5) {
          body.appendChild(h('div.installer-q', { text: 'Anything to pre-install?' }));
          [['rails', 'Ruby on Rails — mise, Rails 8.1, PostgreSQL, Redis'], ['docker', 'Docker + Compose with the database containers'], ['fonts', 'JetBrainsMono Nerd Font and the extra font set']].forEach(function (e) {
            body.appendChild(h('div.installer-opt' + (state.extras[e[0]] ? '.is-sel' : ''), {
              text: (state.extras[e[0]] ? '☑ ' : '☐ ') + e[1],
              onclick: function () { state.extras[e[0]] = !state.extras[e[0]]; render(); }
            }));
          });
          var sel = h('select.installer-input');
          OMA.Themes.list.forEach(function (t) {
            sel.appendChild(h('option', { value: t.id, text: 'Theme: ' + t.name, selected: t.id === state.theme }));
          });
          sel.addEventListener('change', function () { state.theme = sel.value; });
          sel.addEventListener('keydown', function (e) { e.stopPropagation(); });
          body.appendChild(sel);
        } else {
          body.appendChild(h('div.installer-q', { text: 'Ready to install.' }));
          body.appendChild(h('div.installer-disk', {
            text: 'Keyboard    ' + state.layout + '\n' +
              'Disk        ' + (state.disk === 'full' ? 'full disk (nvme0n1)' : 'free space') + '\n' +
              'Encryption  ' + (state.encrypt ? 'LUKS2 + argon2id' : 'none') + '\n' +
              'Account     ' + state.name + ' <' + state.email + '> (' + state.user + ')\n' +
              'Hostname    ' + state.host + '\n' +
              'Extras      ' + Object.keys(state.extras).filter(function (k) { return state.extras[k]; }).join(', ') + '\n' +
              'Theme       ' + OMA.Themes.byId(state.theme).name
          }));
          var logEl = h('div.installer-disk', { text: '' });
          body.appendChild(logEl);
          var lines = [
            'creating partitions…',
            'formatting nvme0n1p1 as vfat…',
            'formatting nvme0n1p2 as btrfs (compress=zstd)…',
            state.encrypt ? 'setting up LUKS2 container on nvme0n1p2…' : 'skipping encryption…',
            'creating btrfs subvolumes @ @home @snapshots…',
            'installing base system from the Arch mirror…',
            'installing omarchy packages from pkgs.omarchy.org…',
            'installing linux-omarchy 6.16.4…',
            'installing bootloader (Limine)…',
            'writing the SDDM theme to match ' + OMA.Themes.byId(state.theme).name + '…',
            'setting the default theme to ' + OMA.Themes.byId(state.theme).name + '…',
            'enabling snapper timeline snapshots…',
            'install complete'
          ];
          var li = 0;
          var timer = setInterval(function () {
            if (li >= lines.length) { clearInterval(timer); return; }
            logEl.textContent += '[omarchy] ' + lines[li++] + '\n';
            logEl.scrollTop = logEl.scrollHeight;
          }, 260);
          state._timer = timer;
        }

        panel.appendChild(body);
        panel.appendChild(h('div.installer-foot', [
          h('div.installer-note', { text: state.step === 6 ? 'Enter finishes and boots the desktop.' : 'Enter continues · this wizard reproduces the real flow and changes nothing on your disk.' }),
          h('div', [
            state.step > 0 ? h('button.oma-btn', { text: 'Back', onclick: function () { state.step--; render(); } }) : null,
            h('button.oma-btn.oma-btn-primary', { text: state.step === 6 ? 'Finish and boot' : 'Continue', onclick: next })
          ])
        ]));
        el.appendChild(panel);
      }

      function next() {
        if (state.step === 4) {
          OMA.Store.set('name', state.name);
          OMA.Store.set('user', state.user || 'oma');
          OMA.Store.set('email', state.email);
        }
        if (state.step === 5) OMA.System.setTheme(state.theme, true);
        if (state.step === 6) {
          clearInterval(state._timer);
          if (el.parentNode) el.parentNode.removeChild(el);
          window.removeEventListener('keydown', onKey, true);
          OMA.Store.set('onboarded', true);
          resolve();
          return;
        }
        state.step++;
        render();
      }
      function onKey(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'INPUT') { e.preventDefault(); next(); }
        if (e.key === 'Escape') { e.preventDefault(); next(); }
      }
      window.addEventListener('keydown', onKey, true);
      render();
    });
  }

  /* ----------------------------------------------------------- power off */
  Boot.reboot = function () {
    var el = h('div.installer', [
      h('div', { style: { textAlign: 'center' } }, [
        h('div.boot-title', { text: 'RESTARTING' }),
        h('div.boot-sub', { text: 'The session will restart. Press any key to come back.', style: { marginTop: '10px' } })
      ])
    ]);
    document.body.appendChild(el);
    function back() {
      window.removeEventListener('keydown', back, true);
      if (el.parentNode) el.parentNode.removeChild(el);
      location.reload();
    }
    setTimeout(function () { window.addEventListener('keydown', back, true); }, 600);
  };
  Boot.shutdown = function () {
    var el = h('div.installer', [
      h('div', { style: { textAlign: 'center' } }, [
        h('div.boot-title', { text: 'POWER OFF' }),
        h('div.boot-sub', { text: 'It is now safe to close this tab, or press any key to power back on.', style: { marginTop: '10px' } })
      ])
    ]);
    document.body.appendChild(el);
    function back() {
      window.removeEventListener('keydown', back, true);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    setTimeout(function () { window.addEventListener('keydown', back, true); }, 600);
  };

  /* --------------------------------------------------------------- drive */
  Boot.run = function () {
    if (!Boot.enabled) return Promise.resolve();
    var chain = Promise.resolve();
    if (!OMA.Store.get('skipBootMenu')) chain = chain.then(limine);
    chain = chain.then(luks).then(systemd).then(sddm);
    chain = chain.then(function () {
      if (!OMA.Store.get('onboarded')) return installer();
      return null;
    });
    return chain.then(finish).catch(function (e) { OMA.log('boot', e); finish(); });
  };

  OMA.Boot = Boot;
})(window.OMA = window.OMA || {});
