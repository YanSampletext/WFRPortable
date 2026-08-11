// Какие таланты касаются этого броска.
//
// Из 168 талантов у 116 в справочнике записано поле «проверки»: они меняют не
// число на бланке, а конкретные проверки — и почти всегда при определённых
// обстоятельствах. «Верный выстрел» помогает стрельбе, но только при
// тщательном прицеливании; «Батман» — рукопашной, но только при батмане.
//
// Считать такое за игрока нельзя: обстоятельство описано словами, и решает
// его человек за столом, а не приложение. Молча прибавить +10 значило бы
// врать о правилах. Зато можно не дать забыть: при броске показываем те
// таланты персонажа, которые вообще к этой проверке относятся, вместе с
// условием, при котором они работают.
(function () {
  'use strict';

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').trim();
  }

  // «книжные изыскания, язык (письменный)» → две записи.
  // Запятые внутри скобок не разделители: «рукопашный бой (кулачное, при
  // попытках коснуться противника)» — это одна проверка.
  function splitChecks(s) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // «стрельба (при тщательном прицеливании)» → { skill:'стрельба', when:'при тщательном прицеливании' }
  function parseCheck(part) {
    var m = /^([^(]+)(?:\(([^]*)\))?$/.exec(part);
    if (!m) return null;
    var skill = norm(m[1]);
    if (skill.length < 4) return null;   // «Х», «СВ» и прочие обрывки ловили бы что угодно
    return { skill: skill, when: (m[2] || '').trim() };
  }

  var cache = null;
  function table() {
    if (cache) return cache;
    cache = {};
    if (typeof DATA === 'undefined' || !DATA.all_talents) return cache;
    DATA.all_talents.forEach(function (t) {
      if (!t.checks) return;
      cache[norm(t.name)] = splitChecks(t.checks).map(parseCheck).filter(Boolean);
    });
    return cache;
  }

  // Название броска приходит разное: «стрельба (луки)» с бланка, но и
  // «Страх: хладнокровие» из психологии, «Сон: выносливость» из отдыха.
  // Поэтому ищем вхождение названия навыка в название броска, а не равенство.
  window.talentsForCheck = function (rollName) {
    var target = norm(rollName);
    if (!target) return [];
    var tbl = table();
    var mine = (typeof compileTalents === 'function' ? compileTalents() : []) || [];
    var seen = {}, out = [];
    mine.forEach(function (t) {
      var key = norm(t.name);
      var checks = tbl[key];
      if (!checks || seen[key]) return;
      for (var i = 0; i < checks.length; i++) {
        if (target.indexOf(checks[i].skill) >= 0) {
          seen[key] = 1;
          out.push({ name: t.name, level: t.level || 1, when: checks[i].when });
          return;
        }
      }
    });
    return out;
  };

  // Разметка для карточки броска. Пусто — значит блока не будет вовсе:
  // строка «подходящих талантов нет» под каждым броском только мешала бы.
  window.talentHintHtml = function (rollName) {
    var list = talentsForCheck(rollName);
    if (!list.length) return '';
    return '<div class="roll-talents">' +
      '<div class="roll-talents-h">Твои таланты на эту проверку</div>' +
      list.map(function (t) {
        return '<div class="roll-talent">' +
          '<b>' + escHtml(t.name) + '</b>' +
          (t.level > 1 ? '<span class="roll-talent-lvl">' + t.level + '⭐</span>' : '') +
          (t.when ? '<span class="roll-talent-when">' + escHtml(t.when) + '</span>' : '') +
        '</div>';
      }).join('') +
    '</div>';
  };
})();
