const { chromium } = require('playwright-core');
const path = require('path');

// Chromium to drive. Override with PW_CHROME=/path/to/chrome.
const CHROME = process.env.PW_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async () => {
  const A = process.argv.slice(2);
  const get=(k,d)=>A.includes(k)?A[A.indexOf(k)+1]:d;
  const AR = get('--ar','9x16');
  const H = AR==='1x1'?1080:1920;
  const times = get('--t','1').split(',').map(Number);
  const b = await chromium.launch({ executablePath: CHROME,
    args:['--force-color-profile=srgb','--disable-lcd-text','--font-render-hinting=none','--hide-scrollbars','--disable-gpu','--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage({ viewport:{width:1080,height:H}, deviceScaleFactor:1 });
  await p.goto('file://'+path.resolve('scene.html')+'?ar='+AR);
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
  const fs=require('fs'); fs.mkdirSync('preview',{recursive:true});
  for (const t of times){ await p.evaluate(t=>window.__seek(t), t);
    await p.screenshot({path:`preview/${AR}_${String(t).replace('.','_')}.png`}); }
  await b.close();
})();
