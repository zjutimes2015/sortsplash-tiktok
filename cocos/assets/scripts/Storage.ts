/**
 * Persist best level / undos.
 * Browser preview → localStorage; WeChat → wx.setStorageSync / wx.getStorageSync.
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
    static load(): SaveData {
        try {
            const raw = WxAdapter.getStorageSync(STORAGE_KEY);
            if (!raw) return Object.assign({}, DEFAULT_SAVE);
            const parsed = JSON.parse(raw);
            return Object.assign({}, DEFAULT_SAVE, parsed);
        } catch (e) {
            return Object.assign({}, DEFAULT_SAVE);
        }
    }

    static save(data: SaveData): void {
        try {
            WxAdapter.setStorageSync(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            /* ignore quota / private mode */
        }
    }
}
