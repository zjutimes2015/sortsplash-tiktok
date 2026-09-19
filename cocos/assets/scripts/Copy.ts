/**
 * Player-facing copy — Simplified Chinese for WeChat.
 * Keep English only in comments / README technical notes.
 */
export const FONT_FAMILY = 'KaiTi, STKaiti, 楷体, DFKai-SB, serif';

export const Copy = {
    title: '颜色分拣',
    tagline: '倒水归类，再来一关',
    play: '▶ 开始游戏',
    tapToStart: '点击开始',
    pourTip: '先点一只试管，再点另一只倒水 💧',

    levelPill: (level: number) => `第${level}关`,
    movesPill: (moves: number) => `步数 ${moves}`,

    undo: '↩ 撤销',
    undoCount: (n: number) => `↩ 撤销(${n})`,
    restart: '↻ 重开',
    hint: '💡 提示',
    addTubeAd: '+1试管 广告',
    undoPackAd: '撤销包 广告',
    share: '📤 分享',
    levels: '📚 选关',

    winTitle: '本关过关！',
    winNice: '倒得漂亮！',
    nextLevel: '下一关 →',
    replay: '再玩一次',
    winMoves: (level: number, moves: number) => `第${level}关用了 ${moves} 步！`,
    winAll: '全部通关！🏆',

    adPlaying: '广告播放中…',
    adStub: '激励视频占位\n看完即可领取奖励',

    levelsTitle: '选择关卡',
    levelsSub: '点已解锁关卡跳转',
    close: '关闭',

    emptyTube: '空',

    tipMatch: '提示：把相同颜色倒进同一只试管',
    pickColored: '请先点有颜色的试管',
    cantPour: '这里倒不进去',
    restarted: '已重开本关',
    noFreeUndos: '免费撤销用完了，看广告领取撤销包',
    noHint: '暂无提示，试试撤销或加试管',
    hintPour: (from: number, to: number) => `提示：从试管 ${from} 倒向试管 ${to}`,
    adNotFinished: '广告未看完',
    tubeAlready: '本关已经加过试管了',
    tubeAdded: '已加一只空试管！🧪',
    undoPackGot: '获得 5 次撤销！',
    shareOpened: '已打开分享',
    shareCopied: '已复制挑战文案！',
    shareText: (level: number) =>
        `我在「颜色分拣」过了第${level}关！🧪✨ 倒水归类，再来一关`,
};
