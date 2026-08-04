// Аппаратная кнопка «назад» на Android и память позиции прокрутки.
//
// Приложение — одна страница, поэтому системная кнопка «назад» закрывала его
// с любого экрана. Здесь мы ведём собственный стек экранов и держим его в
// синхроне с history: каждый переход добавляет запись, «назад» её снимает.
// Работает и в браузере, и в Capacitor WebView — плагины не нужны.
(function () {
  'use strict';

  // Первый экран — лендинг. Своей записи в history у него нет: когда стек
  // опустеет до него, следующее «назад» закроет приложение, как и положено.
  var stack = [{ kind: 'home', value: '' }];
  var scrollMemo = {};
  var goingBack = false;

  function keyOf(s) { return s.kind + ':' + s.value; }
  function top() { return stack[stack.length - 1]; }

  function rememberScroll() {
    if (stack.length) scrollMemo[keyOf(top())] = window.scrollY || 0;
  }

  function applyScreen(s) {
    goingBack = true;
    try {
      if (s.kind === 'home' && typeof goHome === 'function') goHome();
      else if (s.kind === 'step' && typeof goStep === 'function') goStep(s.value);
      else if (s.kind === 'tab' && typeof sv4NavGo === 'function') sv4NavGo(s.value);
    } catch (e) {
      /* сломанный переход не должен вешать кнопку «назад» */
    } finally {
      goingBack = false;
    }
    var y = scrollMemo[keyOf(s)] || 0;
    setTimeout(function () { window.scrollTo(0, y); }, 0);
  }

  // Вызывается из goStep / goHome / sv4NavGo после успешного перехода
  window.navEnter = function (kind, value) {
    if (goingBack) return;              // переход инициирован самой кнопкой «назад»
    var s = { kind: kind, value: value };
    if (keyOf(top()) === keyOf(s)) return;   // тот же экран — запись не плодим
    rememberScroll();
    stack.push(s);
    try { history.pushState({ ordo: stack.length }, ''); } catch (e) {}
  };

  // goStep и sv4NavGo спрашивают, крутить ли страницу в начало
  window.navGoingBack = function () { return goingBack; };

  window.addEventListener('popstate', function () {
    // 1. Открытый диалог закрывается первым, экран остаётся на месте
    var dlg = document.getElementById('ordo-dlg');
    if (dlg && dlg.classList.contains('show')) {
      if (typeof ordoDialogClose === 'function') ordoDialogClose();
      try { history.pushState({ ordo: stack.length }, ''); } catch (e) {}
      return;
    }
    // 2. Затем выдвижное меню оболочки или боковое меню бланка
    var nav = document.getElementById('sv4-nav');
    var drawerUp = (typeof drawerIsOpen === 'function') && drawerIsOpen();
    if (drawerUp || (nav && nav.classList.contains('open'))) {
      if (drawerUp) drawerClose();
      else if (typeof sv4NavClose === 'function') sv4NavClose();
      try { history.pushState({ ordo: stack.length }, ''); } catch (e) {}
      return;
    }
    // 3. Предыдущий экран с восстановлением прокрутки
    if (stack.length > 1) {
      rememberScroll();
      stack.pop();
      applyScreen(top());
      return;
    }
    // 4. Стек пуст — приложение закрывается системой, вмешиваться не нужно
  });
})();
