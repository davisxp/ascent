const p = require('puppeteer');
const svg = size => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#16293f"/><rect x="4" y="4" width="56" height="56" rx="7" fill="none" stroke="#c8a951" stroke-width="2"/><text x="32" y="44" font-family="Georgia,serif" font-size="34" fill="#c8a951" text-anchor="middle">X</text></svg>`;
(async () => {
  const b = await p.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const pg = await b.newPage();
  for (const size of [192, 512]){
    await pg.setViewport({width: size, height: size});
    await pg.setContent(`<body style="margin:0">${svg(size).replace(`width="${size}" height="${size}"`, `width="${size}" height="${size}"`)}</body>`);
    await pg.screenshot({path: `icon-${size}.png`});
  }
  await b.close();
  console.log('icons rendered');
})();
