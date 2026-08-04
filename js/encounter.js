// Трекер схватки: порядок инициативы, здоровье и преимущество всех участников.
// Живёт отдельно от персонажа — схватка общая для стола, а не для одного досье.
(function () {
  'use strict';

  var KEY = 'wfrp4_encounter_v1';
  var enc = null;    // { round, turnId, list:[{id,name,init,hp,maxHp,adv,foe}] }

  function fresh() { return { round: 1, turnId: null, list: [] }; }

  function load() {
    if (enc) return enc;
    try { enc = JSON.parse(localStorage.getItem(KEY)) || fresh(); }
    catch (e) { enc = fresh(); }
    if (!Array.isArray(enc.list)) enc = fresh();
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
  window.encAdd = function (name, init, hp, foe) {
    load().list.push({
      id: uid(), name: name || 'Без имени',
      init: parseInt(init, 10) || 0,
      hp: parseInt(hp, 10) || 0, maxHp: parseInt(hp, 10) || 0,
      adv: 0, foe: !!foe
    });
    save(); refresh();
  };

  window.encAddSelf = function () {
    if (typeof state === 'undefined' || !state || !state.name) { notify('Сначала открой персонажа.'); return; }
    if (load().list.some(function (p) { return p.name === state.name; })) { notify('Уже в схватке.'); return; }
    var calc = (typeof sheetCalc === 'function') ? sheetCalc() : null;
    encAdd(state.name, (state.stats && state.stats['И']) || 0,
           (state.sheet && state.sheet.currentHP) || (calc && calc.maxHP) || 0, false);
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
    if (i + 1 >= list.length) { e.turnId = list[0].id; e.round++; }  // круг замкнулся — новый раунд
    else e.turnId = list[i + 1].id;
    save(); refresh();
  };

  window.encReset = function () {
    ordoConfirm({
      title: 'Закончить схватку?',
      text: 'Список участников и счёт раундов будут очищены.',
      yes: 'Закончить', danger: true,
      onYes: function () { enc = fresh(); save(); refresh(); notify('Схватка завершена.'); }
    });
  };

  window.encPrompt = function () {
    ordoPromptRow(function (name, init, hp) {
      if (!name) return;
      encAdd(name, init, hp, true);
    });
  };

  // Небольшая форма прямо в диалоге: имя, инициатива, раны
  function ordoPromptRow(cb) {
    var html =
      '<div class="ordo-dlg-seal">✠</div>' +
      '<div class="ordo-dlg-title">Кто вступает в схватку</div>' +
      '<input class="ordo-dlg-input" id="enc-n" placeholder="Имя или «Разбойник 2»">' +
      '<div class="enc-form-row">' +
        '<input class="ordo-dlg-input" id="enc-i" type="number" inputmode="numeric" placeholder="иниц.">' +
        '<input class="ordo-dlg-input" id="enc-h" type="number" inputmode="numeric" placeholder="раны">' +
      '</div>' +
      '<div class="ordo-dlg-btns">' +
        '<button class="ordo-dlg-btn gold" id="enc-ok">Добавить</button>' +
        '<button class="ordo-dlg-btn" onclick="ordoDialogClose()">Отмена</button>' +
      '</div>';
    var d = document.getElementById('ordo-dlg');
    if (!d) { d = document.createElement('div'); d.id = 'ordo-dlg'; d.className = 'ordo-dlg-back'; document.body.appendChild(d); }
    d.innerHTML = '<div class="ordo-dlg-card" role="dialog" aria-modal="true">' + html + '</div>';
    d.classList.add('show');
    document.getElementById('enc-ok').onclick = function () {
      var n = document.getElementById('enc-n').value.trim();
      var i = document.getElementById('enc-i').value;
      var h = document.getElementById('enc-h').value;
      ordoDialogClose();
      cb(n, i, h);
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
              ' · преим. ' + (p.adv || 0) + '</div>' +
          '</div>' +
          '<div class="enc-btns">' +
            '<button class="enc-b" data-enc="hp-" data-id="' + p.id + '" aria-label="Рана">−</button>' +
            '<button class="enc-b" data-enc="hp+" data-id="' + p.id + '" aria-label="Лечение">+</button>' +
            '<button class="enc-b adv" data-enc="adv+" data-id="' + p.id + '" aria-label="Преимущество">⚑</button>' +
            '<button class="enc-b del" data-enc="del" data-id="' + p.id + '" aria-label="Убрать">✕</button>' +
          '</div>' +
        '</div>';
    }).join('');
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
      case 'del': encRemove(id); break;
      case 'next': encNext(); break;
      case 'self': encAddSelf(); break;
      case 'add': encPrompt(); break;
      case 'reset': encReset(); break;
    }
  });
})();
