// قندیار - نسخه MVP وب (LocalStorage)
const STORAGE_KEY = 'qandiyar_v1';

const SEED = {
  userProfile: { unit:'mg/dL', diabetesType:'type1', targetLow:80, targetHigh:180 },
  glucoseReadings: [
    { id:'g_001', datetime:'2026-02-02T07:30:00', context:'fbs', value:145 },
    { id:'g_002', datetime:'2026-02-02T10:00:00', context:'post_breakfast_2h', value:210 },
    { id:'g_003', datetime:'2026-02-02T12:30:00', context:'pre_lunch', value:160 },
    { id:'g_004', datetime:'2026-02-02T15:30:00', context:'post_lunch_2h', value:190 },
    { id:'g_005', datetime:'2026-02-02T19:00:00', context:'pre_dinner', value:130 },
    { id:'g_006', datetime:'2026-02-02T21:30:00', context:'post_dinner_2h', value:175 },
    { id:'g_007', datetime:'2026-02-02T23:30:00', context:'bedtime', value:110 }
  ],
  meals: [
    { id:'m_breakfast', datetime:'2026-02-02T08:00:00', title:'صبحانه', itemsText:'نان + پنیر + چای', carbsGrams:45, linkedGlucoseId:'g_002' },
    { id:'m_lunch', datetime:'2026-02-02T13:00:00', title:'ناهار', itemsText:'برنج + مرغ', carbsGrams:70, linkedGlucoseId:'g_004' },
    { id:'m_dinner', datetime:'2026-02-02T19:30:00', title:'شام', itemsText:'سیب‌زمینی/نان + تخم‌مرغ', carbsGrams:50, linkedGlucoseId:'g_006' }
  ],
  insulinDoses: [
    { id:'i_001', datetime:'2026-02-02T22:00:00', insulinType:'basal', name:'Lantus', units:16 },
    { id:'i_002', datetime:'2026-02-02T07:55:00', insulinType:'bolus', name:'Novorapid', units:5, relatedMealId:'m_breakfast' },
    { id:'i_003', datetime:'2026-02-02T12:55:00', insulinType:'bolus', name:'Novorapid', units:6, relatedMealId:'m_lunch' },
    { id:'i_004', datetime:'2026-02-02T19:25:00', insulinType:'bolus', name:'Novorapid', units:4, relatedMealId:'m_dinner' },
    { id:'i_005', datetime:'2026-02-02T11:30:00', insulinType:'correction', name:'Novorapid', units:2, note:'Correction نمونه' }
  ],
  reminders: { basal:{ enabled:true, time:'22:00' } }
};

function uid(prefix){ return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }
function loadState(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function resetState(){ localStorage.removeItem(STORAGE_KEY); }
function byDatetime(a,b){ return new Date(a.datetime)-new Date(b.datetime); }

function fmtTime(iso){
  const d=new Date(iso);
  const hh=String(d.getHours()).padStart(2,'0');
  const mm=String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}
function contextLabel(ctx){
  const map={
    fbs:'ناشتا',
    post_breakfast_2h:'۲ ساعت بعد صبحانه',
    pre_lunch:'قبل ناهار',
    post_lunch_2h:'۲ ساعت بعد ناهار',
    pre_dinner:'قبل شام',
    post_dinner_2h:'۲ ساعت بعد شام',
    bedtime:'قبل خواب',
    custom:'سایر'
  };
  return map[ctx]||'سایر';
}
function insulinTypeLabel(t){
  const map={ basal:'بازال', bolus:'بولوس', correction:'اصلاحی' };
  return map[t]||'—';
}

let chart;

function openModal(title, bodyHtml){
  const modal=document.getElementById('modal');
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=bodyHtml;
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){ document.getElementById('modal').setAttribute('aria-hidden','true'); }

function safetyCheck(v){
  if(v<70){
    openModal('هشدار: قند پایین', `<p>قند پایین ثبت شد (<strong>${v}</strong> mg/dL).</p>
    <p class="muted">اگر علائم داری یا تکرار می‌شود، طبق برنامه درمانی خودت اقدام کن و در صورت نیاز با پزشک/اورژانس تماس بگیر.</p>`);
  }
  if(v>=300){
    openModal('هشدار: قند خیلی بالا', `<p>قند خیلی بالا ثبت شد (<strong>${v}</strong> mg/dL).</p>
    <p class="muted">آب کافی، بررسی علائم و در صورت نیاز اقدام درمانی طبق برنامه پزشک.</p>`);
  }
}

function getOrInit(){
  const s=loadState();
  return s || { userProfile:{...SEED.userProfile}, glucoseReadings:[], meals:[], insulinDoses:[], reminders:{basal:{enabled:false,time:'22:00'}} };
}

function renderChart(state){
  const gs=[...state.glucoseReadings].sort(byDatetime);
  const labels=gs.map(g=>fmtTime(g.datetime));
  const values=gs.map(g=>g.value);
  const low=state.userProfile.targetLow;
  const high=state.userProfile.targetHigh;

  const ctx=document.getElementById('glucoseChart');
  if(chart) chart.destroy();

  chart=new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'قند (mg/dL)', data:values, tension:0.25, pointRadius:4 },
        { label:'حد پایین هدف', data:labels.map(()=>low), borderDash:[6,6], pointRadius:0 },
        { label:'حد بالا هدف', data:labels.map(()=>high), borderDash:[6,6], pointRadius:0 }
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ labels:{ color:'#eaf0ff', font:{ family:'Vazirmatn' } } } },
      scales:{
        x:{ ticks:{ color:'#aab7d6', font:{ family:'Vazirmatn' } }, grid:{ color:'rgba(255,255,255,.06)' } },
        y:{ ticks:{ color:'#aab7d6', font:{ family:'Vazirmatn' } }, grid:{ color:'rgba(255,255,255,.06)' } }
      }
    }
  });
}

function renderTimeline(state){
  const wrap=document.getElementById('timeline');
  wrap.innerHTML='';
  const items=[];

  for(const g of state.glucoseReadings){
    items.push({ datetime:g.datetime, icon:'🩸', title:`قند: ${g.value} mg/dL`, sub:`${contextLabel(g.context)} — ساعت ${fmtTime(g.datetime)}` });
  }
  for(const m of state.meals){
    items.push({ datetime:m.datetime, icon:'🍽️', title:`${m.title}: ${m.itemsText}`, sub:`کربوهیدرات: ${m.carbsGrams}g — ساعت ${fmtTime(m.datetime)}` });
  }
  for(const i of state.insulinDoses){
    items.push({ datetime:i.datetime, icon:'💉', title:`${insulinTypeLabel(i.insulinType)}: ${i.name} — ${i.units}u`, sub:`ساعت ${fmtTime(i.datetime)}` });
  }

  items.sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));

  if(items.length===0){
    wrap.innerHTML='<p class="muted">هنوز داده‌ای ثبت نشده. دیتای نمونه را بارگذاری کن.</p>';
    return;
  }

  for(const it of items){
    const el=document.createElement('div');
    el.className='tl-item';
    el.innerHTML=`<div class="tl-ico">${it.icon}</div>
      <div class="tl-main"><div class="tl-title">${it.title}</div><div class="tl-sub">${it.sub}</div></div>`;
    wrap.appendChild(el);
  }
}

function renderDailyTable(state){
  const box=document.getElementById('dailyTable');
  box.innerHTML='';
  const rows=[];
  for(const g of state.glucoseReadings) rows.push({ t:g.datetime, c1:'قند', c2:`${g.value} mg/dL`, c3:contextLabel(g.context) });
  for(const i of state.insulinDoses) rows.push({ t:i.datetime, c1:'انسولین', c2:`${i.name} ${i.units}u`, c3:insulinTypeLabel(i.insulinType) });
  for(const m of state.meals) rows.push({ t:m.datetime, c1:'وعده', c2:m.title, c3:`${m.carbsGrams}g کربوهیدرات` });
  rows.sort((a,b)=>new Date(a.t)-new Date(b.t));

  if(rows.length===0){ box.innerHTML='<p class="muted">داده‌ای برای نمایش وجود ندارد.</p>'; return; }

  for(const r of rows){
    const el=document.createElement('div');
    el.className='row';
    el.innerHTML=`<div class="cell"><strong>${fmtTime(r.t)}</strong></div>
      <div class="cell">${r.c1}</div>
      <div class="cell">${r.c2} — ${r.c3}</div>`;
    box.appendChild(el);
  }
}

function renderWeeklyTable(state){
  const box=document.getElementById('weeklyTable');
  box.innerHTML='';
  const gs=[...state.glucoseReadings];
  if(gs.length===0){ box.innerHTML='<p class="muted">برای گزارش هفتگی حداقل چند ثبت قند لازم است.</p>'; return; }

  const groups={};
  for(const g of gs){
    const day=g.datetime.slice(0,10);
    (groups[day] ||= []).push(g.value);
  }

  const days=Object.keys(groups).sort().slice(-7);
  for(const d of days){
    const arr=groups[d];
    const avg=Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    const el=document.createElement('div');
    el.className='row';
    el.innerHTML=`<div class="cell"><strong>${d}</strong></div>
      <div class="cell">میانگین قند</div>
      <div class="cell">${avg} mg/dL (تعداد: ${arr.length})</div>`;
    box.appendChild(el);
  }
}

function populateSelects(state){
  const mealSelect=document.getElementById('insulinMealSelect');
  const glucoseSelect=document.getElementById('mealGlucoseSelect');

  mealSelect.innerHTML='<option value="">—</option>';
  [...state.meals].sort(byDatetime).forEach(m=>{
    const opt=document.createElement('option');
    opt.value=m.id;
    opt.textContent=`${m.title} (${fmtTime(m.datetime)})`;
    mealSelect.appendChild(opt);
  });

  glucoseSelect.innerHTML='<option value="">—</option>';
  [...state.glucoseReadings].sort(byDatetime).forEach(g=>{
    const opt=document.createElement('option');
    opt.value=g.id;
    opt.textContent=`${contextLabel(g.context)}: ${g.value} (${fmtTime(g.datetime)})`;
    glucoseSelect.appendChild(opt);
  });
}

function setNowInputs(){
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const val=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const gdt=document.querySelector('#glucoseForm input[name="datetime"]');
  const idt=document.querySelector('#insulinForm input[name="datetime"]');
  const mdt=document.querySelector('#mealForm input[name="datetime"]');
  if(gdt && !gdt.value) gdt.value=val;
  if(idt && !idt.value) idt.value=val;
  if(mdt && !mdt.value) mdt.value=val;
}

function render(){
  const state=getOrInit();
  document.getElementById('targetRange').textContent=`${state.userProfile.targetLow} تا ${state.userProfile.targetHigh}`;

  const gs=[...state.glucoseReadings].sort(byDatetime);
  const last=gs[gs.length-1];
  if(last){
    document.getElementById('lastGlucose').textContent=`${last.value} mg/dL`;
    document.getElementById('lastGlucoseHint').textContent=`${contextLabel(last.context)} — ساعت ${fmtTime(last.datetime)}`;
  }else{
    document.getElementById('lastGlucose').textContent='—';
    document.getElementById('lastGlucoseHint').textContent='هنوز قندی ثبت نشده';
  }

  const low=state.userProfile.targetLow, high=state.userProfile.targetHigh;
  const inRange=gs.filter(x=>x.value>=low && x.value<=high).length;
  const total=gs.length;
  if(total===0){
    document.getElementById('todayStatus').textContent='—';
    document.getElementById('todayStatusHint').textContent='برای شروع، دیتای نمونه را بارگذاری کن.';
  }else{
    const pct=Math.round((inRange/total)*100);
    document.getElementById('todayStatus').textContent=`${pct}% داخل هدف`;
    document.getElementById('todayStatusHint').textContent=`${inRange} از ${total} ثبت`;
  }

  renderChart(state);
  renderTimeline(state);
  renderDailyTable(state);
  renderWeeklyTable(state);
  populateSelects(state);

  document.getElementById('basalReminderEnabled').checked=!!state.reminders?.basal?.enabled;
  document.getElementById('basalReminderTime').value=state.reminders?.basal?.time || '22:00';

  const settingsForm=document.getElementById('settingsForm');
  settingsForm.targetLow.value=state.userProfile.targetLow;
  settingsForm.targetHigh.value=state.userProfile.targetHigh;
}

function initEvents(){
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });

  document.getElementById('btnSeed').addEventListener('click', ()=>{
    saveState(JSON.parse(JSON.stringify(SEED)));
    render();
    openModal('دیتای نمونه بارگذاری شد', '<p>الان داشبورد و نمودارها آماده‌اند ✅</p>');
  });

  document.getElementById('btnReset').addEventListener('click', ()=>{
    resetState();
    render();
    openModal('داده‌ها پاک شد', '<p>همه داده‌های ذخیره شده در مرورگر پاک شد.</p>');
  });

  document.getElementById('glucoseForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const state=getOrInit();
    const fd=new FormData(e.target);
    const value=Number(fd.get('value'));
    const datetime=String(fd.get('datetime'));
    const context=String(fd.get('context'));
    const note=String(fd.get('note')||'');
    state.glucoseReadings.push({ id:uid('g'), value, datetime, context, note });
    saveState(state);
    e.target.reset();
    setNowInputs();
    render();
    safetyCheck(value);
  });

  document.getElementById('insulinForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const state=getOrInit();
    const fd=new FormData(e.target);
    state.insulinDoses.push({
      id:uid('i'),
      insulinType:String(fd.get('insulinType')),
      name:String(fd.get('name')),
      units:Number(fd.get('units')),
      datetime:String(fd.get('datetime')),
      relatedMealId:(String(fd.get('relatedMealId')||'')||null),
      note:String(fd.get('note')||'')
    });
    saveState(state);
    e.target.reset();
    setNowInputs();
    render();
  });

  document.getElementById('mealForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const state=getOrInit();
    const fd=new FormData(e.target);
    state.meals.push({
      id:uid('m'),
      title:String(fd.get('title')),
      itemsText:String(fd.get('itemsText')),
      carbsGrams:Number(fd.get('carbsGrams')),
      datetime:String(fd.get('datetime')),
      linkedGlucoseId:(String(fd.get('linkedGlucoseId')||'')||null)
    });
    saveState(state);
    e.target.reset();
    setNowInputs();
    render();
  });

  document.getElementById('saveReminder').addEventListener('click', ()=>{
    const state=getOrInit();
    const enabled=document.getElementById('basalReminderEnabled').checked;
    const time=document.getElementById('basalReminderTime').value || '22:00';
    state.reminders ||= {};
    state.reminders.basal = { enabled, time };
    saveState(state);
    render();
    openModal('یادآور ذخیره شد', `<p>وضعیت: <strong>${enabled?'روشن':'خاموش'}</strong> — ساعت <strong>${time}</strong></p>`);
  });

  document.getElementById('settingsForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const state=getOrInit();
    const fd=new FormData(e.target);
    state.userProfile.targetLow=Number(fd.get('targetLow'));
    state.userProfile.targetHigh=Number(fd.get('targetHigh'));
    saveState(state);
    render();
    openModal('تنظیمات ذخیره شد', `<p>هدف جدید: <strong>${state.userProfile.targetLow} تا ${state.userProfile.targetHigh}</strong></p>`);
  });
}

function highlightNav(){
  const links=[...document.querySelectorAll('.nav__item')];
  const setActive=(hash)=> links.forEach(a=>a.classList.toggle('is-active', a.getAttribute('href')===hash));
  window.addEventListener('hashchange', ()=> setActive(location.hash || '#dashboard'));
  setActive(location.hash || '#dashboard');
}

// init
initEvents();
highlightNav();
setNowInputs();
render();
