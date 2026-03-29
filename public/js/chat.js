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
    if (!msg) return;

    isProcessing = true;
    userInput.value = '';
    charCountEl.textContent = '0';
    charCountEl.classList.remove('warn');

    // Lock the input field visually while processing
    document.querySelector('.input-wrap').classList.add('locked');
    sendBtn.disabled = true;
    micBtn.disabled  = true;

    // Show user bubble
    appendUserBubble(msg);
    showEmpty(false);

    // Save user message to history
    const cur = chats.find(c => c.id === currentChatId);
    if (cur) {
        cur.messages.push({ role: 'user', text: msg });
        save();
    }

    // Show loading
    neuralSync.classList.remove('hidden');
    gpuStats.textContent = Math.floor(Math.random() * 40 + 30) + '%';

    let parsed = null;

    try {
        // Build conversation history for context (last 10 exchanges = 20 messages)
        // Format: [{role:'user', content:'...'}, {role:'assistant', content:'...'}]
        const historyForApi = [];
        if (cur && cur.messages.length > 1) {
            const recentMsgs = cur.messages.slice(-20); // last 20 messages
            for (const m of recentMsgs) {
                if (m.role === 'user') {
                    historyForApi.push({ role: 'user', content: m.text });
                } else if (m.role === 'bot' && m.data) {
                    // Convert stored bot card data back to a text summary for context
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
            body: JSON.stringify({ message: msg, history: historyForApi })
        });

        // If server returned 401 (session expired), redirect to login
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

        // Support both { reply: "..." } and { message: "..." } and { response: "..." }
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
        // Unlock input
        document.querySelector('.input-wrap').classList.remove('locked');
        micBtn.disabled = false;
        updateSendBtn();
        setTimeout(() => userInput.focus(), 100);
    }

    // Update chat title on first reply
    if (cur && cur.title === 'New Investigation' && parsed.topic) {
        cur.title = parsed.topic.slice(0, 40);
        setNavTitle(cur.title);
    }

    // Save + render
    if (cur) { cur.messages.push({ role: 'bot', data: parsed }); save(); renderHistory(); }
    appendBotCard(parsed, true); // true = animate
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
    if ((data.code || '').trim().length > 0 && data.type !== 'coding') {
        data = { ...data, type: 'coding' };
    }
    // If items array has entries and type wasn't set to security/coding, use list
    if (Array.isArray(data.items) && data.items.length > 0
        && data.type !== 'coding' && data.type !== 'security') {
        data = { ...data, type: 'list' };
    }

    // Strip legal/portfolio from content
    let raw = String(data.content || '');
    let legalHtml = '', portHtml = '';
    const lm = raw.match(/<div class=['"]legal-footer['"][^>]*>[\s\S]*?<\/div>/);
    if (lm) { legalHtml = lm[0]; raw = raw.replace(lm[0], '').trim(); }
    const pm = raw.match(/<div class=['"]portfolio-badge['"][^>]*>[\s\S]*?<\/div>/);
    if (pm) { portHtml = pm[0]; raw = raw.replace(pm[0], '').trim(); }

    // content field may already be HTML (from aiService convertMarkdownToJson) or raw text
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
        default:         html = buildGeneral(data, content) + legalBlock;   break;
    }
    if (portHtml) html += portHtml;

    wrap.innerHTML = html;
    // After HTML is parsed into DOM, fix up data-tw elements:
    // xAttr() HTML-encodes the content, so reading it back from getAttribute() gives
    // double-encoded text. Instead, store the intended HTML in a JS property.
    wrap.querySelectorAll('[data-tw]').forEach(el => {
        // getAttribute returns the HTML-decoded value correctly in all browsers
        el._twContent = el.getAttribute('data-tw');
        el.removeAttribute('data-tw');
    });
    msgArea.appendChild(wrap);

    // Typewriter on prose elements — skip if content is rich HTML (tables, pre, div)
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

// Build a single code terminal HTML string
function buildTerminalBlock(code, lang, uid) {
    const cleaned = cleanCode(code);
    if (!cleaned) return '';
    // Auto-detect language from code content when hint is generic
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

/**
 * copyMasterCode
 * Triggered by the buttons generated in aiService.js
 */

// ═══════════════════════════════════════════════════
//  COPY CODE  —  used by all terminal block copy-btns
// ═══════════════════════════════════════════════════
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
        // Fallback for older browsers
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


// ═══════════════════════════════════════════════════
//  COPY CODE  —  used by all terminal block copy-btns
// ═══════════════════════════════════════════════════

function copyMasterCode(btn) {
    // 1. Traverse the DOM to find the code text
    const container = btn.closest('.code-block-container');
    const code = container.querySelector('.code-payload').innerText;

    // 2. Create a temporary textarea for the copy command
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        // Execute copy command
        document.execCommand('copy');
        
        // 3. Provide Visual Feedback
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

    // ── Step 1: Extract all fenced code blocks from BOTH content and code fields
    //    Model sometimes puts multiple language blocks inside content:
    //    ```c ... ``` ```java ... ``` ```python ... ```
    const allBlocks = [];
    const fenceRe   = /```(\w*)\n?([\s\S]*?)```/g;
    let m;

    // Check content field for fenced blocks
    const contentFences = [];
    let cleanedContent = rawContent;
    while ((m = fenceRe.exec(rawContent)) !== null) {
        if (m[2].trim()) {
            allBlocks.push({ lang: m[1]||'py', code: m[2].trim() });
            contentFences.push(m[0]);
        }
    }
    // Remove fenced blocks from display content
    for (const fence of contentFences) {
        cleanedContent = cleanedContent.replace(fence, '');
    }
    cleanedContent = md2html(cleanedContent.trim());

    // Check code field — use data.lang hint if available (set by aiService)
    const codeField = cleanCode(data.code || '');
    const langHint  = (data.lang || 'py').toLowerCase();
    if (codeField && allBlocks.length === 0) {
        allBlocks.push({ lang: langHint, code: codeField });
    }

    // ── Step 2: Detect language from content labels like "### C Code:" or "**Java:**"
    //    If blocks have no language hint, try to detect from surrounding text
    if (allBlocks.length > 1) {
        const langHints = [...rawContent.matchAll(/(?:#{1,3}|\*\*)?\s*(c|java|python|javascript|bash|cpp|c\+\+)\s*(?:code|:)?\s*(?:\*\*)?\n?```/gi)];
        langHints.forEach((hint, idx) => {
            if (allBlocks[idx] && !allBlocks[idx].lang) {
                allBlocks[idx].lang = hint[1].toLowerCase().replace('c++','cpp');
            }
        });
    }

    // ── Step 3: Build terminal HTML for each block
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
//  SMART RAW-TEXT FALLBACK PARSER
// ═══════════════════════════════════════════════════
function parseRawText(raw) {
    const codeBlocks = [], holders = [];
    let stripped = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const ph = '\x00CODE' + codeBlocks.length + '\x00';
        codeBlocks.push({ lang: lang||'py', code: code.trim() });
        holders.push(ph); return ph;
    });

    // Detect numbered list: "1. **Name** - Description"
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

/**
 * sanitiseJson  — Pass 1 of the repair pipeline
 *
 * Scans the raw string character-by-character so it only
 * touches text that is INSIDE JSON string values.
 * Fixes:
 *  • Bare newlines / CR / tabs inside string values
 *    (model writes a real newline instead of the escape \n)
 *  • Trailing commas before } or ]
 */
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

/**
 * extractFields  — Layer 4 (last resort)
 *
 * When the model writes a Python/JS expression instead of a
 * proper JSON string in the "code" field (e.g. "\n".join([...]))
 * or uses completely invalid JSON syntax, we ignore JSON structure
 * entirely and extract each field with targeted regexes.
 */
function extractFields(raw) {
    // Extract a string value: "key": "value"
    const get = (key) => {
        const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"');
        const m  = raw.match(re);
        if (m) return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        // Non-string value (e.g. "risk_level": None / number)
        const re2 = new RegExp('"' + key + '"\\s*:\\s*([^,"{}\\[\\]]+)');
        const m2  = raw.match(re2);
        return m2 ? m2[1].trim().replace(/^"|"$/g, '') : null;
    };

    // Extract an array: "key": ["a","b"]
    const getArr = (key) => {
        const m = raw.match(new RegExp('"' + key + '"\\s*:\\s*\\[([^\\]]*?)\\]'));
        if (!m) return [];
        return (m[1].match(/"([^"]*)"/g) || []).map(s => s.replace(/"/g, ''));
    };

    // Special handling for "code" field — model often writes a Python
    // expression like "\n".join([...]) which is not a JSON string.
    // Grab everything between "code": and the next recognised field.
    let code = get('code') || '';
    if (!code || code.trim() === '\n' || code.trim() === '') {
        const codeRe = raw.match(/"code"\s*:\s*([\s\S]*?)(?="items"|"risk_level"|"prevention"|\n\s*")/);
        if (codeRe) {
            code = codeRe[1].trim()
                .replace(/^["']|["'],?\s*$/g, '') // strip surrounding quotes
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t');
        }
    }

    const type    = get('type')       || 'general';
    const topic   = get('topic')      || 'NEURAL_STREAM';
    const content = get('content')    || '';
    const rl      = get('risk_level') || 'None';
    const prev    = get('prevention') || 'N/A';
    const items   = getArr('items');

    return { type, topic, content, code, items, risk_level: rl, prevention: prev };
}

/**
 * robustParse  — master entry point
 *
 * Tries 5 progressively more aggressive repair strategies:
 *  1. raw first-object slice  (brace-depth scanner, not lastIndexOf)
 *  2. sanitiseJson            (fix bare newlines/tabs + trailing commas)
 *  3. autoClose               (append missing } ] )
 *  4. sanitise + autoClose    (both together)
 *  5. extractFields           (regex field extraction, bypasses JSON entirely)
 */
function robustParse(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('empty');

    // Strip ```json ... ``` fences before parsing
    let t = raw.trim();
    const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
    if (fenced) t = fenced[1].trim();
    else t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    raw = t;

    const s = raw.indexOf('{');
    if (s === -1) throw new Error('no {');

    // ── Step A: find the FIRST complete JSON object via brace-depth scan ──
    // This prevents two concatenated objects from being merged.
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

    // ── Step B: try to parse with progressive repairs ──────────────────
    const candidates = [
        raw1,
        sanitiseJson(raw1),
        autoClose(raw1),
        autoClose(sanitiseJson(raw1)),
    ];
    for (const c of candidates) {
        try { const p = JSON.parse(c); if (p && p.type) return p; } catch (_) {}
    }

    // ── Step C: regex field extraction (last resort) ───────────────────
    try {
        const p = extractFields(raw1);
        if (p && p.type) return p;
    } catch (_) {}

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
    // If string already has block-level HTML (from aiService) return as-is
    if (/<(table|pre|div|h[1-6]|ul|ol|li|code)\b/i.test(s)) return s;
    return s
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/__(.+?)__/g, '<b>$1</b>')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>');
}

// Strip all HTML tags from topic strings — prevents <GL><BR><LI> etc. showing in chips
function cleanTopic(s) {
    return String(s || '')
        .replace(/<[^>]*>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
        .replace(/\s+/g,' ').trim().slice(0, 60) || 'NEURAL_STREAM';
}

// Strip HTML tags and fix escape sequences from code field
// Model errors: <br> in code, literal \n instead of newline, HTML entities
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

function xHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function xAttr(s) { return String(s||'').replace(/"/g,'&quot;'); }
function xRe(s) { return String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

// ═══════════════════════════════════════════════════
//  EVENT LISTENERS  — all wired with addEventListener
//  (no inline onclick on critical controls)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  VOICE INPUT ENGINE  (Web Speech API)
// ═══════════════════════════════════════════════════
const micBtn       = document.getElementById('mic-btn');
const voiceToast   = document.getElementById('voice-toast');
const voiceToastTx = document.getElementById('voice-toast-text');

// ═══════════════════════════════════════════════════
//  VOICE ENGINE — Python speech_recognition backend
//
//  Connects via WebSocket to voice_server.py running
//  on localhost:8765.  Python captures mic with the
//  system microphone (no browser permission needed),
//  recognises speech in phrases, and streams each
//  recognised phrase back here word-by-word.
//  100% offline after initial setup.
// ═══════════════════════════════════════════════════

let voiceSocket   = null;   // WebSocket to voice_server.py
let isListeningV  = false;  // true while recording

const vtDot  = document.getElementById('vt-dot');
const vtBar  = document.getElementById('vt-bar');
const vtWave = document.getElementById('vt-wave');

function showVoiceToast(msg, mode = 'info') {
    voiceToastTx.textContent = msg;
    voiceToast.classList.add('show');
    voiceToast.classList.remove('listening-mode','error-mode','downloading');
    vtDot.classList.remove('blue');
    vtWave.style.display = 'none';
    if (mode === 'listening') {
        voiceToast.classList.add('listening-mode');
        vtWave.style.display = 'flex';
    } else if (mode === 'error') {
        voiceToast.classList.add('error-mode');
    } else if (mode === 'download') {
        voiceToast.classList.add('downloading');
        vtDot.classList.add('blue');
    } else {
        vtDot.classList.add('blue');
    }
}
function hideVoiceToast() {
    voiceToast.classList.remove('show','listening-mode','error-mode','downloading');
    vtWave.style.display = 'none';
}

function resetMicBtn() {
    isListeningV = false;
    micBtn.classList.remove('listening');
    micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    micBtn.title = 'Voice Input (Python offline)';
    micBtn.disabled = false;
}

function startVoice() {
    if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
        showVoiceToast('Already listening...', 'listening');
        return;
    }

    try {
        voiceSocket = new WebSocket('ws://localhost:8765');
    } catch(e) {
        showVoiceToast('Cannot connect to voice server. Is voice_server.py running?', 'error');
        setTimeout(hideVoiceToast, 5000);
        return;
    }

    voiceSocket.onopen = () => {
        isListeningV = true;
        micBtn.classList.add('listening');
        micBtn.innerHTML = '<i class="fas fa-stop"></i>';
        micBtn.title = 'Stop listening';
        userInput.value = '';
        charCountEl.textContent = '0';
        updateSendBtn();
        showVoiceToast('Listening... speak now', 'listening');
        voiceSocket.send(JSON.stringify({ cmd: 'start' }));
    };

    voiceSocket.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);

            if (msg.type === 'partial') {
                // Live interim — show in input field as it comes
                userInput.value = msg.text;
                charCountEl.textContent = msg.text.length;
                updateSendBtn();
                // Show in toast too so user sees it above the field
                showVoiceToast(msg.text, 'listening');

            } else if (msg.type === 'final') {
                // Final phrase confirmed — append to any existing text
                const existing = userInput.value.trim();
                const phrase   = msg.text.trim();
                userInput.value = existing ? existing + ' ' + phrase : phrase;
                charCountEl.textContent = userInput.value.length;
                updateSendBtn();
                showVoiceToast(userInput.value, 'listening');

            } else if (msg.type === 'done') {
                // Recording ended — leave text in input field, user sends manually
                resetMicBtn();
                hideVoiceToast();
                userInput.focus();

            } else if (msg.type === 'error') {
                showVoiceToast(msg.text || 'Voice error', 'error');
                setTimeout(hideVoiceToast, 4000);
                resetMicBtn();
            }
        } catch(_) {}
    };

    voiceSocket.onerror = () => {
        showVoiceToast('voice_server.py not found on port 8765.\nRun: python voice_server.py', 'error');
        setTimeout(hideVoiceToast, 6000);
        resetMicBtn();
    };

    voiceSocket.onclose = () => {
        if (isListeningV) {
            resetMicBtn();
            hideVoiceToast();
            userInput.focus();
        }
    };
}

function stopVoice() {
    if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
        voiceSocket.send(JSON.stringify({ cmd: 'stop' }));
        showVoiceToast('Processing...', 'info');
    }
    isListeningV = false;
}

micBtn.title = 'Voice Input (Python offline)';
micBtn.addEventListener('click', () => {
    if (isProcessing) return;
    if (isListeningV) stopVoice();
    else startVoice();
});
// ── Input field: Enter to send, char counter ──
userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // prevents any form action or page scroll
        sendMessage();
    }
});
// Keep send button in sync with input content
function updateSendBtn() {
    const empty = userInput.value.trim().length === 0;
    sendBtn.disabled = empty || isProcessing;
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