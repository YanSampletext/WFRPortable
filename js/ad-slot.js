// Место под рекламный баннер внизу экрана.
//
// Самой рекламы здесь нет: приложение офлайновое и никуда не ходит. Готово
// только место — контейнер, который не ломает раскладку и не наезжает на
// нижнюю панель бланка. Когда появится SDK (RuStore Ads, Яндекс и прочие),
// его баннер кладётся сюда через adSlotSet(), и всё остальное подвинется само.
//
//   adSlotSet(el)   — показать баннер (DOM-узел или строка HTML)
//   adSlotSet(null) — убрать; место схлопывается без следа
//   adSlotDemo()    — заглушка, чтобы посмотреть, как оно сидит
(function () {
  'use strict';

  var HEIGHT = 50;           // стандартная высота мобильного баннера
  var slot = null;

  function ensure() {
    if (slot) return slot;
    slot = document.getElementById('ad-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'ad-slot';
      slot.setAttribute('aria-label', 'Реклама');
      document.body.appendChild(slot);
    }
    return slot;
  }

  function setHeight(px) {
    document.documentElement.style.setProperty('--ad-h', px + 'px');
    document.body.classList.toggle('has-ad', px > 0);
  }

  window.adSlotSet = function (content) {
    var el = ensure();
    if (!content) {
      el.innerHTML = '';
      setHeight(0);
      return;
    }
    if (typeof content === 'string') el.innerHTML = content;
    else { el.innerHTML = ''; el.appendChild(content); }
    setHeight(HEIGHT);
  };

  window.adSlotDemo = function () {
    adSlotSet('<span class="ad-demo">место под баннер · 320×50</span>');
  };

  // Место пустует, пока баннер не положили: ни зазора, ни рамки
  setHeight(0);
})();
