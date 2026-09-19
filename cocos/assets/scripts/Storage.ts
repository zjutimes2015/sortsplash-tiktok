/**
 * Persist best level / undos.
 * Browser preview → localStorage (via WxAdapter.browserStorage);
 * WeChat → wx.setStorageSync / wx.getStorageSync.
 *
 * load()/save() never throw — missing wx APIs or a throwing
 * window.localStorage getter must not abort GameManager.boot().
 */
import { WxAdapter } from './WxAdapter';

export const STORAGE_KEY = 'sortsplash_v1';

export interface SaveData {
    highest: number;
    totalPours: number;
    freeUndos: number;
}

const DEFAULT_SAVE: SaveData = {
    highest: 1,
    totalPours: 0,
    freeUndos: 3,
};

export class Storage {
    static defaults(): SaveData {
        return Object.assign({}, DEFAULT_SAVE);
    }

    static load(): SaveData {
        try {
            const raw = WxAdapter.getStorageSync(STORAGE_KEY);
            if (!raw) return Storage.defaults();
            const parsed = JSON.parse(raw);
            return Object.assign({}, DEFAULT_SAVE, parsed);
        } catch (e) {
            console.warn('[Storage] load failed — defaults', e);
            return Storage.defaults();
        }
    }

    static save(data: SaveData): void {
        try {
            WxAdapter.setStorageSync(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Storage] save failed', e);
        }
    }
}
