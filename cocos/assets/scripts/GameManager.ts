/**
 * SortSplash game flow — port of the HTML prototype.
 *
 * Preview boot (Creator ▶ browser):
 * - GameController lives UNDER Canvas (not a Scene sibling) so Labels/Sprites
 *   are in the UI tree the ORTHO camera actually sees.
 * - onLoad may run before Scene children are queryable; start() rebuilds the
 *   Play cover if it is still missing.
 * - Never call find() — parent / scene + getChildByName only.
 */
import {
    _decorator, Component, Node, UITransform, Widget, Canvas, Camera,
    director, view, ResolutionPolicy, Color,
} from 'cc';
import { LevelManager, TOTAL_LEVELS, CAP } from './LevelManager';
import { TubeManager } from './TubeManager';
import { UIManager } from './UIManager';
import { AdBridge } from './AdBridge';
import { Storage, SaveData } from './Storage';
import { WxAdapter } from './WxAdapter';
import { UI_2D, markUi } from './UiPaint';

const { ccclass, executionOrder } = _decorator;
const orderEarly: ClassDecorator = (typeof executionOrder === 'function'
    ? executionOrder(-100)
    : ((ctor: unknown) => ctor)) as ClassDecorator;

interface HistorySnap {
    tubes: number[][];
    moves: number;
}

@ccclass('GameManager')
@orderEarly
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
    /** Defaults only — Storage.load() runs inside boot() so a wx/storage throw cannot kill the constructor. */
    private save: SaveData = Storage.defaults();
    private hintTarget = -1;

    designW = 720;
    designH = 1280;

    onLoad() {
        try {
            this.boot('onLoad', false);
        } catch (err) {
            console.error('[GameManager] onLoad failed', err);
        }
    }

    start() {
        try {
            if (!this._ui || !this._ui.hasCover()) {
                console.warn('[GameManager] start(): Play cover missing — rebuilding UI');
                this.boot('start', true);
            } else {
                console.log('[GameManager] start(): Play cover already built');
            }
        } catch (err) {
            console.error('[GameManager] start failed', err);
        }
    }

    /**
     * Wire hierarchy + managers and build the Play cover.
     * @param allowCreateCanvas only start() should create a Canvas (onLoad often
     *   sees an empty sibling list and would otherwise nest a duplicate Canvas
     *   on GameController, leaving the scene Camera staring at an empty UIRoot).
     */
    boot(phase: string, allowCreateCanvas: boolean) {
        const parentName = this.node.parent ? this.node.parent.name : '(null)';
        const sceneName = this.node.scene ? this.node.scene.name : '(no scene)';
        console.log(
            `[GameManager] boot(${phase}) node=${this.node.name} parent=${parentName} scene=${sceneName} allowCreate=${allowCreateCanvas} wx=${WxAdapter.isWeChat()}`,
        );

        try {
            this.save = Storage.load();
        } catch (err) {
            console.warn('[GameManager] Storage.load failed — defaults', err);
            this.save = Storage.defaults();
        }

        try {
            if (view && typeof view.setDesignResolutionSize === 'function') {
                view.setDesignResolutionSize(this.designW, this.designH, ResolutionPolicy.SHOW_ALL);
            }
        } catch (err) {
            console.warn('[GameManager] setDesignResolutionSize failed', err);
        }

        const hier = this.ensureHierarchy(allowCreateCanvas);
        if (!hier) {
            console.warn(`[GameManager] boot(${phase}) Canvas not ready — waiting for start()`);
            return;
        }
        const { canvas, board, ui } = hier;
        this.ensureComponents();

        this._tubes!.setBoardRoot(board);
        this._ui!.setUIRoot(ui);
        this._tubes!.bind(this);
        this._ui!.bind(this);
        this._ads!.setOverlay((sec, title, done) => this._ui!.showAdCountdown(sec, title, done));

        board.setPosition(0, -20, 0);
        const but = board.getComponent(UITransform) || board.addComponent(UITransform);
        but.setContentSize(680, 720);
        markUi(board);
        markUi(ui);
        markUi(canvas);
        ui.setSiblingIndex(100);

        this.freeUndos = this.save.freeUndos ?? 3;
        this._ui!.buildAll();
        this._ui!.showCover();

        const ok = this._ui!.hasCover();
        if (ok) {
            console.log(
                `[GameManager] boot(${phase}) SUCCESS cover under ${ui.name} parent=${ui.parent && ui.parent.name}`,
            );
        } else {
            console.error(`[GameManager] boot(${phase}) FAILED — Play cover was not created`);
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
        if (!this._tubes || !this._ui || !this._ads) {
            console.error('[GameManager] ensureComponents failed', {
                tubes: !!this._tubes, ui: !!this._ui, ads: !!this._ads,
            });
        }
    }

    /**
     * Resolve Canvas without `find()`. Prefer `this.node.parent` when
     * GameController is a Canvas child (parent.name === 'Canvas') — that works
     * even if Scene's sibling list is still empty during onLoad.
     */
    resolveCanvas(): Node | null {
        const named = (root: Node | null | undefined, name: string): Node | null => {
            if (!root) return null;
            if (root.name === name) return root;
            return root.getChildByName ? root.getChildByName(name) : null;
        };

        const fromParent = named(this.node.parent, 'Canvas');
        if (fromParent) return fromParent;

        const scene = this.node.scene || director.getScene();
        const fromScene = named(scene, 'Canvas');
        if (fromScene) return fromScene;

        for (let p: Node | null = this.node; p; p = p.parent) {
            if (p.name === 'Canvas') return p;
            const child = p.getChildByName ? p.getChildByName('Canvas') : null;
            if (child) return child;
        }
        return null;
    }

    /**
     * Belt-and-suspenders: create Canvas / BoardRoot / UIRoot / ORTHO Camera if missing.
     * Always returns the live board/ui nodes so boot can wire managers without find().
     */
    ensureHierarchy(allowCreateCanvas: boolean): { canvas: Node; board: Node; ui: Node } | null {
        let canvas = this.resolveCanvas();
        if (!canvas) {
            if (!allowCreateCanvas) return null;
            console.warn('[GameManager] no Canvas in hierarchy — creating one on the scene');
            canvas = new Node('Canvas');
            markUi(canvas);
            const scene = this.node.scene || director.getScene() || this.node.parent;
            if (scene && scene !== this.node) scene.addChild(canvas);
            else {
                console.error('[GameManager] cannot parent Canvas (would nest under GameController)');
                return null;
            }

            const ut = canvas.addComponent(UITransform);
            ut.setContentSize(this.designW, this.designH);
            const widget = canvas.addComponent(Widget);
            widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
            widget.top = widget.bottom = widget.left = widget.right = 0;
            if (Widget.AlignMode) widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
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
            markUi(canvas);
            this.ensureCanvasCamera(canvas);
        }

        if (this.node.parent !== canvas) {
            console.log(`[GameManager] reparent ${this.node.name} → Canvas (was ${this.node.parent ? this.node.parent.name : 'null'})`);
            this.node.parent = canvas;
        }
        this.node.name = 'GameController';
        markUi(this.node);
        const selfUt = this.node.getComponent(UITransform);
        if (selfUt) selfUt.setContentSize(1, 1);

        const ensureChild = (name: string, sibling: number, sizeW: number, sizeH: number) => {
            let n = canvas!.getChildByName(name);
            if (!n) {
                n = new Node(name);
                n.addComponent(UITransform).setContentSize(sizeW, sizeH);
                canvas!.addChild(n);
                console.log(`[GameManager] created missing child ${name}`);
            }
            markUi(n);
            n.setSiblingIndex(sibling);
            return n;
        };

        const board = ensureChild('BoardRoot', 2, 680, 720);
        const ui = ensureChild('UIRoot', 10, this.designW, this.designH);
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
            markUi(camNode);
            canvas.insertChild(camNode, 0);
            camNode.setPosition(0, 0, 1000);
            console.log('[GameManager] created Camera under Canvas');
        } else {
            camNode.setSiblingIndex(0);
            if (camNode.position.z === 0) camNode.setPosition(0, 0, 1000);
        }
        markUi(camNode);

        let camera = camNode.getComponent(Camera);
        if (!camera) camera = camNode.addComponent(Camera);

        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = this.designH / 2;
        camera.near = 1;
        camera.far = 2000;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        camera.clearColor = new Color(0xff, 0xf5, 0xfb, 255);
        camera.visibility = UI_2D;
        camera.priority = 0;

        let canvasComp = canvas.getComponent(Canvas);
        if (!canvasComp) canvasComp = canvas.addComponent(Canvas);
        canvasComp.cameraComponent = camera;
        canvasComp.alignCanvasWithScreen = true;
    }

    onStartPressed() {
        if (this._ui && !this._ui.isCoverVisible()) return;
        console.log('[GameManager] Play pressed');
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
