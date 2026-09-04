/* ═══ Встречная проверка ═══ */
//
// Механика уже была написана, но жила внутри удара оружием: если у цели
// проставлена защита, обе стороны бросают и разницу уровней успеха считают за
// исход. За столом встречными идут не только удары — обаяние против
// хладнокровия, запугивание против силы воли, скрытность против
// наблюдательности встречаются не реже.
//
// Свой бросок при этом не перебрасывается. Так это и играется: сначала бросил
// ты, потом мастер за противника, потом сравнили. Поэтому вход сюда — с уже
// выпавшей карточки, а не отдельным путём с самого начала.

(function () {
  'use strict';

  // Уровень успеха считаем ровно так же, как на бланке: разница десятков.
  // Своя формула здесь развела бы два экрана в разные стороны.
  function slOf(target, d) {
    return Math.trunc(target / 10) - Math.trunc(d / 10);
  }
  function signed(n) { return (n < 0 ? '−' + Math.abs(n) : '+' + n); }

  window.opposedFrom = function (name, target, d, sl) {
    target = parseInt(target, 10) || 0;
    d = parseInt(d, 10) || 0;
    sl = parseInt(sl, 10) || 0;

    // Значение противника называет мастер. Если в схватке уже заведены
    // участники с защитой, подставляем их одним нажатием — но только как
    // заготовку: против обаяния защита не годится, там своё число.
    var foes = [];
    try {
      if (typeof encList === 'function') {
        foes = encList().filter(function (t) { return t.def > 0; }).slice(0, 4);
      }
    } catch (e) {}
    var quick = foes.length
      ? '<div class="opp-quick">' + foes.map(function (t, i) {
          return '<button class="opp-foe" data-i="' + i + '">' + escHtml(t.name) +
                 ' <b>' + t.def + '</b></button>';
        }).join('') + '</div>'
      : '';

    _ordoDialogShell(
      '<div class="ordo-dlg-seal">✠</div>' +
      '<div class="ordo-dlg-title">Встречная проверка</div>' +
      '<div class="ordo-dlg-text">' + escHtml(name) + ': d100 = <b>' + d + '</b> против ≤' + target +
        ' → ' + (d <= target ? 'успех' : 'провал') + ', ' + signed(sl) + ' ст.усп.' +
        '<br>Против чего бросает противник?</div>' +
      quick +
      '<input id="opp-val" class="ordo-dlg-input" type="number" inputmode="numeric" ' +
        'min="0" max="200" placeholder="значение противника" aria-label="Значение противника">' +
      '<div class="ordo-dlg-btns">' +
        '<button class="ordo-dlg-btn gold" id="opp-go">Бросить за противника</button>' +
        '<button class="ordo-dlg-btn" onclick="ordoDialogClose()">Отмена</button>' +
      '</div>'
    );

    var inp = document.getElementById('opp-val');
    document.querySelectorAll('#ordo-dlg .opp-foe').forEach(function (b) {
      b.onclick = function () { inp.value = foes[parseInt(b.dataset.i, 10)].def; inp.focus(); };
    });
    function go() {
      var v = parseInt(inp.value, 10);
      if (!(v > 0)) { notify('Укажи, против какого значения бросает противник.'); return; }
      ordoDialogClose();
      resolve(name, target, d, sl, v);
    }
    document.getElementById('opp-go').onclick = go;
    inp.onkeydown = function (e) { if (e.key === 'Enter') go(); };
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 40);
  };

  function resolve(name, target, d, sl, foeTarget) {
    var dd = Math.floor(Math.random() * 100) + 1;
    var dsl = slOf(foeTarget, dd);
    var diff = sl - dsl;

    // Кто кого — по разнице уровней успеха, как и в ударе. Ничью не разрешаем
    // сами: в книге у неё своё правило, и придумывать его за неё нельзя —
    // показываем оба числа и оставляем решение столу.
    var outcome, cls;
    if (diff > 0) { outcome = 'Верх твой'; cls = 'success'; }
    else if (diff < 0) { outcome = 'Верх за противником'; cls = 'fail'; }
    else { outcome = 'Ничья по уровням успеха'; cls = ''; }

    if (navigator.vibrate) navigator.vibrate(diff > 0 ? [20] : [40, 30, 40]);
    logIt(name, target, d, foeTarget, dd, diff, outcome);
    show(name, target, d, sl, foeTarget, dd, dsl, diff, outcome, cls);
  }

  function logIt(name, target, d, foeTarget, dd, diff, outcome) {
    try {
      if (!state || !state.sheet) return;
      if (!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
      state.sheet.rollLog.unshift({
        name: 'Встречная: ' + name + ' (противник ≤' + foeTarget + ', d100=' + dd + ')',
        target: target, d: d,
        outcome: outcome,
        sl: signed(diff) + ' ст.усп. разницы',
        t: Date.now()
      });
      if (state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
      if (typeof autosave === 'function') autosave();
      var body = document.getElementById('rolllog-body');
      if (body && typeof rollLogRows === 'function') body.innerHTML = rollLogRows();
    } catch (e) {}
  }

  function side(title, target, d, sl) {
    return '<div class="opp-side' + (d <= target ? ' ok' : '') + '">' +
             '<div class="opp-who">' + title + '</div>' +
             '<div class="opp-die">' + d + '</div>' +
             '<div class="opp-vs">≤ ' + target + '</div>' +
             '<div class="opp-sl">' + signed(sl) + ' ст.усп.</div>' +
           '</div>';
  }

  function show(name, target, d, sl, foeTarget, dd, dsl, diff, outcome, cls) {
    var modal = document.getElementById('roll-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'roll-modal';
      modal.className = 'sv4-roll-modal';
      modal.onclick = function (e) { if (e.target === modal) modal.classList.remove('show'); };
      document.body.appendChild(modal);
    }
    modal.innerHTML =
      '<div class="sv4-roll-card ' + cls + '">' +
        '<div class="sv4-roll-skill">' + escHtml(name) + '</div>' +
        '<div class="sv4-roll-target">встречная проверка</div>' +
        '<div class="opp-pair">' +
          side('ты', target, d, sl) +
          '<div class="opp-mid">' + signed(diff) + '</div>' +
          side('противник', foeTarget, dd, dsl) +
        '</div>' +
        '<div class="sv4-roll-outcome">' + outcome + '</div>' +
        '<div class="sv4-roll-sl">' + (diff === 0
          ? 'Уровни успеха равны — исход за столом'
          : 'разница ' + signed(diff) + ' ст.усп.') + '</div>' +
        '<div class="sv4-roll-btns">' +
          '<button class="sv4-roll-close" onclick="document.getElementById(\'roll-modal\').classList.remove(\'show\')">Закрыть</button>' +
          '<button class="sv4-roll-again" data-call="opposed" data-v="' + escAttr(name) + '" data-n="' + target +
            '" data-r="' + d + '" data-s="' + sl + '">Другой противник</button>' +
        '</div>' +
      '</div>';
    modal.classList.add('show');
  }
})();
