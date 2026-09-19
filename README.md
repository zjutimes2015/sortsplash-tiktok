# SortSplash

**Sort colors. One more pour.**

Cute pastel **Color Sort / Water Sort** hypercasual puzzle — English-first, TikTok Mini Games overseas oriented.

Suggested repo name: `sortsplash-tiktok`  
Owner target: `zjutimes2015`

---

## Play

1. Open `index.html` in any modern mobile or desktop browser (`file://` works).
2. Tap **Play**.
3. Tap tube A, then tube B to pour (same top color or empty; no overfill).
4. Fill every non-empty tube with a single color to clear the level.

No install, no CDN, no build step.

---

## Why TikTok fit

| Signal (2026) | SortSplash hook |
|---|---|
| TikTok Minis lean **Puzzle** | Classic water-sort rules, instant ruleset |
| Hypercasual revenue: color / sort / screw / block | Satisfying pours, bright pastels |
| Short sessions | One level ≈ 30–90s |
| IAA (rewarded video) | `+1 Tube`, **Undo Pack** ad stubs |

Ideal overseas TikTok loop: clear → celebrate → next → optional rewarded boost when stuck.

---

## Native path note (important)

> **This HTML prototype cannot be uploaded as TikTok Native** after the HTML Mini Game sunset.

For **production TikTok Minis (Native)**:

1. Treat this file as **playable design reference** (feel, levels, HUD, ad placement).
2. Rebuild / export via **Cocos Creator → Native** path (or the current TikTok Minis native toolchain).
3. Wire real ads: replace `showRewardedAd` stub with  
   `TTMinis.game.createRewardedVideoAd` (see TODO in `index.html`).

Ship tomorrow’s Native build from this UX, not from uploading `index.html`.

---

## Features

- **48 levels** — handcrafted 1–5, seeded shuffled deals with ramp (more colors/tubes)
- **Undo** (free pool) + **Undo Pack** (rewarded stub)
- **+1 Tube** once per level via rewarded stub
- **Hint**, Restart, Level select, Share challenge text
- **localStorage**: highest level, total pours, free undos
- Soft fail only — restart / ad-boost, no hard game over
- Confetti on clear · portrait layout (~420px) · touch + mouse

---

## Monetization stubs

```js
// TODO: TTMinis.game.createRewardedVideoAd
function showRewardedAd(onSuccess) { /* 3s "Ad playing…" overlay */ }
```

Placements:

- **+1 Tube** — extra empty flask (once / level)
- **Undo Pack** — +5 undos when free undos are spent

---

## Cocos Creator 3.8 (WeChat Mini Game)

Production path is **`cocos/`** — re-open that folder in **Cocos Creator 3.8.8**, open `assets/scenes/main.scene` (`GameController` under **Canvas**). ▶ Preview should show the SortSplash **Play** cover. Then build platform **微信小游戏** and **re-import** the new `cocos/build/wechatgame` in WeChat DevTools (overwrite any old copy such as `E:\GROK\SortSplash-WeChat\build\wechatgame`). See [`cocos/README.md`](cocos/README.md) and [`cocos/WECHAT.md`](cocos/WECHAT.md).

This `index.html` is a **playable design reference only** (levels, pour rules, HUD). Do not upload the HTML as a Mini Game package.

## Project layout

```
sortsplash-tiktok/
  index.html          # HTML prototype (design reference)
  README.md
  PLAYTEST.md
  playtest-solver.mjs # headless solvability checks
  cocos/              # Cocos Creator 3.8.8 + TypeScript (WeChat export)
```

---

## 中文简述

**SortSplash**（颜色倒水 / 试管排序）超休闲原型：打开 `index.html` 即可玩。适合海外 TikTok 益智短时循环，带激励视频广告桩（+1 试管、Undo 包）。

**重要：** HTML 不能作为小游戏上架包。量产请用 **`cocos/` + Cocos Creator 3.8.8** 打开并构建 **微信小游戏**，再把新的 `cocos/build/wechatgame` **重新导入**微信开发者工具（旧目录例如 `E:\GROK\SortSplash-WeChat\build\wechatgame` 必须整包覆盖）。清单见 `cocos/WECHAT.md`。根目录 HTML 仍作玩法/关卡参考。微信广告：`wx.createRewardedVideoAd`（`AdBridge.ts`）。

建议仓库名：`sortsplash-tiktok`。
