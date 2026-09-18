/**
 * Solid-color UI fills that do not depend on Graphics.
 *
 * Creator 3.8 preview often draws ~0 Graphics meshes (especially if fill() runs
 * before the node is in a Canvas). Sprite (1×1 white texture) + Label "█" blocks
 * still render under Canvas + UI_2D, so the Play cover is visible even when
 * Graphics is a no-op.
 *
 * Rule: one UIRenderer per node. Color fill lives on its own node; text Labels
 * are always children, never siblings of Graphics/Sprite on the same node.
 */
import {
    Node, UITransform, Sprite, SpriteFrame, Texture2D, Label, Color,
    Layers, Button, BlockInputEvents,
} from 'cc';

export const UI_2D = (Layers && Layers.Enum && Layers.Enum.UI_2D) || (1 << 25);

let _whiteFrame: SpriteFrame | null = null;
let _spriteOk: boolean | null = null;

export function applySystemFont(lab: Label) {
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

export function markUi(n: Node) {
    n.layer = UI_2D;
}

export function ensureUt(n: Node, w: number, h: number): UITransform {
    markUi(n);
    const ut = n.getComponent(UITransform) || n.addComponent(UITransform);
    ut.setContentSize(w, h);
    return ut;
}

function whiteSpriteFrame(): SpriteFrame | null {
    if (_spriteOk === false) return null;
    if (_whiteFrame) return _whiteFrame;
    try {
        const tex = new Texture2D();
        const data = new Uint8Array(16).fill(255);
        if (typeof (tex as Texture2D & { reset?: Function }).reset === 'function') {
            (tex as Texture2D & { reset: Function }).reset({
                width: 2,
                height: 2,
                format: Texture2D.PixelFormat.RGBA8888,
            });
        }
        if (typeof (tex as Texture2D & { uploadData?: Function }).uploadData === 'function') {
            (tex as Texture2D & { uploadData: Function }).uploadData(data);
        } else {
            _spriteOk = false;
            return null;
        }
        const sf = new SpriteFrame();
        sf.texture = tex;
        _whiteFrame = sf;
        _spriteOk = true;
        return sf;
    } catch (err) {
        console.warn('[UiPaint] 1x1 SpriteFrame failed, using Label block', err);
        _spriteOk = false;
        return null;
    }
}

/**
 * Paint an opaque (or alpha) rectangle onto `node`. Prefers Sprite; falls back
 * to a system-font "█" Label. Does not add Graphics (unreliable in preview).
 */
export function paintSolid(node: Node, color: Color, w: number, h: number) {
    ensureUt(node, w, h);
    const sf = whiteSpriteFrame();
    if (sf) {
        try {
            const sp = node.getComponent(Sprite) || node.addComponent(Sprite);
            sp.spriteFrame = sf;
            if ('sizeMode' in sp) sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.color = color;
            if ('type' in sp) sp.type = Sprite.Type.SIMPLE;
            return;
        } catch (err) {
            console.warn('[UiPaint] Sprite paint failed', err);
        }
    }
    const lab = node.getComponent(Label) || node.addComponent(Label);
    lab.string = '█';
    lab.fontSize = Math.max(32, Math.floor(Math.max(w, h) * 0.92));
    lab.lineHeight = lab.fontSize;
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    lab.color = color;
    lab.overflow = Label.Overflow.CLAMP;
    applySystemFont(lab);
}

export function makeLabel(
    name: string, text: string, size: number, color: Color,
    x: number, y: number, width = 400,
): { node: Node; label: Label } {
    const n = new Node(name);
    ensureUt(n, width, size + 16);
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
    paintSolid(n, bgColor, w, h);
    const labN = makeLabel('BtnLab', text, Math.min(22, Math.floor(h * 0.42)), textColor || Color.WHITE, 0, 0, w - 8);
    n.addChild(labN.node);
    const btn = n.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.94;
    n.on(Button.EventType.CLICK, onClick, n);
    // Preview hit-test sometimes targets the Label child; TOUCH_END bubbles to this node.
    n.on(Node.EventType.TOUCH_END, (e: any) => {
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
