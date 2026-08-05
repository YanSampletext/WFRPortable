// Удар одной кнопкой.
//
// Все числа для этого в приложении уже были, но лежали по разным экранам:
// навык — на бланке, урон оружия — в имуществе, стойкость и броня цели — в
// трекере схватки. Игрок соединял их в голове: бросил, посчитал уровни
// успеха, вспомнил урон, вычел броню, вписал раны противнику. Пять действий
// руками там, где приложение знает каждое слагаемое.
//
// Правило (WFRP4, гл. V): урон = урон оружия + уровни успеха попадания,
// цель вычитает бонус стойкости и класс брони пробитой зоны.
(function () {
  'use strict';

  // Какой навык бросать: у метательного и стрелкового — «Стрельба».
  var RANGED = /(лук|арбалет|праща|метат|огнестр|пистол|мушкет|аркебуз|дротик)/i;

  function skillFor(w) {
    var text = (w.name || '') + ' ' + (w.group || '') + ' ' + (w.range || '');
    return RANGED.test(text) ? 'Стрельба' : 'Рукопашный бой';
  }

  // Значение навыка с бланка. Берём самую развитую специализацию: у бойца
  // может быть и «Рукопашный бой (Основное)», и «(Двуручное)» — бьём лучшим.
  function skillValue(base) {
    var totals = (typeof sheetCalc === 'function') ? (sheetCalc().totals || {}) : {};
    var rows = (typeof compileSkills === 'function') ? compileSkills() : [];
    var low = base.toLowerCase();
    var found = rows.filter(function (r) { return String(r.name).toLowerCase().indexOf(low) === 0; })
                    .sort(function (a, b) { return (b.value || 0) - (a.value || 0); })[0];
    if (found) return { name: found.name, value: found.value || 0 };
    // Навыка нет вовсе — бросок по характеристике: ББ в ближнем, ДБ в стрельбе
    var ch = base === 'Стрельба' ? 'ДБ' : 'ББ';
    return { name: base + ' (по ' + ch + ')', value: totals[ch] || 0 };
  }

  function weaponDamage(w) {
    var totals = (typeof sheetCalc === 'function') ? (sheetCalc().totals || {}) : {};
    var rs = Math.floor((totals['С'] || 0) / 10);
    var formula = w.damage || w.dmg || '';
    var n = (typeof calcWeaponDamage === 'function') ? calcWeaponDamage(formula, rs) : null;
    return { formula: formula || '—', value: (typeof n === 'number' && !isNaN(n)) ? n : null };
  }

  // ── сам удар ────────────────────────────────────────────────────────────────
  window.attackWith = function (i) {
    var w = ((state.sheet && state.sheet.weapons) || [])[i];
    if (!w) { notify('Оружие не найдено.'); return; }

    var targets = (typeof encList === 'function') ? encList() : [];
    if (!targets.length) { attackRoll(w, null); return; }

    ordoChoice({
      title: 'Удар: ' + (w.name || 'оружие'),
      text: 'По кому бьём? Раны спишутся с учётом стойкости и брони.',
      options: targets.map(function (t) {
        return {
          label: t.name + ' · ' + t.hp + (t.maxHp ? '/' + t.maxHp : '') + ' ран' +
                 (t.soak ? ' · гасит ' + t.soak : ''),
          cb: function () { attackRoll(w, t.id); }
        };
      }).concat([{ label: 'Без цели — просто бросок', cb: function () { attackRoll(w, null); } }])
    });
  };

  function attackRoll(w, targetId) {
    var base = skillFor(w);
    var sk = skillValue(base);

    // Преимущество даёт +10 за пункт — ровно как в rollCheck на бланке
    var adv = (state.sheet && state.sheet.advantage) || 0;
    var bonus = adv > 0 ? adv * 10 : 0;
    var target = sk.value + bonus;

    var d = Math.floor(Math.random() * 100) + 1;
    var sl = Math.trunc(target / 10) - Math.trunc(d / 10);
    var hit = (d <= target && d !== 100) || d === 1;

    // Ближний бой по книге — встречная проверка: защищающийся бросает тоже, и
    // в дело идёт разница уровней успеха. Так считается, только если у цели
    // проставлена защита: заставлять вписывать навык каждому болотному гулю
    // ради простого удара незачем.
    var opp = null;
    var targetDef = targetId && typeof encList === 'function'
      ? (encList().find(function (t) { return t.id === targetId; }) || {}).def || 0
      : 0;
    if (targetDef > 0) {
      var dd = Math.floor(Math.random() * 100) + 1;
      var dsl = Math.trunc(targetDef / 10) - Math.trunc(dd / 10);
      opp = { target: targetDef, d: dd, sl: dsl };
      sl = sl - dsl;                       // разница уровней успеха и решает
      hit = sl > 0 || (sl === 0 && d < dd); // при равенстве верх берёт меньший бросок
    }

    var dmg = weaponDamage(w);
    // Уровни успеха ниже нуля урона не отнимают: попал — значит попал
    var slPlus = Math.max(0, sl);
    var raw = (dmg.value === null) ? null : dmg.value + slPlus;

    logRoll(w, sk, target, d, hit, sl, opp);
    showAttack(w, sk, target, d, hit, sl, dmg, raw, targetId, opp);
    if (navigator.vibrate) navigator.vibrate(hit ? [20] : [40, 30, 40]);
  }

  function logRoll(w, sk, target, d, hit, sl, opp) {
    if (!state || !state.sheet) return;
    if (!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
    state.sheet.rollLog.unshift({
      name: 'Удар: ' + (w.name || 'оружие') + ' · ' + sk.name +
            (opp ? ' (встречная, защита ' + opp.target + ')' : ''),
      target: target, d: d,
      outcome: hit ? 'Попал' : 'Мимо',
      sl: (sl >= 0 ? '+' : '') + sl + ' ст.усп.',
      t: Date.now()
    });
    if (state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
    if (typeof autosave === 'function') autosave();
    var body = document.getElementById('rolllog-body');
    if (body && typeof rollLogRows === 'function') body.innerHTML = rollLogRows();
  }

  function showAttack(w, sk, target, d, hit, sl, dmg, raw, targetId, opp) {
    var soak = (targetId && typeof encSoak === 'function') ? encSoak(targetId) : 0;
    var net = raw === null ? null : Math.max(0, raw - soak);

    var body = '';
    if (!hit) {
      body = '<div class="atk-line muted">Урон не считаем — удар не прошёл.</div>';
    } else if (raw === null) {
      body = '<div class="atk-line">Урон оружия: <b>' + escHtml(dmg.formula) + '</b>' +
             '<div class="muted">Формулу посчитать не вышло — прибавь ' + Math.max(0, sl) + ' ст.усп. вручную.</div></div>';
    } else {
      body =
        '<div class="atk-line">' + dmg.value + ' <span class="muted">урон оружия</span>' +
          ' + ' + Math.max(0, sl) + ' <span class="muted">ст.усп.</span> = <b>' + raw + '</b></div>' +
        (targetId
          ? '<div class="atk-line">− ' + soak + ' <span class="muted">стойкость и броня</span> → ' +
            '<b class="atk-net">' + net + '</b> <span class="muted">ран</span></div>'
          : '<div class="atk-line muted">Цель не выбрана — вычти стойкость и броню сам.</div>');
    }

    var apply = (hit && targetId && net !== null)
      ? '<button class="sv4-roll-again" onclick="attackApply(\'' + targetId + '\',' + raw + ')">' +
        'Нанести ' + net + ' ран</button>'
      : '';
    // По книге удачный удар в схватке приносит пункт Преимущества
    var advBtn = hit
      ? '<button class="sv4-roll-again" onclick="sv2AdvDelta(1);notify(\'Преимущество +1\')">+1 преим.</button>'
      : '';

    var modal = document.getElementById('roll-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'roll-modal';
      modal.className = 'sv4-roll-modal';
      modal.addEventListener('click', function () { modal.classList.remove('show'); });
      document.body.appendChild(modal);
    }
    modal.innerHTML =
      '<div class="sv4-roll-card ' + (hit ? 'success' : 'fail') + '" onclick="event.stopPropagation()">' +
        '<div class="sv4-roll-skill">' + escHtml(w.name || 'Удар') + '</div>' +
        '<div class="sv4-roll-target">' + escHtml(sk.name) + ' · цель ≤ ' + target + '</div>' +
        '<div class="sv4-roll-die">' + d + '</div>' +
        '<div class="sv4-roll-outcome">' + (hit ? 'Попал' : 'Мимо') + '</div>' +
        (opp
          ? '<div class="atk-opp">защита ' + opp.target + ' → бросок ' + opp.d +
            ' (' + (opp.sl >= 0 ? '+' : '') + opp.sl + ')</div>'
          : '') +
        '<div class="sv4-roll-sl">' + (sl >= 0 ? '+' : '') + sl + ' ст.усп.' +
          (opp ? ' разницы' : '') + '</div>' +
        '<div class="atk-dmg">' + body + '</div>' +
        '<div class="sv4-roll-btns">' +
          '<button class="sv4-roll-close" onclick="document.getElementById(\'roll-modal\').classList.remove(\'show\')">Закрыть</button>' +
          advBtn + apply +
        '</div>' +
      '</div>';
    modal.classList.add('show');
  }

  // Кнопки на бланке — через делегирование, без обработчиков в разметке
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-atk]');
    if (el) attackWith(parseInt(el.dataset.atk, 10));
  });

  window.attackApply = function (id, raw) {
    var lost = encDamage(id, raw);
    var modal = document.getElementById('roll-modal');
    if (modal) modal.classList.remove('show');
    notify('Списано ран: ' + lost);
  };
})();
