// Лоток кубов: любой бросок, а не только проверка навыка.
// Понимает записи вида «1d10», «2d10+4», «d6-1», «3к6» (русская «к» тоже годится).
// Результат попадает в тот же журнал бросков, что и проверки d100.
(function () {
  'use strict';

  var LAST_KEY = 'wfrp4_dice_last';

  // ── разбор записи ───────────────────────────────────────────────────────────
  window.diceParse = function (text) {
    // «−» из подсказки — типографский минус, а не дефис; тире тоже приводим к дефису
    var s = String(text || '').toLowerCase().replace(/\s+/g, '').replace(/к/g, 'd').replace(/[–—−‒‑]/g, '-');
    var m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(s);
    if (!m) return null;
    var count = m[1] === '' ? 1 : parseInt(m[1], 10);
    var sides = parseInt(m[2], 10);
    var mod = m[3] ? parseInt(m[3], 10) : 0;
    if (!count || !sides || count > 50 || sides > 1000) return null;
    return { count: count, sides: sides, mod: mod };
  };

  function fmt(spec) {
    return spec.count + 'd' + spec.sides + (spec.mod ? (spec.mod > 0 ? '+' : '') + spec.mod : '');
  }

  // ── сам бросок ──────────────────────────────────────────────────────────────
  window.diceRoll = function (text) {
    var spec = typeof text === 'object' ? text : diceParse(text);
    if (!spec) { notify('Не понял запись. Примеры: 1d10, 2d10+4, d6'); return null; }

    var parts = [];
    for (var i = 0; i < spec.count; i++) parts.push(Math.floor(Math.random() * spec.sides) + 1);
    var sum = parts.reduce(function (a, b) { return a + b; }, 0) + spec.mod;

    try { localStorage.setItem(LAST_KEY, fmt(spec)); } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(20);

    // в общий журнал, чтобы всё было в одном месте
    if (state && state.sheet) {
      if (!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
      state.sheet.rollLog.unshift({
        name: fmt(spec), target: null, d: sum,
        outcome: parts.length > 1 || spec.mod ? parts.join(' + ') + (spec.mod ? (spec.mod > 0 ? ' + ' : ' − ') + Math.abs(spec.mod) : '') : '',
        sl: '', t: Date.now()
      });
      if (state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
      if (typeof autosave === 'function') autosave();
    }

    showDiceResult(spec, parts, sum);
    var body = document.getElementById('rolllog-body');
    if (body && typeof rollLogRows === 'function') body.innerHTML = rollLogRows();
    return sum;
  };

  function showDiceResult(spec, parts, sum) {
    var modal = document.getElementById('roll-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'roll-modal';
      modal.className = 'sv4-roll-modal';
      modal.addEventListener('click', function () { modal.classList.remove('show'); });
      document.body.appendChild(modal);
    }
    var detail = parts.length > 1 ? parts.join(' + ') : String(parts[0]);
    if (spec.mod) detail += (spec.mod > 0 ? ' + ' : ' − ') + Math.abs(spec.mod);
    modal.innerHTML =
      '<div class="sv4-roll-card" onclick="event.stopPropagation()">' +
        '<div class="sv4-roll-skill">' + fmt(spec) + '</div>' +
        '<div class="sv4-roll-target">' + (parts.length > 1 || spec.mod ? detail : 'бросок') + '</div>' +
        '<div class="sv4-roll-die">' + sum + '</div>' +
        '<div class="sv4-roll-btns">' +
          '<button class="sv4-roll-close" onclick="document.getElementById(\'roll-modal\').classList.remove(\'show\')">Закрыть</button>' +
          '<button class="sv4-roll-again" onclick="diceRoll(\'' + fmt(spec) + '\')">' +
            (window.ICONS ? '<span class="ic">' + ICONS.dice + '</span>' : '') + ' Ещё раз</button>' +
        '</div>' +
      '</div>';
    modal.classList.add('show');
  }

  // ── разметка лотка, вставляется в журнал бросков ─────────────────────────────
  var QUICK = ['1d100', '1d10', '2d10', '1d6', '2d6', '1d3'];

  window.diceTrayHtml = function () {
    var last = '';
    try { last = localStorage.getItem(LAST_KEY) || ''; } catch (e) {}
    var quick = QUICK.map(function (q) {
      return '<button class="sv4-btn-mini dice-quick" data-dice="' + q + '">' + q + '</button>';
    }).join('');
    return '' +
      '<div class="sv4-block dice-tray">' +
        '<div class="sv4-block-title">Лоток кубов</div>' +
        '<div class="dice-quick-row">' + quick + '</div>' +
        '<div class="dice-free">' +
          '<input id="dice-input" class="sv4-mini" inputmode="text" placeholder="напр. 2d10+4"' +
            ' value="' + escAttr(last) + '" aria-label="Запись броска"' +
            ' onkeydown="if(event.key===\'Enter\')diceRoll(this.value)">' +
          '<button class="sv4-btn-mini btn-gold" onclick="diceRoll(document.getElementById(\'dice-input\').value)">Бросить</button>' +
        '</div>' +
        '<p class="muted dice-hint">Понимает 1d10, 2d10+4, d6−1. Русская «к» тоже подойдёт.</p>' +
      '</div>';
  };

  // ── лоток поверх страницы ───────────────────────────────────────────────────
  // Лоток жил только на вкладке «Кубы и журнал»: от бланка это «Ещё» → плитка →
  // кнопка, три нажатия за каждый бросок. За игрой кидают постоянно, так что
  // печать-кубик висит в шапке дела и открывает лоток здесь же, не уводя со
  // страницы: вернуться потом на то же место в длинном бланке — отдельная
  // морока.
  window.diceOpen = function () {
    _ordoDialogShell(
      '<div class="ordo-dlg-seal">⚄</div>' +
      '<div class="ordo-dlg-title">Бросок</div>' +
      '<div class="dice-quick-row">' +
        QUICK.map(function (q) {
          return '<button class="sv4-btn-mini dice-quick" data-dice="' + q + '">' + q + '</button>';
        }).join('') +
      '</div>' +
      '<div class="dice-free">' +
        '<input id="dice-input-modal" class="sv4-mini" inputmode="text" placeholder="напр. 2d10+4"' +
          ' value="' + escAttr(lastSpec()) + '" aria-label="Запись броска">' +
        '<button class="sv4-btn-mini btn-gold" data-dice-go>Бросить</button>' +
      '</div>' +
      '<p class="muted dice-hint">Понимает 1d10, 2d10+4, d6−1. Русская «к» тоже подойдёт.</p>' +
      '<div class="ordo-dlg-btns"><button class="ordo-dlg-btn ghost" onclick="ordoDialogClose()">Закрыть</button></div>'
    );
    var inp = document.getElementById('dice-input-modal');
    if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter') rollFromModal(); };
  };

  function lastSpec() {
    try { return localStorage.getItem(LAST_KEY) || ''; } catch (e) { return ''; }
  }

  // Карточка результата всплывает выше лотка, но оставлять его открытым под
  // ней незачем: бросок сделан, а «Ещё раз» есть на самой карточке. Закрываем
  // только на удачном броске — на «не понял запись» лоток нужен на месте,
  // чтобы было что исправлять.
  function rollAndClose(text) {
    var out = diceRoll(text);
    if (out !== null) ordoDialogClose();
    return out;
  }

  function rollFromModal() {
    var inp = document.getElementById('dice-input-modal');
    rollAndClose(inp ? inp.value : '');
  }

  // быстрые кнопки — через делегирование, без обработчиков в разметке
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-dice-go]')) { rollFromModal(); return; }
    var el = e.target.closest('[data-dice]');
    if (!el) return;
    // Тот же обработчик обслуживает и лоток на вкладке, и лоток поверх страницы
    if (e.target.closest('#ordo-dlg')) rollAndClose(el.dataset.dice);
    else diceRoll(el.dataset.dice);
  });
})();
