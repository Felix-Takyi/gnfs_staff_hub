'use strict';
// â”€â”€ DATA â”€â”€
function loadFromStorage(key, fallback){
  try{
    const raw=localStorage.getItem('gnfs_'+key);
    if(raw){
      const parsed=JSON.parse(raw);
      return parsed;
    }
  }catch(e){}
  return fallback;
}
function saveToStorage(key,value){
  try{localStorage.setItem('gnfs_'+key,JSON.stringify(value));}catch(e){}
}

let STAFF = loadFromStorage('staff', [
  {id:'GNFS-001',n:'Kofi Asante',sn:'GNFS-001',rank:'Senior Officer',dept:'Operations',status:'On Duty',col:'#B30000'},
  {id:'GNFS-002',n:'Esi Owusu',sn:'GNFS-002',rank:'Fire Officer',dept:'Training',status:'On Duty',col:'#0A1F44'},
  {id:'GNFS-003',n:'James Mensah',sn:'GNFS-003',rank:'NCO',dept:'Logistics',status:'On Leave',col:'#00875a'},
  {id:'GNFS-004',n:'Abena Boateng',sn:'GNFS-004',rank:'Senior Officer',dept:'Operations',status:'On Duty',col:'#d97706'},
  {id:'GNFS-005',n:'Kwame Tetteh',sn:'GNFS-005',rank:'Asst. Commissioner',dept:'Administration',status:'On Duty',col:'#1e6ef5'},
  {id:'GNFS-006',n:'Akua Darko',sn:'GNFS-006',rank:'Fire Officer',dept:'Operations',status:'On Duty',col:'#B30000'},
  {id:'GNFS-007',n:'Samuel Adu',sn:'GNFS-007',rank:'NCO',dept:'Logistics',status:'Off Duty',col:'#0A1F44'},
  {id:'GNFS-008',n:'Grace Asare',sn:'GNFS-008',rank:'Fire Officer',dept:'Training',status:'On Duty',col:'#00875a'},
  {id:'GNFS-009',n:'Yaw Boateng',sn:'GNFS-009',rank:'Senior Officer',dept:'Operations',status:'On Duty',col:'#7c3aed'},
  {id:'GNFS-010',n:'Akosua Mensah',sn:'GNFS-010',rank:'Fire Officer',dept:'Administration',status:'On Duty',col:'#0891b2'},
]);
let KANBAN = loadFromStorage('kanban', {
  todo:[{t:'Annual Equipment Inspection',p:'high',a:'KA',d:'Mar 15'},{t:'Update Emergency Contact List',p:'med',a:'EO',d:'Mar 18'},{t:'Prepare Q2 Training Schedule',p:'low',a:'AB',d:'Mar 22'}],
  progress:[{t:'Fire Hose Pressure Testing',p:'high',a:'JM',d:'Mar 13'},{t:'Station 3 Renovation Review',p:'med',a:'KT',d:'Mar 16'}],
  done:[{t:'March Roster Publication',p:'low',a:'GD',d:'Mar 10'},{t:'New Recruit Orientation',p:'med',a:'KA',d:'Mar 8'},{t:'HAZMAT Drill Report',p:'high',a:'EO',d:'Mar 7'}],
  blocked:[{t:'Vehicle Repair â€“ Engine 04',p:'high',a:'SA',d:'TBD'}]
});
let INCIDENTS = loadFromStorage('incidents', [
  {t:'Structure Fire â€“ Accra Mall',loc:'Accra Central',units:'Engine 03, Engine 07',st:'active',time:'12 min ago'},
  {t:'Gas Leak â€“ Tema Industrial Area',loc:'Tema Station 2',units:'HazMat Unit',st:'contained',time:'1h 22m ago'},
  {t:'Bush Fire â€“ Achimota Forest',loc:'Achimota',units:'Tanker 01',st:'resolved',time:'3h ago'},
  {t:'Vehicle Fire â€“ N1 Highway',loc:'Ofankor Junction',units:'Engine 02',st:'resolved',time:'5h ago'},
]);

let editingStaffId = null;

// â”€â”€ CHART INSTANCES (track to avoid re-init) â”€â”€
const CHARTS = {};

// â”€â”€ LOGIN â”€â”€
function doLogin(){
  const u=document.getElementById('li-user').value.trim();
  const p=document.getElementById('li-pass').value.trim();
  if(!u||!p){toast('Please enter your credentials','e');return;}
  const remember=document.getElementById('li-rem').checked;
  if(remember){
    saveToStorage('login',{user:u,pass:p});
  } else {
    localStorage.removeItem('gnfs_login');
  }
  const lw=document.getElementById('login-wrap');
  lw.style.cssText='opacity:0;transform:scale(0.96);transition:all .4s;position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0A1F44,#1a3a6e)';
  setTimeout(()=>{
    lw.style.display='none';
    document.getElementById('app').style.display='block';
    const displayName = u.split('@')[0].replace(/[\.\-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
    const initials = displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-initials').textContent = initials;
    document.getElementById('topbar-name').textContent = displayName;
    document.getElementById('topbar-initials').textContent = initials;
    initApp();
    toast(`Welcome, ${displayName} ðŸ‘‹`,'s');
  },400);
}
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const lw=document.getElementById('login-wrap');
    if(lw&&lw.style.display!=='none'&&!lw.style.opacity)doLogin();
  }
});

function initLogin(){
  const stored=loadFromStorage('login',null);
  if(stored&&stored.user){
    document.getElementById('li-user').value=stored.user;
    document.getElementById('li-pass').value=stored.pass||'';
    document.getElementById('li-rem').checked=true;
  }
}
document.addEventListener('DOMContentLoaded',initLogin);

// â”€â”€ APP INIT (called once after login) â”€â”€
function initApp(){
  buildStaffGrid(STAFF);
  updateDashboardStats();
  buildAttTable();
  buildLeaveTable();
  buildKanban();
  buildIncidents('dash-incidents');
  buildIncidents('emg-incidents');
  buildTraining();
  buildComms();
  buildMiniCal();
  startClock();
  // Init slider on first load
  requestAnimationFrame(()=>{initSlider();initMaterialsSlider();});
  // Attach modal overlay close handlers
  document.querySelectorAll('.mo').forEach(o=>{
    o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});
  });
}

// â”€â”€ HERO SLIDER â”€â”€
let SLIDE_IDX=0,SLIDE_TIMER=null;
function initSlider(){
  const slides=document.querySelectorAll('.hero-slider .slide');
  const dotsEl=document.getElementById('slide-dots');
  if(!slides.length)return;
  // Build dots
  if(dotsEl){
    dotsEl.innerHTML='';
    slides.forEach((_,i)=>{
      const s=document.createElement('span');
      if(i===0)s.className='on';
      s.onclick=()=>goSlide(i);
      dotsEl.appendChild(s);
    });
  }
  startSlideTimer();
}
function goSlide(n){
  const slides=document.querySelectorAll('.hero-slider .slide');
  const dots=document.querySelectorAll('#slide-dots span');
  slides[SLIDE_IDX].classList.remove('active');
  dots[SLIDE_IDX]&&dots[SLIDE_IDX].classList.remove('on');
  SLIDE_IDX=(n+slides.length)%slides.length;
  slides[SLIDE_IDX].classList.add('active');
  dots[SLIDE_IDX]&&dots[SLIDE_IDX].classList.add('on');
  // Re-trigger content animation
  const content=slides[SLIDE_IDX].querySelector('.slide-content');
  if(content){content.style.animation='none';requestAnimationFrame(()=>{content.style.animation='';});}
}
function slideMove(dir){clearInterval(SLIDE_TIMER);goSlide(SLIDE_IDX+dir);startSlideTimer();}
function startSlideTimer(){
  clearInterval(SLIDE_TIMER);
  SLIDE_TIMER=setInterval(()=>goSlide(SLIDE_IDX+1),5000);
}

// â”€â”€ MATERIALS SLIDER â”€â”€
let MAT_SLIDE_IDX=0,MAT_SLIDE_TIMER=null;
function initMaterialsSlider(){
  const slides=document.querySelectorAll('.materials-slider .mat-slide');
  const dotsEl=document.getElementById('mat-dots');
  if(!slides.length)return;
  if(dotsEl){
    dotsEl.innerHTML='';
    slides.forEach((_,i)=>{
      const s=document.createElement('span');
      if(i===0)s.className='on';
      s.onclick=()=>goMatSlide(i);
      dotsEl.appendChild(s);
    });
  }
  startMatSlideTimer();
}
function goMatSlide(n){
  const slides=document.querySelectorAll('.materials-slider .mat-slide');
  const dots=document.querySelectorAll('#mat-dots span');
  if(!slides.length)return;
  slides[MAT_SLIDE_IDX].classList.remove('active');
  dots[MAT_SLIDE_IDX]&&dots[MAT_SLIDE_IDX].classList.remove('on');
  MAT_SLIDE_IDX=(n+slides.length)%slides.length;
  slides[MAT_SLIDE_IDX].classList.add('active');
  dots[MAT_SLIDE_IDX]&&dots[MAT_SLIDE_IDX].classList.add('on');
}
function matSlideMove(dir){clearInterval(MAT_SLIDE_TIMER);goMatSlide(MAT_SLIDE_IDX+dir);startMatSlideTimer();}
function startMatSlideTimer(){
  clearInterval(MAT_SLIDE_TIMER);
  MAT_SLIDE_TIMER=setInterval(()=>goMatSlide(MAT_SLIDE_IDX+1),4600);
}


const PAGE_TITLES={
  dashboard:'Home',staff:'Staff Profiles',attendance:'Attendance',
  leave:'Leave and Permissions',tasks:'Task & Duty Assignment',emergency:'Emergency Response',
  training:'Training & Development',comms:'Communication Centre',
  reports:'Reports & Analytics',settings:'System Settings'
};
function nav(id, el, deptFilter){
  // Hide all pages
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('pg-'+id);
  if(pg)pg.classList.add('active');
  // Update title
  document.getElementById('topbar-title').textContent=PAGE_TITLES[id]||id;
  // Update sidebar active
  if(el){
    document.querySelectorAll('.sb-nav a').forEach(a=>a.classList.remove('active'));
    el.classList.add('active');
  } else {
    // Find and activate matching sidebar link
    document.querySelectorAll('.sb-nav a').forEach(a=>{
      if(a.getAttribute('onclick')&&a.getAttribute('onclick').includes("'"+id+"'"))
        a.classList.add('active');
      else a.classList.remove('active');
    });
  }
  // Close mobile sidebar
  if(window.innerWidth<768)document.getElementById('sidebar').classList.remove('open');
  // If dept filter passed, apply it
  if(deptFilter&&id==='staff'){
    const sel=document.getElementById('staff-dept');
    if(sel){sel.value=deptFilter;filterStaff();}
  }
  // Lazy init charts per page
  requestAnimationFrame(()=>{
    if(id==='dashboard')initSlider();
    if(id==='training')initTrainingChart();
    if(id==='reports')initReportCharts();
  });
}

// â”€â”€ MOBILE SIDEBAR â”€â”€
function toggleSB(){document.getElementById('sidebar').classList.toggle('open');}

// â”€â”€ LIVE CLOCK â”€â”€
function startClock(){
  function tick(){
    const el=document.getElementById('live-clock');
    if(el)el.textContent=new Date().toLocaleTimeString('en-GB');
  }
  tick();setInterval(tick,1000);
}

// â”€â”€ MINI CALENDAR â”€â”€
function buildMiniCal(){
  const el=document.getElementById('mini-cal');
  if(!el)return;
  const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay=new Date(2026,2,1).getDay();
  const events=[3,8,12,15,20,25];
  let h=`<div class="mcal"><div class="mcal-hd"><strong>March 2026</strong><div><button>&#8249;</button><button>&#8250;</button></div></div><div class="mcal-grid">`;
  days.forEach(d=>h+=`<div class="dl">${d}</div>`);
  for(let i=0;i<firstDay;i++)h+=`<div></div>`;
  for(let i=1;i<=31;i++){
    let cls=i===12?'day today':'day';
    if(events.includes(i))cls+=' ev';
    h+=`<div class="${cls}">${i}</div>`;
  }
  h+=`</div></div>`;
  el.innerHTML=h;
}

// â”€â”€ STAFF GRID â”€â”€
function updateRankOptions(gender){
  const rankSelect = document.getElementById('staff-rank-input');
  if(!rankSelect)return;
  rankSelect.innerHTML = '<option value="" disabled selected>Select rank</option>';
  if(!gender){
    rankSelect.innerHTML = '<option value="" disabled selected>Please select gender first</option>';
    return;
  }
  const ranks = gender === 'Male' ? [
    'CFO', 'DCFO', 'ACFO I', 'ACFO II', 'DO I', 'DO II', 'DO III', 'ADO I', 'ADO II', 'STNO I', 'STNO II', 'ASTNO', 'SUB O', 'LFM', 'SNR FM', 'FM'
  ] : gender === 'Female' ? [
    'CFO', 'DCFO', 'ACFO I', 'ACFO II', 'DO I', 'DO II', 'DO III', 'ADO I', 'ADO II', 'GO I', 'GO II', 'DGO', 'AGO', 'LFW', 'SNR FW', 'FW'
  ] : [];
  ranks.forEach(rank => {
    const option = document.createElement('option');
    option.value = rank;
    option.textContent = rank;
    rankSelect.appendChild(option);
  });
}

function toggleGender(gender, checked){
  const male = document.getElementById('staff-gender-male');
  const female = document.getElementById('staff-gender-female');
  if(!male || !female) return;
  if(gender==='Male' && checked) female.checked=false;
  if(gender==='Female' && checked) male.checked=false;
  const selected = male.checked ? 'Male' : female.checked ? 'Female' : '';
  updateRankOptions(selected);
}

function getSelectedGender(){
  const male = document.getElementById('staff-gender-male');
  const female = document.getElementById('staff-gender-female');
  if(male && male.checked) return 'Male';
  if(female && female.checked) return 'Female';
  return '';
}

function setSelectedGender(gender){
  const male = document.getElementById('staff-gender-male');
  const female = document.getElementById('staff-gender-female');
  if(!male || !female) return;
  male.checked = gender === 'Male';
  female.checked = gender === 'Female';
  updateRankOptions(gender || '');
}

function updateStations(region){
  const stationSelect = document.getElementById('staff-station');
  stationSelect.innerHTML = '<option value="" disabled selected>Select station</option>';
  if(!region) return;
  const stations = {
    'GREATER ACCRA REGION': ['ABELEMKPE', 'ADENTA', 'ADJENKOTOKU', 'AMASAMAN', 'CASTLE', 'CIRCLE', 'DANSOMAN', 'ELECTORAL COMMISSION', 'FLAGSTAFF HOUSE', 'INDUSTRIAL', 'KORLE-BU', 'LEGON', 'MADINA', 'MAKOLA', 'MINISTRIES', 'NATIONAL HQ SUBSTATION', 'NUNGUA', 'PARLIAMENT', 'TRADE FAIR', 'WEIJA'],
    'TEMA REGION': ['Kasapreko', 'Tema Newtown', 'Metro', 'Tema Industrial Area Fire Station', 'Motorway Fire Station', 'Ashaiman', 'Katamanso', 'Gbestele', 'Devtraco 25', 'Prampram', 'Sege', 'Ada', 'Dodowa'],
    'CENTRAL REGION': ['REGIONAL HEADQUARTERS', 'Sub-Station', 'Metro Fire Station', 'UCC Fire Station', 'Elmina Fire Station', 'Komenda Fire Station', 'Praso Fire Station', 'Dunkwa-On-Offin Fire Station', 'Diaso Fire Station', 'Assin Fosu Fire Station', 'Abura Dunkwa Fire Station', 'Mankessim Fire Station', 'Apam Fire Station', 'Breman Asikuma Fire Station', 'Breman Essiam Fire Station', 'Apam Fire Station', 'Winneba Fire Station', 'Swedru Fire Station', 'Agona Nsaba Fire Station', 'Kasoa Fire Station', 'Pentecost Convention Center Fire Station', 'Buduburam Fire Station', 'Kotokuraba Market Fire Post', 'Swedru Market Post'],
    'ASHANTI REGION': ['Kumasi (Regional HQ)', 'KMA City Fire Station', 'Manhyia', 'Konfo Anokye Hospital', 'Obuasi', 'Bekwai', 'Mampong'],
    'EASTERN REGION': ['REGIONAL HEADQUARTERS', 'MUNICIPAL', 'METRO', 'ABURI', 'ACHIASE', 'ADUAMOA', 'AKIM ODA', 'AKOSOMBO', 'AKROPONG', 'AKROSO', 'AKWATIA', 'ANYINAM', 'ASAMANKESE', 'ASESEWA', 'ASUOM', 'BEGORO', 'BOSO', 'BUNSO', 'DONKORKROM', 'KADE KIBI', 'KPONG', 'LARTEH', 'MPRAESO', 'NEW ABIREM', 'NKAWKAW', 'NSAWAM', 'OFOASE', 'PEDUASE', 'SOMANYA', 'SUHUM'],
    'OTI REGION': ['Nkonya', 'Chinderi', 'Krache', 'Kpasa', 'Jasikan', 'Kadjebi', 'Nkwanta', 'Katanga Fire Post', 'Dambai Fire Station', 'RHQ.'],
    'VOLTA REGION': ['Ho (Regional HQ)', 'Hohoe', 'Kpando', 'Akatsi', 'Denu (Aflao)', 'Sogakope', 'Jasikan', 'Keta/Ketu areas', 'Nkwanta', 'Kadjebi', 'Dambai', 'Kete Krachi'],
    'NORTHERN REGION': ['Tamale (Regional HQ)', 'Tamale Metro', 'Yendi', 'Savelugu', 'Salaga', 'Bimbilla', 'Walewale', 'Damongo', 'Bole', 'Sawla'],
    'BONO / BONO EAST / AHAFO': ['Sunyani (HQ)', 'Berekum', 'Wenchi', 'Techiman', 'Dormaa Ahenkro', 'Kintampo', 'Nkoranza', 'Atebubu', 'Goaso', 'Sampa', 'Yeji'],
    'WESTERN REGION': ['Sekondi-Takoradi (HQ)', 'Takoradi', 'Tarkwa', 'Axim', 'Half Assini'],
    'UPPER REGIONS': ['Bolgatanga', 'Wa', 'Navrongo'],
    'OTHER REGIONS': ['Oti', 'North East', 'Savannah', 'Western North']
  };
  const normalizedStations = (stations[region] || [])
    .map(station => station.replace(/\bRHQ\.?\b/gi, 'REGIONAL HEADQUARTERS'))
    .map(station => /^\s*regional headquarters\s*$/i.test(station) ? 'REGIONAL HEADQUARTERS' : station.trim());
  const otherStations = normalizedStations
    .filter(station => station !== 'REGIONAL HEADQUARTERS')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const stationList = normalizedStations.includes('REGIONAL HEADQUARTERS')
    ? ['REGIONAL HEADQUARTERS', ...otherStations]
    : otherStations;
  stationList.forEach(station => {
    const option = document.createElement('option');
    option.value = station;
    option.textContent = station;
    stationSelect.appendChild(option);
  });
}
let STAFF_VIEW='grid';
function setStaffView(v){
  STAFF_VIEW=v;
  const sg=document.getElementById('staff-grid');
  if(sg) sg.classList.toggle('list-view',v==='list');
  const bl=document.getElementById('btn-view-list');
  const bg=document.getElementById('btn-view-grid');
  if(bl) bl.className=v==='list'?'btn btn-navy btn-sm':'btn btn-outline btn-sm';
  if(bg) bg.className=v==='grid'?'btn btn-navy btn-sm':'btn btn-outline btn-sm';
}
function buildStaffGrid(data){
  const el=document.getElementById('staff-grid');
  if(!el)return;
  el.innerHTML=data.map(s=>{
    const init=s.n.split(' ').map(w=>w[0]).join('').slice(0,2);
    const sc=s.status==='On Duty'?'bg-green':s.status==='On Leave'?'bg-amber':'bg-gray';
    return `<div class="scard">
      <div class="sav" style="background:${s.col}">${init}</div>
      <div class="si">
        <div class="sname">${s.n}</div>
        <div class="srank">${s.rank}</div>
        <div class="sdept">${s.dept} Â· ${s.sn}</div>
      </div>
      <span class="bp ${sc}" style="margin-top:.4rem">${s.status}</span>
      <div class="sbtns">
        <button class="btn btn-outline btn-sm" onclick="openStaffModal('${s.id}')"><i class="fa fa-pen"></i> Edit</button>
        <button class="btn-ghost btn-sm" title="Edit" onclick="openStaffModal('${s.id}')"><i class="fa fa-edit"></i></button>
      </div>
    </div>`;
  }).join('');
}
function filterStaff(){
  const q=(document.getElementById('staff-search').value||'').toLowerCase();
  const dept=document.getElementById('staff-dept').value;
  const rank=document.getElementById('staff-rank').value;
  const status=document.getElementById('staff-status').value;
  const filtered=STAFF.filter(s=>{
    return (!q||(s.n.toLowerCase().includes(q)||s.sn.toLowerCase().includes(q)))
      &&(!dept||s.dept===dept)
      &&(!rank||s.rank===rank)
      &&(!status||s.status===status);
  });
  buildStaffGrid(filtered);
}

function updateDashboardStats(){
  const el=document.getElementById('stat-total-staff');
  if(el)el.textContent=String(STAFF.length);
}

function getStaffFormFields(){
  return {
    name:document.getElementById('staff-name'),
    sn:document.getElementById('staff-sn'),
    dob:document.getElementById('staff-dob'),
    home:document.getElementById('staff-home'),
    pob:document.getElementById('staff-pob'),
    rank:document.getElementById('staff-rank-input'),
    dept:document.getElementById('staff-dept-input'),
    region:document.getElementById('staff-region'),
    station:document.getElementById('staff-station'),
    appointment:document.getElementById('staff-appointment'),
    phone:document.getElementById('staff-phone'),
    email:document.getElementById('staff-email'),
    emergName:document.getElementById('staff-emerg-name'),
    emergPhone:document.getElementById('staff-emerg-phone'),
  };
}

function openStaffModal(staffId){
  editingStaffId=null;
  const modal=document.getElementById('m-addstaff');
  const title=modal.querySelector('.mhd h3');
  const saveBtn=document.getElementById('staff-save-btn');
  const fields=getStaffFormFields();
  const clearForm=()=>{
    Object.values(fields).forEach(f=>{if(f)f.value='';});
    setSelectedGender('');
  };
  if(staffId){
    const staff=STAFF.find(s=>s.id===staffId);
    if(!staff)return;
    editingStaffId=staffId;
    title.innerHTML='<i class="fa fa-user-plus" style="color:var(--red)"></i> Edit Staff Member';
    if(saveBtn) saveBtn.innerHTML='<i class="fa fa-save"></i> Update Profile';
    fields.name.value=staff.n||'';
    fields.sn.value=staff.sn||'';
    fields.dob.value=staff.dob||'';
    fields.home.value=staff.home||'';
    fields.pob.value=staff.pob||'';
    setSelectedGender(staff.gender||'');
    fields.rank.value=staff.rank||'';
    fields.dept.value=staff.dept||'';
    fields.region.value=staff.region||'';
    fields.station.value=staff.station||'';
    fields.appointment.value=staff.appointment||'';
    fields.phone.value=staff.phone||'';
    fields.email.value=staff.email||'';
    fields.emergName.value=staff.emergName||'';
    fields.emergPhone.value=staff.emergPhone||'';
  } else {
    title.innerHTML='<i class="fa fa-user-plus" style="color:var(--red)"></i> Add New Staff Member';
    if(saveBtn) saveBtn.innerHTML='<i class="fa fa-save"></i> Save Profile';
    clearForm();
  }
  updateRankOptions(getSelectedGender());
  updateStations(fields.region.value);
  openM('m-addstaff');
  setTimeout(()=>fields.name.focus(),100);
}

function saveStaff(){
  const fields=getStaffFormFields();
  const name=document.getElementById('staff-name').value.trim();
  const sn=document.getElementById('staff-sn').value.trim();
  const rank=document.getElementById('staff-rank-input').value;
  const dept=document.getElementById('staff-dept-input').value;
  const invalidRank=!rank||rank.toLowerCase().includes('select');
  const invalidDept=!dept||dept.toLowerCase().includes('select');
  if(!name||invalidRank||invalidDept){
    toast('Name, rank and department are required','e');
    return;
  }
  if(!sn){
    toast('Please provide a service number','e');
    return;
  }
  const existing = STAFF.find(s=>s.sn===sn && s.id!==editingStaffId);
  if(existing){
    toast('Service number already exists','e');
    return;
  }
  const color=STAFF.length?STAFF[STAFF.length-1].col:'#B30000';
  const staffObj={
    id:editingStaffId||sn,
    n:name,
    sn:sn,
    rank:rank,
    dept:dept,
    region:fields.region.value,
    status:'On Duty',
    col:color,
    dob:document.getElementById('staff-dob').value,
    home:document.getElementById('staff-home').value.trim(),
    pob:document.getElementById('staff-pob').value.trim(),
    gender:getSelectedGender(),
    station:document.getElementById('staff-station').value,
    appointment:document.getElementById('staff-appointment').value,
    phone:document.getElementById('staff-phone').value.trim(),
    email:document.getElementById('staff-email').value.trim(),
    emergName:document.getElementById('staff-emerg-name').value.trim(),
    emergPhone:document.getElementById('staff-emerg-phone').value.trim(),
  };
  if(editingStaffId){
    const idx=STAFF.findIndex(s=>s.id===editingStaffId);
    if(idx>-1)STAFF[idx]=Object.assign({},STAFF[idx],staffObj);
    toast('Staff profile updated','s');
  } else {
    STAFF.unshift(staffObj);
    toast('Staff profile saved successfully','s');
  }
  saveToStorage('staff',STAFF);
  buildStaffGrid(STAFF);
  updateDashboardStats();
  buildAttTable();
  closeM('m-addstaff');
}

// â”€â”€ ATTENDANCE TABLE â”€â”€
function buildAttTable(){
  const el=document.getElementById('att-table');
  if(!el)return;
  const rows=STAFF.map(s=>{
    const init=s.n.split(' ').map(w=>w[0]).join('').slice(0,2);
    const sc=s.status==='On Duty'?'bg-green':s.status==='On Leave'?'bg-amber':'bg-gray';
    const cin=s.status==='On Duty'?'07:45':'â€”';
    const cout=s.status==='Off Duty'?'16:30':'â€”';
    return `<tr>
      <td><div class="tdn"><div class="av" style="background:${s.col}">${init}</div><div><strong>${s.n}</strong><span>${s.sn}</span></div></div></td>
      <td>${s.rank}</td><td>${s.dept}</td><td>${cin}</td><td>${cout}</td>
      <td><span class="bp ${sc}">${s.status}</span></td>
    </tr>`;
  });
  el.innerHTML=`<thead><tr><th>Officer</th><th>Rank</th><th>Department</th><th>Clock In</th><th>Clock Out</th><th>Status</th></tr></thead><tbody>${rows.join('')}</tbody>`;
}

// â”€â”€ LEAVE TABLE â”€â”€
const LEAVE_DATA=[
  {n:'Esi Owusu',sn:'GNFS-002',type:'Annual Leave',from:'Mar 14',to:'Mar 21',days:6,status:'Pending',col:'#0A1F44'},
  {n:'James Mensah',sn:'GNFS-003',type:'Sick Leave',from:'Mar 10',to:'Mar 14',days:5,status:'Approved',col:'#00875a'},
  {n:'Samuel Adu',sn:'GNFS-007',type:'Study Leave',from:'Mar 20',to:'Apr 3',days:14,status:'Pending',col:'#0A1F44'},
  {n:'Akua Darko',sn:'GNFS-006',type:'Annual Leave',from:'Apr 1',to:'Apr 5',days:5,status:'Pending',col:'#B30000'},
  {n:'Grace Asare',sn:'GNFS-008',type:'Annual Leave',from:'Mar 28',to:'Apr 4',days:8,status:'Approved',col:'#00875a'},
  {n:'Yaw Boateng',sn:'GNFS-009',type:'Compassionate Leave',from:'Mar 13',to:'Mar 15',days:3,status:'Approved',col:'#7c3aed'},
];
function buildLeaveTable(){
  const el=document.getElementById('leave-table');
  if(!el)return;
  const rows=LEAVE_DATA.map((l,i)=>{
    const init=l.n.split(' ').map(w=>w[0]).join('').slice(0,2);
    const sc=l.status==='Approved'?'bg-green':l.status==='Rejected'?'bg-red':'bg-amber';
    const acts=l.status==='Pending'
      ?`<button class="btn btn-sm" style="background:var(--green-lt);color:var(--green);border:none;border-radius:6px;padding:.28rem .6rem;font-size:.7rem;font-weight:600;cursor:pointer;margin-right:.3rem" onclick="approveLeave(this,${i})"><i class="fa fa-check"></i> Approve</button><button class="btn btn-sm" style="background:var(--red-pale);color:var(--red);border:none;border-radius:6px;padding:.28rem .6rem;font-size:.7rem;font-weight:600;cursor:pointer" onclick="rejectLeave(this,${i})"><i class="fa fa-times"></i> Reject</button>`
      :'â€”';
    return `<tr>
      <td><div class="tdn"><div class="av" style="background:${l.col}">${init}</div><div><strong>${l.n}</strong><span>${l.sn}</span></div></div></td>
      <td><span class="bp bg-navy">${l.type}</span></td>
      <td>${l.from}</td><td>${l.to}</td><td>${l.days} days</td>
      <td><span class="bp ${sc}" id="leave-status-${i}">${l.status}</span></td>
      <td id="leave-acts-${i}">${acts}</td>
    </tr>`;
  });
  el.innerHTML=`<thead><tr><th>Officer</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.join('')}</tbody>`;
}
function approveLeave(btn,i){
  document.getElementById('leave-status-'+i).className='bp bg-green';
  document.getElementById('leave-status-'+i).textContent='Approved';
  document.getElementById('leave-acts-'+i).textContent='â€”';
  toast('Leave approved','s');
}
function rejectLeave(btn,i){
  document.getElementById('leave-status-'+i).className='bp bg-red';
  document.getElementById('leave-status-'+i).textContent='Rejected';
  document.getElementById('leave-acts-'+i).textContent='â€”';
  toast('Leave rejected','w');
}
function submitLeaveRequest(){
  const type=document.getElementById('leave-type').value;
  const duration=document.getElementById('leave-duration').value.trim();
  const start=document.getElementById('leave-start').value.trim();
  const end=document.getElementById('leave-end').value.trim();
  const resumption=document.getElementById('leave-resumption').value.trim();
  const address=document.getElementById('leave-address').value.trim();
  const supervisor=document.getElementById('leave-supervisor').value;
  if(!type){toast('Please select a leave type','w');return;}
  if(!duration){toast('Please state the duration of leave required','w');return;}
  if(!start){toast('Please enter a start date','w');return;}
  if(!end){toast('Please enter an end date','w');return;}
  if(!resumption){toast('Please enter the resumption date','w');return;}
  if(!address){toast('Please enter your leave address','w');return;}
  if(!supervisor){toast('Please select a reporting supervisor','w');return;}
  closeM('m-leave');
  // clear form
  ['leave-type','leave-supervisor'].forEach(id=>{document.getElementById(id).value='';});
  ['leave-duration','leave-start','leave-end','leave-resumption','leave-address'].forEach(id=>{document.getElementById(id).value='';});
  toast('Leave request submitted for approval','s');
}

// â”€â”€ KANBAN â”€â”€
function buildKanban(){
  const el=document.getElementById('kanban-board');
  if(!el)return;
  const cols=[
    {key:'todo',label:'To Do',col:'var(--text-lt)'},
    {key:'progress',label:'In Progress',col:'var(--blue)'},
    {key:'done',label:'Completed',col:'var(--green)'},
    {key:'blocked',label:'Blocked',col:'var(--red)'},
  ];
  el.innerHTML=cols.map(col=>{
    const cards=(KANBAN[col.key]||[]).map(c=>`
      <div class="kcard">
        <div class="kcard-title">${c.t}</div>
        <div class="kcard-due"><i class="fa fa-calendar-alt" style="margin-right:.3rem"></i>${c.d}</div>
        <div class="kcard-foot">
          <span class="ktag ${c.p==='high'?'k-hi':c.p==='med'?'k-md':'k-lo'}">${c.p.toUpperCase()}</span>
          <div class="av" style="background:var(--navy);width:22px;height:22px;font-size:.58rem">${c.a}</div>
        </div>
      </div>`).join('');
    return `<div class="kcol">
      <div class="kcol-hd"><h4 style="color:${col.col}">${col.label}</h4><div class="kcnt">${(KANBAN[col.key]||[]).length}</div></div>
      ${cards}
      <button style="width:100%;background:none;border:1.5px dashed var(--gray-md);border-radius:8px;padding:.45rem;font-size:.76rem;color:var(--text-lt);cursor:pointer;margin-top:.3rem;font-family:var(--sans)" onclick="openM('m-task')"><i class="fa fa-plus"></i> Add</button>
    </div>`;
  }).join('');
}

// â”€â”€ INCIDENTS â”€â”€
function buildIncidents(targetId){
  const el=document.getElementById(targetId);
  if(!el)return;
  el.innerHTML=INCIDENTS.map(i=>{
    const bc=i.st==='active'?'bg-red':i.st==='contained'?'bg-amber':'bg-green';
    const label=i.st.charAt(0).toUpperCase()+i.st.slice(1);
    return `<div class="iitem">
      <div class="idot ${i.st}"></div>
      <div class="iinfo"><strong>${i.t}</strong><span><i class="fa fa-map-marker-alt"></i> ${i.loc} Â· ${i.units}</span></div>
      <div class="imeta"><span class="bp ${bc}">${label}</span><span>${i.time}</span></div>
    </div>`;
  }).join('');
}

// â”€â”€ TRAINING LIST â”€â”€
function buildTraining(){
  const el=document.getElementById('training-list');
  if(!el)return;
  const mods=[
    {ic:'fa-fire',c:'r',t:'Advanced Fire Suppression',sub:'Sr. Officer Tetteh',pct:78},
    {ic:'fa-skull-crossbones',c:'n',t:'HAZMAT Level 2 Certification',sub:'External Trainer',pct:45},
    {ic:'fa-heartbeat',c:'g',t:'Emergency First Responder',sub:'Nurse Asante',pct:92},
    {ic:'fa-truck',c:'n',t:'Heavy Appliance Driving',sub:'Off. Mensah',pct:60},
    {ic:'fa-mountain',c:'r',t:'Technical Rescue (Heights)',sub:'Dep. Comm. Adu',pct:33},
    {ic:'fa-shield-alt',c:'g',t:'Fire Service Leadership',sub:'Commissioner',pct:85},
  ];
  el.innerHTML=mods.map(m=>`
    <div class="tcard">
      <div class="tic ${m.c}"><i class="fa ${m.ic}"></i></div>
      <div class="tinfo">
        <strong>${m.t}</strong><span>Instructor: ${m.sub}</span>
        <div class="pb"><div class="pf ${m.c==='r'?'red':m.c==='n'?'navy':'green'}" style="width:${m.pct}%"></div></div>
      </div>
      <div class="tpct">${m.pct}%</div>
    </div>`).join('');
}

// â”€â”€ COMMS â”€â”€
function buildComms(){
  const a=document.getElementById('comms-ann');
  const m=document.getElementById('comms-msgs');
  if(a)a.innerHTML=`
    <div class="ann"><div class="ann-ic r"><i class="fa fa-exclamation-circle"></i></div><div class="ann-txt"><strong>Fire Safety Drill â€“ March 15</strong><span>All stations on standby. Full gear required.</span></div><span class="ann-time">2h ago</span></div>
    <div class="ann"><div class="ann-ic n"><i class="fa fa-clipboard"></i></div><div class="ann-txt"><strong>Q1 Performance Reviews Open</strong><span>Supervisors to submit by March 20</span></div><span class="ann-time">1d ago</span></div>
    <div class="ann"><div class="ann-ic g"><i class="fa fa-graduation-cap"></i></div><div class="ann-txt"><strong>New HAZMAT Module Available</strong><span>Enrol before March 18 deadline</span></div><span class="ann-time">2d ago</span></div>
    <div class="ann"><div class="ann-ic a"><i class="fa fa-bullhorn"></i></div><div class="ann-txt"><strong>Fuel Rationing in Effect</strong><span>Station commanders to monitor usage</span></div><span class="ann-time">3d ago</span></div>`;
  if(m)m.innerHTML=`
    <div class="ann"><div class="av" style="background:var(--navy);flex-shrink:0;width:34px;height:34px;font-size:.72rem">KT</div><div class="ann-txt"><strong>Kwame Tetteh</strong><span>Please confirm availability for the drill on Mar 15.</span></div><span class="ann-time">30m</span></div>
    <div class="ann"><div class="av" style="background:var(--red);flex-shrink:0;width:34px;height:34px;font-size:.72rem">EO</div><div class="ann-txt"><strong>Esi Owusu</strong><span>Training materials uploaded to repository.</span></div><span class="ann-time">1h</span></div>
    <div class="ann"><div class="av" style="background:var(--green);flex-shrink:0;width:34px;height:34px;font-size:.72rem">GA</div><div class="ann-txt"><strong>Grace Asare</strong><span>Recruit orientation completed successfully.</span></div><span class="ann-time">2h</span></div>`;
}

// â”€â”€ CHARTS â”€â”€
// Dashboard charts
function initDashCharts(){
  const ac=document.getElementById('chart-attendance');
  if(ac&&!CHARTS.attendance){
    CHARTS.attendance=new Chart(ac,{
      type:'line',
      data:{
        labels:['1 Mar','5 Mar','8 Mar','10 Mar','12 Mar'],
        datasets:[
          {label:'Present',data:[108,115,110,118,112],borderColor:'#0A1F44',backgroundColor:'rgba(10,31,68,.06)',tension:.4,fill:true,borderWidth:2,pointBackgroundColor:'#0A1F44',pointRadius:4},
          {label:'On Leave',data:[12,8,10,7,8],borderColor:'#d97706',backgroundColor:'rgba(217,119,6,.06)',tension:.4,fill:true,borderWidth:2,pointBackgroundColor:'#d97706',pointRadius:4}
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:false,grid:{color:'rgba(0,0,0,.04)'}},x:{grid:{display:false}}}}
    });
  }
  const dc=document.getElementById('chart-dept');
  if(dc&&!CHARTS.dept){
    CHARTS.dept=new Chart(dc,{
      type:'doughnut',
      data:{
        labels:['Operations','Training','Administration','Logistics','Special Units'],
        datasets:[{data:[62,28,19,24,14],backgroundColor:['#B30000','#0A1F44','#d97706','#00875a','#1e6ef5'],borderWidth:0,hoverOffset:8}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:12,padding:10}}}}
    });
  }
}

// Training chart â€” on training page
function initTrainingChart(){
  const tc=document.getElementById('chart-training');
  if(tc&&!CHARTS.training){
    CHARTS.training=new Chart(tc,{
      type:'bar',
      data:{
        labels:['Operations','Training','Admin','Logistics','Special'],
        datasets:[{label:'Completion %',data:[84,92,76,68,55],backgroundColor:['#B30000','#0A1F44','#d97706','#00875a','#1e6ef5'],borderRadius:5,borderSkipped:false}]
      },
      options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100,grid:{color:'rgba(0,0,0,.04)'}},y:{grid:{display:false}}}}
    });
  }
}

// Reports charts â€” on reports page
function initReportCharts(){
  const ic=document.getElementById('chart-incidents');
  if(ic&&!CHARTS.incidents){
    CHARTS.incidents=new Chart(ic,{
      type:'bar',
      data:{
        labels:['Jan','Feb','Mar','Apr','May','Jun'],
        datasets:[
          {label:'Structure Fire',data:[8,12,9,0,0,0],backgroundColor:'#B30000',borderRadius:4},
          {label:'Bush Fire',data:[5,3,4,0,0,0],backgroundColor:'#d97706',borderRadius:4},
          {label:'Rescue',data:[3,4,2,0,0,0],backgroundColor:'#0A1F44',borderRadius:4}
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.04)'}}}}
    });
  }
  const lc=document.getElementById('chart-leave');
  if(lc&&!CHARTS.leave){
    CHARTS.leave=new Chart(lc,{
      type:'pie',
      data:{
        labels:['Annual Leave','Sick Leave','Study Leave','Compassionate'],
        datasets:[{data:[52,24,16,8],backgroundColor:['#0A1F44','#B30000','#d97706','#00875a'],borderWidth:0}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:12,padding:10}}}}
    });
  }
}

// MODALS
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}

// CLOCK / ATTENDANCE
function doClock(type){
  const t=new Date().toLocaleTimeString('en-GB');
  document.getElementById('clock-status').textContent=
    type==='in'?`âœ… Clocked IN at ${t}`:`ðŸ”´ Clocked OUT at ${t}`;
  toast(`Clock ${type} recorded at ${t}`,'s');
}

// â”€â”€ EMERGENCY â”€â”€
function triggerEmg(){
  toast('ðŸš¨ EMERGENCY ALERT ACTIVATED â€” All units notified!','e');
}

// LOGOUT
function doLogout(){
  document.getElementById('app').style.display='none';
  const lw=document.getElementById('login-wrap');
  lw.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:1;transform:none;background:linear-gradient(135deg,#0A1F44,#1a3a6e)';
  toast('Logged out securely','s');
  // Destroy charts so they re-init properly next login
  Object.values(CHARTS).forEach(c=>{try{c.destroy();}catch(e){}});
  Object.keys(CHARTS).forEach(k=>delete CHARTS[k]);
}

// TOAST
function toast(msg,type){
  const el=document.getElementById('toast');
  const icons={s:'fa-check-circle',e:'fa-exclamation-circle',w:'fa-exclamation-triangle'};
  el.className=type||'s';
  el.innerHTML=`<i class="fa ${icons[type||'s']}"></i> ${msg}`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),3200);
}

