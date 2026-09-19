/**
 * Renders tubes with Sprite/Label color blocks (Graphics is not required).
 * Tap A then B to pour — GameManager owns rules.
 */
import {
    _decorator, Component, Node, UITransform, Color,
    tween, Vec3, UIOpacity,
} from 'cc';
import { COLORS } from './LevelManager';
import type { GameManager } from './GameManager';
import { ensureUt, makeColorNode, makeLabel, markUi } from './UiPaint';
import { Copy } from './Copy';

const { ccclass } = _decorator;

function hexColor(hex: string): Color {
    const h = hex.replace('#', '');
    return new Color(
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        255,
    );
}

@ccclass('TubeManager')
export class TubeManager extends Component {
    boardRoot: Node | null = null;
    private _game: GameManager | null = null;
    private _tubeW = 72;
    private _tubeH = 220;
    private _wraps: Node[] = [];

    designW = 720;
    designH = 1280;

    bind(game: GameManager) {
        this._game = game;
    }

    setBoardRoot(root: Node) {
        this.boardRoot = root;
        if (root) markUi(root);
    }

    render(tubes: number[][], selected: number, capacity: number, hintTarget: number = -1) {
        if (!this.boardRoot) {
            console.warn('[TubeManager] boardRoot missing — skip render');
            return;
        }
        this.boardRoot.removeAllChildren();
        this._wraps = [];

        const n = tubes.length;
        this._tubeW = n > 10 ? 56 : n > 8 ? 64 : 72;
        this._tubeH = n > 10 ? 180 : n > 8 ? 200 : 220;
        const gapX = n > 10 ? 12 : 16;
        const gapY = 22;
        const labelH = 18;
        const cellW = this._tubeW + gapX;
        const cellH = this._tubeH + labelH + gapY;

        const maxCols = Math.max(3, Math.floor((this.designW - 40) / cellW));
        const cols = Math.min(maxCols, n);
        const rows = Math.ceil(n / cols);

        const boardW = cols * cellW;
        const boardH = rows * cellH;
        const ut = this.boardRoot.getComponent(UITransform) || this.boardRoot.addComponent(UITransform);
        ut.setContentSize(boardW, boardH);

        for (let idx = 0; idx < n; idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = -boardW / 2 + cellW / 2 + col * cellW;
            const y = boardH / 2 - cellH / 2 - row * cellH;
            const wrap = this._createTube(tubes[idx], idx, capacity, selected === idx, hintTarget === idx);
            wrap.setPosition(x, y + (selected === idx ? 14 : 0), 0);
            this.boardRoot.addChild(wrap);
            this._wraps.push(wrap);
        }
    }

    shake(idx: number) {
        const wrap = this._wraps[idx];
        if (!wrap) return;
        const origin = wrap.position.clone();
        tween(wrap)
            .to(0.06, { position: new Vec3(origin.x - 6, origin.y, 0) })
            .to(0.06, { position: new Vec3(origin.x + 6, origin.y, 0) })
            .to(0.06, { position: new Vec3(origin.x - 4, origin.y, 0) })
            .to(0.06, { position: new Vec3(origin.x, origin.y, 0) })
            .start();
    }

    private _createTube(tube: number[], idx: number, capacity: number, selected: boolean, hinted: boolean): Node {
        const w = this._tubeW;
        const h = this._tubeH;
        const wrap = new Node(`Tube_${idx}`);
        ensureUt(wrap, w + 8, h + 24);

        const border = selected || hinted
            ? new Color(255, 107, 181, 255)
            : new Color(90, 70, 120, 80);
        wrap.addChild(makeColorNode('Border', border, w + (hinted ? 8 : 4), h + (hinted ? 8 : 4), 0, 8));
        wrap.addChild(makeColorNode('Glass', new Color(255, 255, 255, 230), w, h, 0, 8));

        const layerH = h / capacity;
        for (let L = 0; L < tube.length; L++) {
            const color = hexColor(COLORS[tube[L] % COLORS.length]);
            const ly = 8 + (-h / 2 + layerH * L + layerH / 2);
            wrap.addChild(makeColorNode('L' + L, color, w - 8, layerH - 2, 0, ly));
        }

        const lab = makeLabel('EmptyLab', tube.length ? '' : Copy.emptyTube, 14, new Color(122, 111, 138, 255), 0, -h / 2 - 4, w);
        wrap.addChild(lab.node);

        wrap.on(Node.EventType.TOUCH_END, (e: any) => {
            if (e && e.propagationStopped !== undefined) e.propagationStopped = true;
            this._game?.onTubeTap(idx);
        }, this);

        if (selected) {
            const op = wrap.addComponent(UIOpacity);
            op.opacity = 255;
        }

        return wrap;
    }
}
