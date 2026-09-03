// Поиск по справочнику.
//
// За столом чаще всего нужен один ответ: «что делает вот это качество».
// Раньше это означало вспомнить, где оно записано — в каталоге оружия, в
// состояниях, в талантах — и листать. Половина справочных данных вообще
// нигде не показывалась: качества оружия видно только на самом оружии,
// состояния — только когда они на тебе.
//
// Здесь всё, что есть в приложении, сведено в один список и ищется по
// названию и по описанию. Поиск по описанию не роскошь: «что даёт +10 к
// хладнокровию» — обычный вопрос, а по названию его не задать.
(function () {
  'use strict';

  var index = null;   // строится один раз при первом открытии

  // Русский поиск без «ё» и регистра: «шепчущее» найдётся и как «Шепчущее»,
  // и как «шёпот» в описании соседа.
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е');
  }

  function add(list, kind, name, sub, text) {
    if (!name) return;
    list.push({
      kind: kind, name: name, sub: sub || '', text: text || '',
      key: norm(name), body: norm((sub || '') + ' ' + (text || ''))
    });
  }

  // Каталоги живут в разных файлах, и каждый проверяется отдельно: отсутствие
  // одного раздела не повод ронять весь справочник.
  function build() {
    var out = [];

    if (typeof WEAPONS_CATALOG !== 'undefined') WEAPONS_CATALOG.forEach(function (w) {
      add(out, 'оружие', w.name,
          (w.kind === 'melee' ? 'ближний бой' : 'дальний бой') + ' · ' + w.group +
          ' · дист. ' + (w.reach || w.range || '—'),
          'Урон ' + w.damage + '. Качества: ' + (w.qualities || '—') +
          '. Цена ' + w.price + ', вес ' + w.weight + ', доступность ' + w.avail + '.');
    });

    if (typeof ARMOR_CATALOG !== 'undefined') ARMOR_CATALOG.forEach(function (a) {
      add(out, 'броня', a.name, a.zones + ' · ' + a.ap + ' очк. брони',
          'Качества: ' + (a.qualities || '—') + '. Цена ' + a.price + ', вес ' + a.weight +
          ', доступность ' + a.avail + '.' + (a.note ? ' ' + a.note : ''));
    });

    if (typeof QUALITY_INFO !== 'undefined') Object.keys(QUALITY_INFO).forEach(function (k) {
      add(out, 'качество', k, '', QUALITY_INFO[k]);
    });

    if (typeof CONDITION_INFO !== 'undefined') Object.keys(CONDITION_INFO).forEach(function (k) {
      var c = CONDITION_INFO[k];
      add(out, 'состояние', k, c.stack ? 'накапливается' : 'без накопления',
          (c.what || '') + (c.clear ? ' Снятие: ' + c.clear : ''));
    });

    if (typeof DATA !== 'undefined' && DATA.all_talents) DATA.all_talents.forEach(function (t) {
      add(out, 'талант', t.name, 'макс. ' + (t.max || '—'),
          (t.hint || '') + (t.checks ? ' Проверки: ' + t.checks + '.' : ''));
    });

    if (typeof DATA !== 'undefined') {
      (DATA.common_skills || []).forEach(function (s) {
        add(out, 'навык', s.name, 'общий · ' + s.stat + (s.group ? ' · с уточнением' : ''), '');
      });
      (DATA.prof_skills || []).forEach(function (s) {
        add(out, 'навык', s.name, 'профессиональный · ' + s.stat + (s.group ? ' · с уточнением' : ''), '');
      });
    }

    if (typeof DATA !== 'undefined' && DATA.careers) Object.keys(DATA.careers).forEach(function (k) {
      var c = DATA.careers[k];
      var tiers = (c.tiers || []).map(function (t, i) { return (i + 1) + '. ' + t.name + ' (' + t.status + ')'; });
      add(out, 'карьера', c.name, c.class + ' · ' + (c.peoples || ''), tiers.join(' · '));
    });

    if (typeof SPELL_LIB !== 'undefined') SPELL_LIB.forEach(function (s) {
      add(out, 'заклинание', s.n, s.l + ' · ЗС ' + s.cn,
          'Дистанция ' + s.r + ', цель ' + s.t + ', длительность ' + s.d + '.' + (s.b ? ' ' + s.b : ''));
    });

    // Сложность проверки спрашивают за столом чаще всего, а посмотреть её было
    // негде: шкала жила только внутри диалога выбора.
    if (typeof DIFFICULTY !== 'undefined') DIFFICULTY.forEach(function (d) {
      add(out, 'сложность', d.name, difficultySign(d.mod) + ' к значению',
          'Насколько трудна задача: к значению навыка или характеристики ' +
          'прибавляется ' + difficultySign(d.mod) + ' — ' + d.hint +
          '. Мастер называет сложность вслух; если не назвал, проверка серьёзная (+0).');
    });

    if (typeof DISEASES !== 'undefined') Object.keys(DISEASES).forEach(function (k) {
      var d = DISEASES[k];
      add(out, 'болезнь', k, 'инкубация ' + d.inc + ' · длительность ' + d.dur,
          'Симптомы: ' + d.sym + '. ' + (d.note || ''));
    });

    return out;
  }

  // ── поиск ───────────────────────────────────────────────────────────────────
  // Совпадение в названии идёт выше совпадения в описании, а начало названия —
  // выше середины: «щит» должен показать «Щит», а не двадцать записей, где это
  // слово попалось в тексте.
  window.refSearch = function (query, kind) {
    if (!index) index = build();
    var q = norm(query).trim();
    var hits = [];
    index.forEach(function (e) {
      if (kind && e.kind !== kind) return;
      var rank = -1;
      if (!q) rank = 3;
      else if (e.key.indexOf(q) === 0) rank = 0;
      else if (e.key.indexOf(q) > 0) rank = 1;
      else if (e.body.indexOf(q) >= 0) rank = 2;
      if (rank >= 0) hits.push({ e: e, rank: rank });
    });
    hits.sort(function (a, b) {
      return a.rank - b.rank || a.e.name.localeCompare(b.e.name, 'ru');
    });
    return hits.map(function (h) { return h.e; });
  };

  window.refCount = function () { if (!index) index = build(); return index.length; };

  // ── окно ────────────────────────────────────────────────────────────────────
  var KINDS = ['всё', 'качество', 'состояние', 'сложность', 'талант', 'оружие',
               'броня', 'навык', 'заклинание', 'карьера', 'болезнь'];
  var curKind = 'всё';
  var LIMIT = 60;   // длиннее списка на телефоне всё равно не прокручивают

  function modal() {
    var m = document.getElementById('ref-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ref-modal';
    m.className = 'sv4-roll-modal';
    m.onclick = function (e) { if (e.target === m) refClose(); };
    document.body.appendChild(m);
    return m;
  }

  window.refClose = function () {
    var m = document.getElementById('ref-modal');
    if (m) m.classList.remove('show');
  };

  window.refOpen = function () {
    var m = modal();
    m.innerHTML =
      // Без stopPropagation на карточке: фон закрывается только по клику по
      // себе (e.target === m), а глушение всплытия обрубало бы делегирование
      // кнопок разделов — они ловятся обработчиком на document.
      '<div class="ref-card">' +
        '<div class="spick-head">' +
          '<b>Справочник <small style="font-weight:normal;color:var(--text3);">' +
            refCount() + '</small></b>' +
          '<button class="btn btn-sm" onclick="refClose()" aria-label="Закрыть">✕</button>' +
        '</div>' +
        '<input id="ref-q" class="sv4-text" style="width:100%;margin:8px 0;"' +
          ' placeholder="⌕ название или слово из описания" aria-label="Поиск по справочнику">' +
        '<div class="ref-kinds">' +
          KINDS.map(function (k) {
            return '<button class="ref-kind' + (k === curKind ? ' on' : '') + '" data-ref-kind="' + k + '">' + k + '</button>';
          }).join('') +
        '</div>' +
        '<div class="spick-list" id="ref-list"></div>' +
      '</div>';
    m.classList.add('show');
    var q = document.getElementById('ref-q');
    q.oninput = function () { refRender(q.value); };
    refRender('');
    // Клавиатура на телефоне закрывает половину списка — пусть человек сам
    // решит, набирать или листать разделы.
  };

  window.refRender = function (query) {
    var box = document.getElementById('ref-list');
    if (!box) return;
    var kind = curKind === 'всё' ? null : curKind;
    var hits = refSearch(query, kind);
    if (!hits.length) {
      box.innerHTML = '<p class="muted" style="padding:12px 2px;">Ничего не нашлось.</p>';
      return;
    }
    var shown = hits.slice(0, LIMIT);
    box.innerHTML = shown.map(function (e) {
      return '<div class="spick-row">' +
        '<div class="spick-main"><b>' + escHtml(e.name) + '</b>' +
          '<span class="spick-cn">' + escHtml(e.kind) + '</span></div>' +
        (e.sub ? '<div class="spick-sub">' + escHtml(e.sub) + '</div>' : '') +
        (e.text ? '<div class="ref-text">' + escHtml(e.text) + '</div>' : '') +
      '</div>';
    }).join('') +
    (hits.length > shown.length
      ? '<p class="muted" style="padding:10px 2px;">Показано ' + shown.length + ' из ' + hits.length +
        ' — уточни запрос.</p>'
      : '');
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ref-kind]');
    if (!el) return;
    curKind = el.dataset.refKind;
    var box = el.parentNode;
    box.querySelectorAll('.ref-kind').forEach(function (b) {
      b.classList.toggle('on', b === el);
    });
    var q = document.getElementById('ref-q');
    refRender(q ? q.value : '');
  });
})();
