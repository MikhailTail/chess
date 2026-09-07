# 国际象棋训练器 Chess Trainer

一个单文件、零外部依赖、运行于浏览器中的国际象棋程序：包含**完整棋规引擎**（含王车易位 / 吃过路兵 / 兵升变 / 将死 / 逼和）、**AI 对弈**（negamax + alpha-beta 剪枝）、**局面评估与实时推荐**，以及**经典开局库识别与摆谱**。

主程序位于 `chess-trainer/index.html`，棋盘渲染使用原生 Canvas，界面与引擎都在同一个 HTML 文件中。

## 功能特性

- **完整棋规**
  - 全部合法着法生成，非法着法（如送王）被禁止
  - 王车易位条件校验（王/车未动、路径无子、不经过被攻击格）
  - 吃过路兵、兵升变（弹窗选择后 / 车 / 象 / 马）
  - 将军、将死、逼和判定，50 回合规则自动和棋
- **AI 人机对战**
  - 五档难度：菜鸟 / 业余 / 好手 / 大师 / 传奇（搜索深度 1–5，低档含随机噪声与失误率）
  - 开局阶段沿开局书主变行棋，展现真实开局理论
- **引擎评估**
  - 静态评估 = 子力价值 + 位置分（Piece-Square Tables）
  - negamax + alpha-beta 剪枝搜索
  - 胜率实时换算（左侧胜率条）与最佳着推荐
- **界面操作**
  - 人机 / 双人模式，可选执白或执黑
  - 悔棋（人机模式一键撤销我方一着与 AI 回应）、新局、最佳着高亮
  - 代数记谱（SAN）着法记录，自动滚动
- **开局库**
  - 收录 17 个维基百科经典开局（含 ECO 编号、中英文名），如意大利、西班牙、西西里纳伊道夫、法兰西、后翼弃兵、古印度、伦敦体系等
  - 对局实时识别当前开局，可选开局一键摆谱预览主变

## 快速开始

无需安装任何依赖，任选其一：

1. 直接用浏览器打开 `chess-trainer/index.html`
2. 或起本地静态服务器（Node.js）：

```bash
node chess-trainer/_serve.js
# 浏览器访问 http://localhost:8123/
```

## 玩法说明

| 控件 | 作用 |
| --- | --- |
| 模式 | 人机对战 / 双人对弈 |
| 执子 | 白方 / 黑方（仅人机模式） |
| 机器人难度 | 菜鸟 · 业余 · 好手 · 大师 · 传奇 |
| 悔棋 | 撤销一步；人机模式同时撤回 AI 的回应 |
| 最佳着 | 高亮引擎当前推荐着法及评估值 |
| 新局 | 回到标准初始局面 |
| 开局选择 + 摆此开局 | 预览并摆出指定开局的经典主变 |

点击己方棋子即可看到可走目标点，再点目标落子；被升变时选择升变棋子。

## 技术实现

- **棋盘表示**：64 格数组（`rank*8+file`），棋子用「类型 + 颜色位」编码
- **着法生成**：分兵种枚举伪合法着法，逐一走子后过滤王被将军
- **搜索**：negamax + alpha-beta 剪枝，按 MVV-LVA 着法排序
- **评估**：子力（P=100 N=320 B=330 R=500 Q=900）+ 六套 PST 表
- **胜率**：对评估分做 Logistic 换算（`1/(1+10^(-cp/400))`）
- **记谱**：标准代数记谱（含消歧、吃子、易位 O-O / O-O-O、升变、将军 / 将死标记）
- **开局识别**：以已走着法前缀匹配开局库，多候选时按共享续着数选最贴切的开局

## 开发与自测

`_oracle` 目录存放开发期验证脚本，用于在不打开浏览器的情况下对引擎做规则一致性校验：

```bash
# 1. perft 节点数校验（标准测试局面，含 Start / Kiwipete / Pos3–Pos6）
node chess-trainer/_rules.js

# 2. 无头 DOM 冒烟：在最小 DOM shim 中执行完整页面脚本，模拟点击走子，抓取运行时异常
node chess-trainer/_oracle/ui_smoke.js

# 3. 规则交叉验证：与 chess.js 逐着对照（需先安装依赖）
cd chess-trainer/_oracle && npm install
node walk.js        # 随机对局全程规则一致性
node compare.js     # 指定局面规则对照

# 4. 真实浏览器冒烟（Edge headless + puppeteer-core，抓 console / pageerror）
node chess-trainer/_oracle/browser_check.js
```

## 目录结构

```
chess-trainer/
├── index.html            # 应用本体：UI + 引擎（单文件、无依赖）
├── _serve.js             # 本地静态服务器（端口 8123）
├── _rules.js             # perft 规则正确性校验
└── _oracle/              # 开发期自动化验证脚本
    ├── ui_smoke.js       # DOM shim UI 冒烟
    ├── browser_check.js  # 真实浏览器（Edge headless）冒烟
    ├── walk.js           # 随机对局 + chess.js 交叉验证
    ├── compare.js        # 规则对照测试
    └── package.json      # 依赖：chess.js、puppeteer-core
```

## License

[MIT](LICENSE)
