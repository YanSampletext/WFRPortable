/* ═══ Растянутые проверки ═══ */
//
// Есть дела, которые одним броском не решаются: перевод гримуара, розыск по
// городу, ремесло, долгие занятия между приключениями. Уровни успеха копятся
// от попытки к попытке, пока не наберётся нужное число, и каждая попытка —
// это отрезок времени, который мастер называет вслух.
//
// Приложение считает накопленное и помнит, чем именно бросали. Сколько нужно
// набрать, за какой срок идёт попытка и что случится при провале — говорит
// мастер: это описание задачи, а не арифметика, и выдумывать его нельзя.
//
// Складываются уровни успеха как выпали, вместе с отрицательными. Каждая
// попытка показана отдельной строкой, так что видно, из чего вышел итог, и
// стол в любую минуту может рассудить иначе.

(function () {
  'use strict';

  function list() {
    if (!state.sheet) return [];
    if (!Array.isArray(state.sheet.extended)) state.sheet.extended = [];
    return state.sheet.extended;
  }
  function find(id) { return list().find(function (x) { return x.id === id; }); }
  function save() { if (typeof autosave === 'function') autosave(); }
  function signed(n) { return (n < 0 ? '−' + Math.abs(n) : '+' + n); }
  // Накопленное показываем без плюса, но с типографским минусом: во всех
  // книжных таблицах приложения он такой, и «−4 / 8» не должно вдруг стать
  // «-4 / 8» на одном экране из десяти.
  function num(n) { return String(n).replace('-', '−'); }

  // ── завести ────────────────────────────────────────────────────────────────
  window.extAdd = function () {
    var rows = (typeof compileSkills === 'function') ? compileSkills() : [];
    // Сначала обученные: за столом растянутым бросают то, чем владеют.
    rows = rows.slice().sort(function (a, b) { return (b.value || 0) - (a.value || 0); });
    var opts = rows.map(function (r) {
      return '<option value="' + escAttr(r.name) + '">' + escHtml(r.name) + ' — ' + (r.value || 0) + '</option>';
    }).join('');
    _ordoDialogShell(
      '<div class="ordo-dlg-seal">✠</div>' +
      '<div class="ordo-dlg-title">Растянутая проверка</div>' +
      '<div class="ordo-dlg-text">Чем занят персонаж и сколько уровней успеха нужно набрать? ' +
        'И то и другое называет мастер.</div>' +
      '<input id="ext-name" class="ordo-dlg-input" placeholder="что делаем — например «перевод гримуара»" ' +
        'aria-label="Название дела">' +
      '<select id="ext-skill" class="ordo-dlg-input" aria-label="Навык">' + opts + '</select>' +
      '<input id="ext-goal" class="ordo-dlg-input" type="number" inputmode="numeric" min="1" max="99" ' +
        'value="6" aria-label="Сколько уровней успеха нужно">' +
      '<div class="ordo-dlg-btns">' +
        '<button class="ordo-dlg-btn gold" id="ext-ok">Завести</button>' +
        '<button class="ordo-dlg-btn" onclick="ordoDialogClose()">Отмена</button>' +
      '</div>'
    );
    document.getElementById('ext-ok').onclick = function () {
      var name = (document.getElementById('ext-name').value || '').trim();
      var skill = document.getElementById('ext-skill').value;
      var goal = parseInt(document.getElementById('ext-goal').value, 10) || 0;
      if (!name) { notify('Напиши, чем занят персонаж.'); return; }
      if (goal < 1) { notify('Сколько уровней успеха нужно набрать?'); return; }
      var row = rows.find(function (r) { return r.name === skill; }) || { value: 0 };
      list().unshift({
        id: 'ext' + Date.now(), name: name, skill: skill, value: row.value || 0,
        goal: goal, acc: 0, tries: []
      });
      ordoDialogClose();
      save();
      renderSheet();
    };
    setTimeout(function () { try { document.getElementById('ext-name').focus(); } catch (e) {} }, 40);
  };

  // ── попытка ────────────────────────────────────────────────────────────────
  window.extRoll = function (id, mod) {
    var e = find(id);
    if (!e) return;
    // Значение навыка могло вырасти с тех пор, как дело завели, — берём
    // сегодняшнее, а не то, что лежит в записи.
    var rows = (typeof compileSkills === 'function') ? compileSkills() : [];
    var row = rows.find(function (r) { return r.name === e.skill; });
    if (row) e.value = row.value || 0;

    var dif = parseInt(mod, 10) || 0;
    var target = e.value + dif;
    var d = Math.floor(Math.random() * 100) + 1;
    var sl = Math.trunc(target / 10) - Math.trunc(d / 10);

    e.acc = (e.acc || 0) + sl;
    e.tries = e.tries || [];
    e.tries.push({ d: d, target: target, sl: sl, dif: dif, t: Date.now() });
    if (e.tries.length > 20) e.tries.shift();

    // В общий журнал бросков — тем же строем, что и всё остальное: мастеру
    // важно видеть попытку в одном ряду с прочими.
    try {
      if (!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
      var rec = {
        name: e.name + ' · ' + e.skill + ' (растянутая ' + num(e.acc) + '/' + e.goal + ')',
        target: target, d: d,
        outcome: d <= target ? 'Успех' : 'Провал',
        sl: signed(sl) + ' ст.усп.',
        t: Date.now()
      };
      if (dif) rec.dif = dif;
      state.sheet.rollLog.unshift(rec);
      if (state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
    } catch (err) {}

    save();
    if (navigator.vibrate) navigator.vibrate(sl >= 0 ? [20] : [40, 30, 40]);
    if (e.acc >= e.goal) notify('Готово: ' + e.name + ' — набрано ' + num(e.acc) + ' из ' + e.goal);
    else notify('d100 = ' + d + ' против ≤' + target + ' → ' + signed(sl) + ' ст.усп., всего ' + num(e.acc) + ' из ' + e.goal);
    renderSheet();
  };

  // Сложность попытки: список тот же, что и на бланке, — своей копии заводить
  // незачем, difficultyPick умеет отдавать выбор наружу.
  window.extDifficulty = function (id) {
    var e = find(id);
    if (!e) return;
    difficultyPick(e.name + ' · ' + e.skill, e.value, function (mod) { extRoll(id, mod); });
  };

  window.extRemove = function (id) {
    var e = find(id);
    if (!e) return;
    ordoConfirm({
      title: 'Убрать дело?',
      text: '«' + e.name + '» — набрано ' + num(e.acc || 0) + ' из ' + e.goal + '. Запись удалится совсем.',
      yes: 'Убрать', danger: true,
      onYes: function () {
        state.sheet.extended = list().filter(function (x) { return x.id !== id; });
        save(); renderSheet();
      }
    });
  };

  // ── разметка блока ─────────────────────────────────────────────────────────
  window.extBlockHtml = function () {
    var all = list();
    var h = '<div class="panel" style="margin-bottom:14px;">' +
      '<div class="panel-title">∑ Растянутые проверки</div>' +
      '<p class="muted" style="font-size:12px;">Дела, которые одним броском не решаются: ' +
      'уровни успеха копятся от попытки к попытке. Сколько нужно набрать и за какой срок идёт ' +
      'попытка — называет мастер. Складываются уровни успеха как выпали, вместе с отрицательными.</p>';
    if (!all.length) {
      h += '<p class="muted" style="text-align:center;padding:10px 0;">— пока ничего не начато —</p>';
    } else {
      h += '<div class="ext-list">';
      all.forEach(function (e) {
        var acc = e.acc || 0;
        var done = acc >= e.goal;
        var pct = Math.max(0, Math.min(100, Math.round(acc / e.goal * 100)));
        h += '<div class="ext-item' + (done ? ' done' : '') + '">' +
          '<div class="ext-head">' +
            '<b>' + escHtml(e.name) + '</b>' +
            '<span class="ext-skill">' + escHtml(e.skill) + ' ' + (e.value || 0) + '</span>' +
          '</div>' +
          '<div class="ext-bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="ext-sum">' + num(acc) + ' / ' + e.goal + ' ст.усп.' +
            (e.tries && e.tries.length ? ' · попыток ' + e.tries.length : '') +
            (done ? ' · <b>набрано</b>' : '') + '</div>' +
          (e.tries && e.tries.length
            ? '<div class="ext-tries">' + e.tries.slice(-8).map(function (t) {
                return '<span class="ext-try' + (t.sl >= 0 ? ' ok' : '') + '" title="d100=' + t.d +
                       ' против ≤' + t.target + '">' + signed(t.sl) + '</span>';
              }).join('') + '</div>'
            : '') +
          '<div class="ext-btns">' +
            '<button class="sv4-btn-mini btn-gold" onclick="extRoll(\'' + e.id + '\')">Попытка</button>' +
            '<button class="sv4-btn-mini" onclick="extDifficulty(\'' + e.id + '\')" ' +
              'title="Попытка с выбором сложности">± сложность</button>' +
            '<button class="sv4-btn-mini btn-red" onclick="extRemove(\'' + e.id + '\')">×</button>' +
          '</div>' +
        '</div>';
      });
      h += '</div>';
    }
    h += '<button class="btn btn-gold btn-sm" style="margin-top:10px;" onclick="extAdd()">+ Начать дело</button>' +
      '</div>';
    return h;
  };
})();
