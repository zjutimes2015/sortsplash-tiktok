/**
 * Run with: node --experimental-strip-types --no-warnings tools/verify-levels-runner.ts
 */
import { LevelManager, TOTAL_LEVELS, CAP } from '../assets/scripts/LevelManager.ts';

function assert(cond: boolean, msg: string) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
}

console.log('=== SortSplash LevelManager checks ===');

const lv1 = LevelManager.generateLevel(1);
assert(JSON.stringify(lv1.tubes) === JSON.stringify([[0, 0, 1, 1], [1, 1, 0, 0], [], []]), 'Lv1 handcrafted');
assert(lv1.colors === 2 && lv1.capacity === CAP, 'Lv1 colors/cap');

const lv5 = LevelManager.generateLevel(5);
assert(lv5.tubes.length === 6, 'Lv5 tube count (4 colors + 2 empty)');
assert(!LevelManager.isWon(lv5.tubes, CAP), 'Lv5 not already won');

const t = [[0, 0, 1, 1], [1, 1, 0, 0], [], []];
assert(LevelManager.canPour(t[0], t[2], CAP), 'can pour onto empty');
assert(!LevelManager.canPour(t[0], t[1], CAP), 'cannot pour mismatch');
assert(LevelManager.pourAmount(t[0], t[2], CAP) === 2, 'pour two matching top');
assert(LevelManager.doPour(t, 0, 2, CAP), 'doPour');
assert(JSON.stringify(t[0]) === JSON.stringify([0, 0]) && JSON.stringify(t[2]) === JSON.stringify([1, 1]), 'pour result');

assert(LevelManager.isWon([[0, 0, 0, 0], [1, 1, 1, 1], []], CAP), 'won sorted');
assert(!LevelManager.isWon([[0, 0, 0], [1, 1, 1, 1]], CAP), 'not won if short tube');

let bfsOk = 0;
for (let lv = 1; lv <= 8; lv++) {
    const data = LevelManager.generateLevel(lv);
    const ok = LevelManager.isSolvable(data.tubes, data.capacity, lv <= 5 ? 80000 : 120000);
    console.log(`Lv ${lv}: tubes=${data.tubes.length} colors=${data.colors} solvable=${ok}`);
    if (ok) bfsOk++;
}
assert(bfsOk === 8, 'levels 1-8 solvable');

assert(TOTAL_LEVELS === 48, '48 levels');
const lv48 = LevelManager.generateLevel(48);
assert(lv48.colors === 10 && lv48.tubes.length === 12, 'Lv48: 10 colors + 2 empty');
assert(!LevelManager.isWon(lv48.tubes, CAP), 'Lv48 not already won');

const hint = LevelManager.findHint([[0, 0, 1, 1], [1, 1, 0, 0], [], []], CAP);
assert(!!hint, 'hint exists on lv1');

console.log('ALL PASS');
