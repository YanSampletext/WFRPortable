/* Сворачиваемые секции бланка на мобильном (тап по заголовку .sv4-section-title) */
(function(){
  function isMobile(){ return window.matchMedia('(max-width:560px)').matches; }
  function nextBlocks(title){
    // элементы до следующего .sv4-section-title
    const out=[]; let el=title.nextElementSibling;
    while(el && !el.classList.contains('sv4-section-title')){ out.push(el); el=el.nextElementSibling; }
    return out;
  }
  document.addEventListener('click', function(e){
    if(!isMobile()) return;
    const t = e.target.closest('.sv4-section-title');
    if(!t) return;
    // не сворачивать, если клик по интерактивному элементу внутри заголовка
    if(e.target.closest('button,input,select,a')) return;
    const collapsed = t.classList.toggle('sv4-collapsed');
    nextBlocks(t).forEach(b=> b.style.display = collapsed ? 'none' : '');
  });
})();
