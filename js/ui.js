'use strict';

/**
 * ui.js - 界面交互模块
 *
 * 包含：标签切换、搜索智能提示、歌曲列表渲染、队列渲染、
 * 粒子特效、桌面搜索弹窗拖拽、歌曲右键菜单、一言加载等
 */

// ============================================================
// 标签切换
// ============================================================

function switchTab(tabId) {
    const actionPanel = document.getElementById('action-panel');
    const smartBox = document.getElementById('smart-box');

    if (window.innerWidth >= 850) {
        if (tabId === 'search') {
            document.getElementById('desktop-search-overlay').style.display = 'block';
            setTimeout(() => document.getElementById('ds-search-input').focus(), 100);
            return;
        }
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`nav-${tabId}`).classList.add('active');
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${tabId}`).classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`nav-${tabId}`).classList.add('active');
        smartBox.style.display = 'none';

        if (tabId === 'player') {
            actionPanel.classList.remove('show');
        } else {
            document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tabId}`).classList.add('active');
            actionPanel.classList.add('show');
        }
    }
}

// ============================================================
// 桌面端搜索弹窗
// ============================================================

function executeDesktopSearch() {
    const word = document.getElementById('ds-search-input').value;
    if (!word) return;
    document.getElementById('search-input').value = word;
    closeDesktopSearch();

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-search').classList.add('active');
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-search').classList.add('active');

    searchMusic();
}

function closeDesktopSearch() {
    document.getElementById('desktop-search-overlay').style.display = 'none';
}

// ============================================================
// 搜索智能提示（Smartbox）
// ============================================================

let smartTimeout;
function debounceSmartbox() {
    clearTimeout(smartTimeout);
    const word = document.getElementById('search-input').value;
    const smartBox = document.getElementById('smart-box');
    if (!word) { smartBox.style.display = 'none'; return; }

    smartTimeout = setTimeout(async () => {
        try {
            const data = await apiSmartbox(word);
            if (data) {
                let html = '';
                if (data.song && data.song.itemlist) {
                    data.song.itemlist.forEach(i => {
                        const safeText = escapeHTML(`${i.name} - ${i.singer}`);
                        const safeKeyword = escapeAttr(`${i.name} ${i.singer}`);
                        html += `<div class="smart-item" data-keyword="${safeKeyword}"><span class="smart-type">单曲</span><div>${safeText}</div></div>`;
                    });
                }
                if (data.singer && data.singer.itemlist) {
                    data.singer.itemlist.forEach(i => {
                        const safeText = escapeHTML(i.singer);
                        const safeKeyword = escapeAttr(i.singer);
                        html += `<div class="smart-item" data-keyword="${safeKeyword}"><span class="smart-type">歌手</span><div>${safeText}</div></div>`;
                    });
                }
                smartBox.innerHTML = html;
                smartBox.style.display = html ? 'block' : 'none';
                // 绑定点击事件
                smartBox.querySelectorAll('.smart-item').forEach(el => {
                    el.addEventListener('click', () => quickSearch(el.dataset.keyword));
                });
            }
        } catch (e) { /* 静默 */ }
    }, 300);
}

function quickSearch(keyword) {
    document.getElementById('search-input').value = keyword;
    document.getElementById('smart-box').style.display = 'none';
    searchMusic();
}

let dsSmartTimeout;
function debounceDsSmartbox() {
    clearTimeout(dsSmartTimeout);
    const word = document.getElementById('ds-search-input').value;
    const dsSmartBox = document.getElementById('ds-smart-box');
    if (!word) { dsSmartBox.style.display = 'none'; return; }

    dsSmartTimeout = setTimeout(async () => {
        try {
            const data = await apiSmartbox(word);
            if (data) {
                let html = '';
                if (data.song && data.song.itemlist) {
                    data.song.itemlist.forEach(i => {
                        const safeText = escapeHTML(`${i.name} - ${i.singer}`);
                        const safeKeyword = escapeAttr(`${i.name} ${i.singer}`);
                        html += `<div class="smart-item" data-keyword="${safeKeyword}"><span class="smart-type">单曲</span><div>${safeText}</div></div>`;
                    });
                }
                if (data.singer && data.singer.itemlist) {
                    data.singer.itemlist.forEach(i => {
                        const safeText = escapeHTML(i.singer);
                        const safeKeyword = escapeAttr(i.singer);
                        html += `<div class="smart-item" data-keyword="${safeKeyword}"><span class="smart-type">歌手</span><div>${safeText}</div></div>`;
                    });
                }
                dsSmartBox.innerHTML = html;
                dsSmartBox.style.display = html ? 'block' : 'none';
                dsSmartBox.querySelectorAll('.smart-item').forEach(el => {
                    el.addEventListener('click', () => quickDsSearch(el.dataset.keyword));
                });
            }
        } catch (e) { /* 静默 */ }
    }, 300);
}

function quickDsSearch(keyword) {
    document.getElementById('ds-search-input').value = keyword;
    document.getElementById('ds-smart-box').style.display = 'none';
    executeDesktopSearch();
}

// ============================================================
// 搜索歌曲
// ============================================================

async function searchMusic() {
    const word = document.getElementById('search-input').value;
    if (!word) return;
    document.getElementById('smart-box').style.display = 'none';

    const fixedHeader = document.getElementById('search-fixed-header');
    const container = document.getElementById('search-results');

    AppState.currentListName = word;
    const daTitle = document.getElementById('player-da-title');
    if (daTitle) daTitle.textContent = AppState.currentListName;

    if (fixedHeader) fixedHeader.innerHTML = '';
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div>云端全网深度检索中...</div>';

    try {
        const data = await apiSearchSong(word, 60);
        if (data) {
            AppState.playQueue = data;

            const safeListName = escapeHTML(AppState.currentListName);
            const listHeader = window.innerWidth >= 850 && fixedHeader ? `
                <div class="desktop-action-bar" style="margin-bottom: 10px;">
                    <div class="da-tag">当前搜索 <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                    <div class="da-title">${safeListName}</div>
                </div>
                <div class="desktop-list-header">
                    <div class="col-song">歌曲</div>
                    <div class="col-singer">歌手</div>
                    <div class="col-album">专辑</div>
                    <div class="col-action">操作</div>
                </div>` : '';

            if (fixedHeader) fixedHeader.innerHTML = listHeader;
            container.innerHTML = renderSongsHTML(data);
            
            // 修复：确保为搜索结果列表绑定事件委托
            bindSongListEvents(container);
            
            renderQueue();
        } else {
            container.innerHTML = '<div class="empty-state">未找到相关歌曲</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state">搜索失败，请检查网络连接</div>';
    }
}

function searchSinger(event, singerName) {
    event.stopPropagation();
    if (window.innerWidth >= 850) {
        document.getElementById('ds-search-input').value = singerName;
        executeDesktopSearch();
    } else {
        document.getElementById('search-input').value = singerName;
        switchTab('search');
        searchMusic();
    }
}

// ============================================================
// 歌曲列表渲染（XSS 安全版本）
// ============================================================

function renderSongsHTML(list, localPlaylistId) {
    localPlaylistId = localPlaylistId || null;
    AppState.lastRenderedList = list;
    if (!list || list.length === 0) return '<div class="empty-state">未能找到相关歌曲</div>';

    const items = list.map((song, index) => {
        const cover = song.cover || 'https://y.qq.com/mediastyle/global/img/album_300.png';
        const safeSong = escapeHTML(song.song);
        const safeSinger = escapeHTML(song.singer);
        const safeAlbum = escapeHTML(song.album || '未知');
        const safeSingerAttr = escapeAttr(song.singer);
        const safeAlbumAttr = escapeAttr(song.album || '');
        const safeMid = escapeAttr(song.mid);
        const safeVid = song.vid ? escapeAttr(song.vid) : '';
        const safeSongAttr = escapeAttr(song.song);
        const localIdAttr = localPlaylistId ? escapeAttr(localPlaylistId) : '';

        const mvTag = song.vid
            ? `<span class="mv-badge" data-vid="${safeVid}" data-title="${safeSongAttr}">▶ MV</span>`
            : '';

        const dotsBtn = `
        <button class="queue-remove-btn" data-menu-type="list" data-menu-index="${index}" data-local-id="${localIdAttr}" title="更多操作" style="font-size:20px; font-weight:bold; width:30px; text-align:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
        </button>`;

        return `
        <li class="song-item" data-mid="${safeMid}" data-index="${index}">
            <img src="${escapeAttr(cover)}" class="song-item-cover" alt="cover" loading="lazy">
            <div class="song-item-info">
                <div class="song-item-title">${safeSong} ${mvTag}</div>
                <div class="song-item-singer mobile-only">${safeSinger} ${song.album ? `· ${safeAlbum}` : ''}</div>
            </div>
            <div class="desktop-singer desktop-singer-wrapper">
                <svg class="singer-search-icon" data-search="${safeSingerAttr}" viewBox="0 0 24 24" width="14" height="14">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <span class="desktop-singer-text">${safeSinger}</span>
            </div>
            <div class="desktop-album" title="${safeAlbum}">
                <svg class="singer-search-icon" data-search="${safeAlbumAttr}" viewBox="0 0 24 24" width="14" height="14">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <span class="desktop-album-text">${safeAlbum}</span>
            </div>
            <div class="song-action-col">${dotsBtn}</div>
        </li>`;
    }).join('');

    return `<ul class="song-list">${items}</ul>`;
}

/**
 * 为动态渲染的歌曲列表绑定事件委托
 * @param {HTMLElement} container - 包含歌曲列表的容器元素
 */
function bindSongListEvents(container) {
    if (!container) return;
    // 修复：防止在同一个容器上重复绑定监听器导致内存泄漏或重复执行
    if (container.dataset.songEventsBound) return;
    container.dataset.songEventsBound = 'true';

    container.addEventListener('click', (e) => {
        // MV 按钮
        const mvBadge = e.target.closest('.mv-badge');
        if (mvBadge) {
            e.stopPropagation();
            playMV(mvBadge.dataset.vid, mvBadge.dataset.title);
            return;
        }
        // 搜索歌手/专辑图标
        const searchIcon = e.target.closest('.singer-search-icon');
        if (searchIcon) {
            e.stopPropagation();
            searchSinger(e, searchIcon.dataset.search);
            return;
        }
        // 更多操作按钮
        const menuBtn = e.target.closest('.queue-remove-btn');
        if (menuBtn) {
            e.stopPropagation();
            openSongMenu(e, menuBtn.dataset.menuType, parseInt(menuBtn.dataset.menuIndex), menuBtn.dataset.localId || '');
            return;
        }
        // 歌曲项点击播放
        const songItem = e.target.closest('.song-item');
        if (songItem) {
            playSong(songItem.dataset.mid, parseInt(songItem.dataset.index));
        }
    });
}

// ============================================================
// 播放队列渲染
// ============================================================

function renderQueue() {
    const mContainer = document.getElementById('queue-list-container');
    const dContainer = document.getElementById('queue-list-desktop');
    document.getElementById('queue-count').textContent = AppState.playQueue.length;

    // 移动端渲染
    if (mContainer) {
        if (AppState.playQueue.length === 0) {
            mContainer.innerHTML = '<div class="empty-state" style="margin-top:30px; font-size:13px;">队列为空</div>';
        } else {
            mContainer.innerHTML = AppState.playQueue.map((song, i) => {
                const isActive = i === AppState.currentIndex;
                const safeSong = escapeHTML(song.song);
                const safeSinger = escapeHTML(song.singer);
                const safeMid = escapeAttr(song.mid);
                return `
                <li class="queue-item ${isActive ? 'active' : ''}" data-mid="${safeMid}" data-index="${i}">
                    <div class="q-info"><span class="q-title">${safeSong}</span><span class="q-singer">${safeSinger}</span></div>
                    ${isActive ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" style="margin-right:8px;"><path d="M8 5v14l11-7z"/></svg>' : ''}
                    <button class="queue-remove-btn" data-menu-type="queue" data-menu-index="${i}" title="更多操作" style="font-size:20px; font-weight:bold; width:30px; text-align:center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
                    </button>
                </li>`;
            }).join('');
            setTimeout(() => {
                const activeItem = mContainer.querySelector('.queue-item.active');
                if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    // PC 端渲染
    if (dContainer) {
        if (AppState.playQueue.length === 0) {
            dContainer.innerHTML = '<div class="empty-state" style="margin-top:10vh;">当前播放队列为空</div>';
        } else {
            dContainer.innerHTML = AppState.playQueue.map((song, i) => {
                const isActive = i === AppState.currentIndex;
                const colorStyle = isActive ? 'color: var(--primary); font-weight: bold;' : '';
                const titleColor = isActive ? 'color: var(--primary);' : '';
                const titlePrefix = isActive ? '<span style="color:var(--primary);margin-right:8px;">▶</span>' : '';
                const safeSinger = escapeHTML(song.singer);
                const safeSong = escapeHTML(song.song);
                const safeAlbum = escapeHTML(song.album || '未知');
                const safeMid = escapeAttr(song.mid);
                const safeSingerAttr = escapeAttr(song.singer);
                const safeSongAttr = escapeAttr(song.song);
                const safeAlbumAttr = escapeAttr(song.album || '');
                const safeVid = song.vid ? escapeAttr(song.vid) : '';
                const mvTag = song.vid
                    ? `<span class="mv-badge" data-vid="${safeVid}" data-title="${safeSongAttr}">▶ MV</span>`
                    : '';

                return `
                <li class="song-item" data-mid="${safeMid}" data-index="${i}">
                    <div class="song-item-info">
                        <div class="song-item-title" style="${titleColor}">${titlePrefix}${safeSong} ${mvTag}</div>
                    </div>
                    <div class="desktop-singer desktop-singer-wrapper" style="${colorStyle}">
                        <svg class="singer-search-icon" data-search="${safeSingerAttr}" viewBox="0 0 24 24" width="14" height="14">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <span class="desktop-singer-text">${safeSinger}</span>
                    </div>
                    <div class="desktop-album" title="${safeAlbum}">
                        <svg class="singer-search-icon" data-search="${safeAlbumAttr}" viewBox="0 0 24 24" width="14" height="14">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <span class="desktop-album-text">${safeAlbum}</span>
                    </div>
                    <div class="song-action-col">
                        <button class="queue-remove-btn" data-menu-type="queue" data-menu-index="${i}" title="更多操作" style="font-size:20px; font-weight:bold; width:30px; text-align:center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
                        </button>
                    </div>
                </li>`;
            }).join('');
        }
    }
}

function toggleQueue() {
    if (window.innerWidth >= 850) {
        switchTab('player');
    } else {
        const modal = document.getElementById('queue-modal');
        modal.classList.toggle('show');
        if (modal.classList.contains('show')) renderQueue();
    }
}

// ============================================================
// 粒子特效
// ============================================================

let particleCanvas, particleCtx, particles;

function initParticleSystem() {
    particleCanvas = document.getElementById('particle-canvas');
    particleCtx = particleCanvas.getContext('2d');
    particles = [];
    resizeCanvas();
    for (let i = 0; i < 150; i++) particles.push(new Particle());
    animateParticles();
}

function resizeCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset();
        this.y = particleCanvas.height - Math.random() * (particleCanvas.height * 0.4);
        this.fadeState = Math.random() > 0.5 ? 1 : 0;
        this.opacity = Math.random() * this.life;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.fadeState === 1) {
            this.opacity += 0.005;
            if (this.opacity >= this.life) this.fadeState = 0;
        } else {
            this.opacity -= 0.005;
        }
        if (this.y < particleCanvas.height * 0.3 || (this.opacity <= 0 && this.fadeState === 0)) {
            this.reset();
        }
    }
    draw() {
        particleCtx.beginPath();
        particleCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        particleCtx.fillStyle = this.colorStr + Math.max(0, this.opacity) + ')';
        particleCtx.fill();
    }
    reset() {
        this.x = Math.random() * particleCanvas.width;
        this.y = particleCanvas.height + Math.random() * 50;
        this.size = Math.random() * 2.5 + 1;
        this.speedY = Math.random() * -0.8 - 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        const colors = [
            'rgba(29, 208, 138, ', 'rgba(255, 255, 255, ', 'rgba(56, 189, 248, ',
            'rgba(167, 139, 250, ', 'rgba(252, 211, 77, ', 'rgba(244, 63, 94, ',
            'rgba(16, 185, 129, ', 'rgba(249, 115, 22, ', 'rgba(139, 92, 246, '
        ];
        this.colorStr = colors[Math.floor(Math.random() * colors.length)];
        this.life = Math.random() * 0.6 + 0.2;
        this.opacity = 0;
        this.fadeState = 1;
    }
}

function animateParticles() {
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
}

// ============================================================
// 歌曲右键菜单
// ============================================================

let currentMenuContext = null;

function openSongMenu(event, type, index, localId) {
    event.stopPropagation();
    currentMenuContext = { type, index, localId };
    const menu = document.getElementById('song-action-menu');

    menu.style.display = 'flex';

    let top = event.clientY || (event.touches && event.touches[0].clientY) || 0;
    let left = (event.clientX || (event.touches && event.touches[0].clientX) || 0) - 150;

    const rect = menu.getBoundingClientRect();
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
    if (left < 0) left = 10;

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.classList.add('show');

    const delBtn = document.getElementById('sam-delete-btn');
    const coverBtn = document.getElementById('sam-set-cover-btn');

    delBtn.style.display = (type === 'queue' || localId) ? 'block' : 'none';
    coverBtn.style.display = localId ? 'block' : 'none';
}

function samAdd() {
    if (!currentMenuContext) return;
    const { type, index } = currentMenuContext;
    openApModal(type, index, { stopPropagation: () => {} });
    closeSongMenu();
}

function samSetCover() {
    if (!currentMenuContext) return;
    const { type, index, localId } = currentMenuContext;
    if (localId) {
        const pls = getLocalPlaylists();
        const pl = pls.find(p => p.id === localId);
        if (pl) {
            const song = type === 'queue' ? AppState.playQueue[index] : AppState.lastRenderedList[index];
            if (song && song.cover) {
                pl.customCover = song.cover;
                saveLocalPlaylists(pls);
                showToast('已成功设为该歌单封面');
            } else {
                showToast('该歌曲暂无封面信息');
            }
        }
    }
    closeSongMenu();
}

function samDelete() {
    if (!currentMenuContext) return;
    const { type, index, localId } = currentMenuContext;
    if (type === 'queue') {
        removeFromQueue(index, { stopPropagation: () => {} });
    } else if (localId) {
        removeSongFromLocal(localId, index, { stopPropagation: () => {} });
    }
    closeSongMenu();
}

function closeSongMenu() {
    const menu = document.getElementById('song-action-menu');
    if (menu) {
        menu.classList.remove('show');
        menu.style.display = 'none';
    }
}

// ============================================================
// 桌面搜索弹窗拖拽
// ============================================================

function initDesktopSearchDrag() {
    const dsModal = document.querySelector('.ds-modal-content');
    const dsHeader = document.querySelector('.ds-header');
    if (!dsModal || !dsHeader) return;

    let isDraggingDs = false;
    let startX, startY, initialLeft, initialTop;

    dsHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ds-close')) return;
        isDraggingDs = true;
        const rect = dsModal.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;
        dsModal.style.left = initialLeft + 'px';
        dsModal.style.top = initialTop + 'px';
        dsModal.style.transform = 'none';
        dsModal.style.margin = '0';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDraggingDs) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - dsModal.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - dsModal.offsetHeight));
            dsModal.style.left = newLeft + 'px';
            dsModal.style.top = newTop + 'px';
        }
    });

    document.addEventListener('mouseup', () => { isDraggingDs = false; });
}

// ============================================================
// 一言加载
// ============================================================

async function fetchHitokoto() {
    try {
        const res = await fetch('https://60s.viki.moe/v2/hitokoto?encoding=text');
        const text = await res.text();
        if (text) {
            document.getElementById('hitokoto-text').textContent = text;
        }
    } catch (e) {
        document.getElementById('hitokoto-text').textContent = '愿每一次聆听都能触动心弦';
    }
}

// ============================================================
// 窗口关闭队列弹窗
// ============================================================

function closeQueueOnOutsideClick(e) {
    const queueModal = document.getElementById('queue-modal');
    if (window.innerWidth < 850 && queueModal && queueModal.classList.contains('show')) {
        // 防止点击底部按钮时被立即关闭
        if (!queueModal.contains(e.target) && !e.target.closest('#btn-queue-mb')) {
            queueModal.classList.remove('show');
        }
    }
}

// ============================================================
// 全局事件绑定
// ============================================================

function initGlobalClickHandlers() {
    document.addEventListener('click', (e) => {
        closeSongMenu();
        const ioMenu = document.getElementById('io-action-menu');
        if (ioMenu && !e.target.closest('#io-action-menu') && !e.target.closest('[data-action="toggleIoMenu"]')) {
            ioMenu.classList.remove('show');
        }
        closeQueueOnOutsideClick(e);
    });

    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('#song-action-menu') && !e.target.closest('.queue-remove-btn')) {
            closeSongMenu();
        }
        closeQueueOnOutsideClick(e);
    }, { passive: true });
}

function initResizeHandler() {
    window.addEventListener('resize', () => {
        resizeCanvas();
        const activeNavEl = document.querySelector('.nav-item.active');
        if (!activeNavEl) return;
        const activeNav = activeNavEl.id.replace('nav-', '');
        if (window.innerWidth >= 850) {
            document.getElementById('action-panel').classList.add('show');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${activeNav}`).classList.add('active');
        } else {
            if (activeNav === 'player') {
                document.getElementById('action-panel').classList.remove('show');
            }
        }
    });
}

// ============================================================
// 事件委托绑定（队列列表）
// ============================================================

function initQueueEventDelegation() {
    const mContainer = document.getElementById('queue-list-container');
    const dContainer = document.getElementById('queue-list-desktop');

    [mContainer, dContainer].forEach(container => {
        if (!container) return;
        container.addEventListener('click', (e) => {
            const mvBadge = e.target.closest('.mv-badge');
            if (mvBadge) {
                e.stopPropagation();
                playMV(mvBadge.dataset.vid, mvBadge.dataset.title);
                return;
            }
            const searchIcon = e.target.closest('.singer-search-icon');
            if (searchIcon) {
                e.stopPropagation();
                searchSinger(e, searchIcon.dataset.search);
                return;
            }
            const menuBtn = e.target.closest('.queue-remove-btn');
            if (menuBtn) {
                e.stopPropagation();
                openSongMenu(e, menuBtn.dataset.menuType, parseInt(menuBtn.dataset.menuIndex), menuBtn.dataset.localId || '');
                return;
            }
            const queueItem = e.target.closest('.queue-item');
            if (queueItem) {
                playSong(queueItem.dataset.mid, parseInt(queueItem.dataset.index));
                return;
            }
            const songItem = e.target.closest('.song-item');
            if (songItem) {
                playSong(songItem.dataset.mid, parseInt(songItem.dataset.index));
            }
        });
    });
}