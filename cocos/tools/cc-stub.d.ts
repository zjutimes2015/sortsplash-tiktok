/**
 * Minimal `cc` stubs so editor-side `tsc` can typecheck scripts without Creator.
 * Not used at runtime — Creator injects the real engine.
 */
declare module 'cc' {
    export const _decorator: {
        ccclass: (name?: string) => ClassDecorator;
        property: (...args: any[]) => PropertyDecorator;
    };

    export class Vec3 {
        x: number; y: number; z: number;
        constructor(x?: number, y?: number, z?: number);
        clone(): Vec3;
        static ZERO: Vec3;
    }
    export class Color {
        r: number; g: number; b: number; a: number;
        constructor(r?: number, g?: number, b?: number, a?: number);
        static WHITE: Color;
        static BLACK: Color;
    }
    export class UITransform extends Component {
        setContentSize(w: number, h: number): void;
        contentSize: { width: number; height: number };
    }
    export class Widget extends Component {
        isAlignTop: boolean; isAlignBottom: boolean; isAlignLeft: boolean; isAlignRight: boolean;
        top: number; bottom: number; left: number; right: number;
        alignMode: number;
        static AlignMode: { ALWAYS: number; ONCE: number; ON_WINDOW_RESIZE: number };
    }
    export class Canvas extends Component {
        cameraComponent: Camera | null;
        alignCanvasWithScreen: boolean;
    }
    export class Camera extends Component {
        projection: number;
        orthoHeight: number;
        near: number;
        far: number;
        clearFlags: number;
        clearColor: Color;
        visibility: number;
        priority: number;
        static ProjectionType: { ORTHO: number; PERSPECTIVE: number };
        static ClearFlag: { SOLID_COLOR: number; DEPTH_ONLY: number; DONT_CLEAR: number };
    }
    export class Graphics extends Component {
        fillColor: Color;
        strokeColor: Color;
        lineWidth: number;
        clear(): void;
        fill(): void;
        stroke(): void;
        rect(x: number, y: number, w: number, h: number): void;
        roundRect(x: number, y: number, w: number, h: number, r: number): void;
        circle(x: number, y: number, r: number): void;
    }
    export class Label extends Component {
        string: string;
        fontSize: number;
        lineHeight: number;
        color: Color;
        horizontalAlign: number;
        verticalAlign: number;
        overflow: number;
        node: Node;
        static HorizontalAlign: { LEFT: number; CENTER: number; RIGHT: number };
        static VerticalAlign: { TOP: number; CENTER: number; BOTTOM: number };
        static Overflow: { NONE: number; CLAMP: number; SHRINK: number; RESIZE_HEIGHT: number };
    }
    export class Button extends Component {
        transition: number;
        zoomScale: number;
        interactable: boolean;
        static Transition: { NONE: number; COLOR: number; SCALE: number; SPRITE: number };
        static EventType: { CLICK: string };
    }
    export class BlockInputEvents extends Component {}
    export class UIOpacity extends Component { opacity: number; }
    export class Component {
        node: Node;
        enabled: boolean;
        scheduleOnce(cb: () => void, delay?: number): void;
        schedule(cb: () => void, interval?: number): void;
        unschedule(cb: () => void): void;
        getComponent(t: any): any;
        addComponent(t: any): any;
    }
    export class Node {
        name: string;
        layer: number;
        active: boolean;
        parent: Node | null;
        position: Vec3;
        scene: Node | null;
        angle: number;
        constructor(name?: string);
        addChild(n: Node): void;
        insertChild(n: Node, idx: number): void;
        removeAllChildren(): void;
        getChildByName(name: string): Node | null;
        setPosition(x: number, y: number, z?: number): void;
        setSiblingIndex(i: number): void;
        getComponent(t: any): any;
        addComponent(t: any): any;
        on(type: string, cb: (...args: any[]) => void, target?: any): void;
        static EventType: { TOUCH_END: string; TOUCH_START: string };
    }
    export const Layers: { Enum: { UI_2D: number; DEFAULT: number } };
    export const director: { getScene(): Node | null };
    export const view: {
        setDesignResolutionSize(w: number, h: number, policy: number): void;
    };
    export const ResolutionPolicy: { SHOW_ALL: number; FIXED_WIDTH: number; FIXED_HEIGHT: number };
    export function find(path: string): Node | null;
    export function tween<T>(target: T): Tween<T>;
    export class Tween<T> {
        to(d: number, props: any): Tween<T>;
        delay(d: number): Tween<T>;
        start(): Tween<T>;
        static stopAllByTarget(t: any): void;
    }
}
