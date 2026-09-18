# SortSplash（Cocos Creator 3.8）

**Sort colors. One more pour.** 颜色倒水 / Water Sort，面向 **微信小游戏** 导出。

HTML 原型（仓库根目录 `index.html`）仅作玩法与关卡设计参考，**不要**当微信/Native 上架包。量产请打开本目录的 Cocos 工程。

---

## English (short)

Open this `cocos/` folder in **Cocos Creator 3.8.8** → `assets/scenes/main.scene` → Preview. All UI and tubes are built in code (Graphics + Label + Button + Widget); no prefabs or art required. Switch build platform to **微信小游戏**, replace `adUnitId` placeholders in `assets/scripts/AdBridge.ts`, then build. The root `index.html` is a design reference only.

---

## 打开并预览

1. 安装 **Cocos Creator 3.8.8**（兼容 3.8.x）
2. 启动 Creator，**打开项目**，选择本目录：`cocos/`（含 `assets/` + `package.json`）
3. 资源管理器打开 `assets/scenes/main.scene`
4. 点击编辑器 **预览 / Play（浏览器）**
5. 封面点 **Play** → 点试管 A 再点试管 B 倒水

> 若场景节点不完整，`GameManager.onLoad` 会自动补齐 `Canvas` / `Camera`（正交 UI）/ `BoardRoot` / `UIRoot`，避免预览黑屏。

设计分辨率 **720×1280** 竖屏。无需 npm，无需外部字体/图集。

---

## 玩法（与 HTML 原型一致）

- 试管有多层颜色；先点 A 再点 B 倾倒（顶部同色或目标为空；不可溢出）
- 每个非空试管都是**满管且单色**即过关
- **48 关**：1–5 手搓教学关，其后为与 HTML 相同种子的洗牌关（颜色 3→10）
- 道具：Undo（免费次数）、Undo Pack（激励视频桩）、+1 Tube（每关一次，激励桩）、Hint（激励桩）、Restart、选关
- 软失败：无 Game Over，可重开 / 看广告加管
- 英文 UI

---

## 工程结构

```
cocos/
├── assets/
│   ├── scenes/main.scene     # Canvas + ORTHO Camera + GameController
│   └── scripts/
│       ├── GameManager.ts    # 流程、过关、道具
│       ├── TubeManager.ts    # 试管绘制与点击
│       ├── LevelManager.ts   # 48 关生成与倾倒规则
│       ├── UIManager.ts      # 封面 / HUD / 弹窗 / Toast / 彩带
│       ├── AdBridge.ts       # wx.createRewardedVideoAd 桩 + 倒计时回退
│       ├── WxAdapter.ts      # wx / localStorage
│       └── Storage.ts        # 最高关 / 免费 Undo
├── settings/                 # 720×1280；无自定义 DEFAULT 层
├── package.json              # Creator 3.8.8
├── README.md
└── WECHAT.md                 # 微信导出清单
```

---

## 广告位 ID

在 `assets/scripts/AdBridge.ts` 的 `AD_UNITS` 中替换占位符：

| Key | 用途 | 占位 |
|---|---|---|
| `rewarded` / `rewardedTube` | +1 Tube | `adunit-YOUR_REWARDED_VIDEO_ID` |
| `rewardedUndoPack` | Undo Pack（+5 Undo） | 同上 |
| `rewardedHint` | Hint | 同上 |
| `interstitial` | 关卡之间插屏（可选） | `adunit-YOUR_INTERSTITIAL_ID` |

浏览器预览没有 `wx` 时，激励视频会走 **3 秒 “Ad playing…”** 倒计时桩。

存储：`Storage` 在浏览器用 `localStorage`，微信环境用 `wx.setStorageSync` / `wx.getStorageSync`（`typeof wx !== 'undefined'`）。

---

## 微信小游戏构建

详见同目录 **[WECHAT.md](./WECHAT.md)**。摘要：

1. 菜单 **项目 → 构建发布**
2. 发布平台选 **微信小游戏**
3. 填入小游戏 AppID，构建
4. 用微信开发者工具打开构建目录

---

## 注意事项

- 首次打开会生成 `library/`、`temp/`、`local/`、`profiles/`，已写入 `.gitignore`
- 项目设置**没有**再声明名为 `DEFAULT` 的自定义层，避免与引擎内置层冲突
- 根目录 `index.html` / `playtest-solver.mjs` 保留，作为设计参考与可解性校验
