# 微信小游戏导出清单（SortSplash）

Cocos Creator **3.8.8** → 平台 **微信小游戏**。HTML 原型不可上架。

## 构建前

- [ ] 用 Creator 3.8.8 打开 `cocos/` 目录（含 `assets/` + `package.json`）
- [ ] 打开 `assets/scenes/main.scene`，浏览器预览可玩（非黑屏）
- [ ] 微信公众平台注册小游戏，拿到 **AppID**
- [ ] 流量主开通激励视频（及可选插屏），拿到 **adUnitId**
- [ ] 在 `assets/scripts/AdBridge.ts` 替换：

```ts
export const AD_UNITS = {
    rewarded: 'adunit-xxxxxxxxxxxxxxxx',       // 激励视频
    rewardedTube: 'adunit-xxxxxxxxxxxxxxxx',   // +1 Tube
    rewardedUndoPack: 'adunit-xxxxxxxxxxxxxxxx',
    rewardedHint: 'adunit-xxxxxxxxxxxxxxxx',
    interstitial: 'adunit-yyyyyyyyyyyyyyyy',   // 可选插屏
};
```

未替换时，真机 `wx.createRewardedVideoAd` 会失败并回退到 3 秒模拟倒计时。

## Creator 构建设置

1. **项目 → 构建发布**
2. 发布平台：**微信小游戏**（`wechatgame`）
3. 填入 AppID（测试可用游客/测试 AppID，上架必须正式）
4. 起始场景：`db://assets/scenes/main.scene`
5. 设备方向：**Portrait**（竖屏，设计分辨率 720×1280）
6. 建议勾选 **MD5 Cache**；按包体需要裁剪 3D/物理/Spine 等未用模块
7. 构建输出目录（默认 `build/wechatgame`）

## 微信开发者工具

- [ ] 导入构建产物目录
- [ ] `game.json` 方向为竖屏（`portrait`）
- [ ] 详情 → 本地设置：不校验合法域名（仅开发）
- [ ] 模拟器点 Play，倒水 / Undo / +1 Tube 广告桩
- [ ] 真机预览：确认 `wx.setStorageSync` 能记下最高关与 Undo 次数
- [ ] 激励视频：看完给奖励，中途关闭走 `onFail`（不发奖）
- [ ] （可选）过关进下一关时插屏 `wx.createInterstitialAd`

## 广告 API 形状（已按此接线）

激励视频：

```js
const ad = wx.createRewardedVideoAd({ adUnitId: 'adunit-xxx' });
ad.onLoad(() => {});
ad.onError((err) => {});
ad.onClose((res) => { if (res && res.isEnded) { /* reward */ } });
ad.show().catch(() => ad.load().then(() => ad.show()));
```

插屏：

```js
const ad = wx.createInterstitialAd({ adUnitId: 'adunit-yyy' });
ad.onError((err) => {});
ad.onClose(() => {});
ad.show().catch(() => { /* skip */ });
```

存储：

```js
wx.setStorageSync('sortsplash_v1', json);
wx.getStorageSync('sortsplash_v1');
```

分享：`wx.shareAppMessage`（`WxAdapter`）。

## 上架注意

- [ ] 隐私协议 / 用户协议
- [ ] 类目选益智 / 休闲
- [ ] 广告位与代码 ID 一致；测试广告与正式广告勿混用
- [ ] 包体与代码审查：无外部 CDN、无预制体美术依赖
- [ ] 软失败（无强制 Game Over）符合当前玩法说明

## English

Build with Creator 3.8.8, platform **WeChat Mini Game**, portrait 720×1280. Paste real `adUnitId`s into `AdBridge.ts`. Open the `build/wechatgame` folder in WeChat DevTools. Storage uses `wx.setStorageSync` when `wx` exists. Root `index.html` is not the shippable package.
