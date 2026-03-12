'use strict';

/**
 * utils.js - 通用工具函数模块（最先加载）
 * 
 * 包含：全局应用状态、XSS 安全转义、Toast 提示、时间格式化
 * 
 * 安全说明：
 * - escapeHTML() 用于对所有来自外部 API 的不可信数据进行 HTML 实体转义
 * - escapeAttr() 用于对 HTML 属性值进行安全转义
 * - 所有涉及 innerHTML 拼接的场景均应先通过 escapeHTML() 处理
 */

// ============================================================
// 全局应用状态（唯一定义，替代原始代码中的全局变量污染）
// ============================================================

const AppState = {
    // 播放队列
    playQueue: [],
    currentIndex: -1,
    isPlaying: false,
    currentSongUrl: '',
    currentSongName: '',
    currentListName: '默认推荐',
    currentQualityId: 14,
    currentMode: 0,  // 0=列表循环, 1=单曲循环, 2=随机播放

    // 歌词
    lyricsArray: [],
    currentLyricIndex: -1,
    isUserScrolling: false,
    lyricScrollTimeout: null,
    seekTargetTime: 0,

    // 进度条/音量拖拽
    isDraggingProgress: false,
    isDraggingVol: false,

    // 沉浸歌词
    isLyricFs: false,

    // QQ 歌单缓存
    qqPlaylistCache: {},
    CACHE_TTL: 5 * 60 * 1000,  // 5 分钟
    qqPlaylistsFetched: false,
    qqPlaylistsHtml: '',
    qqPlaylistsCount: 0,

    // 最后渲染的列表（用于"添加到歌单"等功能）
    lastRenderedList: []
};

// 使 AppState 在所有模块中可访问
window.AppState = AppState;

// ============================================================
// XSS 安全转义函数
// ============================================================

/**
 * 对字符串进行 HTML 实体转义，防止 XSS 攻击
 * 所有来自外部 API 的不可信数据（歌名、歌手、专辑等）必须经过此函数处理
 * @param {string} str - 待转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return s.replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * 对字符串进行 HTML 属性值安全转义
 * @param {string} str - 待转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================================
// Toast 提示
// ============================================================

/**
 * 显示全局 Toast 提示
 * @param {string} msg - 提示信息（已转义或可信文本）
 * @param {number} duration - 显示时长（毫秒），默认 2500
 */
function showToast(msg, duration = 2500) {
    let toast = document.getElementById('music-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'music-toast';
        toast.style.cssText = 'position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.1); color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; z-index: 11000; opacity: 0; transition: opacity 0.3s, transform 0.3s; pointer-events: none; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);';
        document.body.appendChild(toast);
    }
    // 使用 textContent 而非 innerHTML 以避免潜在的 XSS
    toast.textContent = msg;
    void toast.offsetWidth;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(10px)';

    if (toast.timer) clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, duration);
}

// ============================================================
// 时间格式化
// ============================================================

/**
 * 将秒数格式化为 mm:ss 格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}
