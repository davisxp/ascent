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
