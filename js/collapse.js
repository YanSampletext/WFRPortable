// Сворачиваемые секции бланка на телефоне (тап по заголовку .sv4-section-title).
//
// Свернуть секцию было можно и раньше, но толку от этого не было: состояние
// жило только в разметке — в классе на заголовке и в style.display у блоков.
// Бланк перерисовывается почти на каждое действие (сняли рану, купили навык,
// переключили вкладку), и всё раскрывалось обратно. Свернуть «Характеристики»,
// чтобы добраться до боевой сводки, приходилось после каждого хода заново.
//
// Теперь свёрнутое помнится по имени секции и переживает и перерисовку, и
// перезапуск приложения. Ключ — вкладка плюс заголовок без счётчика в скобках:
// «(12)» в «Профессиональные навыки (12)» меняется при каждой покупке, а
// порядковый номер секции поехал бы, когда появляется условная секция вроде
// «Оружие в руке».
(function () {
  'use strict';

  var KEY = 'wfrp4_collapsed_v1';
  var collapsed = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (s) { return typeof s === 'string'; }) : [];
    } catch (e) { return []; }
  }

  // Переполнение памяти тут не беда: список коротких строк. Но и падать из-за
  // настройки оформления, когда место кончилось из-за портретов, незачем.
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(collapsed)); } catch (e) {}
  }

  function isMobile() { return window.matchMedia('(max-width:560px)').matches; }

  function keyOf(title) {
    var tab = (typeof _sheetTab === 'string' ? _sheetTab : '?');
    var text = (title.textContent || '')
      .replace(/\(\s*\d+\s*\)/g, ' ')   // счётчики вида «(12)» меняются сами по себе
      .replace(/\s+/g, ' ')
      .trim();
    return tab + '|' + text;
  }

  // Секция — всё до следующего заголовка.
  function nextBlocks(title) {
    var out = [], el = title.nextElementSibling;
    while (el && !el.classList.contains('sv4-section-title')) { out.push(el); el = el.nextElementSibling; }
    return out;
  }

  function paint(title, hide) {
    title.classList.toggle('sv4-collapsed', hide);
    nextBlocks(title).forEach(function (b) { b.style.display = hide ? 'none' : ''; });
  }

  function applyAll() {
    if (!isMobile()) return;
    var titles = document.querySelectorAll('.sv4-section-title');
    for (var i = 0; i < titles.length; i++) {
      var hide = collapsed.indexOf(keyOf(titles[i])) >= 0;
      // Разворачивать нетронутые секции незачем — заодно не трогаем чужой display
      if (hide || titles[i].classList.contains('sv4-collapsed')) paint(titles[i], hide);
    }
  }

  document.addEventListener('click', function (e) {
    if (!isMobile()) return;
    var t = e.target.closest('.sv4-section-title');
    if (!t) return;
    if (e.target.closest('button,input,select,a')) return;   // клик по кнопке внутри заголовка

    var k = keyOf(t);
    var i = collapsed.indexOf(k);
    var hide = i < 0;
    if (hide) collapsed.push(k); else collapsed.splice(i, 1);
    save();
    paint(t, hide);
  });

  // Перерисовка приходит из десятка мест — renderSheet, renderTabHealth,
  // модалки крита и психологии. Перехватывать каждое значит ловить следующее
  // руками; наблюдатель ловит все разом. Колбэк MutationObserver — микрозадача,
  // то есть отработает до отрисовки кадра, и свёрнутое не мигнёт развёрнутым.
  // Наблюдаем только childList: сами мы правим class и style, а это атрибуты,
  // так что зациклиться не на чем.
  function watch() {
    var root = document.getElementById('view-app') || document.body;
    try {
      new MutationObserver(applyAll).observe(root, { childList: true, subtree: true });
    } catch (e) {}
    applyAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
