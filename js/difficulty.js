/* ═══ Сложность проверки: от +60 до −30 ═══ */
//
// В книге у каждой проверки есть сложность, и без неё бросок неполон: мастер
// говорит «трудная», игрок отнимает 20 от значения. До сих пор приложение
// умело бросать только по голому значению — то есть всегда серьёзную (+0).
//
// Короткий тап так и оставлен: серьёзная проверка — та, которой бросают по
// умолчанию, и добавлять к ней лишнее касание значило бы замедлить самое
// частое действие ради самого редкого. Сложность открывается удержанием (на
// мыши — правой кнопкой) и с карточки результата, где строка «цель ≤ …» сама
// же и служит кнопкой.
//
// Считать сложность за мастера приложение не пытается: обстановку описывают
// словами за столом, и выбирает её человек.

// Шкала из книги. Названия ровно те, что уже стоят в таблицах критических
// ранений, болезней и ошибок сотворения, — иначе приложение спорило бы само с
// собой: там «серьёзная (+0)» и «трудная (−20)», и здесь должно быть так же.
var DIFFICULTY = [
  { name: 'Очень лёгкая',  mod:  60, hint: 'провалить почти нельзя'    },
  { name: 'Лёгкая',        mod:  40, hint: 'под силу и неумехе'        },
  { name: 'Средняя',       mod:  20, hint: 'обычное дело для умелого'  },
  { name: 'Серьёзная',     mod:   0, hint: 'так бросают по умолчанию'  },
  { name: 'Сложная',       mod: -10, hint: 'мешают обстоятельства'     },
  { name: 'Трудная',       mod: -20, hint: 'серьёзная помеха'          },
  { name: 'Очень трудная', mod: -30, hint: 'на грани возможного'       }
];

// Знак пишем типографским минусом: так набрано во всех книжных таблицах
// приложения, и «−20» не должно вдруг стать «-20» на одном экране из десяти.
function difficultySign(mod) {
  mod = parseInt(mod, 10) || 0;
  return (mod > 0 ? '+' : mod < 0 ? '−' : '+') + Math.abs(mod);
}

// «Трудная −20». Отдаёт название даже для нуля: подпись «Серьёзная +0» на
// карточке нужна не меньше прочих — она показывает, что сложность вообще есть
// и что её можно сменить.
function difficultyNote(mod) {
  mod = parseInt(mod, 10) || 0;
  for (var i = 0; i < DIFFICULTY.length; i++) {
    if (DIFFICULTY[i].mod === mod) return DIFFICULTY[i].name + ' ' + difficultySign(mod);
  }
  return 'Своя ' + difficultySign(mod);   // на случай чужого числа извне
}

// Преимущество прибавляется к цели независимо от сложности, поэтому в списке
// оно уже учтено: показывать цель без него значило бы обещать не то число,
// которое выпадет на карточке.
function _difAdvantage(name) {
  try {
    var adv = (state && state.sheet && state.sheet.advantage) || 0;
    if (adv > 0 && typeof advantageApplies === 'function' && advantageApplies(name)) return adv * 10;
  } catch (e) {}
  return 0;
}

// onPick — что делать с выбранной сложностью. По умолчанию бросок с бланка;
// растянутая проверка передаёт своё, чтобы уровни успеха легли в накопитель, а
// не в обычную карточку. Своей копии этого списка ей заводить незачем.
function difficultyPick(name, base, onPick) {
  base = parseInt(base, 10) || 0;
  var adv = _difAdvantage(name);
  var rows = DIFFICULTY.map(function (d, i) {
    return '<button class="dif-row' + (d.mod === 0 ? ' is-default' : '') + '" data-i="' + i + '">' +
             '<span class="dif-name">' + d.name + '<small>' + d.hint + '</small></span>' +
             '<span class="dif-mod">' + difficultySign(d.mod) + '</span>' +
             '<span class="dif-target">≤ ' + (base + d.mod + adv) + '</span>' +
           '</button>';
  }).join('');
  _ordoDialogShell(
    '<div class="ordo-dlg-seal">✠</div>' +
    '<div class="ordo-dlg-title">Сложность проверки</div>' +
    '<div class="ordo-dlg-text">' + escHtml(name) + ' · значение ' + base +
      (adv ? ' · преимущество +' + adv + ' учтено' : '') + '</div>' +
    '<div class="dif-list">' + rows + '</div>' +
    '<div class="ordo-dlg-btns"><button class="ordo-dlg-btn ghost" onclick="ordoDialogClose()">Отмена</button></div>'
  );
  document.querySelectorAll('#ordo-dlg .dif-row').forEach(function (b) {
    b.onclick = function () {
      var d = DIFFICULTY[parseInt(b.dataset.i, 10)];
      ordoDialogClose();
      var mod = d ? d.mod : 0;
      if (typeof onPick === 'function') onPick(mod);
      else rollCheck(name, base, mod);
    };
  });
}

// ── удержание на характеристике или навыке ──────────────────────────────────
// Обработчик один и висит на документе: бланк перерисовывается целиком, и
// слушатели, навешенные на сами ячейки, пережили бы ровно одну перерисовку.
(function () {
  var HOLD = 420;   // мс — короче ощущается как промах, длиннее как зависание
  var MOVE = 10;    // px — палец поехал: это прокрутка, а не удержание
  var timer = null, el = null, sx = 0, sy = 0, firedAt = 0;

  function rollableAt(node) {
    var r = node && node.closest ? node.closest('[data-call="roll"]') : null;
    return (r && r.dataset.v) ? r : null;
  }
  function cancel() { if (timer) { clearTimeout(timer); timer = null; } el = null; }

  function open(node) {
    firedAt = Date.now();
    if (navigator.vibrate) navigator.vibrate(12);
    difficultyPick(node.dataset.v, parseInt(node.dataset.n, 10) || 0);
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button) return;                       // средняя и правая — не удержание
    var node = rollableAt(e.target);
    if (!node) return;
    el = node; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(function () { timer = null; var n = el; cancel(); if (n) open(n); }, HOLD);
  }, true);

  document.addEventListener('pointermove', function (e) {
    if (timer && (Math.abs(e.clientX - sx) > MOVE || Math.abs(e.clientY - sy) > MOVE)) cancel();
  }, true);
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    document.addEventListener(ev, cancel, true);
  });

  // Щелчок, который прилетает следом за удержанием, надо проглотить — иначе
  // поверх выбора сложности сразу же уйдёт обычный бросок. Метка живёт по
  // времени, а не «до следующего клика»: там, где браузер щелчок после
  // удержания вовсе не шлёт, вечный флаг съел бы следующий честный тап.
  document.addEventListener('click', function (e) {
    if (Date.now() - firedAt > 700) return;
    if (!rollableAt(e.target)) return;
    firedAt = 0;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // На телефоне долгое нажатие зовёт системное выделение текста, на мыши —
  // контекстное меню. И то и другое поверх диалога лишнее; правой кнопкой при
  // этом сложность открывается сразу, без выжидания.
  document.addEventListener('contextmenu', function (e) {
    var node = rollableAt(e.target);
    if (!node) return;
    e.preventDefault();
    if (timer || Date.now() - firedAt < 700) return;   // удержание уже в работе
    open(node);
  });
})();
