'use strict';
const VERSION = '1.0.5';
/* =====================================================================
   THE LIFE ORGANISATION — application script
   Built from Full_Lifestyle.xlsx · all local edits persist in the browser
   ===================================================================== */

/* ---------------- safe storage (works even in sandboxed previews) ---- */
const mem = {};
const SYNC = {on: false, timer: null, saving: false};
function syncMaybe(){ try{ if (SYNC.on) syncFlush(false); }catch(e){} }
const LS = {
  get(k, fb){
    try{
      const v = localStorage.getItem('lifeos.' + k);
      if (v == null) return (k in mem) ? mem[k] : fb;
      return JSON.parse(v);
    }catch(e){ return (k in mem) ? mem[k] : fb; }
  },
  set(k, v){
    mem[k] = v;
    delete _cache[k];
    if (k === 'wardrobe.added.v1') delete _cache.wardcats;
    try{ localStorage.setItem('lifeos.' + k, JSON.stringify(v)); }catch(e){}
    syncMaybe();
  },
  clearAll(){
    for (const k in mem) delete mem[k];
    for (const k in _cache) delete _cache[k];
    try{
      const rm = [];
      for (let i = 0; i < localStorage.length; i++){
        const key = localStorage.key(i);
        if (key && key.indexOf('lifeos.') === 0) rm.push(key);
      }
      rm.forEach(k => localStorage.removeItem(k));
    }catch(e){}
    syncMaybe();
  }
};

/* ---------------- keys, gate & backups ------------------------------- */
function randSalt(){
  try{
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
  }catch(e){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
}
async function digest(s){
  try{
    if (typeof crypto !== 'undefined' && crypto.subtle){
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }catch(e){}
  /* fallback digest where WebCrypto is unavailable (still device-local) */
  let h1 = 5381, h2 = 52711, h3 = 911, h4 = 7919;
  for (let i = 0; i < s.length; i++){
    const c = s.charCodeAt(i);
    h1 = ((h1 * 33) ^ c) >>> 0; h2 = ((h2 * 31) + c) >>> 0;
    h3 = ((h3 * 131) ^ c) >>> 0; h4 = ((h4 * 37) + c) >>> 0;
  }
  return 'fb' + h1.toString(16) + h2.toString(16) + h3.toString(16) + h4.toString(16);
}
const Gate = {
  rec(){ return LS.get('key.v1', null); },
  async create(pass){
    const salt = randSalt();
    const hash = await digest(salt + pass);
    LS.set('key.v1', {salt, hash, created: iso(new Date()), method: hash.slice(0, 2) === 'fb' ? 'local digest' : 'SHA-256'});
  },
  async verify(pass){
    const r = Gate.rec();
    if (!r) return false;
    return (await digest(r.salt + pass)) === r.hash;
  },
  open(hours){ LS.set('session.v1', {until: Date.now() + hours * 3600e3}); },
  valid(){ const s = LS.get('session.v1', null); return !!s && s.until > Date.now(); },
  close(){ LS.set('session.v1', {until: 0}); }
};
function storageBytes(){
  let n = 0;
  const seen = {};
  try{
    for (let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && key.indexOf('lifeos.') === 0){
        n += key.length + (localStorage.getItem(key) || '').length;
        seen[key.slice(7)] = 1;
      }
    }
  }catch(e){}
  for (const k in mem){ if (!seen[k]) n += k.length + JSON.stringify(mem[k]).length; }
  return n;
}
function allState(){
  const data = {};
  try{
    for (let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && key.indexOf('lifeos.') === 0 && key !== 'lifeos.snapshots.v1' && key !== 'lifeos.session.v1'){
        try{ data[key.slice(7)] = JSON.parse(localStorage.getItem(key)); }catch(e){}
      }
    }
  }catch(e){}
  for (const k in mem) if (k !== 'snapshots.v1') data[k] = mem[k];
  return data;
}
function exportBackup(){
  const out = {app: 'the-life-organisation', version: 1, exportedAt: new Date().toISOString(), data: allState()};
  const blob = new Blob([JSON.stringify(out, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'life-organisation-backup-' + iso(new Date()) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return Object.keys(out.data).length;
}
/* ---------------- persistent save-file sync (desktop exe) -------------
   The exe serves /__state on its loopback server: the whole compendium
   is written to a real file on disk (atomic, with a .bak beside it) on
   every change, and re-hydrated on boot when the file is newer.        */
function syncBoot(){
  if (location.protocol !== 'http:' && location.protocol !== 'https:'){
    SYNC.on = false;
    return Promise.resolve();
  }
  try{
  return fetch('/__state', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).then(obj => {
    if (!obj || !obj.data) return;
    SYNC.on = true;
    let localMark = 0;
    try{ localMark = +(localStorage.getItem('lifeos.sync.savedAt') || 0); }catch(e){}
    if ((obj.savedAt || 0) > localMark){
      try{
        for (const k in obj.data) localStorage.setItem('lifeos.' + k, JSON.stringify(obj.data[k]));
        localStorage.setItem('lifeos.sync.savedAt', String(obj.savedAt));
        for (const k in _cache) delete _cache[k];
        for (const k in mem) delete mem[k];
      }catch(e){}
    }
  }).catch(() => { SYNC.on = false; });
  }catch(e){ SYNC.on = false; return Promise.resolve(); }
}
function syncFlush(now){
  if (!SYNC.on) return;
  if (SYNC.timer){ clearTimeout(SYNC.timer); SYNC.timer = null; }
  const doIt = () => {
    if (SYNC.saving){ SYNC.timer = setTimeout(doIt, 300); return; }
    SYNC.saving = true;
    const savedAt = Date.now();
    const payload = {app: 'the-life-organisation', savedAt: savedAt, data: allState()};
    fetch('/__state', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), keepalive: true})
      .then(() => { try{ localStorage.setItem('lifeos.sync.savedAt', String(savedAt)); }catch(e){} })
      .catch(() => {})
      .then(() => { SYNC.saving = false; });
  };
  if (now) doIt(); else SYNC.timer = setTimeout(doIt, 250);
}
try{
  window.addEventListener('pagehide', () => syncFlush(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncFlush(true); });
}catch(e){}

function backupJSON(){
  return JSON.stringify({app: 'the-life-organisation', version: 1, exportedAt: new Date().toISOString(), data: allState()}, null, 2);
}
function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){}
  ta.remove();
  return ok;
}
function copyBackup(){
  const json = backupJSON();
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(json).then(() => true, () => fallbackCopy(json));
  }
  return Promise.resolve(fallbackCopy(json));
}
/* ---------------- save points (in-browser snapshots) ------------------ */
function snapshots(){ return LS.get('snapshots.v1', []); }
function makeSnapshot(){
  const list = snapshots();
  const s = {
    id: 'sn' + Date.now().toString(36),
    name: 'Point · ' + new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) + ', ' + new Date().toTimeString().slice(0, 5),
    at: iso(new Date()),
    n: Object.keys(allState()).length,
    data: allState()
  };
  list.push(s);
  while (list.length > 12) list.shift();
  LS.set('snapshots.v1', list);
  return s;
}
function restoreSnapshot(id){
  const s = snapshots().find(x => x.id === id);
  if (!s) return 0;
  /* true rollback: clear current state (except the save-point store), then apply */
  try{
    const rm = [];
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf('lifeos.') === 0 && k !== 'lifeos.snapshots.v1') rm.push(k);
    }
    rm.forEach(k => localStorage.removeItem(k));
  }catch(e){}
  for (const k in mem) if (k !== 'snapshots.v1') delete mem[k];
  for (const k in _cache) delete _cache[k];
  let n = 0;
  for (const k in s.data){ LS.set(k, s.data[k]); n++; }
  return n;
}
function stateCensus(){
  const keys = [];
  try{
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf('lifeos.') === 0) keys.push(k.slice(7));
    }
  }catch(e){}
  for (const k in mem) if (keys.indexOf(k) < 0) keys.push(k);
  const group = p => keys.filter(k => k.indexOf(p) === 0).length;
  return [
    ['Ticks & checklists', group('tasks') + group('curr.v1') + group('wardrobe') + group('groom.') + group('estate') + group('places')],
    ['Session & health logs', group('cardio.log') + group('lifts.log') + group('sleep.') + group('train.') + group('body.log') + group('water.')],
    ['Plans & programmes', group('cardio.plan') + group('cardio.start')],
    ['People, places & papers', group('network') + group('places') + group('docs') + group('career')],
    ['Edited inputs', Object.keys(pOver()).length],
    ['Save points', snapshots().length]
  ];
}

/* ---------------- editable parameters layer ---------------------------
   Every hard-coded figure becomes a default; overrides live in LS and
   everything derived (tax, TDEE, macros, gains, goals) recomputes live. */
const PDEF = {
  fin: {
    gross: 40000, taxFree: 12570, taxRate: 0.20, higherRate: 0.40, higherThreshold: 50270,
    niRate: 0.08, pensionRate: 0.05, loanRate: 0.09, loanThreshold: 29385,
    bills: [{name: 'Rail Pass', amt: 500}, {name: 'Rent', amt: 500}, {name: 'Gym', amt: 20}, {name: 'Reading', amt: 8}],
    regular: [{name: 'Misc Daily Budgeting', amt: 300}, {name: 'Self Improvement', amt: 60}],
    savings: [{name: 'GIA / Cash Savings', amt: 350}, {name: 'ISA Savings', amt: 375}, {name: 'LISA Savings', amt: 330}],
    loans: [{name: 'Student Loan', bal: 64272.58, apr: 0.06, initial: 62423.49}],
    cards: [{name: 'HSBC — Classic', bal: 0, limit: 500, apr: 0.299}, {name: 'Amex Gold', bal: 0, limit: 10000, apr: 0.291}]
  },
  inv: {
    isaAllow: 20000, lisaAllow: 4000, sippAllow: 60000, emergencyMonths: 3, bench: 0.0943,
    accounts: {
      isa: {value: 0, invested: 0, monthly: 375},
      lisa: {value: 627.82, invested: 500, monthly: 330},
      sipp: {value: 5447, invested: 3775, monthly: 0},
      company: {value: 0, invested: 0, monthly: 300},
      gia: {value: 0, invested: 0, monthly: 350}
    },
    pots: [{name: 'Birthday / Christmas', p: 7}, {name: 'ER', p: 11}, {name: 'Holidays', p: 62}, {name: 'L', p: 10}, {name: 'Personal Treats', p: 10}]
  },
  body: {
    height: 168, weight: 66, age: 22, bf: 0.195, waist: 72, neck: 38, wrist: 16, ankle: 22,
    torso: 105, arm: 35.5, forearm: 28, thigh: 52, calf: 38, shoulders: 120, width: 48,
    goalBF: 0.12, ffmiGoal: 23, activity: 1.2, deficit: 500, maxFatLossRate: 69,
    proteinRatio: 2.5, fatRatio: 0.6, waterRate: 33, sleepTarget: 8
  },
  ward: {
    sizes: {'Chest': '38/40', 'Inside Leg': '29', 'Waist': '30', 'Collar': '15.5', 'Sleeve Length': '—', 'Shoe Size': 'UK 7'}
  }
};
const _cache = {};
function cached(key, fn){ if (!Object.prototype.hasOwnProperty.call(_cache, key)) _cache[key] = fn(); return _cache[key]; }
function pOver(){ return cached('params.v1', () => LS.get('params.v1', {})); }
function P(path){
  const ov = pOver();
  if (Object.prototype.hasOwnProperty.call(ov, path)) return ov[path];
  const parts = path.split('.');
  let cur = PDEF;
  for (let i = 0; i < parts.length; i++){
    const prefix = parts.slice(0, i + 1).join('.');
    if (Object.prototype.hasOwnProperty.call(ov, prefix)) cur = ov[prefix];
    else cur = (cur == null) ? undefined : cur[parts[i]];
  }
  /* objects/arrays: merge any deeper leaf overrides so parents never go stale
     (this is what keeps NAV, budget sums and body goals in sync with edits) */
  if (cur && typeof cur === 'object'){
    const clone = Array.isArray(cur) ? cur.slice() : Object.assign({}, cur);
    const pre = path + '.';
    for (const k in ov){
      if (k.indexOf(pre) === 0){
        const rest = k.slice(pre.length).split('.');
        let t = clone;
        for (let i = 0; i < rest.length - 1; i++){
          t[rest[i]] = Array.isArray(t[rest[i]]) ? t[rest[i]].slice() : Object.assign({}, t[rest[i]] || {});
          t = t[rest[i]];
        }
        t[rest[rest.length - 1]] = ov[k];
      }
    }
    return clone;
  }
  return cur;
}
function setP(path, val){
  const ov = pOver();
  ov[path] = val;
  LS.set('params.v1', ov);
}
function resetP(){ LS.set('params.v1', {}); }
function pe(path, fmt){
  /* editable-number span; fmt optional fn */
  const v = P(path);
  const txt = fmt ? fmt(v) : String(v);
  return '<span class="pe" data-p="' + path + '" tabindex="0" title="editable in edit mode">' + txt + '</span>';
}

/* ---------------- live computations (mirror the workbook formulas) ---- */
function finCalc(){
  const gross = P('fin.gross');
  /* pension contributions are tax-deductible: they leave before the taxman counts.
     (This mirrors the workbook: taxable = gross − allowance + pensionContribution.) */
  const pension = gross * P('fin.pensionRate');
  const taxable = Math.max(0, gross - P('fin.taxFree') - pension);
  const basicBand = Math.max(0, P('fin.higherThreshold') - P('fin.taxFree'));
  const tax = taxable <= basicBand
    ? taxable * P('fin.taxRate')
    : basicBand * P('fin.taxRate') + (taxable - basicBand) * P('fin.higherRate');
  const ni = taxable * P('fin.niRate');
  const loan = Math.max(0, gross - P('fin.loanThreshold')) * P('fin.loanRate');
  const annualNet = gross - tax - ni - pension - loan;
  const sum = k => P(k).reduce((a, x) => a + (+x.amt || 0), 0);
  const bills = sum('fin.bills'), regular = sum('fin.regular'), savings = sum('fin.savings');
  const outgoings = bills + regular + savings;
  return {
    gross, taxable, tax, ni, pension, loan, annualNet, monthlyNet: annualNet / 12,
    bills, regular, savings, outgoings, nonSavings: bills + regular,
    yearlyLiving: (bills + regular) * 12, yearlySavings: savings * 12,
    unbudgeted: annualNet / 12 - outgoings,
    debtsTotal: P('fin.loans').reduce((a, l) => a + (+l.bal || 0), 0) + P('fin.cards').reduce((a, c) => a + (+c.bal || 0), 0)
  };
}
function invCalc(){
  const A = k => P('inv.accounts.' + k);
  const acc = {};
  ['isa', 'lisa', 'sipp', 'company', 'gia'].forEach(k => {
    const a = A(k);
    acc[k] = {value: +a.value, invested: +a.invested, monthly: +a.monthly,
      gain: +a.value - +a.invested, pct: +a.invested ? (+a.value - +a.invested) / +a.invested : 0,
      annual: +a.monthly * 12};
  });
  const nav = acc.isa.value + acc.lisa.value + acc.sipp.value;
  const invested = acc.isa.invested + acc.lisa.invested + acc.sipp.invested;
  const nonSpend = finCalc().nonSavings;
  return {
    acc, nav, invested, gain: nav - invested, pct: invested ? (nav - invested) / invested : 0,
    pensionSum: acc.sipp.value + acc.company.value,
    isaLeft: P('inv.isaAllow') - acc.isa.annual - acc.lisa.annual,
    lisaLeft: P('inv.lisaAllow') - acc.lisa.annual,
    sippLeft: P('inv.sippAllow') - acc.sipp.annual,
    emergencyTarget: nonSpend * P('inv.emergencyMonths'),
    accessible: acc.isa.value + acc.gia.value   /* ISA + GIA cash = the liquid wrappers */
  };
}
function bodyCalc(){
  const b = P('body');
  const wlog = LS.get('body.log.v1', []);
  const w = wlog.length ? wlog[wlog.length - 1].w : b.weight;
  const bf = (wlog.length && wlog[wlog.length - 1].bf) ? wlog[wlog.length - 1].bf : b.bf;
  const h = b.height, age = b.age;
  const fatMass = w * bf, lbm = w - fatMass;
  const bmi = w / (h * h) * 10000;
  const ffmi = lbm / (h * h) * 10000;
  const normFFMI = ffmi + 6.3 * (1.8 - h / 100);
  const rfm = 64 - 20 * (h / b.waist);
  const navy = 86.01 * Math.log10(Math.max(1, b.waist - b.neck)) - 70.041 * Math.log10(h) + 36.67;
  const inchesOver = Math.round(h / 2.54 - 60);
  const ibw = 50 + 2.3 * Math.max(0, inchesOver);
  const smm = 0.24 * w + 0.15 * h - 0.071 * age - 0.0004 * age * age + 2.7 - 14.2;
  const msj = 10 * w + 6.25 * h - 5 * age + 5;
  const kmca = 370 + 21.6 * lbm;
  const hb = 13.397 * w + 4.799 * h - 5.677 * age + 88.362;
  const bmrMid = [msj, kmca, hb].sort((x, y) => x - y)[1];
  const tdee = bmrMid * b.activity;
  const tef = tdee * 0.1;
  const neat = tdee - bmrMid - tef;
  const goalWeight = lbm / (1 - b.goalBF);
  const ffmiIdeal = (b.ffmiGoal * Math.pow(h / 100, 2)) / (1 - b.goalBF);
  const protein = b.proteinRatio * lbm;
  const fat = b.fatRatio * lbm;
  const maxDeficit = b.maxFatLossRate * fatMass;
  const minCal = tdee - maxDeficit;
  const targetCal = Math.max(tdee - b.deficit, minCal);
  const carbs = Math.max(0, (targetCal - protein * 4 - fat * 9) / 4);
  const water = b.waterRate * w;
  const weeklyG = b.deficit * 7 / 7700 * 1000;
  const weeks = weeklyG > 0 ? (w - goalWeight) / (weeklyG / 1000) : 0;
  const weeklyMaxG = maxDeficit * 7 / 7700 * 1000;
  const weeksMin = weeklyMaxG > 0 ? (w - goalWeight) / (weeklyMaxG / 1000) : 0;
  return {w, bf, h, age, fatMass, lbm, bmi, ffmi, normFFMI, rfm, navy, ibw, smm, msj, kmca, hb, bmrMid, tdee, tef, neat,
    goalWeight, ffmiIdeal, protein, fat, carbs, maxDeficit, minCal, targetCal, water, weeklyG, weeks, weeklyMaxG, weeksMin,
    bmiPrime: bmi / 25};
}

/* ---------------- cardio programme (progressive build) ---------------- */
function cardioWeek(){
  const start = LS.get('cardio.start.v1', null);
  let mon;
  if (start){ const p = start.split('-').map(Number); mon = new Date(p[0], p[1] - 1, p[2]); }
  else {
    mon = mondayOfToday();
    LS.set('cardio.start.v1', iso(mon));
  }
  const w = Math.floor((mondayOfToday() - mon) / (7 * 864e5)) + 1;
  return Math.max(1, w);
}
function mondayOfToday(){
  const t = today0();
  const d = new Date(t);
  d.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return d;
}
function cardioRx(type, w){
  w = w || cardioWeek();
  const deload = w % 8 === 0;
  const step = Math.floor((w - 1) / 2);
  const rest = w < 5 ? 90 : (w < 7 ? 75 : 60);
  if (type === 'Intervals'){
    const reps = deload ? 4 : Math.min(6 + step, 10);
    return {line: reps + ' × 60 s hard / ' + rest + ' s easy', reps, rest, work: 60};
  }
  if (type === 'Dashes'){
    const reps = deload ? 5 : Math.min(8 + step, 12);
    return {line: reps + ' × 30 s sprint / ' + rest + ' s rest', reps, rest, work: 30};
  }
  if (type === 'Zone 2 long'){
    const mins = deload ? 20 : Math.min(30 + step * 5, 45);
    return {line: mins + ' min easy — conversational', mins};
  }
  return null;
}
function cardioWeekMins(w){
  const i = cardioRx('Intervals', w), d = cardioRx('Dashes', w), l = cardioRx('Zone 2 long', w);
  return Math.round(10 + i.reps * (60 + i.rest) / 60 + 10 + d.reps * (30 + d.rest) / 60 + l.mins + 20);
}
function cardioPlan(){
  return LS.get('cardio.plan.v1', [
    {id: 'p1', day: 1, name: 'Treadmill dashes', type: 'Dashes', mins: 20, notes: 'Legs fresh after Monday’s rest: straddle-the-belt sprints, tall posture, fast not frantic.'},
    {id: 'p2', day: 2, name: 'Stairmaster intervals', type: 'Intervals', mins: 20, notes: 'The engine builder: hard steps at RPE 8, easy stepping between, 5 min warm and cool.'},
    {id: 'p3', day: 5, name: 'Incline-walk finisher', type: 'Zone 2', mins: 20, notes: 'Post-legs flush: 10–12% grade, 4.5–5.5 km/h, nasal breathing throughout.'},
    {id: 'p4', day: 6, name: 'Long easy recovery', type: 'Zone 2 long', mins: 30, notes: 'The gentlest session of the week, the day after legs: Z1–Z2 stroll, stairmaster low step or incline walk.'}
  ]);
}
function currWeight(){
  const log = LS.get('body.log.v1', []);
  if (log.length) return log[log.length - 1].w;
  return P('body.weight');
}
function cardioLog(){ return LS.get('cardio.log.v1', []); }
function mondayIndex(d){ return (d.getDay() + 6) % 7; }
function cardioToday(){
  return cardioPlan().filter(s => s.day === mondayIndex(new Date()));
}
const QUOTES = [
  ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius, Meditations'],
  ['The happiness of your life depends upon the quality of your thoughts.', 'Marcus Aurelius, Meditations'],
  ['You have power over your mind — not outside events. Realise this, and you will find strength.', 'Marcus Aurelius, Meditations'],
  ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius, Meditations'],
  ['Confine yourself to the present.', 'Marcus Aurelius, Meditations'],
  ['It is not that we have a short time to live, but that we waste much of it.', 'Seneca, On the Shortness of Life'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca, Moral Letters'],
  ['Difficulties strengthen the mind, as labour does the body.', 'Seneca, Moral Letters'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'after Aristotle, Nicomachean Ethics'],
  ['The beginning is the most important part of the work.', 'Plato, The Republic'],
  ['The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.', 'John Milton, Paradise Lost'],
  ['The life so short, the craft so long to learn.', 'Geoffrey Chaucer, The Canterbury Tales'],
  ['This above all: to thine own self be true.', 'William Shakespeare, Hamlet'],
  ['Though this be madness, yet there is method in’t.', 'William Shakespeare, Hamlet'],
  ['The journey of a thousand li begins beneath one’s feet.', 'Laozi, Tao Te Ching'],
  ['Knowing others is intelligence; knowing yourself is true wisdom.', 'Laozi, Tao Te Ching'],
  ['It does not matter how slowly you go, so long as you do not stop.', 'Confucius, Analects'],
  ['Victorious warriors win first and then go to war.', 'Sun Tzu, The Art of War'],
  ['There is no royal road to geometry.', 'Euclid, Elements'],
  ['Fortune favours the bold.', 'Virgil, The Aeneid'],
  ['Consider your origins: you were not made to live as brutes, but to follow virtue and knowledge.', 'Dante Alighieri, The Divine Comedy'],
  ['The greatest thing in the world is to know how to belong to oneself.', 'Michel de Montaigne, Essays'],
  ['Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above me and the moral law within me.', 'Immanuel Kant'],
  ['Nothing great in the world has been accomplished without passion.', 'G.W.F. Hegel'],
  ['Whereof one cannot speak, thereof one must be silent.', 'Ludwig Wittgenstein, Tractatus'],
  ['We can only see a short distance ahead, but we can see plenty there that needs to be done.', 'Alan Turing'],
  ['If I have seen further, it is by standing on the shoulders of giants.', 'Isaac Newton'],
  ['From so simple a beginning, endless forms most beautiful and most wonderful have been, and are being, evolved.', 'Charles Darwin, On the Origin of Species'],
  ['Character is destiny.', 'Heraclitus'],
  ['What we achieve inwardly will change outer reality.', 'after Plutarch, Parallel Lives'],
  ['Of all things that breathe and crawl upon the earth, nothing is more afflicted than man — and yet he sails on.', 'Homer, Odyssey'],
  ['Late have I loved you, beauty so old and so new.', 'Augustine, Confessions'],
  ['A nation that makes a great distinction between its scholars and its warriors will have its thinking done by cowards and its fighting done by fools.', 'attributed to Thucydides'],
  ['The oak fights the storm and breaks; the willow bends and survives — be the willow with a trunk of oak.', 'after the fables of Aesop'],
  ['Order is the shape upon which beauty depends.', 'Pearl S. Buck'],
  ['Discipline is the bridge between goals and accomplishment — walk it daily.', 'after Jim Rohn']
];
function mottoToday(){
  const days = Math.floor(today0().getTime() / 864e5);
  const q = QUOTES[((days % QUOTES.length) + QUOTES.length) % QUOTES.length];
  return '“' + q[0] + '” — ' + q[1];
}


/* ---------------- sandbox-proof form binding --------------------------
   Sandboxed previews (iframe without allow-forms) never fire `submit`,
   so every form is driven from button clicks and Enter keydowns too.   */
function bindForm(form, handler){
  if (!form) return;
  form.addEventListener('submit', e => { e.preventDefault(); handler(new FormData(form), e); });
  const btn = form.querySelector('[type=submit]');
  if (btn) btn.addEventListener('click', e => { e.preventDefault(); handler(new FormData(form), e); });
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT'){
      e.preventDefault();
      handler(new FormData(form), e);
    }
  });
}

/* ---------------- bloods panel (male, full count + hormones) ---------- */
const BLOODS = [
  ['Full blood count', [
    ['wbc', 'White cells (WBC)', '×10⁹/L', 4.0, 11.0], ['rbc', 'Red cells (RBC)', '×10¹²/L', 4.5, 6.0],
    ['hb', 'Haemoglobin', 'g/L', 130, 170], ['hct', 'Haematocrit', 'L/L', 0.40, 0.52],
    ['mcv', 'MCV', 'fL', 80, 100], ['mch', 'MCH', 'pg', 27, 33], ['mchc', 'MCHC', 'g/L', 320, 360],
    ['rdw', 'RDW', '%', 11.5, 14.5], ['plt', 'Platelets', '×10⁹/L', 150, 400],
    ['neut', 'Neutrophils', '×10⁹/L', 2.0, 7.5], ['lymp', 'Lymphocytes', '×10⁹/L', 1.0, 4.0],
    ['mono', 'Monocytes', '×10⁹/L', 0.2, 0.8], ['eos', 'Eosinophils', '×10⁹/L', 0.0, 0.4], ['baso', 'Basophils', '×10⁹/L', 0.0, 0.2]]],
  ['Metabolism & organs', [
    ['gluc', 'Glucose (fasting)', 'mmol/L', 4.0, 5.4], ['hba1c', 'HbA1c', 'mmol/mol', 20, 42],
    ['urea', 'Urea', 'mmol/L', 2.5, 7.8], ['creat', 'Creatinine', 'µmol/L', 60, 105],
    ['egfr', 'eGFR', 'mL/min', 90, null], ['na', 'Sodium', 'mmol/L', 135, 145],
    ['k', 'Potassium', 'mmol/L', 3.5, 5.0], ['cl', 'Chloride', 'mmol/L', 95, 105],
    ['co2', 'CO₂', 'mmol/L', 22, 29], ['ca', 'Calcium', 'mmol/L', 2.20, 2.60],
    ['mg', 'Magnesium', 'mmol/L', 0.70, 1.00], ['phos', 'Phosphate', 'mmol/L', 0.80, 1.40],
    ['alb', 'Albumin', 'g/L', 35, 50], ['tp', 'Total protein', 'g/L', 60, 80],
    ['bili', 'Bilirubin', 'µmol/L', 3, 21], ['alt', 'ALT', 'U/L', 10, 49],
    ['ast', 'AST', 'U/L', 10, 40], ['alp', 'ALP', 'U/L', 30, 130], ['ggt', 'GGT', 'U/L', 10, 70], ['ldh', 'LDH', 'U/L', 125, 220]]],
  ['Lipids', [
    ['tc', 'Total cholesterol', 'mmol/L', null, 5.0], ['ldl', 'LDL', 'mmol/L', 1.8, 3.4],
    ['hdl', 'HDL', 'mmol/L', 1.0, null], ['trig', 'Triglycerides', 'mmol/L', 0.5, 1.7],
    ['nonhdl', 'Non-HDL', 'mmol/L', 2.2, 4.0], ['ratio', 'TC : HDL ratio', 'ratio', null, 4.0]]],
  ['Hormones & thyroid', [
    ['tt', 'Total testosterone', 'nmol/L', 10, 30], ['ft', 'Free testosterone', 'pmol/L', 220, 440],
    ['shbg', 'SHBG', 'nmol/L', 18, 50], ['e2', 'Oestradiol', 'pmol/L', 40, 160],
    ['prol', 'Prolactin', 'mIU/L', 55, 360], ['lh', 'LH', 'IU/L', 1.5, 9.0], ['fsh', 'FSH', 'IU/L', 1.5, 12.0],
    ['dheas', 'DHEA-S', 'µmol/L', 2.9, 11.4], ['cort', 'Cortisol (08:00)', 'nmol/L', 140, 500],
    ['tsh', 'TSH', 'mIU/L', 0.4, 4.0], ['ft4', 'Free T4', 'pmol/L', 12, 22], ['ft3', 'Free T3', 'pmol/L', 3.1, 6.8],
    ['igf1', 'IGF-1', 'ng/mL', 116, 334]]],
  ['Vitamins & markers', [
    ['vitd', 'Vitamin D (25-OH)', 'nmol/L', 75, 150], ['b12', 'Vitamin B12', 'pmol/L', 140, 650],
    ['fol', 'Folate', 'µg/L', 3.0, 17.0], ['fer', 'Ferritin', 'µg/L', 30, 300],
    ['iron', 'Serum iron', 'µmol/L', 11, 30], ['tsat', 'Transferrin saturation', '%', 20, 50],
    ['crp', 'hs-CRP', 'mg/L', null, 3.0], ['hcy', 'Homocysteine', 'µmol/L', 5, 12]]]
];
function bloods(){ return LS.get('bloods.v1', {date: '', v: {}}); }
function bloodFlag(item, val){
  if (!val || val <= 0) return null;
  const lo = item[3], hi = item[4];
  if (lo != null && val < lo) return 'low';
  if (hi != null && val > hi) return 'high';
  return 'ok';
}
function bloodsLogged(){
  const b = bloods(); let n = 0, t = 0;
  BLOODS.forEach(g => g[1].forEach(it => { t++; if ((b.v[it[0]] || 0) > 0) n++; }));
  return {n, t};
}

/* ---------------- evening journal -------------------------------------- */
function journal(){ return LS.get('journal.v1', []); }
function journalToday(){ return journal().find(j => j.d === iso(new Date())); }

/* ---------------- full-text search across free text -------------------- */
function fulltext(q){
  const out = [];
  if (!q || q.length < 3) return out;
  const ql = q.toLowerCase();
  const hit = (text, kind, label, go) => {
    const t = String(text || '');
    const i = t.toLowerCase().indexOf(ql);
    if (i < 0) return;
    const snip = (i > 28 ? '…' : '') + t.slice(Math.max(0, i - 28), i + 52) + (i + 52 < t.length ? '…' : '');
    out.push({t: label, snip, s: kind, go});
  };
  journal().forEach(j => hit([j.win, j.fault, j.note].join(' · '), 'journal', 'Journal · ' + j.d, () => { location.hash = '#/dashboard'; }));
  places().forEach(p => { hit(p.eat, 'travel', p.place + ' · eat', () => { location.hash = '#/travel'; });
    hit(p.stay, 'travel', p.place + ' · stay', () => { location.hash = '#/travel'; });
    hit(p.do, 'travel', p.place + ' · do', () => { location.hash = '#/travel'; });
    hit(p.notes, 'travel', p.place + ' · notes', () => { location.hash = '#/travel'; }); });
  const c = LS.get('career.v1', {});
  ['asp', 'desires', 'values', 'strengths', 'weaknesses'].forEach(k => hit(c[k], 'career', 'Career · ' + k, () => { location.hash = '#/career'; }));
  LS.get('roles.v1', []).forEach(r => { hit(r.summary, 'career', r.title + ' · summary', () => { location.hash = '#/career'; }); (r.highlights || []).forEach(h => hit(h, 'career', r.title + ' · highlight', () => { location.hash = '#/career'; })); });
  hobbies().pursuits.forEach(p => hit(p.notes, 'hobbies', p.name + ' · notes', () => { location.hash = '#/hobbies'; }));
  hobbies().projects.forEach(p => hit(p.notes, 'hobbies', p.name + ' · project', () => { location.hash = '#/hobbies'; }));
  LS.get('network.v1', []).forEach(ct => { hit(ct.mentions, 'network', ct.person + ' · mentions', () => { location.hash = '#/network'; }); hit(ct.prefs, 'network', ct.person + ' · preferences', () => { location.hash = '#/network'; }); });
  LS.get('assets.v1', []).forEach(a => hit(a.where, 'estate', a.name + ' · notes', () => { location.hash = '#/estate'; }));
  cardioLog().forEach(e => hit(e.notes, 'cardio', 'Cardio · ' + e.d, () => { location.hash = '#/cardio'; }));
  liftLog().forEach(e => hit(e.notes, 'training', 'Lift · ' + e.ex + ' ' + e.d, () => { location.hash = '#/training'; }));
  return out.slice(0, 8);
}

/* ---------------- today's to-do's (fully day-adaptive) ------------------ */
function todayTodos(){
  const t0 = iso(new Date());
  const manual = key => { const m = LS.get('ttodo.' + t0, {}); return !!m[key]; };
  const items = [];
  const day = todayWorkout();
  if (!day.rest) items.push({id: 'lift', label: 'Lift — ' + day.name.split(' - ').slice(1).join(' - ') + ' (log every top set)', done: !!trainLog()[t0], auto: true});
  items.push({id: 'warm', label: 'At-home morning warm-ups (' + DATA.workouts.morning.items.length + ' moves)', done: manual('warm'), auto: false});
  cardioToday().forEach(c => {
    const rx = cardioRx(c.type);
    items.push({id: 'c' + c.id, label: 'Cardio — ' + c.name + (rx ? ': ' + rx.line : ': ' + c.mins + ' min'), done: cardioLog().some(e => e.d === t0 && e.notes === 'sid:' + c.id), auto: true});
  });
  const gp = groomProgress();
  if (gp.am.total) items.push({id: 'gam', label: 'Grooming — morning stack (' + gp.am.done + '/' + gp.am.total + ')', done: gp.am.done === gp.am.total, auto: true});
  if (gp.pm.total) items.push({id: 'gpm', label: 'Grooming — evening stack (' + gp.pm.done + '/' + gp.pm.total + ')', done: gp.pm.done === gp.pm.total, auto: true});
  const wlog = LS.get('body.log.v1', []);
  items.push({id: 'weigh', label: 'Weigh-in (morning, fasted)', done: wlog.some(e => e.d === t0), auto: true});
  const wt = bodyCalc().water;
  items.push({id: 'water', label: 'Water target (' + num(wt / 1000, 1) + ' L)', done: wt > 0 && waterToday() >= wt, auto: true});
  if (new Date().getDay() === 0){ const sh = shoeInfo(); items.push({id: 'shine', label: 'Shoe shine — ' + sh.shoe, done: manual('shine'), auto: false}); }
  items.push({id: 'journal', label: 'Evening line — one win, one fault, one note', done: !!journalToday(), auto: true});
  return items;
}

/* ---------------- personalisation -------------------------------------- */
const DUE_ORDER = ['training', 'cardio', 'grooming', 'nutrition', 'wardrobe', 'intellectuals'];
function dashCfg(){ return LS.get('dash.v1', {hidden: {}, order: [], compact: false, accent: 'seasonal'}); }
const ACCENTS = {
  seasonal: null,
  brass: ['#a8842c', '#c8a951'],
  oxblood: ['#7a2e2a', '#a3524c'],
  forest: ['#3f6b4a', '#6f9a7d']
};
function applyAccent(){
  const a = dashCfg().accent || 'seasonal';
  const pair = ACCENTS[a] || seasonAccent();
  document.documentElement.style.setProperty('--gold', pair[0]);
  document.documentElement.style.setProperty('--gold2', pair[1]);
}
function applyDensity(){
  document.body.classList.toggle('compact', !!dashCfg().compact);
}

/* ---------------- rings, heat, history, projections ------------------- */
function fmtClock(ms){
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(ss).padStart(2, '0');
}
function ring(pct, size, cls){
  size = size || 74;
  const r = size / 2 - 7, C = 2 * Math.PI * r;
  const col = cls === 'gold' ? 'var(--gold2)' : cls === 'green' ? 'var(--green)' : cls === 'red' ? 'var(--red)' : 'var(--navy-soft)';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + Math.round(pct) + '% complete">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + (r + 4) + '" fill="none" stroke="var(--line2)" stroke-width="1"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--bg-deep)" stroke-width="7"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (C * clamp(pct, 0, 100) / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
    '<text x="50%" y="54%" text-anchor="middle" font-family="Georgia,serif" font-size="' + (size / 4.4) + '" fill="var(--ink)">' + Math.round(pct) + '%</text></svg>';
}
function heatScoreMap(){
  /* one pass over storage instead of four lookups per day */
  const m = {};
  const bump = d => { m[d] = (m[d] || 0) + 1; };
  const tl = trainLog();
  Object.keys(tl).forEach(d => { if (tl[d]) bump(d); });
  cardioLog().forEach(e => bump(e.d));
  const am = groomFlat('am').length, pm = groomFlat('pm').length;
  const keys = [];
  try{
    for (let i2 = 0; i2 < localStorage.length; i2++){
      const k = localStorage.key(i2);
      if (k && k.indexOf('lifeos.') === 0) keys.push(k.slice(7));
    }
  }catch(e){}
  for (const k in mem) if (keys.indexOf(k) < 0) keys.push(k);
  keys.forEach(k => {
    if (k.indexOf('water.') === 0){ if (LS.get(k, 0) > 0) bump(k.slice(6)); }
    else if (k.indexOf('groom.') === 0){
      const g = LS.get(k, {});
      if ((g.am || []).filter(Boolean).length >= am && (g.pm || []).filter(Boolean).length >= pm) bump(k.slice(6));
    }
  });
  return m;
}
function prHistory(){
  const ev = [], best = {};
  liftLog().slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).forEach(e => {
    const cur = e1rm(e.w, e.r);
    if (!best[e.ex] || cur > best[e.ex]){ best[e.ex] = cur; ev.push({d: e.d, ex: e.ex, w: e.w, r: e.r, e1: cur}); }
  });
  return ev.reverse();
}
function empiricalTrend(){
  const log = LS.get('body.log.v1', []);
  if (log.length < 2) return null;
  const first = log[0], last = log[log.length - 1];
  const p1 = first.d.split('-').map(Number), p2 = last.d.split('-').map(Number);
  const days = (new Date(p2[0], p2[1] - 1, p2[2]) - new Date(p1[0], p1[1] - 1, p1[2])) / 864e5;
  if (days < 7) return null;
  return {perWeek: (last.w - first.w) / days * 7, days, from: first.w, to: last.w};
}
function seasonAccent(){
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return ['#a8942c', '#b9a542'];
  if (m >= 5 && m <= 7) return ['#b8860b', '#d1a53c'];
  if (m >= 8 && m <= 10) return ['#a8842c', '#c8a951'];
  return ['#9d8544', '#bfa46a'];
}

/* ---------------- edit-mode engine ------------------------------------ */
let EDIT = false;
function setEditMode(on){
  EDIT = on;
  document.body.classList.toggle('editing', on);
  const b = document.getElementById('edit-btn');
  if (b){
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (on) toast('Edit mode — click any gold-underlined value to change it. Everything derived recalculates at once.');
}
function openEditor(span){
  const path = span.dataset.p;
  const cur = P(path);
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'inline-edit';
  inp.value = (cur == null ? '' : cur);
  span.style.display = 'none';
  span.after(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = ok => {
    if (done) return;
    done = true;
    if (ok){
      const raw = String(inp.value).trim();
      const numv = parseFloat(raw.replace(',', '.'));
      const wasString = typeof cur === 'string';
      if (path.endsWith('.name') || wasString){ setP(path, raw); toast('Saved.'); }
      else if (raw !== '' && isFinite(numv)){ setP(path, numv); toast('Saved — every derived figure recalculated.'); }
      else toast('Not a number — value left unchanged.');
    }
    navigate();
  };
  inp.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') finish(true);
    else if (ev.key === 'Escape') finish(false);
  });
  inp.addEventListener('blur', () => finish(true));
}
function initEditEngine(){
  document.addEventListener('click', e => {
    if (!EDIT) return;
    const addB = e.target.closest('[data-padd]');
    if (addB){
      const path = addB.dataset.padd;
      const arr = (P(path) || []).slice();
      arr.push(path.indexOf('pots') >= 0 ? {name: 'New pot', p: 0} : {name: 'New item', amt: 0});
      setP(path, arr);
      navigate();
      return;
    }
    const delB = e.target.closest('[data-pdel]');
    if (delB){
      const bar = delB.dataset.pdel.indexOf('|');
      const path = delB.dataset.pdel.slice(0, bar), i = +delB.dataset.pdel.slice(bar + 1);
      const arr = (P(path) || []).slice();
      arr.splice(i, 1);
      setP(path, arr);
      navigate();
      return;
    }
    const span = e.target.closest('[data-p]');
    if (span && document.contains(span) && !span.querySelector('input')){ e.preventDefault(); openEditor(span); }
  });
}

/* ---------------- more adaptive helpers ------------------------------ */
function taxYearEnd(){
  const n = today0();
  let end = new Date(n.getFullYear(), 3, 5);           // 5 April, UK tax year
  if (n > end) end = new Date(n.getFullYear() + 1, 3, 5);
  return end;
}
function daysToTaxEnd(){ return Math.round((taxYearEnd() - today0()) / 864e5); }
function waterToday(){ return LS.get('water.' + iso(new Date()), 0); }
function addWater(ml){ LS.set('water.' + iso(new Date()), Math.max(0, waterToday() + ml)); return waterToday(); }
function groomStreak(){
  function completeAt(day){
    const st = LS.get('groom.' + iso(day), {});
    const a = (st.am || []).filter(Boolean).length, p = (st.pm || []).filter(Boolean).length;
    return a >= groomFlat('am').length && p >= groomFlat('pm').length;
  }
  const d = new Date(); let s = 0;
  if (!completeAt(d)) d.setDate(d.getDate() - 1);
  while (completeAt(d) && s < 366){ s++; d.setDate(d.getDate() - 1); }
  return s;
}
function parseDateish(s){
  if (!s) return null;
  let m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return {d: +m[3], mo: +m[2], y: +m[1]};
  m = String(s).match(/(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}))?/);
  if (m) return {d: +m[1], mo: +m[2], y: m[3] ? +m[3] : null};
  return null;
}
function nextOccurrence(pd){
  if (!pd || pd.mo < 1 || pd.mo > 12 || pd.d < 1 || pd.d > 31) return null;
  const t = today0();
  for (let y = t.getFullYear(); y <= t.getFullYear() + 1; y++){
    const cand = new Date(y, pd.mo - 1, pd.d);
    if (cand >= t) return {date: cand, days: Math.round((cand - t) / 864e5)};
  }
  return null;
}
function toast(msg, ms){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms || 6000);
}
function backupAgeDays(){
  const last = LS.get('lastExport.v1', null);
  if (!last) return null;
  const p = String(last).split('-').map(Number);
  return Math.round((today0() - new Date(p[0], p[1] - 1, p[2])) / 864e5);
}

/* ---------------- lift progression log -------------------------------- */
function liftLog(){ return LS.get('lifts.log.v1', []); }
function e1rm(w, r){ return r === 1 ? w : w * (1 + r / 30); }
function liftPR(ex){
  const es = liftLog().filter(e => e.ex === ex);
  if (!es.length) return null;
  let best = null, last = null;
  es.forEach(e => {
    if (!last || e.d >= last.d) last = e;
    if (!best || e1rm(e.w, e.r) > e1rm(best.w, best.r)) best = e;
  });
  return {best, last, e1: e1rm(best.w, best.r)};
}
function liftSetsThisWeek(){
  const mon = mondayOfToday();
  const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
  return liftLog().filter(e => {
    const p = e.d.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    return d >= mon && d < end;
  }).length;
}
function allLiftNames(){
  const out = [];
  DATA.workouts.days.forEach(d => d.exercises.forEach(e => { if (out.indexOf(e.n) < 0) out.push(e.n); }));
  return out;
}
function prescriptionFor(ex){
  for (const d of DATA.workouts.days) for (const e of d.exercises) if (e.n === ex) return e;
  return null;
}

/* ---------------- cardio engine metrics (male, clinical ranges) -------- */
function cardiomed(){ return LS.get('cardiomed.v1', {rhr: 0, hrmax: 0, hrr1: 0, sys: 0, dia: 0, vo2: 0}); }
function cardioMetrics(){
  const cm = cardiomed();
  const age = P('body.age');
  const hrmaxPred = 220 - age;
  const hrmax = cm.hrmax > 0 ? cm.hrmax : hrmaxPred;
  const reserve = (cm.rhr > 0 && cm.hrmax > 0) ? cm.hrmax - cm.rhr : null;
  const vo2 = cm.vo2 > 0 ? cm.vo2 : null;
  let cat = null;
  if (vo2){
    const bands = age < 30
      ? [[52.9, 'superior'], [42.5, 'excellent'], [36.5, 'good'], [33.0, 'fair'], [0, 'poor']]
      : age < 40
      ? [[49.4, 'superior'], [40.0, 'excellent'], [34.5, 'good'], [31.5, 'fair'], [0, 'poor']]
      : age < 50
      ? [[46.4, 'superior'], [38.0, 'excellent'], [33.0, 'good'], [30.0, 'fair'], [0, 'poor']]
      : [[43.4, 'superior'], [34.0, 'excellent'], [30.0, 'good'], [27.0, 'fair'], [0, 'poor']];
    cat = (bands.find(b => vo2 >= b[0]) || bands[bands.length - 1])[1];
  }
  const karvonen = (lo, hi) => reserve == null ? null :
    [Math.round(reserve * lo + cm.rhr), Math.round(reserve * hi + cm.rhr)];
  let bp = null;
  if (cm.sys > 0 && cm.dia > 0){
    bp = cm.sys >= 140 || cm.dia >= 90 ? 'high' : cm.sys >= 130 || cm.dia >= 85 ? 'high-normal' : cm.sys >= 120 || cm.dia >= 80 ? 'normal' : 'optimal';
  }
  const recovery = cm.hrr1 > 0 ? (cm.hrr1 >= 30 ? 'excellent' : cm.hrr1 >= 12 ? 'normal' : 'slow — worth mentioning') : null;
  const hrvBand = cm.hrv > 0 ? (cm.hrv < 20 ? 'low — recover harder' : cm.hrv <= 70 ? 'typical (20–70 ms)' : 'well recovered') : null;
  return {cm, hrmaxPred, hrmax, reserve, vo2, cat, karvonen, bp, recovery, hrvBand};
}

/* ---------------- sleep & readiness ------------------------------------ */
function sleepLog(){ return LS.get('sleep.v1', []); }
function sleepStats(){
  const log = sleepLog().slice(-7);
  if (!log.length) return null;
  const avgH = log.reduce((a, e) => a + (+e.h || 0), 0) / log.length;
  const avgQ = log.reduce((a, e) => a + (+e.q || 0), 0) / log.length;
  const target = P('body.sleepTarget');
  const score = Math.round(clamp(avgH / target, 0, 1) * 70 + (avgQ / 5) * 30);
  return {avgH, avgQ, score, n: log.length, target};
}
function readinessBand(s){
  if (!s) return null;
  return s.score >= 80 ? 'prime' : s.score >= 60 ? 'good' : s.score >= 40 ? 'caution' : 'rest';
}

/* ---------------- travel & documents ----------------------------------- */
function places(){ return LS.get('places.v1', []); }
function docs(){ return LS.get('docs.v1', {}); }
function setDocs(d){ LS.set('docs.v1', d); }
function passportDays(){
  const d = docs();
  const exp = d.passport && d.passport.expiry;
  if (!exp) return null;
  const p = String(exp).split('-').map(Number);
  if (p.length !== 3 || !p[0]) return null;
  return Math.round((new Date(p[0], p[1] - 1, p[2]) - today0()) / 864e5);
}
function journalListHtml(){
  const j = journal().slice(-7).reverse();
  if (!j.length) return '<p class="note">No lines yet. Tonight: one win, one fault, one note — thirty seconds, honestly kept.</p>';
  return j.map(e => '<div class="due-item" style="align-items:flex-start"><div><b>' + esc(e.d) + '</b> <span class="hint">· mood ' + e.mood + '/5</span>' +
    '<div class="note">' + (e.win ? '<span style="color:var(--green)">win:</span> ' + esc(e.win) + ' ' : '') + (e.fault ? '<span style="color:var(--rust)">fault:</span> ' + esc(e.fault) + ' ' : '') + (e.note ? '· ' + esc(e.note) : '') + '</div></div></div>').join('');
}


/* ---------------- the Sunday review ------------------------------------ */
function isoWeekNo(){
  const d = new Date();
  const t = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - t) / 864e5) + t.getDay() + 1) / 7);
}
function weekReview(){
  const mon = mondayOfToday(), t0 = today0();
  const inWeek = ds => { const p = String(ds).split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2]); return d >= mon && d <= t0; };
  const lifts = liftLog().filter(e => inWeek(e.d));
  const vol = lifts.reduce((a, e) => a + e.w * e.r, 0);
  const cardioMin = cardioLog().filter(e => inWeek(e.d)).reduce((a, e) => a + (+e.mins || 0), 0);
  const sessions = Object.keys(trainLog()).filter(inWeek).length;
  const sl = sleepLog().filter(e => inWeek(e.d));
  const avgH = sl.length ? sl.reduce((a, e) => a + (+e.h || 0), 0) / sl.length : null;
  const wls = LS.get('body.log.v1', []).filter(e => inWeek(e.d));
  const wDelta = wls.length >= 2 ? wls[wls.length - 1].w - wls[0].w : (wls.length === 1 ? 0 : null);
  const prs = [];
  const names = [];
  liftLog().forEach(e => { if (names.indexOf(e.ex) < 0) names.push(e.ex); });
  names.forEach(n => { const pr = liftPR(n); if (pr && inWeek(pr.best.d)) prs.push(n + ' ' + pr.best.w + '×' + pr.best.r); });
  let groomDays = 0;
  for (let d = new Date(mon); d <= t0; d.setDate(d.getDate() + 1)){
    const st = LS.get('groom.' + iso(d), {});
    if ((st.am || []).filter(Boolean).length >= groomFlat('am').length && (st.pm || []).filter(Boolean).length >= groomFlat('pm').length) groomDays++;
  }
  const hobN = (() => { try { return hobbies().pursuits.filter(p => p.last && inWeek(p.last)).length; } catch (e) { return 0; } })();
  const jw = journal().filter(e => inWeek(e.d));
  const moodAvg = jw.length ? jw.reduce((a, e) => a + (+e.mood || 3), 0) / jw.length : null;
  return {vol, sets: lifts.length, cardioMin, target: cardioWeekMins(cardioWeek()), sessions, avgH,
    readiness: sleepStats(), wDelta, prs, groomDays, hobN, jN: jw.length, moodAvg, days: Math.round((t0 - mon) / 864e5) + 1, weekNo: isoWeekNo()};
}
function reviewProse(R){
  const s = [];
  s.push(R.sessions
    ? R.sessions + ' lifting session' + (R.sessions > 1 ? 's' : '') + ' made the log — ' + (R.sets ? R.sets + ' sets totalling ' + Math.round(R.vol).toLocaleString('en-GB') + ' kg.' : 'though no sets were recorded.')
    : 'No lifting sessions made the log this week; the ledger does not judge, it records.');
  s.push(R.cardioMin >= R.target
    ? 'Cardio met the plan at ' + R.cardioMin + ' of ' + R.target + ' minutes.'
    : R.cardioMin ? 'Cardio reached ' + R.cardioMin + ' of ' + R.target + ' minutes — ' + (R.target - R.cardioMin) + ' shy.' : 'The cardio plan went unrung this week.');
  if (R.avgH) s.push('Sleep averaged ' + num(R.avgH, 1) + ' h' + (R.readiness ? ', for a readiness of ' + R.readiness.score + ' (' + readinessBand(R.readiness) + ')' : '') + '.');
  if (R.wDelta == null) s.push('No weigh-ins this week.');
  else if (R.wDelta < 0) s.push('Weight moved ' + num(Math.abs(R.wDelta), 1) + ' kg in the right direction.');
  else if (R.wDelta > 0) s.push('Weight crept ' + num(R.wDelta, 1) + ' kg — water or feast; the fortnight will tell.');
  else s.push('Weight held steady to the gram.');
  s.push(R.prs.length ? 'Personal records: ' + R.prs.join(', ') + '.' : 'No PRs this week — progression is patience.');
  s.push('Grooming complete on ' + R.groomDays + ' of ' + R.days + ' days.');
  if (R.hobN) s.push('Beyond the ledger: ' + R.hobN + ' pursuit' + (R.hobN > 1 ? 's' : '') + ' logged a session — a life, not a spreadsheet.');
  s.push(R.jN ? 'The evening line was kept on ' + R.jN + ' night' + (R.jN > 1 ? 's' : '') + ', average mood ' + num(R.moodAvg, 1) + ' of 5.' : 'The evening line went unwritten this week.');
  return s.join(' ');
}

function pdate(s){
  const p = String(s || '').split('-').map(Number);
  return (p.length === 3 && p[0] > 1900) ? new Date(p[0], p[1] - 1, p[2]) : null;
}

/* ---------------- tiny chart builders (inline SVG) ------------------- */
function barChart(vals, labels, target, w, h){
  w = w || 560; h = h || 130;
  const max = Math.max(target || 0, ...vals, 1) * 1.15;
  const bw = (w - 40) / vals.length;
  let out = '<svg width="' + w + '" height="' + (h + 26) + '" viewBox="0 0 ' + w + ' ' + (h + 26) + '">';
  if (target){
    const ty = h - (target / max) * h;
    out += '<line x1="30" y1="' + ty + '" x2="' + (w - 6) + '" y2="' + ty + '" stroke="var(--gold2)" stroke-dasharray="4 4" stroke-width="1"/>' +
           '<text x="' + (w - 6) + '" y="' + (ty - 4) + '" text-anchor="end" class="ax">target ' + target + ' min</text>';
  }
  vals.forEach((v, i) => {
    const bh = Math.max(2, (v / max) * h);
    const x = 30 + i * bw + bw * 0.18, y = h - bh;
    out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" fill="' + (v >= (target || 0) && target ? 'var(--green)' : 'var(--navy-soft)') + '"/>' +
      '<text x="' + (30 + i * bw + bw / 2).toFixed(1) + '" y="' + (h + 14) + '" text-anchor="middle" class="ax">' + labels[i] + '</text>' +
      (v ? '<text x="' + (30 + i * bw + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" class="val">' + v + '</text>' : '');
  });
  out += '<line x1="30" y1="' + h + '" x2="' + (w - 6) + '" y2="' + h + '" stroke="var(--line2)" stroke-width="1"/></svg>';
  return '<div class="chart">' + out + '</div>';
}
function lineChart(pts, w, h, targetVal, unit){
  w = w || 560; h = h || 150;
  if (!pts.length) return '';
  const vals = pts.map(p => p.v).concat(targetVal != null ? [targetVal] : []);
  const min = Math.min(...vals) - 0.6, max = Math.max(...vals) + 0.6;
  const X = i => 34 + (i / Math.max(1, pts.length - 1)) * (w - 48);
  const Y = v => h - ((v - min) / (max - min)) * h;
  let out = '<svg width="' + w + '" height="' + (h + 26) + '" viewBox="0 0 ' + w + ' ' + (h + 26) + '">';
  if (targetVal != null){
    out += '<line x1="34" y1="' + Y(targetVal).toFixed(1) + '" x2="' + (w - 14) + '" y2="' + Y(targetVal).toFixed(1) + '" stroke="var(--gold2)" stroke-dasharray="4 4" stroke-width="1"/>' +
      '<text x="' + (w - 14) + '" y="' + (Y(targetVal) - 5).toFixed(1) + '" text-anchor="end" class="ax">target ' + targetVal + (unit || '') + '</text>';
  }
  out += '<polyline fill="none" stroke="var(--navy-soft)" stroke-width="2" points="' +
    pts.map((p, i) => X(i).toFixed(1) + ',' + Y(p.v).toFixed(1)).join(' ') + '"/>';
  pts.forEach((p, i) => {
    out += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3" fill="var(--gold2)"><title>' + p.l + ': ' + p.v + (unit || '') + '</title></circle>';
  });
  out += '<text x="34" y="' + (h + 16) + '" class="ax">' + pts[0].l + '</text>' +
    '<text x="' + (w - 14) + '" y="' + (h + 16) + '" text-anchor="end" class="ax">' + pts[pts.length - 1].l + '</text>' +
    '<text x="2" y="12" class="ax">' + max.toFixed(1) + '</text><text x="2" y="' + h + '" class="ax">' + min.toFixed(1) + '</text>' +
    '</svg>';
  return '<div class="chart">' + out + '</div>';
}

/* ---------------- formatting helpers -------------------------------- */
function money(n, dec){
  if (n == null) return '—';
  dec = (dec == null) ? (Math.abs(n % 1) < 0.005 ? 0 : 2) : dec;
  const s = Math.abs(n).toLocaleString('en-GB', {minimumFractionDigits: dec, maximumFractionDigits: dec});
  return (n < 0 ? '−£' : '£') + s;
}
function money0(n){ return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', {maximumFractionDigits: 0}); }
function num(n, d){ d = (d == null ? 1 : d); return n.toLocaleString('en-GB', {minimumFractionDigits: d, maximumFractionDigits: d}); }
function pctv(n, d){ return ((n || 0) * 100).toFixed(d == null ? 1 : d) + '%'; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function iso(d){ const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function today0(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function dateLong(d){ return d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'}); }
function dateMed(d){ return d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}); }
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

/* ---------------- tiny view helpers ---------------------------------- */
function tile(k, v, s, cls){ return '<div class="tile ' + (cls || '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }
function bar(p, cls, slim){ return '<div class="bar ' + (cls || '') + (slim ? ' slim' : '') + '"><i style="width:' + clamp(p, 0, 100).toFixed(2) + '%"></i></div>'; }
function chip(t, cls){ return '<span class="chip ' + (cls || '') + '">' + t + '</span>'; }
function cardT(title, right){ return '<div class="card-t"><span>' + title + '</span>' + (right ? '<span>' + right + '</span>' : '') + '</div>'; }
function secHead(eyebrow, title, intro){
  return '<div class="sec-head"><div class="eyebrow">' + eyebrow + '</div><h3>' + title + '</h3>' + (intro ? '<p>' + intro + '</p>' : '') + '</div>';
}

/* ---------------- shared state readers ------------------------------- */
function currCounts(){
  const st = LS.get('curr.v1', {});
  let s = 0, h = 0;
  for (const k in st){ if (st[k]) { (k[0] === 's') ? s++ : h++; } }
  const sT = DATA.curriculum.stem.parts.reduce((a, p) => a + p.items.length, 0);
  const hT = DATA.curriculum.humanities.parts.reduce((a, p) => a + p.items.length, 0);
  return {stem: s, stemT: sT, hum: h, humT: hT, all: s + h, allT: sT + hT};
}
function facData(f){ return f === 'stem' ? DATA.curriculum.stem : DATA.curriculum.humanities; }
function currNextUndone(f){
  const st = LS.get('curr.v1', {});
  const fac = facData(f);
  const pre = f === 'stem' ? 's' : 'h';
  for (let p = 0; p < fac.parts.length; p++){
    const part = fac.parts[p];
    for (let i = 0; i < part.items.length; i++){
      if (!st[pre + '-' + p + '-' + i]) return {part: part.title, item: part.items[i], p, i};
    }
  }
  return null;
}
function wardAdded(){ return cached('wardrobe.added.v1', () => LS.get('wardrobe.added.v1', {})); }
function wardCats(){
  return cached('wardcats', () => {
    const add = wardAdded();
    return DATA.wardrobe.categories.map(c => ({name: c.name, items: c.items.concat(add[c.name] || [])}));
  });
}
function wardStatus(ci, ii){
  const o = cached('wardrobe.v1', () => LS.get('wardrobe.v1', {}));
  return o[ci + '-' + ii] || wardCats()[ci].items[ii].s;
}
function wardrobeCounts(){
  let O = 0, R = 0, M = 0, T = 0;
  wardCats().forEach((c, ci) => c.items.forEach((it, ii) => {
    const s = wardStatus(ci, ii);
    if (s === 'O') O++; else if (s === 'R') R++; else M++;
    T++;
  }));
  return {O, R, M, T, held: O + R, pct: (O + R) / T * 100};
}
function tasksState(){
  const st = LS.get('tasks.v1', {done: {}, custom: {now: [], future: []}});
  if (!st.custom) st.custom = {now: [], future: []};
  if (!st.done) st.done = {};
  const now = DATA.todos.now.map(t => ({id: slug(t), text: t, seed: true}))
    .concat(st.custom.now.map(c => ({id: c.id, text: c.text, seed: false, cycle: c.cycle || ''})));
  const future = DATA.todos.future.map(t => ({id: slug(t), text: t, seed: true}))
    .concat(st.custom.future.map(c => ({id: c.id, text: c.text, seed: false, cycle: c.cycle || ''})));
  return {st, now, future};
}
function groomFlat(which){
  const out = [];
  DATA.grooming[which].forEach(g => g.items.forEach(it => out.push({step: g.step, name: it})));
  return out;
}
function groomProgress(){
  const key = 'groom.' + iso(new Date());
  const st = LS.get(key, {});
  const res = {};
  ['am', 'pm'].forEach(w => {
    const flat = groomFlat(w);
    const arr = st[w] || [];
    const done = arr.filter(Boolean).length;
    res[w] = {done, total: flat.length};
  });
  return res;
}
function shoeInfo(){
  const rot = DATA.wardrobe.shoeRotation;
  const ref = new Date(2026, 7, 23); // Sunday 23 Aug 2026
  const t = today0();
  const day = t.getDay();
  const nextSun = new Date(t); nextSun.setDate(t.getDate() + ((7 - day) % 7));
  const weeks = Math.round((nextSun - ref) / (7 * 864e5));
  const idx = ((weeks % 3) + 3) % 3;
  return {shoe: rot.shoes[idx], idx, isSunday: day === 0, nextSun, shoes: rot.shoes};
}
function todayWorkout(){
  const d = new Date();
  return DATA.workouts.days[(d.getDay() + 6) % 7];
}
function trainLog(){ return LS.get('train.v1', {}); }

/* =====================================================================
   SECTION RENDERERS
   ===================================================================== */

/* ---------------- I · DASHBOARD -------------------------------------- */
function rDash(root){
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const day = todayWorkout();
  const cc = currCounts();
  const wk = wardrobeCounts();
  const ts = tasksState();
  const shoe = shoeInfo();
  const phase = h < 12 ? 'am' : 'pm';
  const gp = groomProgress();
  const F = finCalc(), IC = invCalc(), C = bodyCalc();
  const nut = C;

  const undoneNow = ts.now.filter(t => !ts.st.done[t.id]);
  const undoneFut = ts.future.filter(t => !ts.st.done[t.id]);
  const stemNext = currNextUndone('stem');
  const humNext = currNextUndone('hum');
  const flatG = groomFlat(phase);
  const gArr = (LS.get('groom.' + iso(now), {})[phase] || []);
  const sess = day.rest ? 'Rest day' : day.name.split(' - ').slice(1).join(' - ') + ' session';

  let html = '';
  /* adaptive context chips */
  const tlog = trainLog();
  const loggedToday = !!tlog[iso(now)];
  const ct = cardioToday();
  const wlog = LS.get('body.log.v1', []);
  const lastW = wlog.length ? wlog[wlog.length - 1] : null;
  const weighDue = !lastW || (today0().getTime() - new Date(+lastW.d.slice(0, 4), +lastW.d.slice(5, 7) - 1, +lastW.d.slice(8, 10)).getTime()) >= 7 * 864e5;
  const ctx = [];
  ctx.push(loggedToday ? ['✓ training logged', 1] : ['training: ' + (day.rest ? 'rest' : day.name.split(' - ')[1]), 0]);
  ctx.push(ct.length ? ['cardio: ' + ct.map(c => c.name).join(' + '), 0] : ['cardio: clear', 1]);
  ctx.push(weighDue ? ['weigh-in due', 0] : ['✓ weighed this week', 1]);
  ctx.push(gp[phase].done === gp[phase].total && gp[phase].total ? ['✓ ' + (phase === 'am' ? 'am' : 'pm') + ' routine complete', 1] : [gp[phase].done + '/' + gp[phase].total + ' ' + (phase === 'am' ? 'am' : 'pm') + ' routine', 0]);
  const bkAge = backupAgeDays();
  ctx.push(bkAge == null ? ['no backup yet — vault xiv', 0] : bkAge > 30 ? ['backup ' + bkAge + ' d old', 0] : ['✓ backed up ' + bkAge + ' d ago', 1]);
  ctx.push(['isa year ends in ' + daysToTaxEnd() + ' d', 0]);
  const rsD = sleepStats();
  if (rsD) ctx.push(['readiness ' + rsD.score + ' · ' + readinessBand(rsD), rsD.score >= 60 ? 1 : 0]);
  const beenN = places().filter(pl => pl.kind === 'Been').length;
  if (beenN) ctx.push([beenN + ' place' + (beenN > 1 ? 's' : '') + ' on the been list', 1]);
  const lp2 = leastPursued();
  if (lp2) ctx.push(['pursue: ' + lp2.name + (lp2.last ? ' (' + Math.round((today0() - pdate(lp2.last)) / 864e5) + ' d)' : ' (never)'), 0]);
  const pdD = passportDays();
  if (pdD != null && pdD < 270) ctx.push([pdD < 0 ? 'passport expired' : 'passport ' + pdD + ' d left', 0]);
  LS.get('network.v1', []).forEach(c => {
    const nx = nextOccurrence(parseDateish(c.dates));
    if (nx && nx.days <= 14) ctx.push([c.person + ' · ' + (nx.days === 0 ? 'today' : nx.days + ' d'), 0]);
  });

  /* hero */
  html += '<div class="hero">' +
    '<div class="greet">' + greet + ', <em>' + esc(DATA.profile.name) + '</em>.</div>' +
    '<div class="date">' + dateLong(now) + ' · ' + sess + '</div>' +
    '<div class="motto">' + mottoToday() + '</div>' +
    '<div class="ctx">' + ctx.map(c => '<span class="' + (c[1] ? 'done' : '') + '">' + esc(c[0]) + '</span>').join('') + '</div>' +
    '</div>';

  /* document watch */
  const expiring = [];
  const DD = docs();
  [['Passport', (DD.passport || {}).expiry], ['Driving licence', (DD.licence || {}).expiry]].forEach(x => {
    const dt = pdate(x[1]);
    if (dt){ const days = Math.round((dt - today0()) / 864e5); if (days < 270) expiring.push([x[0], days]); }
  });
  if (expiring.length){
    html += '<div class="card">' + cardT('Document watch', 'renewals inside the six-month rule') +
      '<div class="pill-row">' + expiring.map(x => chip(x[0] + ' · ' + (x[1] < 0 ? 'EXPIRED' : x[1] + ' d'), x[1] < 0 ? 'red' : 'r')).join('') +
      ' <a href="#/estate" style="font-size:12.5px">open the register →</a></div></div>';
  }

  /* tiles */
  html += '<div class="tiles">' +
    tile('Net worth (personal NAV)', money(IC.nav), 'vs ' + money0(IC.invested) + ' invested · <span class="up">+' + pctv(IC.pct) + '</span>') +
    tile('Pension (SIPP + company)', money0(IC.pensionSum), IC.acc.sipp.pct > 0 ? '<span class="up">+' + pctv(IC.acc.sipp.pct) + '</span> on capital in' : 'building', 'navy') +
    tile('House deposit (LISA)', money(IC.acc.lisa.value), (IC.acc.lisa.pct > 0 ? '<span class="up">+' + pctv(IC.acc.lisa.pct) + '</span>' : 'starting') + ' · allowance ' + money0(IC.lisaLeft) + ' left', 'navy') +
    tile('Accessible / emergency', money0(IC.accessible), '<span class="' + (IC.accessible >= IC.emergencyTarget ? 'up' : 'dn') + '">' + money0(IC.accessible) + ' of ' + money0(IC.emergencyTarget) + ' fund</span>', IC.accessible >= IC.emergencyTarget ? 'green' : 'red') +
    tile('Monthly net income', money(F.monthlyNet), 'unbudgeted ' + (F.unbudgeted >= 0 ? '+' : '') + money(F.unbudgeted) + '/mo', 'green') +
    tile('Total debt', money(F.debtsTotal), 'loans & cards combined', 'red') +
    tile('Weight', num(C.w, 1) + ' <small>kg</small>', 'target ' + num(C.ffmiIdeal) + ' kg · BF ' + num(C.bf * 100, 1) + '% → ' + (P('body.goalBF') * 100).toFixed(0) + '%' + (lastW ? ' · logged ' + lastW.d.slice(5) : '')) +
    tile('Normalised FFMI', num(C.normFFMI), 'target ' + P('body.ffmiGoal')) +
    tile('Wardrobe held', wk.held + '/' + wk.T, Math.round(wk.pct) + '% · ' + wk.O + ' owned · ' + wk.R + ' in restoration · ' + wk.M + ' wanted') +
    tile('Curriculum', cc.all + '/' + cc.allT, 'STEM ' + cc.stem + '/' + cc.stemT + ' · Humanities ' + cc.hum + '/' + cc.humT) +
    '</div>';

  /* consistency heatmap */
  (function(){
    const mon = mondayOfToday();
    const start = new Date(mon); start.setDate(mon.getDate() - 7 * 14);
    const scores = heatScoreMap();
    let cells = '';
    for (let d = new Date(start); d <= today0(); d.setDate(d.getDate() + 1)){
      const sc = scores[iso(d)] || 0;
      cells += '<i class="h' + sc + '" title="' + iso(d) + ' · ' + sc + ' of 4"></i>';
    }
    html += '<div class="card">' + cardT('Consistency · fifteen weeks', 'training · cardio · water · grooming') +
      '<div class="heat">' + cells + '</div>' +
      '<div class="heat-legend" style="margin-top:8px"><span>less</span><i style="background:var(--bg-deep);border:1px solid var(--line)"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>more · four ticks a day</span></div></div>';
  })();

  /* interday dues */
  if (now.getDay() === 0){
    const R = weekReview();
    html += '<div class="card">' + cardT('The Sunday Review', 'week ' + R.weekNo + ' · ' + R.days + ' days in the ledger') +
      '<p class="review-prose">' + reviewProse(R) + '</p>' +
      '<div class="stat-inline" style="margin-top:16px">' +
      '<span class="si">Lift volume<b>' + (R.vol ? Math.round(R.vol).toLocaleString('en-GB') + ' kg' : '—') + '</b></span>' +
      '<span class="si">Sets<b>' + (R.sets || '—') + '</b></span>' +
      '<span class="si">Cardio<b>' + R.cardioMin + '/' + R.target + ' min</b></span>' +
      '<span class="si">Sessions<b>' + R.sessions + '/5</b></span>' +
      '<span class="si">Sleep<b>' + (R.avgH ? num(R.avgH, 1) + ' h' : '—') + '</b></span>' +
      '<span class="si">Weight Δ<b>' + (R.wDelta == null ? '—' : (R.wDelta > 0 ? '+' : '') + num(R.wDelta, 1) + ' kg') + '</b></span>' +
      '<span class="si">PRs<b>' + R.prs.length + '</b></span>' +
      '<span class="si">Grooming<b>' + R.groomDays + '/' + R.days + '</b></span>' +
      '<div style="margin-top:14px"><button class="btn ghost sm" type="button" id="print-review">Print one-pager</button></div></div>';
    document.querySelectorAll('#review-print').forEach(x => x.remove());
    document.body.classList.add('has-review');
    document.body.insertAdjacentHTML('beforeend',
      '<div id="review-print"><h1>The Sunday Review</h1><div>' + dateLong(now) + ' · week ' + R.weekNo + '</div>' +
      '<h2>The week in prose</h2><p>' + reviewProse(R) + '</p>' +
      '<h2>The week in figures</h2><table>' +
      '<tr><td>Lift volume</td><td>' + (R.vol ? Math.round(R.vol).toLocaleString('en-GB') + ' kg across ' + R.sets + ' sets' : '—') + '</td></tr>' +
      '<tr><td>Lifting sessions</td><td>' + R.sessions + ' of 5</td></tr>' +
      '<tr><td>Cardio</td><td>' + R.cardioMin + ' of ' + R.target + ' minutes</td></tr>' +
      '<tr><td>Sleep</td><td>' + (R.avgH ? num(R.avgH, 1) + ' h average · readiness ' + (R.readiness ? R.readiness.score + ' (' + readinessBand(R.readiness) + ')' : '—') : '—') + '</td></tr>' +
      '<tr><td>Weight</td><td>' + (R.wDelta == null ? 'no weigh-ins' : (R.wDelta > 0 ? '+' : '') + num(R.wDelta, 1) + ' kg') + '</td></tr>' +
      '<tr><td>Personal records</td><td>' + (R.prs.length ? R.prs.join(', ') : 'none this week') + '</td></tr>' +
      '<tr><td>Grooming</td><td>' + R.groomDays + ' of ' + R.days + ' days complete</td></tr>' +
      '</table><p style="margin-top:14px;font-style:italic">The Life Organisation — personal compendium of ' + esc(DATA.profile.name) + '.</p></div>');
  } else {
    document.querySelectorAll('#review-print').forEach(x => x.remove());
    document.body.classList.remove('has-review');
  }
  const ttItems = todayTodos();
  const ttDone = ttItems.filter(x => x.done).length;
  html += '<div class="card">' + cardT('Today’s To Do’s', ttDone + '/' + ttItems.length + ' carried out · ' + dateLong(now).split(',')[0]) +
    '<div style="display:flex;gap:12px;align-items:center;margin:2px 0 10px">' + ring(ttItems.length ? ttDone / ttItems.length * 100 : 0, 58, ttDone === ttItems.length && ttItems.length ? 'green' : 'gold') +
    '<span class="hint">' + (ttDone === ttItems.length ? 'a clean sheet — go and read something' : (ttItems.length - ttDone) + ' still standing') + '</span></div>' +
    ttItems.map(it => '<label class="ck"><input type="checkbox" data-tt="' + it.id + '" ' + (it.done ? 'checked' : '') + (it.auto ? ' disabled' : '') + '><span class="box"></span><span class="tx">' + esc(it.label) + (it.auto ? '' : ' <span class="hint">· tap to tick</span>') + '</span></label>').join('') +
    '<p class="note" style="margin-top:10px">Ticks with “auto” follow their own logs; the rest are honest manual marks, reset each midnight.</p></div>';
  html += '<div class="sec-head" style="margin-top:6px"><div class="eyebrow">Interday Dues · what today owes you</div></div>';
  html += '<div class="today-grid">';

  /* training due */
  html += '<div class="card due-card' + (loggedToday ? ' due-done' : '') + '" data-due="training" style="margin-bottom:0"><div class="card-t due-toggle"><span>Training' + (loggedToday ? ' <span class="hint">✓ logged — tap to open</span>' : '') + '</span><span class="t-accent">' + esc(day.name) + '</span></div><div class="due-body">';
  if (day.rest){
    html += '<p style="font:italic 400 16px var(--serif);color:var(--ink2)">A rest day — recovery is part of the programme.</p>';
  } else {
    html += day.exercises.slice(0, 4).map(e => '<div class="due-item"><span>' + esc(e.n) + '</span><span class="amt">' + (e.w ? e.w + ' kg × ' + e.r : e.r + ' reps') + '</span></div>').join('');
    html += '<div class="due-item"><span style="color:var(--muted)">+ ' + (day.exercises.length - 4) + ' more exercises</span><span class="amt"></span></div>';
  }
  html += '<div class="due-item"><span>Morning warm-ups</span><span class="amt">' + DATA.workouts.morning.items.length + ' moves daily</span></div>';
  html += '<div class="due-item"><span>Progression log</span><span class="amt">' + liftSetsThisWeek() + ' sets this week</span></div>';
  const ctD = cardioToday();
  if (ctD.length) html += '<div class="due-item"><span>Cardio — ' + esc(ctD.map(c => c.name).join(' + ')) + '</span><span class="amt">' + ctD.reduce((a, c) => a + c.mins, 0) + ' min planned</span></div>';
  html += '<p style="margin-top:10px"><a href="#/training" style="font-size:12.5px">Open the training week →</a> · <a href="#/cardio" style="font-size:12.5px">cardio →</a></p></div></div>';

  /* cardio due — the programme, integrated */
  const ctList = cardioToday();
  const cLogToday = cardioLog().filter(e => e.d === iso(now));
  const ctDoneMin = ctList.length ? cLogToday.filter(e => ctList.some(c => c.id === (e.notes || '').replace('sid:', ''))).reduce((a, e) => a + (+e.mins || 0), 0) : 0;
  const ctPlannedMin = ctList.reduce((a, c) => a + (+c.mins || 0), 0);
  const ctDone = ctList.length > 0 && ctDoneMin >= ctPlannedMin;
  html += '<div class="card due-card' + (ctDone ? ' due-done' : '') + '" data-due="cardio" style="margin-bottom:0"><div class="card-t due-toggle"><span>Cardio' + (ctDone ? ' <span class="hint">✓ done — tap to open</span>' : '') + '</span><span class="t-accent">' + (ctList.length ? 'week ' + cardioWeek() + ' of the build' : 'clear today') + '</span></div><div class="due-body">' +
    (ctList.length ? '<div style="display:flex;gap:12px;align-items:center;margin:2px 0 8px">' + ring(ctPlannedMin ? ctDoneMin / ctPlannedMin * 100 : 0, 58, 'gold') + '<span class="hint">' + ctDoneMin + ' of ' + ctPlannedMin + ' min of today’s plan logged</span></div>' : '');
  if (ctList.length){
    ctList.forEach(s => {
      const rx = cardioRx(s.type);
      const done = cLogToday.some(e => e.notes === 'sid:' + s.id);
      html += '<div class="due-item" style="align-items:flex-start"><div><b>' + esc(s.name) + '</b> <span class="hint">· ' + esc(s.type) + '</span>' +
        (rx ? '<div class="note">' + esc(rx.line) + '</div>' : (s.notes ? '<div class="note">' + esc(s.notes) + '</div>' : '')) + '</div>' +
        '<span class="amt" style="text-align:right">' + s.mins + ' min<br>' + (done ? chip('done', 'o') : '<button class="linkbtn" data-cdone="' + s.id + '">mark done</button>') + '</span></div>';
    });
  } else {
    html += '<p style="font:italic 400 15px var(--serif);color:var(--muted)">Nothing on the cardio plan today — the build rests when the split rests.</p>';
  }
  html += '<div class="due-item"><span>Logged today</span><span class="amt">' + cLogToday.reduce((a, e) => a + (+e.mins || 0), 0) + ' min</span></div>';
  html += '<p style="margin-top:10px"><a href="#/cardio" style="font-size:12.5px">Open the cardio programme →</a></p></div></div>';

  /* skincare due */
  html += '<div class="card due-card' + (gp[phase].total && gp[phase].done === gp[phase].total ? ' due-done' : '') + '" data-due="grooming" style="margin-bottom:0"><div class="card-t due-toggle"><span>Grooming' + (gp[phase].total && gp[phase].done === gp[phase].total ? ' <span class="hint">✓ complete — tap to open</span>' : '') + '</span><span class="t-accent">' + (phase === 'am' ? 'Morning' : 'Evening') + ' routine</span></div><div class="due-body">';
  html += '<div style="display:flex;gap:12px;align-items:center;margin:2px 0 8px">' + ring(gp[phase].total ? gp[phase].done / gp[phase].total * 100 : 0, 58, 'gold') + '<span class="hint">' + gp[phase].done + ' of ' + gp[phase].total + ' steps done today</span></div>';
  html += '<div style="margin-top:12px">' + flatG.slice(0, 5).map((it, i) => '<div class="due-item"><span>' + (gArr[i] ? '✓ ' : '· ') + esc(it.name) + '</span><span class="amt">' + esc(it.step) + '</span></div>').join('') + '</div>';
  html += '<p style="margin-top:10px"><a href="#/grooming" style="font-size:12.5px">Open the grooming rituals →</a></p></div></div>';

  /* nutrition due */
  html += '<div class="card due-card' + (waterToday() >= C.water && C.water > 0 ? ' due-done' : '') + '" data-due="nutrition" style="margin-bottom:0"><div class="card-t due-toggle"><span>Nutrition' + (waterToday() >= C.water && C.water > 0 ? ' <span class="hint">✓ hydrated — tap to open</span>' : '') + '</span><span class="t-accent">Whole day</span></div><div class="due-body">';
  html += '<div class="pill-row">' +
    '<span class="pill"><b>' + num(nut.targetCal, 0) + '</b> kcal target</span>' +
    '<span class="pill"><b>' + num(nut.protein) + 'g</b> protein</span>' +
    '<span class="pill"><b>' + num(nut.carbs) + 'g</b> carbs</span>' +
    '<span class="pill"><b>' + num(nut.fat) + 'g</b> fat</span>' +
    '<span class="pill"><b>' + num(nut.water / 1000, 1) + ' L</b> water</span>' +
    '</div>';
  const dB = P('body.deficit');
  html += '<div class="due-item" style="margin-top:10px"><span>Balance</span><span class="amt">' + (dB > 0 ? 'CUT −' + dB : dB < 0 ? 'BUILD +' + (-dB) : 'MAINTAIN ±0') + ' kcal · ' + (dB >= 0 ? '~' + Math.round(nut.weeklyG) + ' g/wk loss' : '~' + Math.round(-nut.weeklyG) + ' g/wk gain') + '</span></div>';
  html += '<div class="due-item"><span>Maintenance (TDEE)</span><span class="amt">' + num(nut.tdee, 0) + ' kcal</span></div>';
  html += '<div class="due-item"><span>Water today</span><span class="amt">' + num(waterToday() / 1000, 2) + ' / ' + num(nut.water / 1000, 1) + ' L</span></div>';
  html += '<p style="margin-top:10px"><a href="#/body" style="font-size:12.5px">Open the physique report →</a></p></div></div>';

  /* wardrobe due */
  html += '<div class="card" style="margin-bottom:0" data-due="wardrobe"><div class="card-t"><span>Wardrobe</span><span class="t-accent">Shoe shining</span></div>';
  if (shoe.isSunday){
    html += '<p style="font:400 17px var(--serif)">Polish the <b>' + esc(shoe.shoe) + '</b> today.</p>';
  } else {
    html += '<p style="font-size:14px;color:var(--ink2)">Next rotation (' + dateMed(shoe.nextSun) + '): <b style="color:var(--ink)">' + esc(shoe.shoe) + '</b></p>';
  }
  html += '<div class="due-item" style="margin-top:8px"><span>Rotation</span><span class="amt">' + shoe.shoes.map((s, i) => i === shoe.idx ? '▸ ' + s : s).join(' · ') + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink2);margin:10px 0 6px"><span>Wardrobe held</span><span>' + wk.held + '/' + wk.T + '</span></div>';
  html += bar(wk.pct, 'green', true);
  html += '<p style="margin-top:10px"><a href="#/wardrobe" style="font-size:12.5px">Open the wardrobe book →</a></p></div>';

  /* intellectuals due */
  html += '<div class="card" style="margin-bottom:0" data-due="intellectuals"><div class="card-t"><span>Intellectuals</span><span class="t-accent">Daily learning</span></div>';
  if (stemNext) html += '<div class="due-item"><span>' + esc(stemNext.item) + '</span><span class="amt">STEM</span></div>';
  if (humNext) html += '<div class="due-item"><span>' + esc(humNext.item) + '</span><span class="amt">Humanities</span></div>';
  html += '<div class="due-item"><span>Progress</span><span class="amt">' + cc.stem + '/' + cc.stemT + ' · ' + cc.hum + '/' + cc.humT + '</span></div>';
  html += '<p style="margin-top:10px"><a href="#/curriculum" style="font-size:12.5px">Open the course of study →</a></p></div>';

  const cfg0 = dashCfg();
  const order0 = (cfg0.order && cfg0.order.length === DUE_ORDER.length) ? cfg0.order : DUE_ORDER;
  html += '<div style="display:flex;justify-content:flex-end;margin:-8px 0 16px"><button class="mini-btn" type="button" id="due-cust">customise this board</button></div>';
  html += '<div class="card" id="cust-panel" style="display:none">' + cardT('Board settings', 'saved in this browser') +
    '<div class="grid g2"><div>' + order0.map(id =>
      '<div class="due-item"><span>' + id + '</span><span class="amt" style="display:flex;gap:8px;align-items:center">' +
      '<label class="ck" style="padding:2px"><input type="checkbox" data-duehide="' + id + '" ' + (!(cfg0.hidden && cfg0.hidden[id]) ? 'checked' : '') + '><span class="box"></span></label>' +
      '<button class="linkbtn" data-dueup="' + id + '" title="earlier">↑</button><button class="linkbtn" data-duedown="' + id + '" title="later">↓</button></span></div>').join('') +
    '<p class="note" style="margin-top:8px">Untick to hide a card; arrows reorder the board.</p></div>' +
    '<div><label class="ck"><input type="checkbox" id="dens-ck" ' + (cfg0.compact ? 'checked' : '') + '><span class="box"></span><span class="tx">Compact density — tighter rows for small screens</span></label>' +
    '<div class="field" style="margin-top:14px"><label>Accent</label><select id="accent-sel">' + ['seasonal', 'brass', 'oxblood', 'forest'].map(a => '<option' + ((cfg0.accent || 'seasonal') === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>' +
    '<p class="note">Seasonal follows the year (brass each autumn); the others hold year-round. The key gate and navy masthead stay constant.</p></div></div></div>';

  html += '</div>'; /* /today-grid */

  /* financial snapshot strip */
  html += '<div class="card">' + cardT('Financial snapshot', 'live from your inputs · valuations ' + dateMed(new Date(DATA.asOf))) +
    '<div class="stat-inline">' +
    '<span class="si">Base salary<b>' + money0(F.gross) + '</b></span>' +
    '<span class="si">Annual net<b>' + money0(F.annualNet) + '</b></span>' +
    '<span class="si">Monthly outgoings<b>' + money0(F.outgoings) + '</b></span>' +
    '<span class="si">Savings / month<b>' + money0(F.savings) + '</b></span>' +
    '<span class="si">Savings / year<b>' + money0(F.yearlySavings) + '</b></span>' +
    '<span class="si">Cost of living / year<b>' + money0(F.yearlyLiving) + '</b></span>' +
    '<span class="si">ISA & LISA year ends<b>' + daysToTaxEnd() + ' days</b></span>' +
    '</div></div>';

  /* correspondence */
  html += '<div class="card">' + cardT('Correspondence') +
    '<div class="kv">' +
    '<dt>Email</dt><dd><a href="mailto:' + DATA.profile.email + '">' + esc(DATA.profile.email) + '</a></dd>' +
    '<dt>Telephone</dt><dd><a href="tel:' + DATA.profile.phone.replace(/[^+\d]/g, '') + '">' + esc(DATA.profile.phone) + '</a></dd>' +
    '<dt>LinkedIn</dt><dd><a href="' + DATA.profile.linkedin + '" target="_blank" rel="noopener">' + esc(DATA.profile.linkedinLabel) + '</a></dd>' +
    '</div>' +
    '<p class="note" style="margin-top:12px">Press <b>Ctrl/⌘ K</b> anywhere for the command palette — jump to any section, course, garment, contact or place.</p></div>';

  /* week-ahead ticks, journal, board customisation */
  root.addEventListener('change', e => {
    const tt = e.target.closest('[data-tt]');
    if (tt){
      const k = 'ttodo.' + iso(new Date());
      const m = LS.get(k, {});
      if (tt.checked) m[tt.dataset.tt] = true; else delete m[tt.dataset.tt];
      LS.set(k, m);
      navigate();
      return;
    }
    const dh = e.target.closest('[data-duehide]');
    if (dh){
      const c = dashCfg(); c.hidden = c.hidden || {};
      c.hidden[dh.dataset.duehide] = !dh.checked;
      LS.set('dash.v1', c); navigate(); return;
    }
    if (e.target.id === 'dens-ck'){
      const c = dashCfg(); c.compact = e.target.checked; LS.set('dash.v1', c); applyDensity(); return;
    }
    if (e.target.id === 'accent-sel'){
      const c = dashCfg(); c.accent = e.target.value; LS.set('dash.v1', c); applyAccent(); return;
    }
  });
  root.addEventListener('click', e => {
    if (e.target.closest('#due-cust')){
      const p = root.querySelector('#cust-panel');
      p.style.display = p.style.display === 'none' ? '' : 'none';
      return;
    }
    const up = e.target.closest('[data-dueup]'), dn = e.target.closest('[data-duedown]');
    if (up || dn){
      const id = up ? up.dataset.dueup : dn.dataset.duedown;
      const c = dashCfg();
      const ord = (c.order && c.order.length === DUE_ORDER.length) ? c.order.slice() : DUE_ORDER.slice();
      const ii = ord.indexOf(id);
      const jj = up ? ii - 1 : ii + 1;
      if (jj < 0 || jj >= ord.length) return;
      ord[ii] = ord[jj]; ord[jj] = id;
      c.order = ord; LS.set('dash.v1', c); navigate(); return;
    }
  });


  /* collapsing completed dues + print one-pager */
  root.addEventListener('click', e => {
    const tg = e.target.closest('.due-toggle');
    if (tg && !e.target.closest('a')){
      const card = tg.closest('.due-card');
      if (card) card.classList.toggle('expanded');
      return;
    }
    if (e.target.closest('#print-review')){ window.print(); return; }
  });

  /* the evening line */
  const jToday = journalToday();
  html += '<div class="card">' + cardT('The Evening Line', 'one line per night · feeds the Sunday Review') +
    '<form id="j-form"><div class="grid g4" style="gap:10px">' +
    '<div class="field"><label>Mood</label><select name="mood">' + [1, 2, 3, 4, 5].map(m => '<option' + (jToday && +jToday.mood === m ? ' selected' : m === 3 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Win of the day</label><input type="text" name="win" value="' + esc(jToday ? jToday.win : '') + '" placeholder="one true thing that went well"></div>' +
    '<div class="field"><label>Fault of the day</label><input type="text" name="fault" value="' + esc(jToday ? jToday.fault : '') + '" placeholder="one honest thing to mend"></div>' +
    '<div class="field"><label>Note</label><input type="text" name="note" value="' + esc(jToday ? jToday.note : '') + '" placeholder="anything worth keeping"></div>' +
    '</div><button class="btn gold sm" type="submit">Write tonight’s line</button></form>' +
    '<div id="j-list" style="margin-top:14px">' + journalListHtml() + '</div></div>';

  /* one-tap cardio logging from the dashboard */
  root.addEventListener('click', e => {
    const cd = e.target.closest('[data-cdone]');
    if (cd){
      const s = cardioPlan().find(x => x.id === cd.dataset.cdone);
      if (!s) return;
      const log = cardioLog();
      log.push({id: 'l' + Date.now().toString(36), d: iso(new Date()), type: s.type, mins: s.mins, rpe: null, notes: 'sid:' + s.id});
      LS.set('cardio.log.v1', log);
      toast(s.name + ' logged — ' + s.mins + ' min banked toward the week.');
      navigate();
    }
  });

  root.innerHTML = html;

  bindForm(root.querySelector('#j-form'), fd => {
    const list = journal().filter(j => j.d !== iso(new Date()));
    list.push({d: iso(new Date()), mood: +fd.get('mood'), win: fd.get('win').trim(), fault: fd.get('fault').trim(), note: fd.get('note').trim()});
    list.sort((a, b) => a.d < b.d ? -1 : 1);
    LS.set('journal.v1', list);
    toast('The evening line is written.');
    const jl = root.querySelector('#j-list');
    if (jl) jl.innerHTML = journalListHtml();
  });

  const cfgA = dashCfg();
  const orderA = (cfgA.order && cfgA.order.length === DUE_ORDER.length) ? cfgA.order : DUE_ORDER;
  root.querySelectorAll('[data-due]').forEach(el => {
    const id = el.dataset.due;
    el.style.order = String(Math.max(0, orderA.indexOf(id)));
    if (cfgA.hidden && cfgA.hidden[id]) el.style.display = 'none';
  });
}

/* ---------------- II · TASKS ------------------------------------------ */
function rTasks(root){
  function paint(){
    const ts = tasksState();
    const items = ts.now.concat(ts.future);
    const doneFn = t => {
      const dv = ts.st.done[t.id];
      if (!t.cycle) return !!dv;
      if (typeof dv !== 'string') return false;
      const dd = pdate(dv);
      return dd ? (today0() - dd) / 864e5 < (t.cycle === 'weekly' ? 7 : 30) : false;
    };
    const done = items.filter(doneFn).length;
    const listEl = root.querySelector('#tl-all');
    listEl.innerHTML = items.map(t =>
      '<label class="ck" data-list="all" data-id="' + t.id + '">' +
      '<input type="checkbox" ' + (doneFn(t) ? 'checked' : '') + '><span class="box"></span>' +
      '<span class="tx">' + esc(t.text) + '</span>' +
      (t.cycle ? '<span class="meta">' + chip(t.cycle + (doneFn(t) ? ' · done ' + String(ts.st.done[t.id]).slice(5) : ' · due'), doneFn(t) ? 'o' : 'r') + '</span>' : '') +
      (t.seed ? '' : '<button class="linkbtn del" data-del="' + t.id + '" data-list="' + (ts.now.indexOf(t) >= 0 ? 'now' : 'future') + '" title="Remove">✕</button>') +
      '</label>').join('') || '<p class="note">Nothing here.</p>';
    const cnt = root.querySelector('#tc-all');
    if (cnt) cnt.textContent = done + '/' + items.length + ' complete';
  }
  let html = secHead('Section XVI · Tasks', 'The Standing Orders',
    'One list, kept honestly: what can be done now and what is parked for later, together. Ticks persist in this browser; recurring items re-open on their cycle.');
  html += '<div class="card">' + cardT('Future to do & can do now', '<span class="t-accent" id="tc-all"></span>') + '<div id="tl-all"></div>' +
    '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><input type="text" id="add-all" placeholder="Add a task…" style="flex:1;min-width:160px;padding:8px 12px;border:1px solid var(--line2);border-radius:4px;background:var(--surface2)">' +
    '<select id="cyc-all" style="padding:8px 6px;border:1px solid var(--line2);border-radius:4px;background:var(--surface2)"><option value="">one-off</option><option value="weekly">weekly</option><option value="monthly">monthly</option></select>' +
    '<button class="btn sm" data-add="all">Add</button></div></div>';
  root.innerHTML = html;
  paint();

  root.addEventListener('change', e => {
    const ck = e.target.closest('label.ck');
    if (!ck) return;
    const ts = tasksState();
    const item = ts.now.concat(ts.future).find(t => t.id === ck.dataset.id);
    if (item && item.cycle){ if (e.target.checked) ts.st.done[item.id] = iso(new Date()); else delete ts.st.done[item.id]; }
    else if (e.target.checked) ts.st.done[ck.dataset.id] = true; else delete ts.st.done[ck.dataset.id];
    LS.set('tasks.v1', ts.st);
    paint();
  });
  root.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del){
      e.preventDefault();
      const ts = tasksState();
      const list = del.dataset.list;
      ts.st.custom[list] = ts.st.custom[list].filter(c => c.id !== del.dataset.del);
      delete ts.st.done[del.dataset.del];
      LS.set('tasks.v1', ts.st);
      paint();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add){
      const inp = root.querySelector('#add-all');
      const text = inp.value.trim();
      if (!text) return;
      const ts = tasksState();
      const cyc = root.querySelector('#cyc-all').value;
      ts.st.custom.future.push({id: slug(text) + '-' + Date.now().toString(36), text, cycle: cyc});
      LS.set('tasks.v1', ts.st);
      inp.value = '';
      paint();
    }
  });
  root.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'add-all') root.querySelector('[data-add="all"]').click();
  });
}

/* ---------------- III · FINANCES -------------------------------------- */
function rFin(root){
  const F = finCalc();
  const m0 = v => money0(v);
  const pc = v => (v * 100).toFixed(0) + '%';
  let html = secHead('Section II · Finances', 'The Ledger',
    'Salary to net, the monthly budget, the savings plan and the debt tracker. In edit mode (✎) every gold-underlined input is yours — tax, NI, pension and the loan all recompute from the rates.');

  html += '<div class="tiles">' +
    tile('Annual net income', money(F.annualNet), 'gross ' + money0(F.gross)) +
    tile('Monthly net income', money(F.monthlyNet), 'outgoings ' + money0(F.outgoings), 'navy') +
    tile('Unbudgeted income', money(F.unbudgeted) + '<small>/mo</small>', F.unbudgeted >= 0 ? 'slack in the system' : '<span class="dn">overspent</span>', F.unbudgeted >= 0 ? 'green' : 'red') +
    tile('Total debt', money(F.debtsTotal), 'loans & cards combined', 'red') +
    '</div>';

  html += '<div class="grid g-2-1">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('From gross to net', 'FY 2026/27 · live formulas') +
    '<table class="ledger"><tbody>' +
    '<tr><td>Gross base earnings</td><td class="num">' + pe('fin.gross', m0) + '</td></tr>' +
    '<tr class="sub"><td>Tax-free allowance</td><td class="num">−' + pe('fin.taxFree', m0) + '</td></tr>' +
    '<tr class="sub"><td>Pension contribution — tax-deductible <span class="hint">(relief at ' + pe('fin.pensionRate', pc) + ')</span></td><td class="num">−' + money0(F.pension) + '</td></tr>' +
    '<tr class="sub"><td><b>Taxable income</b></td><td class="num"><b>' + money0(F.taxable) + '</b></td></tr>' +
    '<tr><td>Income tax <span class="hint">@ ' + pe('fin.taxRate', pc) + ' (' + pe('fin.higherRate', pc) + ' above ' + pe('fin.higherThreshold', m0) + ')</span></td><td class="num neg">−' + money0(F.tax) + '</td></tr>' +
    '<tr><td>National insurance <span class="hint">@ ' + pe('fin.niRate', pc) + '</span></td><td class="num neg">−' + money(F.ni) + '</td></tr>' +
    '<tr><td>Pension contribution <span class="hint">@ ' + pe('fin.pensionRate', pc) + ' (SIPP) — already removed from taxable income above</span></td><td class="num neg">−' + money0(F.pension) + '</td></tr>' +
    '<tr><td>Student loan <span class="hint">@ ' + pe('fin.loanRate', pc) + ' above ' + pe('fin.loanThreshold', m0) + '</span></td><td class="num neg">−' + money(F.loan) + '</td></tr>' +
    '<tr class="total"><td>Annual net income</td><td class="num">' + money(F.annualNet) + '</td></tr>' +
    '<tr class="total"><td>Monthly net income</td><td class="num">' + money(F.monthlyNet) + '</td></tr>' +
    '</tbody></table></div>';

  html += '<div class="card" style="margin-bottom:0">' + cardT('Yearly savings plan', money0(F.yearlySavings) + ' / yr') +
    P('fin.savings').map((s, i) => '<div class="bar-row"><div class="lbl"><span>' + pe('fin.savings.' + i + '.name') + ' <button class="row-del" data-pdel="fin.savings|' + i + '">✕</button></span><b>' + pe('fin.savings.' + i + '.amt', m0) + '</b></div>' + bar(s.amt / Math.max(...P('fin.savings').map(x => x.amt), 1) * 100, 'gold') + '</div>').join('') +
    '<button class="row-add" data-padd="fin.savings">+ add saving</button>' +
    '<hr class="gold-rule">' +
    '<p class="note">Monthly savings ' + money0(F.savings) + ' — ' + Math.round(F.savings / F.outgoings * 100) + '% of all outgoings. Bonus log FY1 (Sep 2026 – Aug 2027): <b>' + money0(DATA.finances.bonusFY1.total) + '</b> recorded so far.</p>' +
    '</div>';
  html += '</div>';

  /* monthly outgoings */
  html += '<div class="card">' + cardT('Monthly outgoings', 'sum ' + money0(F.outgoings)) + '<div class="grid g3">';
  const groups = [['Bills & subscriptions', 'fin.bills', F.bills], ['Regular spending', 'fin.regular', F.regular], ['Savings', 'fin.savings', F.savings]];
  const maxItem = Math.max(...groups.flatMap(g => P(g[1]).map(x => +x.amt || 0)), 1);
  groups.forEach(g => {
    html += '<div><div style="font:400 11px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:10px">' + g[0] + ' · ' + money0(g[2]) + '</div>';
    html += P(g[1]).map((it, i) => '<div class="bar-row" style="grid-template-columns:1fr 90px"><div class="lbl"><span>' + pe(g[1] + '.' + i + '.name') + ' <button class="row-del" data-pdel="' + g[1] + '|' + i + '">✕</button></span><b>' + pe(g[1] + '.' + i + '.amt', m0) + '</b></div>' + bar(it.amt / maxItem * 100, g[0] === 'Savings' ? 'gold' : 'navy', true) + '</div>').join('');
    html += '<button class="row-add" data-padd="' + g[1] + '">+ add row</button></div>';
  });
  html += '</div>';
  html += '<hr class="gold-rule"><div class="stat-inline">' +
    '<span class="si">Savings<b>' + money0(F.savings) + '</b></span>' +
    '<span class="si">Non-savings spend<b>' + money0(F.nonSavings) + '</b></span>' +
    '<span class="si">Yearly cost of living<b>' + money0(F.yearlyLiving) + '</b></span>' +
    '<span class="si">Unbudgeted income<b>' + (F.unbudgeted >= 0 ? '+' : '') + money(F.unbudgeted) + '</b></span>' +
    '</div></div>';

  /* debt */
  const loans = P('fin.loans'), cards = P('fin.cards');
  html += '<div class="grid g2">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Loans', 'fixed-term debt') +
    '<table class="ledger"><thead><tr><th>Name</th><th class="num">Balance</th><th class="num">APR</th><th>History</th></tr></thead><tbody>' +
    loans.map((l, i2) => '<tr><td>' + pe('fin.loans.' + i2 + '.name') + ' <button class="row-del" data-pdel="fin.loans|' + i2 + '">✕</button></td>' +
      '<td class="num">' + pe('fin.loans.' + i2 + '.bal', v => money(v)) + '</td>' +
      '<td class="num">' + pe('fin.loans.' + i2 + '.apr', v => (v * 100).toFixed(1) + '%') + '</td>' +
      '<td class="hint">' + (l.initial ? 'opened at ' + money0(l.initial) + ' · <span style="color:var(--red)">grown ' + pctv(l.bal / l.initial - 1) + '</span>' : '—') + '</td></tr>').join('') +
    '</tbody></table>' +
    '<button class="row-add" style="visibility:visible" type="button" data-addloan>+ add loan</button>' +
    '<hr class="gold-rule">' +
    '<div class="field"><label>Projection loan</label><select id="proj-sel">' + loans.map((l, i2) => '<option value="' + i2 + '">' + esc(l.name) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Extra monthly overpayment — <b id="ex-val">' + money0(0) + '</b></label>' +
    '<input type="range" id="extra" min="0" max="600" step="10" value="0"></div>' +
    '<div id="proj" style="margin-top:6px"></div></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Credit cards', money0(cards.reduce((a, c) => a + (+c.bal || 0), 0)) + ' outstanding') +
    '<table class="ledger"><thead><tr><th>Account</th><th class="num">Balance</th><th class="num">Limit</th><th class="num">APR</th><th></th></tr></thead><tbody>' +
    cards.map((c, i2) => '<tr><td>' + pe('fin.cards.' + i2 + '.name') + ' <button class="row-del" data-pdel="fin.cards|' + i2 + '">✕</button></td>' +
      '<td class="num ' + (+c.bal === 0 ? 'pos' : '') + '">' + pe('fin.cards.' + i2 + '.bal', v => money0(v)) + '</td>' +
      '<td class="num">' + pe('fin.cards.' + i2 + '.limit', v => money0(v)) + '</td>' +
      '<td class="num">' + pe('fin.cards.' + i2 + '.apr', v => (v * 100).toFixed(1) + '%') + '</td><td></td></tr>').join('') +
    '</tbody></table>' +
    '<button class="row-add" style="visibility:visible" type="button" data-addcard>+ add card</button>' +
    '<p class="note" style="margin-top:12px">A card at £0 is a rule, not a balance: at ~29% APR it is the most expensive money available.</p></div>';
  html += '</div>';

  root.innerHTML = html;

  /* loan projection */
  const extra = root.querySelector('#extra'), proj = root.querySelector('#proj'), exVal = root.querySelector('#ex-val'), psel = root.querySelector('#proj-sel');
  function project(){
    const x = +extra.value;
    exVal.textContent = money0(x);
    const li = +psel.value;
    const L = P('fin.loans')[li] || {bal: 0, apr: 0};
    const bal0 = +L.bal || 0, apr0 = +L.apr || 0;
    const basePay = li === 0 ? F.loan / 12 : (+L.pay || 0);
    const mr = apr0 / 12, pay = basePay + x;
    let b = bal0, months = 0, interest = 0;
    while (b > 0 && months < 1200){ const i = b * mr; interest += i; b = b + i - pay; months++; }
    if (pay <= bal0 * mr){
      const grow12 = (() => { let bb = bal0; for (let m = 0; m < 12; m++) bb = bb * (1 + mr) - pay; return bb - bal0; })();
      proj.innerHTML = '<p class="note"><b style="color:var(--red)">Never repaid at this rate.</b> Interest of ' + money(bal0 * mr) + '/mo exceeds the payment; the balance would grow ≈ <b>' + money0(grow12) + '</b> over the next year. Break-even needs <b>' + money0(bal0 * mr - basePay) + '/mo</b> extra.</p>' +
        '<p class="note" style="margin-top:8px">Worth remembering: English Plan 5-style loans are wiped 40 years from the April after graduation regardless of balance — many treat the 9% deduction as a marginal tax rather than a debt to clear.</p>';
    } else {
      const yrs = Math.floor(months / 12), mo = months % 12;
      proj.innerHTML = '<p class="note"><b style="color:var(--green)">Cleared in ' + yrs + ' yr ' + mo + ' mo</b> (' + money0(pay) + '/mo total). Interest paid along the way: <b>' + money0(interest) + '</b>.</p>' +
        '<div style="margin-top:8px">' + bar(clamp((1 - months / 480) * 100, 2, 100), 'green', true) + '<p class="hint" style="margin-top:5px">vs. 40-year write-off horizon</p></div>';
    }
  }
  extra.addEventListener('input', project);
  psel.addEventListener('change', project);
  project();
  root.addEventListener('click', e => {
    if (e.target.closest('[data-addloan]')){
      const l = P('fin.loans').slice();
      l.push({name: 'New loan', bal: 0, apr: 0.05});
      setP('fin.loans', l);
      navigate();
      return;
    }
    if (e.target.closest('[data-addcard]')){
      const c = P('fin.cards').slice();
      c.push({name: 'New card', bal: 0, limit: 1000, apr: 0.29});
      setP('fin.cards', c);
      navigate();
    }
  });
}

/* ---------------- IV · INVESTMENTS ------------------------------------ */
const ALLOC_COLORS = ['#1e3a5f', '#c8a951', '#4a7a52', '#a96a2d', '#7d9cc6', '#8c5f78'];
function donut(parts, size, label, sub){
  const r = size / 2 - 10, C = 2 * Math.PI * r;
  let off = 0, segs = '';
  parts.forEach((p, i) => {
    const len = C * p.p;
    segs += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + ALLOC_COLORS[i % ALLOC_COLORS.length] + '" stroke-width="17" stroke-dasharray="' + (len - 1.5) + ' ' + (C - len + 1.5) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"></circle>';
    off += len;
  });
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + label + '">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface2)" stroke-width="17"></circle>' + segs +
    '<text x="50%" y="47%" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="var(--ink)">' + label + '</text>' +
    '<text x="50%" y="58%" text-anchor="middle" font-family="Consolas,monospace" font-size="9.5" letter-spacing="1.5" fill="var(--muted)">' + sub + '</text></svg>';
}
function stacked(parts){
  return '<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid var(--line)">' +
    parts.map((p, i) => '<div style="width:' + (p.p * 100) + '%;background:' + ALLOC_COLORS[i % ALLOC_COLORS.length] + '" title="' + esc(p.name) + ' ' + Math.round(p.p * 100) + '%"></div>').join('') + '</div>';
}
function legendRows(parts, withTicker){
  return parts.map((p, i) => '<div class="li"><span class="sw" style="background:' + ALLOC_COLORS[i % ALLOC_COLORS.length] + '"></span>' +
    '<span>' + esc(p.name) + (withTicker && p.ticker && p.ticker !== 'N/A' ? ' <span class="tk">' + esc(p.ticker) + '</span>' : '') + '</span>' +
    (p.cls ? '<span class="hint" style="margin-left:6px">' + esc(p.cls) + '</span>' : '') +
    '<span class="pc">' + Math.round(p.p * 100) + '%</span></div>').join('');
}

function rInv(root){
  const inv = DATA.investments;
  const IC = invCalc();
  const m0 = v => money0(v);
  const yrs = k => {
    const s = {isa: '2026-10-01', lisa: '2022-04-08', sipp: '2022-04-08'}[k];
    const p = s.split('-').map(Number);
    return Math.max(0.25, (new Date(DATA.asOf) - new Date(p[0], p[1] - 1, p[2])) / 365.25 / 864e5);
  };
  const annualised = k => {
    const a = IC.acc[k];
    return a.invested > 0 ? Math.pow(a.value / a.invested, 1 / yrs(k)) - 1 : 0;
  };
  let html = secHead('Section III · Investments', 'The Portfolio',
    'Five wrappers, one allocation each. In edit mode (✎) values, capital, monthly contributions, allowances and pots are all yours — gains, headroom and the emergency target recompute instantly.');

  html += '<div class="tiles">' +
    tile('Personal NAV', money(IC.nav), 'ISA · LISA · SIPP', 'navy') +
    tile('Capital invested', money0(IC.invested), 'across all accounts') +
    tile('Total gain', '+' + money(IC.gain), '<span class="up">+' + pctv(IC.pct) + '</span> all-time', 'green') +
    tile('Accessible NAV', money0(IC.accessible), IC.accessible > 0 ? 'ISA = the liquid wrapper' : '<span class="dn">everything is locked or invested</span>', IC.accessible > 0 ? '' : 'red') +
    '</div>';

  const rows = [
    ['ISA', 'isa', ''], ['LISA', 'lisa', 'House Deposit'], ['SIPP', 'sipp', 'Pension'],
    ['Company Pension', 'company', 'Pension'], ['GIA / Cash', 'gia', '']
  ];
  html += '<div class="card">' + cardT('Accounts overview', 'pension sum ' + money0(IC.pensionSum)) +
    '<div class="table-scroll"><table class="ledger"><thead><tr><th>Wrapper</th><th class="num">Value</th><th class="num">Invested</th><th class="num">Gain</th><th class="num">Monthly in</th><th>Allowance remaining <span class="hint">(after plan)</span></th></tr></thead><tbody>';
  rows.forEach(r => {
    const a = IC.acc[r[1]];
    let allow = '<span class="hint">n/a</span>';
    if (r[1] === 'isa') allow = '<div style="display:flex;align-items:center;gap:8px">' + bar((1 - IC.isaLeft / P('inv.isaAllow')) * 100, 'gold', true) + '<span class="hint" style="white-space:nowrap">' + money0(IC.isaLeft) + ' of ' + pe('inv.isaAllow', m0) + '</span></div>';
    if (r[1] === 'lisa') allow = '<div style="display:flex;align-items:center;gap:8px">' + bar((1 - IC.lisaLeft / P('inv.lisaAllow')) * 100, 'gold', true) + '<span class="hint" style="white-space:nowrap">' + money0(IC.lisaLeft) + ' of ' + pe('inv.lisaAllow', m0) + '</span></div>';
    if (r[1] === 'sipp') allow = '<div style="display:flex;align-items:center;gap:8px">' + bar((1 - IC.sippLeft / P('inv.sippAllow')) * 100, 'gold', true) + '<span class="hint" style="white-space:nowrap">' + money0(IC.sippLeft) + ' of ' + pe('inv.sippAllow', m0) + '</span></div>';
    html += '<tr><td><b>' + r[0] + '</b>' + (r[2] ? ' <span class="hint">· ' + r[2] + '</span>' : '') + '</td>' +
      '<td class="num">' + pe('inv.accounts.' + r[1] + '.value', v => money(v)) + '</td>' +
      '<td class="num">' + pe('inv.accounts.' + r[1] + '.invested', m0) + '</td>' +
      '<td class="num ' + (a.pct > 0 ? 'pos' : '') + '">' + (a.invested ? '+' + money(a.gain) + ' (' + pctv(a.pct) + ')' : '—') + '</td>' +
      '<td class="num">' + pe('inv.accounts.' + r[1] + '.monthly', m0) + '</td>' +
      '<td style="min-width:190px">' + allow + '</td></tr>';
  });
  html += '<tr class="total"><td>Pension sum (SIPP + company)</td><td class="num" colspan="5">' + money0(IC.pensionSum) + ' · personal ' + (inv.pensionRates.personal * 100) + '% + company ' + (inv.pensionRates.company * 100) + '% contributions</td></tr>';
  html += '</tbody></table></div>' +
    '<p class="note" style="margin-top:10px">Use-it-or-lose-it: the ISA and LISA allowances reset on 5 April — <b>' + daysToTaxEnd() + ' days</b> (' + dateMed(taxYearEnd()) + ').</p></div>';

  /* allocations */
  const giaM = IC.acc.gia.monthly;
  html += '<div class="grid g3">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('ISA target allocation', 'funds from Oct 2026') +
    '<div class="donut-wrap">' + donut(inv.isaTarget, 150, 'ISA', 'TARGET MODEL') +
    '<div class="legend">' + legendRows(inv.isaTarget, true) + '</div></div></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('LISA allocation', 'house deposit') +
    stacked(inv.lisaTarget) + '<div class="legend" style="margin-top:10px">' + legendRows(inv.lisaTarget, false) + '</div>' +
    '<hr class="gold-rule">' + cardT('SIPP allocation', '') +
    stacked(inv.sippTarget) + '<div class="legend" style="margin-top:10px">' + legendRows(inv.sippTarget, false) + '</div></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('GIA pots', money0(giaM) + '/mo to split') +
    '<table class="ledger"><thead><tr><th>Pot</th><th class="num">Share</th><th class="num">Monthly</th></tr></thead><tbody>' +
    P('inv.pots').map((p, i) => '<tr><td>' + pe('inv.pots.' + i + '.name') + ' <button class="row-del" data-pdel="inv.pots|' + i + '">✕</button></td><td class="num">' + pe('inv.pots.' + i + '.p', v => v + '%') + '</td><td class="num">' + money(giaM * p.p / 100) + '</td></tr>').join('') +
    '<tr class="total"><td>Total</td><td class="num">' + P('inv.pots').reduce((a, x) => a + x.p, 0) + '%</td><td class="num">' + money0(giaM) + '</td></tr></tbody></table>' +
    '<button class="row-add" data-padd="inv.pots">+ add pot</button>' +
    '<p class="note" style="margin-top:10px">All pots currently hold ' + money0(IC.acc.gia.value) + ' — funding begins with the October payroll.</p></div>';
  html += '</div>';

  /* emergency + benchmark */
  html += '<div class="grid g2" style="margin-top:20px">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Emergency fund', pe('inv.emergencyMonths', v => v + ' × monthly non-savings spend')) +
    '<div style="display:flex;align-items:baseline;gap:10px"><span style="font:400 30px var(--serif)">' + money0(IC.accessible) + '</span><span class="hint">of ' + money0(IC.emergencyTarget) + ' target</span></div>' +
    '<div style="margin:12px 0 8px">' + bar(IC.emergencyTarget ? IC.accessible / IC.emergencyTarget * 100 : 0, 'red') + '</div>' +
    '<p class="note">Target = ' + P('inv.emergencyMonths') + ' × ' + money0(finCalc().nonSavings) + ' of monthly non-savings spend, held in the ISA. Required today: <b>' + money0(IC.emergencyTarget - IC.accessible) + '</b> more.</p></div>';
  const lisaA = annualised('lisa'), sippA = annualised('sipp'), bench = P('inv.bench');
  html += '<div class="card" style="margin-bottom:0">' + cardT('Performance vs benchmark', '5-yr annualised all-world (VT): ' + pe('inv.bench', v => pctv(v, 2))) +
    '<div class="bar-row"><div class="lbl"><span>SIPP — annualised ' + pctv(sippA, 2) + '</span><b style="color:' + (sippA - bench >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (sippA - bench >= 0 ? '+' : '') + ((sippA - bench) * 100).toFixed(2) + ' pp</b></div>' + bar(60, sippA - bench >= 0 ? 'green' : 'red') + '</div>' +
    '<div class="bar-row"><div class="lbl"><span>LISA — annualised ' + pctv(lisaA, 2) + '</span><b style="color:' + (lisaA - bench >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (lisaA - bench >= 0 ? '+' : '') + ((lisaA - bench) * 100).toFixed(2) + ' pp</b></div>' + bar(35, lisaA - bench >= 0 ? 'green' : 'red') + '</div>' +
    '<div class="bar-row"><div class="lbl"><span>Benchmark (VT)</span><b>' + pctv(bench, 2) + '</b></div>' + bar(55, 'gold') + '</div>' +
    '</div>';
  html += '</div>';

  /* compound projection calculator */
  const defMonthly = IC.acc.isa.monthly + IC.acc.lisa.monthly + IC.acc.sipp.monthly + IC.acc.gia.monthly;
  html += '<div class="card" style="margin-top:20px">' + cardT('Projection calculator', 'illustrative · pre-inflation') +
    '<div class="grid g3" style="gap:24px">' +
    '<div class="field"><label>Years — <b id="pc-y">20</b></label><input type="range" id="pc-years" min="1" max="40" value="20"></div>' +
    '<div class="field"><label>Annual return — <b id="pc-r">7%</b></label><input type="range" id="pc-rate" min="0" max="12" step="0.5" value="7"></div>' +
    '<div class="field"><label>Monthly in — <b id="pc-m">' + money0(defMonthly) + '</b></label><input type="range" id="pc-monthly" min="0" max="3000" step="25" value="' + defMonthly + '"></div>' +
    '</div>' +
    '<div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-top:4px"><span style="font:400 36px var(--serif);color:var(--gold)" id="pc-fv"></span><span class="hint" id="pc-note"></span></div></div>';

  root.innerHTML = html;

  const pcY = root.querySelector('#pc-years'), pcR = root.querySelector('#pc-rate'), pcM = root.querySelector('#pc-monthly');
  function pcCalc(){
    const y = +pcY.value, rate = +pcR.value, m = +pcM.value;
    root.querySelector('#pc-y').textContent = y;
    root.querySelector('#pc-r').textContent = rate + '%';
    root.querySelector('#pc-m').textContent = money0(m);
    const i = rate / 100 / 12, n = y * 12;
    const fv = IC.nav * Math.pow(1 + i, n) + (i > 0 ? m * ((Math.pow(1 + i, n) - 1) / i) : m * n);
    root.querySelector('#pc-fv').textContent = money0(fv);
    root.querySelector('#pc-note').textContent = 'from ' + money0(IC.nav) + ' today + ' + money0(m * n) + ' of contributions over ' + y + ' years';
  }
  [pcY, pcR, pcM].forEach(el => el.addEventListener('input', pcCalc));
  pcCalc();
}

/* ---------------- V · WARDROBE ----------------------------------------- */
const wardUI = {cat: 'all', status: 'all', q: ''};
function rWard(root){
  const wk = wardrobeCounts();
  let html = secHead('Section IV · Wardrobe', 'The Wardrobe Book',
    'Every garment on the register: owned, in restoration, or still wanted. Tap any item to cycle its status.');

  html += '<div class="tiles" id="wk-tiles"></div>';

  html += '<div class="card"><div class="card-t"><span>Filters</span><span><button class="btn ghost sm" id="ward-reset">Restore sheet data</button></span></div>' +
    '<div class="tabs" id="cat-tabs"></div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
    '<div class="tabs" id="st-tabs" style="margin-bottom:0"></div>' +
    '<input type="text" id="ward-q" placeholder="Search the register…" value="' + esc(wardUI.q) + '" style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface2)">' +
    '</div></div>';

  html += '<div id="wgrid"></div>';

  html += '<div class="grid g3" style="margin-top:4px">';
  /* sizes */
  const SZ = P('ward.sizes');
  html += '<div class="card" style="margin-bottom:0">' + cardT('Sizes', 'the cutting table · editable with ✎') +
    '<div class="kv">' + Object.keys(SZ).map(k => '<dt>' + esc(k) + '</dt><dd><b>' + pe('ward.sizes.' + k) + '</b></dd>').join('') + '</div></div>';
  /* shoe care */
  const shoe = shoeInfo();
  html += '<div class="card" style="margin-bottom:0">' + cardT('Shoe care rotation', 'Sundays') +
    '<p class="note" style="margin-bottom:10px">A three-week cycle, per the dashboard formula. ' + (shoe.isSunday ? '<b style="color:var(--gold)">Today is Sunday — polish the ' + esc(shoe.shoe) + '.</b>' : 'Next polish: <b>' + dateMed(shoe.nextSun) + '</b>.') + '</p>' +
    shoe.shoes.map((s, i) => '<div class="due-item"><span>' + (i === shoe.idx ? '▸ <b>' : '') + esc(s) + (i === shoe.idx ? '</b>' : '') + '</span><span class="amt">' + ['week 1', 'week 2', 'week 3'][i] + '</span></div>').join('') +
    '</div>';
  html += '</div>';

  root.innerHTML = html;

  /* tiles paint */
  function paintTiles(){
    const w = wardrobeCounts();
    root.querySelector('#wk-tiles').innerHTML =
      tile('Held (owned + restoration)', w.held + '/' + w.T, Math.round(w.pct) + '% of the register', 'green') +
      tile('Owned', w.O, 'in the wardrobe', 'green') +
      tile('In restoration', w.R, 'at the cobbler, tailor & cleaner', 'rust') +
      tile('Wanted', w.M, 'acquisitions to make');
  }
  /* category tabs */
  function paintTabs(){
    const cats = wardCats();
    root.querySelector('#cat-tabs').innerHTML =
      '<button class="tab ' + (wardUI.cat === 'all' ? 'on' : '') + '" data-cat="all">All<span class="cnt">' + cats.reduce((a, c) => a + c.items.length, 0) + '</span></button>' +
      cats.map((c, i) => '<button class="tab ' + (wardUI.cat === i ? 'on' : '') + '" data-cat="' + i + '">' + esc(c.name) + '<span class="cnt">' + c.items.length + '</span></button>').join('');
    root.querySelector('#st-tabs').innerHTML =
      [['all', 'All'], ['O', 'Owned'], ['R', 'Restoration'], ['M', 'Wanted']].map(s =>
        '<button class="tab ' + (wardUI.status === s[0] ? 'on' : '') + '" data-st="' + s[0] + '">' + s[1] + '</button>').join('');
  }
  /* grid paint */
  function paintGrid(){
    const q = wardUI.q.toLowerCase();
    let out = '';
    wardCats().forEach((c, ci) => {
      if (wardUI.cat !== 'all' && wardUI.cat !== ci) return;
      const base = DATA.wardrobe.categories[ci].items.length;
      const items = c.items.map((it, ii) => ({it, ii, s: wardStatus(ci, ii), added: ii >= base})).filter(x => {
        if (wardUI.status !== 'all' && x.s !== wardUI.status) return false;
        if (q && x.it.n.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      const owned = c.items.filter((_, ii) => wardStatus(ci, ii) === 'O').length;
      const rest = c.items.filter((_, ii) => wardStatus(ci, ii) === 'R').length;
      out += '<div class="cat-block"><div class="cat-head"><h4>' + esc(c.name) + '</h4><div class="rule"></div>' +
        chip(owned + ' owned', 'o') + (rest ? chip(rest + ' restoration', 'r') : '') + chip(c.items.length + ' listed') +
        ' <button class="mini-btn" type="button" data-wadd="' + esc(c.name) + '">+ add</button></div>' +
        '<div class="ward-grid">' + items.map(x =>
          '<div class="ward-item s-' + x.s + '" data-ci="' + ci + '" data-ii="' + x.ii + '" title="Click to change status">' +
          '<span class="nm">' + esc(x.it.n) + (x.added ? ' <span class="hint">· yours</span>' : '') + '</span>' +
          '<span style="display:flex;gap:6px;align-items:center">' +
          (x.added ? '<button class="linkbtn del" data-wdel="' + esc(c.name) + '|' + esc(x.it.id || '') + '" title="Remove from the register">✕</button>' : '') +
          (x.s === 'O' ? chip('Owned', 'o') : x.s === 'R' ? chip('Restoration', 'r') : chip('Wanted', 'm')) +
          '</span></div>').join('') + '</div>' +
        (wardUI.adding === c.name
          ? '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px">' +
            '<input type="text" id="wadd-name" placeholder="Garment name…" style="flex:1;min-width:180px;padding:7px 2px;border:none;border-bottom:1px solid var(--line2);background:transparent">' +
            '<select id="wadd-status" style="padding:6px 2px;border:none;border-bottom:1px solid var(--line2);background:transparent">' +
            '<option value="O">Owned</option><option value="R">In restoration</option><option value="M">Wanted</option></select>' +
            '<button class="btn gold sm" type="button" data-wsave="' + esc(c.name) + '">Add to register</button>' +
            '<button class="btn ghost sm" type="button" data-wcancel>cancel</button></div>'
          : '') +
        '</div>';
    });
    root.querySelector('#wgrid').innerHTML = out || '<div class="card"><div class="empty-state"><div class="big">Nothing matches those filters.</div></div></div>';
    if (wardUI.adding){ const ni = root.querySelector('#wadd-name'); if (ni) ni.focus(); }
  }

  paintTiles(); paintTabs(); paintGrid();

  root.addEventListener('click', e => {
    const wadd = e.target.closest('[data-wadd]');
    if (wadd){ wardUI.adding = wardUI.adding === wadd.dataset.wadd ? null : wadd.dataset.wadd; paintGrid(); return; }
    if (e.target.closest('[data-wcancel]')){ wardUI.adding = null; paintGrid(); return; }
    const wsave = e.target.closest('[data-wsave]');
    if (wsave){
      const cat = wsave.dataset.wsave;
      const nm = (root.querySelector('#wadd-name').value || '').trim();
      if (!nm){ toast('Give the garment a name first.'); return; }
      const st = root.querySelector('#wadd-status').value;
      const add = wardAdded();
      add[cat] = (add[cat] || []).concat([{id: 'w' + Date.now().toString(36), n: nm, s: st}]);
      LS.set('wardrobe.added.v1', add);
      wardUI.adding = null;
      toast(nm + ' added to ' + cat + '.');
      paintTiles(); paintTabs(); paintGrid();
      return;
    }
    const wdel = e.target.closest('[data-wdel]');
    if (wdel){
      e.stopPropagation();
      const bar = wdel.dataset.wdel.indexOf('|');
      const cat = wdel.dataset.wdel.slice(0, bar), id = wdel.dataset.wdel.slice(bar + 1);
      if (confirm('Remove this garment from your register?')){
        const add = wardAdded();
        add[cat] = (add[cat] || []).filter(x => x.id !== id);
        LS.set('wardrobe.added.v1', add);
        paintTiles(); paintTabs(); paintGrid();
      }
      return;
    }
    const catB = e.target.closest('[data-cat]');
    if (catB){ wardUI.cat = catB.dataset.cat === 'all' ? 'all' : +catB.dataset.cat; paintTabs(); paintGrid(); return; }
    const stB = e.target.closest('[data-st]');
    if (stB){ wardUI.status = stB.dataset.st; paintTabs(); paintGrid(); return; }
    const it = e.target.closest('.ward-item');
    if (it && !e.target.closest('[data-wdel]')){
      const ci = +it.dataset.ci, ii = +it.dataset.ii;
      const cur = wardStatus(ci, ii);
      const next = cur === 'O' ? 'R' : cur === 'R' ? 'M' : 'O';
      const o = LS.get('wardrobe.v1', {});
      if (next === DATA.wardrobe.categories[ci].items[ii].s) delete o[ci + '-' + ii]; else o[ci + '-' + ii] = next;
      LS.set('wardrobe.v1', o);
      it.classList.add('flash');
      paintTiles(); paintGrid();
      return;
    }
    if (e.target.closest('#ward-reset')){
      if (confirm('Restore all wardrobe statuses to the original sheet data? Local edits to the register will be lost.')){
        LS.set('wardrobe.v1', {});
        paintTiles(); paintGrid();
      }
      return;
    }
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'ward-q'){ wardUI.q = e.target.value.trim(); paintGrid(); }
  });
  let wx0 = null;
  root.addEventListener('touchstart', e => { wx0 = e.touches[0].clientX; }, {passive: true});
  root.addEventListener('touchend', e => {
    if (wx0 == null) return;
    const dx = ((e.changedTouches[0] || {}).clientX || wx0) - wx0; wx0 = null;
    if (Math.abs(dx) < 60) return;
    const order = ['all'].concat(wardCats().map((c, i) => i));
    let i = order.indexOf(wardUI.cat);
    i = (i + (dx < 0 ? 1 : order.length - 1)) % order.length;
    wardUI.cat = order[i];
    paintTabs(); paintGrid();
  }, {passive: true});
}
/* ---------------- VI · CURRICULUM ------------------------------------- */
const currUI = {fac: 'stem', q: '', hideDone: false};
function splitCourseName(name, fac){
  if (fac === 'stem'){
    const m = name.match(/^([A-Za-z0-9.\-]*[0-9][A-Za-z0-9.\-]*)\s+(.*)$/);
    if (m && m[1].length < 14) return {code: m[1], rest: m[2]};
    return {code: null, rest: name};
  }
  const i = name.indexOf(' - ');
  if (i > 0) return {code: name.slice(0, i), rest: name.slice(i + 3)};
  return {code: null, rest: name};
}
function rCurr(root){
  const st = LS.get('curr.v1', {});

  function facultyTotal(f){
    return facData(f).parts.reduce((a, p) => a + p.items.length, 0);
  }
  function facultyDone(f){
    const pre = f === 'stem' ? 's' : 'h';
    let n = 0; for (const k in st) if (st[k] && k[0] === pre) n++;
    return n;
  }

  let html = secHead('Section V · Curriculum', 'The Course of Study',
    'Two lifelong syllabuses from the Intellectuals sheet: the MIT OpenCourseWare STEM track (184 courses in six parts) and the humanities reading list (71 works in six parts). Tick items as you complete them — progress is saved in this browser.');

  html += '<div class="tiles" id="curr-tiles"></div>';
  html += '<div class="card"><div class="card-t"><span>Faculty &amp; filters</span><span class="hint">click a title to see only that part</span></div>' +
    '<div class="tabs" id="fac-tabs">' +
    '<button class="tab" data-fac="stem">STEM Development<span class="cnt" id="fc-stem"></span></button>' +
    '<button class="tab" data-fac="hum">Humanities Development<span class="cnt" id="fc-hum"></span></button>' +
    '</div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
    '<input type="text" id="curr-q" placeholder="Search courses, authors, titles…" value="' + esc(currUI.q) + '" style="flex:1;min-width:220px;padding:8px 12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface2)">' +
    '<button class="tab" id="hide-done">Hide completed</button>' +
    '</div></div>';
  html += '<div id="curr-parts"></div>';

  root.innerHTML = html;

  function paintTiles(){
    const s = facultyDone('stem'), sT = facultyTotal('stem');
    const h2 = facultyDone('hum'), hT = facultyTotal('hum');
    root.querySelector('#curr-tiles').innerHTML =
      tile('STEM development', s + ' / ' + sT, pctv(s / sT, 1) + ' complete · six parts', 'navy') +
      tile('Humanities development', h2 + ' / ' + hT, pctv(h2 / hT, 1) + ' complete · six parts') +
      tile('Whole curriculum', (s + h2) + ' / ' + (sT + hT), 'a twenty-year syllabus', 'gold');
    root.querySelector('#fc-stem').textContent = s + '/' + sT;
    root.querySelector('#fc-hum').textContent = h2 + '/' + hT;
    document.querySelectorAll('#fac-tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.fac === currUI.fac));
  }

  function paintParts(){
    const f = currUI.fac, pre = f === 'stem' ? 's' : 'h';
    const parts = facData(f).parts;
    const q = currUI.q.toLowerCase();
    let out = '';
    parts.forEach((p, pi) => {
      const rows = p.items.map((name, ii) => {
        const key = pre + '-' + pi + '-' + ii;
        const done = !!st[key];
        const sp = splitCourseName(name, f);
        const hay = name.toLowerCase();
        if (q && hay.indexOf(q) < 0) return '';
        if (currUI.hideDone && done) return '';
        return '<label class="ck"><input type="checkbox" data-ck="' + key + '" ' + (done ? 'checked' : '') + '><span class="box"></span>' +
          '<span class="tx">' + (sp.code ? '<span class="course-code">' + esc(sp.code) + '</span>' : '') + esc(sp.rest) + '</span></label>';
      }).join('');
      const doneN = p.items.filter((_, ii) => st[pre + '-' + pi + '-' + ii]).length;
      if (q || currUI.hideDone){ if (!rows) return; }
      out += '<div class="part-card" style="margin-bottom:18px">' +
        '<div class="part-head"><h4>' + esc(p.title) + '</h4><div style="flex:1;min-width:120px;max-width:260px">' + bar(doneN / p.items.length * 100, 'gold', true) + '</div><span class="prog" id="pc-' + pre + '-' + pi + '">' + doneN + ' / ' + p.items.length + '</span></div>' +
        '<div class="part-body"><div class="course-list">' + (rows || '<p class="note">Nothing matches.</p>') + '</div></div></div>';
    });
    root.querySelector('#curr-parts').innerHTML = out || '<div class="card"><div class="empty-state"><div class="big">Every item is done. Extraordinary.</div></div></div>';
  }

  paintTiles(); paintParts();

  root.addEventListener('click', e => {
    const fb = e.target.closest('[data-fac]');
    if (fb){ currUI.fac = fb.dataset.fac; paintTiles(); paintParts(); return; }
    if (e.target.id === 'hide-done'){
      currUI.hideDone = !currUI.hideDone;
      e.target.classList.toggle('on', currUI.hideDone);
      paintParts();
      return;
    }
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'curr-q'){ currUI.q = e.target.value.trim(); paintParts(); }
  });
  root.addEventListener('change', e => {
    const ck = e.target.closest('[data-ck]');
    if (!ck) return;
    const key = ck.dataset.ck;
    if (ck.checked) st[key] = true; else delete st[key];
    LS.set('curr.v1', st);
    const m = key.match(/^([sh])-(\d+)-/);
    const pc = root.querySelector('#pc-' + m[1] + '-' + m[2]);
    if (pc){
      const p = DATA.curriculum[m[1] === 's' ? 'stem' : 'humanities'].parts[+m[2]];
      const doneN = p.items.filter((_, ii) => st[m[1] + '-' + m[2] + '-' + ii]).length;
      pc.textContent = doneN + ' / ' + p.items.length;
      pc.closest('.part-head').querySelector('.bar i').style.width = (doneN / p.items.length * 100) + '%';
    }
    paintTiles();
  });
}

/* ---------------- VII · TRAINING --------------------------------------- */
const trainUI = {day: null};
function rTrain(root){
  const log = trainLog();
  const t0 = today0();
  if (trainUI.day == null) trainUI.day = (t0.getDay() + 6) % 7;

  let html = secHead('Section VI · Training', 'The Training Week',
    'The split as you re-racked it for the new gym — chest &amp; tris Tuesday, back &amp; bis Wednesday, core Thursday, legs Saturday, shoulders Sunday, with Monday and Friday for repose — plus the daily at-home warm-ups and the overload rule-book.');

  html += '<div class="card">' + cardT('This week', 'sessions logged') + '<div class="day-dots" id="week-strip"></div>' +
    '<p class="note" style="margin-top:12px">Mark a session complete on its day card; the dot here fills in. History is kept in this browser.</p></div>';

  html += '<div class="tabs" id="day-tabs"></div>';
  html += '<div class="grid g-2-1">';
  html += '<div id="day-card"></div>';
  html += '<div>' +
    '<div class="card">' + cardT(DATA.workouts.morning.title, DATA.workouts.morning.sub) +
    DATA.workouts.morning.items.map(m => '<div class="due-item"><span>' + esc(m[0]) + '</span><span class="amt">' + m[1] + ' reps</span></div>').join('') +
    '<p class="note" style="margin-top:10px">Performed daily, before the day begins.</p></div>' +
    '<div class="card">' + cardT('Cardio today', 'from section VII') +
    (cardioToday().length ? cardioToday().map(s => {
      const rx = cardioRx(s.type);
      return '<div class="due-item"><span><b>' + esc(s.name) + '</b>' + (rx ? '<div class="note" style="color:var(--gold)">' + esc(rx.line) + '</div>' : '') + '</div><span class="amt">' + s.mins + ' min</span></div>';
    }).join('') : '<p class="note">No cardio today — the four days are Tue, Wed, Sat &amp; Sun.</p>') +
    '<p style="margin-top:10px"><a href="#/cardio" style="font-size:12.5px">Open the cardio programme →</a></p></div>' +
    '</div>';
  html += '</div>';

  /* progressive overload rule-book */
  html += '<div class="card">' + cardT('Progressive overload', '') +
    '<table class="ledger"><tbody>' +
    '<tr><td><b>Lifts</b></td><td>When every set hits the top of its rep band with 1–2 reps left in reserve: <b>+2.5 kg</b> upper-body, <b>+5 kg</b> lower-body next session.</td></tr>' +
    '<tr><td><b>Core & bodyweight</b></td><td>+2 reps per week to the top of the band, then add load (plate or vest) and drop back to the bottom of the band.</td></tr>' +
    '<tr><td><b>Cardio — quality</b></td><td>Reps first, then shorter recovery — the scheme is written under each session in Section VII.</td></tr>' +
    '<tr><td><b>Cardio — easy</b></td><td>Grade or minutes up a notch per fortnight; the heart-rate ceiling stays in Zone 2.</td></tr>' +
    '<tr><td><b>Deload</b></td><td>Every 8th week halves volume across the board — the jump after it is where the gain shows.</td></tr>' +
    '</tbody></table>' +
    '<p class="note" style="margin-top:10px">Log every top set in the progression log below; the PR table’s cue column tells you the moment a rule fires.</p></div>';

  /* recovery & readiness + progression log */
  html += '<div class="grid g2" style="margin-top:20px">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Recovery & readiness', '7-night sleep average') +
    '<div id="readout"></div>' +
    '<form id="sleep-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Date</label><input type="date" name="d" value="' + iso(new Date()) + '"></div>' +
    '<div class="field"><label>Hours slept</label><input type="text" name="h" inputmode="decimal" placeholder="7.5" required></div>' +
    '<div class="field"><label>Quality 1–5</label><select name="q">' + [1, 2, 3, 4, 5].map(q => '<option' + (q === 3 ? ' selected' : '') + '>' + q + '</option>').join('') + '</select></div>' +
    '</div><button class="btn gold sm" type="submit">Log night</button></form>' +
    '<div id="sleep-table" style="margin-top:12px"></div></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Progression log', 'PRs by estimated 1-rep max (Epley)') +
    '<form id="lift-form"><div class="grid g4" style="gap:10px">' +
    '<div class="field" style="grid-column:span 2"><label>Exercise</label><select name="ex">' +
    DATA.workouts.days.filter(d => !d.rest).map(d => '<optgroup label="' + esc(d.name) + '">' + d.exercises.map(e => '<option>' + esc(e.n) + '</option>').join('') + '</optgroup>').join('') +
    '</select></div>' +
    '<div class="field"><label>Weight (kg)</label><input type="text" name="w" inputmode="decimal" placeholder="55" required></div>' +
    '<div class="field"><label>Reps</label><input type="text" name="r" inputmode="numeric" placeholder="8" required></div>' +
    '</div><div class="grid g2" style="gap:10px"><div class="field"><label>Date</label><input type="date" name="d" value="' + iso(new Date()) + '"></div>' +
    '<div class="field"><label>Chart exercise</label><select id="chart-ex"></select></div></div>' +
    '<button class="btn gold sm" type="submit">Log set</button></form>' +
    '<div id="pr-table" style="margin-top:12px"></div><div id="lift-chart" style="margin-top:12px"></div></div>';
  html += '</div>';

  /* volume by split · eight weeks */
  const DAYMAP = {};
  DATA.workouts.days.forEach(d => d.exercises.forEach(e => { DAYMAP[e.n] = d.name; }));
  html += '<div class="card">' + cardT('Volume by split · eight weeks', 'tonnage per lifting day') +
    '<div class="grid g3" style="gap:26px">' +
    DATA.workouts.days.filter(d => !d.rest).map(d => {
      const mon = mondayOfToday();
      const vals = [];
      for (let i = 7; i >= 0; i--){
        const w0 = new Date(mon); w0.setDate(mon.getDate() - 7 * i);
        const w1 = new Date(w0); w1.setDate(w0.getDate() + 7);
        vals.push(Math.round(liftLog().filter(e => {
          if (DAYMAP[e.ex] !== d.name) return false;
          const p = e.d.split('-').map(Number); const dd = new Date(p[0], p[1] - 1, p[2]);
          return dd >= w0 && dd < w1;
        }).reduce((a, e) => a + e.w * e.r, 0)));
      }
      return '<div><div style="font:400 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">' + esc(d.name) + ' · this wk ' + vals[7].toLocaleString('en-GB') + ' kg</div>' +
        lineChart(vals.map((v, i2) => ({v: v, l: 'W' + (i2 + 1)})), 260, 64, null, '') + '</div>';
    }).join('') + '</div></div>';

  /* PR history */
  const ph = prHistory();
  html += '<div class="card">' + cardT('PR history', 'every record you have set, newest first') +
    (ph.length ? '<div class="table-scroll"><table class="ledger"><thead><tr><th>Date</th><th>Exercise</th><th class="num">Set</th><th class="num">e1RM</th></tr></thead><tbody>' +
      ph.slice(0, 24).map(e => '<tr><td>' + esc(e.d) + '</td><td>' + esc(e.ex) + '</td><td class="num">' + e.w + '×' + e.r + '</td><td class="num">' + num(e.e1, 1) + ' kg</td></tr>').join('') +
      '</tbody></table></div>' : '<p class="note">No records yet — the first PR is always the first logged set.</p>') + '</div>';

  root.innerHTML = html;

  function paintRecovery(){
    const rs = sleepStats();
    const ro = root.querySelector('#readout');
    if (!rs){
      ro.innerHTML = '<p class="note">No sleep logged yet — readiness needs at least one night. Score = 70% sleep hours vs your ' + P('body.sleepTarget') + ' h target + 30% quality.</p>';
    } else {
      const band = readinessBand(rs);
      const col = band === 'prime' ? 'var(--green)' : band === 'good' ? 'var(--navy-soft)' : band === 'caution' ? 'var(--rust)' : 'var(--red)';
      ro.innerHTML = '<div style="display:flex;align-items:baseline;gap:12px"><span style="font:400 34px var(--serif);color:' + col + '">' + rs.score + '</span><span class="hint">/100 · ' + band + ' · ' + rs.n + ' night' + (rs.n > 1 ? 's' : '') + '</span></div>' +
        '<div style="margin:10px 0 6px">' + bar(rs.score, band === 'prime' ? 'green' : band === 'caution' ? 'rust' : band === 'rest' ? 'red' : 'navy') + '</div>' +
        '<p class="note">Sleep ' + num(rs.avgH, 1) + ' h vs ' + pe('body.sleepTarget', v => v + ' h') + ' target (70% of score) · quality ' + num(rs.avgQ, 1) + '/5 (30%). Feeds the dashboard chip and the advice above.</p>';
    }
    const log = sleepLog().slice(-7).reverse();
    root.querySelector('#sleep-table').innerHTML = log.length ?
      '<table class="ledger"><thead><tr><th>Night</th><th class="num">Hours</th><th class="num">Quality</th><th></th></tr></thead><tbody>' +
      log.map(e => '<tr><td>' + esc(e.d) + '</td><td class="num">' + num(+e.h, 1) + '</td><td class="num">' + e.q + '/5</td><td><button class="linkbtn del" data-sr="' + e.id + '">✕</button></td></tr>').join('') +
      '</tbody></table>' : '';
  }
  function paintPR(){
    const log = liftLog();
    const names = Object.keys(log.reduce((a, e) => (a[e.ex] = 1, a), {})).sort();
    const sel = root.querySelector('#chart-ex');
    const curSel = names.indexOf(sel.value) >= 0 ? sel.value : names[0];
    sel.innerHTML = names.map(n => '<option' + (n === curSel ? ' selected' : '') + '>' + esc(n) + '</option>').join('') || '<option>—</option>';
    root.querySelector('#pr-table').innerHTML = names.length ?
      '<div class="table-scroll"><table class="records" style="min-width:640px"><thead><tr><th>Exercise</th><th>Prescribed</th><th>Last logged</th><th>PR · e1RM</th><th>Cue</th><th></th></tr></thead><tbody>' +
      names.map(n => {
        const pr = liftPR(n), pre = prescriptionFor(n);
        const preE1 = pre && pre.w ? e1rm(pre.w, pre.r) : null;
        const cue = !pre || !pre.w ? '—'
          : (pr.last && pr.last.w >= pre.w && pr.last.r >= pre.r + 2 ? '+2.5 kg next session'
          : (preE1 && pr.e1 > preE1 ? 'surpassed prescription — raise the sheet weight' : 'build toward prescription'));
        return '<tr data-exrow="' + esc(n) + '"><td><b>' + esc(n) + '</b></td><td>' + (pre && pre.w ? pre.w + '×' + pre.r : '—') + '</td><td>' + (pr.last ? pr.last.w + '×' + pr.last.r + ' <span class="hint">' + pr.last.d.slice(5) + '</span>' : '—') + '</td>' +
          '<td><b>' + num(pr.e1, 1) + ' kg</b> <span class="hint">' + pr.best.w + '×' + pr.best.r + ' · ' + pr.best.d.slice(5) + '</span></td><td class="hint">' + cue + '</td>' +
          '<td><button class="linkbtn del" data-liftdel="' + esc(n) + '">clear</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      : '<p class="note">No sets logged yet — log each top set after a session and the PR table builds itself.</p>';
    const es = liftLog().filter(e => e.ex === (sel.value || curSel)).sort((a, b) => a.d < b.d ? -1 : 1);
    root.querySelector('#lift-chart').innerHTML = es.length > 1 ?
      '<div class="hint" style="margin-bottom:4px">estimated 1-rep max trend · ' + esc(sel.value || curSel) + '</div>' +
      lineChart(es.map(e => ({v: Math.round(e1rm(e.w, e.r) * 10) / 10, l: e.d.slice(5)})), 560, 140, null, '') : '';
  }
  paintRecovery(); paintPR();

  bindForm(root.querySelector('#sleep-form'), fd => {
    const h = parseFloat(String(fd.get('h')).replace(',', '.'));
    if (!h || h < 0 || h > 24 || !fd.get('d')) return;
    const log = sleepLog();
    log.push({id: 's' + Date.now().toString(36), d: fd.get('d'), h: Math.round(h * 10) / 10, q: +fd.get('q')});
    log.sort((a, b) => a.d < b.d ? -1 : 1);
    LS.set('sleep.v1', log);
    root.querySelector('#sleep-form').elements.h.value = '';
    paintRecovery();
    toast('Night logged — readiness ' + (sleepStats() ? sleepStats().score : 0) + '/100.');
  });
  bindForm(root.querySelector('#lift-form'), fd => {
    const w = parseFloat(String(fd.get('w')).replace(',', '.'));
    const r = Math.max(1, Math.round(+fd.get('r') || 0));
    if (!w || !r || !fd.get('d')) return;
    const ex = fd.get('ex');
    const prev = liftPR(ex);
    const log = liftLog();
    log.push({id: 'f' + Date.now().toString(36), d: fd.get('d'), ex, w, r});
    LS.set('lifts.log.v1', log);
    const now = e1rm(w, r);
    if (prev && now > prev.e1) toast('PR! ' + ex + ' ' + w + '×' + r + ' — e1RM ' + num(now, 1) + ' kg (+' + num(now - prev.e1, 1) + ').');
    else toast('Set logged for ' + ex + '.');
    paintPR();
    const prRow = root.querySelector('[data-exrow="' + ex.replace(/"/g, '') + '"]');
    if (prRow && prev && now > prev.e1) prRow.classList.add('flash');
    root.querySelector('#lift-form').elements.w.value = '';
    root.querySelector('#lift-form').elements.r.value = '';
    paintPR();
  });
  root.querySelector('#chart-ex').addEventListener('change', paintPR);
  function mondayOf(d){ const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  root.addEventListener('click', e => {
    const sr = e.target.closest('[data-sr]');
    if (sr){ LS.set('sleep.v1', sleepLog().filter(x => x.id !== sr.dataset.sr)); paintRecovery(); return; }
    const ld = e.target.closest('[data-liftdel]');
    if (ld){
      if (confirm('Clear every logged set for ' + ld.dataset.liftdel + '?')){
        LS.set('lifts.log.v1', liftLog().filter(x => x.ex !== ld.dataset.liftdel));
        paintPR();
      }
    }
  });

  function paintStrip(){
    const log = trainLog();
    const mon = mondayOf(t0);
    let out = '';
    for (let i = 0; i < 7; i++){
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const key = iso(d);
      const done = !!log[key];
      const isToday = key === iso(t0);
      out += '<div class="day-dot ' + (done ? 'done' : '') + ' ' + (isToday ? 'today' : '') + '" title="' + (done ? esc(log[key]) : 'not logged') + '">' +
        '<div class="cir">' + (done ? '✓' : '·') + '</div><div class="dl">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i] + '</div></div>';
    }
    const cnt = Object.keys(log).filter(k => { const p = k.split('-').map(Number); if (p.length !== 3) return false; const d = new Date(p[0], p[1] - 1, p[2]); return d >= mon && d < new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7); }).length;
    root.querySelector('#week-strip').innerHTML = out;
    root.querySelector('#week-strip').insertAdjacentHTML('beforeend',
      '<div style="margin-left:auto;align-self:center" class="hint">' + cnt + ' session' + (cnt === 1 ? '' : 's') + ' this week</div>');
  }
  function paintTabs(){
    root.querySelector('#day-tabs').innerHTML = DATA.workouts.days.map((d, i) => {
      const nm = d.name.split(' - ');
      const isToday = i === (t0.getDay() + 6) % 7;
      return '<button class="tab ' + (trainUI.day === i ? 'on' : '') + '" data-day="' + i + '">' +
        (isToday ? '▸ ' : '') + nm[0] + '<span class="cnt">' + (d.rest ? 'rest' : nm[1]) + '</span></button>';
    }).join('');
  }
  function paintDay(){
    const log = trainLog();
    const d = DATA.workouts.days[trainUI.day];
    const key = iso(t0);
    const doneToday = log[key] === d.name;
    let out = '<div class="card" style="margin-bottom:0">';
    out += '<div class="card-t"><span>' + esc(d.name) + '</span>' + (d.rest ? '' : '<span class="t-accent">' + d.exercises.length + ' exercises</span>') + '</div>';
    if (d.rest){
      out += '<div class="rest-day"><div class="big">Repose</div><p class="note">A scheduled rest day. Walk, read, sleep — the programme accounts for this.</p></div>';
    } else {
      const vol = d.exercises.reduce((a, e) => a + e.w * e.r, 0);
      out += '<table class="ex-table"><thead><tr><th>Exercise</th><th class="num">Weight (kg)</th><th class="num">Reps</th><th class="num">Volume</th><th class="num">Last logged</th></tr></thead><tbody>';
      d.exercises.forEach((e, ii) => {
        const pr = liftPR(e.n);
        out += '<tr class="logrow" data-logrow="' + ii + '" title="Tap to log a set"><td>' + esc(e.n) + '</td><td class="num">' + (e.w ? e.w : '—') + '</td><td class="num">' + e.r + '</td><td class="num">' + (e.w ? Math.round(e.w * e.r) + ' kg' : '—') + '</td><td class="num">' + (pr && pr.last ? pr.last.w + '×' + pr.last.r + ' <span class="hint">' + pr.last.d.slice(5) + '</span>' : '<span class="hint">—</span>') + '</td></tr>';
      });
      out += '<tr class="vol"><td>' + (vol ? 'Estimated session volume' : 'Bodyweight circuit — total reps') + '</td><td class="num" colspan="3">' + (vol ? Math.round(vol).toLocaleString('en-GB') + ' kg' : d.exercises.reduce((a, e) => a + e.r, 0) + ' reps') + '</td></tr>';
      out += '</tbody></table>';
      out += '<p class="hint" style="margin-top:8px">tap any row to log that set — weight &amp; reps arrive pre-filled, ↵ files it.</p>';
      const rs0 = sleepStats();
      if (rs0){
        const band0 = readinessBand(rs0);
        const col0 = band0 === 'prime' ? 'var(--green)' : band0 === 'good' ? 'var(--ink2)' : band0 === 'caution' ? 'var(--rust)' : 'var(--red)';
        const msg0 = band0 === 'prime' ? 'Readiness ' + rs0.score + ' — primed: a good day for top sets and PR attempts.'
          : band0 === 'good' ? 'Readiness ' + rs0.score + ' — good: work as prescribed.'
          : band0 === 'caution' ? 'Readiness ' + rs0.score + ' — caution: cap top sets at RPE 7.'
          : 'Readiness ' + rs0.score + ' — low: swap to Zone 2 or halve the volume.';
        out += '<p class="note" style="margin-top:10px;color:' + col0 + '">' + msg0 + ' (7-night average ' + num(rs0.avgH, 1) + ' h, quality ' + num(rs0.avgQ, 1) + '/5)</p>';
      } else {
        out += '<p class="note" style="margin-top:10px">Log sleep in the Recovery card below and this card will advise before heavy sessions.</p>';
      }
    }
    out += '<div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="btn ' + (doneToday ? 'ghost' : 'gold') + '" id="mark-session">' + (doneToday ? '✓ Marked — undo' : 'Mark today’s session complete') + '</button>' +
      '<span class="hint">logs against ' + dateMed(t0) + '</span></div>' +
      '<div class="sw-row"><span class="hint">session clock</span><span class="sw-time" id="sw-display">0:00</span>' +
      '<button class="mini-btn" type="button" id="sw-toggle">' + (LS.get('sw.v1', null) ? 'stop & reset' : 'start') + '</button>' +
      '<span class="hint" style="margin-left:16px">rest between sets</span><span class="sw-time" style="font-size:20px" id="rest-display">—</span>' +
      '<span class="rest-btns">' + [60, 90, 120, 180].map(x => '<button class="mini-btn" type="button" data-rest="' + x + '">' + (x < 120 ? x + 's' : (x / 60) + 'm') + '</button>').join('') + '</span></div>' +
      '<div id="rest-bar" style="margin-top:6px">' + bar(0, 'navy', true) + '</div>';
    out += '</div>';
    root.querySelector('#day-card').innerHTML = out;
    root.querySelector('#mark-session').addEventListener('click', () => {
      const lg = trainLog();
      const k = iso(t0);
      if (lg[k] === d.name) delete lg[k]; else lg[k] = d.name;
      LS.set('train.v1', lg);
      paintDay(); paintStrip();
    });
    const swb = root.querySelector('#sw-toggle');
    if (swb) swb.addEventListener('click', () => {
      if (LS.get('sw.v1', null)) LS.set('sw.v1', null); else LS.set('sw.v1', {start: Date.now()});
      paintDay();
    });
    root.querySelectorAll('[data-rest]').forEach(b => b.addEventListener('click', () => {
      const sec = +b.dataset.rest;
      LS.set('rest.v1', {until: Date.now() + sec * 1000, total: sec * 1000});
      const re = root.querySelector('#rest-display');
      if (re) re.textContent = fmtClock(sec * 1000);
      const rb = root.querySelector('#rest-bar');
      if (rb && rb.firstElementChild) rb.firstElementChild.style.width = '100%';
    }));
  }
  paintStrip(); paintTabs(); paintDay();

  function openSetPop(row){
    root.querySelectorAll('.setpop').forEach(x => x.remove());
    const idx = +row.dataset.logrow;
    const d = DATA.workouts.days[trainUI.day];
    const ex = d.exercises[idx];
    if (!ex) return;
    const tr = document.createElement('tr');
    tr.className = 'setpop';
    tr.innerHTML = '<td colspan="5"><div class="setpop-in">' +
      '<label>weight <input class="inline-edit" type="text" value="' + (ex.w || 0) + '" data-pop="w" style="width:70px"></label>' +
      '<label>reps <input class="inline-edit" type="text" value="' + ex.r + '" data-pop="r" style="width:56px"></label>' +
      '<label>date <input class="inline-edit" type="date" value="' + iso(new Date()) + '" data-pop="d" style="width:150px"></label>' +
      '<button class="btn gold sm" type="button" data-poplog>Log set</button>' +
      '<button class="btn ghost sm" type="button" data-popcancel>cancel</button></div></td>';
    row.after(tr);
    const wi = tr.querySelector('[data-pop="w"]');
    wi.focus(); wi.select();
    const commit = () => {
      const w = parseFloat(String(tr.querySelector('[data-pop="w"]').value).replace(',', '.')) || 0;
      const r = Math.max(1, Math.round(+tr.querySelector('[data-pop="r"]').value || 0));
      const dd = tr.querySelector('[data-pop="d"]').value || iso(new Date());
      if (!r) return;
      const log = liftLog();
      const prev = liftPR(ex.n);
      log.push({id: 'f' + Date.now().toString(36), d: dd, ex: ex.n, w, r});
      LS.set('lifts.log.v1', log);
      const nowE = e1rm(w, r);
      if (prev && nowE > prev.e1) toast('PR! ' + ex.n + ' ' + w + '×' + r + ' — e1RM ' + num(nowE, 1) + ' kg (+' + num(nowE - prev.e1, 1) + ').');
      else toast(ex.n + ' ' + w + '×' + r + ' logged.');
      paintDay(); paintPR();
    };
    tr.querySelector('[data-poplog]').addEventListener('click', commit);
    tr.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter'){ ev.preventDefault(); commit(); }
      else if (ev.key === 'Escape') tr.remove();
    });
  }
  root.addEventListener('click', e => {
    if (EDIT) return;
    if (e.target.closest('[data-popcancel]')){ const p = e.target.closest('.setpop'); if (p) p.remove(); return; }
    const row = e.target.closest('tr.logrow');
    if (row && !e.target.closest('.setpop') && !e.target.closest('button')) openSetPop(row);
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-day]');
    if (b){ trainUI.day = +b.dataset.day; paintTabs(); paintDay(); }
  });
  let tx0 = null;
  root.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, {passive: true});
  root.addEventListener('touchend', e => {
    if (tx0 == null) return;
    const dx = ((e.changedTouches[0] || {}).clientX || tx0) - tx0; tx0 = null;
    if (Math.abs(dx) < 60) return;
    trainUI.day = (trainUI.day + (dx < 0 ? 1 : 6)) % 7;
    paintTabs(); paintDay();
  }, {passive: true});
}

/* ---------------- VIII · CARDIO ---------------------------------------- */
function rCardio(root){
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const TYPES = ['Zone 2', 'Intervals', 'Dashes', 'Zone 2 long', 'Recovery', 'Other'];
  const age = P('body.age'), maxHR = 220 - age;
  const CMZ = cardioMetrics();
  const wk = cardioWeek();
  const deload = wk % 8 === 0;
  const OVERLOAD = {
    'Dashes': '+1 rep per fortnight to 12, then rest 90→75→60 s. Form breaks → the set ends.',
    'Intervals': '+1 rep per fortnight to 10, then rest 90→75→60 s. RPE stays at 8.',
    'Zone 2': 'grade +1% per fortnight to 15%; speed and nose-breathing unchanged.',
    'Zone 2 long': '+5 min per fortnight to 45 min; conversational from first step to last.'
  };
  const zones = [
    ['Z1 · Recovery', 0.50, 0.60, 'warm-ups & between-dash recovery'],
    ['Z2 · Base', 0.60, 0.70, 'the default — nasal, conversational'],
    ['Z3 · Tempo', 0.70, 0.80, 'steady hardness, used sparingly'],
    ['Z4 · Threshold', 0.80, 0.90, 'race-pace effort, short doses'],
    ['Z5 · Max', 0.90, 1.00, 'dash tops only, seconds at a time']
  ];
  function mondayOf(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function parseIso(s){ const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function weekMinutes(mon){
    const log = cardioLog();
    const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
    return log.filter(e => { const d = parseIso(e.d); return d >= mon && d < end; }).reduce((a, e) => a + (+e.mins || 0), 0);
  }
  function streak(){
    const mon = mondayOf(new Date());
    let s = 0, cur = new Date(mon);
    if (weekMinutes(cur) === 0) cur.setDate(cur.getDate() - 7);
    while (weekMinutes(cur) > 0 && s < 200){ s++; cur.setDate(cur.getDate() - 7); }
    return s;
  }

  let html = secHead('Section VII · Cardio', 'The Cardio Programme',
    'Four days, woven into the new split: dashes on Tuesday while the legs are fresh, stairmaster intervals on Wednesday, an incline-walk flush after Saturday’s legs, and the gentlest session of the week on Sunday.');

  const target = cardioWeekMins(wk);
  const logged = weekMinutes(mondayOf(new Date()));
  html += '<div class="tiles">' +
    tile('This week’s volume', target + ' <small>min</small>', logged >= target ? '<span class="up">logged ' + logged + ' — plan met ✓</span>' : logged + ' logged · ' + (target - logged) + ' to go', logged >= target ? 'green' : 'navy') +
    tile('Week streak', streak(), 'consecutive weeks with a session') +
    tile('Zone 2 band', Math.round(maxHR * 0.6) + '–' + Math.round(maxHR * 0.7) + ' <small>bpm</small>', 'max ≈ ' + maxHR + ' (220 − ' + age + ')') +
    '</div>';

  /* this week's sessions + zones */
  html += '<div class="grid g-1-2" style="margin-top:20px">';
  const cLogToday = cardioLog().filter(e => e.d === iso(new Date()));
  html += '<div class="card" style="margin-bottom:0">' + cardT('This week’s sessions', deload ? 'deload week — halve it' : 'four days woven into the split') +
    cardioPlan().slice().sort((a, b) => a.day - b.day).map(s => {
      const rx = cardioRx(s.type);
      const done = cLogToday.some(e => e.notes === 'sid:' + s.id);
      return '<div class="due-item" style="align-items:flex-start"><div><b>' + esc(s.name) + '</b> <span class="hint">· ' + DAYS[s.day] + '</span>' +
        (rx ? '<div class="note" style="color:var(--gold)">this week: ' + esc(rx.line) + '</div>' : '') +
        (OVERLOAD[s.type] ? '<div class="note"><b>overload:</b> ' + OVERLOAD[s.type] + '</div>' : '') +
        '<div class="note">' + esc(s.notes) + '</div></div>' +
        '<span class="amt" style="text-align:right">' + s.mins + ' min<br>' + (done ? chip('done', 'o') : '<button class="linkbtn" data-cdone="' + s.id + '">mark done</button>') + '</span></div>';
    }).join('') +
    (deload ? '<p class="note" style="margin-top:10px"><b style="color:var(--rust)">Deload week:</b> halve reps and minutes; freshness is part of the overload.</p>' : '') + '</div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Heart-rate zones', 'no strap? use the talk test') +
    '<table class="ledger"><thead><tr><th>Zone</th><th class="num">% max</th>' + (CMZ.reserve != null ? '<th class="num">Karvonen</th>' : '') + '</tr></thead><tbody>' + zones.map(z =>
      '<tr' + (z[0].indexOf('Z2') === 0 ? ' style="background:var(--surface2)"' : '') + '><td><b>' + z[0] + '</b><div class="note">' + z[3] + '</div></td><td class="num">' + Math.round(maxHR * z[1]) + '–' + Math.round(maxHR * z[2]) + ' bpm</td>' + (CMZ.reserve != null ? '<td class="num">' + CMZ.karvonen(z[1], z[2]).join('–') + ' bpm</td>' : '') + '</tr>').join('') +
    '</tbody></table>' +
    '<p class="note" style="margin-top:10px">Zone 2 = full sentences; Z3 = broken sentences; dashes = no sentences.</p></div>';
  html += '</div>';

  /* log + chart */
  html += '<div class="grid g-1-2" style="margin-top:20px">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Log a session', 'anything cardio, anywhere') +
    '<form id="log-form"><div class="field"><label>Date</label><input type="date" name="d" value="' + iso(new Date()) + '"></div>' +
    '<div class="grid g2" style="gap:10px"><div class="field"><label>Type</label><select name="type">' + TYPES.map(t => '<option>' + t + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Minutes</label><input type="text" name="mins" inputmode="numeric" required></div></div>' +
    '<div class="field"><label>Feel (RPE 1–10, optional)</label><input type="text" name="rpe" inputmode="numeric" placeholder="6"></div>' +
    '<div class="field"><label>Notes</label><input type="text" name="notes" placeholder="route, machine, conditions…"></div>' +
    '<button class="btn gold sm" type="submit">Record session</button></form></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Weekly volume · last 8 weeks', 'target this week ' + target + ' min') +
    '<div id="cchart"></div><div id="log-table" style="margin-top:14px"></div></div>';
  html += '</div>';

  root.innerHTML = html;

  function paintLog(){
    const log = cardioLog();
    const mon = mondayOf(new Date());
    const vals = [], labels = [];
    for (let i = 7; i >= 0; i--){
      const m = new Date(mon); m.setDate(m.getDate() - 7 * i);
      vals.push(weekMinutes(m));
      labels.push(m.getDate() + '/' + (m.getMonth() + 1));
    }
    root.querySelector('#cchart').innerHTML = barChart(vals, labels, target);
    const recent = log.slice(-12).reverse();
    root.querySelector('#log-table').innerHTML = recent.length ?
      '<table class="ledger"><thead><tr><th>Date</th><th>Type</th><th class="num">Min</th><th class="num">RPE</th><th>Notes</th><th></th></tr></thead><tbody>' +
      recent.map(e => '<tr><td>' + esc(e.d) + '</td><td>' + esc(e.type) + '</td><td class="num">' + e.mins + '</td><td class="num">' + (e.rpe || '—') + '</td><td class="hint">' + esc(e.notes || '') + '</td><td><button class="linkbtn del" data-lr="' + e.id + '">✕</button></td></tr>').join('') +
      '</tbody></table>' : '<p class="note">No sessions logged yet — the first entry makes the chart honest.</p>';
  }
  paintLog();

  bindForm(root.querySelector('#log-form'), fd => {
    const mins = Math.max(1, Math.round(+fd.get('mins') || 0));
    if (!mins || !fd.get('d')) return;
    const log = cardioLog();
    log.push({id: 'l' + Date.now().toString(36), d: fd.get('d'), type: fd.get('type'), mins, rpe: fd.get('rpe') ? Math.min(10, Math.max(1, +fd.get('rpe'))) : null, notes: fd.get('notes').trim()});
    log.sort((a, b) => a.d < b.d ? -1 : 1);
    LS.set('cardio.log.v1', log);
    const f = root.querySelector('#log-form');
    f.elements.mins.value = ''; f.elements.rpe.value = ''; f.elements.notes.value = '';
    paintLog();
    toast('Cardio logged — ' + mins + ' min banked.');
  });
  root.addEventListener('click', e => {
    const cd = e.target.closest('[data-cdone]');
    if (cd){
      const s = cardioPlan().find(x => x.id === cd.dataset.cdone);
      if (!s) return;
      const log = cardioLog();
      log.push({id: 'l' + Date.now().toString(36), d: iso(new Date()), type: s.type, mins: s.mins, rpe: null, notes: 'sid:' + s.id});
      LS.set('cardio.log.v1', log);
      toast(s.name + ' logged — ' + s.mins + ' min banked.');
      navigate();
      return;
    }
    const lr = e.target.closest('[data-lr]');
    if (lr){ LS.set('cardio.log.v1', cardioLog().filter(x => x.id !== lr.dataset.lr)); paintLog(); }
  });
}

/* ---------------- IX · BODY ------------------------------------------ */
function rBody(root){
  const b = P('body');
  const C = bodyCalc();
  const pct1 = v => (v * 100).toFixed(1) + '%';
  let html = secHead('Section VIII · Body', 'The Physique Report',
    'Every index below is recomputed live from the tape and the weigh-in log — height, age, waist and neck are editable in edit mode (✎), as are the cut’s goals and ratios.');

  /* targets hero */
  html += '<div class="grid g3">';
  html += '<div class="card" style="margin-bottom:0;text-align:center">' + cardT('Weight') +
    '<div style="font:400 34px var(--serif)" id="w-now">' + num(C.w, 1) + ' <small style="font-size:16px;color:var(--muted)">kg now</small></div>' +
    '<div class="hint" style="margin-top:2px">' + (C.w < b.weight ? '−' + num(b.weight - C.w, 1) + ' kg since baseline' : C.w > b.weight ? '+' + num(C.w - b.weight, 1) + ' kg since baseline' : 'sheet baseline') + '</div>' +
    '<div style="color:var(--gold);font-size:18px;margin:4px 0">↓</div>' +
    '<div style="font:400 24px var(--serif);color:var(--green)">' + num(C.ffmiIdeal) + ' <small style="font-size:13px;color:var(--muted)">kg target (FFMI-ideal)</small></div></div>';
  html += '<div class="card" style="margin-bottom:0;text-align:center">' + cardT('Body fat') +
    '<div style="font:400 34px var(--serif)" id="bf-now">' + num(C.bf * 100, 1) + '<small style="font-size:16px;color:var(--muted)">% now</small></div>' +
    '<div style="color:var(--gold);font-size:18px;margin:4px 0">↓</div>' +
    '<div style="font:400 24px var(--serif);color:var(--green)">' + pe('body.goalBF', v => (v * 100).toFixed(0) + '.0') + '<small style="font-size:13px;color:var(--muted)">% goal</small></div>' +
    '<div style="margin-top:10px" id="bf-bar">' + bar((C.bf - b.goalBF) / C.bf * 100, 'gold', true) + '<p class="hint" style="margin-top:4px">' + num(Math.max(0, C.fatMass - C.goalWeight * b.goalBF), 1) + ' kg of fat to lose</p></div></div>';
  html += '<div class="card" style="margin-bottom:0;text-align:center">' + cardT('Normalised FFMI') +
    '<div style="font:400 34px var(--serif)">' + num(C.normFFMI) + ' <small style="font-size:16px;color:var(--muted)">now</small></div>' +
    '<div style="color:var(--gold);font-size:18px;margin:4px 0">↑</div>' +
    '<div style="font:400 24px var(--serif);color:var(--green)">' + pe('body.ffmiGoal', v => v.toFixed(1)) + ' <small style="font-size:13px;color:var(--muted)">aim</small></div>' +
    '<div style="margin-top:10px">' + bar((C.normFFMI - 15) / (b.ffmiGoal - 15) * 100, 'green', true) + '<p class="hint" style="margin-top:4px">muscular potential, natural lifter scale</p></div></div>';
  html += '</div>';

  /* weigh-in log */
  html += '<div class="card" style="margin-top:20px">' + cardT('Weigh-in log', 'the trend line outranks the sheet’s ' + num(b.weight, 1) + ' kg baseline') +
    '<div class="grid g-1-2" style="gap:22px">' +
    '<div><form id="w-form"><div class="field"><label>Date</label><input type="date" name="d" value="' + iso(new Date()) + '"></div>' +
    '<div class="grid g2" style="gap:10px"><div class="field"><label>Weight (kg)</label><input type="text" name="w" inputmode="decimal" placeholder="65.4" required></div>' +
    '<div class="field"><label>Body fat % (opt.)</label><input type="text" name="bf" inputmode="decimal" placeholder="18.5"></div></div>' +
    '<button class="btn gold sm" type="submit">Record weigh-in</button></form>' +
    '<div id="w-table" style="margin-top:14px"></div></div>' +
    '<div><div id="w-chart"></div>' +
    '<p class="note" style="margin-top:8px">Same conditions every time: morning, post-lavatory, pre-food, pre-coffee.</p></div>' +
    '</div></div>';

  /* hydration today */
  html += '<div class="card">' + cardT('Hydration today', 'target ' + num(C.water / 1000, 1) + ' L (' + pe('body.waterRate', v => v + ' ml/kg') + ') · resets at midnight') +
    '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span style="font:400 32px var(--serif)" id="water-now">' + num(waterToday() / 1000, 2) + ' L</span>' +
    '<span class="hint">of ' + num(C.water / 1000, 1) + ' L</span><span id="water-ring" style="margin-left:auto">' + ring(C.water ? waterToday() / C.water * 100 : 0, 62, 'navy') + '</span></div>' +
    '<div style="margin:12px 0 4px" id="water-bar">' + bar(waterToday() / C.water * 100, 'navy') + '</div>' +
    '<div class="mini-btns"><button class="mini-btn" type="button" data-water="250">+ 250 ml</button><button class="mini-btn" type="button" data-water="500">+ 500 ml</button><button class="mini-btn" type="button" data-water="-250">− 250 ml</button><button class="mini-btn" type="button" data-water="reset">reset</button></div>' +
    '</div>';

  html += '<div class="grid g2" style="margin-top:20px">';
  /* measures */
  const meas = [['Height', 'body.height', ' cm'], ['Weight (baseline)', 'body.weight', ' kg'], ['Wrist', 'body.wrist', ' cm'], ['Ankle', 'body.ankle', ' cm'],
    ['Torso', 'body.torso', ' cm'], ['Upper Arm', 'body.arm', ' cm'], ['Forearm', 'body.forearm', ' cm'], ['Neck', 'body.neck', ' cm'],
    ['Thigh', 'body.thigh', ' cm'], ['Calf', 'body.calf', ' cm'], ['Waist', 'body.waist', ' cm'], ['Shoulders', 'body.shoulders', ' cm'],
    ['Width', 'body.width', ' cm'], ['Age', 'body.age', '']];
  html += '<div class="card" style="margin-bottom:0">' + cardT('The tape · measurements', 'editable in edit mode') +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">' +
    meas.map(m => '<div class="pill" style="text-align:center"><span style="color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:block">' + m[0] + '</span><b style="font-size:15px">' + pe(m[1], v => v + m[2]) + '</b></div>').join('') +
    '<div class="pill" style="text-align:center"><span style="color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:block">Estimated body fat</span><b style="font-size:15px">' + pe('body.bf', pct1) + '</b></div>' +
    '</div></div>';
  /* metabolism */
  html += '<div class="card" style="margin-bottom:0">' + cardT('Metabolism', 'Mifflin · Katch · Harris') +
    '<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px"><span style="font:400 34px var(--serif);color:var(--gold)">' + num(C.tdee, 0) + '</span><span class="hint">kcal TDEE — median BMR × ' + pe('body.activity', v => '×' + v) + ' activity</span></div>' +
    '<table class="ledger"><tbody>' +
    '<tr><td>Mifflin-St Jeor BMR</td><td class="num">' + num(C.msj, 0) + ' kcal</td></tr>' +
    '<tr><td>Katch-McArdle BMR</td><td class="num">' + num(C.kmca, 0) + ' kcal</td></tr>' +
    '<tr><td>Harris-Benedict BMR</td><td class="num">' + num(C.hb, 0) + ' kcal</td></tr>' +
    '<tr><td>Median BMR (used)</td><td class="num">' + num(C.bmrMid, 0) + ' kcal</td></tr>' +
    '<tr><td>TEF (10%)</td><td class="num">' + num(C.tef, 0) + ' kcal</td></tr>' +
    '<tr><td>NEAT</td><td class="num">' + num(C.neat, 0) + ' kcal</td></tr>' +
    '</tbody></table></div>';
  html += '</div>';

  /* composition */
  html += '<div class="card">' + cardT('Body-composition indices', 'recomputed live') +
    '<div class="table-scroll"><table class="ledger"><thead><tr><th>Index</th><th>Detail</th><th class="num">Value</th><th>Range / note</th></tr></thead><tbody>' +
    [['BMI', 'Baseline assessment', C.bmi, '18.5 – 25'],
     ['Lean Body Mass', 'Weight − fat', C.lbm, 'kg'],
     ['FFMI', 'Fat-free mass index', C.ffmi, 'use normalised'],
     ['Normalised FFMI', 'Height-normalised', C.normFFMI, 'aim ' + b.ffmiGoal],
     ['RFM', 'Relative fat mass', C.rfm, '% body fat'],
     ['Navy Body Fat', 'Tape method (inaccurate — big neck)', C.navy, '% body fat'],
     ['BMI Prime', 'BMI ÷ 25', C.bmiPrime, '0.7 – 1.0'],
     ['Ideal Body Weight', 'Height-only estimate', C.ibw, 'kg (rough)'],
     ['Skeletal Muscle Mass', 'Estimate', C.smm, 'kg (rough)'],
     ['FFMI-Idealised Weight', 'At goal BF & FFMI', C.ffmiIdeal, 'kg — the target']].map(c =>
      '<tr><td><b>' + esc(c[0]) + '</b></td><td style="color:var(--ink2)">' + esc(c[1]) + '</td><td class="num">' + num(c[2], 2) + '</td><td class="hint">' + esc(String(c[3])) + '</td></tr>').join('') +
    '</tbody></table></div></div>';

  html += '<div class="grid g2">';
  /* nutrition prescription with the live balance slider */
  html += '<div class="card" style="margin-bottom:0">' + cardT('Nutrition prescription', '<span class="t-accent" id="bal-badge"></span>') +
    '<div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:4px">' +
    '<span style="font:400 34px var(--serif)" id="bal-num"></span>' +
    '<span class="hint">kcal per day against a TDEE of ' + num(C.tdee, 0) + ' — drag to set the balance</span></div>' +
    '<input type="range" id="def-slider" min="-400" max="900" step="25" value="' + P('body.deficit') + '" style="width:100%;accent-color:var(--gold2)" aria-label="Daily energy balance versus TDEE">' +
    '<div class="hint" style="display:flex;justify-content:space-between;margin:2px 0 16px"><span>+400 · build</span><span>±0 · maintain</span><span>−900 · hard cut</span></div>' +
    '<div id="nut-body"></div></div>';
  /* the plan: cut or build */
  html += '<div class="card" style="margin-bottom:0">' + cardT('The plan · cut or build', 'goals, floor & timeline') +
    '<div id="cut-body"></div></div>';
  html += '</div>';

  function macroRows(C2){
    return [['Protein', C2.protein, C2.protein * 4, 'g/kg LBM', 'body.proteinRatio'],
      ['Carbohydrate', C2.carbs, C2.carbs * 4, 'remainder', null],
      ['Fat', C2.fat, C2.fat * 9, 'g/kg LBM', 'body.fatRatio']].map((m, i) =>
      '<div class="bar-row" style="grid-template-columns:1fr 150px"><div class="lbl"><span><b>' + m[0] + '</b> <span class="hint">' + (m[4] ? pe(m[4], v => v + ' ') : '') + m[3] + '</span></span><b>' + num(m[1]) + ' g · ' + num(m[2], 0) + ' kcal (' + Math.round(m[2] / C2.targetCal * 100) + '%)</b></div>' +
      '<div class="bar ' + ['', 'gold', 'green'][i] + '"><i style="width:' + clamp(m[2] / C2.targetCal * 100, 0, 100) + '%"></i></div></div>').join('') +
    '<hr class="gold-rule">' +
    '<div class="stat-inline">' +
    '<span class="si">Target<b>' + num(C2.targetCal, 0) + ' kcal</b></span>' +
    '<span class="si">Water<b>' + num(C2.water / 1000, 1) + ' L</b></span>' +
    '<span class="si">Creatine loading<b>' + num(0.3 * C2.w) + ' g</b></span>' +
    '<span class="si">Maintenance<b>' + num(0.03 * C2.w) + ' g</b></span>' +
    '</div>' +
    '<p class="note" style="margin-top:10px">' + esc(DATA.body.supplementStack) + '.</p>';
  }
  function cutRows(C2){
    const d = P('body.deficit');
    const tr2 = empiricalTrend();
    const emp = tr2
      ? (tr2.perWeek < -0.01
        ? '<tr><td><b>Empirical trend</b> (your own log)</td><td class="num">' + Math.round(tr2.perWeek * 1000) + ' g/wk over ' + tr2.days + ' d → goal ≈ ' + dateMed(new Date(Date.now() + (C2.w - C2.goalWeight) / (-tr2.perWeek) * 7 * 864e5)) + '</td></tr>'
        : '<tr><td><b>Empirical trend</b> (your own log)</td><td class="num">' + Math.round(tr2.perWeek * 1000) + ' g/wk — flat or rising; the deficit needs teeth</td></tr>')
      : '<tr><td>Empirical trend</td><td class="num hint">needs two weigh-ins a week apart</td></tr>';
    const proj = d > 0
      ? '<tr><td>Projected fat loss</td><td class="num">' + Math.round(C2.weeklyG) + ' g/wk → ~' + num(C2.weeks) + ' weeks to goal</td></tr>'
      : d < 0
      ? '<tr><td>Projected gain</td><td class="num">+' + Math.round(-C2.weeklyG) + ' g/wk — lean massing; watch the waist and the FFMI</td></tr>'
      : '<tr><td>Projection</td><td class="num">maintenance — weight holds</td></tr>';
    return '<table class="ledger"><tbody>' +
      '<tr><td>Goal body fat</td><td class="num">' + pe('body.goalBF', v => (v * 100).toFixed(1) + '%') + '</td></tr>' +
      '<tr><td>Goal weight (at goal BF)</td><td class="num">' + num(C2.goalWeight) + ' kg</td></tr>' +
      '<tr><td>FFMI-idealised weight (FFMI ' + P('body.ffmiGoal') + ')</td><td class="num">' + num(C2.ffmiIdeal) + ' kg</td></tr>' +
      '<tr><td>Minimal calories (floor)</td><td class="num">' + num(C2.minCal, 0) + ' kcal</td></tr>' +
      '<tr><td>Maximal safe deficit</td><td class="num">' + num(C2.maxDeficit, 0) + ' kcal <span class="hint">(' + pe('body.maxFatLossRate', v => v + ' × fat mass') + ')</span></td></tr>' +
      proj + emp +
      '</tbody></table>' +
      '<div style="margin-top:12px">' + bar(d > 0 ? (C2.w - C2.goalWeight) / C2.w * 100 : 0, 'gold') +
      '<p class="hint" style="margin-top:5px">' + (d > 0
        ? num(C2.w, 1) + ' kg → ' + num(C2.goalWeight) + ' kg · roughly ' + dateMed(new Date(Date.now() + C2.weeks * 7 * 864e5)) + ' at the current deficit'
        : d < 0 ? 'surplus phase — the cut resumes when the slider drops back below zero' : 'set a balance and the timeline appears') + '</p></div>';
  }
  function paintNut(){
    const C2 = bodyCalc();
    const d = P('body.deficit');
    root.querySelector('#bal-badge').textContent = d > 0 ? 'CUT · deficit ' + d : d < 0 ? 'BUILD · surplus ' + (-d) : 'MAINTENANCE';
    root.querySelector('#bal-num').textContent = d > 0 ? '−' + d : d < 0 ? '+' + (-d) : '±0';
    root.querySelector('#nut-body').innerHTML = macroRows(C2);
    root.querySelector('#cut-body').innerHTML = cutRows(C2);
  }

  /* micros + skin */
  html += '<div class="grid g-2-1" style="margin-top:20px">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Micronutrient reference', 'daily requirements') +
    '<div class="two-col"><table class="ledger"><tbody>' +
    DATA.body.micros.map(m => '<tr><td>' + esc(m[0]) + '</td><td class="num">' + esc(m[1]) + '</td></tr>').join('') +
    '</tbody></table></div></div>';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Skin profile', 'see also Grooming') +
    '<div class="kv">' + Object.keys(DATA.grooming.skin).map(k => '<dt>' + esc(k) + '</dt><dd><b>' + esc(DATA.grooming.skin[k]) + '</b></dd>').join('') + '</div>' +
    '<p style="margin-top:10px"><a href="#/grooming" style="font-size:12.5px">Open the grooming rituals →</a></p></div>';
  html += '</div>';

  /* the blood panel */
  const B0 = bloods();
  const bl = bloodsLogged();
  html += '<div class="card" style="margin-top:20px">' + cardT('The blood panel', bl.n + ' of ' + bl.t + ' markers drawn · male reference ranges') +
    '<div class="field" style="max-width:260px"><label>Date last drawn</label><input type="date" id="blood-date" value="' + esc(B0.date || '') + '"></div>' +
    BLOODS.map(g => '<div style="margin-top:16px"><div style="font:400 11px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">' + g[0] + '</div>' +
      '<div class="table-scroll"><table class="ledger"><thead><tr><th>Marker</th><th>Unit</th><th>Reference (male)</th><th style="width:110px">Your value</th><th>Flag</th></tr></thead><tbody>' +
      g[1].map(it => {
        const v = B0.v[it[0]] || 0; const f = bloodFlag(it, v);
        return '<tr><td>' + it[1] + '</td><td class="hint">' + it[2] + '</td><td class="hint">' + (it[3] == null ? '&lt; ' + it[4] : it[4] == null ? '&gt; ' + it[3] : it[3] + ' – ' + it[4]) + '</td>' +
        '<td><input type="text" inputmode="decimal" data-blood="' + it[0] + '" value="' + (v || '') + '" placeholder="0" style="width:90px;padding:4px 2px;border:none;border-bottom:1px solid var(--line2);background:transparent;font-family:var(--mono);font-size:13px"></td>' +
        '<td data-bloodflag="' + it[0] + '">' + (f ? chip(f === 'ok' ? 'in range' : f, f === 'ok' ? 'o' : 'navy') : chip('not drawn', 'm')) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>').join('') +
    '<p class="note" style="margin-top:14px">Zeros until drawn: enter values as they arrive from the lab and the flags compare them against adult male references. An out-of-range flag is a prompt to ring the surgery, not a diagnosis — this ledger keeps the numbers, your GP reads them.</p></div>';

  /* the cardio engine */
  const CM0 = cardioMetrics();
  CM0.cmAgeNote = b.age;
  html += '<div class="card" style="margin-top:20px">' + cardT('Cardiovascular health', 'resting, maximal & recovery metrics · zeros until measured') +
    '<div class="grid g2" style="gap:30px"><div>' +
    '<div class="grid g2" style="gap:10px">' +
    '<div class="field"><label>Resting HR (bpm)</label><input type="text" inputmode="numeric" data-cm="rhr" value="' + (CM0.cm.rhr || '') + '" placeholder="0"></div>' +
    '<div class="field"><label>Max HR measured (bpm)</label><input type="text" inputmode="numeric" data-cm="hrmax" value="' + (CM0.cm.hrmax || '') + '" placeholder="0"></div>' +
    '<div class="field"><label>HR drop after 1 min (bpm)</label><input type="text" inputmode="numeric" data-cm="hrr1" value="' + (CM0.cm.hrr1 || '') + '" placeholder="0"></div>' +
    '<div class="field"><label>Blood pressure (sys/dia)</label><div style="display:flex;gap:8px"><input type="text" inputmode="numeric" data-cm="sys" value="' + (CM0.cm.sys || '') + '" placeholder="0" style="width:50%"><input type="text" inputmode="numeric" data-cm="dia" value="' + (CM0.cm.dia || '') + '" placeholder="0" style="width:50%"></div></div>' +
    '<div class="field"><label>VO₂max direct test (ml/kg/min)</label><input type="text" inputmode="decimal" data-cm="vo2" value="' + (CM0.cm.vo2 || '') + '" placeholder="0"></div>' +
    '<div class="field"><label>HRV (rMSSD, ms)</label><input type="text" inputmode="numeric" data-cm="hrv" value="' + (CM0.cm.hrv || '') + '" placeholder="0"></div>' +
    '</div>' +
    '<p class="note" style="margin-top:10px">Resting HR: morning, before standing, best of three. Max HR: the final rep of a dash session wears it. Recovery: drop in the first minute after a hard effort.</p></div>' +
    '<div id="cm-derived">' + cmDerivedHtml(CM0) + '</div></div></div>';

  function cmDerivedHtml(M){
    const row = (k, v, note) => '<div class="due-item"><span>' + k + (note ? ' <span class="hint">· ' + note + '</span>' : '') + '</span><span class="amt">' + v + '</span></div>';
    let out = '';
    if (M.reserve != null){
      out += row('Heart-rate reserve (Karvonen)', M.reserve + ' bpm', 'measured max − resting');
      const z2 = M.karvonen(0.6, 0.7);
      out += row('Zone 2 by reserve', z2[0] + '–' + z2[1] + ' bpm', 'the honest training band');
    }
    if (M.vo2) out += row('VO₂max (direct test)', num(M.vo2, 1) + ' ml/kg/min', M.cat ? chip(M.cat, M.cat === 'superior' || M.cat === 'excellent' ? 'o' : M.cat === 'good' ? 'gold' : 'r') : '');
    if (M.hrvBand) out += row('HRV (rMSSD)', M.cm.hrv + ' ms', chip(M.hrvBand, M.hrvBand === 'low — recover harder' ? 'r' : M.hrvBand === 'well recovered' ? 'o' : 'gold'));
    if (M.bp) out += row('Blood pressure category', chip(M.bp, M.bp === 'optimal' ? 'o' : M.bp === 'normal' ? 'gold' : 'r'), M.cm.sys + '/' + M.cm.dia + ' mmHg');
    if (M.recovery) out += row('1-min heart-rate recovery', chip(M.recovery, M.recovery === 'slow — worth mentioning' ? 'r' : 'o'), '−' + M.cm.hrr1 + ' bpm after a hard effort');
    if (!out) out = '<p class="note">Enter a resting HR and a measured max HR and the engine starts: reserve, Karvonen zones, recovery quality, HRV band and — with a lab VO₂max — an age-graded fitness category (ACSM male bands).</p>';
    return out;
  }
  root.addEventListener('input', e => {
    const cmI = e.target.closest('[data-cm]');
    if (!cmI) return;
    const cm = cardiomed();
    const v = parseFloat(String(cmI.value).replace(',', '.'));
    cm[cmI.dataset.cm] = isFinite(v) ? v : 0;
    LS.set('cardiomed.v1', cm);
    const M = cardioMetrics();
    M.cmAgeNote = b.age;
    const box = root.querySelector('#cm-derived');
    if (box) box.innerHTML = cmDerivedHtml(M);
  });

  function paintW(){
    const log = LS.get('body.log.v1', []);
    const pts = log.slice(-30).map(e => ({v: e.w, l: e.d.slice(8, 10) + '/' + e.d.slice(5, 7)}));
    root.querySelector('#w-chart').innerHTML = pts.length ? lineChart(pts, 620, 160, C.ffmiIdeal, ' kg') :
      '<p class="note">No weigh-ins recorded yet — the first entry starts the trend line.</p>';
    const recent = log.slice(-8).reverse();
    root.querySelector('#w-table').innerHTML = recent.length ?
      '<table class="ledger"><thead><tr><th>Date</th><th class="num">kg</th><th class="num">BF %</th><th></th></tr></thead><tbody>' +
      recent.map(e => '<tr><td>' + esc(e.d) + '</td><td class="num">' + num(e.w, 1) + '</td><td class="num">' + (e.bf ? num(e.bf * 100, 1) : '—') + '</td><td><button class="linkbtn del" data-wr="' + e.id + '">✕</button></td></tr>').join('') +
      '</tbody></table>' : '';
  }

  root.innerHTML = html;
  paintW();
  paintNut();
  const dsl = root.querySelector('#def-slider');
  dsl.addEventListener('input', () => { setP('body.deficit', +dsl.value); paintNut(); });
  dsl.addEventListener('change', () => toast('Balance saved — every calorie figure, macro and the dashboard follow it.'));
  bindForm(root.querySelector('#w-form'), fd => {
    const w = parseFloat(String(fd.get('w')).replace(',', '.'));
    if (!w || w < 30 || w > 250 || !fd.get('d')) return;
    const bfRaw = String(fd.get('bf') || '').trim();
    let bf = null;
    if (bfRaw){
      let v = parseFloat(bfRaw.replace(',', '.'));
      if (v > 1 && v <= 60) v = v / 100;
      if (v > 0.02 && v < 0.6) bf = v;
    }
    const log = LS.get('body.log.v1', []);
    log.push({id: 'w' + Date.now().toString(36), d: fd.get('d'), w: Math.round(w * 10) / 10, bf});
    log.sort((a, b2) => a.d < b2.d ? -1 : a.d > b2.d ? 1 : 0);
    LS.set('body.log.v1', log);
    const f = root.querySelector('#w-form');
    f.elements.w.value = ''; f.elements.bf.value = '';
    toast('Weigh-in recorded — every index recalculated.');
    navigate();
  });
  root.addEventListener('input', e => {
    const bd = e.target.closest('[data-blood]');
    if (bd){
      const B = bloods();
      const v = parseFloat(String(bd.value).replace(',', '.'));
      B.v = B.v || {};
      B.v[bd.dataset.blood] = isFinite(v) ? v : 0;
      LS.set('bloods.v1', B);
      const cell = root.querySelector('[data-bloodflag="' + bd.dataset.blood + '"]');
      const item = BLOODS.reduce((a, g) => a.concat(g[1]), []).find(x => x[0] === bd.dataset.blood);
      if (cell) cell.innerHTML = (() => { const f = bloodFlag(item, B.v[bd.dataset.blood]); return f ? chip(f === 'ok' ? 'in range' : f, f === 'ok' ? 'o' : 'navy') : chip('not drawn', 'm'); })();
      return;
    }
    if (e.target.id === 'blood-date'){
      const B = bloods();
      B.date = e.target.value;
      LS.set('bloods.v1', B);
      toast('Panel dated ' + (B.date || '—') + '.');
    }
  });
  root.addEventListener('click', e => {
    const wb = e.target.closest('[data-water]');
    if (wb){
      if (wb.dataset.water === 'reset') LS.set('water.' + iso(new Date()), 0);
      else addWater(+wb.dataset.water);
      const wn2 = root.querySelector('#water-now');
      if (wn2) wn2.textContent = num(waterToday() / 1000, 2) + ' L';
      const wbar = root.querySelector('#water-bar');
      if (wbar) wbar.innerHTML = bar(waterToday() / C.water * 100, 'navy');
      const wring = root.querySelector('#water-ring');
      if (wring) wring.innerHTML = ring(C.water ? waterToday() / C.water * 100 : 0, 62, 'navy');
      return;
    }
    const wr = e.target.closest('[data-wr]');
    if (wr){ LS.set('body.log.v1', LS.get('body.log.v1', []).filter(x => x.id !== wr.dataset.wr)); navigate(); }
  });
}

/* ---------------- X · GROOMING ---------------------------------------- */
function rGroom(root){
  const now = new Date();
  const h = now.getHours();
  const phaseNow = h < 12 ? 'am' : 'pm';
  const key = 'groom.' + iso(now);

  let html = secHead('Section IX · Grooming', 'The Grooming Rituals',
    'The morning and evening stacks from the Skincare sheet, the biweekly treatments, the seasonal whitening course and the fragrance wardrobe. Today’s ticks reset at midnight.');

  html += '<div class="grid g2">';
  ['am', 'pm'].forEach(w => {
    const title = w === 'am' ? 'Morning routine' : 'Evening routine';
    const flat = groomFlat(w);
    const st = LS.get(key, {});
    const arr = st[w] || [];
    const done = arr.filter(Boolean).length;
    html += '<div class="card" style="margin-bottom:0">' +
      '<div class="card-t"><span>' + title + (w === phaseNow && groomStreak() > 0 ? ' ' + chip(groomStreak() + '-day streak', 'gold') : '') + '</span><span class="t-accent" id="gc-' + w + '">' + done + '/' + flat.length + (w === phaseNow ? ' · now' : '') + '</span></div>';
    let idx = 0;
    DATA.grooming[w].forEach(g => {
      html += '<div style="font:400 10.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:12px 0 4px">' + esc(g.step) + '</div>';
      g.items.forEach(it => {
        const i = idx++;
        html += '<label class="ck"><input type="checkbox" data-g="' + w + '-' + i + '" ' + (arr[i] ? 'checked' : '') + '><span class="box"></span><span class="tx">' + esc(it) + '</span></label>';
      });
    });
    html += '<div style="margin-top:12px" id="gbar-' + w + '">' + bar(done / flat.length * 100, 'gold', true) + '</div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="grid g3" style="margin-top:20px">';
  /* biweekly & seasonal — toggleable */
  const bx = LS.get('biwx.v1', {});
  html += '<div class="card" style="margin-bottom:0">' + cardT('Biweekly & seasonal', 'click a status to toggle it') +
    DATA.grooming.biweekly.map((bw, bi) => {
      const on = bx.hasOwnProperty(bi) ? bx[bi] : bw.on;
      return '<div class="due-item"><span>' + esc(bw.name) + (bw.note ? ' <span class="hint">· ' + esc(bw.note) + '</span>' : '') + '</span>' +
        '<span class="amt"><button class="linkbtn" data-bwt="' + bi + '" style="text-decoration:none">' + (on ? chip('active', 'o') : chip('paused', 'm')) + '</button></span></div>';
    }).join('') +
    '</div>';
  /* fragrance wardrobe — owned toggleable */
  const month = now.getMonth();
  const curSeason = (month >= 3 && month <= 8) ? 'Spring / Summer' : 'Autumn / Winter';
  const fx = LS.get('fragx.v1', {});
  html += '<div class="card" style="margin-bottom:0">' + cardT('Fragrance wardrobe', 'now: ' + curSeason + ' · click a status to toggle owned') +
    ['Spring / Summer', 'Autumn / Winter'].map(sn => {
      const fs = DATA.grooming.fragrances.map((f, fi) => ({f, fi})).filter(x => x.f.season === sn);
      return '<div style="font:400 10.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:' + (sn === curSeason ? 'var(--gold)' : 'var(--muted)') + ';margin:12px 0 6px">' + esc(sn) + (sn === curSeason ? ' ▸' : '') + '</div>' +
        fs.map(x => {
          const owned = fx.hasOwnProperty(x.fi) ? fx[x.fi] : x.f.owned;
          return '<div class="due-item"><span>' + esc(x.f.name) + ' <span class="hint">· ' + x.f.time + '</span></span><span class="amt"><button class="linkbtn" data-frog="' + x.fi + '" style="text-decoration:none">' + (owned ? chip('in collection', 'o') : chip('to acquire', 'm')) + '</button></span></div>';
        }).join('');
    }).join('') + '</div>';
  /* skin profile */
  html += '<div class="card" style="margin-bottom:0">' + cardT('Skin profile', 'from the medical sheet') +
    '<div class="kv">' + Object.keys(DATA.grooming.skin).map(k => '<dt>' + esc(k) + '</dt><dd><b>' + esc(DATA.grooming.skin[k]) + '</b></dd>').join('') + '</div>' +
    '<hr class="gold-rule">' +
    '</div>';
  html += '</div>';

  root.innerHTML = html;

  root.addEventListener('click', e => {
    const bt = e.target.closest('[data-bwt]');
    if (bt){
      const bx2 = LS.get('biwx.v1', {});
      const bi = bt.dataset.bwt;
      const cur = bx2.hasOwnProperty(bi) ? bx2[bi] : DATA.grooming.biweekly[bi].on;
      bx2[bi] = !cur;
      LS.set('biwx.v1', bx2);
      navigate();
      return;
    }
    const fg = e.target.closest('[data-frog]');
    if (fg){
      const fx2 = LS.get('fragx.v1', {});
      const fi = fg.dataset.frog;
      const cur = fx2.hasOwnProperty(fi) ? fx2[fi] : DATA.grooming.fragrances[fi].owned;
      fx2[fi] = !cur;
      LS.set('fragx.v1', fx2);
      navigate();
      return;
    }
  });
  root.addEventListener('change', e => {
    const ck = e.target.closest('[data-g]');
    if (!ck) return;
    const [w, i] = ck.dataset.g.split('-');
    const stt = LS.get(key, {});
    const arr = stt[w] ? stt[w].slice() : [];
    arr[+i] = ck.checked;
    stt[w] = arr;
    LS.set(key, stt);
    const flat = groomFlat(w);
    const done = arr.filter(Boolean).length;
    const gc = root.querySelector('#gc-' + w);
    if (gc) gc.textContent = done + '/' + flat.length + (w === phaseNow ? ' · now' : '');
    const gb = root.querySelector('#gbar-' + w + ' i');
    if (gb) gb.style.width = (done / flat.length * 100) + '%';
  });
}

/* ---------------- X · NETWORK ------------------------------------------ */
function rNet(root){
  const fields = DATA.network.fields;
  let contacts = LS.get('network.v1', []);
  let editing = null, q = '';

  function save(list){ contacts = list; LS.set('network.v1', list); }

  function daysSince(s){
    if (!s) return '';
    const p = String(s).split('-').map(Number);
    const d = (p.length === 3 && p[0] > 1900) ? new Date(p[0], p[1] - 1, p[2]) : new Date(s);
    if (isNaN(d)) return esc(s);
    const days = Math.floor((today0() - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (days <= 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 31) return days + ' days ago';
    if (days < 365) return Math.floor(days / 30) + ' mo ago';
    return Math.floor(days / 365) + ' yr ago';
  }

  let html = secHead('Section X · Network', 'The Contact Book',
    'Your address book, kept properly: who they are, how to reach them, the dates that matter — birthdays and anniversaries feed the dashboard chips — what they like (gifts, seats, wines, subjects to avoid), and when you last spoke, so nobody goes uncontacted too long. Important Mentions is the margin for everything else: the dog’s name, the hospital, the bet they still owe you. Entries live in this browser and travel in your backups.');

  html += '<div class="card" id="net-form-card" style="display:none">' + cardT('New entry', '<button class="linkbtn" id="net-cancel">cancel</button>') +
    '<form id="net-form"><div class="grid g3" style="gap:12px">' +
    '<div class="field"><label>Person *</label><input type="text" name="person" required></div>' +
    '<div class="field"><label>Phone</label><input type="tel" name="phone"></div>' +
    '<div class="field"><label>Email</label><input type="email" name="email"></div>' +
    '<div class="field"><label>Dates (birthday, anniversary…)</label><input type="text" name="dates"></div>' +
    '<div class="field"><label>Last contact</label><input type="date" name="last"></div>' +
    '<div class="field"><label>Preferences</label><input type="text" name="prefs"></div>' +
    '</div>' +
    '<div class="field"><label>Important mentions</label><textarea name="mentions" style="min-height:70px"></textarea></div>' +
    '<button class="btn gold" type="submit" id="net-save">Save entry</button></form></div>';

  html += '<div class="card" id="net-up-card" style="display:none">' + cardT('Upcoming dates', 'birthdays & anniversaries from the Dates column') + '<div id="net-up"></div></div>';

  html += '<div class="card">' + cardT('Entries', '<span><input type="text" id="net-q" placeholder="Search…" style="padding:6px 12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface2);margin-right:8px"><button class="btn sm" id="net-add">+ Add contact</button></span>') +
    '<div id="net-table"></div></div>';

  root.innerHTML = html;

  function paintUp(){
    const ups = contacts.map(c => {
      const nx = nextOccurrence(parseDateish(c.dates));
      return nx ? {c, nx} : null;
    }).filter(Boolean).sort((a, b) => a.nx.days - b.nx.days).slice(0, 6);
    const card = root.querySelector('#net-up-card');
    if (!ups.length){ card.style.display = 'none'; return; }
    card.style.display = '';
    root.querySelector('#net-up').innerHTML = ups.map(u =>
      '<div class="due-item"><span><b>' + esc(u.c.person) + '</b> <span class="hint">· ' + esc(u.c.dates) + '</span></span>' +
      '<span class="amt">' + (u.nx.days === 0 ? chip('today', 'gold') : 'in ' + u.nx.days + ' d · ' + dateMed(u.nx.date)) + '</span></div>').join('');
  }

  function paintTable(){
    const list = contacts
      .filter(c => !q || JSON.stringify(c).toLowerCase().indexOf(q) >= 0)
      .slice().sort((a, b) => a.person.localeCompare(b.person));
    const tbl = root.querySelector('#net-table');
    if (!contacts.length){
      tbl.innerHTML = '<div class="empty-state"><div class="big">The book awaits its first entry.</div><p class="note">Add friends, mentors, family — birthdays in “Dates”, gifts and grievances in “Preferences” and “Important Mentions”.</p></div>';
      return;
    }
    if (!list.length){ tbl.innerHTML = '<div class="empty-state">No entry matches that search.</div>'; return; }
    tbl.innerHTML = '<div class="table-scroll"><table class="records"><thead><tr>' +
      fields.map(f => '<th>' + esc(f) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      list.map(c => '<tr>' +
        '<td><b>' + esc(c.person) + '</b></td>' +
        '<td>' + (c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^+\d]/g, '')) + '">' + esc(c.phone) + '</a>' : '—') + '</td>' +
        '<td>' + (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '—') + '</td>' +
        '<td>' + (c.dates ? esc(c.dates) : '—') + '</td>' +
        '<td>' + (c.prefs ? esc(c.prefs) : '—') + '</td>' +
        '<td>' + (c.last ? esc(c.last) + ' <span class="hint">(' + daysSince(c.last) + ')</span>' : '—') + '</td>' +
        '<td style="max-width:260px">' + (c.mentions ? esc(c.mentions) : '—') + '</td>' +
        '<td style="white-space:nowrap"><button class="linkbtn" data-edit="' + c.id + '">edit</button><button class="linkbtn del" data-rm="' + c.id + '">delete</button></td>' +
        '</tr>').join('') + '</tbody></table></div>';
  }
  paintTable(); paintUp();

  const formCard = root.querySelector('#net-form-card'), form = root.querySelector('#net-form');
  function openForm(c){
    editing = c ? c.id : null;
    form.reset();
    if (c) ['person', 'phone', 'email', 'dates', 'last', 'prefs', 'mentions'].forEach(k => { if (form.elements[k]) form.elements[k].value = c[k] || ''; });
    formCard.style.display = '';
    root.querySelector('#net-save').textContent = c ? 'Update entry' : 'Save entry';
    form.elements.person.focus();
    if (formCard.scrollIntoView) formCard.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  root.querySelector('#net-add').addEventListener('click', () => openForm(null));
  root.querySelector('#net-cancel').addEventListener('click', () => { formCard.style.display = 'none'; editing = null; });
  bindForm(form, fd => {
    const entry = {
      id: editing || 'c' + Date.now().toString(36),
      person: fd.get('person').trim(), phone: fd.get('phone').trim(), email: fd.get('email').trim(),
      dates: fd.get('dates').trim(), prefs: fd.get('prefs').trim(), last: fd.get('last'),
      mentions: fd.get('mentions').trim()
    };
    if (!entry.person) return;
    if (editing){ save(contacts.map(c => c.id === editing ? entry : c)); }
    else { save(contacts.concat([entry])); }
    formCard.style.display = 'none'; editing = null; paintTable(); paintUp();
  });
  root.querySelector('#net-table').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]'), ed = e.target.closest('[data-edit]');
    if (rm){
      if (confirm('Delete this contact?')){ save(contacts.filter(c => c.id !== rm.dataset.rm)); paintTable(); }
    }
    if (ed){ openForm(contacts.find(c => c.id === ed.dataset.edit)); }
  });
  root.querySelector('#net-q').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); paintTable(); });
}

/* ---------------- XI · CAREER ------------------------------------------ */
function rCareer(root){
  const saved = LS.get('career.v1', {});
  const roles = LS.get('roles.v1', []);
  const objectives = LS.get('objectives.v1', []);
  const skills = LS.get('skills.v1', []);
  const cpd = LS.get('cpd.v1', []);
  const LEVELS = ['Learning', 'Working', 'Strong', 'Expert'];
  const HORIZONS = ['Now', '1 yr', '3 yrs', '5 yrs', '10 yrs'];
  const tenure = r => {
    const p = (r.start || '').split('-').map(Number);
    if (!p[0]) return '';
    const from = new Date(p[0], (p[1] || 1) - 1, 1);
    const to = r.current ? new Date() : (() => { const q = (r.end || '').split('-').map(Number); return q[0] ? new Date(q[0], (q[1] || 12) - 1, 1) : new Date(); })();
    let mo = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    return Math.floor(mo / 12) + ' yr ' + (mo % 12) + ' mo';
  };
  const current = roles.find(r => r.current) || roles.slice().sort((a, b) => (b.start || '').localeCompare(a.start || ''))[0];
  const firstStart = roles.map(r => r.start).filter(Boolean).sort()[0];
  const yrsExp = firstStart ? Math.floor((new Date() - new Date(+firstStart.slice(0, 4), +firstStart.slice(5, 7) - 1, 1)) / (365.25 * 864e5)) : 0;
  const stepsAll = objectives.reduce((a, o) => a + (o.steps || []).length, 0);
  const stepsDone = objectives.reduce((a, o) => a + (o.steps || []).filter(s => s.done).length, 0);

  let html = secHead('Section XI · Career', 'The Vocation Paper',
    'The complete working record: roles held and the role now, what you are building toward and the steps that get there, the skills with their evidence, and the character panels — aspirations, desires, values, strengths, weaknesses. Everything saves as you type.');

  html += '<div class="tiles">' +
    tile('Current role', current ? esc(current.title || '—') : 'none logged', current ? esc(current.org || '') + (current.start ? ' · since ' + current.start : '') : 'add your first role below', 'navy') +
    tile('Experience', yrsExp + ' <small>yrs</small>', firstStart ? 'since ' + firstStart.slice(0, 7) : 'no roles logged yet') +
    tile('Objectives in flight', objectives.length, stepsDone + ' of ' + stepsAll + ' steps done', objectives.length ? 'gold' : '') +
    tile('Strong skills', skills.filter(s => s.level === 'Strong' || s.level === 'Expert').length + ' / ' + skills.length, 'at Strong or Expert') +
    '</div>';

  /* present role */
  html += '<div class="card">' + cardT('The present role', current && current.current ? 'current' : 'most recent') +
    (current ?
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><b style="font:400 21px var(--serif)">' + esc(current.title || '') + '</b>' +
      '<span>' + chip(esc(current.type || 'Role'), 'navy') + (current.current ? ' ' + chip('current · ' + tenure(current), 'gold') : ' ' + chip(esc((current.start || '?') + ' – ' + (current.end || '?')))) + '</span></div>' +
      '<p class="note" style="margin:6px 0 0">' + esc(current.org || '') + (current.location ? ' · ' + esc(current.location) : '') + '</p>' +
      (current.summary ? '<p class="review-prose" style="margin-top:12px;font-size:14.5px">' + esc(current.summary) + '</p>' : '') +
      (current.highlights && current.highlights.length ? '<ul style="margin:12px 0 0 18px;color:var(--ink2);font-size:14px;line-height:1.7">' + current.highlights.map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' : '')
      : '<p class="note">No roles logged yet. Add the current one below — title, organisation, dates, what it is for and the three things you want it to be remembered for.</p>') +
    '</div>';

  /* service record */
  html += '<div class="card">' + cardT('Service record', roles.length + ' role' + (roles.length === 1 ? '' : 's') + ' · former and current') +
    (roles.length ?
      roles.slice().sort((a, b) => (b.start || '').localeCompare(a.start || '')).map(r =>
        '<div style="border-top:1px solid var(--line);padding:14px 0">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font:400 17px var(--serif)">' + esc(r.title || '') + ' <span style="color:var(--muted);font-size:14px">· ' + esc(r.org || '') + '</span></b>' +
        '<span class="hint">' + esc(r.start || '?') + ' → ' + (r.current ? 'now (' + tenure(r) + ')' : esc(r.end || '?')) +
        ' <button class="linkbtn" data-redit="' + r.id + '">edit</button> <button class="linkbtn del" data-rdel="' + r.id + '">delete</button></span></div>' +
        '<div style="margin-top:4px">' + chip(esc(r.type || 'Role')) + (r.location ? ' <span class="hint">· ' + esc(r.location) + '</span>' : '') + '</div>' +
        (r.summary ? '<p class="note" style="margin-top:8px">' + esc(r.summary) + '</p>' : '') +
        (r.highlights && r.highlights.length ? '<ul style="margin:8px 0 0 18px;color:var(--ink2);font-size:13.5px;line-height:1.65">' + r.highlights.map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' : '') +
        '</div>').join('')
      : '<p class="note">The record is empty — former roles belong here as much as the current one.</p>') +
    '<hr class="gold-rule">' +
    '<form id="role-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Organisation *</label><input type="text" name="org" required></div>' +
    '<div class="field"><label>Title *</label><input type="text" name="title" required></div>' +
    '<div class="field"><label>Type</label><select name="type">' + ['Full-time', 'Part-time', 'Contract', 'Internship', 'Placement'].map(t => '<option>' + t + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Start (yyyy-mm)</label><input type="text" name="start" placeholder="2024-09"></div>' +
    '<div class="field"><label>End (yyyy-mm)</label><input type="text" name="end" placeholder="leave blank if current"></div>' +
    '<div class="field"><label>Location</label><input type="text" name="location"></div>' +
    '</div>' +
    '<div class="field"><label>What the role is for</label><textarea name="summary" style="min-height:60px"></textarea></div>' +
    '<div class="field"><label>Highlights — one per line</label><textarea name="highlights" style="min-height:60px" placeholder="shipped the migration&#10;ran the graduate scheme"></textarea></div>' +
    '<label class="ck" style="margin-bottom:10px"><input type="checkbox" name="current"><span class="box"></span><span class="tx">This is my current role</span></label>' +
    '<button class="btn gold sm" type="submit" id="role-save">Add role</button></form></div>';

  /* objectives */
  html += '<div class="card">' + cardT('Objectives — how it gets achieved', 'goals with horizons and steps') +
    (objectives.length ? objectives.map(o => {
      const done = (o.steps || []).filter(s => s.done).length;
      return '<div style="border-top:1px solid var(--line);padding:14px 0">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font:400 16px var(--serif)">' + esc(o.goal) + '</b>' +
        '<span>' + chip(esc(o.horizon || 'Now'), 'gold') + (o.target ? ' <span class="hint">by ' + esc(o.target) + '</span>' : '') +
        ' <button class="linkbtn del" data-odel="' + o.id + '">delete</button></span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink2);margin:8px 0 4px"><span>' + done + ' of ' + (o.steps || []).length + ' steps</span><span>' + ((o.steps || []).length ? Math.round(done / o.steps.length * 100) : 0) + '%</span></div>' +
        bar((o.steps || []).length ? done / o.steps.length * 100 : 0, 'gold', true) +
        '<div style="margin-top:8px">' + (o.steps || []).map((st, i) =>
          '<label class="ck"><input type="checkbox" data-ostep="' + o.id + '|' + i + '" ' + (st.done ? 'checked' : '') + '><span class="box"></span><span class="tx">' + esc(st.t) + '</span></label>').join('') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:6px"><input type="text" data-ostepnew="' + o.id + '" placeholder="add a step…" style="flex:1;padding:6px 2px;border:none;border-bottom:1px solid var(--line2);background:transparent"><button class="btn ghost sm" type="button" data-ostepadd="' + o.id + '">add step</button></div>' +
        '</div>';
    }).join('') : '<p class="note">No objectives yet. A goal without steps is a wish; write the steps.</p>') +
    '<hr class="gold-rule">' +
    '<form id="obj-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field" style="grid-column:span 1"><label>Objective *</label><input type="text" name="goal" required placeholder="Chartered engineer status"></div>' +
    '<div class="field"><label>Horizon</label><select name="horizon">' + HORIZONS.map(h => '<option>' + h + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Target date</label><input type="text" name="target" placeholder="2029-06"></div></div>' +
    '<button class="btn gold sm" type="submit">Add objective</button></form></div>';

  /* character panels */
  const panels = [['Aspirations', 'asp', 'The long arc — who and where by 30, 40, and beyond.'],
    ['Desires', 'desires', 'What you actually want from the work and the life around it — honestly.'],
    ['Values', 'values', 'What the work must honour — autonomy, rigour, service, beauty, security…'],
    ['Strengths', 'strengths', 'What the evidence says you are already good at.'],
    ['Weaknesses', 'weaknesses', 'What needs work — and the counter-measure for each.']];
  html += '<div class="grid g3">';
  panels.slice(0, 3).forEach(p => {
    html += '<div class="card career-panel" style="margin-bottom:0">' + cardT(p[0], '<span class="saved-flag" id="sf-' + p[1] + '">✓ saved</span>') +
      '<textarea data-c="' + p[1] + '" placeholder="' + esc(p[2]) + '">' + esc(saved[p[1]] || '') + '</textarea></div>';
  });
  html += '</div><div class="grid g2" style="margin-top:20px">';
  panels.slice(3).forEach(p => {
    html += '<div class="card career-panel" style="margin-bottom:0">' + cardT(p[0], '<span class="saved-flag" id="sf-' + p[1] + '">✓ saved</span>') +
      '<textarea data-c="' + p[1] + '" placeholder="' + esc(p[2]) + '">' + esc(saved[p[1]] || '') + '</textarea></div>';
  });
  html += '</div>';

  /* skills & evidence */
  html += '<div class="card" style="margin-top:20px">' + cardT('Skills & evidence', 'click a level to cycle it') +
    (skills.length ? '<div class="table-scroll"><table class="ledger"><thead><tr><th>Skill</th><th>Level</th><th>Evidence</th><th></th></tr></thead><tbody>' +
      skills.map(sk => '<tr><td><b>' + esc(sk.name) + '</b></td><td><button class="linkbtn" data-slvl="' + sk.id + '" style="text-decoration:none">' + chip(esc(sk.level), sk.level === 'Expert' ? 'gold' : sk.level === 'Strong' ? 'o' : '') + '</button></td><td class="hint">' + esc(sk.evidence || '') + '</td><td><button class="linkbtn del" data-sdel="' + sk.id + '">✕</button></td></tr>').join('') +
      '</tbody></table></div>' : '<p class="note">No skills recorded — list them with the proof, not the adjective.</p>') +
    '<form id="skill-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Skill *</label><input type="text" name="name" required></div>' +
    '<div class="field"><label>Level</label><select name="level">' + LEVELS.map(l => '<option>' + l + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Evidence</label><input type="text" name="evidence" placeholder="where it was proven"></div></div>' +
    '<button class="btn gold sm" type="submit">Add skill</button></form></div>';

  /* CPD */
  html += '<div class="card">' + cardT('Continuing professional development', 'courses, certs, conferences') +
    (cpd.length ? '<table class="ledger"><thead><tr><th>Item</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' +
      cpd.map(c => '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.date || '—') + '</td><td><button class="linkbtn" data-cstat="' + c.id + '" style="text-decoration:none">' + chip(esc(c.status), c.status === 'done' ? 'o' : c.status === 'doing' ? 'gold' : '') + '</button></td><td><button class="linkbtn del" data-cdel="' + c.id + '">✕</button></td></tr>').join('') +
      '</tbody></table>' : '') +
    '<form id="cpd-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Course / cert *</label><input type="text" name="name" required></div>' +
    '<div class="field"><label>Date</label><input type="text" name="date" placeholder="2026-11"></div>' +
    '<div class="field"><label>Status</label><select name="status">' + ['planned', 'doing', 'done'].map(x => '<option>' + x + '</option>').join('') + '</select></div></div>' +
    '<button class="btn gold sm" type="submit">Add CPD</button></form></div>';

  root.innerHTML = html;

  /* prose autosave */
  let timer = null;
  root.addEventListener('input', e => {
    const ta = e.target.closest('[data-c]');
    if (!ta) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const c = LS.get('career.v1', {});
      c[ta.dataset.c] = ta.value;
      LS.set('career.v1', c);
      const fl = root.querySelector('#sf-' + ta.dataset.c);
      if (fl){ fl.classList.add('show'); setTimeout(() => fl.classList.remove('show'), 1200); }
    }, 350);
  });

  let editingRole = null;
  bindForm(root.querySelector('#role-form'), fd => {
    const cur = fd.get('current') === 'on';
    const entry = {
      id: editingRole || ('r' + Date.now().toString(36)), org: fd.get('org').trim(), title: fd.get('title').trim(),
      type: fd.get('type'), start: fd.get('start').trim(), end: cur ? '' : fd.get('end').trim(),
      current: cur, location: fd.get('location').trim(), summary: fd.get('summary').trim(),
      highlights: fd.get('highlights').split('\n').map(x => x.trim()).filter(Boolean)
    };
    let list = LS.get('roles.v1', []);
    if (cur) list.forEach(r => r.current = false);
    if (editingRole) list = list.map(r => r.id === editingRole ? entry : r);
    else list.push(entry);
    LS.set('roles.v1', list);
    toast(entry.title + (editingRole ? ' updated in the service record.' : ' added to the service record.'));
    editingRole = null;
    navigate();
  });
  bindForm(root.querySelector('#obj-form'), fd => {
    const list = LS.get('objectives.v1', []);
    list.push({id: 'o' + Date.now().toString(36), goal: fd.get('goal').trim(), horizon: fd.get('horizon'), target: fd.get('target').trim(), steps: []});
    LS.set('objectives.v1', list);
    toast('Objective added — now give it steps.');
    navigate();
  });
  bindForm(root.querySelector('#skill-form'), fd => {
    const list = LS.get('skills.v1', []);
    list.push({id: 'sk' + Date.now().toString(36), name: fd.get('name').trim(), level: fd.get('level'), evidence: fd.get('evidence').trim()});
    LS.set('skills.v1', list);
    navigate();
  });
  bindForm(root.querySelector('#cpd-form'), fd => {
    const list = LS.get('cpd.v1', []);
    list.push({id: 'cp' + Date.now().toString(36), name: fd.get('name').trim(), date: fd.get('date').trim(), status: fd.get('status')});
    LS.set('cpd.v1', list);
    navigate();
  });

  root.addEventListener('click', e => {
    const rdel = e.target.closest('[data-rdel]');
    if (rdel){ if (confirm('Remove this role from the record?')){ LS.set('roles.v1', LS.get('roles.v1', []).filter(r => r.id !== rdel.dataset.rdel)); navigate(); } return; }
    const redit = e.target.closest('[data-redit]');
    if (redit){
      const r = LS.get('roles.v1', []).find(x => x.id === redit.dataset.redit);
      if (!r) return;
      editingRole = r.id;
      const f = root.querySelector('#role-form');
      f.elements.org.value = r.org || ''; f.elements.title.value = r.title || '';
      f.elements.type.value = r.type || 'Full-time'; f.elements.start.value = r.start || '';
      f.elements.end.value = r.end || ''; f.elements.location.value = r.location || '';
      f.elements.summary.value = r.summary || ''; f.elements.highlights.value = (r.highlights || []).join('\n');
      f.elements.current.checked = !!r.current;
      root.querySelector('#role-save').textContent = 'Update role';
      f.scrollIntoView && f.scrollIntoView({block: 'center'});
      return;
    }
    const od = e.target.closest('[data-odel]');
    if (od){ if (confirm('Delete this objective and its steps?')){ LS.set('objectives.v1', LS.get('objectives.v1', []).filter(o => o.id !== od.dataset.odel)); navigate(); } return; }
    const osa = e.target.closest('[data-ostepadd]');
    if (osa){
      const inp = root.querySelector('[data-ostepnew="' + osa.dataset.ostepadd + '"]');
      const t = (inp.value || '').trim();
      if (!t) return;
      const list = LS.get('objectives.v1', []);
      const o = list.find(x => x.id === osa.dataset.ostepadd);
      o.steps = (o.steps || []).concat([{t, done: false}]);
      LS.set('objectives.v1', list);
      navigate();
      return;
    }
    const sl = e.target.closest('[data-slvl]');
    if (sl){
      const list = LS.get('skills.v1', []);
      const sk = list.find(x => x.id === sl.dataset.slvl);
      sk.level = LEVELS[(LEVELS.indexOf(sk.level) + 1) % LEVELS.length];
      LS.set('skills.v1', list);
      navigate();
      return;
    }
    const sd = e.target.closest('[data-sdel]');
    if (sd){ LS.set('skills.v1', LS.get('skills.v1', []).filter(x => x.id !== sd.dataset.sdel)); navigate(); return; }
    const cs = e.target.closest('[data-cstat]');
    if (cs){
      const order = ['planned', 'doing', 'done'];
      const list = LS.get('cpd.v1', []);
      const c = list.find(x => x.id === cs.dataset.cstat);
      c.status = order[(order.indexOf(c.status) + 1) % order.length];
      LS.set('cpd.v1', list);
      navigate();
      return;
    }
    const cd = e.target.closest('[data-cdel]');
    if (cd){ LS.set('cpd.v1', LS.get('cpd.v1', []).filter(x => x.id !== cd.dataset.cdel)); navigate(); return; }
  });
  root.addEventListener('change', e => {
    const st = e.target.closest('[data-ostep]');
    if (!st) return;
    const [oid, i] = st.dataset.ostep.split('|');
    const list = LS.get('objectives.v1', []);
    const o = list.find(x => x.id === oid);
    if (o && o.steps[+i]) o.steps[+i].done = st.checked;
    LS.set('objectives.v1', list);
    navigate();
  });
}

/* ---------------- XII · HOBBIES ---------------------------------------- */
function hobbiesSeed(){
  return {
    pursuits: [
      {id: 'h1', name: 'Strength training', cat: 'Sport', level: 'Intermediate', freq: '5× weekly', started: '', notes: 'The weekly split — Section VI keeps its books.', active: true, last: '', sessions: 0},
      {id: 'h2', name: 'Sartorial care & restoration', cat: 'Craft', level: 'Intermediate', freq: 'Sunday shine rotation', started: '', notes: 'Shoe rotations, the tailoring queue, the wardrobe register — Section IV.', active: true, last: '', sessions: 0},
      {id: 'h3', name: 'Great-books reading', cat: 'Study', level: 'Working', freq: 'Daily', started: '', notes: 'The humanities syllabus — Section V tracks the tally.', active: true, last: '', sessions: 0},
      {id: 'h4', name: 'Personal investing', cat: 'Study', level: 'Intermediate', freq: 'Monthly, at payroll', started: '', notes: 'ISA, LISA, SIPP allocations and the pot splits — Section III.', active: true, last: '', sessions: 0}
    ],
    projects: [],
    wishlist: []
  };
}
function hobbies(){
  const h = LS.get('hobbies.v1', null);
  if (h) return h;
  const seeded = hobbiesSeed();
  LS.set('hobbies.v1', seeded);
  return seeded;
}
function setHobbies(h){ LS.set('hobbies.v1', h); }
function leastPursued(){
  const h = hobbies();
  const act = h.pursuits.filter(p => p.active);
  if (!act.length) return null;
  return act.slice().sort((a, b) => (a.last || '0000').localeCompare(b.last || '0000'))[0];
}
function rHobbies(root){
  const H = hobbies();
  const CATS = ['Sport', 'Craft', 'Study', 'Collection', 'Outdoors', 'Creative', 'Music', 'Other'];
  const LEVELS = ['Novice', 'Intermediate', 'Advanced'];
  const inFlight = H.projects.filter(p => p.status !== 'done').length;
  const doneCnt = H.projects.filter(p => p.status === 'done').length;
  const lp = leastPursued();

  let html = secHead('Section XII · Hobbies', 'The Pursuits Ledger',
    'The life around the work: what you pursue, how often, what it is making, and the kit it still wants.');

  html += '<div class="tiles">' +
    tile('Active pursuits', H.pursuits.filter(p => p.active).length, 'of ' + H.pursuits.length + ' on the ledger') +
    tile('Projects in flight', inFlight, doneCnt + ' makes completed', inFlight ? 'gold' : '') +
    tile('Kit wishlist', H.wishlist.filter(w => !w.got).length, 'wanted, not yet acquired') +
    tile('Least pursued', lp ? esc(lp.name) : '—', lp && lp.last ? 'last ' + lp.last : lp ? 'never logged — an hour this week?' : 'nothing waiting', lp && !lp.last ? 'rust' : '') +
    '</div>';

  html += '<div class="card">' + cardT('Pursuits', 'click a level chip to cycle it · log a session when you put in the hour') +
    '<div class="grid g2" style="gap:26px">' +
    H.pursuits.map(p => {
      const days = p.last ? Math.round((today0() - pdate(p.last)) / 864e5) : null;
      return '<div style="border-top:1px solid var(--line);padding:14px 0 4px">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font:400 18px var(--serif)">' + esc(p.name) + '</b>' +
        '<span>' + chip(esc(p.cat), 'navy') + ' <button class="linkbtn" data-hlvl="' + p.id + '" style="text-decoration:none">' + chip(esc(p.level)) + '</button>' + (p.active ? ' ' + chip('active', 'o') : ' ' + chip('dormant', 'm')) + '</span></div>' +
        '<div class="note" style="margin:6px 0">' + esc(p.freq || '') + (p.started ? ' · since ' + esc(p.started) : '') + ' · ' + (p.sessions || 0) + ' sessions logged' + (days != null ? ' · last ' + days + ' d ago' : p.last ? '' : ' · never logged') + '</div>' +
        (p.notes ? '<p class="note" style="font-style:italic">' + esc(p.notes) + '</p>' : '') +
        '<div style="display:flex;gap:10px;margin:8px 0 10px;flex-wrap:wrap">' +
        '<button class="mini-btn" type="button" data-hlog="' + p.id + '">log a session</button>' +
        '<button class="mini-btn" type="button" data-hact="' + p.id + '">' + (p.active ? 'mark dormant' : 'mark active') + '</button>' +
        '<button class="linkbtn del" data-hdel="' + p.id + '">retire</button></div>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<hr class="gold-rule">' +
    '<form id="h-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Pursuit *</label><input type="text" name="name" required placeholder="Watch repair"></div>' +
    '<div class="field"><label>Category</label><select name="cat">' + CATS.map(c => '<option>' + c + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Level</label><select name="level">' + LEVELS.map(c => '<option>' + c + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Cadence</label><input type="text" name="freq" placeholder="weekly, seasonal…"></div>' +
    '<div class="field"><label>Since</label><input type="text" name="started" placeholder="2019"></div>' +
    '<div class="field"><label>Notes</label><input type="text" name="notes" placeholder="why it matters"></div>' +
    '</div><button class="btn gold sm" type="submit">Add pursuit</button></form></div>';

  html += '<div class="card">' + cardT('Projects & makes', 'click status to advance: planned → in progress → done') +
    (H.projects.length ? '<table class="ledger"><thead><tr><th>Project</th><th>Pursuit</th><th>Status</th><th>Notes</th><th></th></tr></thead><tbody>' +
      H.projects.map(pr => '<tr><td><b>' + esc(pr.name) + '</b></td><td class="hint">' + esc(pr.hobby || '') + '</td>' +
        '<td><button class="linkbtn" data-pstat="' + pr.id + '" style="text-decoration:none">' + chip(esc(pr.status), pr.status === 'done' ? 'o' : pr.status === 'in progress' ? 'gold' : '') + '</button></td>' +
        '<td class="hint">' + esc(pr.notes || '') + '</td><td><button class="linkbtn del" data-pdel2="' + pr.id + '">✕</button></td></tr>').join('') +
      '</tbody></table>' : '<p class="note">No makes in flight — a pursuit without a project is a taste; give it something to build.</p>') +
    '<form id="proj-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Project *</label><input type="text" name="name" required placeholder="Resole the brown oxfords"></div>' +
    '<div class="field"><label>Pursuit</label><select name="hobby">' + H.pursuits.map(p => '<option>' + esc(p.name) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Status</label><select name="status">' + ['planned', 'in progress', 'done'].map(x => '<option>' + x + '</option>').join('') + '</select></div>' +
    '</div><div class="field"><label>Notes</label><input type="text" name="notes"></div>' +
    '<button class="btn gold sm" type="submit">Add project</button></form></div>';

  html += '<div class="card">' + cardT('Kit & wishlist', 'what the pursuits still want') +
    (H.wishlist.length ? H.wishlist.map(w =>
      '<div class="due-item"><span>' + (w.got ? '<s style="color:var(--muted)">' + esc(w.item) + '</s>' : '<b>' + esc(w.item) + '</b>') + ' <span class="hint">· ' + esc(w.hobby || '') + (w.note ? ' · ' + esc(w.note) : '') + '</span></span>' +
      '<span class="amt"><button class="linkbtn" data-wgot="' + w.id + '">' + (w.got ? 'return to wish' : 'mark acquired') + '</button> <button class="linkbtn del" data-wdel2="' + w.id + '">✕</button></span></div>').join('')
      : '<p class="note">Nothing wanted — either the kit is complete or the ambitions are too small.</p>') +
    '<form id="wish-form"><div class="grid g3" style="gap:10px;margin-top:12px">' +
    '<div class="field"><label>Item *</label><input type="text" name="item" required placeholder="Lasting set, size 7"></div>' +
    '<div class="field"><label>For</label><select name="hobby">' + H.pursuits.map(p => '<option>' + esc(p.name) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Note</label><input type="text" name="note"></div></div>' +
    '<button class="btn gold sm" type="submit">Add to wishlist</button></form></div>';

  root.innerHTML = html;

  bindForm(root.querySelector('#h-form'), fd => {
    const H2 = hobbies();
    H2.pursuits.push({id: 'h' + Date.now().toString(36), name: fd.get('name').trim(), cat: fd.get('cat'), level: fd.get('level'), freq: fd.get('freq').trim(), started: fd.get('started').trim(), notes: fd.get('notes').trim(), active: true, last: '', sessions: 0});
    setHobbies(H2);
    toast(fd.get('name').trim() + ' joins the ledger.');
    navigate();
  });
  bindForm(root.querySelector('#proj-form'), fd => {
    const H2 = hobbies();
    H2.projects.push({id: 'pj' + Date.now().toString(36), name: fd.get('name').trim(), hobby: fd.get('hobby'), status: fd.get('status'), notes: fd.get('notes').trim()});
    setHobbies(H2);
    navigate();
  });
  bindForm(root.querySelector('#wish-form'), fd => {
    const H2 = hobbies();
    H2.wishlist.push({id: 'w' + Date.now().toString(36), item: fd.get('item').trim(), hobby: fd.get('hobby'), note: fd.get('note').trim(), got: false});
    setHobbies(H2);
    navigate();
  });
  root.addEventListener('click', e => {
    const hit = sel => e.target.closest(sel);
    let H2, x;
    if ((x = hit('[data-hlog]'))){
      H2 = hobbies(); x = H2.pursuits.find(p => p.id === x.dataset.hlog);
      x.last = iso(new Date()); x.sessions = (x.sessions || 0) + 1;
      setHobbies(H2); toast('Session logged for ' + x.name + ' — ' + x.sessions + ' in the book.');
      navigate(); return;
    }
    if ((x = hit('[data-hact]'))){
      H2 = hobbies(); x = H2.pursuits.find(p => p.id === x.dataset.hact);
      x.active = !x.active; setHobbies(H2); navigate(); return;
    }
    if ((x = hit('[data-hlvl]'))){
      H2 = hobbies(); x = H2.pursuits.find(p => p.id === x.dataset.hlvl);
      x.level = LEVELS[(LEVELS.indexOf(x.level) + 1) % LEVELS.length]; setHobbies(H2); navigate(); return;
    }
    if ((x = hit('[data-hdel]'))){
      if (confirm('Retire this pursuit from the ledger?')){
        H2 = hobbies(); H2.pursuits = H2.pursuits.filter(p => p.id !== x.dataset.hdel); setHobbies(H2); navigate();
      }
      return;
    }
    if ((x = hit('[data-pstat]'))){
      H2 = hobbies(); x = H2.projects.find(p => p.id === x.dataset.pstat);
      x.status = x.status === 'planned' ? 'in progress' : x.status === 'in progress' ? 'done' : 'planned';
      setHobbies(H2); navigate(); return;
    }
    if ((x = hit('[data-pdel2]'))){
      H2 = hobbies(); H2.projects = H2.projects.filter(p => p.id !== x.dataset.pdel2); setHobbies(H2); navigate(); return;
    }
    if ((x = hit('[data-wgot]'))){
      H2 = hobbies(); x = H2.wishlist.find(w => w.id === x.dataset.wgot);
      x.got = !x.got; setHobbies(H2); navigate(); return;
    }
    if ((x = hit('[data-wdel2]'))){
      H2 = hobbies(); H2.wishlist = H2.wishlist.filter(w => w.id !== x.dataset.wdel2); setHobbies(H2); navigate(); return;
    }
  });
}

/* ---------------- XII · ESTATE & HOME ---------------------------------- */
function rEstate(root){
  const st = LS.get('estate.v1', {household: {}, documents: {}});
  if (!st.household) st.household = {};
  if (!st.documents) st.documents = {};

  let html = secHead('Section XIII · Estate & Home', 'The Estate & Household',
    '“Nothing is here yet but car, house, furniture, appliances, art, décor etc. will when relevant” — the sheet’s own note. What exists today: the care kit, the paper trail, and the placeholders.');

  html += '<div class="grid g2">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('Household & care kit', 'recorded possessions') +
    DATA.estate.household.map((it, i) =>
      '<label class="ck"><input type="checkbox" data-e="household-' + i + '" ' + (st.household[i] ? 'checked' : '') + '><span class="box"></span><span class="tx">' + esc(it) + '</span></label>').join('') +
    '<p class="note" style="margin-top:10px">Tick when in hand and in its place. The valet tray lives with the shoe rotation (Sundays).</p></div>';
  const DOCDEF = [
    {key: 'passport', title: 'Passport', sensitive: ['number'], fields: [['country', 'Issuing country', 'text'], ['number', 'Passport number', 'password'], ['issue', 'Issue date', 'date'], ['expiry', 'Expiry date', 'date'], ['location', 'Where kept', 'text']]},
    {key: 'licence', title: 'Driving licence', sensitive: ['number'], fields: [['number', 'Licence number', 'password'], ['expiry', 'Expiry date', 'date'], ['categories', 'Categories', 'text'], ['location', 'Where kept', 'text']]},
    {key: 'ni', title: 'National Insurance', sensitive: ['number'], fields: [['number', 'NI number', 'password'], ['location', 'Where kept', 'text']]},
    {key: 'birth', title: 'Birth certificate', sensitive: [], fields: [['reg', 'Registration district / number', 'text'], ['location', 'Where kept', 'text']]},
    {key: 'insurance', title: 'Life insurance (from work)', sensitive: ['policy'], fields: [['provider', 'Provider', 'text'], ['policy', 'Policy number', 'password'], ['cover', 'Sum covered', 'text'], ['beneficiary', 'Beneficiary', 'text'], ['location', 'Where kept', 'text']]}
  ];
  const D = docs();
  function expChip(rec){
    if (!rec || !rec.expiry) return '';
    const dt = pdate(rec.expiry);
    if (!dt) return '';
    const days = Math.round((dt - today0()) / 864e5);
    return days < 0 ? chip('expired', 'red') : days < 270 ? chip('renew · ' + days + ' d', 'r') : chip('valid · ' + days + ' d', 'o');
  }
  function docChips(dd, rec){
    return (dd.fields.some(f => rec[f[0]]) ? chip('recorded', 'o') : chip('missing', 'm')) + ' ' + expChip(rec);
  }
  html += '<div class="card" style="margin-bottom:0">' + cardT('Document status', 'at a glance') +
    DOCDEF.map(dd => {
      const rec = D[dd.key] || {};
      return '<div class="due-item"><span><b>' + dd.title + '</b></span><span class="amt" id="dst-' + dd.key + '">' + docChips(dd, rec) + '</span></div>';
    }).join('') +
    '<p class="note" style="margin-top:10px">The register below holds the details; expiry warnings feed the dashboard and the Travel section’s six-month rule.</p></div>';
  html += '</div>';

  /* the register itself */
  html += '<div class="card" style="margin-top:20px">' + cardT('Documents register', 'masked by default · saved as you type') +
    '<div class="grid g2">' + DOCDEF.map(dd => {
      const rec = D[dd.key] || {};
      return '<div style="border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:var(--surface2)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap"><b style="font:400 16px var(--serif)">' + dd.title + '</b>' +
        '<span id="drg-' + dd.key + '">' + docChips(dd, rec) +
        (dd.sensitive.length ? ' <button class="mini-btn" type="button" data-eye="' + dd.key + '">' + (rec._show ? 'mask' : 'reveal') + '</button>' : '') +
        ' <span class="saved-flag" id="dsf-' + dd.key + '">✓ saved</span></span></div>' +
        dd.fields.map(f => '<div class="field" style="margin-bottom:8px"><label>' + f[1] + '</label><input type="' + (rec._show ? 'text' : f[2]) + '" data-doc="' + dd.key + '.' + f[0] + '" value="' + esc(rec[f[0]] || '') + '" autocomplete="off" placeholder="' + (f[2] === 'date' ? 'yyyy-mm-dd' : '—') + '"></div>').join('') +
        '</div>';
    }).join('') + '</div>' +
    '<p class="note" style="margin-top:12px">Sensitive fields are masked while typed and live only in this browser’s local storage — the same place as your ticks, included in Vault backups and wiped by “forget key”. Treat this as an index of numbers, dates and where each original sits in the physical folder; never store scanned documents here.</p></div>';

  html += '<div class="card" style="margin-top:20px">' + cardT('Future assets', 'when relevant') +
    '<div class="future-grid">' + DATA.estate.future.map(f =>
      '<div class="future-card"><span class="em">' + esc(f) + '</span>awaiting its chapter</div>').join('') + '</div></div>';

  html += '<div class="card">' + cardT('Related holdings', 'elsewhere in the compendium') +
    '<div class="stat-inline">' +
    '<span class="si">Wardrobe register<b>' + wardrobeCounts().held + '/' + wardrobeCounts().T + '</b></span>' +
    '<span class="si">Shoe care rotation<b>3 pairs · Sundays</b></span>' +
    '<span class="si">House deposit (LISA)<b>' + money(627.82) + '</b></span>' +
    '<span class="si">Life insurance<b>via employer</b></span>' +
    '</div></div>';

  const assets = LS.get('assets.v1', []);
  html += '<div class="card" style="margin-top:20px">' + cardT('Assets & appliances', 'the household inventory · warranties watched') +
    (assets.length ? '<div class="table-scroll"><table class="ledger"><thead><tr><th>Item</th><th>Purchased</th><th>Warranty until</th><th>Where / notes</th><th></th></tr></thead><tbody>' +
      assets.map(ast => {
        const wd = pdate(ast.warranty);
        const wchip = wd ? (() => { const days = Math.round((wd - today0()) / 864e5); return days < 0 ? chip('expired', 'red') : days < 90 ? chip(days + ' d left', 'r') : chip('in warranty', 'o'); })() : '';
        return '<tr><td><b>' + esc(ast.name) + '</b></td><td>' + esc(ast.purchased || '—') + '</td><td>' + esc(ast.warranty || '—') + ' ' + wchip + '</td><td class="hint">' + esc(ast.where || '') + '</td><td><button class="linkbtn del" data-adel="' + ast.id + '">✕</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      : '<p class="note">Nothing inventoried yet — the bike, the laptop, the fridge, the good pans: purchase dates and warranties, watched for you.</p>') +
    '<form id="asset-form"><div class="grid g4" style="gap:10px">' +
    '<div class="field"><label>Item *</label><input type="text" name="name" required></div>' +
    '<div class="field"><label>Purchased</label><input type="date" name="purchased"></div>' +
    '<div class="field"><label>Warranty until</label><input type="date" name="warranty"></div>' +
    '<div class="field"><label>Where / notes</label><input type="text" name="where"></div>' +
    '</div><button class="btn gold sm" type="submit">Add to inventory</button></form></div>';

  root.innerHTML = html;

  bindForm(root.querySelector('#asset-form'), fd => {
    const name = fd.get('name').trim();
    if (!name) return;
    const list2 = LS.get('assets.v1', []);
    list2.push({id: 'a' + Date.now().toString(36), name, purchased: fd.get('purchased') || '', warranty: fd.get('warranty') || '', where: fd.get('where').trim()});
    LS.set('assets.v1', list2);
    toast(name + ' inventoried.');
    navigate();
  });
  root.addEventListener('click', e => {
    const ad = e.target.closest('[data-adel]');
    if (ad && confirm('Remove this asset from the inventory?')){
      LS.set('assets.v1', LS.get('assets.v1', []).filter(x => x.id !== ad.dataset.adel));
      navigate();
    }
  });

  root.addEventListener('input', e => {
    const f = e.target.closest('[data-doc]');
    if (!f) return;
    const dot = f.dataset.doc.indexOf('.');
    const key = f.dataset.doc.slice(0, dot), field = f.dataset.doc.slice(dot + 1);
    const d = docs();
    d[key] = Object.assign({}, d[key]);
    d[key][field] = f.value;
    setDocs(d);
    const dd = DOCDEF.find(x => x.key === key);
    if (dd){
      const chips = docChips(dd, d[key]);
      const a = root.querySelector('#dst-' + key), b2 = root.querySelector('#drg-' + key);
      if (a) a.innerHTML = chips;
      if (b2) b2.innerHTML = chips + (dd.sensitive.length ? ' <button class="mini-btn" type="button" data-eye="' + key + '">' + (d[key]._show ? 'mask' : 'reveal') + '</button>' : '') + ' <span class="saved-flag" id="dsf-' + key + '">✓ saved</span>';
    }
    const fl = root.querySelector('#dsf-' + key);
    if (fl){ fl.classList.add('show'); setTimeout(() => fl.classList.remove('show'), 900); }
  });
  root.addEventListener('click', e => {
    const eye = e.target.closest('[data-eye]');
    if (eye){
      const d = docs();
      d[eye.dataset.eye] = Object.assign({}, d[eye.dataset.eye] || {});
      d[eye.dataset.eye]._show = !d[eye.dataset.eye]._show;
      setDocs(d);
      navigate();
      return;
    }
  });
  root.addEventListener('change', e => {
    const ck = e.target.closest('[data-e]');
    if (!ck) return;
    const [grp, i] = ck.dataset.e.split('-');
    const s = LS.get('estate.v1', {household: {}, documents: {}});
    if (ck.checked) s[grp][i] = true; else delete s[grp][i];
    LS.set('estate.v1', s);
  });
}

/* ---------------- XIII · TRAVEL & VISITS ------------------------------- */
function rTravel(root){
  let list = places();
  let editing = null;
  const pd = passportDays();
  const been = list.filter(p => p.kind === 'Been').sort((a, b) => (b.when || '').localeCompare(a.when || ''));
  const wish = list.filter(p => p.kind === 'Wish');
  const recCount = been.reduce((a, p) => a + [p.eat, p.stay, p.do].filter(x => x && x.trim()).length, 0);

  let html = secHead('Section XIV · Travel & Visits', 'The Travel Book',
    'Places you have been and what to do there — eat, stay, do — written down while they are still true. The former first, always; the wish list waits at the foot of the page.');

  html += '<div class="tiles">' +
    tile('Places been', been.length, recCount + ' recommendations recorded', 'navy') +
    tile('Wish list', wish.length, 'places still waiting') +
    tile('Passport validity', pd == null ? 'not recorded' : pd + ' <small>days</small>', pd == null ? 'record it in Estate → documents' : (pd < 0 ? 'expired' : pd < 270 ? 'six-month rule at risk' : 'six-month rule safe'), pd == null ? 'red' : pd < 270 ? 'rust' : 'green') +
    tile('Last entry', been.length ? esc(been[0].when || been[0].place) : '—', been.length ? 'most recently written' : 'the book awaits') +
    '</div>';

  /* the been list */
  html += '<div class="card">' + cardT('The been list', 'places, and what they are worth') +
    (been.length ? been.map(p =>
      '<div style="border-top:1px solid var(--line); padding:16px 0 18px">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font:400 19px var(--serif)">' + esc(p.place) + '</b>' +
      '<span class="hint">' + esc(p.when || '') + ' · <span style="color:var(--gold);letter-spacing:.15em">' + '★'.repeat(p.rating || 0) + '☆'.repeat(5 - (p.rating || 0)) + '</span>' +
      ' <button class="linkbtn" data-pe2="' + p.id + '">edit</button> <button class="linkbtn del" data-pr2="' + p.id + '">delete</button></span></div>' +
      '<div class="kv" style="margin-top:10px">' +
      (p.eat ? '<dt>Eat</dt><dd>' + esc(p.eat) + '</dd>' : '') +
      (p.stay ? '<dt>Stay</dt><dd>' + esc(p.stay) + '</dd>' : '') +
      (p.do ? '<dt>Do</dt><dd>' + esc(p.do) + '</dd>' : '') +
      '</div>' +
      (p.notes ? '<p class="review-prose" style="margin-top:10px;font-size:14px">' + esc(p.notes) + '</p>' : '') +
      '</div>').join('')
      : '<p class="note">Nothing written yet. The first entry is the hardest and the most valuable — start with somewhere you know by heart.</p>') +
    '</div>';

  /* the wish list */
  html += '<div class="card">' + cardT('The wish list', 'a hint of elsewhere') +
    (wish.length ? wish.map(p =>
      '<div class="due-item"><span><b>' + esc(p.place) + '</b>' + (p.notes ? ' <span class="hint">· ' + esc(p.notes) + '</span>' : '') + '</span>' +
      '<span class="amt"><button class="linkbtn" data-been="' + p.id + '">mark been</button> <button class="linkbtn" data-pe2="' + p.id + '">edit</button> <button class="linkbtn del" data-pr2="' + p.id + '">✕</button></span></div>').join('')
      : '<p class="note">Empty — for now.</p>') +
    '<p class="note" style="margin-top:10px">“Mark been” moves a place up into the been list; fill in what to eat, stay and do while the memory is warm.</p></div>';

  /* entry form */
  html += '<div class="card">' + cardT(editing ? 'Edit an entry' : 'Write an entry', '') +
    '<form id="place-form"><div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Place *</label><input type="text" name="place" required placeholder="Kyoto"></div>' +
    '<div class="field"><label>List</label><select name="kind"><option>Been</option><option>Wish</option></select></div>' +
    '<div class="field"><label>When (been)</label><input type="text" name="when" placeholder="Apr 2024"></div>' +
    '<div class="field"><label>Rating</label><select name="rating">' + [5, 4, 3, 2, 1].map(r => '<option value="' + r + '">' + r + ' ★</option>').join('') + '</select></div>' +
    '</div>' +
    '<div class="grid g3" style="gap:10px">' +
    '<div class="field"><label>Eat</label><input type="text" name="eat" placeholder="the one place, always"></div>' +
    '<div class="field"><label>Stay</label><input type="text" name="stay" placeholder="hotel, ryokan, friend’s sofa"></div>' +
    '<div class="field"><label>Do</label><input type="text" name="do" placeholder="the thing worth the queue"></div>' +
    '</div>' +
    '<div class="field"><label>Notes</label><textarea name="notes" style="min-height:70px" placeholder="what you would tell a friend at the pub…"></textarea></div>' +
    '<button class="btn gold sm" type="submit" id="place-save">Add to the book</button></form></div>';

  root.innerHTML = html;

  function readForm(fd){
    return {
      id: editing || 'pl' + Date.now().toString(36),
      place: fd.get('place').trim(), kind: fd.get('kind'), when: fd.get('when').trim(),
      rating: +fd.get('rating'), eat: fd.get('eat').trim(), stay: fd.get('stay').trim(),
      do: fd.get('do').trim(), notes: fd.get('notes').trim()
    };
  }
  bindForm(root.querySelector('#place-form'), fd => {
    const entry = readForm(fd);
    if (!entry.place) return;
    list = editing ? list.map(p => p.id === editing ? entry : p) : list.concat([entry]);
    LS.set('places.v1', list);
    editing = null;
    toast(entry.kind === 'Been' ? entry.place + ' written into the been list.' : entry.place + ' added to the wish list.');
    navigate();
  });
  root.addEventListener('click', e => {
    const ed = e.target.closest('[data-pe2]');
    if (ed){
      const p = list.find(x => x.id === ed.dataset.pe2);
      if (!p) return;
      editing = p.id;
      const f = root.querySelector('#place-form');
      f.elements.place.value = p.place; f.elements.kind.value = p.kind; f.elements.when.value = p.when || '';
      f.elements.rating.value = p.rating || 5; f.elements.eat.value = p.eat || ''; f.elements.stay.value = p.stay || '';
      f.elements.do.value = p.do || ''; f.elements.notes.value = p.notes || '';
      root.querySelector('#place-save').textContent = 'Update entry';
      return;
    }
    const del = e.target.closest('[data-pr2]');
    if (del){
      if (confirm('Remove this entry from the book?')){
        list = list.filter(p => p.id !== del.dataset.pr2);
        LS.set('places.v1', list);
        navigate();
      }
      return;
    }
    const bn = e.target.closest('[data-been]');
    if (bn){
      list = list.map(p => p.id === bn.dataset.been ? Object.assign({}, p, {kind: 'Been', when: p.when || new Date().toLocaleDateString('en-GB', {month: 'short', year: 'numeric'})}) : p);
      LS.set('places.v1', list);
      toast('Moved to the been list — add what to eat, stay and do.');
      navigate();
    }
  });
}

/* ---------------- XIV · VAULT ------------------------------------------ */
function rVault(root){
  const rec = Gate.rec();
  const auto = LS.get('autolock.v1', 0);
  const bk = backupAgeDays();
  const snaps = snapshots();
  const remembered = LS.get('remember.v1', false);

  let html = secHead('Section XV · Vault', 'Saving & Your Key',
    'Everything you do — every tick, log, edit, contact and document — saves itself instantly as you type or click. This room is for the extras: save points you can roll back to, backups for moving device, and your key.');

  html += '<div class="tiles">' +
    tile('Auto-save', 'On', 'continuous · nothing to press', 'green') +
    tile('Save points', snaps.length, 'in-browser rollbacks (keep 12)', snaps.length ? '' : 'navy') +
    tile('Last file backup', bk == null ? 'never' : bk + ' <small>d ago</small>', bk == null ? 'download one when you want an off-device copy' : (bk > 30 ? 'getting stale' : 'fresh'), bk == null ? '' : (bk > 30 ? 'rust' : 'green')) +
    tile('Key', rec ? 'set' : 'none', rec ? (remembered ? 'this device is remembered' : 'asked at each open') + ' · ' + (rec.method === 'fb' ? 'local digest' : 'SHA-256') : 'create one at the gate', 'navy') +
    '</div>';

  /* one-tap saving */
  html += '<div class="card">' + cardT('Saving, made simple', 'four buttons cover everything') +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button class="btn gold" type="button" id="snap-make">Save a point</button>' +
    '<button class="btn" type="button" id="export-btn">Download backup</button>' +
    '<button class="btn ghost" type="button" id="copy-btn">Copy backup</button>' +
    '<label class="btn ghost" style="cursor:pointer">Restore from file<input type="file" id="import-file" accept=".json,application/json" style="display:none"></label>' +
    '</div>' +
    '<p class="gate-err" id="backup-msg" style="min-height:18px;color:var(--green)"></p>' +
    '<div id="json-wrap" style="display:none;margin-top:6px"><textarea id="backup-ta" readonly aria-label="Backup JSON" style="width:100%;min-height:130px;font:11px/1.5 var(--mono);padding:10px;border:1px solid var(--line2);border-radius:8px;background:var(--surface2);color:var(--ink2)"></textarea></div>' +
    '<div id="savefile-line" class="note" style="display:none;margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><b>Save file:</b> <code style="font-family:var(--mono);font-size:11.5px"></code><span id="savemeta" class="hint"></span> — written atomically on every change (and every 60 s), with a <code>.bak</code> rollback beside it and a dated copy each day in <code>Compendium-saves</code> (last 14 kept). A real file on your disk, not a cache. ' +
    '<button class="mini-btn" type="button" id="savefile-open">open folder</button> <button class="mini-btn" type="button" id="savefile-now">write now</button></div>' +
    '<hr class="gold-rule">' +
    '<div class="card-t" style="border-bottom:none;padding-bottom:4px"><span>Save points</span><small>restoring rolls back to the point — later additions are cleared</small></div>' +
    '<div id="snap-list"></div>' +
    '<p class="note" style="margin-top:10px">Save points live in this browser only (handy before a big edit spree). The download is a plain JSON file of everything — keep it like any personal document.</p></div>';

  /* what's stored */
  const census = stateCensus();
  html += '<div class="grid g2" style="margin-top:20px">';
  html += '<div class="card" style="margin-bottom:0">' + cardT('What’s being saved', 'live census of this browser') +
    '<table class="ledger"><tbody>' + census.map(c => '<tr><td>' + c[0] + '</td><td class="num">' + c[1] + ' record' + (c[1] === 1 ? '' : 's') + '</td></tr>').join('') +
    '</tbody></table>' +
    '<div style="margin-top:12px">' + bar(storageBytes() / (5 * 1024 * 1024) * 100, 'gold', true) +
    '<p class="hint" style="margin-top:5px">' + (storageBytes() / 1024).toFixed(1) + ' KB of a ≈5 MB browser budget</p></div></div>';

  /* key & lock */
  html += '<div class="card" style="margin-bottom:0">' + cardT('Key & lock', 'local-only build — the key is a courtesy, not a vault door') +
    '<label class="ck" style="margin-bottom:8px"><input type="checkbox" id="ask-key" ' + (remembered ? '' : 'checked') + '><span class="box"></span><span class="tx">Ask for my key when the site opens in this browser</span></label>' +
    '<div class="field"><label>Lock automatically after idle</label><select id="autolock-sel">' +
    [[0, 'Never'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour']].map(o => '<option value="' + o[0] + '"' + (auto === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
    '</select></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost sm" type="button" id="lock-now">Lock now</button>' +
    '<button class="btn ghost sm" type="button" id="reset-params">Reset edited values to workbook</button></div>' +
    '<details class="ckl" style="margin-top:12px"><summary>change my key</summary>' +
    '<form id="key-form"><div class="field"><label>Current key</label><input type="password" id="kc-cur" autocomplete="current-password"></div>' +
    '<div class="grid g2" style="gap:10px"><div class="field"><label>New key</label><input type="password" id="kc-new" autocomplete="new-password"></div>' +
    '<div class="field"><label>Confirm new key</label><input type="password" id="kc-new2" autocomplete="new-password"></div></div>' +
    '<button class="btn gold sm" type="submit">Change key</button>' +
    '<p class="gate-err" id="key-msg" style="min-height:18px"></p></form></details>' +
    '<p class="note" style="margin-top:12px">Forgotten key? The gate offers a full erase — there is no back door, and that is the whole point of having a key at all.</p></div>';
  html += '</div>';

  /* edited inputs registry */
  const ov = pOver();
  const ovKeys = Object.keys(ov);
  html += '<div class="card" style="margin-top:20px">' + cardT('Edited inputs', ovKeys.length ? ovKeys.length + ' override' + (ovKeys.length === 1 ? '' : 's') + ' on workbook defaults — each revertible' : 'everything at workbook values') +
    (ovKeys.length ?
      '<div class="table-scroll"><table class="ledger"><thead><tr><th>Input</th><th class="num">Your value</th><th class="num">Workbook default</th><th></th></tr></thead><tbody>' +
      ovKeys.slice().sort().map(k => {
        const parts = k.split('.');
        let def = PDEF;
        for (const p of parts) def = def == null ? undefined : def[p];
        const show = v => typeof v === 'number' ? (Math.abs(v) >= 1000 ? money0(v) : String(Math.round(v * 100) / 100)) : String(v);
        return '<tr><td class="hint" style="font-family:var(--mono)">' + esc(k) + '</td><td class="num"><b>' + esc(show(ov[k])) + '</b></td><td class="num" style="color:var(--muted)">' + esc(show(def)) + '</td><td><button class="linkbtn" data-prev="' + esc(k) + '">revert</button></td></tr>';
      }).join('') +
      '</tbody></table></div>'
      : '<p class="note">Nothing edited yet. Switch on ✎ in the top bar and click any gold-underlined value; it appears here the moment it saves.</p>') +
    '</div>';

  root.innerHTML = html;

  function paintSnaps(){
    const list = snapshots();
    root.querySelector('#snap-list').innerHTML = list.length ?
      '<table class="ledger"><thead><tr><th>Save point</th><th>When</th><th class="num">Records</th><th></th></tr></thead><tbody>' +
      list.slice().reverse().map(s => '<tr><td><b>' + esc(s.name) + '</b></td><td class="hint">' + esc(s.at) + '</td><td class="num">' + s.n + '</td>' +
        '<td style="white-space:nowrap"><button class="linkbtn" data-snap-restore="' + s.id + '">restore</button> <button class="linkbtn del" data-snap-del="' + s.id + '">delete</button></td></tr>').join('') +
      '</tbody></table>'
      : '<p class="note">No save points yet — “Save a point” stamps everything as it is right now.</p>';
  }
  paintSnaps();

  if (typeof window.nativeSavePath === 'function'){
    try{
      window.nativeSavePath().then(p => {
        const line = root.querySelector('#savefile-line');
        if (!line || !p) return;
        line.style.display = '';
        line.querySelector('code').textContent = p;
        if (typeof window.nativeSaveMeta === 'function'){
          window.nativeSaveMeta().then(ms => {
            try{
              const meta = JSON.parse(ms);
              const extra = line.querySelector('#savemeta');
              if (extra) extra.textContent = ' · last write ' + (meta.mtime || '—') + ' · ' + (meta.dailies || 0) + ' daily copie' + ((meta.dailies || 0) === 1 ? 'y' : 's') + ' in Compendium-saves\\';
            }catch(e){}
          });
        }
      });
    }catch(e){}
  }
  root.querySelector('#savefile-open').addEventListener('click', () => {
    if (typeof window.nativeOpenSaveDir === 'function'){ try{ window.nativeOpenSaveDir(); }catch(e){} }
  });
  root.querySelector('#savefile-now').addEventListener('click', () => {
    syncFlush(true);
    toast('Save file written.');
  });
  root.querySelector('#snap-make').addEventListener('click', () => {
    const s = makeSnapshot();
    paintSnaps();
    toast('Save point kept: ' + s.name + ' (' + s.n + ' records).');
  });
  root.addEventListener('click', e => {
    const rv = e.target.closest('[data-prev]');
    if (rv){
      const o = pOver();
      delete o[rv.dataset.prev];
      LS.set('params.v1', o);
      toast('Reverted ' + rv.dataset.prev + ' to the workbook value.');
      navigate();
      return;
    }
    const rs = e.target.closest('[data-snap-restore]');
    if (rs){
      if (confirm('Restore this save point? Current records it captured will be overwritten.')){
        const n = restoreSnapshot(rs.dataset.snapRestore);
        toast('Restored ' + n + ' records — reloading…');
        setTimeout(() => { try{ location.reload(); }catch(err){} }, 700);
      }
      return;
    }
    const sd = e.target.closest('[data-snap-del]');
    if (sd){
      LS.set('snapshots.v1', snapshots().filter(s => s.id !== sd.dataset.snapDel));
      paintSnaps();
      toast('Save point deleted.');
    }
  });
  root.querySelector('#export-btn').addEventListener('click', () => {
    const msg = root.querySelector('#backup-msg');
    try{
      const n = exportBackup();
      LS.set('lastExport.v1', iso(new Date()));
      msg.textContent = 'Backup of ' + n + ' records downloaded ✓';
      toast('Backup downloaded.');
    }catch(err){
      msg.style.color = 'var(--red)';
      msg.textContent = 'Download blocked here — use “Copy backup” instead.';
    }
  });
  root.querySelector('#copy-btn').addEventListener('click', () => {
    const msg = root.querySelector('#backup-msg');
    copyBackup().then(ok => {
      if (ok){
        LS.set('lastExport.v1', iso(new Date()));
        msg.style.color = 'var(--green)';
        msg.textContent = 'Backup copied to clipboard ✓ paste it into a file anywhere.';
        toast('Backup copied ✓');
      } else {
        const wrap = root.querySelector('#json-wrap');
        root.querySelector('#backup-ta').value = backupJSON();
        wrap.style.display = '';
        msg.style.color = 'var(--red)';
        msg.textContent = 'Clipboard blocked — select the text below and copy manually.';
      }
    });
  });
  root.querySelector('#import-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    const msg = root.querySelector('#backup-msg');
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        const obj = JSON.parse(r.result);
        if (!obj || obj.app !== 'the-life-organisation' || typeof obj.data !== 'object') throw new Error('not a compendium backup');
        let n = 0;
        for (const k in obj.data){ if (k === 'session.v1') continue; LS.set(k, obj.data[k]); n++; }
        msg.style.color = 'var(--green)';
        msg.textContent = 'Restored ' + n + ' records — reloading…';
        setTimeout(() => { try{ location.reload(); }catch(err){} }, 800);
      }catch(err){ msg.style.color = 'var(--red)'; msg.textContent = 'Import failed: ' + err.message; }
    };
    r.readAsText(f);
  });
  root.querySelector('#ask-key').addEventListener('change', e => {
    LS.set('remember.v1', !e.target.checked);
    toast(e.target.checked ? 'The key will be asked at next open.' : 'This device is remembered — no key at next open.');
  });
  root.querySelector('#autolock-sel').addEventListener('change', e => LS.set('autolock.v1', +e.target.value));
  root.querySelector('#lock-now').addEventListener('click', () => {
    Gate.close();
    LS.set('remember.v1', false);
    try{ location.hash = '#/dashboard'; }catch(e){}
    try{ location.reload(); }catch(e){}
  });
  root.querySelector('#reset-params').addEventListener('click', () => {
    if (confirm('Reset every edited input (salary, rates, ISA values, body goals…) back to the original workbook figures? Ticks, logs and contacts are untouched.')){
      resetP();
      toast('All inputs restored to workbook values.');
      navigate();
    }
  });
  bindForm(root.querySelector('#key-form'), async () => {
    const msg = root.querySelector('#key-msg');
    msg.style.color = 'var(--red)'; msg.textContent = '';
    const cur = root.querySelector('#kc-cur').value, nw = root.querySelector('#kc-new').value, nw2 = root.querySelector('#kc-new2').value;
    if (!(await Gate.verify(cur))){ msg.textContent = 'Current key is wrong.'; return; }
    if (nw.length < 4){ msg.textContent = 'New key needs at least 4 characters.'; return; }
    if (nw !== nw2){ msg.textContent = 'The two new entries do not match.'; return; }
    await Gate.create(nw);
    msg.style.color = 'var(--green)'; msg.textContent = 'Key changed ✓';
    toast('Key changed. The old one no longer opens this device.');
    root.querySelector('#kc-cur').value = root.querySelector('#kc-new').value = root.querySelector('#kc-new2').value = '';
  });
}

/* =====================================================================
   SHELL · ROUTER · INIT
   ===================================================================== */
const SECTIONS = [
  {id: 'dashboard',   rn: 'I',     title: 'Dashboard',      sub: 'The day at a glance',          render: rDash},
  {id: 'finances',    rn: 'II',    title: 'Finances',       sub: 'Income · budget · debt',       render: rFin},
  {id: 'investments', rn: 'III',   title: 'Investments',    sub: 'Accounts · allocations',       render: rInv},
  {id: 'wardrobe',    rn: 'IV',    title: 'Wardrobe',       sub: 'Owned · restoration · wanted', render: rWard},
  {id: 'curriculum',  rn: 'V',     title: 'Curriculum',     sub: 'STEM · humanities',            render: rCurr},
  {id: 'training',    rn: 'VI',    title: 'Training',       sub: 'The weekly split',             render: rTrain},
  {id: 'cardio',      rn: 'VII',   title: 'Cardio',         sub: 'The treadmill & stairmaster build', render: rCardio},
  {id: 'body',        rn: 'VIII',  title: 'Body',           sub: 'Physique · nutrition',         render: rBody},
  {id: 'grooming',    rn: 'IX',    title: 'Grooming',       sub: 'Skincare · fragrance',         render: rGroom},
  {id: 'network',     rn: 'X',     title: 'Network',        sub: 'The contact book',             render: rNet},
  {id: 'career',      rn: 'XI',    title: 'Career',         sub: 'Roles · objectives · skills',  render: rCareer},
  {id: 'hobbies',     rn: 'XII',   title: 'Hobbies',        sub: 'Pursuits · projects · kit',    render: rHobbies},
  {id: 'estate',      rn: 'XIII',  title: 'Estate & Home',  sub: 'Assets · documents register',  render: rEstate},
  {id: 'travel',      rn: 'XIV',   title: 'Travel Book',    sub: 'Been · recommended · wish list', render: rTravel},
  {id: 'vault',       rn: 'XV',    title: 'Vault',          sub: 'Keys · backups · edit resets', render: rVault},
  {id: 'tasks',       rn: 'XVI',   title: 'Tasks',          sub: 'Can do now · future to do',    render: rTasks}
];

function buildNav(){
  const nav = document.getElementById('nav');
  nav.querySelectorAll('a').forEach(a => a.remove());
  SECTIONS.forEach(s => {
    const a = document.createElement('a');
    a.href = '#/' + s.id;
    a.dataset.id = s.id;
    a.innerHTML = '<span class="rn">' + s.rn + '</span><span class="lbl">' + s.title + '</span>';
    nav.appendChild(a);
  });
}

let lastSecId = null;
function currentSection(){
  const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return SECTIONS.find(s => s.id === h) || SECTIONS[0];
}

function navigate(){
  const sec = currentSection();
  document.querySelectorAll('#nav a').forEach(a => {
    const on = a.dataset.id === sec.id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('tb-rn').textContent = sec.rn;
  document.getElementById('tb-title').textContent = sec.title;
  document.getElementById('tb-sub').textContent = sec.sub;
  document.title = sec.rn + ' · ' + sec.title + ' — The Life Organisation';
  const view = document.getElementById('view');
  view.innerHTML = '';
  const root = document.createElement('div');
  view.appendChild(root);
  const yBefore = window.scrollY;
  try { sec.render(root); }
  catch (err){ view.innerHTML = '<div class="card"><p class="note">This section hit an error: ' + esc(err.message) + '</p></div>'; console.error(err); }
  if (sec.id !== lastSecId){ window.scrollTo({top: 0}); }
  else { window.scrollTo({top: Math.min(yBefore, Math.max(0, document.body.scrollHeight - window.innerHeight))}); }
  lastSecId = sec.id;
}

function initShell(){
  if (window.__lifeosShell) return;   /* idempotent: never double-bind */
  window.__lifeosShell = true;
  /* footer contacts */
  const em = document.getElementById('f-email');
  em.textContent = DATA.profile.email; em.href = 'mailto:' + DATA.profile.email;
  const ph = document.getElementById('f-phone');
  ph.textContent = DATA.profile.phone; ph.href = 'tel:' + DATA.profile.phone.replace(/[^+\d]/g, '');
  const li = document.getElementById('f-linkedin');
  li.textContent = DATA.profile.linkedinLabel; li.href = DATA.profile.linkedin;
  document.getElementById('f-asof').textContent = dateMed(new Date(DATA.asOf));
  const verEl = document.getElementById('f-ver');
  if (verEl) verEl.textContent = VERSION;

  /* theme: light → dark → auto (follows the system) */
  const tbtn = document.getElementById('theme-btn');
  tbtn.addEventListener('click', () => {
    const cur = LS.get('theme', 'light');
    applyThemePref(cur === 'light' ? 'dark' : cur === 'dark' ? 'auto' : 'light');
  });
  applyThemePref(LS.get('theme', 'light'));

  /* sidebar collapse */
  const sbtn = document.getElementById('side-btn');
  const appEl = document.querySelector('.app');
  if (LS.get('side.v1', false)) appEl.classList.add('collapsed');
  function syncSide(){
    const c = appEl.classList.contains('collapsed');
    sbtn.textContent = c ? '»' : '«';
    sbtn.title = c ? 'Expand sidebar' : 'Collapse sidebar';
  }
  sbtn.addEventListener('click', () => {
    appEl.classList.toggle('collapsed');
    LS.set('side.v1', appEl.classList.contains('collapsed'));
    syncSide();
  });
  syncSide();

  /* shortcuts overlay */
  const help = document.createElement('div');
  help.id = 'help';
  help.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(20,24,32,.45);display:none;justify-content:center;padding-top:14vh';
  help.innerHTML = '<div class="pal-box" style="max-width:480px"><div style="padding:16px 20px 6px;font:400 17px var(--serif)">Keys of the house</div>' +
    '<div class="pal-list" style="max-height:none">' +
    [['Ctrl / ⌘ K', 'command bar — jump, search, &gt; commands'],
     ['Alt + 1…0', 'straight to sections I–X'],
     ['F11 or ⛶', 'true windowless fullscreen (in the exe)'],
     ['✎ button', 'edit mode — every gold-underlined value'],
     ['Esc', 'close palette, help, popovers'],
     ['↵ / Esc', 'commit / cancel an inline edit'],
     ['?', 'this card']].map(k => '<div class="pal-item"><b>' + k[0] + '</b><span style="text-transform:none;letter-spacing:.02em;font-family:var(--sans)">' + k[1] + '</span></div>').join('') +
    '</div></div>';
  document.body.appendChild(help);
  function helpToggle(on){ help.style.display = on ? 'flex' : 'none'; }
  help.addEventListener('click', e => { if (e.target === help) helpToggle(false); });
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?'){ e.preventDefault(); helpToggle(help.style.display !== 'flex'); }
    else if (e.key === 'Escape' && help.style.display === 'flex') helpToggle(false);
  });

  /* back to top */
  const totop = document.createElement('button');
  totop.id = 'totop'; totop.className = 'iconbtn'; totop.title = 'Back to top';
  totop.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:60;opacity:0;pointer-events:none;transition:opacity .25s';
  totop.textContent = '↑';
  totop.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
  document.body.appendChild(totop);
  window.addEventListener('scroll', () => {
    const show = window.scrollY > 700;
    totop.style.opacity = show ? '1' : '0';
    totop.style.pointerEvents = show ? 'auto' : 'none';
  }, {passive: true});

  /* native fullscreen state sync (exe) */
  if (typeof window.nativeFullscreenState === 'function'){
    try{ window.nativeFullscreenState().then(on => { const b = document.getElementById('fs-btn'); if (b){ b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } }); }catch(e){}
  }

  /* fullscreen: native window in the exe, Fullscreen API elsewhere */
  const fsb = document.getElementById('fs-btn');
  function syncFs(on){
    if (fsb){ fsb.classList.toggle('on', !!on); fsb.title = on ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'; fsb.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  function toggleFullscreen(){
    if (typeof window.nativeFullscreen === 'function'){
      try{ window.nativeFullscreen().then(on => syncFs(on)); return; }catch(e){}
    }
    try{
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    }catch(e){}
  }
  fsb.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => syncFs(!!document.fullscreenElement));
  document.addEventListener('keydown', e => { if (e.key === 'F11'){ e.preventDefault(); toggleFullscreen(); } });

  /* edit mode */
  document.getElementById('edit-btn').addEventListener('click', () => setEditMode(!EDIT));
  initEditEngine();

  /* lock button */
  document.getElementById('lock-btn').addEventListener('click', () => {
    Gate.close();
    try{ location.hash = '#/dashboard'; }catch(e){}
    try{ location.reload(); }catch(e){}
  });

  /* auto-lock on idle */
  let lastAct = Date.now();
  ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, {passive: true}));
  setInterval(() => {
    const mins = LS.get('autolock.v1', 0);
    if (mins > 0 && Gate.rec() && Date.now() - lastAct > mins * 60000){
      Gate.close();
      try{ location.reload(); }catch(e){}
    }
  }, 10000);

  /* clock */
  const cd = document.getElementById('clk-date'), ct = document.getElementById('clk-time');
  function tick(){
    const n = new Date();
    cd.textContent = n.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'});
    ct.textContent = n.toTimeString().slice(0, 8);
  }
  tick(); setInterval(tick, 1000);

  /* reset */
  document.getElementById('reset-all').addEventListener('click', () => {
    if (confirm('Clear every local edit (ticks, contacts, career notes, wardrobe changes) and restore the original workbook data?')){
      const theme = LS.get('theme', 'light');
      LS.clearAll();
      LS.set('theme', theme);
      navigate();
    }
  });

  buildNav();
  window.addEventListener('hashchange', navigate);
  if (!location.hash) location.hash = '#/dashboard';
  navigate();
  initPalette();
  /* reading mode */
  const rbtn = document.getElementById('read-btn');
  function setReading(on){
    document.body.classList.toggle('reading', on);
    LS.set('reading.v1', on);
    if (rbtn){ rbtn.classList.toggle('on', on); rbtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  rbtn.addEventListener('click', () => setReading(!LS.get('reading.v1', false)));
  setReading(LS.get('reading.v1', false));

  /* accent + density from personalisation */
  applyAccent();
  applyDensity();

  /* Alt+number section jumps */
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const n = e.key === '0' ? 9 : (+e.key - 1);
    if (isNaN(n) || n < 0 || n >= SECTIONS.length) return;
    e.preventDefault();
    location.hash = '#/' + SECTIONS[n].id;
  });

  /* quick capture */
  const cap = document.getElementById('capture');
  cap.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = cap.value.trim();
    cap.value = '';
    if (!v) return;
    let m;
    if ((m = v.match(/^w\s+(\d+(?:[.,]\d+)?)(?:\s+(\d+(?:[.,]\d+)))?$/i))){
      const w = parseFloat(m[1].replace(',', '.'));
      let bf = null;
      if (m[2]){ let b2 = parseFloat(m[2].replace(',', '.')); if (b2 > 1 && b2 <= 60) b2 /= 100; if (b2 > 0.02 && b2 < 0.6) bf = b2; }
      const log = LS.get('body.log.v1', []);
      log.push({id: 'w' + Date.now().toString(36), d: iso(new Date()), w, bf});
      log.sort((a, b3) => a.d < b3.d ? -1 : 1);
      LS.set('body.log.v1', log);
      toast('Weigh-in captured: ' + w + ' kg');
      return;
    }
    if ((m = v.match(/^b\s+(.+?)\s+(\d+(?:[.,]\d+)?)x(\d+)$/i))){
      const ex = m[1].trim(), w = parseFloat(m[2].replace(',', '.')), r = +m[3];
      const log = liftLog(), prev = liftPR(ex);
      log.push({id: 'f' + Date.now().toString(36), d: iso(new Date()), ex, w, r});
      LS.set('lifts.log.v1', log);
      const nowE = e1rm(w, r);
      toast(prev && nowE > prev.e1 ? 'PR! ' + ex + ' ' + w + '×' + r + ' — e1RM ' + num(nowE, 1) + ' kg' : 'Set captured: ' + ex + ' ' + w + '×' + r);
      return;
    }
    if ((m = v.match(/^c\s+(\d+)(?:\s+(.+))?$/i))){
      const mins = +m[1], type = m[2] || 'Zone 2';
      const log = cardioLog();
      log.push({id: 'l' + Date.now().toString(36), d: iso(new Date()), type, mins, rpe: null, notes: 'quick capture'});
      LS.set('cardio.log.v1', log);
      toast('Cardio captured: ' + mins + ' min');
      return;
    }
    if ((m = v.match(/^s\s+(\d+(?:[.,]\d+)?)(?:\s+([1-5]))?$/i))){
      const h2 = parseFloat(m[1].replace(',', '.')), q = m[2] ? +m[2] : 3;
      const log = sleepLog();
      log.push({id: 's' + Date.now().toString(36), d: iso(new Date()), h: h2, q});
      log.sort((a, b4) => a.d < b4.d ? -1 : 1);
      LS.set('sleep.v1', log);
      toast('Sleep captured: ' + h2 + ' h');
      return;
    }
    if (v[0] === '@'){
      const parts = v.slice(1).split('|').map(x => x.trim());
      if (!parts[0]){ toast('Capture needs a name after @'); return; }
      const c = {id: 'c' + Date.now().toString(36), person: parts[0], phone: parts[1] || '', email: parts[2] || '', dates: parts[3] || '', prefs: '', last: '', mentions: ''};
      LS.set('network.v1', LS.get('network.v1', []).concat([c]));
      toast('Contact captured: ' + c.person);
      return;
    }
    toast('Capture not understood — try w, b, c, s or @');
  });

  /* safety net: periodic flush to the save file while the exe runs */
  setInterval(() => syncFlush(false), 60000);

  /* 1-second ticker: session clock + rest countdown */
  setInterval(() => {
    const swEl = document.getElementById('sw-display');
    if (swEl){
      const sw = LS.get('sw.v1', null);
      swEl.textContent = sw ? fmtClock(Date.now() - sw.start) : '0:00';
    }
    const reEl = document.getElementById('rest-display');
    if (reEl){
      const rest = LS.get('rest.v1', null);
      if (rest){
        const left = rest.until - Date.now();
        if (left <= 0){ reEl.textContent = 'rest over — back to it'; LS.set('rest.v1', null); }
        else {
          reEl.textContent = fmtClock(left);
          const rb = document.getElementById('rest-bar');
          if (rb && rb.firstElementChild) rb.firstElementChild.style.width = clamp(left / rest.total * 100, 0, 100) + '%';
        }
      } else reEl.textContent = '—';
    }
  }, 1000);

  /* installable PWA: manifest + worker only when served over http(s) */
  try{
    if (location.protocol === 'https:' || location.protocol === 'http:'){
      if (!document.querySelector('link[rel="manifest"]')){
        const l = document.createElement('link');
        l.rel = 'manifest'; l.href = 'manifest.webmanifest';
        document.head.appendChild(l);
      }
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }catch(e){}
}

/* ---------------- command bar (Ctrl/⌘ K) ------------------------------ */
function fuzzy(q, t){
  q = q.toLowerCase(); t = t.toLowerCase();
  if (!q) return 1;
  const sub = t.indexOf(q);
  if (sub >= 0) return 200 - sub + (sub === 0 ? 60 : 0) + (q.length / t.length) * 40;
  let ti = 0, score = 0, run = 0;
  for (const ch of q){
    const idx = t.indexOf(ch, ti);
    if (idx < 0) return 0;
    run = (idx === ti) ? run + 2 : 0;
    score += 2 + run + (idx === 0 ? 6 : 0);
    ti = idx + 1;
  }
  return score;
}
const COMMANDS = [
  {t: '> lock now', s: 'command', go: () => { Gate.close(); LS.set('remember.v1', false); try{ location.reload(); }catch(e){} }},
  {t: '> save a point', s: 'command', go: () => { const s = makeSnapshot(); toast('Save point kept: ' + s.name); }},
  {t: '> download backup', s: 'command', go: () => { try{ exportBackup(); LS.set('lastExport.v1', iso(new Date())); toast('Backup downloaded.'); }catch(e){ toast('Download blocked — use Vault → Copy backup.'); } }},
  {t: '> copy backup', s: 'command', go: () => { copyBackup().then(ok => toast(ok ? 'Backup copied ✓' : 'Clipboard blocked — Vault → Copy backup.')); }},
  {t: '> edit mode on/off', s: 'command', go: () => setEditMode(!EDIT)},
  {t: '> theme light', s: 'command', go: () => applyThemePref('light')},
  {t: '> theme dark', s: 'command', go: () => applyThemePref('dark')},
  {t: '> theme auto', s: 'command', go: () => applyThemePref('auto')},
  {t: '> collapse sidebar', s: 'command', go: () => document.getElementById('side-btn').click()},
  {t: '> reset edited values', s: 'command', go: () => { if (confirm('Reset every edited input to workbook values?')){ resetP(); toast('Inputs restored.'); navigate(); } }},
  {t: '> add a garment', s: 'command', go: () => { location.hash = '#/wardrobe'; setTimeout(() => { const b = document.querySelector('[data-wadd]'); if (b) b.click(); }, 120); }},
  {t: '> print this section', s: 'command', go: () => window.print()}
];
function initPalette(){
  const pal = document.getElementById('palette');
  const palIn = document.getElementById('pal-in');
  const palList = document.getElementById('pal-list');
  if (!pal) return;
  let items = [], idx = 0;
  function recents(){ return LS.get('recent.v1', []); }
  function pushRecent(it){
    const r = recents().filter(x => x.t !== it.t);
    r.unshift({t: it.t, s: it.s, id: it.id || ''});
    LS.set('recent.v1', r.slice(0, 5));
  }
  function build(q){
    q = (q || '').trim();
    items = [];
    if (q.indexOf('>') === 0){
      const rest = q.slice(1).trim();
      items = COMMANDS.filter(c => fuzzy(rest, c.t.slice(2)) > 0).slice(0, 12);
    } else if (q){
      SECTIONS.forEach((s, i) => {
        const sc = fuzzy(q, s.title + ' ' + s.sub);
        if (sc > 0) items.push({sc: sc + 100, t: s.rn + ' · ' + s.title, s: 'section', id: s.id, go: () => { location.hash = '#/' + s.id; }});
      });
      {
        DATA.curriculum.stem.parts.forEach(p => p.items.forEach(nm => {
          const sc = fuzzy(q, nm); if (sc > 0) items.push({sc, t: nm, s: 'stem course', go: () => { currUI.fac = 'stem'; currUI.q = nm; location.hash = '#/curriculum'; }});
        }));
        DATA.curriculum.humanities.parts.forEach(p => p.items.forEach(nm => {
          const sc = fuzzy(q, nm); if (sc > 0) items.push({sc, t: nm, s: 'reading', go: () => { currUI.fac = 'hum'; currUI.q = nm; location.hash = '#/curriculum'; }});
        }));
        wardCats().forEach(c => c.items.forEach(it => {
          const sc = fuzzy(q, it.n); if (sc > 0) items.push({sc, t: it.n, s: 'wardrobe', go: () => { wardUI.q = it.n; wardUI.cat = 'all'; wardUI.status = 'all'; location.hash = '#/wardrobe'; }});
        }));
        LS.get('network.v1', []).forEach(c => {
          const sc = fuzzy(q, c.person); if (sc > 0) items.push({sc, t: c.person, s: 'contact', go: () => { location.hash = '#/network'; }});
        });
        hobbies().pursuits.forEach(pu => {
          const sc = fuzzy(q, pu.name); if (sc > 0) items.push({sc, t: pu.name, s: 'pursuit', go: () => { location.hash = '#/hobbies'; }});
        });
        places().forEach(pl => {
          const sc = fuzzy(q, pl.place); if (sc > 0) items.push({sc, t: pl.place, s: pl.kind === 'Been' ? 'been list' : 'wish list', go: () => { location.hash = '#/travel'; }});
        });
        if (q.length >= 3) fulltext(q).forEach(f => items.push({sc: 4, t: f.t, s: f.s, go: f.go, snip: f.snip}));
        items.sort((a, b) => b.sc - a.sc);
      }
      items = items.slice(0, 14);
    } else {
      recents().forEach(r => items.push({t: r.t, s: 'recent · ' + r.s, id: r.id, go: () => {
        const k = r.s;
        if (k === 'section' && r.id) location.hash = '#/' + r.id;
        else if (k === 'stem course'){ currUI.fac = 'stem'; currUI.q = r.t; location.hash = '#/curriculum'; }
        else if (k === 'reading'){ currUI.fac = 'hum'; currUI.q = r.t; location.hash = '#/curriculum'; }
        else if (k === 'wardrobe'){ wardUI.q = r.t; wardUI.cat = 'all'; wardUI.status = 'all'; location.hash = '#/wardrobe'; }
        else if (k === 'contact') location.hash = '#/network';
        else if (k === 'task') location.hash = '#/tasks';
        else if (k === 'been list' || k === 'wish list') location.hash = '#/travel';
        else location.hash = '#/dashboard';
      }}));
      const recT = items.map(x => x.t);
      SECTIONS.forEach(s2 => { if (recT.indexOf(s2.rn + ' · ' + s2.title) < 0) items.push({t: s2.rn + ' · ' + s2.title, s: 'section', id: s2.id, go: () => { location.hash = '#/' + s2.id; }}); });
      items = items.slice(0, 24);
    }
    idx = 0;
    paint();
  }
  function paint(){
    palList.innerHTML = items.map((it, i) =>
      '<div class="pal-item' + (i === idx ? ' on' : '') + '" data-pi="' + i + '"' + (it.snip ? ' title="' + esc(it.snip) + '"' : '') + '><b>' + esc(it.t) + (it.snip ? ' <span class="hint" style="letter-spacing:0;text-transform:none">— ' + esc(it.snip) + '</span>' : '') + '</b><span>' + esc(it.s) + '</span></div>').join('') ||
      '<div class="pal-item"><b>Nothing found</b><span>—</span></div>';
  }
  function open(){ pal.classList.add('open'); palIn.value = ''; build(''); setTimeout(() => palIn.focus(), 30); }
  function close(){ pal.classList.remove('open'); }
  function run(i){
    const it = items[i];
    if (!it) return;
    close();
    if (it.s && it.s.indexOf('recent') !== 0) pushRecent(it);
    else if (it.s && it.s.indexOf('recent') === 0) pushRecent({t: it.t, s: it.s.replace('recent · ', '')});
    it.go();
  }
  palIn.addEventListener('input', () => build(palIn.value));
  palIn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown'){ e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); paint(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); idx = Math.max(0, idx - 1); paint(); }
    else if (e.key === 'Enter'){ e.preventDefault(); run(idx); }
    else if (e.key === 'Escape'){ e.preventDefault(); close(); }
  });
  palList.addEventListener('click', e => { const it = e.target.closest('[data-pi]'); if (it) run(+it.dataset.pi); });
  pal.addEventListener('click', e => { if (e.target === pal) close(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){ e.preventDefault(); pal.classList.contains('open') ? close() : open(); }
    else if (e.key === 'Escape' && pal.classList.contains('open')) close();
  });
}

/* ---------------- theme resolution & gate ---------------------------- */
function resolvedTheme(t){
  if (t !== 'auto') return t;
  try{ return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; }catch(e){ return 'light'; }
}
function applyThemePref(t){
  document.documentElement.dataset.theme = resolvedTheme(t);
  LS.set('theme', t);
  const b = document.getElementById('theme-btn');
  if (b){ b.textContent = t === 'dark' ? '☀' : t === 'auto' ? '◐' : '☾'; b.title = 'Theme: ' + t + ' — click to change'; }
}
try{
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (LS.get('theme', 'light') === 'auto') applyThemePref('auto');
  });
}catch(e){}

function initGate(onUnlock){
  const gate = document.getElementById('gate');
  const cardEl = document.getElementById('gate-card');
  const tEl = document.getElementById('gate-title'), subEl = document.getElementById('gate-sub');
  const form = document.getElementById('gate-form');
  const p1 = document.getElementById('gf1'), p2 = document.getElementById('gf2');
  const w2 = document.getElementById('gf2w'), btn = document.getElementById('gate-btn');
  const err = document.getElementById('gate-err'), note = document.getElementById('gate-note');
  const forget = document.getElementById('gate-forget');
  applyThemePref(LS.get('theme', 'light'));
  const creating = !Gate.rec();
  let entered = false;
  function enter(){
    if (entered) return;
    entered = true;
    const rem = document.getElementById('gate-remember');
    LS.set('remember.v1', !!(rem && rem.checked));
    gate.classList.add('hidden');
    onUnlock();
  }
  if (!creating && (Gate.valid() || LS.get('remember.v1', false))){ enter(); return; }
  if (creating){
    tEl.textContent = 'Create your key';
    subEl.textContent = 'First visit. Choose a passphrase — it locks this compendium on this device and never leaves it.';
    w2.style.display = ''; btn.textContent = 'Set key & enter';
    note.textContent = 'Stored only as a salted digest in this browser; change it any time in Section XIV · Vault.';
  } else {
    tEl.textContent = 'Locked';
    subEl.textContent = 'The compendium is keyed. Enter your key to open it.';
    w2.style.display = 'none'; btn.textContent = 'Unlock';
    forget.style.display = '';
    note.textContent = 'Auto-lock and backups live in Section XIV · Vault once you are inside.';
  }
  gate.classList.remove('hidden');
  function shake(){ cardEl.classList.remove('shake'); void cardEl.offsetWidth; cardEl.classList.add('shake'); }
  const showCk = document.getElementById('gate-show');
  if (showCk) showCk.addEventListener('change', () => {
    const t = showCk.checked ? 'text' : 'password';
    p1.type = t; p2.type = t;
  });
  bindForm(form, async () => {
    err.textContent = '';
    const v = p1.value;
    if (creating){
      if (v.length < 4){ err.textContent = 'Choose at least 4 characters.'; shake(); return; }
      if (v !== p2.value){ err.textContent = 'The two entries do not match.'; shake(); return; }
      await Gate.create(v);
      Gate.open(12);
      enter();
      if (!LS.get('welcomed.v1', false)){
        LS.set('welcomed.v1', true);
        toast('Welcome, ' + DATA.profile.name + ' — ticks, logs and notes save in this browser. Backups, auto-lock and key changes live in Section XV · Vault.', 10000);
      }
    } else {
      if (await Gate.verify(v)){
        Gate.open(12);
        enter();
      } else { err.textContent = 'Wrong key.'; shake(); }
    }
    p1.value = ''; p2.value = '';
  });
  forget.addEventListener('click', () => {
    if (confirm('Erase the key AND every local tick, contact, log and note? This cannot be undone.')){
      LS.clearAll();
      try{ location.reload(); }catch(e){}
    }
  });
  setTimeout(() => p1.focus(), 60);
}

document.addEventListener('DOMContentLoaded', () => {
  const boot = () => initGate(initShell);
  if (typeof syncBoot === 'function'){ syncBoot().then(boot, boot); } else { boot(); }
});
