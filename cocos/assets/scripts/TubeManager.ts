/**
 * Renders tubes with Graphics + Label (no prefabs / art).
 * Tap A then B to pour — GameManager owns rules.
 */
import {
    _decorator, Component, Node, UITransform, Graphics, Label, Color,
    tween, Vec3, Layers, UIOpacity,
} from 'cc';
import { COLORS } from './LevelManager';
import type { GameManager } from './GameManager';

const { ccclass } = _decorator;

function applySystemFont(lab: Label) {
    const anyLab = lab as Label & {
        useSystemFont?: boolean;
        fontFamily?: string;
        cacheMode?: number;
    };
    if ('useSystemFont' in anyLab) anyLab.useSystemFont = true;
    if ('fontFamily' in anyLab) anyLab.fontFamily = anyLab.fontFamily || 'Arial';
    const modes = (Label as typeof Label & { CacheMode?: { NONE: number } }).CacheMode;
    if (modes && 'cacheMode' in anyLab) anyLab.cacheMode = modes.NONE;
}

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
        wrap.layer = Layers.Enum.UI_2D;
        wrap.addComponent(UITransform).setContentSize(w + 8, h + 24);

        const glass = new Node('Glass');
        glass.layer = Layers.Enum.UI_2D;
        glass.addComponent(UITransform).setContentSize(w, h);
        glass.setPosition(0, 8, 0);
        const g = glass.addComponent(Graphics);

        // glass body
        g.fillColor = new Color(255, 255, 255, 90);
        g.roundRect(-w / 2, -h / 2, w, h, 16);
        g.fill();
        g.strokeColor = selected ? new Color(255, 107, 181, 220) : new Color(90, 70, 120, 70);
        g.lineWidth = selected ? 4 : 3;
        g.roundRect(-w / 2, -h / 2, w, h, 16);
        g.stroke();

        if (hinted) {
            g.strokeColor = new Color(255, 107, 181, 255);
            g.lineWidth = 3;
            g.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 18);
            g.stroke();
        }

        // layers bottom → top (tube[0] is bottom)
        const layerH = h / capacity;
        for (let L = 0; L < tube.length; L++) {
            const color = hexColor(COLORS[tube[L] % COLORS.length]);
            const ly = -h / 2 + layerH * L;
            g.fillColor = color;
            if (L === 0) {
                g.roundRect(-w / 2 + 3, ly + 3, w - 6, layerH - 3, 12);
            } else {
                g.rect(-w / 2 + 3, ly, w - 6, layerH);
            }
            g.fill();
            // highlight on each layer
            g.fillColor = new Color(255, 255, 255, 70);
            g.rect(-w / 2 + 3, ly + layerH * 0.62, w - 6, layerH * 0.28);
            g.fill();
        }

        // inner shine
        g.fillColor = new Color(255, 255, 255, 70);
        g.roundRect(-w / 2 + 6, -h / 2 + 16, 8, h - 30, 4);
        g.fill();

        wrap.addChild(glass);

        const labN = new Node('EmptyLab');
        labN.layer = Layers.Enum.UI_2D;
        labN.addComponent(UITransform).setContentSize(w, 16);
        labN.setPosition(0, -h / 2 - 4, 0);
        const lab = labN.addComponent(Label);
        lab.string = tube.length ? '' : 'empty';
        lab.fontSize = 14;
        lab.lineHeight = 16;
        lab.horizontalAlign = Label.HorizontalAlign.CENTER;
        lab.verticalAlign = Label.VerticalAlign.CENTER;
        lab.color = new Color(122, 111, 138, 255);
        applySystemFont(lab);
        wrap.addChild(labN);

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
