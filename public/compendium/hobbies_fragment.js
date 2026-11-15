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
    'The life around the work: what you pursue, how often, what it is making, and the kit it still wants. Four pursuits were seeded from the compendium itself — edit or retire them freely.');

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

