# 微信小游戏导出

完整清单（含 **重新构建 / 重新导入**、`compileType: game`、`urlCheck`、物理模块裁剪、黑屏排查）在 **[cocos/WECHAT.md](cocos/WECHAT.md)**。

用 Cocos Creator 3.8.8 打开 `cocos/`，构建平台选 **微信小游戏**。广告位 ID 写在 `cocos/assets/scripts/AdBridge.ts` 的 `AD_UNITS`。根目录 `index.html` 只是玩法参考，不能当小游戏包上传。

若微信开发者工具打开的是 `E:\GROK\SortSplash-WeChat\build\wechatgame`，必须先在 Creator 里重新构建 `cocos/build/wechatgame`，再 **整目录覆盖或重新导入**。只编译旧包会继续黑屏。
