// UI 冒烟：最小 DOM shim 中执行完整 <script>，模拟点击走子/最佳着，抓取运行时异常
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.split('<script>')[1].split('</script>')[0];

// ---- 最小 DOM shim ----
function makeEl(id) {
  const el = {
    id, children: [], _h: {}, style: {}, className: '', textContent: '', innerHTML: '',
    disabled: false, scrollTop: 0, scrollHeight: 0, value: '',
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    dispatch(t, ev) { for (const fn of this._h[t] || []) fn(ev); },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    remove() {},
    getContext() {
      return {
        // 画布上下文：方法全空，属性普通存取
        fillRect() {}, fillText() {}, strokeText() {}, beginPath() {}, arc() {}, fill() {},
        stroke() {}, strokeRect() {}, moveTo() {}, lineTo() {}, closePath() {}, set fillStyle(v) { this._fs = v; },
        get fillStyle() { return this._fs; }, set font(v) { this._f = v; }, get font() { return this._f; },
        set textAlign(v) { this._ta = v; }, set textBaseline(v) { this._tb = v; },
        set lineWidth(v) { this._lw = v; }, get lineWidth() { return this._lw; },
      };
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 480, right: 480, bottom: 480 }; },
  };
  return el;
}
const els = {};
const document = {
  getElementById(id) { return (els[id] = els[id] || makeEl(id)); },
  createElement(tag) { return makeEl(tag); },
  body: makeEl('body'),
};
global.document = document;
global.window = { devicePixelRatio: 1, addEventListener() {} };

// ---- 执行 UI 脚本，捕获加载期异常 ----
let bootErr = null;
try { new Function(code)(); } catch (e) { bootErr = e; }

const cv = els['cv'];
function clickCell(f, r) { // 屏幕格坐标 f:0..7 左起, r:0..7 顶起
  const C = 480 / 8;
  cv.dispatch('click', { clientX: (f + 0.5) * C, clientY: (r + 0.5) * C });
}
function report(name, ok, extra) {
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + name + ']' + (extra ? ' ' + extra : ''));
}
const moveList = () => els['moveList'].innerHTML;

// 断言网格：a1..h8 由 FEN 板面读回用内部函数太麻烦，改以 moveList 变化 / 状态文本判断
report('boot', !bootErr, bootErr ? (bootErr.stack || bootErr.message) : '');
if (bootErr) { process.exit(1); }
report('click bound', !!cv._h['click']);
report('hint bound', !!els['hintBtn']._h['click']);
report('ctl controls bound',
  !!els['modeSel']._h['change'] && !!els['humanSideSel']._h['change'] && !!els['diffSel']._h['change'],
  '');
report('book select filled', (els['bookSel'].innerHTML.match(/<option/g) || []).length === 19, '');

// 切到双人对弈（默认人机模式会由机器人回应黑方），再模拟连续落子
els['modeSel'].value = 'pvp';
els['modeSel'].dispatch('change', { target: { value: 'pvp' } });

// 模拟点击白兵 e2（视觉第6行,col4）→ e4（第4行,col4）
try {
  clickCell(4, 6);
  clickCell(4, 4);
} catch (e) { console.log('FAIL [e2-e4 move] ' + (e.stack || e.message)); process.exit(1); }
const ml1 = moveList();
report('e2-e4 committed', ml1.indexOf('e4') >= 0 && ml1.indexOf('尚无着法') < 0, JSON.stringify(ml1));
// 左侧实时胜率条应已刷新（白略优）
const wl1 = els['winWhiteL'].textContent;
report('winbar live pct', /白\s+\d+%/.test(wl1), JSON.stringify(wl1 || '(empty)'));

// 模拟黑方 e7e5
try {
  clickCell(4, 1); // e7
  clickCell(4, 3); // e5
} catch (e) { console.log('FAIL [e7-e5 move] ' + (e.stack || e.message)); process.exit(1); }
const ml2 = moveList();
report('e7-e5 committed', ml2.indexOf('e5') >= 0, JSON.stringify(ml2));

// 点击“最佳着”应更新页面提示文本（不再依赖 alert）
try {
  els['hintBtn'].dispatch('click', {});
  const txt = els['evalHint'].innerHTML;
  report('hint shows page hint', txt.indexOf('AI 最佳着') >= 0 && txt.indexOf('→') >= 0, JSON.stringify(txt || '(empty)'));
} catch (e) { console.log('FAIL [hint] ' + (e.stack || e.message)); }
