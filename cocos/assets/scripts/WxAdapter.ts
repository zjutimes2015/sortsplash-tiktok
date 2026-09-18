/**
 * WeChat Mini Game adapter.
 * Browser preview uses localStorage; WeChat uses wx.* behind `typeof wx !== 'undefined'`.
 *
 * TODO: fill AppID in Creator build settings + WECHAT.md checklist.
 */

// WeChat injects `wx` at runtime. This ambient declaration does not emit JS.
declare const wx: any;

export class WxAdapter {
    static isWeChat(): boolean {
        return typeof wx !== 'undefined';
    }

    static getStorageSync(key: string): string | null {
        try {
            if (typeof wx !== 'undefined') {
                const v = wx.getStorageSync(key);
                if (v === undefined || v === null || v === '') return null;
                return typeof v === 'string' ? v : JSON.stringify(v);
            }
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
        } catch (e) {
            console.warn('[WxAdapter] getStorageSync failed', e);
        }
        return null;
    }

    static setStorageSync(key: string, value: string): void {
        try {
            if (typeof wx !== 'undefined') {
                wx.setStorageSync(key, value);
                return;
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('[WxAdapter] setStorageSync failed', e);
        }
    }

    /**
     * Share challenge text. WeChat uses shareAppMessage; browser copies to clipboard.
     */
    static shareAppMessage(opts: { title: string; imageUrl?: string }): void {
        if (typeof wx !== 'undefined' && wx.shareAppMessage) {
            try {
                wx.shareAppMessage({
                    title: opts.title,
                    imageUrl: opts.imageUrl || '',
                });
                return;
            } catch (e) {
                console.warn('[WxAdapter] shareAppMessage failed', e);
            }
        }
        try {
            const nav = typeof navigator !== 'undefined' ? navigator : null;
            if (nav && nav.clipboard && nav.clipboard.writeText) {
                nav.clipboard.writeText(opts.title);
            }
        } catch {
            /* ignore */
        }
    }
}
