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
