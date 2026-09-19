/**
 * Solid-color UI fills that stay visible on WeChat (mg / Windows simulator).
 *
 * Do not rely on a 1×1 / 2×2 white Sprite + tint + scale: WeChat often keeps
 * Sprite.SizeMode.TRIMMED (contentSize collapses to the texture) and may ignore
 * color tint. Every fill therefore:
 *   - sets a real UITransform (design pixels, not 1×1)
 *   - paints Graphics (works on wx even when Creator preview skips it)
 *   - paints a Sprite whose pixels are the fill color (CUSTOM size, re-set UT)
 *   - paints system-font "█" tiles that cover the rect without scaling a glyph
 *
 * Rule: one UIRenderer per node. Fills live on child nodes; text Labels are
 * always children, never siblings of Graphics/Sprite on the same node.
 */
import {
    Node, UITransform, Sprite, SpriteFrame, Texture2D, Label, Color,
    Layers, Button, BlockInputEvents, Widget, Graphics,
} from 'cc';
import { FONT_FAMILY, Copy } from './Copy';

export const UI_2D = (Layers && Layers.Enum && Layers.Enum.UI_2D) || (1 << 25);

/** Design-px Play control — large enough to read on the WeChat simulator. */
export const PLAY_BTN_W = 320;
export const PLAY_BTN_H = 88;

const _frameCache: Record<string, SpriteFrame> = {};
let _spriteOk: boolean | null = null;

export function applySystemFont(lab: Label) {
    const anyLab = lab as Label & {
        useSystemFont?: boolean;
        fontFamily?: string;
        cacheMode?: number;
        font?: unknown;
        enableWrapText?: boolean;
    };
    if ('useSystemFont' in anyLab) anyLab.useSystemFont = true;
    if ('fontFamily' in anyLab) anyLab.fontFamily = FONT_FAMILY;
    if ('font' in anyLab) anyLab.font = null;
    const modes = (Label as typeof Label & { CacheMode?: { NONE: number } }).CacheMode;
    if (modes && 'cacheMode' in anyLab) anyLab.cacheMode = modes.NONE;
}

export function markUi(n: Node) {
    n.layer = UI_2D;
}

export function ensureUt(n: Node, w: number, h: number): UITransform {
    markUi(n);
    const ut = n.getComponent(UITransform) || n.addComponent(UITransform);
    ut.setContentSize(w, h);
    return ut;
}

/** Stretch a node to its parent on all four sides (720×1280 Canvas on wx). */
export function stretchToParent(n: Node): Widget {
    const w = n.getComponent(Widget) || n.addComponent(Widget);
    w.isAlignTop = w.isAlignBottom = w.isAlignLeft = w.isAlignRight = true;
    w.top = w.bottom = w.left = w.right = 0;
    if (Widget.AlignMode) w.alignMode = Widget.AlignMode.ALWAYS;
    const anyW = w as Widget & { updateAlignment?: () => void };
    if (typeof anyW.updateAlignment === 'function') anyW.updateAlignment();
    return w;
}

export function logNodeRect(tag: string, n: Node | null) {
    if (!n) {
        console.warn(`[UI] ${tag} is null`);
        return;
    }
    const ut = n.getComponent(UITransform);
    const cs = ut && ut.contentSize;
    const p = n.position;
    const anyN = n as Node & { worldPosition?: { x: number; y: number; z: number } };
    const wp = anyN.worldPosition;
    const wx = wp ? wp.x : p.x;
    const wy = wp ? wp.y : p.y;
    const wz = wp ? wp.z : 0;
    console.log(
        `[UI] ${tag} name=${n.name} active=${n.active}`
        + ` parent=${n.parent ? n.parent.name : 'null'}`
        + ` local=(${p.x},${p.y}) world=(${wx},${wy},${wz})`
        + ` contentSize=${cs ? `${cs.width}x${cs.height}` : 'n/a'}`
        + ` layer=${n.layer}`,
    );
}

function texDims(w: number, h: number) {
    const tw = Math.max(16, Math.min(Math.round(w) || 16, 512));
    const th = Math.max(16, Math.min(Math.round(h) || 16, 512));
    return { tw, th };
}

/** SpriteFrame with the fill color baked into pixels (not white + tint). */
function colorSpriteFrame(color: Color, w: number, h: number): SpriteFrame | null {
    if (_spriteOk === false) return null;
    const { tw, th } = texDims(w, h);
    const key = `${color.r},${color.g},${color.b},${color.a},${tw},${th}`;
    if (_frameCache[key]) return _frameCache[key];
    try {
        const tex = new Texture2D();
        const data = new Uint8Array(tw * th * 4);
        const a = color.a == null ? 255 : color.a;
        for (let i = 0; i < tw * th; i++) {
            const o = i * 4;
            data[o] = color.r;
            data[o + 1] = color.g;
            data[o + 2] = color.b;
            data[o + 3] = a;
        }
        const anyTex = tex as Texture2D & {
            reset?: Function;
            uploadData?: Function;
            setWrapMode?: Function;
        };
        if (typeof anyTex.reset === 'function') {
            anyTex.reset({
                width: tw,
                height: th,
                format: Texture2D.PixelFormat.RGBA8888,
            });
        }
        if (typeof anyTex.uploadData === 'function') {
            anyTex.uploadData(data);
        } else {
            _spriteOk = false;
            return null;
        }
        const wrap = (Texture2D as typeof Texture2D & {
            WrapMode?: { CLAMP_TO_EDGE: number };
        }).WrapMode;
        if (wrap && typeof anyTex.setWrapMode === 'function') {
            anyTex.setWrapMode(wrap.CLAMP_TO_EDGE, wrap.CLAMP_TO_EDGE);
        }
        const sf = new SpriteFrame();
        sf.texture = tex;
        if ('packable' in sf) (sf as SpriteFrame & { packable: boolean }).packable = false;
        _frameCache[key] = sf;
        _spriteOk = true;
        return sf;
    } catch (err) {
        console.warn('[UiPaint] color SpriteFrame failed, using Label/Graphics', err);
        _spriteOk = false;
        return null;
    }
}

function applyGfxFill(node: Node, color: Color, w: number, h: number) {
    try {
        const g = node.getComponent(Graphics) || node.addComponent(Graphics);
        if (typeof g.clear === 'function') g.clear();
        g.fillColor = color;
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();
    } catch (err) {
        console.warn('[UiPaint] Graphics fill skipped', err);
    }
}

function applySpriteFill(node: Node, color: Color, w: number, h: number) {
    const sf = colorSpriteFrame(color, w, h);
    if (!sf) return;
    try {
        const sp = node.getComponent(Sprite) || node.addComponent(Sprite);
        // CUSTOM *before* spriteFrame — TRIMMED (default) would reset UT to tex size.
        if ('sizeMode' in sp) sp.sizeMode = Sprite.SizeMode.CUSTOM;
        if ('type' in sp) sp.type = Sprite.Type.SIMPLE;
        if ('trim' in sp) (sp as Sprite & { trim: boolean }).trim = false;
        if ('packable' in sp) (sp as Sprite & { packable: boolean }).packable = false;
        sp.spriteFrame = sf;
        sp.color = Color.WHITE;
        ensureUt(node, w, h);
    } catch (err) {
        console.warn('[UiPaint] Sprite paint failed', err);
    }
}

/**
 * Tile system-font block glyphs across the real UITransform.
 * fontSize is capped so WeChat does not drop a 600px atlas.
 */
function applyBlockFill(node: Node, color: Color, w: number, h: number) {
    const cell = w >= 280 && h >= 72 ? 40 : 24;
    const cols = Math.max(1, Math.ceil(w / cell));
    const rows = Math.max(1, Math.ceil(h / cell));
    const line = '█'.repeat(cols);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(line);
    const lab = node.getComponent(Label) || node.addComponent(Label);
    lab.string = lines.join('\n');
    lab.fontSize = cell;
    lab.lineHeight = cell;
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    lab.color = color;
    lab.overflow = Label.Overflow.CLAMP;
    applySystemFont(lab);
    const anyLab = lab as Label & { enableWrapText?: boolean };
    if ('enableWrapText' in anyLab) anyLab.enableWrapText = true;
    ensureUt(node, w, h);
}

/**
 * Paint an opaque (or alpha) rectangle onto `node` via child renderers.
 * Never attaches Sprite to `node` itself (TRIMMED would collapse its size).
 */
export function paintSolid(node: Node, color: Color, w: number, h: number) {
    ensureUt(node, w, h);

    let gfx = node.getChildByName('FillGfx');
    if (!gfx) {
        gfx = new Node('FillGfx');
        node.addChild(gfx);
    }
    ensureUt(gfx, w, h);
    applyGfxFill(gfx, color, w, h);

    let spr = node.getChildByName('FillSpr');
    if (!spr) {
        spr = new Node('FillSpr');
        node.addChild(spr);
    }
    ensureUt(spr, w, h);
    applySpriteFill(spr, color, w, h);

    let blk = node.getChildByName('FillBlk');
    if (!blk) {
        blk = new Node('FillBlk');
        node.addChild(blk);
    }
    ensureUt(blk, w, h);
    applyBlockFill(blk, color, w, h);
}

export function makeLabel(
    name: string, text: string, size: number, color: Color,
    x: number, y: number, width = 400,
): { node: Node; label: Label } {
    const n = new Node(name);
    ensureUt(n, width, Math.max(size + 16, 28));
    n.setPosition(x, y, 0);
    const lab = n.addComponent(Label);
    lab.string = text;
    lab.fontSize = size;
    lab.lineHeight = size + 8;
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    lab.color = color;
    // CLAMP, not SHRINK: a 1–2px UT on WeChat would shrink text to 0.
    lab.overflow = Label.Overflow.CLAMP;
    applySystemFont(lab);
    const anyLab = lab as Label & { enableWrapText?: boolean };
    if ('enableWrapText' in anyLab) anyLab.enableWrapText = false;
    return { node: n, label: lab };
}

export function makeColorNode(name: string, color: Color, w: number, h: number, x = 0, y = 0): Node {
    const n = new Node(name);
    n.setPosition(x, y, 0);
    paintSolid(n, color, w, h);
    return n;
}

export function makeButton(
    name: string, text: string, w: number, h: number,
    bgColor: Color, x: number, y: number, onClick: () => void,
    textColor?: Color,
): Node {
    const n = new Node(name);
    ensureUt(n, w, h);
    n.setPosition(x, y, 0);
    n.addChild(makeColorNode('BtnFill', bgColor, w, h));
    const fontSize = Math.max(18, Math.min(28, Math.floor(h * 0.42)));
    const labN = makeLabel('BtnLab', text, fontSize, textColor || Color.WHITE, 0, 0, w - 8);
    labN.label.overflow = Label.Overflow.NONE;
    n.addChild(labN.node);
    const btn = n.addComponent(Button);
    btn.transition = Button.Transition.NONE;
    n.on(Button.EventType.CLICK, onClick, n);
    n.on(Node.EventType.TOUCH_END, (e: { propagationStopped?: boolean }) => {
        if (e && e.propagationStopped !== undefined) e.propagationStopped = true;
        onClick();
    }, n);
    return n;
}

/** Huge high-contrast Play control for the WeChat simulator. */
export function makePlayButton(onClick: () => void): Node {
    const w = PLAY_BTN_W;
    const h = PLAY_BTN_H;
    const n = new Node('BtnPlay');
    ensureUt(n, w, h);
    n.setPosition(0, -96, 0);

    n.addChild(makeColorNode('PlayHalo', new Color(32, 6, 48, 255), w + 20, h + 20));
    n.addChild(makeColorNode('PlayFill', new Color(255, 45, 149, 255), w, h));

    const shadow = makeLabel('PlayShadow', Copy.play, 40, new Color(20, 0, 32, 255), 3, -3, w - 12);
    shadow.label.overflow = Label.Overflow.NONE;
    n.addChild(shadow.node);

    const lab = makeLabel('BtnLab', Copy.play, 40, Color.WHITE, 0, 0, w - 12);
    lab.label.overflow = Label.Overflow.NONE;
    n.addChild(lab.node);

    const btn = n.addComponent(Button);
    btn.transition = Button.Transition.NONE;
    n.on(Button.EventType.CLICK, onClick, n);
    n.on(Node.EventType.TOUCH_END, (e: { propagationStopped?: boolean }) => {
        if (e && e.propagationStopped !== undefined) e.propagationStopped = true;
        onClick();
    }, n);
    return n;
}

export function makeOverlay(name: string, w: number, h: number, fill: Color): Node {
    const ov = new Node(name);
    ensureUt(ov, w, h);
    ov.addComponent(BlockInputEvents);
    const bg = makeColorNode('OvBg', fill, w, h);
    ov.addChild(bg);
    return ov;
}
