/**
 * SortSplash game flow — port of the HTML prototype.
 * Ensures Canvas + ORTHO UI camera so preview is not black.
 */
import {
    _decorator, Component, Node, UITransform, Widget, Canvas, Camera,
    director, view, ResolutionPolicy, Layers, Color,
} from 'cc';
import { LevelManager, TOTAL_LEVELS, CAP } from './LevelManager';
import { TubeManager } from './TubeManager';
import { UIManager } from './UIManager';
import { AdBridge } from './AdBridge';
import { Storage, SaveData } from './Storage';
import { WxAdapter } from './WxAdapter';

const { ccclass } = _decorator;

interface HistorySnap {
    tubes: number[][];
    moves: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
    private _tubes: TubeManager | null = null;
    private _ui: UIManager | null = null;
    private _ads: AdBridge | null = null;

    private level = 1;
    private tubes: number[][] = [];
    private capacity = CAP;
    private moves = 0;
    private selected = -1;
    private history: HistorySnap[] = [];
    private freeUndos = 3;
    private bonusTubeUsed = false;
    private pouring = false;
    private save: SaveData = Storage.load();
    private hintTarget = -1;

    designW = 720;
    designH = 1280;

    onLoad() {
        try {
            view.setDesignResolutionSize(this.designW, this.designH, ResolutionPolicy.SHOW_ALL);
            const { board, ui } = this.ensureHierarchy();
            this.ensureComponents();

            // Wire from nodes we just ensured — do not use find().
            // find() during onLoad often returns null in Creator browser preview
            // (director.getScene() not ready), which left uiRoot unset and buildAll() no-op.
            this._tubes!.setBoardRoot(board);
            this._ui!.setUIRoot(ui);

            this._tubes!.bind(this);
            this._ui!.bind(this);
            this._ads!.setOverlay((sec, title, done) => this._ui!.showAdCountdown(sec, title, done));

            board.setPosition(0, -20, 0);
            const but = board.getComponent(UITransform) || board.addComponent(UITransform);
            but.setContentSize(680, 720);
            board.layer = Layers.Enum.UI_2D;
            ui.layer = Layers.Enum.UI_2D;
            ui.setSiblingIndex(100);

            this.freeUndos = this.save.freeUndos ?? 3;
            this._ui!.buildAll();
            this._ui!.showCover();
        } catch (err) {
            console.error('[GameManager] onLoad failed', err);
        }
    }

    /**
     * Scene only mounts GameManager. Attach sibling gameplay scripts at runtime
     * so Creator never has to deserialize TubeManager / UIManager / AdBridge from the scene.
     */
    ensureComponents() {
        this._tubes = this.getComponent(TubeManager) || this.addComponent(TubeManager);
        this._ui = this.getComponent(UIManager) || this.addComponent(UIManager);
        this._ads = this.getComponent(AdBridge) || this.addComponent(AdBridge);
    }

    /**
     * Resolve Canvas without `find()`. During onLoad, `this.node.parent` / `this.node.scene`
     * are set even when `director.getScene()` (used by find) is still null.
     */
    resolveCanvas(): Node | null {
        const named = (root: Node | null | undefined, name: string): Node | null => {
            if (!root) return null;
            if (root.name === name) return root;
            return root.getChildByName(name);
        };

        const fromParent = named(this.node.parent, 'Canvas');
        if (fromParent) return fromParent;

        const scene = this.node.scene || director.getScene();
        const fromScene = named(scene, 'Canvas');
        if (fromScene) return fromScene;

        for (let p: Node | null = this.node; p; p = p.parent) {
            if (p.name === 'Canvas') return p;
            const child = p.getChildByName('Canvas');
            if (child) return child;
        }
        return null;
    }

    /**
     * Belt-and-suspenders: create Canvas / BoardRoot / UIRoot / ORTHO Camera if missing.
     * Always returns the live board/ui nodes so onLoad can wire managers without find().
     */
    ensureHierarchy(): { canvas: Node; board: Node; ui: Node } {
        let canvas = this.resolveCanvas();
        if (!canvas) {
            canvas = new Node('Canvas');
            canvas.layer = Layers.Enum.UI_2D;
            const scene = this.node.scene || director.getScene() || this.node.parent;
            if (scene) scene.addChild(canvas);
            else this.node.addChild(canvas);

            const ut = canvas.addComponent(UITransform);
            ut.setContentSize(this.designW, this.designH);
            const widget = canvas.addComponent(Widget);
            widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
            widget.top = widget.bottom = widget.left = widget.right = 0;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
            this.ensureCanvasCamera(canvas);
        } else {
            let w = canvas.getComponent(Widget);
            if (!w) {
                w = canvas.addComponent(Widget);
                w.isAlignTop = w.isAlignBottom = w.isAlignLeft = w.isAlignRight = true;
                w.top = w.bottom = w.left = w.right = 0;
            }
            if (!canvas.getComponent(UITransform)) {
                const ut = canvas.addComponent(UITransform);
                ut.setContentSize(this.designW, this.designH);
            }
            canvas.layer = Layers.Enum.UI_2D;
            this.ensureCanvasCamera(canvas);
        }

        const ensureChild = (name: string, sibling: number, sizeW: number, sizeH: number) => {
            let n = canvas!.getChildByName(name);
            if (!n) {
                n = new Node(name);
                n.addComponent(UITransform).setContentSize(sizeW, sizeH);
                canvas!.addChild(n);
            }
            n.layer = Layers.Enum.UI_2D;
            n.setSiblingIndex(sibling);
            return n;
        };

        const board = ensureChild('BoardRoot', 2, 680, 720);
        const ui = ensureChild('UIRoot', 10, this.designW, this.designH);

        if (this.node.parent && this.node.name !== 'GameController') {
            this.node.name = 'GameController';
        }
        this.node.layer = Layers.Enum.UI_2D;
        this.ensureCanvasCamera(canvas);
        return { canvas, board, ui };
    }

    /**
     * Ensure Canvas has an orthographic UI Camera (editor/preview + runtime fallback).
     */
    ensureCanvasCamera(canvas: Node) {
        let camNode = canvas.getChildByName('Camera');
        if (!camNode) {
            camNode = new Node('Camera');
            camNode.layer = Layers.Enum.UI_2D;
            canvas.insertChild(camNode, 0);
            camNode.setPosition(0, 0, 1000);
        } else {
            camNode.setSiblingIndex(0);
            if (camNode.position.z === 0) camNode.setPosition(0, 0, 1000);
        }
        camNode.layer = Layers.Enum.UI_2D;

        let camera = camNode.getComponent(Camera);
        if (!camera) camera = camNode.addComponent(Camera);

        // Cocos 3.8: ProjectionType.ORTHO = 0; SOLID_COLOR clears color+depth+stencil
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = this.designH / 2; // 640 for 1280 design height
        camera.near = 1;
        camera.far = 2000;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        camera.clearColor = new Color(0xff, 0xf5, 0xfb, 255);
        camera.visibility = Layers.Enum.UI_2D;
        camera.priority = 0;

        let canvasComp = canvas.getComponent(Canvas);
        if (!canvasComp) canvasComp = canvas.addComponent(Canvas);
        canvasComp.cameraComponent = camera;
        canvasComp.alignCanvasWithScreen = true;
    }

    onStartPressed() {
        this._ui?.hideCover();
        this.loadLevel(Math.min(this.save.highest, TOTAL_LEVELS));
    }

    loadLevel(n: number) {
        this.level = Math.max(1, Math.min(n, TOTAL_LEVELS));
        const data = LevelManager.generateLevel(this.level);
        this.tubes = LevelManager.cloneState(data.tubes);
        this.capacity = data.capacity || CAP;
        this.moves = 0;
        this.selected = -1;
        this.history = [];
        this.bonusTubeUsed = false;
        this.pouring = false;
        this.hintTarget = -1;
        this._ui?.hideWin();
        this._ui?.setHint(this.level <= 2 ? 'Tip: pour matching colors into the same tube' : '');
        this._refresh();
    }

    onTubeTap(idx: number) {
        if (this.pouring) return;
        if (this.selected < 0) {
            if (!this.tubes[idx] || !this.tubes[idx].length) {
                this._ui?.showToast('Pick a tube with color');
                return;
            }
            this.selected = idx;
            this._refresh();
            return;
        }
        if (this.selected === idx) {
            this.selected = -1;
            this._refresh();
            return;
        }
        this.attemptPour(this.selected, idx);
    }

    attemptPour(from: number, to: number) {
        const amt = LevelManager.pourAmount(this.tubes[from], this.tubes[to], this.capacity);
        if (!amt) {
            this._tubes?.shake(to);
            this._ui?.showToast("Can't pour there");
            this.selected = -1;
            this._refresh();
            return;
        }

        this.history.push({ tubes: LevelManager.cloneState(this.tubes), moves: this.moves });
        this.pouring = true;
        LevelManager.doPour(this.tubes, from, to, this.capacity);
        this.moves++;
        this.save.totalPours = (this.save.totalPours || 0) + 1;
        Storage.save(this.save);
        this.selected = -1;
        this.hintTarget = -1;
        this._refresh();

        this.scheduleOnce(() => {
            this.pouring = false;
            if (LevelManager.isWon(this.tubes, this.capacity)) this.onWin();
        }, 0.28);
    }

    onWin() {
        if (this.level >= this.save.highest) {
            this.save.highest = Math.min(this.level + 1, TOTAL_LEVELS);
            Storage.save(this.save);
        }
        if (this.freeUndos < 3) {
            this.freeUndos = Math.min(3, this.freeUndos + 1);
            this.save.freeUndos = this.freeUndos;
            Storage.save(this.save);
        }
        const msg = `Level ${this.level} done in ${this.moves} moves!`
            + (this.level < TOTAL_LEVELS ? '' : ' You finished all levels! 🏆');
        this._ui?.showWin(msg);
        this._refresh();
    }

    onNextLevel() {
        this._ui?.hideWin();
        if (this.level >= TOTAL_LEVELS) {
            this._ui?.showToast('All levels cleared! 🏆');
            return;
        }
        const next = this.level + 1;
        this._ads?.showInterstitial(() => this.loadLevel(next));
    }

    onReplay() {
        this._ui?.hideWin();
        this.loadLevel(this.level);
    }

    onRestart() {
        this.loadLevel(this.level);
        this._ui?.showToast('Level restarted');
    }

    onUndo() {
        if (!this.history.length) return;
        if (this.freeUndos <= 0) {
            this._ui?.showToast('No free undos — watch an ad for Undo Pack');
            return;
        }
        const snap = this.history.pop();
        if (!snap) return;
        this.tubes = LevelManager.cloneState(snap.tubes);
        this.moves = snap.moves;
        this.freeUndos--;
        this.save.freeUndos = this.freeUndos;
        Storage.save(this.save);
        this.selected = -1;
        this.hintTarget = -1;
        this._refresh();
    }

    onHint() {
        // Rewarded stub for Hint (wx.createRewardedVideoAd)
        this._ads?.showRewarded('hint', () => {
            const h = LevelManager.findHint(this.tubes, this.capacity);
            if (!h) {
                this._ui?.showToast('No move found — try Undo or +1 Tube');
                return;
            }
            this.selected = h.i;
            this.hintTarget = h.j;
            this._ui?.setHint(`Hint: pour tube ${h.i + 1} → tube ${h.j + 1}`);
            this._refresh();
            this.scheduleOnce(() => {
                this.hintTarget = -1;
                this._ui?.setHint('');
                this._refresh();
            }, 4);
        }, () => {
            this._ui?.showToast('Ad not finished');
        });
    }

    onAddTube() {
        if (this.bonusTubeUsed) {
            this._ui?.showToast('Already used +1 Tube this level');
            return;
        }
        this._ads?.showRewarded('tube', () => {
            this.tubes.push([]);
            this.bonusTubeUsed = true;
            this.selected = -1;
            this._refresh();
            this._ui?.showToast('+1 empty tube added! 🧪');
        }, () => {
            this._ui?.showToast('Ad not finished');
        });
    }

    onUndoPack() {
        this._ads?.showRewarded('undo', () => {
            this.freeUndos += 5;
            this.save.freeUndos = this.freeUndos;
            Storage.save(this.save);
            this._refresh();
            this._ui?.showToast('+5 undos unlocked!');
        }, () => {
            this._ui?.showToast('Ad not finished');
        });
    }

    onShare() {
        const text = `I cleared Level ${Math.max(1, this.save.highest - 1)} on SortSplash! 🧪✨ Sort colors. One more pour.`;
        WxAdapter.shareAppMessage({ title: text });
        this._ui?.showToast(WxAdapter.isWeChat() ? 'Share sheet opened' : 'Copied challenge text!');
    }

    onOpenLevels() {
        this._ui?.showLevels(this.save.highest, this.level);
    }

    private _refresh() {
        this._tubes?.render(this.tubes, this.selected, this.capacity, this.hintTarget);
        this._ui?.updateHUD(this.level, this.moves, this.freeUndos, this.history.length > 0, this.bonusTubeUsed);
    }
}
