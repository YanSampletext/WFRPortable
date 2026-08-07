// Резервная копия архива одним файлом.
//
// Выгрузить досье было можно и раньше — по одному. Архив на десяток
// персонажей это десять нажатий и десять файлов, поэтому никто так не делал,
// и весь архив держался на одном localStorage. Копия в нативном хранилище
// (storage-native.js) переживает чистку кеша, но «Очистить данные приложения»
// сносит и её, а переустановка — тем более. Без файла на руках возврата нет.
//
// Формат — конверт вокруг того же массива, что лежит в wfrp4_roster_v1:
//   { ordo: 'archive', v: 1, saved: <мс>, chars: [ ...досье... ] }
// Каждое досье внутри проходит тот же sanitizeCharacter, что и одиночный
// импорт: файл мог пролежать где угодно и прийти откуда угодно.
(function () {
  'use strict';

  var MARK = 'archive';   // отличает конверт от одиночного досье

  function stamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── выгрузка ────────────────────────────────────────────────────────────────
  // Сборка конверта отделена от скачивания: проверить содержимое файла можно
  // без того, чтобы притворяться браузерным диалогом сохранения.
  window.archiveJson = function () {
    // Текущее досье могло измениться после последней записи в архив
    if (typeof autosave === 'function') autosave();
    return JSON.stringify({ ordo: MARK, v: 1, saved: Date.now(), chars: loadRoster() }, null, 2);
  };

  window.exportArchive = function () {
    var text = archiveJson();
    var n = JSON.parse(text).chars.length;
    if (!n) { notify('Архив пуст — нечего сохранять.'); return; }
    download(text, 'ordo-arhiv-' + stamp() + '.json');
    notify('Архив выгружен: досье ' + n + '.');
  };

  // ── разбор файла ────────────────────────────────────────────────────────────
  // Одиночное досье принимаем тоже: пункт меню один, и заставлять человека
  // помнить, какой из его файлов какого рода, незачем.
  function parseFile(text) {
    var raw = JSON.parse(text);
    var list = (raw && raw.ordo === MARK && Array.isArray(raw.chars)) ? raw.chars : [raw];
    var chars = [], bad = 0;
    list.forEach(function (item) {
      try { chars.push(sanitizeCharacter(item)); } catch (e) { bad++; }
    });
    if (!chars.length) throw new Error('ни одного досье прочитать не удалось');
    return { chars: chars, bad: bad };
  }

  // ── слияние ─────────────────────────────────────────────────────────────────
  // Возврат своей же копии на то же устройство не должен плодить двойников,
  // поэтому совпадение по id — это то же досье. Более свежее по _updated
  // побеждает; принесённое из прошлого молча затирать нельзя.
  function merge(incoming) {
    var roster = loadRoster();
    var added = 0, updated = 0, kept = 0;
    incoming.forEach(function (c) {
      var i = c.id ? roster.findIndex(function (p) { return p.id === c.id; }) : -1;
      if (i < 0) {
        if (!c.id) c.id = genCharId();
        if (!c._updated) c._updated = Date.now();
        roster.push(c); added++;
      } else if ((c._updated || 0) > (roster[i]._updated || 0)) {
        roster[i] = c; updated++;
      } else {
        kept++;
      }
    });
    if (!saveRoster(roster)) return null;
    return { added: added, updated: updated, kept: kept };
  }

  function replace(incoming) {
    incoming.forEach(function (c) {
      if (!c.id) c.id = genCharId();
      if (!c._updated) c._updated = Date.now();
    });
    if (!saveRoster(incoming)) return null;
    return { added: incoming.length, updated: 0, kept: 0 };
  }

  function report(res, bad) {
    if (!res) return;                       // saveRoster уже сказал про переполнение
    var parts = [];
    if (res.added) parts.push('добавлено ' + res.added);
    if (res.updated) parts.push('обновлено ' + res.updated);
    if (res.kept) parts.push('оставлено своих ' + res.kept);
    if (bad) parts.push('не прочитано ' + bad);
    notify(parts.length ? parts.join(', ') + '.' : 'Архив уже такой же.');
    if (typeof renderRoster === 'function') renderRoster();
    if (typeof renderLandingChars === 'function') renderLandingChars();
  }

  // ── восстановление ──────────────────────────────────────────────────────────
  window.importArchive = function (input) {
    var file = input.files && input.files[0];
    input.value = '';                        // иначе тот же файл второй раз не выберется
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { notify('Не вышло прочитать файл.'); };
    reader.onload = function (e) {
      var parsed;
      try { parsed = parseFile(e.target.result); }
      catch (err) { notify('Ошибка чтения: ' + (err && err.message ? err.message : 'файл не разобран')); return; }

      // В пустой архив класть нечего поверх — не спрашиваем
      if (!loadRoster().length) { report(merge(parsed.chars), parsed.bad); return; }

      ordoChoice({
        title: 'В файле досье: ' + parsed.chars.length,
        text: 'Добавить к тому, что уже в архиве, или заменить архив целиком?',
        options: [
          { label: 'Добавить к архиву', cb: function () { report(merge(parsed.chars), parsed.bad); } },
          { label: 'Заменить архив', danger: true, cb: function () {
              ordoConfirm({
                title: 'Заменить весь архив?',
                text: 'Все нынешние досье будут стёрты и заменены содержимым файла. Отменить это будет нечем.',
                yes: 'Заменить', no: 'Оставить как есть', danger: true,
                onYes: function () { report(replace(parsed.chars), parsed.bad); }
              });
            } }
        ]
      });
    };
    reader.readAsText(file);
  };
})();
