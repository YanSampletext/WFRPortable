// Трекер схватки: порядок инициативы, здоровье и преимущество всех участников.
// Живёт отдельно от персонажа — схватка общая для стола, а не для одного досье.
(function () {
  'use strict';

  var KEY = 'wfrp4_encounter_v1';
  // { round, turnId, list:[{id,name,init,hp,maxHp,adv,foe,tb,ap,conds:{}}] }
  // tb — бонус стойкости, ap — класс брони: вместе они гасят урон по книге.
  var enc = null;

  // Состояния, которые срабатывают в конце раунда, — только они и нужны
  // трекеру. Полный список и правила живут на бланке персонажа.
  var TICKING = {
    'Кровоточащий': 'теряет 1 рану за пункт',
    'Горящий':      'получает 1d10 урона за пункт'
  };

  function fresh() { return { round: 1, turnId: null, list: [] }; }

  function load() {
    if (enc) return enc;
    try { enc = JSON.parse(localStorage.getItem(KEY)) || fresh(); }
    catch (e) { enc = fresh(); }
    if (!Array.isArray(enc.list)) enc = fresh();
    // Схватки, начатые до появления стойкости, брони и состояний
    enc.list.forEach(function (p) {
      if (typeof p.tb !== 'number') p.tb = 0;
      if (typeof p.ap !== 'number') p.ap = 0;
      if (!p.conds || typeof p.conds !== 'object') p.conds = {};
    });
    return enc;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(enc)); } catch (e) {}
  }

  function order() {
    // по инициативе вниз, при равенстве — по порядку добавления
    return load().list.map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) { return (b.x.init - a.x.init) || (a.i - b.i); })
      .map(function (p) { return p.x; });
  }

  // Чей сейчас ход, помним по id, а не по номеру в очереди: иначе новый
  // участник с высокой инициативой вклинивается вперёд и сдвигает ход чужому.
  // Ничего не меняет: пока ход никому не передавали, он у первого по
  // инициативе, и добавление более быстрого противника этот порядок поправит.
  function current() {
    var e = load(), list = order();
    if (!list.length) return null;
    return list.find(function (x) { return x.id === e.turnId; }) || list[0];
  }

  function refresh() {
    var host = document.getElementById('enc-body');
    if (host) host.innerHTML = rows();
    var head = document.getElementById('enc-head');
    if (head) head.textContent = 'Раунд ' + load().round;
  }

  function byId(id) { return load().list.find(function (p) { return p.id === id; }); }
  var uid = function () { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };

  // ── действия ────────────────────────────────────────────────────────────────
  window.encAdd = function (name, init, hp, foe, tb, ap) {
    var p = {
      id: uid(), name: name || 'Без имени',
      init: parseInt(init, 10) || 0,
      hp: parseInt(hp, 10) || 0, maxHp: parseInt(hp, 10) || 0,
      adv: 0, foe: !!foe,
      tb: parseInt(tb, 10) || 0, ap: parseInt(ap, 10) || 0,
      conds: {}
    };
    load().list.push(p);
    save(); refresh();
    return p.id;
  };

  window.encAddSelf = function () {
    if (typeof state === 'undefined' || !state || !state.name) { notify('Сначала открой персонажа.'); return; }
    if (load().list.some(function (p) { return p.name === state.name; })) { notify('Уже в схватке.'); return; }
    var calc = (typeof sheetCalc === 'function') ? sheetCalc() : null;
    // Стойкость и броню берём с бланка: считать их руками незачем
    var tb = calc ? Math.floor((calc.totals['СВ'] || 0) / 10) : 0;
    var ap = (typeof encSelfAP === 'function') ? encSelfAP() : 0;
    encAdd(state.name, (state.stats && state.stats['И']) || 0,
           (state.sheet && state.sheet.currentHP) || (calc && calc.maxHP) || 0, false, tb, ap);
  };

  // Средний класс брони по зонам: точная зона известна только при крите,
  // а в обычном ударе сойдёт то, что прикрывает тело.
  window.encSelfAP = function () {
    var best = 0;
    (((typeof state !== 'undefined' && state && state.sheet) || {}).armor || []).forEach(function (a) {
      var z = String(a.zones || '').toLowerCase();
      if (z.includes('тел') || z.includes('торс') || z.includes('груд')) best += parseInt(a.ap, 10) || 0;
    });
    return best;
  };

  // ── состояния участников ────────────────────────────────────────────────────
  window.encCond = function (id, name, delta) {
    var p = byId(id); if (!p) return;
    if (!p.conds) p.conds = {};
    var v = Math.max(0, (p.conds[name] || 0) + delta);
    if (v) p.conds[name] = v; else delete p.conds[name];
    save(); refresh();
  };

  window.encCondPick = function (id) {
    var p = byId(id); if (!p) return;
    var list = (typeof WFRP_CONDITIONS !== 'undefined' ? WFRP_CONDITIONS : Object.keys(TICKING));
    ordoChoice({
      title: 'Состояние для «' + p.name + '»',
      text: 'Нажми, чтобы добавить пункт. Снять — минусом в строке участника.',
      options: list.map(function (c) {
        return { label: c + (p.conds[c] ? ' · ' + p.conds[c] : ''), cb: function () { encCond(id, c, 1); } };
      })
    });
  };

  // Конец раунда: что должно сработать. Ничего не применяем молча — решает
  // мастер, приложение только не даёт забыть.
  function tickList() {
    return order().filter(function (p) {
      return Object.keys(p.conds || {}).some(function (c) { return TICKING[c]; });
    }).map(function (p) {
      var parts = Object.keys(p.conds).filter(function (c) { return TICKING[c]; })
        .map(function (c) { return c + ' ' + p.conds[c]; });
      return { p: p, text: p.name + ': ' + parts.join(', ') };
    });
  }

  // «Кровоточащий» — ровно 1 рана за пункт, это можно списать сразу.
  // «Горящий» — 1d10 за пункт, бросок отдаём кубам, чтобы всё было в журнале.
  window.encTickApply = function () {
    var hit = tickList();
    if (!hit.length) return;
    var lines = [];
    hit.forEach(function (row) {
      var p = row.p, lost = 0;
      var bleed = p.conds['Кровоточащий'] || 0;
      if (bleed) lost += bleed;
      var burn = p.conds['Горящий'] || 0;
      for (var i = 0; i < burn; i++) lost += Math.floor(Math.random() * 10) + 1;
      if (!lost) return;
      p.hp = Math.max(0, p.hp - lost);
      lines.push(p.name + ' −' + lost);
    });
    save(); refresh();
    if (lines.length) notify('Конец раунда: ' + lines.join(', '));
  };

  // Урон по книге: из него вычитаются бонус стойкости и класс брони.
  // Возвращает, сколько ран сняли на самом деле.
  window.encDamage = function (id, raw) {
    var p = byId(id); if (!p) return 0;
    var soak = (p.tb || 0) + (p.ap || 0);
    var lost = Math.max(0, (parseInt(raw, 10) || 0) - soak);
    p.hp = Math.max(0, p.hp - lost);
    save(); refresh();
    return lost;
  };

  window.encSoak = function (id) {
    var p = byId(id); return p ? (p.tb || 0) + (p.ap || 0) : 0;
  };

  window.encList = function () {
    return order().map(function (p) {
      return { id: p.id, name: p.name, hp: p.hp, maxHp: p.maxHp, foe: p.foe, soak: (p.tb || 0) + (p.ap || 0) };
    });
  };

  window.encHp = function (id, delta) {
    var p = byId(id); if (!p) return;
    p.hp = Math.max(0, p.hp + delta);
    save(); refresh();
  };

  window.encAdv = function (id, delta) {
    var p = byId(id); if (!p) return;
    p.adv = Math.max(0, (p.adv || 0) + delta);
    save(); refresh();
  };

  window.encRemove = function (id) {
    var e = load();
    // если убираем того, чей сейчас ход, передаём его следующему по очереди
    if (e.turnId === id) {
      var list = order(), i = list.findIndex(function (p) { return p.id === id; });
      var next = list[i + 1];
      e.turnId = next ? next.id : null;
    }
    e.list = e.list.filter(function (p) { return p.id !== id; });
    save(); refresh();
  };

  window.encNext = function () {
    var e = load(), list = order();
    if (!list.length) return;
    var now = current();
    var i = list.findIndex(function (p) { return p.id === now.id; });
    var wrapped = (i + 1 >= list.length);
    if (wrapped) { e.turnId = list[0].id; e.round++; }  // круг замкнулся — новый раунд
    else e.turnId = list[i + 1].id;
    save(); refresh();
    if (wrapped) roundEndPrompt();
  };

  // Кровь и огонь срабатывают в конце раунда, и об этом за столом забывают
  // чаще всего. Показываем, что должно произойти, но списываем только по
  // нажатию: последнее слово за мастером.
  function roundEndPrompt() {
    var hit = tickList();
    if (!hit.length) return;
    ordoConfirm({
      title: 'Конец раунда ' + (load().round - 1),
      text: hit.map(function (r) { return r.text; }).join('\n') +
            '\n\nКровоточащий — 1 рана за пункт, Горящий — 1d10 за пункт.',
      yes: 'Списать раны', no: 'Пропустить',
      onYes: function () { encTickApply(); }
    });
  }

  window.encReset = function () {
    ordoConfirm({
      title: 'Закончить схватку?',
      text: 'Список участников и счёт раундов будут очищены.',
      yes: 'Закончить', danger: true,
      onYes: function () { enc = fresh(); save(); refresh(); notify('Схватка завершена.'); }
    });
  };

  window.encPrompt = function () {
    ordoPromptRow(function (v) {
      if (!v.name) return;
      encAdd(v.name, v.init, v.hp, true, v.tb, v.ap);
    });
  };

  // Небольшая форма прямо в диалоге. Стойкость и броню можно не заполнять —
  // тогда урон списывается целиком, как и раньше.
  function ordoPromptRow(cb) {
    var html =
      '<div class="ordo-dlg-seal">✠</div>' +
      '<div class="ordo-dlg-title">Кто вступает в схватку</div>' +
      '<input class="ordo-dlg-input" id="enc-n" placeholder="Имя или «Разбойник 2»">' +
      '<div class="enc-form-row">' +
        '<input class="ordo-dlg-input" id="enc-i" type="number" inputmode="numeric" placeholder="иниц.">' +
        '<input class="ordo-dlg-input" id="enc-h" type="number" inputmode="numeric" placeholder="раны">' +
      '</div>' +
      '<div class="enc-form-row">' +
        '<input class="ordo-dlg-input" id="enc-t" type="number" inputmode="numeric" placeholder="бонус СВ">' +
        '<input class="ordo-dlg-input" id="enc-a" type="number" inputmode="numeric" placeholder="броня">' +
      '</div>' +
      '<div class="ordo-dlg-text enc-form-hint">Стойкость и броня гасят урон при ударе. Можно оставить пустыми.</div>' +
      '<div class="ordo-dlg-btns">' +
        '<button class="ordo-dlg-btn gold" id="enc-ok">Добавить</button>' +
        '<button class="ordo-dlg-btn" onclick="ordoDialogClose()">Отмена</button>' +
      '</div>';
    var d = document.getElementById('ordo-dlg');
    if (!d) { d = document.createElement('div'); d.id = 'ordo-dlg'; d.className = 'ordo-dlg-back'; document.body.appendChild(d); }
    d.innerHTML = '<div class="ordo-dlg-card" role="dialog" aria-modal="true">' + html + '</div>';
    d.classList.add('show');
    var val = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    document.getElementById('enc-ok').onclick = function () {
      var v = { name: val('enc-n').trim(), init: val('enc-i'), hp: val('enc-h'),
                tb: val('enc-t'), ap: val('enc-a') };
      ordoDialogClose();
      cb(v);
    };
    setTimeout(function () { try { document.getElementById('enc-n').focus(); } catch (e) {} }, 30);
  }

  // ── разметка ────────────────────────────────────────────────────────────────
  function rows() {
    var list = order();
    if (!list.length) {
      return '<p class="muted enc-empty">В схватке пока никого. Добавь себя и противников — приложение будет держать очередь и раны.</p>';
    }
    var now = current();
    return list.map(function (p) {
      var pct = p.maxHp > 0 ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : null;
      return '' +
        '<div class="enc-row' + (p === now ? ' now' : '') + (p.hp === 0 && p.maxHp ? ' down' : '') + '">' +
          '<div class="enc-init">' + p.init + '</div>' +
          '<div class="enc-main">' +
            '<div class="enc-name">' + escHtml(p.name) + (p === now ? ' <span class="enc-tag">ход</span>' : '') + '</div>' +
            (pct === null ? '' : '<div class="enc-hp-bar"><i style="width:' + Math.round(pct * 100) + '%"></i></div>') +
            '<div class="enc-sub">раны ' + p.hp + (p.maxHp ? ' / ' + p.maxHp : '') +
              ' · преим. ' + (p.adv || 0) +
              ((p.tb || p.ap) ? ' · гасит ' + ((p.tb || 0) + (p.ap || 0)) : '') + '</div>' +
            condChips(p) +
          '</div>' +
          '<div class="enc-btns">' +
            '<button class="enc-b" data-enc="hp-" data-id="' + p.id + '" aria-label="Рана">−</button>' +
            '<button class="enc-b" data-enc="hp+" data-id="' + p.id + '" aria-label="Лечение">+</button>' +
            '<button class="enc-b adv" data-enc="adv+" data-id="' + p.id + '" aria-label="Преимущество">⚑</button>' +
            '<button class="enc-b cond" data-enc="cond" data-id="' + p.id + '" aria-label="Состояние">☠</button>' +
            '<button class="enc-b del" data-enc="del" data-id="' + p.id + '" aria-label="Убрать">✕</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  // Состояния строкой: тап по фишке снимает пункт
  function condChips(p) {
    var names = Object.keys(p.conds || {});
    if (!names.length) return '';
    return '<div class="enc-conds">' + names.map(function (c) {
      return '<button class="enc-chip' + (TICKING[c] ? ' tick' : '') + '"' +
             ' data-enc="cond-" data-id="' + p.id + '" data-c="' + escHtml(c) + '"' +
             ' title="снять пункт">' + escHtml(c) + ' ' + p.conds[c] + '</button>';
    }).join('') + '</div>';
  }

  window.encounterHtml = function () {
    return '' +
      '<div class="sv4-block enc-block">' +
        '<div class="sv4-block-title">Схватка · <span id="enc-head">Раунд ' + load().round + '</span></div>' +
        '<div class="enc-tools">' +
          '<button class="sv4-btn-mini btn-gold enc-next" data-enc="next">Следующий ход →</button>' +
          '<button class="sv4-btn-mini" data-enc="self">+ Я</button>' +
          '<button class="sv4-btn-mini" data-enc="add">+ Участник</button>' +
          '<button class="sv4-btn-mini" data-enc="reset">Закончить</button>' +
        '</div>' +
        '<div id="enc-body" class="enc-list">' + rows() + '</div>' +
      '</div>';
  };

  // ── одно делегирование на весь трекер ───────────────────────────────────────
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-enc]');
    if (!el) return;
    var id = el.dataset.id;
    switch (el.dataset.enc) {
      case 'hp-': encHp(id, -1); break;
      case 'hp+': encHp(id, 1); break;
      case 'adv+': encAdv(id, 1); break;
      case 'cond': encCondPick(id); break;
      case 'cond-': encCond(id, el.dataset.c, -1); break;
      case 'del': encRemove(id); break;
      case 'next': encNext(); break;
      case 'self': encAddSelf(); break;
      case 'add': encPrompt(); break;
      case 'reset': encReset(); break;
    }
  });
})();
