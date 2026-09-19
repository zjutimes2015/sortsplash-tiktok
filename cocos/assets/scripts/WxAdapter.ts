/**
 * WeChat Mini Game adapter.
 *
 * WeChat (`wx` exists, including DevTools mg lib 3.17.2):
 *   - NEVER read the `localStorage` identifier or `window.localStorage`.
 *     Those getters throw in the mini-game runtime and abort boot inside
 *     WAGame.js (black simulator).
 *   - Every `wx.*` call is optional + try/catch so a missing API cannot
 *     take down GameManager.boot().
 *
 * Creator browser preview:
 *   - localStorage is reached only via a try/caught property lookup on
 *     globalThis, never a bare `localStorage` identifier.
 */
declare const wx: any;
declare const GameGlobal: any;

function readGlobal(name: string): any {
    try {
        const g = (typeof globalThis !== 'undefined' ? globalThis : undefined)
            || (typeof window !== 'undefined' ? (window as any) : undefined);
        if (!g) return undefined;
        return g[name];
    } catch {
        return undefined;
    }
}

export class WxAdapter {
    static isWeChat(): boolean {
        try {
            return typeof wx !== 'undefined' && !!wx;
        } catch {
            return false;
        }
    }

    static hasApi(name: string): boolean {
        try {
            if (!WxAdapter.isWeChat()) return false;
            return typeof wx[name] === 'function';
        } catch {
            return false;
        }
    }

    /** Call `wx[name](...args)` if present. Never throws. */
    static call<T = any>(name: string, ...args: any[]): T | undefined {
        try {
            if (!WxAdapter.hasApi(name)) return undefined;
            return wx[name](...args) as T;
        } catch (e) {
            console.warn(`[WxAdapter] wx.${name} failed`, e);
            return undefined;
        }
    }

    static getStorageSync(key: string): string | null {
        try {
            if (WxAdapter.isWeChat()) {
                if (!WxAdapter.hasApi('getStorageSync')) return null;
                const v = wx.getStorageSync(key);
                if (v === undefined || v === null || v === '') return null;
                return typeof v === 'string' ? v : JSON.stringify(v);
            }
            const ls = WxAdapter.browserStorage();
            return ls ? ls.getItem(key) : null;
        } catch (e) {
            console.warn('[WxAdapter] getStorageSync failed', e);
            return null;
        }
    }

    static setStorageSync(key: string, value: string): void {
        try {
            if (WxAdapter.isWeChat()) {
                WxAdapter.call('setStorageSync', key, value);
                return;
            }
            const ls = WxAdapter.browserStorage();
            if (ls) ls.setItem(key, value);
        } catch (e) {
            console.warn('[WxAdapter] setStorageSync failed', e);
        }
    }

    /**
     * Share challenge text. WeChat uses shareAppMessage; browser copies to clipboard.
     */
    static shareAppMessage(opts: { title: string; imageUrl?: string }): void {
        if (WxAdapter.hasApi('shareAppMessage')) {
            WxAdapter.call('shareAppMessage', {
                title: opts.title,
                imageUrl: opts.imageUrl || '',
            });
            return;
        }
        try {
            const nav = readGlobal('navigator');
            if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
                nav.clipboard.writeText(opts.title);
            }
        } catch {
            /* ignore */
        }
    }

    /**
     * Browser-only Storage. Must never run when wx exists.
     * Property lookup on globalThis — not the `localStorage` identifier —
     * because a bare localStorage identifier can throw in WeChat (window getter).
     */
    static browserStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } | null {
        if (WxAdapter.isWeChat()) return null;
        try {
            const g = readGlobal('localStorage');
            if (g && typeof g.getItem === 'function' && typeof g.setItem === 'function') {
                return g;
            }
        } catch {
            return null;
        }
        return null;
    }
}

/**
 * Map GameGlobal.localStorage → wx storage so leftover engine / third-party
 * code cannot throw on the WeChat getter. Safe to call more than once.
 */
export function installWxLocalStoragePolyfill(): void {
    try {
        if (!WxAdapter.isWeChat()) return;

        const poly = {
            getItem(k: string) {
                return WxAdapter.getStorageSync(k);
            },
            setItem(k: string, v: string) {
                WxAdapter.setStorageSync(k, String(v));
            },
            removeItem(k: string) {
                WxAdapter.call('removeStorageSync', k);
            },
            clear() {
                WxAdapter.call('clearStorageSync');
            },
            key() {
                return null;
            },
            get length() {
                return 0;
            },
        };

        const assign = (host: any) => {
            if (!host || typeof host !== 'object') return;
            try {
                host.localStorage = poly;
            } catch {
                try {
                    Object.defineProperty(host, 'localStorage', {
                        configurable: true,
                        enumerable: false,
                        writable: true,
                        value: poly,
                    });
                } catch {
                    /* getter-only host — ignore */
                }
            }
        };

        assign(typeof globalThis !== 'undefined' ? globalThis : null);
        try {
            if (typeof GameGlobal !== 'undefined') assign(GameGlobal);
        } catch {
            /* no GameGlobal */
        }
        try {
            assign(readGlobal('window'));
        } catch {
            /* no window */
        }
    } catch (e) {
        console.warn('[WxAdapter] localStorage polyfill skipped', e);
    }
}

installWxLocalStoragePolyfill();
