/**
 * All HUD / overlays built in code (Graphics + Label + Button + Widget).
 * English-first UI matching the HTML prototype.
 */
import {
    _decorator, Component, Node, UITransform, Graphics, Label, Color,
    Button, Widget, BlockInputEvents, UIOpacity, tween, Tween, Vec3, Layers,
} from 'cc';
import { TOTAL_LEVELS } from './LevelManager';
import type { GameManager } from './GameManager';

const { ccclass } = _decorator;

/** Creator 3.8: prefer system font so Labels render without a bundled TTF. */
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
    }

    buildAll() {
        if (!this.uiRoot) {
            console.error('[UIManager] buildAll skipped: uiRoot is null');
            return;
        }
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
    }

    // ─── Soft pastel background ───
    private _buildBackground() {
        if (!this.uiRoot) return;
        const canvas = this.uiRoot.parent;
        let bg = canvas?.getChildByName('BgRoot');
        if (!bg && canvas) {
            bg = new Node('BgRoot');
            bg.layer = Layers.Enum.UI_2D;
            const ut = bg.addComponent(UITransform);
            ut.setContentSize(this.designW, this.designH);
            const w = bg.addComponent(Widget);
            w.isAlignTop = w.isAlignBottom = w.isAlignLeft = w.isAlignRight = true;
            w.top = w.bottom = w.left = w.right = 0;
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
            const n = new Node(`Grad_${i}`);
            n.layer = Layers.Enum.UI_2D;
            n.addComponent(UITransform).setContentSize(this.designW + 40, L.h);
            n.setPosition(0, L.y, 0);
            const g = n.addComponent(Graphics);
            g.fillColor = L.color;
            g.rect(-(this.designW + 40) / 2, -L.h / 2, this.designW + 40, L.h);
            g.fill();
            g.fillColor = new Color(L.color.r, L.color.g, L.color.b, 80);
            g.circle(-220 + i * 70, 80, 140 + i * 16);
            g.fill();
            g.circle(240 - i * 50, -60, 110 + i * 12);
            g.fill();
            bg.addChild(n);
        }
    }

    // ─── Top HUD ───
    private _buildHUD() {
        if (!this.uiRoot) return;
        const hud = new Node('HUD');
        hud.layer = Layers.Enum.UI_2D;
        hud.addComponent(UITransform).setContentSize(this.designW - 32, 72);
        hud.setPosition(0, this.designH / 2 - 56, 0);

        const brand = this._makeLabel('Brand', 'SortSplash', 28, new Color(255, 107, 181, 255), -200, 10, 280);
        hud.addChild(brand.node);
        const tag = this._makeLabel('Tag', 'Sort colors. One more pour.', 14, new Color(122, 111, 138, 255), -200, -16, 280);
        hud.addChild(tag.node);

        const lv = this._makePill('LvPill', 'Lv 1', 200, 8);
        this._levelLabel = lv.label;
        hud.addChild(lv.node);

        const mv = this._makePill('MvPill', 'Moves 0', 310, 8);
        this._movesLabel = mv.label;
        hud.addChild(mv.node);

        this.uiRoot.addChild(hud);
        this._hud = hud;
    }

    private _makePill(name: string, text: string, x: number, y: number) {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(110, 36);
        n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(255, 255, 255, 230);
        g.roundRect(-55, -18, 110, 36, 18);
        g.fill();
        const lab = n.addComponent(Label);
        lab.string = text;
        lab.fontSize = 16;
        lab.lineHeight = 36;
        lab.horizontalAlign = Label.HorizontalAlign.CENTER;
        lab.verticalAlign = Label.VerticalAlign.CENTER;
        lab.color = new Color(42, 32, 64, 255);
        applySystemFont(lab);
        return { node: n, label: lab };
    }

    // ─── Toolbar ───
    private _buildToolbar() {
        if (!this.uiRoot) return;
        const bar = new Node('Toolbar');
        bar.layer = Layers.Enum.UI_2D;
        bar.addComponent(UITransform).setContentSize(this.designW - 24, 110);
        bar.setPosition(0, this.designH / 2 - 150, 0);

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
            const btn = this._makeButton(s.name, s.text, 150, 44, bg, s.x, s.y, s.fn, tc);
            bar.addChild(btn);
            if (s.name === 'BtnUndo') {
                this._btnUndo = btn;
                this._undoLabel = btn.getComponent(Label);
            }
            if (s.name === 'BtnTube') this._btnAddTube = btn;
        }

        this.uiRoot.addChild(bar);
        this._toolbar = bar;
    }

    private _buildHintBar() {
        if (!this.uiRoot) return;
        const n = this._makeLabel('HintBar', '', 16, new Color(122, 111, 138, 255), 0, this.designH / 2 - 220, 680);
        this.uiRoot.addChild(n.node);
        this._hintBar = n.label;
    }

    private _buildFooter() {
        if (!this.uiRoot) return;
        const foot = new Node('Footer');
        foot.layer = Layers.Enum.UI_2D;
        foot.addComponent(UITransform).setContentSize(this.designW - 40, 56);
        foot.setPosition(0, -this.designH / 2 + 48, 0);
        const share = this._makeButton('BtnShare', '📤 Share', 160, 48, new Color(255, 255, 255, 230), -100, 0, () => {
            this._game?.onShare();
        }, new Color(42, 32, 64, 255));
        const levels = this._makeButton('BtnLevels', '📚 Levels', 160, 48, new Color(255, 255, 255, 230), 100, 0, () => {
            this._game?.onOpenLevels();
        }, new Color(42, 32, 64, 255));
        foot.addChild(share);
        foot.addChild(levels);
        this.uiRoot.addChild(foot);
        this._footer = foot;
    }

    // ─── Start cover ───
    private _buildCover() {
        if (!this.uiRoot) return;
        const cover = new Node('Cover');
        cover.layer = Layers.Enum.UI_2D;
        cover.addComponent(UITransform).setContentSize(this.designW, this.designH);
        cover.addComponent(BlockInputEvents);
        const g = cover.addComponent(Graphics);
        g.fillColor = new Color(255, 245, 251, 255);
        g.rect(-this.designW / 2, -this.designH / 2, this.designW, this.designH);
        g.fill();
        g.fillColor = new Color(232, 244, 255, 180);
        g.circle(-80, 200, 220);
        g.fill();
        g.fillColor = new Color(240, 255, 232, 160);
        g.circle(140, -80, 180);
        g.fill();

        const emoji = this._makeLabel('Emoji', '🧪✨', 48, Color.WHITE, 0, 220, 200);
        cover.addChild(emoji.node);
        const logo = this._makeLabel('Logo', 'SortSplash', 44, new Color(255, 107, 181, 255), 0, 150, 500);
        cover.addChild(logo.node);
        const tag = this._makeLabel('Tagline', 'Sort colors. One more pour.', 20, new Color(122, 111, 138, 255), 0, 100, 500);
        cover.addChild(tag.node);

        // mini tubes
        const demo = new Node('DemoTubes');
        demo.layer = Layers.Enum.UI_2D;
        demo.addComponent(UITransform).setContentSize(200, 110);
        demo.setPosition(0, 10, 0);
        const demoColors = [
            [new Color(255, 107, 157, 255), new Color(124, 156, 255, 255), new Color(255, 107, 157, 255), new Color(62, 207, 142, 255)],
            [new Color(124, 156, 255, 255), new Color(62, 207, 142, 255), new Color(255, 179, 71, 255), new Color(124, 156, 255, 255)],
            [],
        ];
        for (let t = 0; t < 3; t++) {
            const tube = new Node('Mini' + t);
            tube.layer = Layers.Enum.UI_2D;
            tube.addComponent(UITransform).setContentSize(40, 100);
            tube.setPosition(-54 + t * 54, 0, 0);
            const tg = tube.addComponent(Graphics);
            tg.fillColor = new Color(255, 255, 255, 140);
            tg.roundRect(-20, -50, 40, 100, 12);
            tg.fill();
            tg.strokeColor = new Color(90, 70, 120, 60);
            tg.lineWidth = 2;
            tg.roundRect(-20, -50, 40, 100, 12);
            tg.stroke();
            const layers = demoColors[t];
            const lh = 25;
            for (let L = 0; L < layers.length; L++) {
                tg.fillColor = layers[L];
                tg.rect(-17, -47 + L * lh, 34, lh);
                tg.fill();
            }
            demo.addChild(tube);
        }
        cover.addChild(demo);

        const play = this._makeButton('BtnPlay', '▶  Play', 220, 56, new Color(255, 107, 181, 255), 0, -140, () => {
            this._game?.onStartPressed();
        });
        cover.addChild(play);
        const tip = this._makeLabel('Tip', 'Tap a tube, then another to pour 💧', 16, new Color(122, 111, 138, 255), 0, -210, 560);
        cover.addChild(tip.node);

        this.uiRoot.addChild(cover);
        this._cover = cover;
    }

    // ─── Win overlay ───
    private _buildWin() {
        if (!this.uiRoot) return;
        const ov = this._makeOverlay('WinOverlay');
        const panel = this._makePanel('WinPanel', 340, 320);
        ov.addChild(panel);
        panel.addChild(this._makeLabel('WinEmoji', '🎉✨', 40, Color.WHITE, 0, 110, 120).node);
        panel.addChild(this._makeLabel('WinTitle', 'Level Cleared!', 28, new Color(42, 32, 64, 255), 0, 60, 300).node);
        const msg = this._makeLabel('WinMsg', 'Nice pouring!', 16, new Color(122, 111, 138, 255), 0, 22, 300);
        panel.addChild(msg.node);
        this._winMsg = msg.label;
        panel.addChild(this._makeButton('BtnNext', 'Next Level →', 280, 48, new Color(255, 107, 181, 255), 0, -40, () => {
            this._game?.onNextLevel();
        }));
        panel.addChild(this._makeButton('BtnReplay', 'Replay', 280, 44, new Color(255, 255, 255, 255), 0, -100, () => {
            this._game?.onReplay();
        }, new Color(42, 32, 64, 255), new Color(200, 190, 210, 255)));
        this.uiRoot.addChild(ov);
        this._win = ov;
        ov.active = false;
    }

    // ─── Ad overlay ───
    private _buildAd() {
        if (!this.uiRoot) return;
        const ov = this._makeOverlay('AdOverlay');
        const panel = this._makePanel('AdPanel', 320, 280, new Color(42, 32, 64, 255));
        ov.addChild(panel);
        panel.addChild(this._makeLabel('AdEmoji', '📺', 40, Color.WHITE, 0, 90, 80).node);
        const title = this._makeLabel('AdTitle', 'Ad playing…', 24, Color.WHITE, 0, 40, 280);
        panel.addChild(title.node);
        this._adTitle = title.label;
        const cd = this._makeLabel('AdCount', '3', 48, new Color(255, 179, 71, 255), 0, -10, 120);
        panel.addChild(cd.node);
        this._adCount = cd.label;
        panel.addChild(this._makeLabel('AdSub', 'Rewarded video stub\n// TODO: wx.createRewardedVideoAd', 14, new Color(203, 184, 232, 255), 0, -80, 280).node);
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
        const ov = this._makeOverlay('LevelsOverlay');
        const panel = this._makePanel('LevelsPanel', 360, 620);
        ov.addChild(panel);
        panel.addChild(this._makeLabel('LvTitle', 'Levels', 28, new Color(42, 32, 64, 255), 0, 270, 200).node);
        panel.addChild(this._makeLabel('LvSub', 'Tap to jump (unlocked only)', 14, new Color(122, 111, 138, 255), 0, 240, 320).node);

        const grid = new Node('LevelGrid');
        grid.layer = Layers.Enum.UI_2D;
        grid.addComponent(UITransform).setContentSize(320, 460);
        grid.setPosition(0, -10, 0);
        panel.addChild(grid);
        this._levelGrid = grid;

        panel.addChild(this._makeButton('BtnCloseLv', 'Close', 280, 44, new Color(255, 255, 255, 255), 0, -270, () => {
            this.hideLevels();
        }, new Color(42, 32, 64, 255), new Color(200, 190, 210, 255)));

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
            n.layer = Layers.Enum.UI_2D;
            n.addComponent(UITransform).setContentSize(cell, cell);
            n.setPosition(startX + col * (cell + gap), startY - row * (cell + gap), 0);
            const g = n.addComponent(Graphics);
            if (!unlocked) g.fillColor = new Color(230, 226, 236, 255);
            else if (i < highest) g.fillColor = new Color(62, 207, 142, 255);
            else g.fillColor = new Color(255, 107, 181, 255);
            g.roundRect(-cell / 2, -cell / 2, cell, cell, 10);
            g.fill();
            const lab = n.addComponent(Label);
            lab.string = unlocked ? String(i) : '🔒';
            lab.fontSize = unlocked ? 16 : 14;
            lab.lineHeight = cell;
            lab.horizontalAlign = Label.HorizontalAlign.CENTER;
            lab.verticalAlign = Label.VerticalAlign.CENTER;
            lab.color = unlocked ? Color.WHITE : new Color(122, 111, 138, 255);
            applySystemFont(lab);
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
            this._levelGrid.addChild(n);
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
        t.layer = Layers.Enum.UI_2D;
        t.addComponent(UITransform).setContentSize(420, 44);
        t.setPosition(0, -this.designH / 2 + 120, 0);
        const g = t.addComponent(Graphics);
        g.fillColor = new Color(42, 32, 64, 235);
        g.roundRect(-210, -22, 420, 44, 12);
        g.fill();
        const op = t.addComponent(UIOpacity);
        op.opacity = 0;
        const lab = this._makeLabel('ToastLab', '', 16, Color.WHITE, 0, 0, 400);
        t.addChild(lab.node);
        this._toastLabel = lab.label;
        this.uiRoot.addChild(t);
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
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(this.designW, this.designH);
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
            const p = new Node('C' + i);
            p.layer = Layers.Enum.UI_2D;
            const pw = 6 + Math.random() * 6;
            const ph = 8 + Math.random() * 10;
            p.addComponent(UITransform).setContentSize(pw, ph);
            const x = (Math.random() - 0.5) * this.designW;
            p.setPosition(x, this.designH / 2 + 20, 0);
            const g = p.addComponent(Graphics);
            g.fillColor = palette[i % palette.length];
            g.roundRect(-pw / 2, -ph / 2, pw, ph, 2);
            g.fill();
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

    // ─── Visibility / HUD updates ───
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

    // ─── helpers ───
    private _makeOverlay(name: string): Node {
        const ov = new Node(name);
        ov.layer = Layers.Enum.UI_2D;
        ov.addComponent(UITransform).setContentSize(this.designW, this.designH);
        ov.addComponent(BlockInputEvents);
        const g = ov.addComponent(Graphics);
        g.fillColor = new Color(40, 20, 60, 120);
        g.rect(-this.designW / 2, -this.designH / 2, this.designW, this.designH);
        g.fill();
        return ov;
    }

    private _makePanel(name: string, w: number, h: number, fill?: Color): Node {
        const panel = new Node(name);
        panel.layer = Layers.Enum.UI_2D;
        panel.addComponent(UITransform).setContentSize(w, h);
        const g = panel.addComponent(Graphics);
        g.fillColor = fill || Color.WHITE;
        g.roundRect(-w / 2, -h / 2, w, h, 24);
        g.fill();
        return panel;
    }

    private _makeLabel(name: string, text: string, size: number, color: Color, x: number, y: number, width = 400) {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(width, size + 14);
        n.setPosition(x, y, 0);
        const lab = n.addComponent(Label);
        lab.string = text;
        lab.fontSize = size;
        lab.lineHeight = size + 8;
        lab.horizontalAlign = Label.HorizontalAlign.CENTER;
        lab.verticalAlign = Label.VerticalAlign.CENTER;
        lab.color = color;
        lab.overflow = Label.Overflow.SHRINK;
        applySystemFont(lab);
        return { node: n, label: lab };
    }

    private _makeButton(
        name: string, text: string, w: number, h: number,
        bgColor: Color, x: number, y: number, onClick: () => void,
        textColor?: Color, borderColor?: Color,
    ): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(w, h);
        n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = bgColor;
        g.roundRect(-w / 2, -h / 2, w, h, 14);
        g.fill();
        if (borderColor) {
            g.strokeColor = borderColor;
            g.lineWidth = 2;
            g.roundRect(-w / 2, -h / 2, w, h, 14);
            g.stroke();
        }
        const lab = n.addComponent(Label);
        lab.string = text;
        lab.fontSize = Math.min(20, Math.floor(h * 0.42));
        lab.lineHeight = h;
        lab.horizontalAlign = Label.HorizontalAlign.CENTER;
        lab.verticalAlign = Label.VerticalAlign.CENTER;
        lab.color = textColor || Color.WHITE;
        lab.overflow = Label.Overflow.SHRINK;
        applySystemFont(lab);
        const btn = n.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        btn.zoomScale = 0.94;
        n.on(Button.EventType.CLICK, onClick, this);
        return n;
    }
}
