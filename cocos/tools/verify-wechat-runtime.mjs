#!/usr/bin/env node
/**
 * Runtime smoke: WxAdapter must not throw when:
 *   - wx exists (WeChat mini game / DevTools mg lib)
 *   - window.localStorage getter throws (real wx behavior)
 *   - wx storage APIs are missing
 *
 * Storage.ts is asserted at source level (it only wraps WxAdapter).
 * Run from cocos/:  node tools/verify-wechat-runtime.mjs
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const adapter = path.join(root, 'assets/scripts/WxAdapter.ts');
const storage = path.join(root, 'assets/scripts/Storage.ts');

function assert(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
}

function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function runCase(name, setup, body) {
    const code = `
${setup}
const { WxAdapter, installWxLocalStoragePolyfill } = await import(${JSON.stringify(adapter)});
installWxLocalStoragePolyfill();
${body}
console.log('CASE PASS:', ${JSON.stringify(name)});
`;
    const r = spawnSync(process.execPath, [
        '--experimental-strip-types',
        '--no-warnings',
        '--input-type=module',
        '-e',
        code,
    ], { encoding: 'utf8', cwd: root });
    if (r.status !== 0) {
        console.error('FAIL case', name);
        if (r.stdout) process.stdout.write(r.stdout);
        if (r.stderr) process.stderr.write(r.stderr);
        process.exit(r.status === null ? 1 : r.status);
    }
    if (r.stdout) process.stdout.write(r.stdout);
}

console.log('=== SortSplash WeChat storage / wx runtime ===');

const wxSrc = fs.readFileSync(adapter, 'utf8');
const stSrc = fs.readFileSync(storage, 'utf8');
assert(!/\btypeof\s+localStorage\b/.test(stripComments(wxSrc)), 'WxAdapter must not use typeof localStorage (throws under wx)');
assert(!/\btypeof\s+localStorage\b/.test(stripComments(stSrc)), 'Storage must not use typeof localStorage');
assert(/isWeChat\s*\(/.test(wxSrc) && /hasApi\s*\(/.test(wxSrc), 'WxAdapter.isWeChat / hasApi');
assert(/browserStorage\s*\(/.test(wxSrc), 'WxAdapter.browserStorage for preview only');
assert(/installWxLocalStoragePolyfill/.test(wxSrc), 'localStorage polyfill installer exists');
assert(/defaults\s*\(/.test(stSrc), 'Storage.defaults() for boot before load');
assert(/WxAdapter\.getStorageSync/.test(stSrc) && /WxAdapter\.setStorageSync/.test(stSrc),
    'Storage load/save go through WxAdapter');
assert(/try\s*\{/.test(stSrc), 'Storage.load/save are try/caught');

const throwingLs = `
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('window.localStorage is not available in WeChat mini game'); },
});
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
});
`;

runCase('wx + throwing localStorage', `
${throwingLs}
const store = Object.create(null);
globalThis.wx = {
    getStorageSync(key) { return store[key]; },
    setStorageSync(key, value) { store[key] = value; },
};
`, `
if (WxAdapter.isWeChat() !== true) throw new Error('isWeChat should be true');
if (WxAdapter.getStorageSync('sortsplash_v1') !== null) throw new Error('empty store should be null');
WxAdapter.setStorageSync('sortsplash_v1', JSON.stringify({ highest: 7, totalPours: 3, freeUndos: 2 }));
const raw = WxAdapter.getStorageSync('sortsplash_v1');
const parsed = JSON.parse(raw);
if (parsed.highest !== 7 || parsed.freeUndos !== 2) throw new Error('roundtrip failed');
WxAdapter.shareAppMessage({ title: 'hi' });
`);

runCase('wx present but storage APIs missing', `
${throwingLs}
globalThis.wx = { shareAppMessage() {} };
`, `
if (WxAdapter.getStorageSync('k') !== null) throw new Error('missing getStorageSync should be null');
WxAdapter.setStorageSync('k', 'v');
WxAdapter.shareAppMessage({ title: 'x' });
if (!WxAdapter.hasApi('shareAppMessage')) throw new Error('shareAppMessage should be detected');
if (WxAdapter.hasApi('getStorageSync')) throw new Error('getStorageSync should be missing');
`);

runCase('no wx + throwing localStorage (should not throw)', `
${throwingLs}
delete globalThis.wx;
`, `
if (WxAdapter.isWeChat()) throw new Error('isWeChat should be false');
if (WxAdapter.getStorageSync('k') !== null) throw new Error('defaults/null expected');
WxAdapter.setStorageSync('k', 'v');
WxAdapter.shareAppMessage({ title: 'x' });
`);

console.log('ALL PASS');
