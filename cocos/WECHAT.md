# 微信小游戏导出（SortSplash）

Cocos Creator **3.8.8** → 平台 **微信小游戏**（`wechatgame`）。根目录 `index.html` 只是玩法原型，**不能**当小游戏包上传。

> **简体中文 UI + 楷体**  
> 玩家可见文案均为简体中文（封面标题「颜色分拣」，标语「倒水归类，再来一关」，按钮「▶ 开始游戏」等）。所有 Label 走系统字体（`useSystemFont = true`），`fontFamily` 优先 `KaiTi, STKaiti, 楷体, DFKai-SB, serif`。微信真机若未安装楷体，会回退到系统默认衬线/黑体，属正常现象。  
> **合并后必须在 Creator 里重新构建 `wechatgame` 并重新导入**微信开发者工具，旧包不会带上中文与字体改动。

> **黑屏 + WAGame.js 堆栈（Windows 模拟器 / mg lib 3.17.2）**  
> 最常见原因是 **还在用 PR #4 之前的旧 `build/wechatgame`**（空白 UI 包）。必须用本仓库最新 `cocos/` **重新构建并重新导入**，不要只点「编译」旧目录。  
> 脚本侧已保证：`wx` 存在时**绝不读 `window.localStorage`**（该 getter 会抛错并中断 boot）；缺失的 `wx.*` 不会在启动时抛错。

## 预览必须先可玩（浏览器 ▶）

1. 用 Creator 3.8.8 **打开 `cocos/`**（含 `assets/` + `package.json`）
2. 打开 `assets/scenes/main.scene`
3. 层级应为：`Scene → Canvas → Camera / BoardRoot / UIRoot / GameController`
   - `GameController` 在 **Canvas 下**（不是 Scene 的兄弟节点），只挂 `cc.UITransform` + `GameManager`（压缩 CID `087c0aZ3vRDYr9EvCSEIBd3`）
4. 点编辑器 **▶ 预览（浏览器）**
5. 控制台应出现 `[GameManager] boot(...) SUCCESS`（`onLoad` 或 `start()` 补建）
6. 画面应是 **「颜色分拣」封面 + 超大亮粉 ▶ 开始游戏（Play）按钮**（不是只有清屏色）
7. 点 **开始游戏** → 点试管倒水

封面用 **Graphics 色块 + 烘焙颜色 Sprite（CUSTOM 真实尺寸）+ 系统字体「█」铺满**，Play 至少 **320×88**，Cover/UIRoot/Canvas 四边 Widget 拉满 720×1280。若 `onLoad` 时 Scene 子节点还没挂齐，`start()` 会再跑一遍 `boot('start', true)`。

无头冒烟（不启动 Creator）：在 `cocos/` 下执行：

```bash
node tools/verify-boot.mjs
node tools/verify-wechat-runtime.mjs
```

`verify-boot.mjs` 检查：GameController 父节点是 Canvas；场景 CID = `compressUuid(GameManager.ts.meta)`；`onLoad`/`start` 不用 `find()`；封面有 `BtnPlay`。  
`verify-wechat-runtime.mjs` 在「`wx` + 会抛错的 `localStorage` getter」下跑 `Storage.load/save`，断言不抛。

## 必须重新构建并重新导入（旧包就是黑屏）

微信开发者工具**不会**自动读到仓库里的 TypeScript。`E:\GROK\SortSplash-WeChat\build\wechatgame` 若是 PR #4 之前导出的空白 UI 包，模拟器会一直黑屏，控制台停在 `WAGame.js`。

### A. 在 Creator 里打一份新包

1. 用 **Cocos Creator 3.8.8** 打开本仓库的 **`cocos/`**（不要打开仓库根目录，也不要打开旧的 `build/wechatgame`）
2. 打开 `assets/scenes/main.scene`，先用 **▶ 浏览器预览** 确认能看到 **颜色分拣 + 超大亮粉 ▶ 开始游戏（Play）**
3. 菜单 **项目 → 构建发布**
4. 发布平台：**微信小游戏**（`wechatgame`）
5. 起始场景：`db://assets/scenes/main.scene`（`main`）
6. 设备方向：**Portrait（竖屏）**，设计分辨率 **720×1280**
7. AppID：开发阶段填 **`touristappid`**
8. 构建输出目录：相对 `cocos/` 的 **`build/wechatgame`**（完整路径形如 `…\sortsplash-tiktok\cocos\build\wechatgame`）
9. 建议勾选 **MD5 Cache**
10. 点 **构建**。完成后确认目录里有新的 `game.js` / `game.json` / `project.config.json`（时间戳是刚才）

首屏（splash）已设为 **纯色、无 logo、`totalTime: 0`**，不要改成视频/图片首屏——微信 Windows 模拟器上 first-screen 资源失败也会黑屏。

### B. 覆盖你正在用的导入目录

若开发者工具打开的是 `E:\GROK\SortSplash-WeChat\build\wechatgame`（或任何旧拷贝）：

1. **关掉**微信开发者工具里该项目（或退出模拟器）
2. **整目录覆盖**（不要只拷几个 js）：
   - 源：`cocos\build\wechatgame\`（刚构建的）
   - 目标：`E:\GROK\SortSplash-WeChat\build\wechatgame\`
3. 或直接把开发者工具改成导入 **新的** `cocos\build\wechatgame`

也可以跳过拷贝，在开发者工具里 **删除旧项目 → 导入项目**，选最新的 `cocos\build\wechatgame`。

### C. 用微信开发者工具打开（小游戏，不是小程序）

1. 导入目录：`cocos\build\wechatgame`（或覆盖后的 `E:\GROK\SortSplash-WeChat\build\wechatgame`）
2. 打开产物 **`project.config.json`**，必须是：
   - `"compileType": "game"`（**不要** `miniprogram`，否则 WAGame.js 黑屏）
   - `"setting.urlCheck": false`（开发期）
3. 打开 **`game.json`**，确认 `"deviceOrientation": "portrait"`
4. 详情 → 本地设置：勾选 **不校验合法域名**（与 `urlCheck: false` 同类）
5. 模拟器基础库用小游戏 **mg lib**（3.17.2 可用）；项目类型是 **小游戏**
6. 点编译：控制台应有 `[GameManager] boot(...) wx=true SUCCESS` 以及 `[UI] BtnPlay ... contentSize=320x88`，画面是封面 + **巨大亮粉 ▶ 开始游戏（Play）**
7. 真机预览：`wx.setStorageSync('sortsplash_v1', …)` 能记下最高关与 Undo

`build-templates/wechatgame/project.config.json` 会在构建时拷进产物（`compileType: game`，`urlCheck: false`）。若 Creator 又生成了一份，以构建目录里的文件为准，按上面核对。

## 引擎模块（已裁剪，降低模拟器黑屏）

本项目是 2D UI（Sprite / Label / Graphics / Button / tween），**不需要**物理、3D、Spine、Video、WebView。

`settings/v2/packages/engine.json` 已关闭这些模块（构建后不要再在「功能裁剪」里勾回来）：

| 模块 | 为何关掉 |
|---|---|
| `physics` / `physics-ammo` | Bullet WASM 在微信 **Windows 模拟器** 上经常卡死/黑屏 |
| `physics-2d` / `physics-2d-box2d` | 本玩法不用刚体；Box2D WASM 同样不稳定 |
| `webview` | 小游戏没有小程序 WebView，模块初始化会抛错 |
| `video` | 首屏/视频组件在模拟器上常失败 |
| `3d` / Spine / DragonBones / Terrain / TiledMap / Particle | 未使用，减小包体、减少启动面 |

首屏保持 **颜色背景 + logo none + totalTime 0**。不要用默认 Cocos logo 图或视频首屏。

WebGL2 已关（`gfx-webgl2: false`），微信走 WebGL1。

## 构建发布摘要

1. 菜单 **项目 → 构建发布**
2. 发布平台：**微信小游戏**（`wechatgame`）
3. 起始场景：`main`
4. Portrait **720×1280**
5. AppID：`touristappid`（上架再换正式 ID）
6. 输出：**`build/wechatgame`**
7. 构建后按上一节 **重新导入**，不要沿用旧目录

## 广告位（上架前）

在 `assets/scripts/AdBridge.ts` 把占位 `adunit-…` 换成流量主 ID。未替换、游客 AppID、或模拟器缺广告 API 时，激励视频失败会回退到 3 秒模拟倒计时（`show()` 即使返回 `undefined` 也不会抛）。

```ts
export const AD_UNITS = {
    rewarded: 'adunit-xxxxxxxxxxxxxxxx',
    rewardedTube: 'adunit-xxxxxxxxxxxxxxxx',
    rewardedUndoPack: 'adunit-xxxxxxxxxxxxxxxx',
    rewardedHint: 'adunit-xxxxxxxxxxxxxxxx',
    interstitial: 'adunit-yyyyyyyyyyyyyyyy',
};
```

激励：`wx.createRewardedVideoAd`（看完 `isEnded` 才发奖）。插屏：`wx.createInterstitialAd`。存储：`wx.setStorageSync('sortsplash_v1', json)`。分享：`wx.shareAppMessage`。

## 黑屏排查（仍黑时按序看）

1. 产物是不是**刚刚**构建的？旧 `E:\GROK\SortSplash-WeChat\build\wechatgame` 必须被覆盖或重新导入
2. `project.config.json` 的 `compileType` 是不是 **`game`**
3. 控制台是引擎 WASM/物理报错，还是脚本报 `localStorage`？本仓库脚本不应再出现后者
4. 控制台有没有 `[GameManager] boot(...) SUCCESS`？没有则看 `onLoad failed` / `start failed`
5. 项目类型必须是 **小游戏**，基础库选 **mg**（不是小程序 2.x/3.x 普通库）

## 上架注意

- [ ] 隐私协议 / 用户协议；类目选益智 / 休闲
- [ ] 广告位与代码 ID 一致
- [ ] 包体审查：无外部 CDN、无预制体美术依赖
- [ ] 根目录 HTML 原型不要打进小游戏包
- [ ] 正式包把 `urlCheck` 改回 `true`，并配好 request 合法域名
