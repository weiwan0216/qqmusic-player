'use strict';

/**
 * webdav.js - WebDAV 纯前端推拉流同步模块
 *
 * 安全提示：
 * - WebDAV 密码以明文形式存储在 LocalStorage 中，这在安全性上存在风险。
 * - 请务必在 HTTPS 环境下使用此功能，以确保传输过程中凭据不被窃取。
 * - 建议使用应用专用密码（App Password）而非主账号密码。
 * - 在公共设备上使用后，请及时清除浏览器存储数据。
 */

const WEBDAV_STORAGE_KEY = 'yoo_webdav';
const WEBDAV_BACKUP_FILENAME = 'yoo_playlists_backup.json';

// ============================================================
// 配置管理
// ============================================================

function getWebdavConfig() {
    try {
        return JSON.parse(localStorage.getItem(WEBDAV_STORAGE_KEY) || '{"url":"", "user":"", "pass":""}');
    } catch {
        return { url: '', user: '', pass: '' };
    }
}

function saveWebdavConfig() {
    const url = document.getElementById('wd-url').value.trim();
    const user = document.getElementById('wd-user').value.trim();
    const pass = document.getElementById('wd-pass').value.trim();
    const config = { url, user, pass };
    localStorage.setItem(WEBDAV_STORAGE_KEY, JSON.stringify(config));
    return config;
}

// ============================================================
// Modal 控制
// ============================================================

function openWebdavModal() {
    const ioMenu = document.getElementById('io-action-menu');
    if (ioMenu) ioMenu.classList.remove('show');

    const config = getWebdavConfig();
    document.getElementById('wd-url').value = config.url;
    document.getElementById('wd-user').value = config.user;
    document.getElementById('wd-pass').value = config.pass;
    document.getElementById('webdav-modal').classList.add('show');
}

function closeWebdavModal() {
    saveWebdavConfig();
    document.getElementById('webdav-modal').classList.remove('show');
}

// ============================================================
// 推送到云端
// ============================================================

async function webdavPush() {
    const config = saveWebdavConfig();
    if (!config.url || !config.user || !config.pass) {
        return showToast('请填写完整的 WebDAV 配置');
    }

    // 安全检查：确保使用 HTTPS
    if (!config.url.startsWith('https://')) {
        showToast('安全警告：建议使用 HTTPS 协议以保护您的凭据安全');
    }

    const pls = getLocalPlaylists();
    const data = JSON.stringify(pls, null, 2);
    const fileUrl = config.url + (config.url.endsWith('/') ? '' : '/') + WEBDAV_BACKUP_FILENAME;

    showToast('正在向云端推送同步...');
    try {
        const res = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': 'Basic ' + btoa(config.user + ':' + config.pass),
                'Content-Type': 'application/json'
            },
            body: data
        });

        if (res.ok || res.status === 201 || res.status === 204) {
            showToast('推送云端成功！');
        } else {
            showToast(`推送失败: ${res.status} (可能遇到跨域或配置错误)`);
        }
    } catch (e) {
        console.error('WebDAV Push Error:', e);
        showToast('推送失败：请检查网络或是否受到跨域(CORS)限制');
    }
}

// ============================================================
// 从云端拉取
// ============================================================

async function webdavPull() {
    const config = saveWebdavConfig();
    if (!config.url || !config.user || !config.pass) {
        return showToast('请填写完整的 WebDAV 配置');
    }

    const fileUrl = config.url + (config.url.endsWith('/') ? '' : '/') + WEBDAV_BACKUP_FILENAME;
    showToast('正在从云端拉取数据...');

    try {
        const res = await fetch(fileUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(config.user + ':' + config.pass),
                'Cache-Control': 'no-cache'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                saveLocalPlaylists(data);
                renderPlaylistHome(false);
                showToast('拉取云端成功并已覆盖本地！');
            } else {
                showToast('云端数据格式异常');
            }
        } else if (res.status === 404) {
            showToast('未在云端找到备份文件，请先推送。');
        } else {
            showToast(`拉取失败: ${res.status}`);
        }
    } catch (e) {
        console.error('WebDAV Pull Error:', e);
        showToast('拉取失败：请检查网络或是否受到跨域(CORS)限制');
    }
}
