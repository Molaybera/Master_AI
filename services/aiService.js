/**
 * aiService.js
 * Path: services/aiService.js
 *
 * Optimized for qwen2.5-coder:7b running as 'Master' via Ollama.
 * Handles JSON extraction, fence stripping, and markdown fallback conversion.
 */

const axios = require('axios');

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const MODEL_NAME = 'Master';

// ─── SYSTEM RULES ─────────────────────────────────────────────────────────────
// This is a lightweight reinforcement sent at runtime for multi-turn consistency.
// ─── REPLACE the entire SYSTEM_RULES constant in aiService.js ───────────────
const SYSTEM_RULES = `You are MASTER — a Neural Intelligence specialist in Cyber Security and Programming.

CRITICAL: Your ENTIRE response must be ONE valid JSON object. No markdown. No explanation outside JSON. No code fences.

════════════════════════════════
SYSTEM AGENT — FILE & FOLDER OPERATIONS
════════════════════════════════
ANY request to create/read/edit/delete/rename/move/copy a FILE or FOLDER, or to change/navigate directory → MUST use type:"system".

ACTION SELECTION (read carefully):
- "create a FOLDER"          → action:"create_folder"
- "create a FILE (.py/.js/etc)" → action:"create_file"   ← NEVER use create_folder for files
- "write / rewrite / update / edit a file" → NOT ALLOWED (use action:"create_file" with full code)
- "open file / open folder"     → action:"open_path"
- "read / show a file"          → action:"read_file"
- "list / show folder contents" → action:"read_file"
- "delete a file"               → action:"delete_file"
- "delete a folder"             → action:"delete_folder"
- "rename a file"               → action:"rename_file"
- "rename a folder"             → action:"rename_folder"
- "move a file"                 → action:"move_file"
- "copy a file"                 → action:"copy_file"
- "run / execute a file"        → action:"run_file"
- "cd / go to / navigate / change dir / change directory / go into" → NOT ALLOWED

PATH RULES:
- Use ONLY the filename or relative path — the system knows the current directory
- If user says "in MyProject" → path:"MyProject/hello.py"
- If user is already in MyProject (after cd) → path:"hello.py"
- For workspace root listing → path:"."
- For cd up → path:".."
- For rename/move/copy → "dest" must also be set

CODE RULES — CRITICAL:
- For create_file → "code" field MUST contain the FULL file content
- Write REAL, COMPLETE code — not placeholder comments
- NEVER leave "code" empty for create_file
- Do NOT wrap code in backticks inside the "code" field

CONTENT RULES:
- "content" = ONE brief sentence describing what you are about to do
- NEVER include "Action Completed" or past-tense results in "content"

════════════════════════════════
EXAMPLES
════════════════════════════════

"create a folder called TestProject" →
{"type":"system","topic":"Create Folder","content":"Creating folder 'TestProject'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"create_folder","path":"TestProject","dest":""}

"create a file called hello.py with hello world" →
{"type":"system","topic":"Create File","content":"Creating 'hello.py' with a Hello World program.","code":"print(\"Hello, World!\")","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"create_file","path":"hello.py","dest":""}

"create a file called hello.py in MyProject with a hello world program" →
{"type":"system","topic":"Create File","content":"Creating 'hello.py' inside MyProject.","code":"print(\"Hello, World!\")","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"create_file","path":"MyProject/hello.py","dest":""}

"write python code in hello.py that prints a loop from 1 to 20 filtering odd and even" →
{"type":"system","topic":"Create File","content":"Writing full content to 'hello.py'.","code":"for i in range(1, 21):\n    if i % 2 == 0:\n        print(f\"{i} - Even\")\n    else:\n        print(f\"{i} - Odd\")","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"create_file","path":"hello.py","dest":""}

"create index.html in MyProject with a basic html page" →
{"type":"system","topic":"Create File","content":"Creating 'index.html' inside MyProject.","code":"<!DOCTYPE html>\n<html lang=\"en\">\n<head><meta charset=\"UTF-8\"><title>Page</title></head>\n<body><h1>Hello World</h1></body>\n</html>","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"create_file","path":"MyProject/index.html","dest":""}

"list all files in my workspace" →
{"type":"system","topic":"List Workspace","content":"Listing all files and folders in workspace root.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"read_file","path":".","dest":""}

"show me the contents of MyProject" →
{"type":"system","topic":"List Folder","content":"Listing contents of MyProject.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"read_file","path":"MyProject","dest":""}

"read hello.py" →
{"type":"system","topic":"Read File","content":"Reading contents of 'hello.py'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"read_file","path":"hello.py","dest":""}

"open MyProject" →
{"type":"system","topic":"Open Folder","content":"Opening folder 'MyProject' on the system.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"open_path","path":"MyProject","dest":""}

"open hello.py" →
{"type":"system","topic":"Open File","content":"Opening 'hello.py' on the system.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"open_path","path":"hello.py","dest":""}

"rename folder TestProject to MyProject" →
{"type":"system","topic":"Rename Folder","content":"Renaming 'TestProject' to 'MyProject'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"rename_folder","path":"TestProject","dest":"MyProject"}

"rename hello.py to main.py" →
{"type":"system","topic":"Rename File","content":"Renaming 'hello.py' to 'main.py'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"rename_file","path":"hello.py","dest":"main.py"}

"delete the file hello.py" →
{"type":"system","topic":"Delete File","content":"Deleting 'hello.py'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"delete_file","path":"hello.py","dest":""}

"delete the folder src" →
{"type":"system","topic":"Delete Folder","content":"Deleting folder 'src'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"delete_folder","path":"src","dest":""}

"run hello.py" →
{"type":"system","topic":"Run File","content":"Executing 'hello.py'.","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"run_file","path":"hello.py","dest":""}

════════════════════════════════
EMAIL
════════════════════════════════
Missing recipient or content → ask using type:"general"
Both present → type:"email" with recipient, subject, content

════════════════════════════════
FULL SCHEMA — ALL FIELDS REQUIRED
════════════════════════════════
{"type":"...","topic":"...","content":"...","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"","path":"","dest":""}`;
// ─── JSON EXTRACTION UTILITIES ────────────────────────────────────────────────

/**
 * stripFences — removes markdown wrappers.
 * (Note: Backticks are escaped here to prevent IDE parser breakage)
 */
function stripFences(raw) {
    const t = raw.trim();
    const fenced = t.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`\s*$/i);
    if (fenced) return fenced[1].trim();
    return t.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`\s*$/, '').trim();
}

/**
 * sanitiseJson — fixes bare newlines/tabs inside JSON string values
 * and removes trailing commas before } or ].
 */
function sanitiseJson(str) {
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (esc)                   { out += ch; esc = false; continue; }
        if (ch === '\\' && inStr)  { out += ch; esc = true;  continue; }
        if (ch === '"')            { inStr = !inStr; out += ch; continue; }
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
 * autoClose — appends missing closing brackets/braces for truncated JSON.
 */
function autoClose(s) {
    let inS = false, esc = false, br = 0, bk = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (esc) { esc = false; continue; }
        if (c === '\\' && inS) { esc = true; continue; }
        if (c === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (c === '{') br++;
        else if (c === '}') br--;
        else if (c === '[') bk++;
        else if (c === ']') bk--;
    }
    let out = s.trimEnd().replace(/,\s*$/, '');
    if (inS) out += '"';
    for (let i = 0; i < bk; i++) out += ']';
    for (let i = 0; i < br; i++) out += '}';
    return out;
}

/**
 * extractFirstObject — brace-depth scan to find the first complete JSON object.
 */
function extractFirstObject(raw) {
    const s = raw.indexOf('{');
    if (s === -1) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = s; i < raw.length; i++) {
        const ch = raw[i];
        if (esc)                   { esc = false; continue; }
        if (ch === '\\' && inStr)  { esc = true;  continue; }
        if (ch === '"')            { inStr = !inStr; continue; }
        if (inStr)                 continue;
        if (ch === '{')            depth++;
        else if (ch === '}') { depth--; if (depth === 0) return raw.substring(s, i + 1); }
    }
    return raw.substring(s); // unterminated — return remainder
}

/**
 * extractFields — last-resort regex extraction when JSON structure is broken.
 */
function extractFields(raw) {
    const get = (key) => {
        const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"');
        const m = raw.match(re);
        if (m) return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        const re2 = new RegExp('"' + key + '"\\s*:\\s*([^,"{}\\[\\]]+)');
        const m2 = raw.match(re2);
        return m2 ? m2[1].trim().replace(/^"|"$/g, '') : null;
    };
    const getArr = (key) => {
        const m = raw.match(new RegExp('"' + key + '"\\s*:\\s*\\[([^\\]]*?)\\]'));
        if (!m) return [];
        return (m[1].match(/"([^"]*)"/g) || []).map(s => s.replace(/"/g, ''));
    };
    return {
        type:       get('type')       || 'general',
        topic:      get('topic')      || 'NEURAL_STREAM',
        content:    get('content')    || '',
        code:       get('code')       || '',
        items:      getArr('items'),
        risk_level: get('risk_level') || 'None',
        prevention: get('prevention') || 'N/A',
        recipient:  get('recipient')  || '',
        subject:    get('subject')    || '',
        action:     get('action')     || '',
        path:       get('path')       || '',
        dest:       get('dest')       || ''
    };
}

/**
 * robustParse — 4-layer repair pipeline:
 * 1. Strip markdown fences
 * 2. Extract first complete JSON object via brace-depth scan
 * 3. Try: raw → sanitise → autoClose → sanitise+autoClose
 * 4. Regex field extraction (last resort, bypasses JSON parser)
 */
function robustParse(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('empty input');

    const defenced = stripFences(raw);
    const obj = extractFirstObject(defenced) || extractFirstObject(raw);
    if (!obj) throw new Error('no JSON object found');

    const candidates = [
        obj,
        sanitiseJson(obj),
        autoClose(obj),
        autoClose(sanitiseJson(obj)),
    ];
    for (const c of candidates) {
        try {
            const p = JSON.parse(c);
            if (p && p.type) return normaliseType(p);
        } catch (_) {}
    }

    // Last resort
    const p = extractFields(obj);
    if (p && p.type) return normaliseType(p);

    throw new Error('unrecoverable JSON');
}

/**
 * normaliseType — corrects the "type" field when the model gets it wrong.
 */
function normaliseType(obj) {
    // Protect email and system types from being dynamically overwritten
    if (obj.type === 'email' || obj.type === 'system') return obj; 

    const code = (obj.code || '').trim();
    const items = Array.isArray(obj.items) ? obj.items : [];
    if (code.length > 0) obj.type = 'coding';
    else if (items.length > 0 && obj.type !== 'security') obj.type = 'list';
    return obj;
}

function extractDeterministicSystemAction(history) {
    const lastUser = [...history].reverse().find(m => m && m.role === 'user' && typeof m.content === 'string');
    if (!lastUser) return null;

    const raw = lastUser.content.trim();
    if (!raw) return null;

    // Only intercept explicit OPEN commands.
    // Examples:
    // - open hello.py
    // - open this file hello.py
    // - open folder MyProject
    // - open "notes/todo.txt"
    const openMatch = raw.match(/^open\s+(.+)$/i);
    if (!openMatch) return null;

    let rest = openMatch[1].trim();
    rest = rest
        .replace(/^(this|the|a|an)\s+/i, '')
        .replace(/^(file|folder|directory|dir)\s+/i, '')
        .replace(/^(named|called)\s+/i, '')
        .trim();

    // Prefer quoted path if provided.
    const quoted = rest.match(/["'`]{1}([^"'`]+)["'`]{1}/);
    let targetPath = (quoted ? quoted[1] : rest).trim();
    targetPath = targetPath.replace(/[\s.,;:!?]+$/g, '').trim();

    if (!targetPath) {
        return {
            type: 'general',
            topic: 'Open Path',
            content: 'Please provide a file or folder path after the open command.',
            code: '', items: [], risk_level: 'None', prevention: 'N/A',
            recipient: '', subject: '', action: '', path: '', dest: ''
        };
    }

    return {
        type: 'system',
        topic: 'Open Path',
        content: `Opening '${targetPath}' on the system.`,
        code: '', items: [], risk_level: 'None', prevention: 'N/A',
        recipient: '', subject: '', action: 'open_path', path: targetPath, dest: ''
    };
}

// ─── MARKDOWN → JSON FALLBACK ─────────────────────────────────────────────────
/**
 * convertMarkdownToJson — used when the model outputs plain markdown instead
 * of JSON. Produces safe schema-compatible output.
 */
function convertMarkdownToJson(raw) {
    const text = raw.trim();

    // ── SYSTEM AGENT DETECTION ──────────────────────────────────────────────
    // If the model returned markdown for a file/folder operation, reconstruct
    // a proper system JSON so the approval card still appears.
    const sysActionMap = [
        { re: /\b(creat|mak|add)\w*\s+.*(folder|director)/i,       action: 'create_folder' },
        { re: /\b(creat|mak|add)\w*\s+.*file\b/i,                  action: 'create_file'   },
        { re: /^\s*open\b/i,                                          action: 'open_path'     },
        { re: /\b(read|show|list|display)\w*\s+.*(file|dir|folder)/i, action: 'read_file' },
        { re: /\b(edit|rewrite|update|write)\w*\s+.*file\b/i,        action: 'create_file'   },
        { re: /\bdelet\w*\s+.*file\b/i,                             action: 'delete_file'   },
        { re: /\bdelet\w*\s+.*(folder|director)/i,                  action: 'delete_folder' },
        { re: /\brename\w*\s+.*file\b/i,                            action: 'rename_file'   },
        { re: /\brename\w*\s+.*(folder|director)/i,                 action: 'rename_folder' },
        { re: /\bmov\w*\s+.*file\b/i,                               action: 'move_file'     },
        { re: /\bcop\w*\s+.*file\b/i,                               action: 'copy_file'     },
    ];

    // Try to extract path hints from the markdown text
    const pathMatch = text.match(/['"`]([\w.\-/\\]+)['"`]/);
    const guessedPath = pathMatch ? pathMatch[1] : '';

    for (const { re, action } of sysActionMap) {
        if (re.test(text)) {
            const codeBlocks = [];
            const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
            let m;
            while ((m = fenceRe.exec(text)) !== null) {
                if (m[2].trim()) codeBlocks.push(m[2].trim());
            }

            // Extract ALL quoted strings — first = source path, second = dest path
            const allPaths = [];
            const pathRe = /['"`]([\w.\-/\\]+)['"`]/g;
            let pm;
            while ((pm = pathRe.exec(text)) !== null) allPaths.push(pm[1]);

            const sourcePath = allPaths[0] || '';
            // For rename/move/copy, dest is the second quoted string
            const needsDest = ['rename_file','rename_folder','move_file','copy_file'].includes(action);
            const destPath  = needsDest ? (allPaths[1] || '') : '';

            const clean = text.replace(/```[\s\S]*?```/g, '').trim();
            const topic = clean.split(/[.!?\n]/)[0].replace(/[*#`]/g, '').trim().slice(0, 60) || 'System Action';
            const openRemainder = clean
                .replace(/^\s*open\s+/i, '')
                .replace(/^(this|the|a|an)\s+/i, '')
                .replace(/^(file|folder|directory|dir)\s+/i, '')
                .replace(/^(named|called)\s+/i, '')
                .trim()
                .replace(/[\s.,;:!?]+$/g, '');

            return JSON.stringify({
                type: 'system',
                topic,
                content: clean.replace(/\n/g, '<br>').slice(0, 300),
                code: codeBlocks[0] || '',
                items: [],
                risk_level: 'None',
                prevention: 'N/A',
                recipient: '', subject: '',
                action,
                path: sourcePath || (action === 'open_path' ? openRemainder : ''),
                dest: destPath
            });
        }
    }
    // ── END SYSTEM DETECTION ────────────────────────────────────────────────

    // Extract fenced code blocks
    const codeBlocks = [];
    const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
    let m;
    while ((m = fenceRe.exec(text)) !== null) {
        if (m[2].trim()) codeBlocks.push({ lang: m[1].trim() || 'py', code: m[2].trim() });
    }

    const hasCode    = codeBlocks.length > 0;
    const listLines  = text.split('\n').filter(l => /^\s*\d+\.\s+/.test(l));
    const isList     = !hasCode && listLines.length >= 2;
    const secKw      = /\b(attack|exploit|vulnerability|malware|phishing|injection|xss|csrf|ddos|ransomware|pentest|hacking|defense)\b/i;
    const isSecurity = secKw.test(text);
    const isEmail    = text.toLowerCase().includes('subject:') && text.toLowerCase().includes('recipient:');

    const clean = text
        .replace(/^\s*(certainly|sure|of course|here is|here are|below is|absolutely)[!,.]?\s*/i, '')
        .trim();
    const topic = clean.split(/[.!?\n]/)[0].trim().replace(/[*#`]/g, '').slice(0, 60) || 'NEURAL_STREAM';

    const toHtml = (s) => s
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm,  '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g,    '<code>$1</code>')
        .replace(/^\s*[-*+]\s+(.*)$/gm, '• $1')
        .trim()
        .replace(/\n/g, '<br>');

    return JSON.stringify({
        type:       hasCode ? 'coding' : (isEmail ? 'email' : (isSecurity ? 'security' : (isList ? 'list' : 'general'))),
        topic,
        content:    toHtml(clean),
        code:       hasCode ? codeBlocks[0].code : '',
        lang:       hasCode ? codeBlocks[0].lang : '',
        items:      isList  ? listLines.map(l => l.replace(/^\s*\d+\.\s+/, '').trim()) : [],
        risk_level: isSecurity ? 'Medium' : 'None',
        prevention: isSecurity ? 'Follow security best practices.' : 'N/A',
        recipient: '', subject: '', action: '', path: '', dest: ''
    });
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
const generateResponse = async (history) => {
    try {
        const deterministic = extractDeterministicSystemAction(history || []);
        if (deterministic) return JSON.stringify(deterministic);

        const messages = [
            { role: 'system', content: SYSTEM_RULES },
            ...history,
        ];

        const response = await axios.post(OLLAMA_URL, {
            model: MODEL_NAME,
            messages,
            stream: false,
            options: {
                num_ctx:        4096,
                num_predict:    2048,
                temperature:    0.4,
                top_p:          0.9,
                repeat_penalty: 1.1,
                // NOTE: Do NOT add stop: ["}"] — it truncates JSON mid-object
            },
        }, { timeout: 120000 });

        if (!response.data || !response.data.message) {
            throw new Error('Ollama returned an empty response.');
        }

        const raw = (response.data.message.content || '').trim();
            console.log(response.data.message);

        try {
            const parsed = robustParse(raw);
            return JSON.stringify(parsed);
        } catch (_) {
            // Model returned pure markdown — convert to schema
            return convertMarkdownToJson(raw);
        }

    } catch (error) {
        console.error(`[AI SERVICE ERROR]: ${error.message}`);
        throw new Error('Neural interface communication failure.');
    }
};

module.exports = { generateResponse };