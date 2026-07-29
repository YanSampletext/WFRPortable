(function(){
  "use strict";
  var GODS={
    khorne:{n:'Кхорн',e:'Кровавый Бог',c:'#b0301f',svg:'<svg viewBox="0 0 32 32" fill="none"><path d="M16 3 L27 26 Q16 19 5 26 Z" fill="currentColor"/><circle cx="16" cy="13" r="2.4" fill="#000" opacity=".35"/></svg>'},
    nurgle:{n:'Нургл',e:'Владыка Чумы',c:'#7a9438',svg:'<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="10" r="3.4" fill="currentColor"/><circle cx="10" cy="20" r="3.4" fill="currentColor"/><circle cx="22" cy="20" r="3.4" fill="currentColor"/></svg>'},
    tzeentch:{n:'Тзинч',e:'Изменяющий Пути',c:'#3f6abf',svg:'<svg viewBox="0 0 32 32" fill="none"><path d="M16 3 C9 12 24 14 16 29 C21 18 11 16 16 3Z" fill="currentColor"/><circle cx="16" cy="13" r="2" fill="#000" opacity=".3"/></svg>'},
    slaanesh:{n:'Слаанеш',e:'Тёмный Князь',c:'#c4528f',svg:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M11 5 C24 8 8 15 21 18 C8 21 24 27 11 30"/></svg>'},
    undivided:{n:'Хаос Неделимый',e:'Гибельные Силы',c:'#9070b0',svg:'<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="9" stroke="currentColor" stroke-width="1.6"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="16" y1="1" x2="16" y2="5"/><line x1="16" y1="27" x2="16" y2="31"/><line x1="1" y1="16" x2="5" y2="16"/><line x1="27" y1="16" x2="31" y2="16"/><line x1="6" y1="6" x2="9" y2="9"/><line x1="26" y1="26" x2="23" y2="23"/></g><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>'}
  };
  var MAGE='<svg viewBox="0 0 32 32" fill="none"><path d="M16 7 L19 15 L27 15 L20 20 L23 28 L16 23 L9 28 L12 20 L5 15 L13 15Z" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="#0c0805"/></svg>';

  function sht(){ try{ return (typeof state!=='undefined'&&state&&state.sheet)?state.sheet:null; }catch(e){ return null; } }
  function mut(s){ var m=s.mutations; if(Array.isArray(m)) return m.length>0; return !!(m&&String(m).trim()); }
  function stampEl(lat,ru,col){ return '<span class="gm-seal gm-stamp" style="--gc:'+col+'"><b>'+lat+'</b><i>'+ru+'</i></span>'; }
  function godEl(g){ var d=GODS[g]; if(!d) return ''; return '<span class="gm-seal gm-god" style="--gc:'+d.c+'"><span class="gm-sig">'+d.svg+'</span><span class="gm-lab">'+d.n+'<small>'+d.e+'</small></span></span>'; }
  function mageEl(k){ if(k==='reg') return '<span class="gm-seal gm-mage" style="--gc:#3f6abf"><span class="gm-sig">'+MAGE+'</span><span class="gm-lab">Магистр<small>Коллегии · дозволено</small></span></span>'; return stampEl('Maleficar','незакон. чародей','#8a4ab0'); }
  function scrawlEl(t){ return '<span class="gm-scrawl">'+t+'</span>'; }

  // активные отметки (HTML-кусочки) для раскидывания по бланку
  function marks(s){
    var a=[];
    if(s.gmDead){
      a.push({dead:true, html:stampEl('Mortuus','Мёртв','#8b1a1a')});
      a.push({deadScrawl:1, html:scrawlEl('Морр принял')});
      a.push({deadScrawl:2, html:scrawlEl('дело закрыто')});
    }
    if(s.wanted) a.push({big:true, html:stampEl('Quæritur','Разыскивается','#bf4231')});
    if(mut(s)) a.push({html:stampEl('Mutatus','Мутант','#bf4231')});
    if(s.magister==='reg'||s.magister==='unreg') a.push({html:mageEl(s.magister)});
    if(s.darkGod&&s.darkGod!=='none') a.push({html:godEl(s.darkGod)});
    // «слышит голоса» — как записки сумасшедшего, в разных местах
    if(s.hearsVoices){
      ['слышит голоса','они шепчут…','тише… тише','не один'].forEach(function(t){ a.push({scrawl:true, html:scrawlEl(t)}); });
    }
    return a;
  }

  // слоты-«поля» по бланку (top + край + наклон)
  var SLOTS=[
    {t:'70px', r:'-2px', rot:-13},
    {t:'150px', r:'-8px', rot:8},
    {t:'214px', l:'-4px', rot:10},
    {t:'120px', l:'33%', rot:-5},
    {t:'300px', r:'30px', rot:-7},
    {t:'345px', l:'-2px', rot:-11},
    {t:'255px', l:'31%', rot:6},
    {t:'185px', r:'28%', rot:5},
    {t:'410px', r:'-2px', rot:12},
    {t:'400px', l:'33%', rot:-7}
  ];

  function renderScatter(){
    try{
      var area=document.getElementById('sheet-area'); if(!area) return;
      var page=area.querySelector('.sv4-page'); var hero=area.querySelector('.sv4-hero');
      if(!page||!hero) return; // только основной бланк (персона)
      var box=page.querySelector('#gm-scatter');
      if(!box){ box=document.createElement('div'); box.id='gm-scatter'; box.className='gm-scatter'; page.appendChild(box); }
      var s=sht(); var ms=s?marks(s):[];
      var html='';
      ms.forEach(function(m,i){
        if(m.dead){
          html+='<div class="gm-pin dead" style="top:96px;left:50%;transform:translateX(-50%) rotate(-11deg)">'+m.html+'</div>';
          return;
        }
        if(m.deadScrawl===1){
          html+='<div class="gm-pin scrawl dead-scrawl" style="top:200px;right:6%;transform:rotate(-7deg)">'+m.html+'</div>';
          return;
        }
        if(m.deadScrawl===2){
          html+='<div class="gm-pin scrawl dead-scrawl" style="top:236px;left:5%;transform:rotate(-5deg)">'+m.html+'</div>';
          return;
        }
        var sl=SLOTS[i%SLOTS.length];
        var pos='top:'+sl.t+';'+(sl.l!=null?'left:'+sl.l+';':'')+(sl.r!=null?'right:'+sl.r+';':'');
        var cls='gm-pin'+(m.big?' big':'')+(m.scrawl?' scrawl':'');
        html+='<div class="'+cls+'" style="'+pos+'transform:rotate('+sl.rot+'deg)">'+m.html+'</div>';
      });
      if(box._gm!==html){ box._gm=html; box.innerHTML=html; }
    }catch(e){}
  }

  // модалка управления — «отдельное меню»
  var modal=null;
  function close(){ if(modal) modal.classList.remove('open'); }
  function buildModal(){
    if(modal) return;
    modal=document.createElement('div'); modal.className='gm-modal-back'; modal.id='gm-modal-back';
    modal.innerHTML='<div class="gm-modal" role="dialog" aria-modal="true">'+
      '<div class="gm-modal-h">✠ Печати дела и тёмные отметки</div>'+
      '<div class="gm-modal-note">Отметки появятся записками прямо на бланке.</div>'+
      '<div class="gm-modal-body">'+
        '<label class="gm-tog"><input type="checkbox" data-k="wanted"> Разыскивается</label>'+
        '<label class="gm-tog gm-tog-dead"><input type="checkbox" data-k="gmDead"> Мёртв (дело закрыто)</label>'+
        '<label class="gm-tog"><input type="checkbox" data-k="hearsVoices"> Слышит голоса</label>'+
        '<label class="gm-sel">Чародей<select data-k="magister"><option value="none">нет</option><option value="reg">зарегистрирован</option><option value="unreg">не зарегистрирован</option></select></label>'+
        '<label class="gm-sel">Тёмный покровитель<select data-k="darkGod"><option value="none">нет</option><option value="khorne">Кхорн</option><option value="nurgle">Нургл</option><option value="tzeentch">Тзинч</option><option value="slaanesh">Слаанеш</option><option value="undivided">Хаос Неделимый</option></select></label>'+
      '</div>'+
      '<div class="gm-modal-foot"><button type="button" class="gm-modal-close">Готово</button></div>'+
    '</div>';
    document.body.appendChild(modal);
    Array.prototype.forEach.call(modal.querySelectorAll('[data-k]'),function(el){
      var k=el.getAttribute('data-k');
      el.addEventListener('change',function(){
        var ss=sht(); if(!ss) return;
        if(el.type==='checkbox') ss[k]=el.checked; else ss[k]=el.value;
        try{ if(typeof autosave==='function') autosave(); }catch(e){}
        renderScatter();
      });
    });
    modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
    var cb=modal.querySelector('.gm-modal-close'); if(cb) cb.addEventListener('click',close);
  }
  function syncModal(){
    if(!modal) return; var s=sht(); if(!s) return;
    Array.prototype.forEach.call(modal.querySelectorAll('[data-k]'),function(el){
      var k=el.getAttribute('data-k');
      if(el.type==='checkbox') el.checked=!!s[k]; else el.value=s[k]||'none';
    });
  }
  function open(){ buildModal(); syncModal(); modal.classList.add('open'); }
  window.gmOpen=open;

  // вход в боковом меню бланка (отдельное меню)
  function injectNavItem(){
    try{
      var nav=document.getElementById('sv4-nav'); if(!nav) return;
      if(nav.querySelector('.gm-nav-item')) return;
      var btn=document.createElement('button');
      btn.className='sv4-nav-item gm-nav-item';
      btn.innerHTML='<span class="sv4-nav-emoji">✠</span><span>Печати и отметки</span>';
      btn.addEventListener('click',function(){
        try{ var n=document.getElementById('sv4-nav'); if(n) n.classList.remove('open'); var bd=document.querySelector('.sv4-nav-backdrop'); if(bd) bd.classList.remove('open'); }catch(e){}
        open();
      });
      var div=nav.querySelector('.sv4-nav-divider');
      if(div&&div.parentNode===nav) nav.insertBefore(btn,div); else nav.appendChild(btn);
    }catch(e){}
  }

  function run(){ injectNavItem(); renderScatter(); }
  try{
    var area=document.getElementById('sheet-area')||document.body;
    var _runT;
    new MutationObserver(function(){ clearTimeout(_runT); _runT=setTimeout(run,120); }).observe(area,{childList:true,subtree:true});
    run();
  }catch(e){}
})();
