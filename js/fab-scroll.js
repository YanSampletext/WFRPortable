// Регулятор здоровья висит поверх содержимого и закрывал талант или строку
// таблицы. Прячем его, пока читают, и возвращаем, как только прокрутка встала.
(function () {
  'use strict';
  var last = 0, timer = null;
  function fab() { return document.querySelector('.sv4-fab-hp'); }
  window.addEventListener('scroll', function () {
    var el = fab();
    if (!el) return;
    var y = window.scrollY || 0;
    if (y > last + 8) el.classList.add('tucked');    // листают вниз — убираем
    else if (y < last - 8) el.classList.remove('tucked');
    last = y;
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.remove('tucked'); }, 700);
  }, { passive: true });
})();
