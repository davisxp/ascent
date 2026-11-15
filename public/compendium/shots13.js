const p=require('puppeteer');const path=require('path');
const file='file://'+path.resolve('index.html');
(async()=>{
  const b=await p.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await b.newPage();
  await pg.setViewport({width:1440,height:900});
  await pg.goto(file,{waitUntil:'networkidle0'});
  await pg.type('#gf1','compendium'); await pg.type('#gf2','compendium');
  await pg.click('#gate-btn'); await new Promise(r=>setTimeout(r,500));
  await pg.keyboard.type('?'); await new Promise(r=>setTimeout(r,300));
  await pg.screenshot({path:'shots/l-help.png'});
  await pg.keyboard.press('Escape');
  await pg.screenshot({path:'shots/l-dash.png', clip:{x:268,y:80,width:1172,height:420}});
  await b.close();
  console.log('shots done');
})();
