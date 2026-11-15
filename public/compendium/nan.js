const p = require('puppeteer'); const path = require('path');
const file = 'file://' + path.resolve('index.html');
(async () => {
  const b = await p.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const pg = await b.newPage();
  await pg.setViewport({width: 1440, height: 1000});
  await pg.goto(file, {waitUntil: 'networkidle0'});
  await pg.type('#gf1', 'nankey'); await pg.type('#gf2', 'nankey');
  await pg.click('#gate-btn'); await new Promise(r => setTimeout(r, 400));
  await pg.goto(file + '#/finances', {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 250));
  const before = await pg.evaluate(() => { const t = document.getElementById('view').textContent; const i = t.indexOf('NaN'); return i < 0 ? 'none' : t.slice(Math.max(0,i-90), i+40); });
  console.log('NaN before junk edit:', before);
  await pg.click('#edit-btn');
  await pg.click('[data-p="fin.gross"]'); await pg.type('.inline-edit', 'abc'); await pg.keyboard.press('Enter'); await new Promise(r => setTimeout(r, 250));
  const after = await pg.evaluate(() => { const t = document.getElementById('view').textContent; const i = t.indexOf('NaN'); return i < 0 ? 'none' : t.slice(Math.max(0,i-90), i+40); });
  console.log('NaN after junk edit:', after);
  await b.close();
})();
