// Экран «Архив досье»: одна разметка карточки на оба места, где он показывается —
// список на стартовом экране и полноэкранный архив (шаг 0). Раньше это были две
// независимые функции, рисовавшие одного и того же персонажа по-разному.
(function () {
  'use strict';

  var SORTS = {
    updated: { label: 'по изменению', cmp: function (a, b) { return (b._updated || 0) - (a._updated || 0); } },
    name:    { label: 'по имени',     cmp: function (a, b) { return (a.name || '').localeCompare(b.name || '', 'ru'); } },
    tier:    { label: 'по ступени',   cmp: function (a, b) { return ((b.sheet && b.sheet.tier) || 1) - ((a.sheet && a.sheet.tier) || 1); } }
  };

  var sortKey = 'updated';
  var query = '';
  var undoTimer = null;
  var lastDeleted = null;   // { char, index } — для отмены удаления

  // ── данные карточки ─────────────────────────────────────────────────────
  function cardData(p) {
    var r = p.race ? DATA.races[p.race] : null;
    var c = p.career ? DATA.careers[p.career] : null;
    var tierNo = (p.sheet && p.sheet.tier) || 1;
    var tier = c && c.tiers ? c.tiers[tierNo - 1] : null;
    var maxHP = (p.sheet && p.sheet.maxHP) || 0;
    var hp = (p.sheet && typeof p.sheet.currentHP === 'number') ? p.sheet.currentHP : null;
    return {
      id: p.id,
      name: p.name || '(без имени)',
      race: r ? r.name : '—',
      career: p.career || '—',
      tierNo: tierNo,
      tierName: tier ? tier.name : '',
      xp: (p.xpGained || 0) - ((p.sheet && p.sheet.spentXP) || 0),
      fate: (p.sheet && p.sheet.fate) != null ? p.sheet.fate : ((r && r.fate) || 0),
      hp: hp, maxHP: maxHP,
      hpPct: (maxHP > 0 && hp != null) ? Math.max(0, Math.min(1, hp / maxHP)) : null,
      dead: !!(p.sheet && p.sheet.gmDead),
      updated: p._updated ? new Date(p._updated).toLocaleDateString('ru-RU') : ''
    };
  }

  // ── одна карточка, одна разметка на все экраны ──────────────────────────
  function cardHtml(p) {
    var d = cardData(p);
    var bar = d.hpPct == null ? '' :
      '<div class="ark-hp"><i style="width:' + Math.round(d.hpPct * 100) + '%"></i></div>';
    return '' +
      '<article class="ark-card' + (d.dead ? ' dead' : '') + '" data-action="open" data-id="' + escAttr(d.id) + '">' +
        '<div class="ark-main">' +
          '<h3 class="ark-name">' + escHtml(d.name) + '</h3>' +
          '<div class="ark-sub">' + escHtml(d.race) + ' · ' + escHtml(d.career) +
            ' · ступень ' + d.tierNo + (d.tierName ? ' · ' + escHtml(d.tierName) : '') + '</div>' +
          '<div class="ark-figures">' +
            '<span><b>' + d.xp + '</b> опыт</span>' +
            (d.hp != null ? '<span><b>' + d.hp + '</b>' + (d.maxHP ? '/' + d.maxHP : '') + ' ХП</span>' : '') +
            '<span><b>' + d.fate + '</b> судьба</span>' +
          '</div>' + bar +
          (d.updated ? '<div class="ark-date">изменено ' + d.updated + '</div>' : '') +
        '</div>' +
        '<button class="ark-more" data-action="menu" data-id="' + escAttr(d.id) + '" ' +
          'aria-label="Действия с досье">⋯</button>' +
        (d.dead ? '<span class="ark-dead-stamp">мёртв</span>' : '') +
      '</article>';
  }

  function emptyHtml() {
    return '<div class="ark-empty">' +
      '<p>Архив пуст.</p>' +
      '<button class="btn btn-gold" data-action="create">Завести досье</button></div>';
  }

  function toolbarHtml(total) {
    var opts = Object.keys(SORTS).map(function (k) {
      return '<option value="' + k + '"' + (k === sortKey ? ' selected' : '') + '>' + SORTS[k].label + '</option>';
    }).join('');
    return '<div class="ark-tools">' +
      (total > 5 ? '<input class="ark-search" type="search" placeholder="Поиск по имени или карьере" ' +
                   'value="' + escAttr(query) + '" data-action="search">' : '') +
      '<label class="ark-sort">Сортировка <select data-action="sort">' + opts + '</select></label>' +
      '</div>';
  }

  function visible(roster) {
    var q = query.trim().toLowerCase();
    var list = roster.slice();
    if (q) {
      list = list.filter(function (p) {
        return ((p.name || '') + ' ' + (p.career || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    return list.sort(SORTS[sortKey].cmp);
  }

  // ── публичный рендер: один и тот же список в двух местах ────────────────
  window.renderArchiveInto = function (el, opts) {
    if (!el) return;
    var o = opts || {};
    var roster = loadRoster();
    if (!roster.length) { el.innerHTML = emptyHtml(); return; }
    var list = visible(roster);
    var cards = list.length
      ? list.map(cardHtml).join('')
      : '<div class="ark-empty"><p>Ничего не нашлось.</p></div>';
    el.innerHTML = (o.tools ? toolbarHtml(roster.length) : '') +
      '<div class="ark-list">' + cards + '</div>';
  };

  // ── действия ────────────────────────────────────────────────────────────
  function charById(id) { return loadRoster().find(function (p) { return p.id === id; }); }

  function openMenu(id) {
    var p = charById(id);
    if (!p) return;
    ordoChoice({
      title: p.name || '(без имени)',
      text: 'Что делаем с досье?',
      options: [
        { label: 'Открыть бланк', cb: function () { openCharacter(id); } },
        { label: 'Магазин опыта', cb: function () { openCharacterShop(id); } },
        { label: 'Выгрузить в JSON', cb: function () { exportOne(id); } },
        { label: 'Сделать копию', cb: function () { duplicate(id); } },
        { label: 'Изъять из архива', danger: true, cb: function () { askDelete(id); } }
      ]
    });
  }

  function exportOne(id) {
    var p = charById(id);
    if (!p) return;
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dosye-' + (p.name || 'bez-imeni').replace(/\s+/g, '-') + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    notify('Досье выгружено.');
  }

  function duplicate(id) {
    var roster = loadRoster();
    var p = roster.find(function (x) { return x.id === id; });
    if (!p) return;
    var copy = JSON.parse(JSON.stringify(p));
    copy.id = (typeof genCharId === 'function') ? genCharId() : String(Date.now());
    copy.name = (p.name || 'Без имени') + ' (копия)';
    copy._updated = Date.now();
    roster.push(copy);
    saveRoster(roster);
    refresh();
    notify('Копия заведена.');
  }

  function askDelete(id) {
    var p = charById(id);
    if (!p) return;
    ordoConfirm({
      title: 'Изъять дело из архива?',
      text: (p.name || '(без имени)') + ' будет убран из архива. Несколько секунд можно передумать.',
      yes: 'Изъять', danger: true,
      onYes: function () { doDelete(id); }
    });
  }

  function doDelete(id) {
    var roster = loadRoster();
    var i = roster.findIndex(function (p) { return p.id === id; });
    if (i < 0) return;
    lastDeleted = { char: roster[i], index: i };
    roster.splice(i, 1);
    saveRoster(roster);
    refresh();
    showUndo();
  }

  function showUndo() {
    var bar = document.getElementById('ark-undo');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ark-undo';
      bar.innerHTML = '<span>Дело изъято</span><button data-action="undo">Вернуть</button>';
      document.body.appendChild(bar);
    }
    bar.classList.add('show');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () { bar.classList.remove('show'); lastDeleted = null; }, 6000);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    var roster = loadRoster();
    roster.splice(Math.min(lastDeleted.index, roster.length), 0, lastDeleted.char);
    saveRoster(roster);
    lastDeleted = null;
    var bar = document.getElementById('ark-undo');
    if (bar) bar.classList.remove('show');
    refresh();
    notify('Дело возвращено в архив.');
  }

  function refresh() {
    if (typeof renderRoster === 'function' && document.getElementById('roster-area')) renderRoster();
    if (typeof renderLandingChars === 'function' && document.getElementById('landing-char-list')) renderLandingChars();
  }

  // ── одно делегирование на оба контейнера вместо инлайновых onclick ──────
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var host = el.closest('#roster-area, #landing-char-list, #ark-undo');
    if (!host) return;
    var action = el.dataset.action;
    var id = el.dataset.id || (el.closest('[data-id]') || {}).dataset?.id;
    if (action === 'menu') { e.stopPropagation(); openMenu(id); }
    else if (action === 'open') { openCharacter(id); }
    else if (action === 'create') { startNewCharacter(); }
    else if (action === 'undo') { undoDelete(); }
  });

  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-action="sort"]');
    if (el) { sortKey = el.value; refresh(); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target.closest('[data-action="search"]');
    if (!el) return;
    query = el.value;
    var host = el.closest('#roster-area, #landing-char-list');
    refresh();
    // возвращаем фокус и каретку в поле после перерисовки списка
    var again = document.querySelector((host && host.id ? '#' + host.id : '') + ' [data-action="search"]');
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
  });

  // долгое нажатие по карточке — то же меню, что и по «⋯»
  var pressTimer = null;
  document.addEventListener('touchstart', function (e) {
    var card = e.target.closest('#roster-area .ark-card, #landing-char-list .ark-card');
    if (!card) return;
    pressTimer = setTimeout(function () { openMenu(card.dataset.id); }, 500);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) {
    document.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true });
  });
})();
