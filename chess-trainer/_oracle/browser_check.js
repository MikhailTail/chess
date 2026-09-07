// 真实浏览器诊断：起本地服务 → Edge(headless) 打开页面 → 抓 console/pageerror → 模拟点击走子与最佳着
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');

const server = spawn(process.execPath, [path.join(root, '_serve.js')], { stdio: 'ignore' });
let logs = [];
function waitFor(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await waitFor(800);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErr = [], pageErr = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErr.push('[' + m.type() + '] ' + m.text()); });
  page.on('pageerror', e => pageErr.push(String(e && e.stack || e)));
  page.on('dialog', async d => { logs.push('DIALOG: ' + d.message()); await d.accept(); });

  await page.goto('http://localhost:8123/', { waitUntil: 'networkidle0', timeout: 15000 });
  await waitFor(400);

  const rect = await page.evaluate(() => {
    const cv = document.getElementById('cv');
    const r = cv.getBoundingClientRect();
    const px = awaitPx => { const m = awaitPx; return m; };
    return { left: r.left, top: r.top, w: r.width, h: r.height };
  });
  async function clickCell(file, rowTop) {
    const x = rect.left + rect.w * ((file + 0.5) / 8);
    const y = rect.top + rect.h * ((rowTop + 0.5) / 8);
    await page.mouse.click(x, y);
    await waitFor(120);
  }
  const boardInfo = await page.evaluate(() => {
    const cv = document.getElementById('cv');
    return { cssW: cv.clientWidth, cssH: cv.clientHeight, pxW: cv.width, pxH: cv.height };
  });
  logs.push('canvas ' + JSON.stringify(boardInfo));

  // 初始应渲染非空白棋盘（取角点像素判断 >1 种颜色）
  const sample = await page.evaluate(() => {
    const cv = document.getElementById('cv');
    const ctx = cv.getContext('2d');
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let colors = new Set();
    for (let i = 0; i < d.length; i += 4000) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return colors.size;
  });
  logs.push('distinct pixel samples: ' + sample);

  const moveList0 = await page.evaluate(() => document.getElementById('moveList').innerHTML);
  logs.push('moveList before: ' + moveList0);

  // 切到双人对弈（默认人机模式下白方落子后黑方由机器人自动回应）
  await page.evaluate(() => {
    const s = document.getElementById('modeSel');
    s.value = 'pvp';
    s.dispatchEvent(new Event('change'));
  });
  await waitFor(200);

  // 白 e2-e4
  await clickCell(4, 6);
  await clickCell(4, 4);
  const ml1 = await page.evaluate(() => document.getElementById('moveList').innerHTML);
  logs.push('after e2->e4 moveList: ' + JSON.stringify(ml1));
  const wbar1 = await page.evaluate(() => document.getElementById('winWhiteL').textContent);
  logs.push('winWhite after e4: ' + wbar1);

  // 黑 e7-e5
  await clickCell(4, 1);
  await clickCell(4, 3);
  const ml2 = await page.evaluate(() => document.getElementById('moveList').innerHTML);
  logs.push('after e7->e5 moveList: ' + JSON.stringify(ml2));

  // 最佳着：页面提示（不依赖 alert），棋盘上应出现橙色高亮框
  await page.click('#hintBtn');
  await waitFor(600);
  const hintText = await page.evaluate(() => document.getElementById('evalHint').innerHTML);
  logs.push('hint evalHint: ' + JSON.stringify(hintText));
  logs.push('hint dialogs during test: ' + logs.filter(l => l.startsWith('DIALOG')).length);

  // --- 人机场景：默认白方为玩家，机器人(♗好手)按开局书自动应着 ---
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo(0, 0)); // reload 可能恢复滚动，先回页首
  await waitFor(900);
  const rect2 = await page.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const clickN = async (file, rowTop) => {
    const x = rect2.l + rect2.w * ((file + 0.5) / 8);
    const y = rect2.t + rect2.h * ((rowTop + 0.5) / 8);
    await page.mouse.click(x, y);
    await waitFor(150);
  };
  await clickN(4, 6); await clickN(4, 4);   // 玩家 1.e4（用重测的 rect2）
  await waitFor(1800);                             // 等待机器人走书（黑方应 e5）
  const mlAi1 = await page.evaluate(() => document.getElementById('moveList').innerHTML);
  logs.push('AI black auto reply moveList: ' + JSON.stringify(mlAi1));
  logs.push('aiThink: ' + JSON.stringify(await page.evaluate(() => document.getElementById('aiThink').textContent)));

  // 执黑：换边后机器人执白先手，应自动走书 1.e4
  await page.evaluate(() => {
    const s = document.getElementById('humanSideSel');
    s.value = '16';
    s.dispatchEvent(new Event('change'));
  });
  await waitFor(1600);
  const mlAi2 = await page.evaluate(() => document.getElementById('moveList').innerHTML);
  logs.push('AI white first book move: ' + JSON.stringify(mlAi2));
  logs.push('bookCur label: ' + JSON.stringify(await page.evaluate(() => document.getElementById('bookCur').textContent)));

  await page.screenshot({ path: path.join(__dirname, '_shot.png') });
  console.log('CONSOLE_ERR=' + JSON.stringify(consoleErr));
  console.log('PAGE_ERR=' + JSON.stringify(pageErr));
  console.log('---LOG---\n' + logs.join('\n'));
  await browser.close();
  server.kill();
  process.exit(0);
})().catch(e => { console.error('HARNESS_ERR ' + (e.stack || e)); server.kill(); process.exit(1); });
