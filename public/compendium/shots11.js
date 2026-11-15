const p=require('puppeteer');const path=require('path');
const file='file://'+path.resolve('index.html');
const errs=[];
(async()=>{
  const b=await p.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await b.newPage();
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.setViewport({width:1440,height:1100});
  await pg.goto(file,{waitUntil:'networkidle0'});
  await pg.type('#gf1','compendium'); await pg.type('#gf2','compendium');
  await pg.click('#gate-btn'); await new Promise(r=>setTimeout(r,600));
  // seed a little life so the heatmap/rings show
  await pg.evaluate(()=>{ 
    const t=new Date(); const iso=d=>d.toISOString().slice(0,10);
    const set=(k,v)=>localStorage.setItem('lifeos.'+k,JSON.stringify(v));
    const train={}; for(let i=1;i<12;i++){ const d=new Date(t); d.setDate(d.getDate()-i); if(i%2) train[iso(d)]='x'; }
    set('train.v1',train);
  });
  await pg.goto(file+'#/dashboard',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,500));
  await pg.screenshot({path:'shots/j-dash.png'});
  await pg.goto(file+'#/training',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,400));
  await pg.click('[data-day="1"]'); await new Promise(r=>setTimeout(r,300));
  await pg.screenshot({path:'shots/j-train.png'});
  await pg.goto(file+'#/investments',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,400));
  await pg.evaluate(()=>{ const s=document.getElementById('pc-years'); s.value='30'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await new Promise(r=>setTimeout(r,200));
  await pg.screenshot({path:'shots/j-inv.png'});
  console.log('ERRORS:',errs.length);
  await b.close();
})();
