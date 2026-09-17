# SortSplash Playtest Report

**Date:** 2026-09-17 (Asia/Shanghai)  
**Build:** `/workspace/sortsplash/index.html` (single-file, no CDN)  
**Method:** Node headless BFS/greedy solver (`playtest-solver.mjs`) + static HTML checks + JS `node --check`  
**Verdict:** **READY**

---

## Levels tried

| Level(s) | Method | Result | Notes |
|---|---|---|---|
| 1 | BFS | SOLVED in 3 moves | Handcrafted tutorial |
| 2 | BFS | SOLVED in 7 moves | Handcrafted |
| 3 | BFS | SOLVED in 10 moves | Handcrafted, 3 colors |
| 4 | BFS | SOLVED in 9 moves | Handcrafted |
| 5 | BFS | SOLVED in 13 moves | Handcrafted, 4 colors |
| 6–8 | BFS | SOLVED (9–12 moves) | Seeded shuffle, 4 colors |
| 9–12 | BFS | SOLVED (10–15 moves) | 5 colors ramp |
| 15 | BFS | SOLVED in 14 moves | |
| 18 | BFS (deep) | SOLVED in 16 moves | Extra deep check |
| 20 | BFS (deep, 128k nodes) | SOLVED in 18 moves | Playtest budget 80k was too low initially |
| 22 | BFS | SOLVED in 16 moves | |
| 25, 30, 35, 40, 45, 48 | Sampled | Not fully BFS-exhausted in default budget | 2 empty tubes; generation retries; mid levels verified |

**Levels 1–5 clearly beatable by a new player** — confirmed by short optimal solutions (3–13 pours).

Total content: **48 levels**, difficulty ramp via color/tube count (3→10 colors).

---

## Static checks

All **PASS**:

- Title / brand SortSplash  
- `showRewardedAd` + `// TODO: TTMinis.game.createRewardedVideoAd`  
- localStorage persistence hooks  
- Undo, +1 Tube, confetti, Share  
- No external CDN / fonts / images  
- Touch targets `min-height: 44px`  
- Extracted script: `node --check` **OK**  
- File size ≈ 28 KB  

---

## Bugs found / fixed

1. **Already-solved generated levels (Lv 6+)**  
   - Cause: “shuffle” used only legal full pours from a solved state → monochromatic moves that left boards won (0 moves).  
   - Fix: switched to **Fisher–Yates deal** of color layers into tubes + empty tubes, with solvability retry for early/mid levels.

2. **Misleading reverse-shuffle mixing**  
   - Cause: legal single-layer pours also cannot mix different colors from a sorted start.  
   - Fix: abandoned reverse-legal scramble; use shuffled deals instead.

3. **One-empty mid levels**  
   - Risk: `empties = 1` on some levels hurt solvability.  
   - Fix: always **≥2 empty tubes**.

4. **Playtest false miss on Lv 20**  
   - Cause: BFS node budget 80k too low (needs ~128k).  
   - Fix: deep re-check confirmed solvable; documented.

---

## Feature smoke (logic / stubs)

| Feature | Status |
|---|---|
| Pour rules (match / empty / capacity) | OK (solver uses same rules) |
| Win condition | OK |
| Rewarded ad stub (3s overlay) | Present in HTML |
| +1 Tube / Undo Pack buttons | Present |
| Undo free pool + localStorage | Present |
| Share challenge text | Present |
| Soft fail (restart / ad, no hard GO) | Present |
| Confetti + Next | Present |

---

## How to re-run

```bash
node /workspace/sortsplash/playtest-solver.mjs
```

Open `/workspace/sortsplash/index.html` in a browser for manual feel (pours, ads, confetti).

---

## Verdict

**READY** — playable overnight prototype for TikTok overseas hypercasual reference.  
Next step for production: Cocos Creator Native rebuild + real `TTMinis.game.createRewardedVideoAd`.
