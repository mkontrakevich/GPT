(() => {
  const state = { stage: 'boot', errors: [], floor: 1 };
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const updateDebug = () => {
    const el = $('#debugLog'); if (!el) return;
    el.textContent = `stage: ${state.stage}\nerrors: ${state.errors.length}\napi: none\nstate: ready\nviewport: ${innerWidth}x${innerHeight}\npath: ${location.pathname}` + (state.errors.length ? `\nlast_error: ${state.errors.at(-1)}` : '');
  };
  const log = msg => { state.stage = msg; updateDebug(); };
  addEventListener('error', e => { state.errors.push(`${e.message} @ ${e.filename}:${e.lineno}`); updateDebug(); });
  addEventListener('unhandledrejection', e => { state.errors.push(`promise: ${String(e.reason)}`); updateDebug(); });

  const header = $('#header');
  const progress = $('#scrollProgress');
  const heroPicture = $('#heroPicture');
  const editorialNav = $('#editorialNav');
  const sections = ['today','culture','guide','gifts','family','office','locals'].map(id => document.getElementById(id)).filter(Boolean);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    progress.style.width = `${p*100}%`;
    header.classList.toggle('scrolled', scrollY > 38);
    if (heroPicture && innerWidth > 740) heroPicture.style.transform = `translate3d(0,${Math.min(scrollY*.07,64)}px,0) scale(${1.02 + Math.min(scrollY/7000,.025)})`;

    let active = null;
    const y = scrollY + 170;
    sections.forEach(sec => { if (y >= sec.offsetTop) active = sec.id; });
    $$('#editorialNav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${active}`));
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  $('#heroZoom')?.addEventListener('click', () => {
    $('#arrivalReveal')?.classList.add('open');
    setTimeout(() => $('#arrivalReveal')?.scrollIntoView({behavior:'smooth',block:'start'}), 80);
  });

  const routes = {
    30: [
      ['Кофе', '8–10 минут'],
      ['Небольшой подарок', '10–12 минут'],
      ['Возврат на вокзал', 'с запасом 8–10 минут']
    ],
    60: [
      ['Быстрый обед', '20–25 минут'],
      ['Магазин по задаче', '15 минут'],
      ['Подарок или кофе в дорогу', '10 минут']
    ],
    120: [
      ['Одна городская точка', '35–40 минут'],
      ['Возвращение в ЦУМ', '20 минут'],
      ['Еда + сувенир', '30–35 минут']
    ]
  };
  const renderRoute = mins => {
    const out = $('#routeOutput'); if (!out) return;
    out.innerHTML = `<div class="route-steps">${routes[mins].map((x,i)=>`<div class="route-step"><b>${String(i+1).padStart(2,'0')} · ${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`;
    $$('.time-routes button').forEach(b => b.classList.toggle('active', b.dataset.time === String(mins)));
  };
  $$('.time-routes button').forEach(b => b.addEventListener('click', () => renderRoute(+b.dataset.time)));
  renderRoute(30);

  const floorData = {
    1: {sub:'первый контакт · сервисы · категории', rows:[['Сервис','Альфа-Банк, быстрые услуги и понятная ориентация.'],['Beauty','Подружка и категории подарков / повседневного ухода.'],['Техника','DNS и Future Phone как быстрые целевые покупки.']]},
    2: {sub:'мода · аксессуары · повседневный shopping', rows:[['Fashion','Familia и другие магазины одежды и аксессуаров.'],['Свадебная мода','Платья, костюмы, аксессуары и ателье.'],['Обувь','Категория с большим выбором внутри ЦУМа.']]},
    3: {sub:'семья · наука · досуг', rows:[['Кварки','Музей занимательных наук и семейный сценарий.'],['Товары для детей','Магазины и полезные категории для семей.'],['Пауза','Маршрут строится так, чтобы чередовать впечатления и отдых.']]},
    4: {sub:'развлечения · активность', rows:[['Форсаж','Дрифт-картинг для детей и взрослых.'],['VR Boom','Короткая цифровая активность.'],['События','Сценарии, которые можно встроить в афишу и семейный день.']]}
  };
  const renderFloor = n => {
    const data = floorData[n]; state.floor=n;
    $('#floorTitle').textContent = `${n} этаж`;
    $('#floorSub').textContent = data.sub;
    $('#floorContent').innerHTML = data.rows.map(r=>`<div class="floor-row"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('');
    $$('#floorTabs button').forEach(b => b.classList.toggle('active', +b.dataset.floor === n));
  };
  $$('#floorTabs button').forEach(b=>b.addEventListener('click',()=>renderFloor(+b.dataset.floor)));
  renderFloor(1);

  const modal = $('#searchModal');
  const input = $('#searchInput');
  const suggestions = ['Культурные события','Подарки','Кварки','Форсаж','VR Boom','DNS','Future Phone','Familia','Подружка','Карта ЦУМа'];
  $('#searchTags').innerHTML = suggestions.map(x=>`<button type="button">${x}</button>`).join('');
  $('#searchOpen')?.addEventListener('click',()=>modal.showModal());
  $('#searchTags')?.addEventListener('click',e=>{if(e.target.matches('button')){input.value=e.target.textContent;input.focus();}});

  const nav = $('#legacyNav');
  $('#menuToggle')?.addEventListener('click',()=>{
    const open = nav.style.display === 'flex';
    if (open) { nav.removeAttribute('style'); return; }
    Object.assign(nav.style,{display:'flex',position:'fixed',top:'68px',left:'18px',right:'18px',zIndex:'130',background:'#fff',color:'#171412',borderRadius:'18px',padding:'18px',boxShadow:'0 22px 70px rgba(0,0,0,.16)',flexDirection:'column',gap:'16px'});
  });

  const dbg = $('#debugPanel');
  $('#debugToggle')?.addEventListener('click',()=>{dbg.classList.toggle('open');dbg.setAttribute('aria-hidden',String(!dbg.classList.contains('open')));updateDebug();});
  $('#debugClose')?.addEventListener('click',()=>dbg.classList.remove('open'));
  addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d') $('#debugToggle')?.click();});

  log('ready');
})();