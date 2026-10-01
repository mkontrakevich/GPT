(() => {
  const state = { stage: 'boot', errors: [], floor: 1 };
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;

  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  const updateDebug = () => {
    const el = $('#debugLog'); if (!el) return;
    el.textContent = `stage: ${state.stage}\nerrors: ${state.errors.length}\nimages: OpenRouter CI pipeline\nstate: ready\nviewport: ${innerWidth}x${innerHeight}\npath: ${location.pathname}` + (state.errors.length ? `\nlast_error: ${state.errors.at(-1)}` : '');
  };
  const log = msg => { state.stage = msg; updateDebug(); };
  addEventListener('error', e => { state.errors.push(`${e.message} @ ${e.filename}:${e.lineno}`); updateDebug(); });
  addEventListener('unhandledrejection', e => { state.errors.push(`promise: ${String(e.reason)}`); updateDebug(); });

  const header = $('#header');
  const progress = $('#scrollProgress');
  const heroPicture = $('#heroPicture');
  const sections = ['today','culture','guide','gifts','family','office','locals'].map(id => document.getElementById(id)).filter(Boolean);
  const parallaxMedia = $$('.story-image img,.magazine-lead>img,.cinematic img');

  let ticking = false;
  const renderScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    if (progress) progress.style.width = `${p*100}%`;
    header?.classList.toggle('scrolled', scrollY > 24);

    if (!reduceMotion && heroPicture && innerWidth > 740) {
      heroPicture.style.transform = `translate3d(0,${Math.min(scrollY*.065,58)}px,0) scale(${1.02 + Math.min(scrollY/8000,.025)})`;
    }

    if (!reduceMotion) {
      parallaxMedia.forEach(img => {
        const frame = img.parentElement?.closest('.story-image,.magazine-lead,.cinematic') || img.parentElement;
        const r = frame?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > innerHeight) return;
        const center = r.top + r.height/2;
        const delta = (center - innerHeight/2) / innerHeight;
        img.style.setProperty('--media-y', `${Math.max(-18,Math.min(18,-delta*24)).toFixed(1)}px`);
      });
    }

    let active = null;
    const y = scrollY + 170;
    sections.forEach(sec => { if (y >= sec.offsetTop) active = sec.id; });
    $$('#editorialNav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${active}`));
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(renderScroll); }
  };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll, {passive:true});
  renderScroll();

  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  }), { threshold: .10, rootMargin:'0px 0px -4% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  $('#heroZoom')?.addEventListener('click', () => {
    $('#today')?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
  });

  // Subtle perspective motion: decorative only, never changes layout geometry.
  const motionCards = $$('.magazine-lead,.magazine-mini,.magazine-card,.feature-story,.article-card,.food-card');
  motionCards.forEach(el => el.classList.add('motion-card'));
  if (!reduceMotion && finePointer) {
    motionCards.forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX-r.left)/r.width - .5;
        const y = (e.clientY-r.top)/r.height - .5;
        const limit = el.classList.contains('feature-story') ? .65 : 1.25;
        el.style.setProperty('--ry', `${(x*limit).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-y*limit).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx','0deg');
        el.style.setProperty('--ry','0deg');
      });
    });

    // Small magnetic movement on important CTAs.
    $$('.btn,.store-chip,.magazine-read,.story-link,.map-button').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r=el.getBoundingClientRect();
        const x=(e.clientX-r.left-r.width/2)*.08;
        const y=(e.clientY-r.top-r.height/2)*.10;
        el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      });
      el.addEventListener('pointerleave',()=>{el.style.transform='';});
    });

    const glow=document.createElement('div');
    glow.className='cursor-glow';
    document.body.appendChild(glow);
    addEventListener('pointermove',e=>{
      glow.style.left=e.clientX+'px';
      glow.style.top=e.clientY+'px';
      glow.classList.add('active');
    },{passive:true});
    addEventListener('pointerout',()=>glow.classList.remove('active'),{passive:true});
  }

  const routes = {
    30: [['Кофе','8–10 минут'],['Небольшой подарок','10–12 минут'],['Возврат на вокзал','с запасом 8–10 минут']],
    60: [['Быстрый обед','20–25 минут'],['Магазин по задаче','15 минут'],['Подарок или кофе в дорогу','10 минут']],
    120:[['Одна городская точка','35–40 минут'],['Возвращение в ЦУМ','20 минут'],['Еда + сувенир','30–35 минут']]
  };
  const renderRoute = mins => {
    const out = $('#routeOutput'); if (!out) return;
    out.innerHTML = `<div class="route-steps">${routes[mins].map((x,i)=>`<div class="route-step"><b>${String(i+1).padStart(2,'0')} · ${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`;
    $$('.time-routes button').forEach(b => b.classList.toggle('active', b.dataset.time === String(mins)));
  };
  $$('.time-routes button').forEach(b => b.addEventListener('click', () => renderRoute(+b.dataset.time)));
  if ($('#routeOutput')) renderRoute(30);

  const floorData = {
    1:{sub:'первый контакт · сервисы · категории',rows:[['Сервис','Альфа-Банк, быстрые услуги и понятная ориентация.'],['Beauty','Подружка и категории подарков / повседневного ухода.'],['Техника','DNS и Future Phone как быстрые целевые покупки.']]},
    2:{sub:'мода · аксессуары · повседневный shopping',rows:[['Fashion','Familia и другие магазины одежды и аксессуаров.'],['Свадебная мода','Платья, костюмы, аксессуары и ателье.'],['Обувь','Категория с большим выбором внутри ЦУМа.']]},
    3:{sub:'семья · наука · досуг',rows:[['Кварки','Музей занимательных наук и семейный сценарий.'],['Товары для детей','Магазины и полезные категории для семей.'],['Пауза','Маршрут строится так, чтобы чередовать впечатления и отдых.']]},
    4:{sub:'развлечения · активность',rows:[['Форсаж','Дрифт-картинг для детей и взрослых.'],['VR Boom','Короткая цифровая активность.'],['События','Сценарии, которые можно встроить в афишу и семейный день.']]}
  };
  const renderFloor = n => {
    const data=floorData[n]; if(!data||!$('#floorTitle')) return;
    state.floor=n;
    $('#floorTitle').textContent=`${n} этаж`;
    $('#floorSub').textContent=data.sub;
    $('#floorContent').innerHTML=data.rows.map(r=>`<div class="floor-row"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('');
    $$('#floorTabs button').forEach(b=>b.classList.toggle('active',+b.dataset.floor===n));
  };
  $$('#floorTabs button').forEach(b=>b.addEventListener('click',()=>renderFloor(+b.dataset.floor)));
  renderFloor(1);

  const modal=$('#searchModal');
  const input=$('#searchInput');
  const searchTags=$('#searchTags');
  const suggestions=['Культурные события','Подарки','Кварки','Форсаж','VR Boom','DNS','Future Phone','Familia','Подружка','Карта ЦУМа'];
  if(searchTags) searchTags.innerHTML=suggestions.map(x=>`<button type="button">${x}</button>`).join('');
  $('#searchOpen')?.addEventListener('click',()=>modal?.showModal());
  searchTags?.addEventListener('click',e=>{if(e.target.matches('button')&&input){input.value=e.target.textContent;input.focus();}});

  const nav=$('#legacyNav');
  $('#menuToggle')?.addEventListener('click',()=>{
    const open=nav?.style.display==='flex';
    if(!nav) return;
    if(open){nav.removeAttribute('style');return;}
    const hh=getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim() || '68px';
    Object.assign(nav.style,{display:'flex',position:'fixed',top:hh,left:'18px',right:'18px',zIndex:'130',background:'#171412',color:'#fff',borderRadius:'18px',padding:'18px',boxShadow:'0 22px 70px rgba(0,0,0,.24)',flexDirection:'column',gap:'16px'});
  });

  // Prefer locally generated OpenRouter imagery when it exists; keep current production
  // source as a temporary fallback until the repository secret generates the first set.
  $$('img[data-ai-src]').forEach(img=>{
    const ai=img.dataset.aiSrc;
    if(!ai) return;
    const probe=new Image();
    probe.onload=()=>{
      img.removeAttribute('srcset');
      img.src=ai;
      img.classList.add('ai-image-ready');
    };
    probe.src=ai;
  });

  // MEDIA RESILIENCE: never expose broken-image text inside the composition.
  const mediaParents='.hero-picture,.story-image,.magazine-lead,.cinematic';
  $$('img').forEach(img=>{
    const fail=()=>{
      const fallback=img.dataset.fallback;
      if(fallback&&!img.dataset.fallbackTried){
        img.dataset.fallbackTried='1';
        img.removeAttribute('srcset');
        img.src=fallback;
        return;
      }
      img.classList.add('media-failed');
      img.closest(mediaParents)?.classList.add('media-frame-failed');
      state.errors.push('image_failed: '+(img.currentSrc||img.src||'unknown'));
      updateDebug();
    };
    img.addEventListener('error',fail);
    if(img.complete&&img.naturalWidth===0) fail();
  });

  const dbg=$('#debugPanel');
  $('#debugToggle')?.addEventListener('click',()=>{dbg?.classList.toggle('open');dbg?.setAttribute('aria-hidden',String(!dbg.classList.contains('open')));updateDebug();});
  $('#debugClose')?.addEventListener('click',()=>dbg?.classList.remove('open'));
  addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d') $('#debugToggle')?.click();});

  log('ready');
})();