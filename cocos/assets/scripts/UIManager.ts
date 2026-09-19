/**
 * All HUD / overlays built in code.
 * Cover is Widget-stretched to Canvas; Play is a 320×88 bright-pink control
 * with Graphics + baked-color Sprite + system-font █ tiles so WeChat paints it.
 */
import {
    _decorator, Component, Node, Label, Color,
    Button, BlockInputEvents, UIOpacity, tween, Tween, Vec3,
} from 'cc';
import { TOTAL_LEVELS } from './LevelManager';
import type { GameManager } from './GameManager';
import {
    markUi, ensureUt, makeLabel, makeColorNode,
    makeButton, makeOverlay, makePlayButton, stretchToParent, logNodeRect,
} from './UiPaint';

const { ccclass } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    uiRoot: Node | null = null;
    private _game: GameManager | null = null;

    private _hud: Node | null = null;
    private _levelLabel: Label | null = null;
    private _movesLabel: Label | null = null;
    private _undoLabel: Label | null = null;
    private _hintBar: Label | null = null;
    private _toolbar: Node | null = null;
    private _footer: Node | null = null;
    private _btnAddTube: Node | null = null;
    private _btnUndo: Node | null = null;

    private _cover: Node | null = null;
    private _win: Node | null = null;
    private _winMsg: Label | null = null;
    private _ad: Node | null = null;
    private _adTitle: Label | null = null;
    private _adCount: Label | null = null;
    private _levels: Node | null = null;
    private _levelGrid: Node | null = null;
    private _toast: Node | null = null;
    private _toastLabel: Label | null = null;
    private _confetti: Node | null = null;

    designW = 720;
    designH = 1280;

    bind(game: GameManager) {
        this._game = game;
    }

    setUIRoot(root: Node) {
        this.uiRoot = root;
        if (root) markUi(root);
    }

    hasCover(): boolean {
        return !!(this._cover && this._cover.isValid !== false && this._cover.parent);
    }

    isCoverVisible(): boolean {
        return this.hasCover() && this._cover!.active !== false;
    }

    buildAll() {
        if (!this.uiRoot) {
            console.error('[UIManager] buildAll skipped: uiRoot is null');
            return;
        }
        if (this.hasCover()) {
            console.log('[UIManager] buildAll: cover already present');
            this.showCover();
            return;
        }
        this.uiRoot.removeAllChildren();
        this._hud = null;
        this._toolbar = null;
        this._footer = null;
        this._hintBar = null;
        this._cover = null;
        this._win = null;
        this._ad = null;
        this._levels = null;
        this._toast = null;
        this._confetti = null;
        this._levelLabel = null;
        this._movesLabel = null;
        this._undoLabel = null;
        this._winMsg = null;
        this._adTitle = null;
        this._adCount = null;
        this._toastLabel = null;
        this._btnAddTube = null;
        this._btnUndo = null;
        this._levelGrid = null;
        this._buildBackground();
        this._buildHUD();
        this._buildToolbar();
        this._buildHintBar();
        this._buildFooter();
        this._buildCover();
        this._buildWin();
        this._buildAd();
        this._buildLevels();
        this._buildToast();
        this._buildConfetti();
        this.setGameplayVisible(false);
        if (this.hasCover()) {
            console.log('[UIManager] buildAll SUCCESS — Play cover on', this.uiRoot.name);
        } else {
            console.error('[UIManager] buildAll FAILED — cover node missing after build');
        }
    }

    // ─── Soft pastel background (Sprite/Label fills, no Graphics) ───
    private _buildBackground() {
        if (!this.uiRoot) return;
        const canvas = this.uiRoot.parent;
        let bg = canvas?.getChildByName('BgRoot');
        if (!bg && canvas) {
            bg = new Node('BgRoot');
            ensureUt(bg, this.designW, this.designH);
            stretchToParent(bg);
            canvas.insertChild(bg, 0);
        }
        if (!bg) return;
        bg.removeAllChildren();

        const layers = [
            { color: new Color(255, 245, 251, 255), y: 280, h: 700 },
            { color: new Color(232, 244, 255, 230), y: -40, h: 700 },
            { color: new Color(240, 255, 232, 220), y: -380, h: 640 },
        ];
        for (let i = 0; i < layers.length; i++) {
            const L = layers[i];
            const n = makeColorNode(`Grad_${i}`, L.color, this.designW + 40, L.h, 0, L.y);
            bg.addChild(n);
        }
    }

    // ─── Top HUD ───
    private _buildHUD() {
        if (!this.uiRoot) return;
        const hud = new Node('HUD');
        ensureUt(hud, this.designW - 32, 72);
        hud.setPosition(0, this.designH / 2 - 56, 0);
        this.uiRoot.addChild(hud);

        hud.addChild(makeLabel('Brand', 'SortSplash', 28, new Color(255, 107, 181, 255), -200, 10, 280).node);
        hud.addChild(makeLabel('Tag', 'Sort colors. One more pour.', 14, new Color(122, 111, 138, 255), -200, -16, 280).node);

        const lv = this._makePill('LvPill', 'Lv 1', 200, 8);
        this._levelLabel = lv.label;
        hud.addChild(lv.node);

        const mv = this._makePill('MvPill', 'Moves 0', 310, 8);
        this._movesLabel = mv.label;
        hud.addChild(mv.node);

        this._hud = hud;
    }

    private _makePill(name: string, text: string, x: number, y: number) {
        const n = new Node(name);
        ensureUt(n, 110, 36);
        n.setPosition(x, y, 0);
        n.addChild(makeColorNode('PillBg', new Color(255, 255, 255, 230), 110, 36));
        const lab = makeLabel('PillLab', text, 16, new Color(42, 32, 64, 255), 0, 0, 110);
        n.addChild(lab.node);
        return { node: n, label: lab.label };
    }

    // ─── Toolbar ───
    private _buildToolbar() {
        if (!this.uiRoot) return;
        const bar = new Node('Toolbar');
        ensureUt(bar, this.designW - 24, 110);
        bar.setPosition(0, this.designH / 2 - 150, 0);
        this.uiRoot.addChild(bar);

        const specs: { name: string; text: string; x: number; y: number; ad: boolean; fn: () => void }[] = [
            { name: 'BtnUndo', text: '↩ Undo', x: -230, y: 24, ad: false, fn: () => this._game?.onUndo() },
            { name: 'BtnRestart', text: '↻ Restart', x: -70, y: 24, ad: false, fn: () => this._game?.onRestart() },
            { name: 'BtnHint', text: '💡 Hint', x: 90, y: 24, ad: false, fn: () => this._game?.onHint() },
            { name: 'BtnTube', text: '+1 Tube  AD', x: -150, y: -32, ad: true, fn: () => this._game?.onAddTube() },
            { name: 'BtnPack', text: 'Undo Pack  AD', x: 130, y: -32, ad: true, fn: () => this._game?.onUndoPack() },
        ];
        for (const s of specs) {
            const bg = s.ad ? new Color(255, 179, 71, 255) : new Color(255, 255, 255, 230);
            const tc = s.ad ? new Color(74, 48, 0, 255) : new Color(42, 32, 64, 255);
            const btn = makeButton(s.name, s.text, 150, 44, bg, s.x, s.y, s.fn, tc);
            bar.addChild(btn);
            if (s.name === 'BtnUndo') {
                this._btnUndo = btn;
                const labN = btn.getChildByName('BtnLab');
                this._undoLabel = labN ? labN.getComponent(Label) : btn.getComponent(Label);
            }
            if (s.name === 'BtnTube') this._btnAddTube = btn;
        }

        this._toolbar = bar;
    }

    private _buildHintBar() {
        if (!this.uiRoot) return;
        const n = makeLabel('HintBar', '', 16, new Color(122, 111, 138, 255), 0, this.designH / 2 - 220, 680);
        this.uiRoot.addChild(n.node);
        this._hintBar = n.label;
    }

    private _buildFooter() {
        if (!this.uiRoot) return;
        const foot = new Node('Footer');
        ensureUt(foot, this.designW - 40, 56);
        foot.setPosition(0, -this.designH / 2 + 48, 0);
        this.uiRoot.addChild(foot);
        foot.addChild(makeButton('BtnShare', '📤 Share', 160, 48, new Color(255, 255, 255, 230), -100, 0, () => {
            this._game?.onShare();
        }, new Color(42, 32, 64, 255)));
        foot.addChild(makeButton('BtnLevels', '📚 Levels', 160, 48, new Color(255, 255, 255, 230), 100, 0, () => {
            this._game?.onOpenLevels();
        }, new Color(42, 32, 64, 255)));
        this._footer = foot;
    }

    // ─── Start cover (full-screen Widget + huge Play — WeChat must see it) ───
    private _buildCover() {
        if (!this.uiRoot) return;
        stretchToParent(this.uiRoot);
        const cover = new Node('Cover');
        ensureUt(cover, this.designW, this.designH);
        stretchToParent(cover);
        cover.addComponent(BlockInputEvents);
        this.uiRoot.addChild(cover);

        const bg = makeColorNode('CoverBg', new Color(255, 245, 251, 255), this.designW, this.designH);
        stretchToParent(bg);
        const fillNames = ['FillGfx', 'FillSpr', 'FillBlk'];
        for (let i = 0; i < fillNames.length; i++) {
            const child = bg.getChildByName(fillNames[i]);
            if (child) stretchToParent(child);
        }
        cover.addChild(bg);
        cover.addChild(makeColorNode('BlobA', new Color(232, 244, 255, 180), 360, 360, -80, 200));
        cover.addChild(makeColorNode('BlobB', new Color(240, 255, 232, 160), 300, 300, 140, -80));

        cover.addChild(makeLabel('Logo', 'SortSplash', 48, new Color(255, 45, 149, 255), 0, 200, 560).node);
        cover.addChild(makeLabel('Tagline', 'Sort colors. One more pour.', 22, new Color(42, 32, 64, 255), 0, 140, 560).node);

        const demo = new Node('DemoTubes');
        ensureUt(demo, 200, 110);
        demo.setPosition(0, 10, 0);
        cover.addChild(demo);
        const demoColors = [
            [new Color(255, 107, 157, 255), new Color(124, 156, 255, 255), new Color(255, 107, 157, 255), new Color(62, 207, 142, 255)],
            [new Color(124, 156, 255, 255), new Color(62, 207, 142, 255), new Color(255, 179, 71, 255), new Color(124, 156, 255, 255)],
            [],
        ];
        for (let t = 0; t < 3; t++) {
            const tube = new Node('Mini' + t);
            ensureUt(tube, 40, 100);
            tube.setPosition(-54 + t * 54, 0, 0);
            demo.addChild(tube);
            tube.addChild(makeColorNode('Glass', new Color(255, 255, 255, 200), 40, 100));
            const layers = demoColors[t];
            const lh = 22;
            for (let L = 0; L < layers.length; L++) {
                tube.addChild(makeColorNode('L' + L, layers[L], 34, lh, 0, -36 + L * lh));
            }
        }

        const play = makePlayButton(() => {
            this._game?.onStartPressed();
        });
        cover.addChild(play);
        cover.addChild(makeLabel('Tip', 'TAP TO START', 24, new Color(42, 32, 64, 255), 0, -180, 560).node);
        cover.addChild(makeLabel('HintPour', 'Tap a tube, then another to pour', 16, new Color(90, 70, 110, 255), 0, -220, 560).node);

        this._cover = cover;
        console.log('[UIManager] Cover built (Sprite/Label) with BtnPlay');
        logNodeRect('Cover', cover);
        logNodeRect('BtnPlay', play);
        logNodeRect('UIRoot', this.uiRoot);
        this.scheduleOnce(() => {
            logNodeRect('Cover(after Widget)', cover);
            logNodeRect('BtnPlay(after Widget)', play);
            logNodeRect('UIRoot(after Widget)', this.uiRoot);
        }, 0);
    }

    // ─── Win overlay ───
    private _buildWin() {
        if (!this.uiRoot) return;
        const ov = makeOverlay('WinOverlay', this.designW, this.designH, new Color(40, 20, 60, 120));
        const panel = this._makePanel('WinPanel', 340, 320, Color.WHITE);
        ov.addChild(panel);
        panel.addChild(makeLabel('WinEmoji', '🎉✨', 40, Color.WHITE, 0, 110, 120).node);
        panel.addChild(makeLabel('WinTitle', 'Level Cleared!', 28, new Color(42, 32, 64, 255), 0, 60, 300).node);
        const msg = makeLabel('WinMsg', 'Nice pouring!', 16, new Color(122, 111, 138, 255), 0, 22, 300);
        panel.addChild(msg.node);
        this._winMsg = msg.label;
        panel.addChild(makeButton('BtnNext', 'Next Level →', 280, 48, new Color(255, 107, 181, 255), 0, -40, () => {
            this._game?.onNextLevel();
        }));
        panel.addChild(makeButton('BtnReplay', 'Replay', 280, 44, new Color(255, 255, 255, 255), 0, -100, () => {
            this._game?.onReplay();
        }, new Color(42, 32, 64, 255)));
        this.uiRoot.addChild(ov);
        this._win = ov;
        ov.active = false;
    }

    // ─── Ad overlay ───
    private _buildAd() {
        if (!this.uiRoot) return;
        const ov = makeOverlay('AdOverlay', this.designW, this.designH, new Color(40, 20, 60, 120));
        const panel = this._makePanel('AdPanel', 320, 280, new Color(42, 32, 64, 255));
        ov.addChild(panel);
        panel.addChild(makeLabel('AdEmoji', '📺', 40, Color.WHITE, 0, 90, 80).node);
        const title = makeLabel('AdTitle', 'Ad playing…', 24, Color.WHITE, 0, 40, 280);
        panel.addChild(title.node);
        this._adTitle = title.label;
        const cd = makeLabel('AdCount', '3', 48, new Color(255, 179, 71, 255), 0, -10, 120);
        panel.addChild(cd.node);
        this._adCount = cd.label;
        panel.addChild(makeLabel('AdSub', 'Rewarded video stub\n// TODO: wx.createRewardedVideoAd', 14, new Color(203, 184, 232, 255), 0, -80, 280).node);
        this.uiRoot.addChild(ov);
        this._ad = ov;
        ov.active = false;
    }

    showAdCountdown(seconds: number, title: string, onDone: () => void) {
        if (!this._ad) { onDone(); return; }
        this._ad.active = true;
        this._ad.setSiblingIndex(3000);
        if (this._adTitle) this._adTitle.string = title || 'Ad playing…';
        let n = Math.max(1, seconds | 0);
        if (this._adCount) this._adCount.string = String(n);
        const tick = () => {
            n -= 1;
            if (n <= 0) {
                if (this._ad) this._ad.active = false;
                onDone();
            } else {
                if (this._adCount) this._adCount.string = String(n);
                this.scheduleOnce(tick, 1);
            }
        };
        this.scheduleOnce(tick, 1);
    }

    hideAd() {
        if (this._ad) this._ad.active = false;
    }

    // ─── Level select ───
    private _buildLevels() {
        if (!this.uiRoot) return;
        const ov = makeOverlay('LevelsOverlay', this.designW, this.designH, new Color(40, 20, 60, 120));
        const panel = this._makePanel('LevelsPanel', 360, 620, Color.WHITE);
        ov.addChild(panel);
        panel.addChild(makeLabel('LvTitle', 'Levels', 28, new Color(42, 32, 64, 255), 0, 270, 200).node);
        panel.addChild(makeLabel('LvSub', 'Tap to jump (unlocked only)', 14, new Color(122, 111, 138, 255), 0, 240, 320).node);

        const grid = new Node('LevelGrid');
        ensureUt(grid, 320, 460);
        grid.setPosition(0, -10, 0);
        panel.addChild(grid);
        this._levelGrid = grid;

        panel.addChild(makeButton('BtnCloseLv', 'Close', 280, 44, new Color(255, 255, 255, 255), 0, -270, () => {
            this.hideLevels();
        }, new Color(42, 32, 64, 255)));

        this.uiRoot.addChild(ov);
        this._levels = ov;
        ov.active = false;
    }

    showLevels(highest: number, current: number) {
        if (!this._levels || !this._levelGrid) return;
        this._levelGrid.removeAllChildren();
        const cols = 5;
        const cell = 56;
        const gap = 8;
        const startX = -((cols - 1) * (cell + gap)) / 2;
        const startY = 200;
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            const col = (i - 1) % cols;
            const row = Math.floor((i - 1) / cols);
            const unlocked = i <= highest;
            const n = new Node('Lv' + i);
            ensureUt(n, cell, cell);
            n.setPosition(startX + col * (cell + gap), startY - row * (cell + gap), 0);
            this._levelGrid.addChild(n);
            let fill: Color;
            if (!unlocked) fill = new Color(230, 226, 236, 255);
            else if (i < highest) fill = new Color(62, 207, 142, 255);
            else fill = new Color(255, 107, 181, 255);
            n.addChild(makeColorNode('LvBg', fill, cell, cell));
            const lab = makeLabel('LvLab', unlocked ? String(i) : '🔒', unlocked ? 16 : 14,
                unlocked ? Color.WHITE : new Color(122, 111, 138, 255), 0, 0, cell);
            n.addChild(lab.node);
            if (unlocked) {
                const lv = i;
                const btn = n.addComponent(Button);
                btn.transition = Button.Transition.SCALE;
                btn.zoomScale = 0.94;
                n.on(Button.EventType.CLICK, () => {
                    this.hideLevels();
                    this._game?.loadLevel(lv);
                }, this);
            }
        }
        void current;
        this._levels.active = true;
        this._levels.setSiblingIndex(2500);
    }

    hideLevels() {
        if (this._levels) this._levels.active = false;
    }

    // ─── Toast / confetti ───
    private _buildToast() {
        if (!this.uiRoot) return;
        const t = new Node('Toast');
        ensureUt(t, 420, 44);
        t.setPosition(0, -this.designH / 2 + 120, 0);
        this.uiRoot.addChild(t);
        t.addChild(makeColorNode('ToastBg', new Color(42, 32, 64, 235), 420, 44));
        const op = t.addComponent(UIOpacity);
        op.opacity = 0;
        const lab = makeLabel('ToastLab', '', 16, Color.WHITE, 0, 0, 400);
        t.addChild(lab.node);
        this._toastLabel = lab.label;
        this._toast = t;
    }

    showToast(msg: string) {
        if (!this._toast || !this._toastLabel) return;
        this._toastLabel.string = msg;
        this._toast.setSiblingIndex(4000);
        const op = this._toast.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(op);
        op.opacity = 0;
        tween(op).to(0.2, { opacity: 255 }).delay(1.6).to(0.25, { opacity: 0 }).start();
    }

    private _buildConfetti() {
        if (!this.uiRoot) return;
        const n = new Node('Confetti');
        ensureUt(n, this.designW, this.designH);
        this.uiRoot.addChild(n);
        this._confetti = n;
    }

    spawnConfetti() {
        if (!this._confetti) return;
        this._confetti.removeAllChildren();
        const palette = [
            new Color(255, 92, 138, 255), new Color(91, 140, 255, 255),
            new Color(62, 207, 142, 255), new Color(255, 179, 71, 255),
            new Color(167, 139, 250, 255), Color.WHITE,
        ];
        for (let i = 0; i < 36; i++) {
            const pw = 6 + Math.random() * 6;
            const ph = 8 + Math.random() * 10;
            const x = (Math.random() - 0.5) * this.designW;
            const p = makeColorNode('C' + i, palette[i % palette.length], pw, ph, x, this.designH / 2 + 20);
            this._confetti.addChild(p);
            const dur = 1.4 + Math.random() * 1.4;
            tween(p)
                .delay(Math.random() * 0.35)
                .to(dur, { position: new Vec3(x + (Math.random() - 0.5) * 80, -this.designH / 2 - 40, 0), angle: 360 + Math.random() * 360 })
                .start();
        }
        this.scheduleOnce(() => {
            if (this._confetti) this._confetti.removeAllChildren();
        }, 3.2);
    }

    showCover() {
        if (this._cover) {
            this._cover.active = true;
            this._cover.setSiblingIndex(900);
        }
        this.setGameplayVisible(false);
        this.hideWin();
        this.hideAd();
        this.hideLevels();
    }

    hideCover() {
        if (this._cover) this._cover.active = false;
        this.setGameplayVisible(true);
    }

    setGameplayVisible(v: boolean) {
        if (this._hud) this._hud.active = v;
        if (this._toolbar) this._toolbar.active = v;
        if (this._footer) this._footer.active = v;
        if (this._hintBar) this._hintBar.node.active = v;
    }

    showWin(msg: string) {
        if (this._winMsg) this._winMsg.string = msg;
        if (this._win) {
            this._win.active = true;
            this._win.setSiblingIndex(2000);
        }
        this.spawnConfetti();
    }

    hideWin() {
        if (this._win) this._win.active = false;
    }

    setHint(text: string) {
        if (this._hintBar) this._hintBar.string = text || '';
    }

    updateHUD(level: number, moves: number, freeUndos: number, canUndo: boolean, bonusUsed: boolean) {
        if (this._levelLabel) this._levelLabel.string = `Lv ${level}`;
        if (this._movesLabel) this._movesLabel.string = `Moves ${moves}`;
        if (this._undoLabel) {
            this._undoLabel.string = freeUndos >= 99 ? '↩ Undo' : `↩ Undo (${freeUndos})`;
        }
        this._setBtnEnabled(this._btnUndo, canUndo);
        this._setBtnEnabled(this._btnAddTube, !bonusUsed);
    }

    private _setBtnEnabled(btn: Node | null, enabled: boolean) {
        if (!btn) return;
        const b = btn.getComponent(Button);
        if (b) b.interactable = enabled;
        const op = btn.getComponent(UIOpacity) || btn.addComponent(UIOpacity);
        op.opacity = enabled ? 255 : 120;
    }

    private _makePanel(name: string, w: number, h: number, fill: Color): Node {
        const panel = new Node(name);
        ensureUt(panel, w, h);
        panel.addChild(makeColorNode('PanelBg', fill, w, h));
        return panel;
    }
}
