'use strict';
// ═══════════════════════════════════════════════════
//  DOM REFS  — grabbed once, never re-queried
// ═══════════════════════════════════════════════════
const chatWindow     = document.getElementById('chat-window');
const msgArea        = document.getElementById('msg-area');       // FIXED: static reference, never recreated
const emptyState     = document.getElementById('empty-state');
const historyList    = document.getElementById('chat-history-list');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');
const neuralSync     = document.getElementById('neural-sync');
const charCountEl    = document.getElementById('char-count');
const navTitle       = document.getElementById('nav-title');
const userDisplay    = document.getElementById('user-display');
const gpuStats       = document.getElementById('gpu-stats');
const renameModal    = document.getElementById('rename-modal');
const renameField    = document.getElementById('rename-field');

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let chats = [];
let currentChatId = null;
let renamingChatId = null;
let isProcessing = false;

try {
    chats = JSON.parse(localStorage.getItem('master_chats') || '[]');
} catch { chats = []; }

// ═══════════════════════════════════════════════════
//  INIT — runs on page load
// ═══════════════════════════════════════════════════
async function init() {
    // Load username
    try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            const name = d?.user?.username || d?.username || null;
            if (name) userDisplay.textContent = name.toUpperCase();
        }
    } catch (_) { /* server might be down — leave as "—" */ }

    // Load chats
    if (chats.length > 0) {
        currentChatId = chats[0].id;
        renderHistory();
        loadChat(chats[0]);
    } else {
        createNewChat();
    }
}

// ═══════════════════════════════════════════════════
//  TYPEWRITER ENGINE
// ═══════════════════════════════════════════════════
function tokeniseHtml(html) {
    const out = [], re = /<[^>]+>/g;
    let pos = 0, m;
    while ((m = re.exec(html)) !== null) {
        if (m.index > pos) out.push({ k:'t', v: html.slice(pos, m.index) });
        out.push({ k:'h', v: m[0] });
        pos = m.index + m[0].length;
    }
    if (pos < html.length) out.push({ k:'t', v: html.slice(pos) });
    return out;
}
const raf = () => new Promise(r => requestAnimationFrame(r));

async function typewriterInto(el, html, speed = 4) {
    const tokens = tokeniseHtml(html);
    let built = '';
    const CUR = '<span class="tw-cur"></span>';
    for (const tok of tokens) {
        if (tok.k === 'h') {
            built += tok.v;
            el.innerHTML = built + CUR;
        } else {
            for (let i = 0; i < tok.v.length; i += speed) {
                built += tok.v.slice(i, i + speed);
                el.innerHTML = built + CUR;
                scrollDown();
                await raf();
            }
        }
    }
    el.innerHTML = built;
    scrollDown();
}

// ═══════════════════════════════════════════════════
//  CHAT MANAGEMENT
// ═══════════════════════════════════════════════════
function save() {
    try { localStorage.setItem('master_chats', JSON.stringify(chats)); } catch(_) {}
}

function createNewChat() {
    const c = { id: Date.now(), title: 'New Investigation', messages: [] };
    chats.unshift(c);
    currentChatId = c.id;
    save();
    renderHistory();
    clearMsgArea();
    setNavTitle('NEW UPLINK');
}

function deleteChat(id, e) {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    save();
    if (chats.length === 0) {
        createNewChat();
    } else {
        if (currentChatId === id) {
            currentChatId = chats[0].id;
            renderHistory();
            loadChat(chats[0]);
        } else {
            renderHistory();
        }
    }
}

function openRenameModal(id, e) {
    if (e) e.stopPropagation();
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    renamingChatId = id;
    renameField.value = chat.title;
    renameModal.classList.add('open');
    setTimeout(() => { renameField.focus(); renameField.select(); }, 60);
}

function closeRenameModal() {
    renameModal.classList.remove('open');
    renamingChatId = null;
}

function confirmRename() {
    const val = renameField.value.trim();
    if (!val || !renamingChatId) { closeRenameModal(); return; }
    const chat = chats.find(c => c.id === renamingChatId);
    if (chat) {
        chat.title = val;
        if (renamingChatId === currentChatId) setNavTitle(val);
        save();
        renderHistory();
    }
    closeRenameModal();
}

function setNavTitle(t) {
    navTitle.textContent = t.toUpperCase().replace(/ /g, '_').slice(0, 30);
}

// ═══════════════════════════════════════════════════
//  DOM HELPERS — operate on the STATIC msgArea node
// ═══════════════════════════════════════════════════
function clearMsgArea() {
    // Remove all children except emptyState
    while (msgArea.lastChild && msgArea.lastChild !== emptyState) {
        msgArea.removeChild(msgArea.lastChild);
    }
    if (!msgArea.contains(emptyState)) msgArea.appendChild(emptyState);
    showEmpty(true);
}

function showEmpty(v) {
    emptyState.style.display = v ? 'flex' : 'none';
}

function scrollDown() {
    requestAnimationFrame(() => { chatWindow.scrollTop = chatWindow.scrollHeight; });
}

// ═══════════════════════════════════════════════════
//  HISTORY SIDEBAR
// ═══════════════════════════════════════════════════
function renderHistory() {
    historyList.innerHTML = '';
    chats.forEach(chat => {
        const el = document.createElement('div');
        el.className = 'history-item group' + (chat.id === currentChatId ? ' active' : '');
        el.addEventListener('click', () => {
            if (currentChatId === chat.id) return;
            currentChatId = chat.id;
            renderHistory();
            loadChat(chat);
        });
        el.addEventListener('dblclick', e => openRenameModal(chat.id, e));
        el.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden min-w-0">
                <i class="far fa-message text-[9px] opacity-40 flex-shrink-0"></i>
                <span class="truncate text-[12px]">${xHtml(chat.title)}</span>
            </div>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                <button class="p-1.5 rounded hover:text-blue-400 text-slate-600 transition-colors" title="Rename">
                    <i class="fas fa-pen text-[8px]"></i>
                </button>
                <button class="p-1.5 rounded hover:text-red-400 text-slate-600 transition-colors" title="Delete">
                    <i class="fas fa-trash-can text-[8px]"></i>
                </button>
            </div>`;
        // Wire rename/delete buttons
        const btns = el.querySelectorAll('button');
        btns[0].addEventListener('click', e => openRenameModal(chat.id, e));
        btns[1].addEventListener('click', e => deleteChat(chat.id, e));
        historyList.appendChild(el);
    });
}

// ═══════════════════════════════════════════════════
//  LOAD CHAT MESSAGES
// ═══════════════════════════════════════════════════
function loadChat(chat) {
    clearMsgArea();
    setNavTitle(chat.title);
    if (chat.messages && chat.messages.length > 0) {
        chat.messages.forEach(m => {
            if (m.role === 'user') appendUserBubble(m.text);
            else appendBotCard(m.data);
        });
        scrollDown();
    }
}

// ═══════════════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════════════
async function sendMessage() {
    if (isProcessing) return;
    const msg = userInput.value.trim();
    
    // Prevent sending if both text and document are empty
    if (!msg && !window.currentDocumentContext) return;

    isProcessing = true;
    if (typeof lockOldSystemTasks === 'function') lockOldSystemTasks(true);
    userInput.value = '';
    charCountEl.textContent = '0';
    charCountEl.classList.remove('warn');

    document.querySelector('.input-wrap').classList.add('locked');
    sendBtn.disabled = true;

    // Show user bubble
    const displayMsg = msg || `[Attached Document: ${window.currentDocumentName}]`;
    appendUserBubble(displayMsg);
    showEmpty(false);

    // Save to history including the hidden document context
    const cur = chats.find(c => c.id === currentChatId);
    if (cur) {
        cur.messages.push({ 
            role: 'user', 
            text: displayMsg,
            docContext: window.currentDocumentContext ? `[SYSTEM: The user has attached a document named '${window.currentDocumentName}'. Read the content below and refer to it to answer their query.]\n\n<DOCUMENT_CONTENT>\n${window.currentDocumentContext}\n</DOCUMENT_CONTENT>` : null
        });
        save();
    }

    // Clear the attachment UI safely
    if (window.currentDocumentContext) {
        window.currentDocumentContext = "";
        window.currentDocumentName = "";
        const fileUploadEl = document.getElementById('file-upload');
        if(fileUploadEl) fileUploadEl.value = "";
        const chip = document.getElementById('attachment-chip');
        if(chip) {
            chip.classList.add('hidden');
            chip.classList.remove('flex');
        }
    }

    neuralSync.classList.remove('hidden');
    gpuStats.textContent = Math.floor(Math.random() * 40 + 30) + '%';

    let parsed = null;

    try {
        const historyForApi = [];
        if (cur && cur.messages.length > 0) {
            const recentMsgs = cur.messages.slice(-20);
            for (const m of recentMsgs) {
                if (m.role === 'user') {
                    // Inject hidden document context into API request
                    let apiContent = m.text;
                    if (m.docContext) {
                        apiContent = `${m.docContext}\n\nUser Query: ${m.text}`;
                    }
                    historyForApi.push({ role: 'user', content: apiContent });
                } else if (m.role === 'bot' && m.data) {
                    const botText = m.data.content
                        ? m.data.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g,' ').trim().slice(0, 400)
                        : (m.data.topic || '');
                    if (botText) historyForApi.push({ role: 'assistant', content: botText });
                }
            }
        }

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message: msg || "Please analyze the attached document.", history: historyForApi })
        });

        if (res.status === 401) {
            const d = await res.json().catch(() => ({}));
            appendBotCard({
                type:'general', topic:'Session Expired',
                content:'Your session has expired.<br><br>Please <a href="/login" style="color:#38bdf8;text-decoration:underline">log in again</a> to continue.',
                code:'', items:[], risk_level:'None', prevention:'N/A'
            }, true);
            return;
        }

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        const raw = data.reply || data.message || data.response || data.text || JSON.stringify(data);

        try { parsed = robustParse(raw); }
        catch { parsed = parseRawText(raw); }

    } catch (err) {
        console.error('[MASTER] fetch error:', err);
        parsed = {
            type: 'general',
            topic: 'Connection Error',
            content: `Could not reach the server.<br><br><b>Error:</b> ${xHtml(String(err.message || err))}<br><br>Make sure the backend is running and try again.`,
            risk_level: 'None',
            prevention: 'N/A'
        };
    } finally {
        neuralSync.classList.add('hidden');
        gpuStats.textContent = '2%';
        isProcessing = false;
        document.querySelector('.input-wrap').classList.remove('locked');
        updateSendBtn();
        setTimeout(() => userInput.focus(), 100);
    }

    if (cur && cur.title === 'New Investigation' && parsed.topic) {
        cur.title = parsed.topic.slice(0, 40);
        setNavTitle(cur.title);
    }

    if (cur) { cur.messages.push({ role: 'bot', data: parsed }); save(); renderHistory(); }
    appendBotCard(parsed, true);
}

// ═══════════════════════════════════════════════════
//  USER BUBBLE
// ═══════════════════════════════════════════════════
function appendUserBubble(text) {
    showEmpty(false);
    const div = document.createElement('div');
    div.className = 'flex flex-col items-end animate-up';
    div.innerHTML = `
        <p class="mono text-[8px] text-slate-600 mb-2 tracking-widest uppercase px-1">You</p>
        <div style="background:rgba(30,58,138,0.2);border:1px solid rgba(56,189,248,0.2)"
             class="px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm text-blue-50 font-light max-w-lg leading-relaxed">
            ${xHtml(text)}
        </div>`;
    msgArea.appendChild(div);
    scrollDown();
}

// ═══════════════════════════════════════════════════
//  BOT CARD RENDERER
// ═══════════════════════════════════════════════════
function appendBotCard(data, animate = false) {
    showEmpty(false);
    const wrap = document.createElement('div');
    if (animate) wrap.className = 'animate-up';

    // ── Type correction: if code field is non-empty, always use coding renderer
    // This catches cases where the model returns type:"general" but has code.
    if ((data.code || '').trim().length > 0 && data.type !== 'coding' && data.type !== 'email' && data.type !== 'system') {
        data = { ...data, type: 'coding' };
    }
    // If items array has entries and type wasn't set to security/coding/email, use list
    if (Array.isArray(data.items) && data.items.length > 0
        && data.type !== 'coding' && data.type !== 'security' && data.type !== 'email') {
        data = { ...data, type: 'list' };
    }

    // Strip legal/portfolio from content
    let raw = String(data.content || '');
    let legalHtml = '', portHtml = '';
    const lm = raw.match(/<div class=['"]legal-footer['"][^>]*>[\s\S]*?<\/div>/);
    if (lm) { legalHtml = lm[0]; raw = raw.replace(lm[0], '').trim(); }
    const pm = raw.match(/<div class=['"]portfolio-badge['"][^>]*>[\s\S]*?<\/div>/);
    if (pm) { portHtml = pm[0]; raw = raw.replace(pm[0], '').trim(); }

    const content = md2html(raw);

    const legalBlock = (legalHtml || data.risk_level === 'High' || data.risk_level === 'Critical') ? `
        <div class="legal-block mt-4">
            <i class="fas fa-triangle-exclamation text-red-500/70 text-xs flex-shrink-0 mt-0.5"></i>
            <p class="mono text-[10px] text-red-400/70 leading-relaxed">
                LEGAL WARNING: Unauthorized access to computer systems is a crime.
                This knowledge is for ethical and educational purposes only.
            </p>
        </div>` : '';

    let html = '';
    switch (data.type) {
        case 'security': html = buildSecurity(data, content) + legalBlock; break;
        case 'coding':   html = buildCoding(data, content);                 break;
        case 'list':     html = buildList(data, content) + legalBlock;      break;
        case 'email':    html = buildEmail(data, content) + legalBlock;     break;
        case 'system':   html = buildSystemTask(data, content) + legalBlock; break;
        default:         html = buildGeneral(data, content) + legalBlock;   break;
    }
    if (portHtml) html += portHtml;

    wrap.innerHTML = html;
    
    wrap.querySelectorAll('[data-tw]').forEach(el => {
        el._twContent = el.getAttribute('data-tw');
        el.removeAttribute('data-tw');
    });
    msgArea.appendChild(wrap);

    // Typewriter on prose elements
    if (animate) {
        const twElReal = [...wrap.querySelectorAll('.prose-content')].find(el => el._twContent !== undefined);
        if (twElReal && twElReal._twContent) {
            const original = twElReal._twContent;
            const isRichHtml = /<(table|pre|div|h[1-6])\b/i.test(original);
            if (isRichHtml) {
                twElReal.innerHTML = original;
            } else {
                twElReal.innerHTML = '';
                typewriterInto(twElReal, original, 3);
            }
        }
    }
    scrollDown();
    if (data.type === 'email') lockOldEmailDrafts();
    if (data.type === 'system') lockOldSystemTasks(false);
}

// ═══════════════════════════════════════════════════
//  HTML BUILDERS
// ═══════════════════════════════════════════════════
function buildSecurity(data, content) {
    return `
    <div class="response-card risk-${data.risk_level} p-6 space-y-5">
        <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-shield-halved text-blue-400 text-xs"></i>
                </div>
                <span class="topic-tag">${xHtml(cleanTopic(data.topic))}</span>
            </div>
            <span class="risk-badge ${data.risk_level || 'None'}">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>${data.risk_level || 'None'}
            </span>
        </div>
        <div class="prose-content" ${/<(table|pre|div|h[1-6])\b/i.test(content) ? '' : `data-tw="${xAttr(content)}"`}>${content}</div>
        ${data.prevention && data.prevention !== 'N/A' ? `
        <div class="defense-box">
            <div class="flex items-start gap-3">
                <i class="fas fa-user-shield text-emerald-500/80 text-sm flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="mono text-[8px] text-emerald-500/60 uppercase tracking-widest mb-1.5">Defense Protocol</p>
                    <p class="text-[13px] text-emerald-400/90 leading-relaxed">${xHtml(data.prevention)}</p>
                </div>
            </div>
        </div>` : ''}
    </div>`;
}

function buildTerminalBlock(code, lang, uid) {
    const cleaned = cleanCode(code);
    if (!cleaned) return '';
    const autoLang = (l, c) => {
        if (l && l !== 'py' && l !== 'txt' && l !== 'script') return l;
        if (/^(import|from|def |class |print\(|if __name__)/.test(c)) return 'py';
        if (/(function |const |let |var |=>|console\.log)/.test(c)) return 'js';
        if (/(#include|int main|printf|std::)/.test(c)) return 'cpp';
        if (/(public class|System\.out|import java)/.test(c)) return 'java';
        if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE)/i.test(c)) return 'sql';
        if (/^(<!DOCTYPE|<html|<div)/.test(c)) return 'html';
        if (/^(#!\/bin\/(bash|sh)|apt |sudo |chmod )/.test(c)) return 'bash';
        return l || 'py';
    };
    lang = autoLang(lang, cleaned);
    const lines   = cleaned.split('\n');
    const lnHtml  = lines.map((_,i) => `<span class="line-number">${i+1}</span>`).join('');
    const langMap  = { py:'python', js:'javascript', java:'java', c:'c', cpp:'c++', sh:'bash', bash:'bash', ts:'typescript', cs:'c#', sql:'sql', html:'html' };
    const label    = langMap[lang.toLowerCase()] || lang || 'script';
    return `<div class="code-terminal">
        <div class="terminal-header">
            <div class="terminal-dots"><span class="dot-red"></span><span class="dot-amber"></span><span class="dot-green"></span></div>
            <span class="mono text-[9px] text-slate-500 uppercase tracking-wider">
                <i class="fas fa-circle text-emerald-500/50 text-[6px] mr-1.5"></i>script.${lang||'py'}
            </span>
            <button class="copy-btn" onclick="copyCode('${uid}',this)">
                <i class="far fa-copy"></i> COPY
            </button>
        </div>
        <div class="terminal-body">
            <div class="line-numbers">${lnHtml}</div>
            <pre class="code-content" id="pre_${uid}">${xHtml(cleaned)}</pre>
        </div>
    </div>`;
}

function copyCode(uid, btn) {
    const pre = document.getElementById('pre_' + uid);
    if (!pre) return;
    const text = pre.innerText || pre.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(_) {}
        document.body.removeChild(ta);
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
}

function copyMasterCode(btn) {
    const container = btn.closest('.code-block-container');
    const code = container.querySelector('.code-payload').innerText;

    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
        btn.style.color = '#10b981';
        btn.style.borderColor = '#10b981';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.color = '#0ea5e9';
            btn.style.borderColor = 'rgba(14,165,233,0.3)';
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
    } finally {
        document.body.removeChild(textArea);
    }
}

function buildCoding(data, content) {
    const topicLabel = cleanTopic(data.topic);
    const rawContent = String(data.content || '');

    const allBlocks = [];
    const fenceRe   = /\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g;
    let m;

    const contentFences = [];
    let cleanedContent = rawContent;
    while ((m = fenceRe.exec(rawContent)) !== null) {
        if (m[2].trim()) {
            allBlocks.push({ lang: m[1]||'py', code: m[2].trim() });
            contentFences.push(m[0]);
        }
    }
    for (const fence of contentFences) {
        cleanedContent = cleanedContent.replace(fence, '');
    }
    cleanedContent = md2html(cleanedContent.trim());

    const codeField = cleanCode(data.code || '');
    const langHint  = (data.lang || 'py').toLowerCase();
    if (codeField && allBlocks.length === 0) {
        allBlocks.push({ lang: langHint, code: codeField });
    }

    if (allBlocks.length > 1) {
        const langHints = [...rawContent.matchAll(/(?:#{1,3}|\*\*)?\s*(c|java|python|javascript|bash|cpp|c\+\+)\s*(?:code|:)?\s*(?:\*\*)?\n?\`\`\`/gi)];
        langHints.forEach((hint, idx) => {
            if (allBlocks[idx] && !allBlocks[idx].lang) {
                allBlocks[idx].lang = hint[1].toLowerCase().replace('c++','cpp');
            }
        });
    }

    const terminalsHtml = allBlocks.map(blk => {
        const uid = 'c' + Date.now() + Math.random().toString(36).slice(2,6);
        return buildTerminalBlock(blk.code, blk.lang, uid);
    }).filter(Boolean).join('<div class="mt-3"></div>');

    const hasTerminals = terminalsHtml.length > 0;

    return `
    <div class="space-y-4">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-code text-purple-400 text-xs"></i>
            </div>
            <span class="topic-tag" style="color:rgba(167,139,250,.75);border-color:rgba(167,139,250,.15);background:rgba(167,139,250,.06)">
                ${xHtml(topicLabel)}
            </span>
            ${allBlocks.length > 1 ? `<span class="mono text-[9px] text-slate-600 border border-slate-700/50 px-2 py-0.5 rounded-md">${allBlocks.length} code blocks</span>` : ''}
        </div>
        ${cleanedContent ? `<div class="prose-content px-1" data-tw="${xAttr(cleanedContent)}">${cleanedContent}</div>` : ''}
        ${hasTerminals ? terminalsHtml : '<p class="mono text-[10px] text-slate-600 italic px-1 pt-1">No code returned — try rephrasing your request.</p>'}
    </div>`;
}

function buildList(data, content) {
    const items = Array.isArray(data.items) ? data.items : [];
    let descs = [];
    if (content) {
        const cleaned = content.replace(/^(<br\s*\/?>\s*)+/i, '');
        descs = cleaned
            .split(/(?:<br\s*\/?>\s*){2,}|(?:<br\s*\/?>\s*)(?=\d+\.\s)/i)
            .map(s => s.replace(/^\s*\d+\.\s*/, '').trim())
            .filter(Boolean);
    }
    const rows = items.map((item, i) => {
        const cleanItem = String(item||'').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
        const ci = cleanItem.indexOf(':');
        let name = cleanItem, short = '';
        if (ci > 0 && ci < 50) { name = cleanItem.slice(0,ci).trim(); short = cleanItem.slice(ci+1).trim(); }
        let rich = (descs[i] || short)
            .replace(new RegExp(`^<b>${xRe(name)}<\\/b>\\s*`,'i'),'')
            .replace(new RegExp(`^${xRe(name)}\\s*[-–:]?\\s*`,'i'),'')
            .trim();
        return `<tr>
            <td class="tbl-idx">${String(i+1).padStart(2,'0')}</td>
            <td class="font-semibold text-slate-100 text-[13px] whitespace-nowrap pr-4">${xHtml(name)}</td>
            ${rich ? `<td class="text-slate-400 text-[12.5px] leading-relaxed">${md2html(rich)}</td>` : ''}
        </tr>`;
    }).join('');
    const hasDesc = descs.length > 0;
    const col = /tool/i.test(data.topic||'') ? 'Tool' : /attack|threat/i.test(data.topic||'') ? 'Attack / Threat' : 'Item';
    return `
    <div class="space-y-4">
        <div class="flex items-center gap-3 flex-wrap">
            <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-table-list text-amber-400 text-xs"></i>
            </div>
            <span class="topic-tag" style="color:rgba(251,191,36,.75);border-color:rgba(251,191,36,.15);background:rgba(251,191,36,.06)">${xHtml(cleanTopic(data.topic))}</span>
            <span class="mono text-[9px] text-slate-600 border border-slate-700/50 px-2 py-0.5 rounded-md">${items.length} entries</span>
        </div>
        <div class="data-table-wrap">
            <table class="data-table">
                <thead><tr>
                    <th style="width:42px">#</th>
                    <th style="width:${hasDesc?'185px':'auto'}">${col}</th>
                    ${hasDesc?'<th>Description</th>':''}
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

function buildGeneral(data, content) {
    return `
    <div class="space-y-3">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-brain text-slate-400 text-xs"></i>
            </div>
            <span class="topic-tag">${xHtml(data.topic||'NEURAL_STREAM')}</span>
        </div>
        <div class="prose-content pt-1 px-1" ${/<(table|pre|div|h[1-6])\b/i.test(content) ? '' : `data-tw="${xAttr(content)}"`}>${content}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════
//  EMAIL DRAFT RENDERER & LOGIC
// ═══════════════════════════════════════════════════ 
// ═══════════════════════════════════════════════════
//  LOCK ALL PREVIOUS EMAIL DRAFTS
//  Called every time a new email card is rendered.
//  Leaves only the last draft interactive.
// ═══════════════════════════════════════════════════
function lockOldEmailDrafts() {
    // Grab every email draft send-button in the chat (they all have id="btn_mail_...")
    const allEmailBtns = Array.from(msgArea.querySelectorAll('button[id^="btn_mail_"]'));

    // All except the very last one should be locked
    const tolock = allEmailBtns.slice(0, -1);

    tolock.forEach(btn => {
        const uid = btn.id.replace('btn_', ''); // e.g. "mail_1234abc"

        // Lock the button
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-lock"></i> DRAFT SUPERSEDED';
        btn.className = 'px-5 py-2.5 bg-slate-800/60 text-slate-500 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-50 cursor-not-allowed';

        // Lock the editable fields
        const toField   = document.getElementById('to_'   + uid);
        const subField  = document.getElementById('sub_'  + uid);
        const bodyField = document.getElementById('body_' + uid);
        if (toField)   toField.contentEditable   = 'false';
        if (subField)  subField.contentEditable  = 'false';
        if (bodyField) bodyField.contentEditable = 'false';

        // Dim the whole card slightly to visually signal it's inactive
        const card = btn.closest('.space-y-4');
        if (card) card.style.opacity = '0.45';
    });
}


function buildEmail(data, content) {
    const uid = 'mail_' + Date.now() + Math.random().toString(36).slice(2,6);
    const isSent = data.emailSent === true;   // ← NEW: read persisted sent state

    const userName = document.getElementById('user-display').textContent.trim();
    const safeUserName = (userName && userName !== '—') ? userName : 'User';

    let finalContent = content || '';
    finalContent = finalContent.replace(/(?:<br\s*\/?>|<\/?p>|\n|\s)*(?:Sincerely|Best regards|Regards|Yours truly|Thanks|Thank you|Warm regards),?(?:<br\s*\/?>|<\/?p>|\n|\s)*(?:\[[^\]]*name[^\]]*\]|your name)(?:<\/p>)?$/i, '');
    finalContent = finalContent.replace(/(?:<br\s*\/?>|<\/?p>|\n|\s)*\[(?:your )?name\](?:<\/p>)?$/i, '');
    const signOff = `<br><br>Best regards,<br>- ${safeUserName.toUpperCase()}`;
    finalContent += signOff;

    // ← NEW: when already sent, badge changes from EDITABLE → SENT
    const badgeHtml = isSent
        ? `<span class="mono text-[9px] text-emerald-400/70 ml-auto border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1"><i class="fas fa-check text-[8px]"></i> SENT</span>`
        : `<span class="mono text-[9px] text-indigo-400/70 ml-auto border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1"><i class="fas fa-pen text-[8px]"></i> EDITABLE</span>`;

    // ← NEW: fields are read-only and button is disabled if already sent
    const editableAttr = isSent ? 'false' : 'true';
    const btnHtml = isSent
        ? `<button disabled id="btn_${uid}" class="px-5 py-2.5 bg-emerald-900/40 text-emerald-400 rounded-md text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 opacity-70 cursor-not-allowed"><i class="fas fa-check"></i> SENT SUCCESSFULLY</button>`
        : `<button id="btn_${uid}" onclick="dispatchEmail('${uid}', this)" style="cursor:pointer;" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-bold tracking-widest uppercase transition-colors flex items-center gap-2"><i class="fas fa-paper-plane"></i> Confirm & Send</button>`;

    return `
    <div class="space-y-4 p-5 rounded-xl border border-indigo-500/30" style="background:rgba(99,102,241,0.05)">
        <div class="flex items-center gap-3 border-b border-indigo-500/20 pb-4">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-envelope text-indigo-400 text-xs"></i>
            </div>
            <span class="topic-tag" style="color:rgba(129,140,248,.9);border-color:rgba(129,140,248,.2);background:rgba(129,140,248,.1)">EMAIL DRAFT</span>
            ${badgeHtml}
        </div>
        <div class="space-y-2 text-[13px] px-1">
            <div class="flex gap-2 items-center">
                <span class="text-slate-500 w-16">To:</span>
                <div contenteditable="${editableAttr}" id="to_${uid}" class="font-mono text-indigo-300 bg-black/20 px-2 py-1.5 rounded w-full outline-none focus:ring-1 ring-indigo-500/50 transition-shadow">${xHtml(data.recipient || '')}</div>
            </div>
            <div class="flex gap-2 items-center mt-2">
                <span class="text-slate-500 w-16">Subject:</span>
                <div contenteditable="${editableAttr}" id="sub_${uid}" class="font-semibold text-slate-200 bg-black/20 px-2 py-1.5 rounded w-full outline-none focus:ring-1 ring-indigo-500/50 transition-shadow">${xHtml(data.subject || '')}</div>
            </div>
        </div>
        <div contenteditable="${editableAttr}" id="body_${uid}" class="prose-content p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 mt-3 text-slate-300 outline-none focus:ring-1 ring-indigo-500/50 transition-all min-h-[100px]" ${/<(table|pre|div|h[1-6])\b/i.test(finalContent) ? '' : 'data-tw="' + xAttr(finalContent) + '"'}>${finalContent}</div>
        <div class="mt-4 flex justify-end border-t border-indigo-500/20 pt-4">
            ${btnHtml}
        </div>
    </div>`;
}

async function dispatchEmail(uid, btn) {
    const recipientEl = document.getElementById('to_' + uid);
    const subjectEl = document.getElementById('sub_' + uid);
    const bodyEl = document.getElementById('body_' + uid);

    const recipient = recipientEl ? recipientEl.innerText.trim() : '';
    const subject = subjectEl ? subjectEl.innerText.trim() : '';
    const content = bodyEl ? bodyEl.innerHTML : '';

    if (!recipient || recipient === '') {
        appendBotCard({
            type: 'general', topic: 'Dispatch Error',
            content: 'Cannot send email: Missing recipient address. Please provide one.',
            risk_level: 'Low', prevention: 'N/A'
        }, true);
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DISPATCHING...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    if (recipientEl) recipientEl.contentEditable = "false";
    if (subjectEl) subjectEl.contentEditable = "false";
    if (bodyEl) bodyEl.contentEditable = "false";

    try {
        const res = await fetch('/api/chat/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ recipient, subject, content })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            btn.innerHTML = '<i class="fas fa-check"></i> SENT SUCCESSFULLY';
            btn.classList.replace('bg-indigo-600', 'bg-emerald-900/40');
            btn.classList.replace('hover:bg-indigo-500', 'hover:bg-emerald-900/40');
            btn.classList.replace('text-white', 'text-emerald-400');

            // ── PERSIST SENT STATE ──────────────────────────────────────
            const cur = chats.find(c => c.id === currentChatId);
            if (cur) {
                const emailMsg = [...cur.messages].reverse().find(m =>
                    m.role === 'bot' && m.data && m.data.type === 'email' && !m.data.emailSent
                );
                if (emailMsg) emailMsg.data.emailSent = true;

                const sysUpdate = {
                    type: 'general', topic: 'System Update',
                    content: `Email successfully dispatched to <b>${xHtml(recipient)}</b>.`,
                    risk_level: 'None', prevention: 'N/A'
                };
                cur.messages.push({ role: 'bot', data: sysUpdate });
                save();
            }
            // ───────────────────────────────────────────────────────────

            appendBotCard({
                type: 'general', topic: 'System Update',
                content: `Email successfully dispatched to <b>${xHtml(recipient)}</b>.`,
                risk_level: 'None', prevention: 'N/A'
            }, true);

        } else {
            throw new Error(data.message || 'Server error during dispatch');
        }

    } catch (err) {
        if (recipientEl) recipientEl.contentEditable = "true";
        if (subjectEl) subjectEl.contentEditable = "true";
        if (bodyEl) bodyEl.contentEditable = "true";

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Retry Send';
        btn.classList.remove('opacity-50', 'cursor-not-allowed');

        appendBotCard({
            type: 'general', topic: 'Dispatch Error',
            content: `Failed to send email to ${xHtml(recipient)}.<br><br><b>Error:</b> ${xHtml(err.message)}<br><br>Have you configured your App Password in your settings?`,
            risk_level: 'Medium', prevention: 'N/A'
        }, true);
    }
}
// ═══════════════════════════════════════════════════
//  SMART RAW-TEXT FALLBACK PARSER
// ═══════════════════════════════════════════════════
function parseRawText(raw) {
    const codeBlocks = [], holders = [];
    let stripped = raw.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, (_, lang, code) => {
        const ph = '\x00CODE' + codeBlocks.length + '\x00';
        codeBlocks.push({ lang: lang||'py', code: code.trim() });
        holders.push(ph); return ph;
    });

    const listRe = /(?:^|\n)\s*(\d+)\.\s+(?:\*\*)?([^*\n:]+?)(?:\*\*)?\s*[-–:]\s*(.+?)(?=\n\s*\d+\.|\n\n|$)/gis;
    const listItems = [];
    let lm;
    while ((lm = listRe.exec(raw)) !== null) listItems.push({ name: lm[2].trim(), desc: lm[3].trim() });

    if (listItems.length >= 2 && codeBlocks.length === 0) {
        return {
            type:'list', topic:'Query Results',
            content: listItems.map((it,i)=>`${i+1}. <b>${xHtml(it.name)}</b><br><b>${xHtml(it.desc)}</b>`).join('<br><br>'),
            items: listItems.map(i=>i.name),
            risk_level:'None', prevention:'N/A'
        };
    }

    const paras = stripped.split(/\n{2,}/).map(p=>p.trim()).filter(Boolean);
    let contentHtml = '';
    for (const para of paras) {
        const ci = holders.findIndex(ph => para.includes(ph));
        if (ci !== -1) {
            const uid = 'rw' + Date.now() + Math.random().toString(36).slice(2,5);
            const blk = codeBlocks[ci];
            const lns = blk.code.split('\n');
            contentHtml += `<div class="code-terminal my-4">
                <div class="terminal-header">
                    <div class="terminal-dots"><span class="dot-red"></span><span class="dot-amber"></span><span class="dot-green"></span></div>
                    <span class="mono text-[9px] text-slate-500 uppercase">script.${blk.lang}</span>
                    <button class="copy-btn" onclick="copyCode('${uid}',this)"><i class="far fa-copy"></i> COPY</button>
                </div>
                <div class="terminal-body">
                    <div class="line-numbers">${lns.map((_,i)=>`<span class="line-number">${i+1}</span>`).join('')}</div>
                    <pre class="code-content" id="pre_${uid}">${xHtml(blk.code)}</pre>
                </div>
            </div>`;
        } else {
            contentHtml += `<p>${md2html(para).replace(/\n/g,'<br>')}</p>`;
        }
    }
    holders.forEach((ph,i) => {
        if (!contentHtml.includes(ph)) return;
        const uid = 'rw'+ Date.now()+ Math.random().toString(36).slice(2,5);
        const blk = codeBlocks[i];
        const lns = blk.code.split('\n');
        contentHtml = contentHtml.replace(ph,
            `<div class="code-terminal my-4">
                <div class="terminal-header">
                    <div class="terminal-dots"><span class="dot-red"></span><span class="dot-amber"></span><span class="dot-green"></span></div>
                    <span class="mono text-[9px] text-slate-500 uppercase">script.${blk.lang}</span>
                    <button class="copy-btn" onclick="copyCode('${uid}',this)"><i class="far fa-copy"></i> COPY</button>
                </div>
                <div class="terminal-body">
                    <div class="line-numbers">${lns.map((_,i)=>`<span class="line-number">${i+1}</span>`).join('')}</div>
                    <pre class="code-content" id="pre_${uid}">${xHtml(blk.code)}</pre>
                </div>
            </div>`
        );
    });

    return { type:'general', topic:'NEURAL_STREAM', content: contentHtml, risk_level:'None', prevention:'N/A' };
}

// ═══════════════════════════════════════════════════
//  JSON RECOVERY  —  4-layer repair pipeline
// ═══════════════════════════════════════════════════
function sanitiseJson(str) {
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (esc)                   { out += ch; esc = false; continue; }
        if (ch === '\\' && inStr) { out += ch; esc = true;  continue; }
        if (ch === '"')             { inStr = !inStr; out += ch; continue; }
        if (inStr) {
            if (ch === '\n') { out += '\\n'; continue; }
            if (ch === '\r') { out += '\\r'; continue; }
            if (ch === '\t') { out += '\\t'; continue; }
        }
        out += ch;
    }
    return out.replace(/,\s*([}\]])/g, '$1');
}

function extractFields(raw) {
    const get = (key) => {
        const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"');
        const m  = raw.match(re);
        if (m) return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        const re2 = new RegExp('"' + key + '"\\s*:\\s*([^,"{}\\[\\]]+)');
        const m2  = raw.match(re2);
        return m2 ? m2[1].trim().replace(/^"|"$/g, '') : null;
    };
    const getArr = (key) => {
        const m = raw.match(new RegExp('"' + key + '"\\s*:\\s*\\[([^\\]]*?)\\]'));
        if (!m) return [];
        return (m[1].match(/"([^"]*)"/g) || []).map(s => s.replace(/"/g, ''));
    };
    let code = get('code') || '';
    if (!code || code.trim() === '\n' || code.trim() === '') {
        const codeRe = raw.match(/"code"\s*:\s*([\s\S]*?)(?="items"|"risk_level"|"prevention"|\n\s*")/);
        if (codeRe) {
            code = codeRe[1].trim()
                .replace(/^["']|["'],?\s*$/g, '') 
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t');
        }
    }
return { 
        type: get('type') || 'general', 
        topic: get('topic') || 'NEURAL_STREAM', 
        content: get('content') || '', 
        code, 
        items: getArr('items'), 
        risk_level: get('risk_level') || 'None', 
        prevention: get('prevention') || 'N/A',
        recipient: get('recipient') || '',
        subject: get('subject') || '',
        action: get('action') || '',
        path:   get('path')   || '',
        dest:   get('dest')   || ''
    };
}

function robustParse(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('empty');
    let t = raw.trim();
    const fenced = t.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`\s*$/i);
    if (fenced) t = fenced[1].trim();
    else t = t.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`\s*$/, '').trim();
    raw = t;

    const s = raw.indexOf('{');
    if (s === -1) throw new Error('no {');

    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = s; i < raw.length; i++) {
        const ch = raw[i];
        if (esc)                   { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true;  continue; }
        if (ch === '"')             { inStr = !inStr; continue; }
        if (inStr)                  continue;
        if (ch === '{')             depth++;
        else if (ch === '}')        { depth--; if (depth === 0) { end = i; break; } }
    }
    const raw1 = end !== -1 ? raw.substring(s, end + 1) : raw.substring(s);

    const candidates = [ raw1, sanitiseJson(raw1), autoClose(raw1), autoClose(sanitiseJson(raw1)) ];
    for (const c of candidates) {
        try { const p = JSON.parse(c); if (p && p.type) return p; } catch (_) {}
    }
    try { const p = extractFields(raw1); if (p && p.type) return p; } catch (_) {}
    throw new Error('unrecoverable');
}

function autoClose(s) {
    let inS=false, esc=false, br=0, bk=0;
    for (let i=0;i<s.length;i++) {
        const c=s[i];
        if(esc){esc=false;continue;}
        if(c==='\\'&&inS){esc=true;continue;}
        if(c==='"'){inS=!inS;continue;}
        if(inS)continue;
        if(c==='{')br++;else if(c==='}')br--;
        else if(c==='[')bk++;else if(c===']')bk--;
    }
    let out=s.trimEnd();
    if(inS)out+='"';
    out=out.replace(/,\s*$/,'');
    for(let i=0;i<bk;i++)out+=']';
    for(let i=0;i<br;i++)out+='}';
    return out;
}

// ═══════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════
function md2html(s) {
    if (!s) return '';
    if (/<(table|pre|div|h[1-6]|ul|ol|li|code)\b/i.test(s)) return s;
    return s
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/__(.+?)__/g, '<b>$1</b>')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>');
}

function cleanTopic(s) {
    return String(s || '')
        .replace(/<[^>]*>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
        .replace(/\s+/g,' ').trim().slice(0, 60) || 'NEURAL_STREAM';
}

function cleanCode(s) {
    if (!s) return '';
    return String(s)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, '\t')
        .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
        .replace(/^\n+|\n+$/g, '');
}

function xHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function xAttr(s) { return String(s||'').replace(/"/g,'&quot;'); }
function xRe(s) { return String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

// ═══════════════════════════════════════════════════
//  EVENT LISTENERS  — all wired with addEventListener
//  (no inline onclick on critical controls)
// ═══════════════════════════════════════════════════

// ── Input field: Enter to send, char counter ──
userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // prevents any form action or page scroll
        sendMessage();
    }
});
// Keep send button in sync with input content
// ═══════════════════════════════════════════════════
//  DOCUMENT CONTEXT — handled by document.js
//  updateSendBtn reads window.currentDocumentContext
//  which document.js sets after extraction.
// ═══════════════════════════════════════════════════
function updateSendBtn() {
    const userInputEl = document.getElementById('user-input');
    if (!userInputEl) return;
    const empty = userInputEl.value.trim().length === 0;
    const hasDoc = !!(window.currentDocumentContext);
    const sendBtnEl = document.getElementById('send-btn');
    if (sendBtnEl) {
        sendBtnEl.disabled = (empty && !hasDoc) || isProcessing;
    }
}

userInput.addEventListener('input', () => {
    const len = userInput.value.length;
    charCountEl.textContent = len;
    charCountEl.classList.toggle('warn', len > 1800);
    updateSendBtn();
});

// ── Send button ──
sendBtn.addEventListener('click', e => {
    e.preventDefault();
    sendMessage();
});

// ── New chat ──
document.getElementById('new-chat-btn').addEventListener('click', createNewChat);

// ── Sidebar toggle ──
document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── Logout modal ──
const logoutModal = document.getElementById('logout-modal');

function openLogoutModal() { logoutModal.classList.add('open'); }
function closeLogoutModal() { logoutModal.classList.remove('open'); }

document.getElementById('logout-btn').addEventListener('click', openLogoutModal);
document.getElementById('logout-cancel-btn').addEventListener('click', closeLogoutModal);
logoutModal.addEventListener('click', e => { if (e.target === logoutModal) closeLogoutModal(); });

document.getElementById('logout-confirm-btn').addEventListener('click', async () => {
    document.getElementById('logout-confirm-btn').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing out...';
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch(_) {}
    window.location.href = '/login';
});

// ── Rename modal ──
document.getElementById('close-rename-btn').addEventListener('click', closeRenameModal);
document.getElementById('cancel-rename-btn').addEventListener('click', closeRenameModal);
document.getElementById('confirm-rename-btn').addEventListener('click', confirmRename);
renameField.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') closeRenameModal();
});
renameModal.addEventListener('click', e => { if (e.target === renameModal) closeRenameModal(); });

// ─── BOOT ───
// Send button starts disabled (empty input)
updateSendBtn();
init();