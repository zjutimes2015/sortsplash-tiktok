/**
 * WeChat rewarded / interstitial ads.
 * Real API shape with TODO placeholders; falls back to a simulated countdown overlay.
 *
 * Missing or partial wx ad APIs (touristappid / DevTools / no 流量主) must
 * never throw during boot or play — show() may return undefined, not a Promise.
 *
 * Replace adUnitId values in AD_UNITS (see README / WECHAT.md).
 */
import { _decorator, Component } from 'cc';
import { WxAdapter } from './WxAdapter';
import { Copy } from './Copy';

const { ccclass } = _decorator;

/** Placeholder ad unit IDs — replace with WeChat 流量主 IDs before shipping. */
export const AD_UNITS = {
    /** Shared rewarded video for +1 Tube / Undo Pack / Hint */
    rewarded: 'adunit-YOUR_REWARDED_VIDEO_ID',
    rewardedTube: 'adunit-YOUR_REWARDED_VIDEO_ID',
    rewardedUndoPack: 'adunit-YOUR_REWARDED_VIDEO_ID',
    rewardedHint: 'adunit-YOUR_REWARDED_VIDEO_ID',
    /** Optional interstitial between levels */
    interstitial: 'adunit-YOUR_INTERSTITIAL_ID',
};

export type RewardedPlacement = 'tube' | 'undo' | 'hint';

function asPromise(ret: any): Promise<any> {
    if (ret && typeof ret.then === 'function') return ret;
    return Promise.resolve(ret);
}

@ccclass('AdBridge')
export class AdBridge extends Component {
    private _overlay: ((seconds: number, title: string, onDone: () => void) => void) | null = null;
    private _rewarded: any = null;
    private _interstitial: any = null;
    private _busy = false;
    private _pendingSuccess: (() => void) | null = null;
    private _pendingFail: (() => void) | null = null;
    private _wxCloseBound = false;

    setOverlay(fn: (seconds: number, title: string, onDone: () => void) => void) {
        this._overlay = fn;
    }

    private _unitFor(placement: RewardedPlacement): string {
        if (placement === 'tube') return AD_UNITS.rewardedTube || AD_UNITS.rewarded;
        if (placement === 'undo') return AD_UNITS.rewardedUndoPack || AD_UNITS.rewarded;
        return AD_UNITS.rewardedHint || AD_UNITS.rewarded;
    }

    /**
     * Show a rewarded video. On WeChat uses wx.createRewardedVideoAd;
     * in Creator browser preview uses a 3s "Ad playing…" overlay.
     */
    showRewarded(placement: RewardedPlacement, onSuccess: () => void, onFail?: () => void) {
        if (this._busy) return;
        const fail = onFail || (() => { /* no-op */ });

        // TODO: wx.createRewardedVideoAd — replace AD_UNITS.rewarded* with real 广告位 ID
        if (WxAdapter.hasApi('createRewardedVideoAd')) {
            this._showWxRewarded(placement, onSuccess, fail);
            return;
        }
        this._simulateCountdown(3, Copy.adPlaying, onSuccess);
    }

    /**
     * Optional interstitial between levels. Never blocks progress on failure.
     */
    showInterstitial(onDone: () => void) {
        // TODO: wx.createInterstitialAd — replace AD_UNITS.interstitial
        if (WxAdapter.hasApi('createInterstitialAd')) {
            try {
                if (!this._interstitial) {
                    this._interstitial = WxAdapter.call('createInterstitialAd', {
                        adUnitId: AD_UNITS.interstitial,
                    });
                    if (!this._interstitial) {
                        onDone();
                        return;
                    }
                    if (typeof this._interstitial.onError === 'function') {
                        this._interstitial.onError((err: any) => {
                            console.warn('[AdBridge] interstitial error', err);
                        });
                    }
                    if (typeof this._interstitial.onClose === 'function') {
                        this._interstitial.onClose(() => {
                            const done = this._pendingSuccess;
                            this._pendingSuccess = null;
                            this._busy = false;
                            if (done) done();
                        });
                    }
                }
                if (!this._interstitial || typeof this._interstitial.show !== 'function') {
                    onDone();
                    return;
                }
                this._pendingSuccess = onDone;
                asPromise(this._interstitial.show()).catch((err: any) => {
                    this._pendingSuccess = null;
                    this._busy = false;
                    console.warn('[AdBridge] interstitial show failed, skip', err);
                    onDone();
                });
                return;
            } catch (e) {
                console.warn('[AdBridge] interstitial stub', e);
            }
        }
        onDone();
    }

    private _showWxRewarded(placement: RewardedPlacement, onSuccess: () => void, onFail: () => void) {
        const adUnitId = this._unitFor(placement);
        try {
            if (!this._rewarded) {
                this._rewarded = WxAdapter.call('createRewardedVideoAd', { adUnitId });
                if (!this._rewarded) {
                    this._simulateCountdown(3, Copy.adPlaying, onSuccess);
                    return;
                }
                if (typeof this._rewarded.onLoad === 'function') {
                    this._rewarded.onLoad(() => {
                        console.log('[AdBridge] rewarded onLoad');
                    });
                }
                if (typeof this._rewarded.onError === 'function') {
                    this._rewarded.onError((err: any) => {
                        console.warn('[AdBridge] rewarded onError — fallback countdown', err);
                        const ok = this._pendingSuccess;
                        this._pendingSuccess = null;
                        this._pendingFail = null;
                        this._busy = false;
                        if (ok) this._simulateCountdown(3, Copy.adPlaying, ok);
                    });
                }
            }
            if (!this._wxCloseBound && this._rewarded && typeof this._rewarded.onClose === 'function') {
                this._wxCloseBound = true;
                this._rewarded.onClose((res: any) => {
                    const ok = this._pendingSuccess;
                    const fail = this._pendingFail;
                    this._pendingSuccess = null;
                    this._pendingFail = null;
                    this._busy = false;
                    if (res && res.isEnded) {
                        if (ok) ok();
                    } else if (fail) {
                        fail();
                    }
                });
            }
            if (!this._rewarded || typeof this._rewarded.show !== 'function') {
                this._simulateCountdown(3, Copy.adPlaying, onSuccess);
                return;
            }
            this._pendingSuccess = onSuccess;
            this._pendingFail = onFail;
            this._busy = true;
            asPromise(this._rewarded.show()).catch(() => {
                const reload = this._rewarded && typeof this._rewarded.load === 'function'
                    ? asPromise(this._rewarded.load())
                    : Promise.reject(new Error('no load'));
                reload
                    .then(() => asPromise(this._rewarded.show()))
                    .catch((err: any) => {
                        console.warn('[AdBridge] rewarded show/load failed — fallback', err);
                        this._busy = false;
                        this._simulateCountdown(3, Copy.adPlaying, onSuccess);
                    });
            });
        } catch (e) {
            console.warn('[AdBridge] createRewardedVideoAd failed — fallback', e);
            this._busy = false;
            this._simulateCountdown(3, Copy.adPlaying, onSuccess);
        }
    }

    private _simulateCountdown(seconds: number, title: string, onDone: () => void) {
        this._busy = true;
        const finish = () => {
            this._busy = false;
            onDone();
        };
        if (this._overlay) {
            this._overlay(seconds, title, finish);
            return;
        }
        // No UI wired — still delay so callers don't get an instant reward
        this.scheduleOnce(finish, seconds);
    }
}
