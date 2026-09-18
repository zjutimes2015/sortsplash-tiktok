#!/usr/bin/env node
/**
 * Headless smoke: GameManager.onLoad must wire UIRoot/BoardRoot from
 * ensureHierarchy() return values (not find()), then always call buildAll + showCover.
 * Run from cocos/:  node tools/verify-boot.mjs
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

console.log('=== SortSplash boot / preview wiring ===');

const gm = read('assets/scripts/GameManager.ts');
const ui = read('assets/scripts/UIManager.ts');
const scene = JSON.parse(read('assets/scenes/main.scene'));
const wechat = read('WECHAT.md');
const builder = JSON.parse(read('settings/v2/packages/builder.json'));
const project = JSON.parse(read('settings/v2/packages/project.json'));
const gmMeta = JSON.parse(read('assets/scripts/GameManager.ts.meta'));

function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

const onLoadMatch = gm.match(/onLoad\s*\(\s*\)\s*\{[\s\S]*?\n    \}/);
assert(!!onLoadMatch, 'onLoad() block found');
const onLoad = onLoadMatch[0];
const onLoadCode = stripComments(onLoad);
const gmCode = stripComments(gm);

assert(onLoad.includes('try'), 'onLoad wrapped in try/catch');
assert(onLoad.includes('console.error'), 'onLoad logs failures with console.error');
assert(!/\bfind\s*\(/.test(onLoadCode), 'onLoad does not call find()');
assert(!/\bfind\s*\(/.test(gmCode), 'GameManager.ts does not call find()');
assert(/ensureHierarchy\s*\(/.test(onLoad), 'onLoad calls ensureHierarchy()');
assert(/setUIRoot\s*\(\s*ui\s*\)/.test(onLoad), 'onLoad sets uiRoot from ensureHierarchy ui');
assert(/setBoardRoot\s*\(\s*board\s*\)/.test(onLoad), 'onLoad sets boardRoot from ensureHierarchy board');
assert(!/if\s*\(\s*ui\s*\)\s*this\._ui/.test(onLoad), 'setUIRoot is not gated on a find() result');
assert(!/if\s*\(\s*board\s*\)\s*this\._tubes/.test(onLoad), 'setBoardRoot is not gated on a find() result');
assert(/buildAll\s*\(\s*\)/.test(onLoad), 'onLoad always calls buildAll()');
assert(/showCover\s*\(\s*\)/.test(onLoad), 'onLoad always calls showCover()');

assert(/ensureHierarchy\s*\(\s*\)\s*:\s*\{\s*canvas:\s*Node;\s*board:\s*Node;\s*ui:\s*Node\s*\}/.test(gm)
    || /return\s*\{\s*canvas,\s*board,\s*ui\s*\}/.test(gm),
    'ensureHierarchy returns canvas, board, ui');
assert(/ensureChild\s*\(\s*['"]BoardRoot['"]/.test(gm)
    || /getChildByName\s*\(\s*['"]BoardRoot['"]\s*\)/.test(gm), 'BoardRoot via getChildByName / ensureChild');
assert(/ensureChild\s*\(\s*['"]UIRoot['"]/.test(gm)
    || /getChildByName\s*\(\s*['"]UIRoot['"]\s*\)/.test(gm), 'UIRoot via getChildByName / ensureChild');
assert(/ensureComponents\s*\(/.test(onLoad), 'onLoad calls ensureComponents()');
assert(/Layers\.Enum\.UI_2D/.test(gm), 'UI nodes use Layers.Enum.UI_2D');
assert(/ProjectionType\.ORTHO/.test(gm), 'Camera set to ORTHO');
assert(/cameraComponent\s*=\s*camera/.test(gm), 'Canvas.cameraComponent linked');

assert(/uiRoot is null/.test(ui), 'buildAll logs if uiRoot is null instead of silent return');
assert(/useSystemFont/.test(ui), 'Labels request system font (3.8)');

const objects = Array.isArray(scene) ? scene : [];
const gameController = objects.find((o) => o && o.__type__ === 'cc.Node' && o._name === 'GameController');
assert(!!gameController, 'scene has GameController node');
const gcCompIds = (gameController._components || []).map((c) => c.__id__);
assert(gcCompIds.length === 2, `GameController has 2 components (UITransform + GameManager), got ${gcCompIds.length}`);

const gcComps = gcCompIds.map((id) => objects[id]);
const types = gcComps.map((c) => c && c.__type__);
assert(types.includes('cc.UITransform'), 'GameController keeps cc.UITransform');
const scriptTypes = types.filter((t) => t && t !== 'cc.UITransform');
assert(scriptTypes.length === 1, 'GameController has exactly one custom script');
const cid = scriptTypes[0];
assert(/^[0-9a-zA-Z+/]{22,23}$/.test(cid) && !cid.includes('-'),
    `GameManager CID is compressed (no UUID hyphens): ${cid}`);

const uuid = String(gmMeta.uuid || '').replace(/-/g, '');
assert(uuid.startsWith('087c06'), 'GameManager.ts.meta UUID still matches expected prefix');

const extraScripts = objects.filter((o) => o && typeof o.__type__ === 'string'
    && o.__type__ !== 'cc.UITransform'
    && o.__type__ !== 'cc.Widget'
    && o.__type__ !== 'cc.Canvas'
    && o.__type__ !== 'cc.Camera'
    && o.__type__ !== 'cc.SceneAsset'
    && o.__type__ !== 'cc.Scene'
    && o.__type__ !== 'cc.Node'
    && o.__type__ !== 'cc.SceneGlobals'
    && o.__type__ !== 'cc.AmbientInfo'
    && o.__type__ !== 'cc.ShadowsInfo'
    && o.__type__ !== 'cc.SkyboxInfo'
    && o.__type__ !== 'cc.FogInfo'
    && o.__type__ !== 'cc.OctreeInfo'
    && o.__type__ !== 'cc.SkinInfo'
    && o.__type__ !== 'cc.LightProbeInfo'
    && o.__type__ !== 'cc.PostSettingsInfo');
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

assert(fs.existsSync(path.join(root, '..', 'index.html')), 'root HTML prototype kept');

console.log('onLoad wires uiRoot from ensureHierarchy() — will not skip buildAll for missing find()');
console.log('GameController scripts: UITransform + compressed GameManager CID only');
console.log('ALL PASS');
