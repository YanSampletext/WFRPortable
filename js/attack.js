// Удар одной кнопкой.
//
// Все числа для этого в приложении уже были, но лежали по разным экранам:
// навык — на бланке, урон оружия — в имуществе, выносливость и броня цели — в
// трекере схватки. Игрок соединял их в голове: бросил, посчитал уровни
// успеха, вспомнил урон, вычел броню, вписал раны противнику. Пять действий
// руками там, где приложение знает каждое слагаемое.
//
// Правило (WFRP4, гл. V): урон = урон оружия + уровни успеха попадания,
// цель вычитает бонус выносливости и класс брони пробитой зоны.
(function () {
  'use strict';

  // Какой навык бросать: у метательного и стрелкового — «Стрельба».
  var RANGED = /(лук|арбалет|праща|метат|огнестр|пистол|мушкет|аркебуз|дротик)/i;

  function skillFor(w) {
    var text = (w.name || '') + ' ' + (w.group || '') + ' ' + (w.range || '');
    return RANGED.test(text) ? 'Стрельба' : 'Рукопашный бой';
  }

  // Уточнение навыка — то, что в скобках: «рукопашный бой (основное)» → «основное».
  function specOf(name) {
    var m = /\(([^)]*)\)/.exec(String(name || ''));
    return m ? m[1].trim().toLowerCase() : null;
  }

  // Значение навыка с бланка — по группе оружия, а не «самое развитое».
  //
  // Раньше здесь бралась самая развитая специализация, какая найдётся. У бойца
  // с «рукопашный бой (двуручное) 76» и «(основное) 40» удар кинжалом уходил
  // по семидесяти шести: игрок бросал по навыку алебарды. Группа оружия в
  // каталоге записана теми же словами, что и уточнение навыка («Основное» →
  // «(основное)»), так что выбирать есть по чему.
  //
  // Порядок: своя специализация → тот же навык без уточнения (если игрок ведёт
  // его так) → характеристика, как книга и велит для необученного. Чужую
  // специализацию не подставляем никогда.
  //
  // Особый случай — оружие без группы: вписанное руками название, которого нет
  // в каталоге, приходит с пустой группой. Сопоставлять там не с чем, и
  // отнимать у человека его навык не за что, поэтому остаётся прежнее «самое
  // развитое».
  function skillValue(base, group) {
    var totals = (typeof sheetCalc === 'function') ? (sheetCalc().totals || {}) : {};
    var rows = (typeof compileSkills === 'function') ? compileSkills() : [];
    var low = base.toLowerCase();
    var best = function (list) {
      return list.slice().sort(function (a, b) { return (b.value || 0) - (a.value || 0); })[0];
    };
    var mine = rows.filter(function (r) { return String(r.name).toLowerCase().indexOf(low) === 0; });
    var want = String(group == null ? '' : group).trim().toLowerCase();

    if (want) {
      var exact = best(mine.filter(function (r) { return specOf(r.name) === want; }));
      if (exact) return { name: exact.name, value: exact.value || 0 };
      var plain = best(mine.filter(function (r) { return !specOf(r.name); }));
      if (plain) return { name: plain.name, value: plain.value || 0 };
    } else {
      var any = best(mine);
      if (any) return { name: any.name, value: any.value || 0 };
    }
    // Подходящего навыка нет — бросок по характеристике: ББ в ближнем, ДБ в стрельбе
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

  // Чем и против чего бьём — нужно снаружи, чтобы выбор сложности показал те же
  // числа, что выпадут на карточке.
  window.attackTarget = function (i) {
    var w = ((state.sheet && state.sheet.weapons) || [])[i];
    if (!w) return null;
    var sk = skillValue(skillFor(w), w.group);
    return { name: (w.name || 'оружие') + ' · ' + sk.name, value: sk.value };
  };

  // ── сам удар ────────────────────────────────────────────────────────────────
  // mod — сложность из книги. Приходит от удержания на кнопке «Атаковать»:
  // выстрел в темноте по бегущему — обычное дело, и до сих пор его нечем было
  // записать.
  window.attackWith = function (i, mod) {
    var w = ((state.sheet && state.sheet.weapons) || [])[i];
    if (!w) { notify('Оружие не найдено.'); return; }

    var targets = (typeof encList === 'function') ? encList() : [];
    if (!targets.length) { attackRoll(w, null, mod); return; }

    ordoChoice({
      title: 'Удар: ' + (w.name || 'оружие'),
      text: 'По кому бьём? Раны спишутся с учётом выносливости и брони.',
      options: targets.map(function (t) {
        return {
          label: t.name + ' · ' + t.hp + (t.maxHp ? '/' + t.maxHp : '') + ' ран' +
                 (t.soak ? ' · гасит ' + t.soak : ''),
          cb: function () { attackRoll(w, t.id, mod); }
        };
      }).concat([{ label: 'Без цели — просто бросок', cb: function () { attackRoll(w, null, mod); } }])
    });
  };

  function attackRoll(w, targetId, mod) {
    var base = skillFor(w);
    var sk = skillValue(base, w.group);

    // Преимущество даёт +10 за пункт — ровно как в rollCheck на бланке
    var adv = (state.sheet && state.sheet.advantage) || 0;
    var bonus = adv > 0 ? adv * 10 : 0;
    var dif = parseInt(mod, 10) || 0;
    var target = sk.value + bonus + dif;

    var d = Math.floor(Math.random() * 100) + 1;
    var me = testOutcome(target, d);        // 01–05 и 96–00 — по книге
    var sl = me.sl;
    var hit = me.ok;

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
      var them = testOutcome(targetDef, dd);
      opp = { target: targetDef, d: dd, sl: them.sl, ok: them.ok, double: them.double };
      sl = me.sl - them.sl;                // разница уровней успеха и решает
      // Книга, с. 117: при равных SL побеждает большее значение умения, при
      // полном равенстве — пат. Раньше здесь верх брал меньший бросок.
      hit = sl > 0 || (sl === 0 && target > targetDef);
    }

    var dmg = weaponDamage(w);
    // Уровни успеха ниже нуля урона не отнимают: попал — значит попал
    var slPlus = Math.max(0, sl);
    var raw = (dmg.value === null) ? null : dmg.value + slPlus;

    logRoll(w, sk, target, d, hit, opp ? signedSL(sl) : slSigned(me), opp, dif);
    showAttack(w, sk, target, d, hit, sl, dmg, raw, targetId, opp, dif, me);
    if (navigator.vibrate) navigator.vibrate(hit ? [20] : [40, 30, 40]);
  }

  function signedSL(n) { return n >= 0 ? '+' + n : String(n).replace('-', '−'); }

  function logRoll(w, sk, target, d, hit, slTxt, opp, dif) {
    if (!state || !state.sheet) return;
    if (!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
    state.sheet.rollLog.unshift({
      name: 'Удар: ' + (w.name || 'оружие') + ' · ' + sk.name +
            (opp ? ' (встречная, защита ' + opp.target + ')' : ''),
      target: target, d: d,
      dif: dif || undefined,
      outcome: hit ? 'Попал' : 'Мимо',
      // Минус типографский — как в остальных строках журнала и в книжных таблицах
      sl: slTxt + ' ст.усп.',
      t: Date.now()
    });
    if (state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
    if (typeof autosave === 'function') autosave();
    var body = document.getElementById('rolllog-body');
    if (body && typeof rollLogRows === 'function') body.innerHTML = rollLogRows();
  }

  // Зона попадания по книге (с. 122): перевёрнутый бросок атаки — 58 → 85,
  // 00 остаётся 00, то есть 100.
  function zoneOf(d) {
    var inv = (d % 10) * 10 + Math.floor(d / 10) % 10;
    var r = inv || 100;
    var row = CRIT_TABLES.loc.find(function (z) { return r >= z[0] && r <= z[1]; });
    return { key: row[3], label: row[2] };
  }

  // Криты и заминки (с. 122): успешная боевая проверка на дубле — крит, и
  // противник сразу получает критическую рану, даже если критнул защищавшийся;
  // проваленная на дубле — заминка, бросок по таблице «Ой!». Зону для крита
  // бросают заново, а не переворотом броска атаки (с. 135).
  function critLines(me, d, opp) {
    var out = '';
    if (me.ok && me.double) {
      var cz = critRollZone(), z = { key: cz.zone, label: cz.label }, w = critRollWound(z.key);
      out += '<div class="atk-line"><b>Крит!</b> Цель получает критическую рану — ' +
             escHtml(z.label) + ': <b>' + escHtml(w.name) + '</b>' +
             (w.wounds ? ' (+' + w.wounds + ' ран)' : '') +
             '<div class="muted">' + escHtml(w.effect) + '</div></div>';
    }
    if (opp && opp.ok && opp.double) {
      out += '<div class="atk-line"><b>Крит защищающегося!</b> Ты получаешь критическую рану — брось на вкладке «Криты».</div>';
    }
    if (!me.ok && me.double) {
      out += '<div class="atk-line"><b>Заминка</b> — бросок по таблице «Ой!».</div>';
    }
    return out;
  }

  function showAttack(w, sk, target, d, hit, sl, dmg, raw, targetId, opp, dif, me) {
    var soak = (targetId && typeof encSoak === 'function') ? encSoak(targetId) : 0;
    // Попадание снимает не меньше 1 раны, сколько бы ни погасили (с. 122)
    var net = raw === null ? null : Math.max(1, raw - soak);
    var zone = zoneOf(d);

    var body = '';
    if (!hit) {
      body = '<div class="atk-line muted">Урон не считаем — удар не прошёл.</div>';
    } else if (raw === null) {
      body = '<div class="atk-line">Урон оружия: <b>' + escHtml(dmg.formula) + '</b>' +
             '<div class="muted">Формулу посчитать не вышло — прибавь ' + Math.max(0, sl) + ' ст.усп. вручную.</div></div>';
    } else {
      body =
        '<div class="atk-line"><span class="muted">зона:</span> <b>' + escHtml(zone.label) + '</b></div>' +
        '<div class="atk-line">' + dmg.value + ' <span class="muted">урон оружия</span>' +
          ' + ' + Math.max(0, sl) + ' <span class="muted">ст.усп.</span> = <b>' + raw + '</b></div>' +
        (targetId
          ? '<div class="atk-line">− ' + soak + ' <span class="muted">выносливость и броня</span> → ' +
            '<b class="atk-net">' + net + '</b> <span class="muted">ран</span></div>'
          : '<div class="atk-line muted">Цель не выбрана — вычти выносливость и броню сам.</div>');
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
      // Закрываем только по клику по самой подложке. Раньше подложка гасла от
      // любого клика внутри, и карточка защищалась event.stopPropagation() —
      // а вместе со всплытием обрубалось делегирование: кнопки с data-call
      // ловит обработчик на документе, до него событие не доходило, и «Ещё
      // раз» не делала ничего. То же самое уже находили в справочнике.
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('show');
      });
      document.body.appendChild(modal);
    }
    modal.innerHTML =
      '<div class="sv4-roll-card ' + (hit ? 'success' : 'fail') + '">' +
        '<div class="sv4-roll-skill">' + escHtml(w.name || 'Удар') + '</div>' +
        '<div class="sv4-roll-target">' + escHtml(sk.name) + ' · цель ≤ ' + target +
          (dif && typeof difficultyNote === 'function' ? ' · ' + difficultyNote(dif) : '') + '</div>' +
        '<div class="sv4-roll-die">' + d + '</div>' +
        '<div class="sv4-roll-outcome">' + (hit ? 'Попал' : 'Мимо') + '</div>' +
        (opp
          ? '<div class="atk-opp">защита ' + opp.target + ' → бросок ' + opp.d +
            ' (' + slSigned(opp) + ')' + (sl === 0 ? ' · равные SL: верх у большего значения' : '') + '</div>'
          : '') +
        '<div class="sv4-roll-sl">' + (opp ? signedSL(sl) + ' ст.усп. разницы' : slSigned(me) + ' ст.усп.') + '</div>' +
        '<div class="atk-dmg">' + body + critLines(me, d, opp) + '</div>' +
        // Атака — самый частый бросок в бою, и боевых талантов с условиями
        // больше всего. Карточка у удара своя, так что напоминание надо
        // позвать отдельно: по названию навыка, а не оружия.
        (typeof talentHintHtml === 'function' ? talentHintHtml(sk.name) : '') +
        '<div class="sv4-roll-btns">' +
          '<button class="sv4-roll-close" onclick="document.getElementById(\'roll-modal\').classList.remove(\'show\')">Закрыть</button>' +
          advBtn + apply +
          (!me.ok && me.double ? '<button class="sv4-roll-again" onclick="fumbleRoll()">«Ой!»</button>' : '') +
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
