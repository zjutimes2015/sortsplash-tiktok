/**
 * SortSplash level generation + pour rules.
 * Faithful port of the HTML prototype (index.html) — 48 levels.
 * Pure TypeScript (no `cc` import) so logic can be verified outside Creator.
 */

export const CAP = 4;
export const TOTAL_LEVELS = 48;

/** Layer colors matching the HTML prototype. */
export const COLORS: string[] = [
    '#FF5C8A', // pink
    '#5B8CFF', // blue
    '#3ECF8E', // green
    '#FFB347', // orange
    '#A78BFA', // purple
    '#22D3EE', // cyan
    '#F472B6', // hot pink
    '#FACC15', // yellow
    '#FB7185', // rose
    '#34D399', // mint
    '#818CF8', // indigo
    '#FB923C', // tangerine
];

export interface LevelParams {
    colors: number;
    empties: number;
    capacity: number;
}

export interface LevelData {
    tubes: number[][];
    colors: number;
    capacity: number;
}

export interface HintMove {
    i: number;
    j: number;
}

export class LevelManager {
    static levelParams(n: number): LevelParams {
        let colors: number;
        let empties: number;
        if (n <= 3) { colors = 3; empties = 2; }
        else if (n <= 8) { colors = 4; empties = 2; }
        else if (n <= 15) { colors = 5; empties = 2; }
        else if (n <= 22) { colors = 6; empties = 2; }
        else if (n <= 30) { colors = 7; empties = 2; }
        else if (n <= 38) { colors = 8; empties = 2; }
        else if (n <= 44) { colors = 9; empties = 2; }
        else { colors = 10; empties = 2; }
        return { colors, empties, capacity: CAP };
    }

    static cloneState(tubes: number[][]): number[][] {
        return tubes.map((t) => t.slice());
    }

    static canPour(src: number[], dst: number[], capacity: number): boolean {
        if (!src.length) return false;
        if (dst.length >= capacity) return false;
        if (!dst.length) return true;
        return src[src.length - 1] === dst[dst.length - 1];
    }

    static pourAmount(src: number[], dst: number[], capacity: number): number {
        if (!this.canPour(src, dst, capacity)) return 0;
        const color = src[src.length - 1];
        let count = 0;
        for (let i = src.length - 1; i >= 0 && src[i] === color; i--) count++;
        return Math.min(count, capacity - dst.length);
    }

    static doPour(tubes: number[][], i: number, j: number, capacity: number): boolean {
        const amt = this.pourAmount(tubes[i], tubes[j], capacity);
        if (!amt) return false;
        const color = tubes[i][tubes[i].length - 1];
        for (let k = 0; k < amt; k++) {
            tubes[i].pop();
            tubes[j].push(color);
        }
        return true;
    }

    static isWon(tubes: number[][], capacity: number): boolean {
        return tubes.every((t) => {
            if (!t.length) return true;
            if (t.length !== capacity) return false;
            const c = t[0];
            return t.every((x) => x === c);
        });
    }

    static stateKey(tubes: number[][]): string {
        return tubes.map((t) => t.join(',')).join('|');
    }

    static isSolvable(tubes: number[][], capacity: number, maxNodes?: number): boolean {
        maxNodes = maxNodes || 80000;
        if (this.isWon(tubes, capacity)) return true;
        const start = this.cloneState(tubes);
        const queue: number[][][] = [start];
        const seen: any = {};
        seen[this.stateKey(start)] = true;
        let nodes = 0;
        const N = start.length;
        while (queue.length) {
            const t = queue.shift();
            nodes++;
            if (nodes > maxNodes) return true; // assume ok if deep (avoid false reject)
            for (let i = 0; i < N; i++) {
                if (!t[i].length) continue;
                if (t[i].length === capacity && t[i].every((x) => x === t[i][0])) continue;
                for (let j = 0; j < N; j++) {
                    if (i === j) continue;
                    if (!this.pourAmount(t[i], t[j], capacity)) continue;
                    const next = this.cloneState(t);
                    this.doPour(next, i, j, capacity);
                    const k = this.stateKey(next);
                    if (seen[k]) continue;
                    if (this.isWon(next, capacity)) return true;
                    seen[k] = true;
                    queue.push(next);
                }
            }
        }
        return false;
    }

    static mulberry32(a: number): () => number {
        return function () {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    static dealShuffled(colors: number, empties: number, capacity: number, rng: () => number): number[][] {
        const layers: number[] = [];
        for (let c = 0; c < colors; c++) {
            for (let i = 0; i < capacity; i++) layers.push(c);
        }
        for (let i = layers.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = layers[i];
            layers[i] = layers[j];
            layers[j] = tmp;
        }
        const tubes: number[][] = [];
        for (let c = 0; c < colors; c++) {
            tubes.push(layers.slice(c * capacity, (c + 1) * capacity));
        }
        for (let e = 0; e < empties; e++) tubes.push([]);
        return tubes;
    }

    static generateLevel(levelNum: number): LevelData {
        const { colors, empties, capacity } = this.levelParams(levelNum);

        // Handcrafted tutorial levels (verified solvable) — same as HTML
        if (levelNum === 1) {
            return { tubes: [[0, 0, 1, 1], [1, 1, 0, 0], [], []], colors: 2, capacity };
        }
        if (levelNum === 2) {
            return { tubes: [[0, 1, 0, 1], [1, 0, 1, 0], [], []], colors: 2, capacity };
        }
        if (levelNum === 3) {
            return { tubes: [[0, 1, 2, 0], [1, 2, 0, 1], [2, 0, 1, 2], [], []], colors: 3, capacity };
        }
        if (levelNum === 4) {
            return { tubes: [[0, 0, 1, 2], [1, 2, 0, 1], [2, 1, 0, 2], [], []], colors: 3, capacity };
        }
        if (levelNum === 5) {
            return { tubes: [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], [], []], colors: 4, capacity };
        }

        let tubes: number[][] | null = null;
        const maxAttempts = 30;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const rngA = this.mulberry32(levelNum * 7919 + 42 + attempt * 9973);
            const candidate = this.dealShuffled(colors, empties, capacity, rngA);
            if (this.isWon(candidate, capacity)) continue;
            if (levelNum <= 18) {
                if (this.isSolvable(candidate, capacity, levelNum <= 10 ? 120000 : 50000)) {
                    tubes = candidate;
                    break;
                }
            } else {
                tubes = candidate;
                break;
            }
        }
        if (!tubes) {
            const rng = this.mulberry32(levelNum * 7919 + 42);
            tubes = this.dealShuffled(colors, empties, capacity, rng);
            if (this.isWon(tubes, capacity) && tubes[0].length && tubes[1].length) {
                const a = tubes[0].pop() as number;
                const b = tubes[1].pop() as number;
                tubes[0].push(b);
                tubes[1].push(a);
            }
        }

        return { tubes, colors, capacity };
    }

    /**
     * Greedy one-step hint (same scoring as HTML findHint).
     */
    static findHint(tubes: number[][], capacity: number): HintMove | null {
        const N = tubes.length;
        let best: HintMove | null = null;
        let bestScore = -1;
        for (let i = 0; i < N; i++) {
            if (!tubes[i].length) continue;
            for (let j = 0; j < N; j++) {
                if (i === j) continue;
                const amt = this.pourAmount(tubes[i], tubes[j], capacity);
                if (!amt) continue;
                const color = tubes[i][tubes[i].length - 1];
                let topCount = 0;
                for (let k = tubes[i].length - 1; k >= 0 && tubes[i][k] === color; k--) topCount++;
                let score = amt;
                const wouldBeFull = tubes[j].length + amt === capacity;
                const destSame = !tubes[j].length || tubes[j][tubes[j].length - 1] === color;
                if (wouldBeFull && destSame) score += 50;
                if (amt === topCount) score += 10;
                if (tubes[j].length) score += 5;
                const srcSorted = tubes[i].length === capacity && tubes[i].every((x) => x === tubes[i][0]);
                if (srcSorted) score -= 100;
                if (score > bestScore) {
                    bestScore = score;
                    best = { i, j };
                }
            }
        }
        return best;
    }
}
