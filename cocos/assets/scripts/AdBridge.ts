/**
 * WeChat rewarded / interstitial ads.
 * Real API shape with TODO placeholders; falls back to a simulated countdown overlay.
 *
 * Replace adUnitId values in AD_UNITS (see README / WECHAT.md).
 */
import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

declare const wx: any;

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
        if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
            this._showWxRewarded(placement, onSuccess, fail);
            return;
        }
        this._simulateCountdown(3, 'Ad playing…', onSuccess);
    }

    /**
     * Optional interstitial between levels. Never blocks progress on failure.
     */
    showInterstitial(onDone: () => void) {
        // TODO: wx.createInterstitialAd — replace AD_UNITS.interstitial
        if (typeof wx !== 'undefined' && wx.createInterstitialAd) {
            try {
                if (!this._interstitial) {
                    this._interstitial = wx.createInterstitialAd({
                        adUnitId: AD_UNITS.interstitial,
                    });
                    this._interstitial.onError((err: any) => {
                        console.warn('[AdBridge] interstitial error', err);
                    });
                    this._interstitial.onClose(() => {
                        const done = this._pendingSuccess;
                        this._pendingSuccess = null;
                        this._busy = false;
                        if (done) done();
                    });
                }
                this._pendingSuccess = onDone;
                this._interstitial.show().catch((err: any) => {
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
                this._rewarded = wx.createRewardedVideoAd({ adUnitId });
                this._rewarded.onLoad(() => {
                    console.log('[AdBridge] rewarded onLoad');
                });
                this._rewarded.onError((err: any) => {
                    console.warn('[AdBridge] rewarded onError — fallback countdown', err);
                    const ok = this._pendingSuccess;
                    this._pendingSuccess = null;
                    this._pendingFail = null;
                    this._busy = false;
                    if (ok) this._simulateCountdown(3, 'Ad playing…', ok);
                });
            }
            if (!this._wxCloseBound) {
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
            this._pendingSuccess = onSuccess;
            this._pendingFail = onFail;
            this._busy = true;
            this._rewarded.show().catch(() => {
                this._rewarded.load()
                    .then(() => this._rewarded.show())
                    .catch((err: any) => {
                        console.warn('[AdBridge] rewarded show/load failed — fallback', err);
                        this._busy = false;
                        this._simulateCountdown(3, 'Ad playing…', onSuccess);
                    });
            });
        } catch (e) {
            console.warn('[AdBridge] createRewardedVideoAd failed — fallback', e);
            this._busy = false;
            this._simulateCountdown(3, 'Ad playing…', onSuccess);
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
