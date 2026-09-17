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

## Project layout

```
sortsplash/
  index.html          # single-file game
  README.md
  PLAYTEST.md
  playtest-solver.mjs # headless solvability checks
```

Zip: `../sortsplash.zip`

---

## 中文简述

**SortSplash**（颜色倒水 / 试管排序）超休闲原型：打开 `index.html` 即可玩。适合海外 TikTok 益智短时循环，带激励视频广告桩（+1 试管、Undo 包）。

**重要：** HTML 不能作为 TikTok Native 上架；量产请用 **Cocos Creator Native** 重做导出，本仓库作可玩原型与交互/关卡参考。广告对接：`TTMinis.game.createRewardedVideoAd`。

建议仓库名：`sortsplash-tiktok`。
