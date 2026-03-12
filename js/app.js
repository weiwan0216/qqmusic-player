'use strict';

/**
 * app.js - 应用入口文件（最后加载）
 *
 * 整合所有模块，初始化应用状态和事件绑定。
 * AppState 已在 utils.js 中统一定义。
 * * 加载顺序：
 * 1. utils.js    - 全局状态 + 工具函数
 * 2. api.js      - API 请求封装
 * 3. player.js   - 播放器核心逻辑
 * 4. playlist.js - 歌单管理
 * 5. batch.js    - 批量操作
 * 6. ui.js       - 界面交互
 * 7. app.js      - 入口初始化（本文件）
 */

// ============================================================
// 全局函数暴露（供 HTML 内联事件调用）
// ============================================================

function exposeGlobalFunctions() {
    // 播放器控制
    window.playSong = playSong;
    window.togglePlay = togglePlay;
    window.prevSong = prevSong;
    window.nextSong = nextSong;
    window.toggleMode = toggleMode;
    window.downloadCurrentSong = downloadCurrentSong;
    window.toggleFullScreen = toggleFullScreen;
    window.toggleLyricFullScreen = toggleLyricFullScreen;
    window.jumpToSeekTime = jumpToSeekTime;
    window.closeMV = closeMV;
    window.playMV = playMV;
    window.switchQuality = switchQuality;

    // UI 控制
    window.switchTab = switchTab;
    window.toggleQueue = toggleQueue;
    window.searchMusic = searchMusic;
    window.debounceSmartbox = debounceSmartbox;
    window.debounceDsSmartbox = debounceDsSmartbox;
    window.executeDesktopSearch = executeDesktopSearch;
    window.closeDesktopSearch = closeDesktopSearch;
    window.searchSinger = searchSinger;
    window.renderQueue = renderQueue;

    // 歌单管理
    window.openCreateModal = openCreateModal;
    window.closeCreateModal = closeCreateModal;
    window.submitCreatePlaylist = submitCreatePlaylist;
    window.openRenameModal = openRenameModal;
    window.closeRenameModal = closeRenameModal;
    window.submitRenamePlaylist = submitRenamePlaylist;
    window.openApModal = openApModal;
    window.closeAddModal = closeAddModal;
    window.renderPlaylistHome = renderPlaylistHome;
    window.loadLocalPlaylistDetail = loadLocalPlaylistDetail;
    window.loadPlaylistDetail = loadPlaylistDetail;
    window.removeSongFromLocal = removeSongFromLocal;

    // 导入导出
    window.toggleIoMenu = toggleIoMenu;
    window.exportLocalPlaylists = exportLocalPlaylists;
    window.importLocalPlaylists = importLocalPlaylists;

    // 批量操作
    window.openBatchModal = openBatchModal;
    window.closeBatchModal = closeBatchModal;
    window.toggleBatchCb = toggleBatchCb;
    window.toggleSelectAll = toggleSelectAll;
    window.deleteSelectedBatch = deleteSelectedBatch;
    window.updateBatchFooter = updateBatchFooter;

    // 歌曲菜单
    window.openSongMenu = openSongMenu;
    window.closeSongMenu = closeSongMenu;
    window.samAdd = samAdd;
    window.samSetCover = samSetCover;
    window.samDelete = samDelete;
    window.removeFromQueue = removeFromQueue;
}

// ============================================================
// HTML 内联事件迁移为 addEventListener 绑定
// ============================================================

function bindDOMEvents() {
    // 导航栏标签切换
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.addEventListener('click', () => {
            const tab = nav.dataset.tab || nav.id.replace('nav-', '');
            switchTab(tab);
        });
    });

    // 桌面搜索弹窗
    const dsCloseBtn = document.getElementById('ds-close-btn');
    if (dsCloseBtn) dsCloseBtn.addEventListener('click', closeDesktopSearch);
    const dsSearchBtn = document.getElementById('ds-search-btn');
    if (dsSearchBtn) dsSearchBtn.addEventListener('click', executeDesktopSearch);
    const dsSearchInput = document.getElementById('ds-search-input');
    if (dsSearchInput) {
        dsSearchInput.addEventListener('input', debounceDsSmartbox);
        dsSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeDesktopSearch(); });
    }

    // 移动端搜索
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounceSmartbox);
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchMusic(); });
    }
    const btnSearchMusic = document.getElementById('btn-search-music');
    if (btnSearchMusic) btnSearchMusic.addEventListener('click', searchMusic);

    // 歌单提取
    const btnFetchPlaylist = document.getElementById('btn-fetch-playlist');
    if (btnFetchPlaylist) {
        btnFetchPlaylist.addEventListener('click', () => {
            const pcInput = document.getElementById('uin-input-pc');
            if (pcInput) pcInput.value = document.getElementById('uin-input').value;
            renderPlaylistHome(true);
        });
    }

    // 移动端底部控制栏
    const btnPrevMb = document.getElementById('btn-prev-mb');
    if (btnPrevMb) btnPrevMb.addEventListener('click', prevSong);
    const btnPlayMb = document.getElementById('play-pause-btn-mb');
    if (btnPlayMb) btnPlayMb.addEventListener('click', togglePlay);
    const btnNextMb = document.getElementById('btn-next-mb');
    if (btnNextMb) btnNextMb.addEventListener('click', nextSong);
    const btnDownloadMb = document.getElementById('btn-download-mb');
    if (btnDownloadMb) btnDownloadMb.addEventListener('click', downloadCurrentSong);
    const btnModeMb = document.getElementById('btn-mode-mb');
    if (btnModeMb) btnModeMb.addEventListener('click', toggleMode);
    const btnQueueMb = document.getElementById('btn-queue-mb');
    if (btnQueueMb) btnQueueMb.addEventListener('click', toggleQueue);

    // PC 端底部控制栏
    const btnPrevPc = document.getElementById('btn-prev-pc');
    if (btnPrevPc) btnPrevPc.addEventListener('click', prevSong);
    const btnPlayPc = document.getElementById('play-pause-btn-pc');
    if (btnPlayPc) btnPlayPc.addEventListener('click', togglePlay);
    const btnNextPc = document.getElementById('btn-next-pc');
    if (btnNextPc) btnNextPc.addEventListener('click', nextSong);
    const btnModePc = document.getElementById('btn-mode-pc');
    if (btnModePc) btnModePc.addEventListener('click', toggleMode);
    const btnFsPc = document.getElementById('btn-fullscreen-pc');
    if (btnFsPc) btnFsPc.addEventListener('click', toggleFullScreen);

    // 侧边工具栏
    const btnDownloadSide = document.getElementById('btn-download-side');
    if (btnDownloadSide) btnDownloadSide.addEventListener('click', downloadCurrentSong);
    const btnLyricFs = document.getElementById('btn-lyric-fs');
    if (btnLyricFs) btnLyricFs.addEventListener('click', toggleLyricFullScreen);

    // 创建歌单弹窗
    const btnSubmitCreate = document.getElementById('btn-submit-create');
    if (btnSubmitCreate) btnSubmitCreate.addEventListener('click', submitCreatePlaylist);
    const createModal = document.getElementById('create-playlist-modal');
    if (createModal) createModal.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });

    // 重命名歌单弹窗
    const btnSubmitRename = document.getElementById('btn-submit-rename');
    if (btnSubmitRename) btnSubmitRename.addEventListener('click', submitRenamePlaylist);
    const renameModal = document.getElementById('rename-playlist-modal');
    if (renameModal) renameModal.addEventListener('click', (e) => { if (e.target === renameModal) closeRenameModal(); });

    // 添加到歌单弹窗
    const btnCloseAddModal = document.getElementById('btn-close-add-modal');
    if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
    const addModal = document.getElementById('add-playlist-modal');
    if (addModal) addModal.addEventListener('click', (e) => { if (e.target === addModal) closeAddModal(); });

    // 歌曲右键菜单
    const samAddBtn = document.getElementById('sam-add-btn');
    if (samAddBtn) samAddBtn.addEventListener('click', samAdd);
    const samSetCoverBtn = document.getElementById('sam-set-cover-btn');
    if (samSetCoverBtn) samSetCoverBtn.addEventListener('click', samSetCover);
    const samDeleteBtn = document.getElementById('sam-delete-btn');
    if (samDeleteBtn) samDeleteBtn.addEventListener('click', samDelete);

    // 批量操作弹窗
    const btnCloseBatch = document.getElementById('btn-close-batch');
    if (btnCloseBatch) btnCloseBatch.addEventListener('click', closeBatchModal);
    const batchSelectAll = document.getElementById('batch-select-all');
    if (batchSelectAll) batchSelectAll.addEventListener('click', toggleSelectAll);
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    if (batchDeleteBtn) batchDeleteBtn.addEventListener('click', deleteSelectedBatch);

    // 队列弹窗关闭
    const btnQueueClose = document.getElementById('btn-queue-close');
    if (btnQueueClose) btnQueueClose.addEventListener('click', toggleQueue);

    // 歌词跳转按钮
    const lyricSeekBtn = document.getElementById('lyric-seek-btn');
    if (lyricSeekBtn) lyricSeekBtn.addEventListener('click', jumpToSeekTime);

    // 导入文件
    const importFile = document.getElementById('import-file');
    if (importFile) importFile.addEventListener('change', importLocalPlaylists);
}

// ============================================================
// 应用初始化
// ============================================================

function initApp() {
    // 暴露全局函数（兼容少量内联事件）
    exposeGlobalFunctions();

    // 绑定 DOM 事件
    bindDOMEvents();

    // 初始化播放器 DOM 引用
    initPlayerDOM();

    // 初始化粒子特效
    initParticleSystem();

    // 初始化进度条
    initProgressBar();

    // 初始化音量控制
    initVolumeControl();

    // 初始化音频事件
    initAudioEvents();

    // 初始化歌词交互
    initLyricInteraction();

    // 初始化全局点击处理
    initGlobalClickHandlers();

    // 初始化窗口 resize 处理
    initResizeHandler();

    // 初始化桌面搜索弹窗拖拽
    initDesktopSearchDrag();

    // 初始化队列事件委托
    initQueueEventDelegation();

    // 初始化全屏图标监听
    document.addEventListener('fullscreenchange', updateFsIcon);
    document.addEventListener('webkitfullscreenchange', updateFsIcon);

    // 问候弹窗
    const popup = document.getElementById('greeting-popup');
    if (popup) {
        setTimeout(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 500);
        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }, 4000);
    }

    // 加载一言
    fetchHitokoto();

    // 渲染歌单首页
    renderPlaylistHome(false);

    // 加载默认歌曲到队列
    initDefaultSong();
}

// ============================================================
// 默认歌曲加载
// ============================================================

async function initDefaultSong() {
    try {
        const data2 = await apiSearchSong('空悲切', 1);
        const data1 = await apiSearchSong('下坠falling', 1);

        const queue = [];
        if (data2 && data2.length > 0) queue.push(data2[0]);
        if (data1 && data1.length > 0) queue.push(data1[0]);

        if (queue.length > 0) {
            AppState.playQueue = queue;
            renderQueue();
        }
    } catch (e) {
        // 静默失败
    }
}

// ============================================================
// DOMContentLoaded 启动
// ============================================================

window.addEventListener('DOMContentLoaded', initApp);