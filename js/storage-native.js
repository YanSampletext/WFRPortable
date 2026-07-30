// Персонажи живут в localStorage, а он у WebView не вечен: система может
// вычистить его при нехватке места, а «очистить данные приложения» стирает
// гарантированно. Поэтому в собранном приложении держим вторую копию в
// нативном хранилище Android (SharedPreferences через @capacitor/preferences)
// — оно переживает чистку кеша и попадает в системный бэкап.
//
// В браузере плагина нет: там просто просим постоянное хранилище, чтобы
// данные не выбрасывали при нехватке места.
(function () {
  'use strict';

  // Ключи, в которых лежит всё, что жалко потерять
  var KEYS = ['wfrp4_roster_v1', 'wfrp4_currentstate_v1', 'wfrp4_sheet_v1', 'wfrp4_theme'];

  function prefs() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
  }

  // ── Браузер: просим не выбрасывать наши данные ──────────────────────────
  if (!prefs()) {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(function (already) {
        if (!already) navigator.storage.persist();
      }).catch(function () {});
    }
    return;
  }

  // ── Приложение: зеркалим каждую запись в нативное хранилище ─────────────
  var P = prefs();
  var origSet = localStorage.setItem.bind(localStorage);
  var origRemove = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = function (key, value) {
    origSet(key, value);
    if (KEYS.indexOf(key) >= 0) P.set({ key: key, value: String(value) }).catch(function () {});
  };
  localStorage.removeItem = function (key) {
    origRemove(key);
    if (KEYS.indexOf(key) >= 0) P.remove({ key: key }).catch(function () {});
  };

  // ── Восстановление после чистки данных WebView ──────────────────────────
  // app.js читает localStorage синхронно при загрузке, а плагин отвечает
  // асинхронно, поэтому вернуть данные можно только с перезагрузкой страницы.
  // Случается это редко — только когда localStorage пуст, а копия цела.
  if (sessionStorage.getItem('wfrp4_restore_done')) return;
  sessionStorage.setItem('wfrp4_restore_done', '1');

  Promise.all(KEYS.map(function (key) {
    if (localStorage.getItem(key) !== null) return null;
    return P.get({ key: key }).then(function (r) {
      return r && r.value ? { key: key, value: r.value } : null;
    }).catch(function () { return null; });
  })).then(function (found) {
    var restored = found.filter(Boolean);
    if (!restored.length) return;
    restored.forEach(function (item) { origSet(item.key, item.value); });
    location.reload();
  });
})();
