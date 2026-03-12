'use strict';

/**
 * batch.js - 批量操作与拖拽排序模块
 *
 * 包含：批量选择、全选/取消全选、批量删除、拖拽排序
 */

let selectedBatchIds = [];

// ============================================================
// 批量操作弹窗
// ============================================================

function openBatchModal() {
    selectedBatchIds = [];
    document.getElementById('batch-modal').classList.add('show');
    renderBatchList();
}

function closeBatchModal() {
    document.getElementById('batch-modal').classList.remove('show');
    selectedBatchIds = [];
}

function toggleBatchCb(id) {
    const index = selectedBatchIds.indexOf(id);
    if (index > -1) {
        selectedBatchIds.splice(index, 1);
    } else {
        selectedBatchIds.push(id);
    }
    const cb = document.querySelector(`.batch-item[data-id="${CSS.escape(id)}"] .batch-cb`);
    if (cb) {
        if (index > -1) cb.classList.remove('checked');
        else cb.classList.add('checked');
    }
    updateBatchFooter();
}

function toggleSelectAll() {
    const pls = getLocalPlaylists();
    if (selectedBatchIds.length === pls.length && pls.length > 0) {
        selectedBatchIds = [];
    } else {
        selectedBatchIds = pls.map(p => p.id);
    }
    document.querySelectorAll('.batch-cb').forEach(cb => {
        if (selectedBatchIds.length === 0) cb.classList.remove('checked');
        else cb.classList.add('checked');
    });
    updateBatchFooter();
}

function updateBatchFooter() {
    const btn = document.getElementById('batch-delete-btn');
    const selectAllText = document.getElementById('batch-select-all');
    const pls = getLocalPlaylists();

    if (selectedBatchIds.length === pls.length && pls.length > 0) {
        selectAllText.textContent = '取消全选';
    } else {
        selectAllText.textContent = '全选';
    }

    if (selectedBatchIds.length > 0) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

function deleteSelectedBatch() {
    if (selectedBatchIds.length === 0) return showToast('未选择任何歌单');
    if (confirm(`确定要删除选中的 ${selectedBatchIds.length} 个歌单吗？`)) {
        let pls = getLocalPlaylists();
        pls = pls.filter(p => !selectedBatchIds.includes(p.id));
        saveLocalPlaylists(pls);
        selectedBatchIds = [];
        renderBatchList();
        renderPlaylistHome(false);
        showToast('批量删除成功');
    }
}

// ============================================================
// 批量列表渲染
// ============================================================

function renderBatchList() {
    const pls = getLocalPlaylists();
    const container = document.getElementById('batch-list-container');
    if (pls.length === 0) {
        container.innerHTML = '<div class="empty-state" style="margin-top:20vh;">暂无可操作的自建歌单</div>';
        updateBatchFooter();
        return;
    }
    container.innerHTML = pls.map(p => {
        const isChecked = selectedBatchIds.includes(p.id);
        const checkClass = isChecked ? 'checked' : '';
        const coverUrl = p.customCover || (p.songs && p.songs.length > 0 ? p.songs[0].cover : null);
        const safeName = escapeHTML(p.name);
        const safeId = escapeAttr(p.id);
        const cover = coverUrl
            ? `<img src="${escapeAttr(coverUrl)}">`
            : `<div class="playlist-cover-placeholder"><svg width="24" height="24" fill="var(--primary)" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`;

        return `
        <div class="batch-item" data-id="${safeId}">
            <div class="batch-cb-wrapper" data-batch-id="${safeId}">
                <div class="batch-cb ${checkClass}"></div>
            </div>
            ${cover}
            <div class="batch-info">
                <div class="batch-info-title">${safeName}</div>
                <div class="batch-info-sub">${p.songs.length} 首来自 自建</div>
            </div>
            <div class="batch-handle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
            </div>
        </div>`;
    }).join('');

    // 绑定复选框事件
    container.querySelectorAll('.batch-cb-wrapper').forEach(el => {
        el.addEventListener('click', () => toggleBatchCb(el.dataset.batchId));
    });

    updateBatchFooter();
    initBatchDrag();
}

// ============================================================
// 拖拽排序核心逻辑
// ============================================================

function initBatchDrag() {
    const list = document.getElementById('batch-list-container');
    const items = list.querySelectorAll('.batch-item');

    let draggedElement = null;
    let ghost = null;
    let startY = 0;
    let offsetY = 0;

    items.forEach(item => {
        const handle = item.querySelector('.batch-handle');

        // 触摸拖拽
        handle.addEventListener('touchstart', (e) => {
            draggedElement = item;
            const touch = e.touches[0];
            const rect = item.getBoundingClientRect();
            startY = touch.clientY;
            offsetY = startY - rect.top;

            ghost = item.cloneNode(true);
            ghost.classList.add('batch-drag-ghost');
            const ghostCb = ghost.querySelector('.batch-cb-wrapper');
            if (ghostCb) ghostCb.style.display = 'none';

            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
            document.body.appendChild(ghost);

            item.classList.add('dragging-active');
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            if (!draggedElement || !ghost) return;
            e.preventDefault();
            const touch = e.touches[0];
            ghost.style.top = (touch.clientY - offsetY) + 'px';

            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetItem = target ? target.closest('.batch-item:not(.dragging-active)') : null;

            if (targetItem && targetItem !== draggedElement) {
                const rect = targetItem.getBoundingClientRect();
                const next = (touch.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                const insertBeforeNode = next ? targetItem.nextSibling : targetItem;
                if (insertBeforeNode !== draggedElement && insertBeforeNode !== draggedElement.nextSibling) {
                    list.insertBefore(draggedElement, insertBeforeNode);
                }
            }
        }, { passive: false });

        handle.addEventListener('touchend', () => {
            if (!draggedElement) return;
            draggedElement.classList.remove('dragging-active');
            if (ghost) {
                ghost.remove();
                ghost = null;
            }
            draggedElement = null;
            saveBatchOrder();
        });

        // 鼠标拖拽
        handle.addEventListener('mousedown', () => {
            draggedElement = item;
            item.classList.add('dragging');
            item.setAttribute('draggable', 'true');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            item.removeAttribute('draggable');
            draggedElement = null;
            saveBatchOrder();
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedElement || draggedElement === item) return;
            const rect = item.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            list.insertBefore(draggedElement, next ? item.nextSibling : item);
        });
    });
}

function saveBatchOrder() {
    const items = document.querySelectorAll('.batch-item');
    const newOrderIds = Array.from(items).map(item => item.dataset.id);
    let pls = getLocalPlaylists();
    pls.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
    saveLocalPlaylists(pls);
    if (document.getElementById('qq-playlists-container')) {
        renderPlaylistHome(false);
    }
}
