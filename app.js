// ══════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════
const MASTER_KEY  = 'W2W-MASTER-2025';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ══════════════════════════════════
//  STORAGE
// ══════════════════════════════════
const db = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k)    => localStorage.removeItem(k)
};

const getAdmins     = ()  => db.get('w2w_admins', []);
const saveAdmins    = (a) => db.set('w2w_admins', a);
const getWorkerAccs = ()  => db.get('w2w_worker_accounts', []);
const saveWorkerAccs= (a) => db.set('w2w_worker_accounts', a);
const getCitizens   = ()  => db.get('w2w_citizens', []);
const saveCitizens  = (a) => db.set('w2w_citizens', a);
const getBins       = ()  => db.get('w2w_bins', []);
const saveBins      = (b) => db.set('w2w_bins', b);
const getTasks      = ()  => db.get('w2w_tasks', []);
const saveTasks     = (t) => db.set('w2w_tasks', t);
const getComplaints = ()  => db.get('w2w_complaints', []);
const saveComplaints= (c) => db.set('w2w_complaints', c);

// Credits per citizen
const getCredits     = (id) => parseInt(db.get('w2w_cr_' + id, 0));
const addCredits     = (id, n) => { db.set('w2w_cr_' + id, getCredits(id) + n); refreshCreditUI(); };
const refreshCreditUI = () => {
  const id = sessionId();
  if (id) document.getElementById('creditDisplay').textContent = getCredits(id);
};

// Weekly complaint lock per citizen
const lastComplaint    = (id) => parseInt(db.get('w2w_lc_' + id, 0));
const setLastComplaint = (id) => db.set('w2w_lc_' + id, Date.now());
const canComplain      = (id) => { const l = lastComplaint(id); return !l || (Date.now() - l) >= ONE_WEEK_MS; };
const timeLeft         = (id) => {
  const rem = ONE_WEEK_MS - (Date.now() - lastComplaint(id));
  const d = Math.floor(rem / 86400000),
        h = Math.floor((rem % 86400000) / 3600000),
        m = Math.floor((rem % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
};

// Session
const sessionId   = () => localStorage.getItem('w2w_sid');
const sessionRole = () => localStorage.getItem('w2w_role');

// All IDs must be globally unique
const allIds  = () => [...getAdmins(), ...getWorkerAccs(), ...getCitizens()].map(x => x.id.toUpperCase());
const idTaken = (id) => allIds().includes(id.toUpperCase());

// ══════════════════════════════════
//  SEED DATA
// ══════════════════════════════════
function seed() {
  if (!getAdmins().length)
    saveAdmins([{ id: 'ADM001', name: 'Super Admin', pwd: 'admin123' }]);

  if (!getWorkerAccs().length)
    saveWorkerAccs([
      { id: 'WKR001', name: 'Keval', pwd: 'worker123', perf: { completed: 12, score: 82 } },
      { id: 'WKR002', name: 'Man',   pwd: 'worker456', perf: { completed: 20, score: 91 } },
      { id: 'WKR003', name: 'Palak', pwd: 'worker789', perf: { completed: 5,  score: 60 } }
    ]);

  if (!getBins().length)
    saveBins([
      { id: 'BIN001', lat: 21.1702, lng: 72.8311, loc: 'Sector 7',      type: 'wet',       fill: 42 },
      { id: 'BIN002', lat: 21.1718, lng: 72.8335, loc: 'MG Road',       type: 'dry',       fill: 22 },
      { id: 'BIN003', lat: 21.1689, lng: 72.8290, loc: 'Riverfront',    type: 'hazardous', fill: 89 },
      { id: 'BIN004', lat: 21.1695, lng: 72.8340, loc: 'Market Area',   type: 'dry',       fill: 78 },
      { id: 'BIN005', lat: 21.1722, lng: 72.8300, loc: 'Hospital Zone', type: 'wet',       fill: 91 }
    ]);

  if (!getTasks().length)
    saveTasks([
      { id: 'T1', title: 'Empty BIN003',                              details: 'High fill at Riverfront.', assigned: 'WKR001', ts: Date.now() },
      { id: 'T2', title: 'Collect hazardous waste near Hospital Zone', details: 'Pickup today.',           assigned: 'WKR002', ts: Date.now() }
    ]);
}

// ══════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════
const PAGES = ['landing', 'citizenAuth', 'citizen', 'adminAuth', 'admin', 'workerAuth', 'worker'];

function showPage(n) {
  PAGES.forEach(p => { const e = document.getElementById(p + 'Page'); if (e) e.classList.add('hidden'); });
  const t = document.getElementById(n + 'Page');
  if (t) { t.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function pickRole(role) {
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  document.getElementById('rc-' + role).classList.add('active');
  setTimeout(() => showPage(role + 'Auth'), 180);
}

function switchTab(role, tab) {
  const p = role[0];
  document.getElementById(p + 'tab-login').classList.toggle('active', tab === 'login');
  document.getElementById(p + 'tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById(role + '-login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById(role + '-signup-form').classList.toggle('hidden', tab !== 'signup');
}

function logout() { db.del('w2w_role'); db.del('w2w_sid'); showPage('landing'); }

function resetAll() {
  if (!confirm('Reset all demo data and accounts?')) return;
  Object.keys(localStorage).filter(k => k.startsWith('w2w_')).forEach(k => localStorage.removeItem(k));
  location.reload();
}

// ══════════════════════════════════
//  TOAST
// ══════════════════════════════════
function toast(msg, type = 'info') {
  const t  = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = 'toast-item toast-' + type;
  el.textContent = msg;
  t.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ══════════════════════════════════
//  HELPERS
// ══════════════════════════════════
function showErr(...ids)  { ids.forEach(id => document.getElementById(id).classList.add('show')); }
function clearErr(...ids) { ids.forEach(id => document.getElementById(id).classList.remove('show')); }

// ══════════════════════════════════
//  AUTH – CITIZEN
// ══════════════════════════════════
function citizenLogin(e) {
  e.preventDefault();
  const id  = document.getElementById('cl_id').value.trim().toUpperCase();
  const pwd = document.getElementById('cl_pwd').value;
  const u   = getCitizens().find(c => c.id.toUpperCase() === id && c.pwd === pwd);
  if (!u) { toast('Invalid Citizen ID or password', 'error'); return; }
  startSession('Citizen', u.id);
  document.getElementById('citizenNameDisplay').textContent = u.name + ' (' + u.id + ')';
  refreshCreditUI(); setNextDriveDate(); checkCooldown(u.id);
  showPage('citizen'); toast('Welcome back, ' + u.name + '!', 'success');
}

function citizenSignup(e) {
  e.preventDefault();
  const name    = document.getElementById('cs_name').value.trim();
  const contact = document.getElementById('cs_contact').value.trim();
  const id      = document.getElementById('cs_id').value.trim().toUpperCase();
  const pwd     = document.getElementById('cs_pwd').value;
  const pwd2    = document.getElementById('cs_pwd2').value;
  clearErr('cs_id_err', 'cs_pwd_err');
  if (idTaken(id)) { showErr('cs_id_err'); return; }
  if (pwd !== pwd2) { showErr('cs_pwd_err'); return; }
  const arr = getCitizens(); arr.push({ id, name, contact, pwd }); saveCitizens(arr);
  startSession('Citizen', id);
  document.getElementById('citizenNameDisplay').textContent = name + ' (' + id + ')';
  refreshCreditUI(); setNextDriveDate(); checkCooldown(id);
  showPage('citizen'); toast('Account created! Welcome, ' + name + '!', 'success');
}

// ══════════════════════════════════
//  AUTH – ADMIN
// ══════════════════════════════════
function adminLogin(e) {
  e.preventDefault();
  const id  = document.getElementById('al_id').value.trim().toUpperCase();
  const pwd = document.getElementById('al_pwd').value;
  const u   = getAdmins().find(a => a.id.toUpperCase() === id && a.pwd === pwd);
  if (!u) { toast('Invalid Admin ID or password', 'error'); return; }
  startSession('Admin', u.id);
  document.getElementById('adminNameDisplay').textContent = u.name + ' (' + u.id + ')';
  initAdmin(); showPage('admin'); toast('Welcome, ' + u.name + '!', 'success');
}

function adminSignup(e) {
  e.preventDefault();
  const name = document.getElementById('as_name').value.trim();
  const id   = document.getElementById('as_id').value.trim().toUpperCase();
  const pwd  = document.getElementById('as_pwd').value;
  const pwd2 = document.getElementById('as_pwd2').value;
  const key  = document.getElementById('as_key').value.trim();
  clearErr('as_id_err', 'as_pwd_err', 'as_key_err');
  if (idTaken(id))      { showErr('as_id_err');  return; }
  if (pwd !== pwd2)     { showErr('as_pwd_err'); return; }
  if (key !== MASTER_KEY) { showErr('as_key_err'); return; }
  const arr = getAdmins(); arr.push({ id, name, pwd }); saveAdmins(arr);
  startSession('Admin', id);
  document.getElementById('adminNameDisplay').textContent = name + ' (' + id + ')';
  initAdmin(); showPage('admin'); toast('Admin account created! Welcome, ' + name + '!', 'success');
}

// ══════════════════════════════════
//  AUTH – WORKER
// ══════════════════════════════════
function workerLogin(e) {
  e.preventDefault();
  const id  = document.getElementById('wl_id').value.trim().toUpperCase();
  const pwd = document.getElementById('wl_pwd').value;
  const u   = getWorkerAccs().find(w => w.id.toUpperCase() === id && w.pwd === pwd);
  if (!u) { toast('Invalid Worker ID or password', 'error'); return; }
  startSession('Worker', u.id);
  document.getElementById('workerNameDisplay').textContent = u.name + ' (' + u.id + ')';
  initWorker(u.id); showPage('worker'); toast('Welcome, ' + u.name + '!', 'success');
}

function workerSignup(e) {
  e.preventDefault();
  const name = document.getElementById('ws_name').value.trim();
  const id   = document.getElementById('ws_id').value.trim().toUpperCase();
  const pwd  = document.getElementById('ws_pwd').value;
  const pwd2 = document.getElementById('ws_pwd2').value;
  clearErr('ws_id_err', 'ws_pwd_err');
  if (idTaken(id))  { showErr('ws_id_err');  return; }
  if (pwd !== pwd2) { showErr('ws_pwd_err'); return; }
  const arr = getWorkerAccs(); arr.push({ id, name, pwd, perf: { completed: 0, score: 0 } }); saveWorkerAccs(arr);
  startSession('Worker', id);
  document.getElementById('workerNameDisplay').textContent = name + ' (' + id + ')';
  initWorker(id); showPage('worker'); toast('Worker account created! Welcome, ' + name + '!', 'success');
}

// ══════════════════════════════════
//  SESSION
// ══════════════════════════════════
function startSession(role, id) { db.set('w2w_role', role); localStorage.setItem('w2w_sid', id); }

// ══════════════════════════════════
//  CITIZEN – CLEANUP DATE
// ══════════════════════════════════
function setNextDriveDate() {
  const now = new Date();
  function fourth4Sat(yr, mo) {
    let d = new Date(yr, mo, 1), s = 0;
    while (s < 4) { if (d.getDay() === 6) s++; if (s < 4) d.setDate(d.getDate() + 1); }
    return d;
  }
  let d = fourth4Sat(now.getFullYear(), now.getMonth());
  if (d <= now) d = fourth4Sat(now.getFullYear(), now.getMonth() + 1);
  document.getElementById('nextDriveDate').textContent = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ══════════════════════════════════
//  CITIZEN – COMPLAINT
// ══════════════════════════════════
function checkCooldown(id) {
  const banner = document.getElementById('cooldownBanner');
  const btn    = document.getElementById('submitComplaintBtn');
  if (canComplain(id)) {
    banner.classList.add('hidden'); btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
  } else {
    banner.textContent = '⏳ You can submit your next complaint in ' + timeLeft(id) + '. (1 complaint per week allowed)';
    banner.classList.remove('hidden'); btn.disabled = true; btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
  }
}

document.getElementById('complaintForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = sessionId();
  if (!canComplain(id)) { toast('You can only submit 1 complaint per week', 'error'); return; }
  const name    = document.getElementById('comp_name').value.trim();
  const phone   = document.getElementById('comp_phone').value.trim();
  const loc     = document.getElementById('comp_loc').value.trim();
  const details = document.getElementById('comp_details').value.trim();
  if (!name || !phone || !loc || !details) { toast('Please fill all fields', 'error'); return; }
  const file = document.getElementById('comp_file').files[0];
  let fileData = null, fileType = '';
  if (file) { fileType = file.type; fileData = await toBase64(file); }
  const complaint = { id: 'C' + Date.now(), citizenId: id, name, phone, loc, details, fileData, fileType, ts: Date.now() };
  const arr = getComplaints(); arr.unshift(complaint); saveComplaints(arr);
  setLastComplaint(id);
  const earned = (details && fileData) ? 100 : 0;
  if (earned) { addCredits(id, earned); toast('✅ Submitted! +100 Green Credits earned 🎉', 'success'); }
  else        { toast('Complaint submitted! Add a photo next time to earn credits.', 'info'); }
  e.target.reset();
  checkCooldown(id);
});

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej();
    r.readAsDataURL(file);
  });
}

// ══════════════════════════════════
//  CITIZEN – REDEEM
// ══════════════════════════════════
function redeemItem(cost) {
  const id      = sessionId();
  const credits = getCredits(id);
  if (credits < cost) { toast('❌ Not enough credits!', 'error'); return; }
  addCredits(id, -cost);
  toast('🎉 Reward redeemed successfully!', 'success');
}

// ══════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════
let mapInst = null, mapMks = [];

function initAdmin() {
  renderStats(); renderBinList(); renderAdminComplaints(); renderWorkerPerf(); populateWorkerDrop();
  setTimeout(initMap, 300);
}

function renderStats() {
  document.getElementById('statBins').textContent       = getBins().length;
  document.getElementById('statComplaints').textContent = getComplaints().length;
  document.getElementById('statWorkers').textContent    = getWorkerAccs().length;
  document.getElementById('adminAlertChip').classList.toggle('hidden', !getBins().some(b => b.fill >= 85));
}

function renderBinList() {
  const cont = document.getElementById('binList'); cont.innerHTML = '';
  getBins().forEach(b => {
    const el = document.createElement('div');
    el.className = 'bin-item' + (b.fill >= 85 ? ' alert' : '');
    el.innerHTML = `
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">${b.id}</div>
        <div class="small">${b.loc}</div>
        <div class="fill-bar"><div class="fill-inner${b.fill >= 85 ? ' critical' : ''}" style="width:${b.fill}%"></div></div>
      </div>
      <div style="text-align:right">
        <span class="tag ${b.type}">${b.type}</span>
        <div class="tiny" style="margin-top:4px">${b.fill}% full</div>
      </div>`;
    cont.appendChild(el);
  });
}

function renderAdminComplaints() {
  const cont = document.getElementById('complaintsContainer'); cont.innerHTML = '';
  const arr  = getComplaints();
  if (!arr.length) { cont.innerHTML = '<div class="small" style="padding:10px">No complaints yet.</div>'; return; }
  arr.forEach((cp, i) => {
    const div = document.createElement('div'); div.className = 'complaint-item';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div>
          <div style="font-weight:600;font-size:13px">${cp.name}</div>
          <div class="tiny">${cp.phone} · ${cp.loc}</div>
        </div>
        <div class="tiny">${new Date(cp.ts).toLocaleDateString()}</div>
      </div>
      <div style="margin-top:5px;font-size:12px;color:var(--muted)">${cp.details}</div>`;
    if (cp.fileData && cp.fileType && cp.fileType.startsWith('image')) {
      const img = document.createElement('img'); img.src = cp.fileData; img.className = 'complaint-img'; div.appendChild(img);
    }
    const btn = document.createElement('button'); btn.className = 'resolve-btn'; btn.textContent = '✓ Resolve';
    btn.onclick = () => {
      const c = getComplaints(); c.splice(i, 1); saveComplaints(c);
      renderAdminComplaints(); renderStats(); toast('Complaint resolved', 'success');
    };
    div.appendChild(btn); cont.appendChild(div);
  });
}

function renderWorkerPerf() {
  const cont = document.getElementById('workerPerf'); cont.innerHTML = '';
  getWorkerAccs().forEach(w => {
    const p   = w.perf || { completed: 0, score: 0 };
    const div = document.createElement('div'); div.className = 'perf-row';
    div.innerHTML = `
      <div class="score-ring" style="background:conic-gradient(var(--g1) ${p.score * 3.6}deg,rgba(255,255,255,0.06) 0)">
        <span>${p.score}%</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:13px">${w.name} <span class="tiny">(${w.id})</span></div>
        <div class="tiny">Completed: ${p.completed} tasks</div>
      </div>`;
    cont.appendChild(div);
  });
}

function populateWorkerDrop() {
  const sel = document.getElementById('task_worker'); sel.innerHTML = '<option value="">— Select Worker —</option>';
  getWorkerAccs().forEach(w => { const o = document.createElement('option'); o.value = w.id; o.textContent = `${w.name} (${w.id})`; sel.appendChild(o); });
}

function addTask() {
  const title   = document.getElementById('task_title').value.trim();
  const details = document.getElementById('task_details').value.trim();
  const worker  = document.getElementById('task_worker').value;
  if (!title || !details) { toast('Fill task title and details', 'error'); return; }
  if (!worker)            { toast('Select a worker to assign', 'error'); return; }
  const arr = getTasks(); arr.unshift({ id: 'T' + Date.now(), title, details, assigned: worker, ts: Date.now() }); saveTasks(arr);
  document.getElementById('task_title').value  = '';
  document.getElementById('task_details').value = '';
  document.getElementById('task_worker').value  = '';
  toast('Task assigned!', 'success');
}

function initMap() {
  if (!mapInst) {
    mapInst = L.map('map').setView([21.1702, 72.8311], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapInst);
  }
  updateMapMks();
}

function updateMapMks() {
  mapMks.forEach(m => mapInst.removeLayer(m)); mapMks = [];
  getBins().forEach(b => {
    const col  = b.fill >= 85 ? '#ff6b6b' : (b.type === 'wet' ? '#00e5a0' : b.type === 'dry' ? '#00b4d8' : '#c084fc');
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${col};width:13px;height:13px;border-radius:99px;border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 7px ${col}90"></div>`
    });
    mapMks.push(L.marker([b.lat, b.lng], { icon }).addTo(mapInst).bindPopup(`<strong>${b.id}</strong><br>${b.loc}<br>${b.type}<br>${b.fill}% full`));
  });
}

// ══════════════════════════════════
//  WORKER DASHBOARD
// ══════════════════════════════════
function initWorker(wid) {
  const tasks = getTasks().filter(t => t.assigned === wid);
  const cont  = document.getElementById('workerTasks'); cont.innerHTML = '';
  if (!tasks.length) {
    cont.innerHTML = '<div class="small" style="padding:10px">No tasks assigned yet.</div>';
  } else {
    tasks.forEach(t => {
      const div = document.createElement('div'); div.className = 'task-item';
      div.innerHTML = `<h4>${t.title}</h4><div class="small">${t.details}</div>`;
      cont.appendChild(div);
    });
  }
  const me    = getWorkerAccs().find(w => w.id === wid);
  const pCont = document.getElementById('workerStats'); pCont.innerHTML = '';
  if (me) {
    const p   = me.perf || { completed: 0, score: 0 };
    const div = document.createElement('div'); div.className = 'perf-row';
    div.innerHTML = `
      <div class="score-ring" style="background:conic-gradient(var(--g1) ${p.score * 3.6}deg,rgba(255,255,255,0.06) 0)">
        <span>${p.score}%</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:14px">${me.name}</div>
        <div class="tiny">Worker ID: ${me.id}</div>
        <div class="tiny">Tasks Completed: ${p.completed}</div>
        <div class="tiny">Score: ${p.score}%</div>
      </div>`;
    pCont.appendChild(div);
  }
}

// ══════════════════════════════════
//  BIN SIMULATION
// ══════════════════════════════════
setInterval(() => {
  saveBins(getBins().map(b => ({ ...b, fill: Math.min(100, Math.round(b.fill + Math.random() * 3)) })));
  if (!document.getElementById('adminPage').classList.contains('hidden')) {
    renderBinList(); updateMapMks(); renderStats();
  }
}, 25000);

// ══════════════════════════════════
//  BOOT
// ══════════════════════════════════
seed();
const role = sessionRole(), sid = sessionId();
if (role === 'Admin') {
  const u = getAdmins().find(a => a.id === sid);
  if (u) { document.getElementById('adminNameDisplay').textContent = u.name + ' (' + u.id + ')'; initAdmin(); showPage('admin'); }
  else showPage('landing');
} else if (role === 'Worker') {
  const u = getWorkerAccs().find(w => w.id === sid);
  if (u) { document.getElementById('workerNameDisplay').textContent = u.name + ' (' + u.id + ')'; initWorker(u.id); showPage('worker'); }
  else showPage('landing');
} else if (role === 'Citizen') {
  const u = getCitizens().find(c => c.id === sid);
  if (u) { document.getElementById('citizenNameDisplay').textContent = u.name + ' (' + u.id + ')'; refreshCreditUI(); setNextDriveDate(); checkCooldown(u.id); showPage('citizen'); }
  else showPage('landing');
} else {
  showPage('landing');
}
