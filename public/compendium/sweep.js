/* Full interactive bug sweep: every section, every control class, watch for errors */
const p = require('puppeteer'); const path = require('path');
const file = 'file://' + path.resolve('index.html');
const errs = [];
(async () => {
  const b = await p.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const pg = await b.newPage();
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await pg.setViewport({width: 1440, height: 1000});
  await pg.goto(file, {waitUntil: 'networkidle0'});
  await pg.type('#gf1', 'sweepkey'); await pg.type('#gf2', 'sweepkey');
  await pg.click('#gate-btn'); await new Promise(r => setTimeout(r, 500));

  const SECS = ['dashboard','finances','investments','wardrobe','curriculum','training','cardio','body','grooming','network','career','estate','travel','vault','tasks'];
  for (const s of SECS){
    await pg.goto(file + '#/' + s, {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
    const tabs = await pg.$$('.tab'); for (let i = 0; i < Math.min(tabs.length, 10); i++){ try{ await tabs[i].click(); await new Promise(r => setTimeout(r, 60)); }catch(e){} }
    const cks = await pg.$$('label.ck input'); for (let i = 0; i < Math.min(cks.length, 4); i++){ try{ await cks[i].click(); await new Promise(r => setTimeout(r, 40)); }catch(e){} }
    const minis = await pg.$$('.mini-btn'); for (const m of minis.slice(0, 3)){ try{ await m.click(); await new Promise(r => setTimeout(r, 40)); }catch(e){} }
    const dets = await pg.$$('details.ckl summary'); for (const d of dets.slice(0, 2)){ try{ await d.click(); await new Promise(r => setTimeout(r, 40)); }catch(e){} }
    console.log('swept', s, '· errors so far:', errs.length);
  }
  await pg.goto(file + '#/wardrobe', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  for (let i = 0; i < 5; i++){ const it = await pg.$$('.ward-item'); if (it[i]) await it[i].click(); await new Promise(r => setTimeout(r, 40)); }
  await pg.type('#ward-q', 'linen'); await new Promise(r => setTimeout(r, 150));
  await pg.goto(file + '#/curriculum', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.type('#curr-q', 'topology'); await new Promise(r => setTimeout(r, 150));
  await pg.click('#hide-done'); await new Promise(r => setTimeout(r, 100));
  const facs = await pg.$$('[data-fac]'); for (const f of facs){ await f.click(); await new Promise(r => setTimeout(r, 120)); }
  await pg.click('#edit-btn');
  await pg.goto(file + '#/finances', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.click('[data-p="fin.gross"]'); await pg.type('.inline-edit', 'abc'); await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 200));
  console.log('junk input guarded (no NaN):', await pg.evaluate(() => !document.getElementById('view').textContent.includes('NaN')));
  await pg.click('[data-p="fin.gross"]'); await pg.type('.inline-edit', '42000'); await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 250));
  await pg.goto(file + '#/investments', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.click('[data-p="inv.accounts.lisa.value"]'); await pg.type('.inline-edit', '900'); await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 250));
  await pg.goto(file + '#/body', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.click('[data-p="body.height"]'); await pg.type('.inline-edit', '170'); await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 250));
  await pg.goto(file + '#/estate', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.type('[data-doc="passport.number"]', 'X1234567'); await new Promise(r => setTimeout(r, 100));
  await pg.type('[data-doc="passport.expiry"]', '2031-06-01'); await new Promise(r => setTimeout(r, 150));
  const estTxt = await pg.evaluate(() => document.getElementById('view').textContent);
  console.log('passport chips live-update:', estTxt.includes('recorded') && estTxt.includes('valid ·'));
  await pg.click('[data-eye="passport"]'); await new Promise(r => setTimeout(r, 200));
  await pg.goto(file + '#/travel', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  await pg.type('#place-form [name=place]', 'Paris weekend'); await pg.type('#place-form [name=when]', 'Nov 2026');
  await pg.click('#place-save'); await new Promise(r => setTimeout(r, 300));
  console.log('travel entry written:', (await pg.evaluate(() => document.getElementById('view').textContent)).includes('Paris weekend'));
  const beenBtn = await pg.$('[data-been]'); if (beenBtn){ await beenBtn.click(); await new Promise(r => setTimeout(r, 200)); }
  await pg.goto(file + '#/vault', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  const vTxt = await pg.evaluate(() => document.getElementById('view').textContent);
  console.log('vault registry has all edits:', ['fin.gross', 'inv.accounts.lisa.value', 'body.height'].every(k => vTxt.includes(k)));
  console.log('vault census + save points present:', vTxt.includes('What’s being saved') && vTxt.includes('Save points'));
  await pg.click('#snap-make'); await new Promise(r => setTimeout(r, 200));
  console.log('save point listed:', (await pg.evaluate(() => document.getElementById('snap-list').textContent)).includes('Point ·'));
  await pg.evaluate(() => { window.confirm = () => true; });
  await pg.click('#reset-params'); await new Promise(r => setTimeout(r, 250));
  await pg.keyboard.down('Control'); await pg.keyboard.press('KeyK'); await pg.keyboard.up('Control');
  await pg.type('#pal-in', 'panama'); await new Promise(r => setTimeout(r, 200));
  await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 250));
  console.log('palette → wardrobe:', (await pg.evaluate(() => location.hash)).includes('wardrobe'));
  await pg.setViewport({width: 390, height: 844});
  for (const s of ['dashboard', 'cardio', 'vault']){
    await pg.goto(file + '#/' + s, {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 300));
    await pg.screenshot({path: `shots/sw2-${s}.png`});
  }
  console.log('\nSWEEP ERRORS:', errs.length);
  errs.slice(0, 10).forEach(e => console.log(' !', e));
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
