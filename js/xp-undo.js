// Отмена последней траты опыта.
//
// Магазин списывает опыт окончательно: один промах по кнопке — и сотня XP
// ушла в навык, который был не нужен. Вернуть это можно было только правкой
// поля «потрачено» вручную, а вместе с ним пришлось бы руками отматывать и
// саму покупку. Здесь запоминается ровно один шаг назад — этого хватает,
// потому что промах замечают сразу.
//
// Снимок кладётся в state.sheet рядом с корзиной (_cart) и уезжает вместе с
// досье: ключи хранения и остальная модель не меняются.
(function () {
  'use strict';

  window.xpRemember = function (entry) {
    if (!state || !state.sheet) return;
    entry.t = Date.now();
    state.sheet._lastBuy = entry;
  };

  window.xpUndoAvailable = function () {
    return !!(state && state.sheet && state.sheet._lastBuy);
  };

  function describe(b) {
    if (b.kind === 'career') return 'переход «' + b.toName + '» за ' + b.cost + ' XP';
    var n = (b.items || []).length;
    var word = n === 1 ? 'покупка' : (n < 5 ? 'покупки' : 'покупок');
    return n + ' ' + word + ' за ' + b.cost + ' XP';
  }

  window.xpUndoLast = function () {
    if (!xpUndoAvailable()) { notify('Отменять нечего.'); return; }
    var b = state.sheet._lastBuy;
    ordoConfirm({
      title: 'Отменить последнее?',
      text: 'Будет отменено: ' + describe(b) + '.\nОпыт вернётся, изменения откатятся.',
      yes: 'Отменить покупку',
      onYes: function () { apply(b); }
    });
  };

  function apply(b) {
    if (b.kind === 'career') undoCareer(b); else undoCart(b);
    state.sheet.spentXP = Math.max(0, (state.sheet.spentXP || 0) - (b.cost || 0));
    state.sheet._lastBuy = null;
    if (typeof autosave === 'function') autosave();
    notify('Отменено. Опыт вернулся: ' + b.cost + ' XP.');
    if (typeof renderShop === 'function') renderShop();
  }

  // ── откат покупок из корзины ────────────────────────────────────────────────
  function undoCart(b) {
    (b.items || []).forEach(function (it) {
      if (it.type === 'stat') {
        dec(state.sheet.statAdvBought, it.key);
      } else if (it.type === 'skill') {
        dec(state.sheet.skillAdvBought, it.key);
      } else if (it.type === 'talent') {
        decTalent(state.sheet.talentBought, it.name);
        decTalent(state.sheet.extraTalents, it.name);
      }
    });
  }

  function dec(map, key) {
    if (!map || !(key in map)) return;
    map[key] = (map[key] || 0) - 1;
    if (map[key] <= 0) delete map[key];
  }

  function decTalent(list, name) {
    if (!Array.isArray(list)) return;
    var i = list.findIndex(function (x) { return x.name === name; });
    if (i < 0) return;
    list[i].level = (list[i].level || 1) - 1;
    if (list[i].level <= 0) list.splice(i, 1);
  }

  // ── откат смены карьеры или ступени ─────────────────────────────────────────
  function undoCareer(b) {
    state.career = b.career;
    state.cls = b.cls;
    state.sheet.tier = b.tier;
    state.sheet.careerTier1Done = b.tier1Done;
    state.sheet.tierCompleteOverride = b.override;
    if (Array.isArray(state.sheet.careerLog)) state.sheet.careerLog.pop();
  }

  // Кнопка в шапке магазина
  window.xpUndoButtonHtml = function () {
    if (!xpUndoAvailable()) return '';
    return '<button class="sv4-btn-mini xp-undo" onclick="xpUndoLast()">' +
           '↶ Отменить: ' + escHtml(describe(state.sheet._lastBuy)) + '</button>';
  };
})();
