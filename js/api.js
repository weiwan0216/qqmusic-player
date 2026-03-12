'use strict';

/**
 * api.js - API 请求模块
 * 
 * 封装所有与第三方音乐 API 的交互逻辑
 * 
 * CORS 说明：
 * - 当前 API 基地址为 https://api.vkeys.cn/v2/music/tencent
 * - 如遇跨域问题，可配置 Nginx/Cloudflare Workers 反向代理
 * - 详见部署指南中的 CORS 代理配置方案
 * 
 * HTTPS 说明：
 * - 所有 API 请求均使用 HTTPS 协议
 * - 部署时务必确保页面本身也运行在 HTTPS 环境下
 */

const API_BASE = 'https://api.vkeys.cn/v2/music/tencent';

/**
 * 搜索歌曲
 * @param {string} word - 搜索关键词
 * @param {number} num - 返回数量，默认 60
 * @returns {Promise<Array|null>} 歌曲列表或 null
 */
async function apiSearchSong(word, num = 60) {
    try {
        const res = await fetch(`${API_BASE}/search/song?word=${encodeURIComponent(word)}&num=${num}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('搜索歌曲失败:', e);
        return null;
    }
}

/**
 * 获取搜索建议（智能联想）
 * @param {string} word - 搜索关键词
 * @returns {Promise<Object|null>} 联想数据或 null
 */
async function apiSmartbox(word) {
    try {
        const res = await fetch(`${API_BASE}/search/smartbox?word=${encodeURIComponent(word)}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('获取搜索建议失败:', e);
        return null;
    }
}

/**
 * 获取歌曲播放信息（URL、封面等）
 * @param {string} mid - 歌曲 mid
 * @param {number} quality - 音质 ID（7=标准, 8=HQ, 10=SQ, 14=Hi-Res）
 * @returns {Promise<Object|null>} 歌曲数据或 null
 */
async function apiGetSong(mid, quality = 14) {
    try {
        const res = await fetch(`${API_BASE}?mid=${mid}&quality=${quality}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('获取歌曲信息失败:', e);
        return null;
    }
}

/**
 * 获取歌词
 * @param {string} mid - 歌曲 mid
 * @returns {Promise<Object|null>} 歌词数据 { lrc, trans } 或 null
 */
async function apiGetLyrics(mid) {
    try {
        const res = await fetch(`${API_BASE}/lyric?mid=${mid}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('获取歌词失败:', e);
        return null;
    }
}

/**
 * 获取 MV 播放地址
 * @param {string} vid - MV vid
 * @returns {Promise<string|null>} 最佳画质的 MV URL 或 null
 */
async function apiGetMV(vid) {
    try {
        const res = await fetch(`${API_BASE}/mv?vid=${vid}&type=mp4`);
        const json = await res.json();
        if (json.code === 200 && json.data && json.data.urls && json.data.urls.length > 0) {
            return json.data.urls[json.data.urls.length - 1].url;
        }
        return null;
    } catch (e) {
        console.error('获取 MV 失败:', e);
        return null;
    }
}

/**
 * 获取用户歌单列表
 * @param {string} uin - QQ 号
 * @returns {Promise<Object|null>} 用户歌单数据或 null
 */
async function apiGetUserPlaylists(uin) {
    try {
        const res = await fetch(`${API_BASE}/info?uin=${uin}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('获取用户歌单失败:', e);
        return null;
    }
}

/**
 * 分页获取歌单详情中的歌曲列表
 * @param {string} id - 歌单 ID
 * @param {string} uin - QQ 号
 * @param {number} num - 每页数量
 * @param {number} page - 页码
 * @returns {Promise<Object|null>} 歌单详情数据或 null
 */
async function apiGetPlaylistDetail(id, num, page, uin) {
    try {
        const res = await fetch(`${API_BASE}/dissinfo?id=${id}&num=${num}&page=${page}&uin=${uin}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('获取歌单详情失败:', e);
        return null;
    }
}
