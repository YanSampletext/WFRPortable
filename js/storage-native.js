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

  // Сбой зеркалирования молчать не должен. Показывать его человеку незачем —
  // localStorage записал, работа не пострадала, — но пустой catch не оставлял
  // никакого следа: если нативная копия перестала обновляться, узнать об этом
  // было неоткуда, в том числе и по логу устройства.
  function mirrorFailed(what, key) {
    return function (err) {
      try { console.error('[storage-native] Preferences.' + what + ' не сработал для «' + key + '»', err); } catch (e) {}
    };
  }

  localStorage.setItem = function (key, value) {
    origSet(key, value);
    if (KEYS.indexOf(key) >= 0) P.set({ key: key, value: String(value) }).catch(mirrorFailed('set', key));
  };
  localStorage.removeItem = function (key) {
    origRemove(key);
    if (KEYS.indexOf(key) >= 0) P.remove({ key: key }).catch(mirrorFailed('remove', key));
  };

  // ── Восстановление после чистки данных WebView ──────────────────────────
  // app.js читает localStorage синхронно при загрузке, а плагин отвечает
  // асинхронно, поэтому вернуть данные можно только с перезагрузкой страницы.
  // Случается это редко — только когда localStorage пуст, а копия цела.
  // Метка нужна против петли перезагрузок: если запись в localStorage не
  // прижилась, следующая загрузка снова нашла бы копию и снова перезагрузилась.
  // Но ставили её ДО попытки, и разовый сбой плагина запирал восстановление до
  // конца сеанса — а восстанавливать надо было именно в этот раз. Ставим после
  // того, как данные легли, прямо перед перезагрузкой: от петли это защищает
  // так же, а второй попытке больше не мешает.
  if (sessionStorage.getItem('wfrp4_restore_done')) return;

  Promise.all(KEYS.map(function (key) {
    if (localStorage.getItem(key) !== null) return null;
    return P.get({ key: key }).then(function (r) {
      return r && r.value ? { key: key, value: r.value } : null;
    }).catch(function (err) {
      try { console.error('[storage-native] Preferences.get не сработал для «' + key + '»', err); } catch (e) {}
      return null;
    });
  })).then(function (found) {
    var restored = found.filter(Boolean);
    if (!restored.length) return;
    restored.forEach(function (item) { origSet(item.key, item.value); });
    sessionStorage.setItem('wfrp4_restore_done', '1');
    location.reload();
  });
})();
