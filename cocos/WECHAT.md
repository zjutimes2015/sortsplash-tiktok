# 微信小游戏导出（SortSplash）

Cocos Creator **3.8.8** → 平台 **微信小游戏**（`wechatgame`）。根目录 `index.html` 只是玩法原型，**不能**当小游戏包上传。

## 预览必须先可玩

1. 用 Creator 3.8.8 **打开 `cocos/`**（含 `assets/` + `package.json`）
2. 打开 `assets/scenes/main.scene`
3. 点编辑器 **▶ 预览（浏览器）**
4. 应看到 **SortSplash 封面 + Play 按钮**（不是只有清屏色 / draw calls ≈ 2）

无头冒烟（不启动 Creator）：在 `cocos/` 下执行 `node tools/verify-boot.mjs`。它会检查 `onLoad` 用 `ensureHierarchy()` 返回值绑定 `uiRoot` / `boardRoot`，而不是 `find()`，因此不会在 `uiRoot == null` 时提前跳过 `buildAll()`。

## 构建发布 → 微信小游戏

1. 菜单 **项目 → 构建发布**
2. 发布平台：**微信小游戏**（`wechatgame`）
3. 起始场景：`db://assets/scenes/main.scene`（`main`）
4. 设备方向：**Portrait（竖屏）**，设计分辨率 **720×1280**
5. AppID：先填占位 `touristappid`（游客/开发）；上架换成微信公众平台正式 AppID
6. 构建输出目录：**`build/wechatgame`**（相对 `cocos/`）
7. 建议勾选 **MD5 Cache**；未用的 3D / 物理 / Spine 可按包体裁剪

## 用微信开发者工具打开

- [ ] 微信开发者工具 → 导入项目 → 选 `cocos/build/wechatgame`
- [ ] 打开产物里的 `game.json`，确认 `"deviceOrientation": "portrait"`
- [ ] 详情 → 本地设置：开发阶段可勾选「不校验合法域名」
- [ ] 模拟器点编译/预览：封面 Play → 倒水 / Undo / +1 Tube
- [ ] 真机预览：`wx.setStorageSync` 能记下最高关与 Undo 次数

## 广告位（上架前）

在 `assets/scripts/AdBridge.ts` 把占位 `adunit-…` 换成流量主 ID。未替换时，真机激励视频失败会回退到 3 秒模拟倒计时。

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

## 上架注意

- [ ] 隐私协议 / 用户协议；类目选益智 / 休闲
- [ ] 广告位与代码 ID 一致
- [ ] 包体审查：无外部 CDN、无预制体美术依赖
- [ ] 根目录 HTML 原型不要打进小游戏包
