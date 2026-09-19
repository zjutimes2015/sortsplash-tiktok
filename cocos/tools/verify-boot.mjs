#!/usr/bin/env node
/**
 * Headless smoke: preview boot path for SortSplash.
 * Run from cocos/:  node tools/verify-boot.mjs
 *
 * Asserts:
 * - GameController is a child of Canvas (not a Scene sibling)
 * - Scene mounts only GameManager via compressUuid(meta.uuid, false)
 * - onLoad + start() boot; start rebuilds Play cover if missing
 * - no find(); Sprite/Label color fills (Graphics is not required)
 * - wechatgame export checklist still documented
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
}

/** Creator compressUuid(uuid, false) — 5 hex prefix + base64 of remaining hex. */
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function compressUuid(uuid) {
    const str = String(uuid).replace(/-/g, '').toLowerCase();
    assert(str.length === 32, `uuid hex length 32, got ${str.length}`);
    const head = str.slice(0, 5);
    const hex = str.slice(5);
    let out = head;
    for (let i = 0; i < hex.length; i += 3) {
        const n = parseInt(hex.substr(i, 3).padEnd(3, '0'), 16);
        out += BASE64[(n >> 6) & 63] + BASE64[n & 63];
    }
    return out;
}

function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

console.log('=== SortSplash boot / preview wiring ===');

const gm = read('assets/scripts/GameManager.ts');
const ui = read('assets/scripts/UIManager.ts');
const paint = read('assets/scripts/UiPaint.ts');
const scene = JSON.parse(read('assets/scenes/main.scene'));
const wechat = read('WECHAT.md');
const builder = JSON.parse(read('settings/v2/packages/builder.json'));
const project = JSON.parse(read('settings/v2/packages/project.json'));
const gmMeta = JSON.parse(read('assets/scripts/GameManager.ts.meta'));
const gmCode = stripComments(gm);

assert(!/\bfind\s*\(/.test(gmCode), 'GameManager.ts does not call find()');
assert(/boot\s*\(\s*phase/.test(gm), 'boot(phase, allowCreateCanvas) exists');
assert(/onLoad\s*\(\s*\)\s*\{[\s\S]*?this\.boot\(\s*'onLoad'\s*,\s*false\s*\)/.test(gm),
    'onLoad calls boot("onLoad", false) — will not create a nested Canvas');
assert(/start\s*\(\s*\)\s*\{/.test(gm), 'start() exists');
assert(/hasCover\s*\(\s*\)/.test(gm) && /boot\(\s*'start'\s*,\s*true\s*\)/.test(gm),
    'start() rebuilds via boot("start", true) if cover missing');
assert(/console\.error/.test(gm) && /console\.log/.test(gm), 'boot logs success and failure');
assert(/console\.error/.test(ui), 'UIManager logs buildAll failure');
assert(/Play cover/.test(gm) || /SUCCESS/.test(gm), 'boot success log mentions cover');

assert(/ensureHierarchy\s*\(/.test(gm), 'ensureHierarchy is used');
assert(/return\s*\{\s*canvas,\s*board,\s*ui\s*\}/.test(gm), 'ensureHierarchy returns canvas, board, ui');
assert(/setUIRoot\s*\(\s*ui\s*\)/.test(gm), 'boot sets uiRoot from ensureHierarchy ui');
assert(/setBoardRoot\s*\(\s*board\s*\)/.test(gm), 'boot sets boardRoot from ensureHierarchy board');
assert(/buildAll\s*\(\s*\)/.test(gm), 'boot calls buildAll()');
assert(/showCover\s*\(\s*\)/.test(gm), 'boot calls showCover()');
assert(/ensureComponents\s*\(/.test(gm), 'boot calls ensureComponents()');
assert(/parent\.name === 'Canvas'|named\(this\.node\.parent,\s*'Canvas'\)/.test(gm),
    'resolveCanvas uses parent name Canvas (GameController under Canvas)');
assert(/allowCreateCanvas/.test(gm), 'Canvas create is gated so onLoad cannot nest a duplicate');
assert(/reparent/.test(gm), 'runtime reparents GameController under Canvas if needed');
assert(/Layers\.Enum\.UI_2D|UI_2D/.test(gm), 'UI nodes use UI_2D');
assert(/ProjectionType\.ORTHO/.test(gm), 'Camera set to ORTHO');
assert(/cameraComponent\s*=\s*camera/.test(gm), 'Canvas.cameraComponent linked');
assert(/executionOrder/.test(gm) || /orderEarly/.test(gm), 'GameManager executionOrder so boot runs first');

assert(/uiRoot is null/.test(ui), 'buildAll logs if uiRoot is null instead of silent return');
assert(/hasCover\s*\(/.test(ui), 'UIManager.hasCover() for start() retry');
assert(/BtnPlay/.test(ui), 'cover builds BtnPlay');
assert(/makeColorNode|paintSolid/.test(ui), 'cover uses Sprite/Label color nodes');
const uiCcImport = ui.match(/import \{[\s\S]*?\} from 'cc'/);
assert(uiCcImport && !/\bGraphics\b/.test(uiCcImport[0]), 'UIManager does not import Graphics from cc');

assert(/paintSolid/.test(paint), 'UiPaint.paintSolid exists');
assert(/█/.test(paint), 'Label block tiles (█) cover real UITransform size');
assert(/SpriteFrame/.test(paint) && /Texture2D/.test(paint), 'Sprite baked-color texture fill');
assert(/useSystemFont/.test(paint), 'Labels request system font (3.8)');
assert(/KaiTi/.test(paint) || /KaiTi/.test(read('assets/scripts/Copy.ts')),
    'Labels prefer KaiTi / STKaiti / 楷体 / DFKai-SB (WeChat may fall back)');
assert(/enableWrapText/.test(paint), 'block Labels enable wrap for █ tiles');
assert(/Overflow\.CLAMP/.test(paint) && /Overflow\.NONE/.test(paint), 'Labels use CLAMP/NONE, not SHRINK-to-zero');
assert(/stretchToParent/.test(paint) && /isAlignLeft/.test(paint), 'Widget stretchToParent helper');
assert(/logNodeRect/.test(paint), 'logNodeRect for BtnPlay world position / contentSize');
assert(/makePlayButton/.test(paint) && /PLAY_BTN_W\s*=\s*320/.test(paint) && /PLAY_BTN_H\s*=\s*88/.test(paint),
    'Play button is 320×88 (min 280×72)');
assert(/255,\s*45,\s*149/.test(paint), 'Play fill is bright pink');
assert(/FillGfx/.test(paint) && /FillSpr/.test(paint) && /FillBlk/.test(paint),
    'fills use Graphics + Sprite + █ children (not Sprite on the sized node)');
assert(/SizeMode\.CUSTOM/.test(paint), 'Sprite sizeMode CUSTOM');
{
    const customAt = paint.indexOf('sp.sizeMode = Sprite.SizeMode.CUSTOM');
    const frameAt = paint.indexOf('sp.spriteFrame = sf');
    const resizeAt = paint.indexOf('ensureUt(node, w, h)');
    assert(customAt >= 0 && frameAt >= 0 && customAt < frameAt,
        'sizeMode CUSTOM is set before spriteFrame so TRIMMED cannot reset UT to 2×2');
    assert(resizeAt >= 0 && frameAt < paint.lastIndexOf('ensureUt(node, w, h)'),
        'contentSize is re-applied after assigning spriteFrame');
}

assert(/makePlayButton/.test(ui) && /stretchToParent\(cover\)/.test(ui),
    'cover uses makePlayButton + Widget-aligned Cover');
assert(/stretchToParent\(this\.uiRoot\)/.test(ui) || /stretchToParent\(bg\)/.test(ui),
    'UIRoot/CoverBg Widget-aligned full screen');
assert(/logNodeRect\(\s*'BtnPlay'/.test(ui), 'buildCover logs BtnPlay rect');
assert(/TAP TO START/.test(ui) || /Copy\.tapToStart/.test(ui) || /点击开始/.test(ui),
    'cover has high-contrast TAP TO START / 点击开始 label');
assert(/颜色分拣/.test(ui) || /Copy\.title/.test(ui), 'Cover title uses ZH copy');

assert(/stretchToParent\(\s*ui\s*\)/.test(gm), 'UIRoot Widget-aligned to Canvas');
assert(/stretchToParent\(\s*canvas\s*\)/.test(gm), 'Canvas Widget-aligned for wx 720×1280');

const objects = Array.isArray(scene) ? scene : [];
const sceneNode = objects.find((o) => o && o.__type__ === 'cc.Scene');
const canvasNode = objects.find((o) => o && o.__type__ === 'cc.Node' && o._name === 'Canvas');
const gameController = objects.find((o) => o && o.__type__ === 'cc.Node' && o._name === 'GameController');
assert(!!sceneNode && !!canvasNode && !!gameController, 'scene has Scene, Canvas, GameController');

const canvasId = objects.indexOf(canvasNode);
const gcId = objects.indexOf(gameController);
assert(Array.isArray(sceneNode._children) && sceneNode._children.length === 1,
    `Scene has exactly 1 child (Canvas), got ${(sceneNode._children || []).length}`);
assert(sceneNode._children[0].__id__ === canvasId, 'Scene child 0 is Canvas');
assert(gameController._parent && gameController._parent.__id__ === canvasId,
    `GameController parent is Canvas (id ${canvasId}), got ${JSON.stringify(gameController._parent)}`);
assert((canvasNode._children || []).some((c) => c.__id__ === gcId),
    'Canvas children include GameController');

const gcCompIds = (gameController._components || []).map((c) => c.__id__);
assert(gcCompIds.length === 2, `GameController has 2 components (UITransform + GameManager), got ${gcCompIds.length}`);
const gcComps = gcCompIds.map((id) => objects[id]);
const types = gcComps.map((c) => c && c.__type__);
assert(types.includes('cc.UITransform'), 'GameController keeps cc.UITransform');
const ut = gcComps.find((c) => c && c.__type__ === 'cc.UITransform');
assert(ut && ut._contentSize && ut._contentSize.width <= 1 && ut._contentSize.height <= 1,
    'GameController UITransform is 1×1 so it does not steal Play clicks');

const scriptTypes = types.filter((t) => t && t !== 'cc.UITransform');
assert(scriptTypes.length === 1, 'GameController has exactly one custom script');
const cid = scriptTypes[0];
assert(/^[0-9a-zA-Z+/]{22,23}$/.test(cid) && !cid.includes('-'),
    `GameManager CID is compressed (no UUID hyphens): ${cid}`);

const expectedCid = compressUuid(gmMeta.uuid);
assert(cid === expectedCid,
    `scene CID ${cid} must equal compressUuid(GameManager.ts.meta uuid) ${expectedCid}`);
assert(String(gmMeta.uuid).replace(/-/g, '').startsWith('087c06'),
    'GameManager.ts.meta UUID still matches expected prefix');

const extraScripts = objects.filter((o) => o && typeof o.__type__ === 'string'
    && !String(o.__type__).startsWith('cc.'));
assert(extraScripts.length === 1, `scene custom scripts should be GameManager only, got ${extraScripts.length}`);

const cameraNode = objects.find((o) => o && o.__type__ === 'cc.Node' && o._name === 'Camera');
assert(cameraNode && cameraNode._layer === 33554432, 'Camera node layer is UI_2D (33554432)');
const cameraComp = objects.find((o) => o && o.__type__ === 'cc.Camera');
assert(cameraComp && cameraComp._projection === 0, 'Camera projection ORTHO (0)');
assert(cameraComp && cameraComp._visibility === 33554432, 'Camera visibility UI_2D');
assert(cameraComp && cameraComp._orthoHeight === 640, 'Camera orthoHeight 640');
const canvasComp = objects.find((o) => o && o.__type__ === 'cc.Canvas');
assert(canvasComp && canvasComp._cameraComponent && canvasComp._cameraComponent.__id__ != null,
    'Canvas.cameraComponent linked in scene');

const design = project.general && project.general.designResolution;
assert(design && design.width === 720 && design.height === 1280, 'project designResolution 720×1280');
assert(builder.__version__, 'builder.json present');

assert(/wechatgame/.test(wechat), 'WECHAT.md mentions wechatgame');
assert(/720\s*[×x]\s*1280/i.test(wechat), 'WECHAT.md mentions 720×1280');
assert(/touristappid|AppID/.test(wechat), 'WECHAT.md has AppID placeholder');
assert(/build\/wechatgame/.test(wechat), 'WECHAT.md output build/wechatgame');
assert(/微信开发者工具/.test(wechat), 'WECHAT.md mentions 微信开发者工具');
assert(/Portrait|竖屏/.test(wechat), 'WECHAT.md portrait orientation');
assert(/main\.scene/.test(wechat), 'WECHAT.md start scene main');
assert(/GameController/.test(wechat) && /Canvas/.test(wechat), 'WECHAT.md documents GameController under Canvas');
assert(/verify-boot/.test(wechat), 'WECHAT.md documents boot smoke test');
assert(/▶|Play/.test(wechat), 'WECHAT.md preview path mentions Play cover');
assert(/compileType/.test(wechat) && /urlCheck/.test(wechat), 'WECHAT.md documents compileType + urlCheck');
assert(/SortSplash-WeChat/.test(wechat) || /重新导入/.test(wechat), 'WECHAT.md has re-import / SortSplash-WeChat path');
assert(/physics-ammo|物理/.test(wechat), 'WECHAT.md notes physics trim for simulator');
assert(/first-screen|首屏/.test(wechat), 'WECHAT.md notes first-screen / splash');

const wxAdapter = read('assets/scripts/WxAdapter.ts');
const storageSrc = read('assets/scripts/Storage.ts');
const adSrc = read('assets/scripts/AdBridge.ts');
assert(!/\btypeof\s+localStorage\b/.test(stripComments(wxAdapter)), 'WxAdapter never uses typeof localStorage');
assert(!/\btypeof\s+localStorage\b/.test(stripComments(storageSrc)), 'Storage never uses typeof localStorage');
assert(/hasApi\s*\(/.test(wxAdapter) && /isWeChat\s*\(/.test(wxAdapter), 'WxAdapter.hasApi + isWeChat');
assert(/installWxLocalStoragePolyfill/.test(wxAdapter), 'WxAdapter installs a wx localStorage polyfill');
assert(/Storage\.defaults\s*\(/.test(gm), 'GameManager uses Storage.defaults() so constructor does not Storage.load()');
assert(/this\.save\s*=\s*Storage\.load\s*\(/.test(gm), 'boot() calls Storage.load() after construction');
assert(/WxAdapter\.hasApi\s*\(\s*'createRewardedVideoAd'/.test(adSrc), 'AdBridge gates rewarded ads with hasApi');
assert(/asPromise/.test(adSrc), 'AdBridge treats wx show() as optional Promise');

const engine = JSON.parse(read('settings/v2/packages/engine.json'));
const include = engine.modules.configs.defaultConfig.includeModules;
assert(Array.isArray(include) && include.includes('ui') && include.includes('2d'), 'engine keeps 2d + ui');
assert(!include.includes('physics-ammo'), 'engine includeModules drops physics-ammo');
assert(!include.includes('physics-2d-box2d'), 'engine includeModules drops physics-2d-box2d');
assert(!include.includes('webview'), 'engine includeModules drops webview');
assert(!include.includes('video'), 'engine includeModules drops video');
assert(!include.includes('3d'), 'engine includeModules drops unused 3d');

const tmpl = JSON.parse(read('build-templates/wechatgame/project.config.json'));
assert(tmpl.compileType === 'game', 'build-templates project.config.json compileType is game');
assert(tmpl.setting && tmpl.setting.urlCheck === false, 'build-templates urlCheck false for dev');
assert(builder['splash-setting'] && builder['splash-setting'].totalTime === 0, 'splash totalTime 0');
assert(builder['splash-setting'].logo && builder['splash-setting'].logo.type === 'none', 'splash logo none');

assert(fs.existsSync(path.join(root, '..', 'index.html')), 'root HTML prototype kept');
assert(fs.existsSync(path.join(root, 'assets/scripts/UiPaint.ts')), 'UiPaint helper present');
assert(fs.existsSync(path.join(root, 'assets/scripts/UiPaint.ts.meta')), 'UiPaint.ts.meta present');

console.log('CID', cid, '==', expectedCid);
console.log('GameController parent = Canvas; onLoad+start boot without find()');
console.log('ALL PASS');
