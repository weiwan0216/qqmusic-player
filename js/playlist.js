'use strict';

/**
 * playlist.js - 本地歌单存储与管理 + QQ歌单加载
 *
 * 包含：本地歌单 CRUD、导入导出、QQ 歌单提取、歌单详情加载、
 * 添加到歌单 Modal、歌单缓存等
 */

// ============================================================
// 本地歌单存储
// ============================================================

const PLAYLIST_STORAGE_KEY = 'yoo_playlists';

function getLocalPlaylists() {
    try {
        return JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveLocalPlaylists(pls) {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(pls));
}

// ============================================================
// 创建歌单 Modal
// ============================================================

function openCreateModal() {
    document.getElementById('create-playlist-modal').classList.add('show');
    document.getElementById('new-pl-name').focus();
}

function closeCreateModal() {
    document.getElementById('create-playlist-modal').classList.remove('show');
}

function submitCreatePlaylist() {
    const name = document.getElementById('new-pl-name').value.trim();
    if (!name) return showToast('歌单名称不能为空');
    const pls = getLocalPlaylists();
    const newPl = { id: 'pl_' + Date.now(), name: name, songs: [] };
    pls.push(newPl);
    saveLocalPlaylists(pls);
    document.getElementById('new-pl-name').value = '';
    closeCreateModal();
    if (document.getElementById('qq-playlists-container')) renderPlaylistHome(false);
}

// ============================================================
// 重命名歌单 Modal
// ============================================================

let renamePlId = null;

function openRenameModal(id, oldName) {
    renamePlId = id;
    document.getElementById('rename-pl-name').value = oldName;
    document.getElementById('rename-playlist-modal').classList.add('show');
    document.getElementById('rename-pl-name').focus();
}

function closeRenameModal() {
    document.getElementById('rename-playlist-modal').classList.remove('show');
    renamePlId = null;
}

function submitRenamePlaylist() {
    const newName = document.getElementById('rename-pl-name').value.trim();
    if (!newName) return showToast('歌单名称不能为空');
    const pls = getLocalPlaylists();
    const pl = pls.find(p => p.id === renamePlId);
    if (pl) {
        pl.name = newName;
        saveLocalPlaylists(pls);
        showToast('重命名成功');
        loadLocalPlaylistDetail(renamePlId);
    }
    closeRenameModal();
}

// ============================================================
// 添加到歌单 Modal
// ============================================================

let songToAdd = null;

function openApModal(source, index, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    if (source === 'list') {
        songToAdd = AppState.lastRenderedList[index];
    } else if (source === 'queue') {
        songToAdd = AppState.playQueue[index];
    }
    document.getElementById('add-playlist-modal').classList.add('show');
    renderAddList();
}

function closeAddModal() {
    document.getElementById('add-playlist-modal').classList.remove('show');
    songToAdd = null;
}

function renderAddList() {
    const pls = getLocalPlaylists();
    const container = document.getElementById('add-pl-list-container');
    if (pls.length === 0) {
        container.innerHTML = '<div style="font-size:13px; color:rgba(255,255,255,0.5); text-align:center; padding: 20px 0;">暂无自建歌单，请先创建</div>';
    } else {
        container.innerHTML = pls.map(p => {
            const safeName = escapeHTML(p.name);
            const safeId = escapeAttr(p.id);
            return `<div class="add-pl-item" data-pl-id="${safeId}">
                <span>${safeName}</span>
                <span>${p.songs.length} 首</span>
            </div>`;
        }).join('');
        // 绑定事件
        container.querySelectorAll('.add-pl-item').forEach(el => {
            el.addEventListener('click', () => addSongToLocalPlaylist(el.dataset.plId));
        });
    }
}

function addSongToLocalPlaylist(playlistId) {
    if (!songToAdd) return;
    const pls = getLocalPlaylists();
    const pl = pls.find(p => p.id === playlistId);
    if (pl) {
        if (pl.songs.some(s => s.mid === songToAdd.mid)) {
            showToast('歌曲已存在于该歌单中');
        } else {
            pl.songs.push(songToAdd);
            saveLocalPlaylists(pls);
            showToast('已成功加入自建歌单');
            if (document.getElementById('qq-playlists-container')) renderPlaylistHome(false);
        }
    }
    closeAddModal();
}

function removeSongFromLocal(playlistId, index, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const pls = getLocalPlaylists();
    const pl = pls.find(p => p.id === playlistId);
    if (pl) {
        pl.songs.splice(index, 1);
        saveLocalPlaylists(pls);
        showToast('已将歌曲移出歌单');
        loadLocalPlaylistDetail(playlistId);
    }
}

// ============================================================
// 导入/导出
// ============================================================

function toggleIoMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('io-action-menu');
    menu.classList.toggle('show');
}

function exportLocalPlaylists() {
    document.getElementById('io-action-menu').classList.remove('show');
    const pls = getLocalPlaylists();
    if (pls.length === 0) {
        showToast('暂无数据可导出');
        return;
    }
    const blob = new Blob([JSON.stringify(pls, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yoo_playlists_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功');
}

function importLocalPlaylists(event) {
    document.getElementById('io-action-menu').classList.remove('show');
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                saveLocalPlaylists(data);
                renderPlaylistHome(false);
                showToast('导入成功');
            } else {
                showToast('数据格式错误，导入失败');
            }
        } catch (err) {
            showToast('解析文件失败，请确保文件格式正确');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================================
// 歌单首页渲染
// ============================================================

async function renderPlaylistHome(fetchQQ = false) {
    const uinInput = document.getElementById('uin-input');
    const uinInputPc = document.getElementById('uin-input-pc');

    let uin = '3377682726';
    if (window.innerWidth >= 850) {
        uin = (uinInputPc && uinInputPc.value) ? uinInputPc.value : (uinInput && uinInput.value ? uinInput.value : '3377682726');
    } else {
        uin = (uinInput && uinInput.value) ? uinInput.value : (uinInputPc && uinInputPc.value ? uinInputPc.value : '3377682726');
    }
    if (uinInput) uinInput.value = uin;

    const fixedHeader = document.getElementById('playlist-fixed-header');
    if (fixedHeader) {
        const safeUin = escapeAttr(uin);
        fixedHeader.innerHTML = `
            <div class="input-group desktop-only" style="margin-bottom: 15px;" id="pc-playlist-input">
                <input type="number" id="uin-input-pc" placeholder="输入您的 QQ 账号提取歌单..." value="${safeUin}">
                <button onclick="document.getElementById('uin-input').value = document.getElementById('uin-input-pc').value; renderPlaylistHome(true)">提取歌单</button>
            </div>
        `;
    }

    const container = document.getElementById('playlist-results');
    const localPls = getLocalPlaylists();

    let headerHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; position:relative;">
            <div style="font-size:16px; font-weight:bold; color:var(--text-main); display:flex; align-items:center; height:24px;">自建歌单 ${localPls.length}</div>
            <div style="display:flex; gap:12px; align-items:center; height:24px; position:relative;">
                <button data-action="openCreateModal" class="pl-header-btn">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <button data-action="toggleIoMenu" class="pl-header-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l-4-4m4 4l4-4"/></svg>
                </button>
                <div id="io-action-menu" class="pl-menu">
                    <div class="sam-item" data-action="export">导出数据</div>
                    <div class="sam-item" data-action="import">导入数据</div>
                </div>
                <button data-action="openBatchModal" class="pl-header-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                </button>
            </div>
        </div>
        <input type="file" id="import-file" style="display:none;" accept=".json">`;

    let html = headerHtml;

    if (localPls.length === 0) {
        html += `
            <div class="create-playlist-card" data-action="openCreateModal">
                <div style="width: 50px; height: 50px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.3); display:flex; justify-content:center; align-items:center; color: #1DD08A; margin-right: 15px; font-size:24px; font-weight:300;">+</div>
                <div style="font-size: 15px; color: var(--text-main);">新建歌单</div>
            </div>`;
    } else {
        html += localPls.map(p => {
            const coverUrl = p.customCover || (p.songs && p.songs.length > 0 ? p.songs[0].cover : null);
            const safeName = escapeHTML(p.name);
            const safeId = escapeAttr(p.id);
            let coverHtml = '';
            if (coverUrl) {
                coverHtml = `<img src="${escapeAttr(coverUrl)}" alt="cover">`;
            } else {
                coverHtml = `<div class="playlist-cover-placeholder">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>`;
            }
            return `
            <div class="playlist-card" data-local-id="${safeId}">
                ${coverHtml}
                <div style="flex:1;">
                    <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">${safeName}</div>
                    <div style="font-size: 12px; color: var(--text-sub);">共${p.songs.length}首歌</div>
                </div>
            </div>`;
        }).join('');
    }

    const qqTitleText = (fetchQQ || AppState.qqPlaylistsFetched) ? `同步歌单 ${AppState.qqPlaylistsCount > 0 ? AppState.qqPlaylistsCount : ''}` : '同步歌单';
    html += `<div style="font-size:16px; font-weight:bold; color:var(--text-main); margin:25px 0 15px;" id="qq-pl-title-text">${qqTitleText}</div>
             <div id="qq-playlists-container">`;

    if (fetchQQ) {
        html += '<div class="empty-state"><div class="spinner"></div>正在连接云端服务器...</div></div>';
        container.innerHTML = html;
        try {
            const data = await apiGetUserPlaylists(uin);
            const qqContainer = document.getElementById('qq-playlists-container');
            if (data && qqContainer) {
                const lists = [...(data.mydiss || []), ...(data.likediss || [])];
                AppState.qqPlaylistsCount = lists.length;
                const titleEl = document.getElementById('qq-pl-title-text');
                if (titleEl) titleEl.textContent = `同步歌单 ${AppState.qqPlaylistsCount}`;

                const qqHtml = lists.map(p => {
                    const safeTitle = escapeHTML(p.title);
                    const safeId = escapeAttr(p.id);
                    const safeTitleAttr = escapeAttr(p.title);
                    const safePicurl = escapeAttr(p.picurl || 'https://y.qq.com/mediastyle/global/img/album_300.png');
                    return `
                    <div class="playlist-card" data-qq-id="${safeId}" data-qq-title="${safeTitleAttr}">
                        <img src="${safePicurl}" alt="cover" loading="lazy">
                        <div style="flex:1;">
                            <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">${safeTitle}</div>
                            <div style="font-size: 12px; color: var(--text-sub);">${p.song_num || p.listen_num + ' 次播放'}</div>
                        </div>
                    </div>`;
                }).join('');
                AppState.qqPlaylistsHtml = qqHtml || '<div class="empty-state">该账号未公开任何歌单</div>';
                AppState.qqPlaylistsFetched = true;
                qqContainer.innerHTML = AppState.qqPlaylistsHtml;
            }
        } catch (e) {
            const qqContainer = document.getElementById('qq-playlists-container');
            if (qqContainer) qqContainer.innerHTML = '<div class="empty-state">网络异常，请重试</div>';
        }
    } else {
        if (AppState.qqPlaylistsFetched) {
            html += AppState.qqPlaylistsHtml + '</div>';
            container.innerHTML = html;
        } else {
            html += '<div class="empty-state" style="margin-top:10px;">点击上方提取按钮获取同步歌单</div></div>';
            container.innerHTML = html;
        }
    }

    // 绑定歌单首页事件
    bindPlaylistHomeEvents(container);
}

function bindPlaylistHomeEvents(container) {
    if (!container) return;
    // 修复：检查是否已经绑定过，防止进出页面导致 click 事件无限叠加，多次触发下载
    if (container.dataset.homeEventsBound) return;
    container.dataset.homeEventsBound = 'true';

    container.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]');
        if (action) {
            e.stopPropagation();
            const act = action.dataset.action;
            if (act === 'openCreateModal') openCreateModal();
            else if (act === 'toggleIoMenu') toggleIoMenu(e);
            else if (act === 'openBatchModal') openBatchModal();
            else if (act === 'export') exportLocalPlaylists();
            else if (act === 'import') document.getElementById('import-file').click();
            return;
        }
        const localCard = e.target.closest('[data-local-id]');
        if (localCard && !localCard.closest('#io-action-menu')) {
            loadLocalPlaylistDetail(localCard.dataset.localId);
            return;
        }
        const qqCard = e.target.closest('[data-qq-id]');
        if (qqCard) {
            loadPlaylistDetail(qqCard.dataset.qqId, qqCard.dataset.qqTitle);
        }
    });
}

// ============================================================
// 加载自建歌单详情
// ============================================================

function loadLocalPlaylistDetail(id) {
    const fixedHeader = document.getElementById('playlist-fixed-header');
    const container = document.getElementById('playlist-results');

    const pls = getLocalPlaylists();
    const pl = pls.find(p => p.id === id);
    if (!pl) return;

    AppState.currentListName = pl.name;
    const daTitle = document.getElementById('player-da-title');
    if (daTitle) daTitle.textContent = AppState.currentListName;

    const safeName = escapeHTML(pl.name);
    const safeId = escapeAttr(pl.id);
    const safeNameAttr = escapeAttr(pl.name);

    const backBtn = `
        <div class="back-bar">
            <button class="back-btn" onclick="renderPlaylistHome(false)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> 返回歌单
            </button>
            <span style="font-weight: 600; font-size: 14px; display:flex; align-items:center; gap:6px;">
                自建歌单：${safeName}
                <svg data-rename-id="${safeId}" data-rename-name="${safeNameAttr}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="cursor:pointer; opacity:0.8;" class="rename-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </span>
        </div>`;

    const listHeader = window.innerWidth >= 850 ? `
        <div class="desktop-action-bar desktop-only" style="margin-bottom: 10px;">
            <div class="da-tag">自建歌单 <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
            <div class="da-title" style="display:flex; align-items:center; gap:6px;">
                ${safeName}
                <svg data-rename-id="${safeId}" data-rename-name="${safeNameAttr}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="cursor:pointer; opacity:0.8;" class="rename-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
        </div>
        <div class="desktop-list-header">
            <div class="col-song">歌曲</div>
            <div class="col-singer">歌手</div>
            <div class="col-album">专辑</div>
            <div class="col-action">操作</div>
        </div>` : '';

    fixedHeader.innerHTML = backBtn + listHeader;

    // 绑定重命名按钮事件
    fixedHeader.querySelectorAll('[data-rename-id]').forEach(el => {
        el.addEventListener('click', () => openRenameModal(el.dataset.renameId, el.dataset.renameName));
    });

    AppState.playQueue = pl.songs;
    renderQueue();
    container.innerHTML = renderSongsHTML(pl.songs, pl.id);
    bindSongListEvents(container);
}

// ============================================================
// 带缓存的 QQ 歌单详情加载
// ============================================================

async function loadPlaylistDetail(id, title) {
    const uinInput = document.getElementById('uin-input');
    const uinInputPc = document.getElementById('uin-input-pc');

    let uin = '3377682726';
    if (window.innerWidth >= 850) {
        uin = (uinInputPc && uinInputPc.value) ? uinInputPc.value : (uinInput && uinInput.value ? uinInput.value : '3377682726');
    } else {
        uin = (uinInput && uinInput.value) ? uinInput.value : (uinInputPc && uinInputPc.value ? uinInputPc.value : '3377682726');
    }

    const fixedHeader = document.getElementById('playlist-fixed-header');
    const container = document.getElementById('playlist-results');

    AppState.currentListName = title || '歌单详情';
    const daTitle = document.getElementById('player-da-title');
    if (daTitle) daTitle.textContent = AppState.currentListName;

    const safeListName = escapeHTML(AppState.currentListName);

    const backBtn = `
        <div class="back-bar">
            <button class="back-btn" onclick="renderPlaylistHome(false)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> 返回歌单
            </button>
            <span style="font-weight: 600; font-size: 14px;">当前歌单详情</span>
        </div>`;

    const listHeader = window.innerWidth >= 850 ? `
        <div class="desktop-action-bar desktop-only" style="margin-bottom: 10px;">
            <div class="da-tag">当前歌单 <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
            <div class="da-title">${safeListName}</div>
        </div>
        <div class="desktop-list-header">
            <div class="col-song">歌曲</div>
            <div class="col-singer">歌手</div>
            <div class="col-album">专辑</div>
            <div class="col-action">操作</div>
        </div>` : '';

    fixedHeader.innerHTML = backBtn + listHeader;

    // 检查缓存
    const cached = AppState.qqPlaylistCache[id];
    if (cached) {
        AppState.playQueue = cached.data;
        container.innerHTML = renderSongsHTML(AppState.playQueue);
        bindSongListEvents(container);
        renderQueue();
        if (Date.now() - cached.timestamp > AppState.CACHE_TTL) {
            fetchPlaylistBackground(id, uin);
        }
        return;
    }

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div>正在为您智能加载全量歌曲，请稍候...</div>';

    try {
        const allSongs = await fetchAllPlaylistSongs(id, uin, (loaded) => {
            container.innerHTML = `<div class="empty-state"><div class="spinner"></div>正在加载... 已拉取 ${loaded} 首歌曲</div>`;
        });

        if (allSongs.length > 0) {
            AppState.qqPlaylistCache[id] = { data: allSongs, timestamp: Date.now() };
            AppState.playQueue = allSongs;
            container.innerHTML = renderSongsHTML(allSongs);
            bindSongListEvents(container);
            renderQueue();
        } else {
            container.innerHTML = '<div class="empty-state">未能获取到歌曲，可能歌单已被设密</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state">网络请求超时或无权限访问该私密歌单</div>';
    }
}

// ============================================================
// 分页拉取歌单全量歌曲
// ============================================================

async function fetchAllPlaylistSongs(id, uin, onProgress) {
    let allSongs = [];
    const limit = 60;
    let offset = 0;
    let total = null;
    let hasMore = true;

    while (hasMore) {
        let currentNum = limit;
        let currentPage = Math.floor(offset / limit) + 1;
        if (total !== null && offset + currentNum > total) {
            let remaining = total - offset;
            currentNum = remaining;
            while (currentNum > 0 && offset % currentNum !== 0) currentNum--;
            if (currentNum === 0) currentNum = 1;
            currentPage = offset / currentNum + 1;
        }
        const data = await apiGetPlaylistDetail(id, currentNum, currentPage, uin);
        if (data && data.list) {
            if (total === null && data.info && data.info.songnum) total = data.info.songnum;
            const fetchedList = data.list;
            if (fetchedList.length > 0) {
                allSongs = allSongs.concat(fetchedList);
                offset += fetchedList.length;
                if (onProgress) onProgress(allSongs.length);
            }
            if (fetchedList.length === 0 || (total !== null && offset >= total) || fetchedList.length < currentNum) {
                hasMore = false;
            }
        } else {
            hasMore = false;
            if (offset === 0) throw new Error('First page fetch failed');
        }
    }
    return allSongs;
}

// ============================================================
// 后台静默更新歌单
// ============================================================

async function fetchPlaylistBackground(id, uin) {
    try {
        const allSongs = await fetchAllPlaylistSongs(id, uin);
        if (allSongs.length > 0) {
            AppState.qqPlaylistCache[id] = { data: allSongs, timestamp: Date.now() };
        }
    } catch (e) {
        console.warn('后台更新歌单失败，将继续使用旧缓存', e);
    }
}