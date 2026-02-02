
/* قندیار v5 — Demo (no fetch) */
const LS="ghandyar.v5";
const SLOT_FA={FBS:"FBS (ناشتا)",AfterBreakfast2h:"۲ ساعت بعد صبحانه",BeforeLunch:"قبل ناهار",AfterLunch2h:"۲ ساعت بعد ناهار",BeforeDinner:"قبل شام",AfterDinner2h:"۲ ساعت بعد شام",BeforeBed:"قبل خواب"};
const SLOT_ORDER=["FBS","AfterBreakfast2h","BeforeLunch","AfterLunch2h","BeforeDinner","AfterDinner2h","BeforeBed"];
const EDU = {"basics": {"title": "مبانی دیابت نوع ۱ (خیلی ساده)", "sections": [["دیابت نوع ۱ یعنی چی؟", ["بدن انسولین کافی تولید نمی‌کند.", "پس باید انسولین تزریق شود (Basal + Bolus)."]]], "yt": "https://www.youtube.com/embed/9lA_qC0Hf0g", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}, "hypo": {"title": "هیپو (قند پایین)", "sections": [["قانون 15-15", ["۱۵ گرم قند سریع‌الاثر.", "۱۵ دقیقه بعد تست.", "اگر پایین بود تکرار."]]], "yt": "https://www.youtube.com/embed/3q3fWcY7K2g", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}, "hyper": {"title": "هایپر (قند بالا)", "sections": [["کارهای مفید", ["آب کافی.", "ثبت دقیق برای الگو.", "در علائم شدید مراجعه."]]], "yt": "https://www.youtube.com/embed/2YwKQ8xqQvA", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}, "carb": {"title": "کربوهیدرات", "sections": [["چه چیزهایی کربوهیدرات دارند؟", ["نان، برنج، ماکارونی، میوه، شیرینی."]]], "yt": "https://www.youtube.com/embed/1Gk2qV-7pXQ", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}, "exercise": {"title": "ورزش", "sections": [["نکته", ["ورزش معمولاً قند را پایین می‌آورد.", "قند سریع‌الاثر همراه داشته باش."]]], "yt": "https://www.youtube.com/embed/2nC0mQh3sZQ", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}, "school": {"title": "مدرسه/امتحان و استرس", "sections": [["استرس", ["ممکن است قند را بالا ببرد.", "کم‌خوابی روی صبح اثر دارد."]]], "yt": "https://www.youtube.com/embed/9lA_qC0Hf0g", "ap": "https://www.aparat.com/video/video/embed/videohash/1xYgk/vt/frame"}};

const $=id=>document.getElementById(id);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const uuid=()=> (crypto?.randomUUID?.()|| (Math.random().toString(16).slice(2)+Date.now().toString(16)));

function load(){try{return JSON.parse(localStorage.getItem(LS)||"");}catch(e){return null;}}
function save(st){localStorage.setItem(LS,JSON.stringify(st));}

function initState(){
  const st=load();
  if(st) return st;
  return {patients:[], active:null, ui:{lang:"fa", demo:false}, audit:[]};
}

let state=initState();

function loadSample(){
  const s=window.SAMPLE_DATA;
  const patients=[];
  for(const sp of (s.patients||[])){
    const p={patient_id:sp.profile.patient_id, name:sp.profile.name, targets:sp.profile.targets||{low:80,high:180}, unit:sp.profile.units||"mg/dL",
      glucose:[], meals:[], insulin:[], demoByDate:{}};
    for(const day of sp.days){
      const d=day.date;
      const g=day.glucose_readings||{};
      const map={FBS:g.FBS,AfterBreakfast2h:g.after_breakfast_2h,BeforeLunch:g.pre_lunch,AfterLunch2h:g.after_lunch_2h,BeforeDinner:g.pre_dinner,AfterDinner2h:g.after_dinner_2h,BeforeBed:g.bedtime};
      for(const k of Object.keys(map)){
        if(map[k]==null) continue;
        p.glucose.push({id:uuid(), date:d, slot:k, value:Number(map[k]), note:""});
      }
      if(day.demo_suggestions) p.demoByDate[d]=day.demo_suggestions;
    }
    patients.push(p);
  }
  state.patients=patients;
  state.active=patients[0]?.patient_id||null;
  save(state);
}

function activeP(){return state.patients.find(p=>p.patient_id===state.active)||state.patients[0];}

let chart=null;
function renderChart(){
  const p=activeP(); if(!p) return;
  const end=$("range-date")?.value||today();
  const vals=SLOT_ORDER.map(s=>{
    const e=p.glucose.find(x=>x.date===end && x.slot===s);
    return e?e.value:null;
  });
  const canvas=$("glucoseChart"); if(!canvas) return; const ctx=canvas.getContext("2d");
  if(chart) chart.destroy();
  chart=new Chart(ctx,{type:"line",data:{labels:SLOT_ORDER.map(s=>SLOT_FA[s]),datasets:[{label:"قند",data:vals,borderWidth:3,pointRadius:5,tension:0.35}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",rtl:true}}}});
}

function renderPatientSelect(){
  const sel=$("patient-select"); if(!sel) return;
  sel.innerHTML=state.patients.map(p=>`<option value="${p.patient_id}">${p.name} (${p.patient_id})</option>`).join("");
  sel.value=state.active;
  sel.onchange=()=>{state.active=sel.value; save(state); renderAll();};
  $("btn-add-patient").onclick=()=>{
    const name=prompt("نام پروفایل؟"); if(!name) return;
    const pid="P"+Math.floor(1000+Math.random()*9000);
    state.patients.push({patient_id:pid,name,targets:{low:80,high:180},unit:"mg/dL",glucose:[],meals:[],insulin:[],demoByDate:{}});
    state.active=pid; save(state); renderPatientSelect(); renderAll();
  };
}

function renderEduMenu(){
  const menu=$("edu-menu"); if(!menu) return;
  menu.innerHTML=Object.keys(EDU).map(k=>`<div class="edu-item" data-edu="${k}">📌 ${EDU[k].title}</div>`).join("");
  menu.querySelectorAll("[data-edu]").forEach(el=>{
    el.onclick=()=>{menu.querySelectorAll(".edu-item").forEach(x=>x.classList.remove("active")); el.classList.add("active"); renderEdu(el.dataset.edu);};
  });
  const first=menu.querySelector("[data-edu='basics']")||menu.querySelector("[data-edu]");
  if(first) first.click();
}
function renderEdu(k){
  const e=EDU[k]||EDU.basics;
  const _eduTitle=$("edu-title"); if(_eduTitle) _eduTitle.textContent = "🎓 "+e.title;
  const art=$("edu-article");
  if(art) art.innerHTML = e.sections.map(s=>`<h3>${s[0]}</h3>`+s[1].map(p=>`<p>${p}</p>`).join("")).join("");
  const yt=$("yt1"); if(yt) yt.src =e.yt||"";
  const ap=$("ap1"); if(ap) ap.src =e.ap||"";
}

function initTabs(){
  const tabsWrap = document.querySelector(".tabs");
  const panels = Array.from(document.querySelectorAll(".panel"));
  const setActive = (key)=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x.dataset.tab===key));
    panels.forEach(p=>p.classList.remove("show"));
    const target = document.getElementById("tab-"+key);
    (target || document.getElementById("tab-dashboard"))?.classList.add("show");
    // رندر سبک: همیشه نمودار را به‌روز کن
    setTimeout(()=>{ try{ renderAll(); }catch(e){ console.error(e);} }, 30);
  };
  // کلیک با event delegation (پایدارتر)
  if(tabsWrap){
    tabsWrap.addEventListener("click",(ev)=>{
      const btn = ev.target.closest(".tab");
      if(!btn) return;
      ev.preventDefault();
      setActive(btn.dataset.tab);
    });
  } else {
    // fallback
    document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>setActive(btn.dataset.tab)));
  }
  // پیش‌فرض: داشبورد
  setActive("dashboard");
}

function init(){
  if((!state.patients || state.patients.length===0) && window.SAMPLE_DATA) loadSample();
  document.querySelectorAll('input[type="date"]').forEach(x=>x.value=today());
  $("btn-load-sample").onclick=()=>{loadSample(); renderPatientSelect(); renderAll();};
  initTabs();
  renderPatientSelect();
  renderEduMenu();
  renderAll();
}

function renderAll(){
  renderChart();
}

window.addEventListener("load", init);
