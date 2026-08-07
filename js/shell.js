// Оболочка приложения: верхняя панель, выдвижное меню, компактный степпер.
// Заменяет прежнюю шапку с двумя кнопками и горизонтальный список из девяти шагов.
(function () {
  'use strict';

  var MENU = [
    { label: 'Архив досье',      sub: 'сохранённые персонажи', act: function () { goStep(0); } },
    { label: 'Создать досье',    sub: 'новый персонаж',        act: function () { startNewCharacter(); } },
    { label: 'Бланк персонажа',  sub: 'текущее дело',          act: function () { goStep(8); }, needChar: true },
    { label: 'Магазин опыта',    sub: 'трата XP',              act: function () { goStep(9); }, needChar: true },
    { label: 'Сохранить архив',  sub: 'все досье в один файл', act: function () { exportArchive(); } },
    { label: 'Восстановить',     sub: 'из файла архива',       act: function () { var i = document.getElementById('import-roster'); if (i) i.click(); } },
    { label: 'Тема',             sub: 'светлая или тёмная',    act: function () { toggleTheme(); }, keepOpen: true },
    { label: 'Не гасить экран',  sub: subAwake,                act: function () { wakeToggle(); }, keepOpen: true },
    { label: 'Поддержать проект', sub: 'boosty.to/ordodos',     act: function () { openSupport(); } },
    { label: 'О приложении',     sub: 'что это такое',         act: function () { about(); } }
  ];

  // Живая подпись: видно, включено ли сейчас
  function subAwake() {
    if (typeof wakeIsOn !== 'function') return 'недоступно';
    return wakeIsOn() ? 'сейчас включено' : 'выключено';
  }

  function hasChar() {
    return typeof appMode !== 'undefined' && appMode === 'character';
  }

  var SUPPORT_URL = 'https://boosty.to/ordodos/donate';

  // Ссылка наружу: в приложении её открывает системный браузер, иначе
  // страница подменила бы собой приложение внутри WebView.
  window.openSupport = function () {
    var w = null;
    try { w = window.open(SUPPORT_URL, '_blank', 'noopener'); } catch (e) { w = null; }
    if (w) return;
    // Переход по location увёл бы приложение на сайт прямо внутри WebView,
    // и вернуться можно было бы только кнопкой «назад». Показываем адрес.
    ordoAlert({
      title: 'Поддержать проект',
      text: 'Не вышло открыть браузер. Адрес страницы:\n\n' + SUPPORT_URL,
      ok: 'Понятно'
    });
  };

  function about() {
    ordoAlert({
      title: 'Досье Ордо',
      text: 'Лист персонажа для настольной ролевой игры.\n' +
            'Работает без интернета, всё хранится в самом приложении.\n' +
            'Выгружай досье в JSON, если хочешь перенести их на другое устройство.\n\n' +
            'Поддержать проект: boosty.to/ordodos',
      ok: 'Закрыть'
    });
  }

  // ── выдвижное меню ──────────────────────────────────────────────────────
  function drawer() { return document.getElementById('app-drawer'); }

  window.drawerOpen = function () {
    var d = drawer();
    if (!d) return;
    d.querySelector('.drawer-list').innerHTML = MENU.map(function (m, i) {
      var off = m.needChar && !hasChar();
      var sub = (typeof m.sub === 'function') ? m.sub() : m.sub;
      return '<button class="drawer-item' + (off ? ' off' : '') + '" data-i="' + i + '"' +
             (off ? ' disabled' : '') + '><span>' + m.label + '</span><small>' + sub + '</small></button>';
    }).join('');
    d.classList.add('open');
    document.body.classList.add('drawer-open');
  };

  window.drawerClose = function () {
    var d = drawer();
    if (d) d.classList.remove('open');
    document.body.classList.remove('drawer-open');
  };

  window.drawerIsOpen = function () {
    var d = drawer();
    return !!(d && d.classList.contains('open'));
  };

  // ── заголовок экрана в верхней панели ───────────────────────────────────
  var TITLES = { 0: 'Архив досье', 8: 'Бланк персонажа', 9: 'Магазин опыта' };

  window.shellSyncBar = function () {
    var t = document.getElementById('app-bar-title');
    if (!t) return;
    var n = (typeof state !== 'undefined' && state && typeof state.step === 'number') ? state.step : 0;
    t.textContent = TITLES[n] || ('Шаг ' + n + ' · ' + (STEP_LABEL[n] || 'Создание'));
  };

  // ── компактный степпер вместо ленты из девяти шагов ─────────────────────
  window.renderStepsCompact = function () {
    var nav = document.getElementById('steps');
    if (!nav) return;
    if (typeof appMode !== 'undefined' && appMode === 'character') { nav.innerHTML = ''; return; }
    var n = (state && typeof state.step === 'number') ? state.step : 1;
    if (n < 1 || n > 7) { nav.innerHTML = ''; return; }
    var pct = Math.round((n - 1) / 6 * 100);
    nav.innerHTML =
      '<div class="stepper">' +
        '<div class="stepper-line"><span>Шаг ' + n + ' из 7</span><b>' + (STEP_LABEL[n] || '') + '</b></div>' +
        '<div class="stepper-bar"><i style="width:' + pct + '%"></i></div>' +
      '</div>';
  };

  // ── события оболочки ────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var burger = e.target.closest('#app-bar-menu');
    if (burger) { drawerOpen(); return; }

    var d = drawer();
    if (d && d.classList.contains('open')) {
      if (e.target === d.querySelector('.drawer-scrim')) { drawerClose(); return; }
      var item = e.target.closest('.drawer-item');
      if (item) {
        var m = MENU[+item.dataset.i];
        if (!m.keepOpen) drawerClose();
        try { m.act(); } catch (err) { notify('Не вышло: ' + err.message); }
        // «Тема» и «Не гасить экран» меняют то, что сами же и показывают
        if (m.keepOpen && drawerIsOpen()) setTimeout(drawerOpen, 60);
      }
    }
  });

  // свайп от левого края открывает меню, свайп влево по открытому — закрывает
  var startX = null, startY = null;
  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (startX == null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX, dy = Math.abs(t.clientY - startY);
    if (dy < 60) {
      if (startX < 24 && dx > 60 && !drawerIsOpen()) drawerOpen();
      else if (drawerIsOpen() && dx < -60) drawerClose();
    }
    startX = startY = null;
  }, { passive: true });
})();

// ── одно делегирование на всю статическую разметку ──────────────────────────
// Кнопки в index.html размечены через data-act вместо инлайновых onclick:
// обработчик один, а не два с половиной десятка, и разметка не тащит в себе код.
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var act = el.dataset.act;
  try {
    if (act === 'step') goStep(parseInt(el.dataset.arg, 10));
    else if (act === 'print') window.print();
    else if (typeof window[act] === 'function') window[act]();
    else return;
  } catch (err) {
    notify('Не вышло: ' + err.message);
  }
});

// Плитки вкладки «Ещё»: код перехода лежит в data-tile, а не в onclick
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-tile]');
  if (!el) return;
  var call = el.dataset.tile;
  var m = /^sv4NavGo\('([a-z]+)'\)$/.exec(call);
  try {
    if (m) { sv4NavGo(m[1]); return; }
    m = /^sv4DoAction\('([a-z]+)'\)$/.exec(call);
    if (m) { sv4DoAction(m[1]); return; }
    m = /^goStep\((\d+)\)$/.exec(call);
    if (m) { goStep(parseInt(m[1], 10)); return; }
    if (call === 'toggleTheme()') { toggleTheme(); return; }
    if (call === 'openSupport()') { openSupport(); return; }
    if (call.indexOf('gmOpen') >= 0) { if (typeof gmOpen === 'function') gmOpen(); return; }
  } catch (err) {
    notify('Не вышло: ' + err.message);
  }
});
