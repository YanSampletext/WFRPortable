// Экран не гаснет во время игры.
//
// За столом телефон лежит открытым на бланке и тухнет каждые полминуты, а
// будят его пальцами в жире от чипсов. Wake Lock просит систему не гасить
// экран, пока страница на виду. Это штатный API браузера — ни плагина,
// ни разрешения в манифесте не нужно.
//
// Замок теряется сам, когда приложение уходит в фон: так и задумано системой,
// иначе забытый замок сажал бы батарею. Поэтому при возвращении берём заново.
(function () {
  'use strict';

  var KEY = 'wfrp4_awake';       // свой ключ, модели персонажа не касается
  var lock = null;

  function supported() {
    return !!(navigator.wakeLock && navigator.wakeLock.request);
  }

  window.wakeIsOn = function () {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  };

  function acquire() {
    if (!supported() || lock) return Promise.resolve(false);
    return navigator.wakeLock.request('screen').then(function (l) {
      lock = l;
      // Система может отпустить замок и сама — тогда просто забываем ссылку
      l.addEventListener('release', function () { lock = null; });
      return true;
    }).catch(function () { lock = null; return false; });
  }

  function release() {
    if (!lock) return;
    try { lock.release(); } catch (e) {}
    lock = null;
  }

  window.wakeToggle = function () {
    if (!supported()) {
      notify('Это устройство не умеет держать экран включённым.');
      return;
    }
    if (wakeIsOn()) {
      try { localStorage.setItem(KEY, '0'); } catch (e) {}
      release();
      notify('Экран снова гаснет как обычно.');
      return;
    }
    acquire().then(function (ok) {
      if (!ok) { notify('Не вышло удержать экран включённым.'); return; }
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      notify('Экран не будет гаснуть, пока приложение открыто.');
    });
  };

  // Вернулись из фона — замок к этому моменту уже отпущен системой
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && wakeIsOn()) acquire();
    else if (document.visibilityState !== 'visible') release();
  });

  if (wakeIsOn()) acquire();
})();
