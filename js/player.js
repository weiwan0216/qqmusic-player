'use strict';

/**
 * player.js - 播放器核心逻辑模块
 * 
 * 包含：播放/暂停、上一首/下一首、音质切换、歌词解析与同步、
 *       进度条控制、音量控制、MV 播放、下载等
 */

// ============================================================
// DOM 引用（延迟到 DOMContentLoaded 后初始化）
// ============================================================
let audio, coverImg, lyricContainer, lyricSeekLine, lyricSeekTime;

function initPlayerDOM() {
    audio = document.getElementById('audio-player');
    coverImg = document.getElementById('p-cover');
    lyricContainer = document.getElementById('lyric-container');
    lyricSeekLine = document.getElementById('lyric-seek-line');
    lyricSeekTime = document.getElementById('lyric-seek-time');
}

// ============================================================
// 播放控制
// ============================================================

/**
 * 播放指定歌曲
 * @param {string} mid - 歌曲 mid
 * @param {number} index - 在播放队列中的索引
 */
async function playSong(mid, index = -1) {
    if (index !== -1) AppState.currentIndex = index;
    AppState.isUserScrolling = false;

    try {
        let data = await apiGetSong(mid, AppState.currentQualityId);

        // 如果返回杜比音质，降级到 SQ
        if (data && data.quality && data.quality.includes('杜比')) {
            data = await apiGetSong(mid, 10);
        }

        // 如果高音质不可用，降级到标准
        if ((!data || !data.url) && AppState.currentQualityId !== 7) {
            data = await apiGetSong(mid, 7);
        }

        if (data && data.url) {
            AppState.currentSongUrl = data.url;
            AppState.currentSongName = `${data.singer} - ${data.song}`;

            // 安全更新 DOM（使用 textContent 防止 XSS）
            document.getElementById('p-title').textContent = data.song;
            const fTitleMb = document.getElementById('f-title-mb');
            if (fTitleMb) fTitleMb.textContent = `${data.song} - ${data.singer}`;

            const qualitySpan = document.getElementById('p-quality');
            qualitySpan.style.display = 'inline-block';
            qualitySpan.textContent = data.quality || '标准音质';
            qualitySpan.title = '点击切换音质';
            qualitySpan.onclick = switchQuality;

            // 安全更新歌手信息
            const singerEl = document.getElementById('p-singer');
            singerEl.textContent = '';
            singerEl.appendChild(document.createTextNode(data.singer + ' \u00A0'));
            singerEl.appendChild(qualitySpan);

            coverImg.src = data.cover;
            const fCoverMb = document.getElementById('f-cover-mb');
            if (fCoverMb) fCoverMb.src = data.cover;

            audio.src = data.url;
            audio.play();
            AppState.isPlaying = true;
            updatePlayState();
            fetchLyrics(mid);
            switchTab('player');
            renderQueue();
        } else {
            const errorSongName = AppState.playQueue[AppState.currentIndex]?.song || '未知歌曲';
            showToast(`抱歉，《${errorSongName}》因版权限制无法获取音源，已自动为您跳过`);
            setTimeout(() => { nextSong(); }, 1500);
        }
    } catch (e) {
        showToast('请求超时，请重试');
    }
}

/**
 * 切换播放/暂停
 */
function togglePlay() {
    if (!audio.src) return;
    if (AppState.isPlaying) audio.pause();
    else audio.play();
    AppState.isPlaying = !AppState.isPlaying;
    updatePlayState();
}

/**
 * 更新播放/暂停按钮和封面旋转状态
 */
function updatePlayState() {
    const svgPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const svgPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    const btnMb = document.getElementById('play-pause-btn-mb');
    const btnPc = document.getElementById('play-pause-btn-pc');
    if (btnMb) btnMb.innerHTML = AppState.isPlaying ? svgPause : svgPlay;
    if (btnPc) btnPc.innerHTML = AppState.isPlaying ? svgPause : svgPlay;

    const fCoverMb = document.getElementById('f-cover-mb');
    if (AppState.isPlaying) {
        coverImg.classList.add('playing');
        if (fCoverMb) fCoverMb.classList.add('playing');
    } else {
        coverImg.classList.remove('playing');
        if (fCoverMb) fCoverMb.classList.remove('playing');
    }
}

// ============================================================
// 播放模式
// ============================================================

const modeIcons = [
    '<svg viewBox="0 0 24 24" style="fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    '<svg viewBox="0 0 24 24" style="fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><path d="M11 10h1v4"></path></svg>',
    '<svg viewBox="0 0 24 24" style="fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>'
];
const modeNames = ['列表循环', '单曲循环', '随机播放'];

function toggleMode() {
    AppState.currentMode = (AppState.currentMode + 1) % 3;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.innerHTML = modeIcons[AppState.currentMode];
        btn.title = modeNames[AppState.currentMode];
    });
    showToast(`已切换至: ${modeNames[AppState.currentMode]}`);
}

function prevSong() {
    if (AppState.playQueue.length === 0) return;
    if (AppState.currentMode === 2) {
        AppState.currentIndex = Math.floor(Math.random() * AppState.playQueue.length);
    } else {
        AppState.currentIndex = (AppState.currentIndex - 1 + AppState.playQueue.length) % AppState.playQueue.length;
    }
    playSong(AppState.playQueue[AppState.currentIndex].mid, AppState.currentIndex);
}

function nextSong() {
    if (AppState.playQueue.length === 0) return;
    if (AppState.currentMode === 1) {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    if (AppState.currentMode === 2) {
        AppState.currentIndex = Math.floor(Math.random() * AppState.playQueue.length);
    } else {
        AppState.currentIndex = (AppState.currentIndex + 1) % AppState.playQueue.length;
    }
    playSong(AppState.playQueue[AppState.currentIndex].mid, AppState.currentIndex);
}

// ============================================================
// 音质切换
// ============================================================

async function switchQuality(e) {
    if (e) e.stopPropagation();
    if (AppState.currentIndex === -1 || AppState.playQueue.length === 0) return;

    const qualitySpan = document.getElementById('p-quality');
    if (!qualitySpan) return;

    const cycle = [7, 8, 10, 14];
    let idx = cycle.indexOf(AppState.currentQualityId);
    if (idx === -1) idx = 3;
    AppState.currentQualityId = cycle[(idx + 1) % cycle.length];

    const mid = AppState.playQueue[AppState.currentIndex].mid;
    const currentTime = audio.currentTime;
    const wasPlaying = AppState.isPlaying;
    const originalText = qualitySpan.textContent;

    qualitySpan.textContent = '切换中...';
    qualitySpan.style.opacity = '0.7';
    qualitySpan.style.pointerEvents = 'none';

    try {
        const data = await apiGetSong(mid, AppState.currentQualityId);
        if (data && data.url) {
            AppState.currentSongUrl = data.url;
            audio.src = data.url;
            audio.currentTime = currentTime;
            if (wasPlaying) audio.play();
            qualitySpan.textContent = data.quality || '未知音质';
        } else {
            showToast('抱歉，该音质可能因版权或VIP限制不可用，已为您跳过');
            qualitySpan.textContent = originalText;
        }
    } catch (err) {
        showToast('网络异常，请重试');
        qualitySpan.textContent = originalText;
    } finally {
        qualitySpan.style.opacity = '1';
        qualitySpan.style.pointerEvents = 'auto';
    }
}

// ============================================================
// 歌词解析与同步
// ============================================================

function parseLrc(lrcStr) {
    const result = [];
    lrcStr.split('\n').forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseFloat('0.' + match[3]);
            const text = match[4].replace(/\/\//g, '').trim();
            if (text) result.push({ time, text });
        }
    });
    return result;
}

async function fetchLyrics(mid) {
    try {
        const data = await apiGetLyrics(mid);
        if (data && data.lrc) {
            const lrcLines = parseLrc(data.lrc);
            const transLines = data.trans ? parseLrc(data.trans) : [];
            const mergedLyrics = lrcLines.map(lrc => {
                const trans = transLines.find(t => Math.abs(t.time - lrc.time) < 1);
                return { time: lrc.time, main: lrc.text, trans: trans ? trans.text : '' };
            });
            AppState.lyricsArray = mergedLyrics;
            AppState.currentLyricIndex = -1;
            lyricContainer.classList.remove('no-scroll');
            // 安全渲染歌词（歌词来自 API，需转义）
            lyricContainer.innerHTML = AppState.lyricsArray.map((l, i) => `
                <div class="lyric-line-group" id="lrc-${i}" data-time="${l.time}">
                    <div class="lyric-line-main">${escapeHTML(l.main)}</div>
                    ${l.trans ? `<div class="lyric-line-trans">${escapeHTML(l.trans)}</div>` : ''}
                </div>
            `).join('');

            // 绑定歌词点击跳转事件
            lyricContainer.querySelectorAll('.lyric-line-group').forEach(el => {
                el.addEventListener('click', () => {
                    const time = parseFloat(el.dataset.time);
                    if (!isNaN(time)) {
                        audio.currentTime = time;
                        audio.play();
                        AppState.isPlaying = true;
                        updatePlayState();
                    }
                });
            });
        } else {
            AppState.lyricsArray = [];
            AppState.currentLyricIndex = -1;
            lyricContainer.classList.add('no-scroll');
            lyricContainer.innerHTML = '<div class="lyric-line-group active"><div class="lyric-line-main">此歌曲暂无歌词</div></div>';
        }
    } catch (e) {
        AppState.lyricsArray = [];
        AppState.currentLyricIndex = -1;
        lyricContainer.classList.add('no-scroll');
        lyricContainer.innerHTML = '<div class="lyric-line-group active"><div class="lyric-line-main">歌词加载失败</div></div>';
    }
}

function syncLyric(currentTime, forceScroll = false) {
    if (AppState.lyricsArray.length === 0) return;
    let activeIndex = 0;
    for (let i = 0; i < AppState.lyricsArray.length; i++) {
        if (currentTime + 0.3 >= AppState.lyricsArray[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }
    if (AppState.currentLyricIndex !== activeIndex || forceScroll) {
        AppState.currentLyricIndex = activeIndex;
        document.querySelectorAll('.lyric-line-group').forEach((el, index) => {
            if (index === activeIndex) el.classList.add('active');
            else el.classList.remove('active');
            if (!AppState.isUserScrolling) el.style.opacity = '';
        });
        const activeEl = document.getElementById(`lrc-${activeIndex}`);
        if (activeEl && !AppState.isUserScrolling) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function handleLyricInteraction() {
    if (!AppState.lyricsArray || AppState.lyricsArray.length === 0) return;
    AppState.isUserScrolling = true;
    lyricSeekLine.classList.add('show');
    resetLyricScrollTimeout();
}

function resetLyricScrollTimeout() {
    clearTimeout(AppState.lyricScrollTimeout);
    AppState.lyricScrollTimeout = setTimeout(() => {
        AppState.isUserScrolling = false;
        lyricSeekLine.classList.remove('show');
        syncLyric(audio.currentTime, true);
    }, 2500);
}

function jumpToSeekTime() {
    if (AppState.seekTargetTime >= 0) {
        audio.currentTime = AppState.seekTargetTime;
        if (!AppState.isPlaying) togglePlay();
        AppState.isUserScrolling = false;
        lyricSeekLine.classList.remove('show');
        syncLyric(audio.currentTime, true);
    }
}

// ============================================================
// 进度条控制
// ============================================================

function calculateProgress(clientX) {
    const bar = window.innerWidth >= 850
        ? document.getElementById('progress-bar-pc')
        : document.getElementById('progress-bar-mb');
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, percent));
}

function updateProgressVisual(percent) {
    const pMb = document.getElementById('progress-inner-mb');
    const pPc = document.getElementById('progress-inner-pc');
    if (pMb) pMb.style.width = `${percent * 100}%`;
    if (pPc) pPc.style.width = `${percent * 100}%`;

    if (audio.duration) {
        const t = formatTime(percent * audio.duration);
        const tcMb = document.getElementById('time-current-mb');
        const tcPc = document.getElementById('time-current-pc');
        if (tcMb) tcMb.textContent = t;
        if (tcPc) tcPc.textContent = t;
    }
}

function initProgressBar() {
    ['progress-bar-mb', 'progress-bar-pc'].forEach(id => {
        const bar = document.getElementById(id);
        if (bar) {
            bar.addEventListener('mousedown', (e) => {
                AppState.isDraggingProgress = true;
                updateProgressVisual(calculateProgress(e.clientX));
            });
            bar.addEventListener('touchstart', (e) => {
                AppState.isDraggingProgress = true;
                updateProgressVisual(calculateProgress(e.touches[0].clientX));
            }, { passive: true });
            bar.addEventListener('click', (e) => {
                if (!audio.duration) return;
                const percent = calculateProgress(e.clientX);
                audio.currentTime = percent * audio.duration;
                updateProgressVisual(percent);
            });
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (AppState.isDraggingProgress) updateProgressVisual(calculateProgress(e.clientX));
    });
    document.addEventListener('mouseup', (e) => {
        if (AppState.isDraggingProgress) {
            AppState.isDraggingProgress = false;
            if (audio.duration) audio.currentTime = calculateProgress(e.clientX) * audio.duration;
        }
    });
    document.addEventListener('touchmove', (e) => {
        if (AppState.isDraggingProgress) updateProgressVisual(calculateProgress(e.touches[0].clientX));
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        if (AppState.isDraggingProgress) {
            AppState.isDraggingProgress = false;
            if (audio.duration) audio.currentTime = calculateProgress(e.changedTouches[0].clientX) * audio.duration;
        }
    });
}

// ============================================================
// 音量控制
// ============================================================

function initVolumeControl() {
    const volBar = document.getElementById('vol-bar-pc');
    const volInner = document.getElementById('vol-inner-pc');
    if (!volBar) return;

    audio.volume = 1;
    volInner.style.width = '100%';

    function updateVolume(clientX) {
        const rect = volBar.getBoundingClientRect();
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        audio.volume = percent;
        volInner.style.width = `${percent * 100}%`;
    }

    volBar.addEventListener('mousedown', (e) => {
        AppState.isDraggingVol = true;
        updateVolume(e.clientX);
    });
    document.addEventListener('mousemove', (e) => {
        if (AppState.isDraggingVol) updateVolume(e.clientX);
    });
    document.addEventListener('mouseup', () => { AppState.isDraggingVol = false; });

    volBar.addEventListener('touchstart', (e) => {
        AppState.isDraggingVol = true;
        updateVolume(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (AppState.isDraggingVol) updateVolume(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchend', () => { AppState.isDraggingVol = false; });
}

// ============================================================
// Audio 事件监听
// ============================================================

function initAudioEvents() {
    // 播放错误处理（降级音质）
    audio.addEventListener('error', async () => {
        if (audio.src && audio.error && audio.error.code === 4) {
            if (AppState.currentIndex !== -1 && AppState.playQueue.length > 0) {
                const mid = AppState.playQueue[AppState.currentIndex].mid;
                const currentTime = audio.currentTime;
                try {
                    const data = await apiGetSong(mid, 7);
                    if (data && data.url) {
                        AppState.currentSongUrl = data.url;
                        audio.src = data.url;
                        audio.currentTime = currentTime;
                        if (AppState.isPlaying) audio.play();
                        AppState.currentQualityId = 7;
                        const qBadge = document.getElementById('p-quality');
                        if (qBadge) qBadge.textContent = data.quality || '标准音质';
                    }
                } catch (err) {
                    // 静默失败
                }
            }
        }
    });

    // 时间更新
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration || AppState.isDraggingProgress) return;
        const current = audio.currentTime;
        const total = audio.duration;
        const percent = current / total;

        const pMb = document.getElementById('progress-inner-mb');
        const pPc = document.getElementById('progress-inner-pc');
        if (pMb) pMb.style.width = `${percent * 100}%`;
        if (pPc) pPc.style.width = `${percent * 100}%`;

        const t = formatTime(current);
        const tcMb = document.getElementById('time-current-mb');
        const tcPc = document.getElementById('time-current-pc');
        if (tcMb) tcMb.textContent = t;
        if (tcPc) tcPc.textContent = t;

        const d = formatTime(total);
        const ttMb = document.getElementById('time-total-mb');
        const ttPc = document.getElementById('time-total-pc');
        if (ttMb) ttMb.textContent = d;
        if (ttPc) ttPc.textContent = d;

        syncLyric(current);
    });

    // 播放结束
    audio.addEventListener('ended', nextSong);
}

// ============================================================
// 歌词交互事件绑定
// ============================================================

function initLyricInteraction() {
    lyricContainer.addEventListener('touchstart', handleLyricInteraction, { passive: true });
    lyricContainer.addEventListener('mousedown', handleLyricInteraction, { passive: true });
    lyricContainer.addEventListener('wheel', handleLyricInteraction, { passive: true });
    lyricContainer.addEventListener('touchmove', handleLyricInteraction, { passive: true });

    lyricContainer.addEventListener('scroll', () => {
        if (!AppState.isUserScrolling || AppState.lyricsArray.length === 0) return;
        resetLyricScrollTimeout();

        const containerRect = lyricContainer.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        let closestIndex = 0;
        let minDiff = Infinity;

        const lines = lyricContainer.querySelectorAll('.lyric-line-group');
        lines.forEach((line, index) => {
            const rect = line.getBoundingClientRect();
            const lineCenter = rect.top + rect.height / 2;
            const diff = Math.abs(lineCenter - containerCenter);
            if (diff < minDiff) { minDiff = diff; closestIndex = index; }
        });

        if (AppState.lyricsArray[closestIndex]) {
            AppState.seekTargetTime = AppState.lyricsArray[closestIndex].time;
            lyricSeekTime.textContent = formatTime(AppState.seekTargetTime);
            lines.forEach(el => el.style.opacity = '');
            if (lines[closestIndex]) lines[closestIndex].style.opacity = '1';
        }
    });
}

// ============================================================
// MV 播放
// ============================================================

async function playMV(vid, title) {
    if (AppState.isPlaying) togglePlay();
    const modal = document.getElementById('mv-modal');
    const video = document.getElementById('mv-video');
    document.getElementById('mv-title').textContent = title + ' - 官方 MV';
    modal.classList.add('show');
    try {
        const url = await apiGetMV(vid);
        if (url) {
            video.src = url;
            video.play();
        } else {
            showToast('获取 MV 源失败，请稍后再试。');
            closeMV();
        }
    } catch (e) {
        showToast('网络请求错误，无法播放 MV。');
        closeMV();
    }
}

function closeMV() {
    const modal = document.getElementById('mv-modal');
    const video = document.getElementById('mv-video');
    video.pause();
    video.src = '';
    modal.classList.remove('show');
}

// ============================================================
// 下载当前歌曲
// ============================================================

function downloadCurrentSong() {
    if (!AppState.currentSongUrl) {
        showToast('请先播放一首歌曲后再点击下载哦！');
        return;
    }
    let ext = '.mp3';
    try {
        const urlObj = new URL(AppState.currentSongUrl);
        const pathMatches = urlObj.pathname.match(/\.([a-zA-Z0-9]+)$/);
        if (pathMatches) ext = '.' + pathMatches[1];
    } catch (e) { /* 忽略 */ }
    const filename = `${AppState.currentSongName}${ext}`;
    const a = document.createElement('a');
    a.href = AppState.currentSongUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ============================================================
// 全屏控制
// ============================================================

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen().catch(() => showToast('全屏请求失败'));
        } else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen();
        }
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
    }
}

function updateFsIcon() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const fsPath = isFs
        ? 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'
        : 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z';
    const iconPc = document.querySelector('#fs-icon-pc path');
    if (iconPc) iconPc.setAttribute('d', fsPath);
}

function toggleLyricFullScreen() {
    AppState.isLyricFs = !AppState.isLyricFs;
    const icon = document.getElementById('lyric-fs-icon');
    if (AppState.isLyricFs) {
        document.body.classList.add('lyric-fs-active');
        icon.innerHTML = '<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>';
    } else {
        document.body.classList.remove('lyric-fs-active');
        icon.innerHTML = '<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>';
    }
}

// ============================================================
// 队列管理
// ============================================================

function removeFromQueue(index, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    AppState.playQueue.splice(index, 1);
    if (index < AppState.currentIndex) {
        AppState.currentIndex--;
    } else if (index === AppState.currentIndex) {
        if (AppState.playQueue.length > 0) {
            if (AppState.currentIndex >= AppState.playQueue.length) AppState.currentIndex = 0;
            playSong(AppState.playQueue[AppState.currentIndex].mid, AppState.currentIndex);
        } else {
            audio.pause();
            audio.src = '';
            AppState.isPlaying = false;
            updatePlayState();
            AppState.currentIndex = -1;
            document.getElementById('p-title').textContent = 'QQmusic Player';
            const fTitleMb = document.getElementById('f-title-mb');
            if (fTitleMb) fTitleMb.textContent = '等待播放...';
            const singerEl = document.getElementById('p-singer');
            singerEl.textContent = '';
            singerEl.appendChild(document.createTextNode('等待播放... '));
            const qBadge = document.createElement('span');
            qBadge.className = 'quality-badge';
            qBadge.style.display = 'none';
            qBadge.id = 'p-quality';
            singerEl.appendChild(qBadge);
            const defaultCover = 'https://y.qq.com/mediastyle/global/img/album_300.png';
            coverImg.src = defaultCover;
            const fCoverMb = document.getElementById('f-cover-mb');
            if (fCoverMb) fCoverMb.src = defaultCover;
            AppState.lyricsArray = [];
            lyricContainer.innerHTML = '<div class="lyric-line-group active"><div class="lyric-line-main">歌词将在此震撼显示</div></div>';
            const daTitle = document.getElementById('player-da-title');
            if (daTitle) daTitle.textContent = '当前播放队列';
        }
    }
    renderQueue();
}
