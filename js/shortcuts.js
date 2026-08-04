// Ярлыки по долгому нажатию на иконку приложения.
//
// MainActivity зовёт window.ordoShortcut('dice'), когда приложение открыли
// с ярлыка. Java не знает, дожила ли страница до готовности, поэтому зовёт
// дважды с запасом — значит, повтор надо гасить здесь. Отрабатываем ровно
// один раз на запуск.
(function () {
  'use strict';

  var done = false;

  var GO = {
    // Кубы и схватка живут во вкладках бланка — без открытого досье туда незачем
    dice:  { tab: 'rolllog', need: true,  miss: 'Сначала открой досье — кубы лежат в журнале бросков.' },
    fight: { tab: 'crit',    need: true,  miss: 'Сначала открой досье — схватка лежит в бою.' },
    archive: { step: 0,      need: false }
  };

  function hasChar() {
    return typeof appMode !== 'undefined' && appMode === 'character';
  }

  window.ordoShortcut = function (what) {
    if (done) return;
    var go = GO[what];
    if (!go) return;
    done = true;

    if (typeof go.step === 'number') { goStep(go.step); return; }

    if (go.need && !hasChar()) {
      // Без открытого персонажа показываем архив: оттуда до бланка один тап
      goStep(0);
      if (typeof notify === 'function') notify(go.miss);
      return;
    }
    goStep(8);
    if (typeof sv4NavGo === 'function') sv4NavGo(go.tab);
  };
})();
