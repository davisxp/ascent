const p = require('puppeteer'); const path = require('path');
const file = 'file://' + path.resolve('index.html');
(async () => {
  const b = await p.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const pg = await b.newPage();
  await pg.setViewport({width: 1440, height: 1400});
  await pg.goto(file, {waitUntil: 'networkidle0'});
  await pg.type('#gf1', 'shotkey'); await pg.type('#gf2', 'shotkey');
  await pg.click('#gate-btn'); await new Promise(r => setTimeout(r, 600));
  await pg.screenshot({path: 'shots/v105-dashboard.png'});
  await pg.evaluate(() => { const el = [...document.querySelectorAll('.card-t span')].find(s => s.textContent.includes('Interday Dues')); if (el) el.scrollIntoView(); });
  await new Promise(r => setTimeout(r, 300));
  await pg.screenshot({path: 'shots/v105-dues.png'});
  for (const s of ['tasks', 'finances', 'grooming', 'body', 'network']) {
    await pg.goto(file + '#/' + s, {waitUntil: 'networkidle0'}); await new Promise(r => setTimeout(r, 400));
    await pg.screenshot({path: `shots/v105-${s}.png`});
  }
  await b.close(); console.log('shots done');
})();
