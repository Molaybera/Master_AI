// ═══════════════════════════════════════════════════
//  SYSTEM AGENT UI
// ═══════════════════════════════════════════════════

// ── Breadcrumb updater ────────────────────────────────────────────────────────
function updateBreadcrumb(displayCwd) {
    const bar   = document.getElementById('cwd-bar');
    const label = document.getElementById('cwd-label');
    if (!bar || !label) return;

    if (!displayCwd || displayCwd === '.') {
        label.textContent = 'workspace root';
    } else {
        // Convert both slash types to > separated display
        label.textContent = displayCwd.replace(/\\/g, '/').split('/').join(' › ');
    }
    bar.classList.remove('hidden');
}

// ── Load cwd on page init ─────────────────────────────────────────────────────
async function loadCwd() {
    try {
        const res = await fetch('/api/system/cwd', { credentials: 'include' });
        if (res.ok) {
            const d = await res.json();
            if (d.success) updateBreadcrumb(d.displayCwd);
        }
    } catch (_) {}
}

// ── Reset to workspace root ───────────────────────────────────────────────────
async function resetToRoot() {
    try {
        const res = await fetch('/api/system/reset-cwd', {
            method: 'POST', credentials: 'include'
        });
        if (res.ok) {
            const d = await res.json();
            if (d.success) updateBreadcrumb(d.displayCwd);
        }
    } catch (_) {}
}

// ── Lock old pending system task buttons ──────────────────────────────────────
function lockOldSystemTasks(lockAll = false) {
    const allSysBtns = Array.from(document.querySelectorAll('button[id^="btn_sys_"]'));
    const toLock = lockAll ? allSysBtns : allSysBtns.slice(0, -1);
    toLock.forEach(btn => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-lock"></i> SUPERSEDED';
        btn.className = 'px-5 py-2.5 bg-slate-800/60 text-slate-500 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-50 cursor-not-allowed';
        const card = btn.closest('.space-y-4');
        if (card) card.style.opacity = '0.45';
    });
}

function formatWorkspaceLabel(data) {
    const display = (data && typeof data.displayCwd === 'string') ? data.displayCwd : '';
    return display && display !== '.' ? display : 'workspace root';
}

// ── Build system task card ────────────────────────────────────────────────────
function buildSystemTask(data, content) {
    const uid        = 'sys_' + Date.now() + Math.random().toString(36).slice(2, 6);
    const isExecuted = data.taskExecuted === true;

    const payload = {
        action:     data.action,
        targetPath: data.path,
        destPath:   data.dest  || '',
        content:    data.code  || ''
    };
    const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    // ── Icon / title / button label per action ────────────────────────────────
    let icon    = 'fa-terminal';
    let title   = 'System Command';
    let btnText = 'Allow & Execute';
    let borderColor = 'rose';

    switch (data.action) {
        case 'create_folder': icon = 'fa-folder-plus';       title = 'Create Folder';                                                           break;
        case 'create_file':   icon = 'fa-file-code';         title = 'Create File';                                                             break;
        case 'open_path':     icon = 'fa-folder-open';       title = 'Open Path';         btnText = 'Open';                                     break;
        case 'read_file':     icon = 'fa-folder-open';       title = 'Read Path';         btnText = 'Read';                                     break;
        case 'delete_file':   icon = 'fa-file-circle-xmark'; title = 'Delete File';                                                             break;
        case 'delete_folder': icon = 'fa-folder-minus';      title = 'Delete Folder';                                                           break;
        case 'rename_file':   icon = 'fa-pen-clip';          title = 'Rename File';                                                             break;
        case 'rename_folder': icon = 'fa-pen-clip';          title = 'Rename Folder';                                                           break;
        case 'move_file':     icon = 'fa-truck-fast';        title = 'Move File';                                                               break;
        case 'copy_file':     icon = 'fa-copy';              title = 'Copy File';                                                               break;
        case 'run_file':      icon = 'fa-play';              title = 'Run File';          btnText = 'Run';              borderColor = 'emerald'; break;
    }

    // ── Colour scheme ─────────────────────────────────────────────────────────
    const colors = {
        rose:    { border: 'border-rose-500/30',    bg: 'rgba(225,29,72,0.05)',    tag: 'rgba(251,113,133,.9)',  tagBorder: 'rgba(251,113,133,.2)',  tagBg: 'rgba(251,113,133,.1)',  icon: 'text-rose-400',    btn: 'bg-rose-600 hover:bg-rose-500'       },
        blue:    { border: 'border-blue-500/30',    bg: 'rgba(59,130,246,0.05)',   tag: 'rgba(96,165,250,.9)',   tagBorder: 'rgba(96,165,250,.2)',   tagBg: 'rgba(96,165,250,.1)',   icon: 'text-blue-400',    btn: 'bg-blue-600 hover:bg-blue-500'       },
        emerald: { border: 'border-emerald-500/30', bg: 'rgba(16,185,129,0.05)',   tag: 'rgba(52,211,153,.9)',   tagBorder: 'rgba(52,211,153,.2)',   tagBg: 'rgba(52,211,153,.1)',   icon: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500' },
    };
    const c = colors[borderColor] || colors.rose;

    // ── Button HTML ───────────────────────────────────────────────────────────
    const btnHtml = isExecuted
        ? `<button disabled id="btn_${uid}" class="px-5 py-2.5 bg-emerald-900/40 text-emerald-400 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-70 cursor-not-allowed">
               <i class="fas fa-check"></i> EXECUTED
           </button>`
        : `<button id="btn_${uid}" onclick="executeSystemTask('${uid}', this, '${encodedPayload}')" style="cursor:pointer;"
               class="px-5 py-2.5 ${c.btn} text-white rounded-md text-[11px] font-bold tracking-widest uppercase transition-colors flex items-center gap-2">
               <i class="fas fa-bolt"></i> ${btnText}
           </button>`;

    // ── Card HTML ─────────────────────────────────────────────────────────────
    let html = `
    <div class="space-y-4 p-5 rounded-xl border ${c.border}" style="background:${c.bg}">
        <div class="flex items-center gap-3 border-b ${c.border} pb-4">
            <div class="w-8 h-8 rounded-lg bg-current/10 border ${c.border} flex items-center justify-center flex-shrink-0"
                 style="background:${c.tagBg}">
                <i class="fas ${icon} ${c.icon} text-xs"></i>
            </div>
            <span class="topic-tag" style="color:${c.tag};border-color:${c.tagBorder};background:${c.tagBg}">
                SYSTEM AGENT
            </span>
            <span class="mono text-[9px] ml-auto border px-2 py-0.5 rounded flex items-center gap-1"
                  style="color:${c.tag};border-color:${c.tagBorder}">
                <i class="fas fa-shield-halved text-[8px]"></i>
                ${isExecuted ? 'COMPLETED' : 'APPROVAL REQUIRED'}
            </span>
        </div>

        <div class="space-y-2 text-[13px] px-1">
            <div class="flex items-start gap-2">
                <span class="text-slate-500 w-16 mt-0.5">Action:</span>
                <div class="font-semibold text-slate-200">${title}</div>
            </div>
            ${data.path ? `
            <div class="flex items-start gap-2">
                <span class="text-slate-500 w-16 mt-0.5">Target:</span>
                <div class="font-mono px-2 py-1.5 rounded w-full break-all bg-black/20"
                     style="color:${c.tag}">${xHtml(data.path)}</div>
            </div>` : ''}
            ${data.dest ? `
            <div class="flex items-start gap-2 mt-2">
                <span class="text-slate-500 w-16 mt-0.5">Dest:</span>
                <div class="font-mono text-amber-300 bg-black/20 px-2 py-1.5 rounded w-full break-all">${xHtml(data.dest)}</div>
            </div>` : ''}
        </div>`;

    // Brief description
    if (content) {
        html += `<div class="prose-content p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 mt-2 text-slate-400 text-[12px]">${content}</div>`;
    }

    // Code preview for create/edit
    if (data.code && data.action === 'create_file') {
        const lines = data.code.split('\n');
        html += `
        <div class="code-terminal mt-3">
            <div class="terminal-header">
                <div class="terminal-dots">
                    <span class="dot-red"></span><span class="dot-amber"></span><span class="dot-green"></span>
                </div>
                <span class="mono text-[9px] text-slate-500 uppercase tracking-wider">File Content Preview</span>
            </div>
            <div class="terminal-body" style="max-height:220px;overflow-y:auto;">
                <div class="line-numbers">${lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join('')}</div>
                <pre class="code-content">${xHtml(data.code)}</pre>
            </div>
        </div>`;
    }

    html += `
        <div class="mt-4 flex justify-end border-t pt-4" style="border-color:${c.tagBorder}">
            ${btnHtml}
        </div>
    </div>`;

    return html;
}

// ── Execute system task ───────────────────────────────────────────────────────
async function executeSystemTask(uid, btn, encodedPayload) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> EXECUTING...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(encodedPayload))));

        const res = await fetch('/api/system/execute', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        // ── Handle delete folder confirmation ─────────────────────────────────
        if (payload.action === 'delete_folder' && data.requiresConfirmation && data.isNotEmpty) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> Allow & Delete';
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            appendBotCard({
                type: 'general', topic: 'DELETE CONFIRMATION REQUIRED',
                content: `<b>${xHtml(data.message)}</b><br><br><span style="color:#fca5a5;">This action CANNOT be undone.</span>`,
                risk_level: 'High', prevention: 'N/A'
            }, true);
            
            // Create payload with force delete flag
            const forcePayload = { ...payload, forceDelete: true };
            const newEncodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(forcePayload))));
            
            // Replace button onclick to confirm deletion
            btn.onclick = () => executeSystemTask(uid, btn, newEncodedPayload);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Delete ALL';
            btn.className = 'px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-[11px] font-bold tracking-widest uppercase transition-colors flex items-center gap-2';
            return;
        }

        if (res.ok && data.success) {
            // ── Update button ─────────────────────────────────────────────────
            btn.innerHTML = '<i class="fas fa-check"></i> EXECUTED SUCCESSFULLY';
            btn.className = 'px-5 py-2.5 bg-emerald-900/40 text-emerald-400 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-90 cursor-not-allowed';
            btn.disabled  = true;

            // ── Read/list: show contents in chat ─────────────────────────────
            if (payload.action === 'read_file' && data.data && data.data.content) {
                const pathLabel = (payload.targetPath || '.').replace(/\\/g, '/');
                const name = pathLabel.split('/').pop() || 'workspace';
                appendBotCard({
                    type: 'coding',
                    topic: `Contents: ${name}`,
                    content: `<b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`,
                    code: data.data.content,
                    risk_level: 'None', prevention: 'N/A'
                }, true);
                persistSystemResult(payload, data);
                return;
            }

            // ── Run file: show stdout ─────────────────────────────────────────
            if (payload.action === 'run_file' && data.data && data.data.content) {
                appendBotCard({
                    type: 'coding',
                    topic: `Output: ${payload.targetPath}`,
                    content: `Execution output:<br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`,
                    code: data.data.content,
                    risk_level: 'None', prevention: 'N/A'
                }, true);
                persistSystemResult(payload, data);
                return;
            }

            // ── Open path: show system-launch result ─────────────────────────
            if (payload.action === 'open_path') {
                const openDetails = data.data && data.data.openedWith
                    ? `<br><b>Opened With:</b> ${xHtml(data.data.openedWith)}`
                    : '';
                const targetDetails = data.data && data.data.target
                    ? `<br><b>Target:</b> ${xHtml(data.data.target)}`
                    : (payload.targetPath ? `<br><b>Target:</b> ${xHtml(payload.targetPath)}` : '');
                appendBotCard({
                    type: 'general', topic: 'Open Path',
                    content: `<b>✓ ${data.message}</b>${openDetails}${targetDetails}<br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`,
                    risk_level: 'None', prevention: 'N/A'
                }, true);
                persistSystemResult(payload, data);
                return;
            }

            // ── All other actions ─────────────────────────────────────────────
            let content = `<b>✓ ${data.message}</b><br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`;
            let riskLevel = 'None';
            let prevention = 'N/A';
            let cardTopic = 'System Update';
            
            // Handle delete folder warning
            if (payload.action === 'delete_folder' && data.wasNotEmpty) {
                content = `<b>⚠️  Warning:</b> Folder contained items and was force-deleted.<br><b>✓ ${data.message}</b><br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`;
                riskLevel = 'Medium';
                prevention = 'Folder with contents was deleted';
                cardTopic = 'Folder Deleted (With Contents)';
            }
            
            appendBotCard({
                type: 'general', topic: cardTopic,
                content: content,
                risk_level: riskLevel, prevention: prevention
            }, true);
            persistSystemResult(payload, data);

        } else {
            if (payload.action === 'delete_folder' && data.requiresConfirmation && data.isNotEmpty) {
                return;
            }
            throw new Error(data.message || 'Server error during execution');
        }

    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bolt"></i> Retry';
        btn.classList.remove('opacity-50', 'cursor-not-allowed');

        const msg = String(err.message || 'Unknown error');
        const isDisabled = /disabled/i.test(msg);
        if (isDisabled) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-ban"></i> Disabled';
            btn.className = 'px-5 py-2.5 bg-slate-800/60 text-slate-400 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-80 cursor-not-allowed';
        }

        appendBotCard({
            type: 'general', topic: 'Execution Blocked',
            content: `System Agent encountered an error.<br><br><b>Error:</b> ${xHtml(err.message)}`,
            risk_level: 'High', prevention: 'N/A'
        }, true);
    }
}

// ── Persist executed state to localStorage ────────────────────────────────────
function persistSystemResult(payload, data) {
    if (typeof chats === 'undefined' || typeof currentChatId === 'undefined') return;
    const cur = chats.find(c => c.id === currentChatId);
    if (!cur) return;

    // Mark the most recent unexecuted system task as done
    const sysMsg = [...cur.messages].reverse().find(m =>
        m.role === 'bot' && m.data && m.data.type === 'system' && !m.data.taskExecuted
    );
    if (sysMsg) sysMsg.data.taskExecuted = true;

    // Build result card for persistence
    let resultCard;
    if ((payload.action === 'read_file' || payload.action === 'run_file') && data.data?.content) {
        const pathLabel = (payload.targetPath || '.').replace(/\\/g, '/');
        const name = pathLabel.split('/').pop() || 'workspace';
        resultCard = {
            type: 'coding',
            topic: payload.action === 'run_file' ? `Output: ${name}` : `Contents: ${name}`,
            content: payload.action === 'run_file'
                ? `Execution output:<br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`
                : `<b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`,
            code: data.data.content,
            risk_level: 'None', prevention: 'N/A'
        };
    } else {
        resultCard = {
            type: 'general', topic: 'System Update',
            content: `<b>✓ ${data.message}</b><br><b>Workspace:</b> ${xHtml(formatWorkspaceLabel(data))}`,
            risk_level: 'None', prevention: 'N/A'
        };
    }

    cur.messages.push({ role: 'bot', data: resultCard });
    if (typeof save === 'function') save();
}