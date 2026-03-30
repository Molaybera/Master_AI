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
// The primary system prompt lives in the Modelfile baked into the model.
// This is a lightweight reinforcement sent at runtime for multi-turn consistency.
const SYSTEM_RULES = `You are MASTER — a Neural Intelligence specialist in Cyber Security and Programming.

CRITICAL INSTRUCTION: Always respond with a single valid JSON object. No markdown fences. No text outside the JSON.

EMAIL CAPABILITY:
If the user asks to send an email:
1. If missing the recipient or message content, ask the user for them (use type: "general").
2. Once you have BOTH the recipient email and the content, format the response as type: "email". Put the final drafted message in "content", and fill in "recipient" and "subject".

JSON SCHEMA:
{
  "type": "security" | "coding" | "list" | "general" | "email",
  "topic": "2-6 word title",
  "content": "HTML string: use <b> for bold, <br> for newlines. For emails, put the drafted email body here.",
  "code": "raw code only (no fences), or empty string",
  "items": ["strings for list type only"],
  "risk_level": "None" | "Low" | "Medium" | "High" | "Critical",
  "prevention": "defensive steps or N/A",
  "recipient": "target@example.com (only if type is email)",
  "subject": "Email Subject (only if type is email)"
}`;

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
        subject:    get('subject')    || ''
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
    if (obj.type === 'email') return obj; // Protect email type from being overwritten

    const code = (obj.code || '').trim();
    const items = Array.isArray(obj.items) ? obj.items : [];
    if (code.length > 0) obj.type = 'coding';
    else if (items.length > 0 && obj.type !== 'security') obj.type = 'list';
    return obj;
}

// ─── MARKDOWN → JSON FALLBACK ─────────────────────────────────────────────────
/**
 * convertMarkdownToJson — used when the model outputs plain markdown instead
 * of JSON. Produces safe schema-compatible output.
 */
function convertMarkdownToJson(raw) {
    const text = raw.trim();

    // Extract fenced code blocks (backticks escaped for IDE)
    const codeBlocks = [];
    const fenceRe = /\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g;
    let m;
    while ((m = fenceRe.exec(text)) !== null) {
        if (m[2].trim()) codeBlocks.push({ lang: m[1].trim() || 'py', code: m[2].trim() });
    }

    // Detect response type
    const hasCode    = codeBlocks.length > 0;
    const listLines  = text.split('\n').filter(l => /^\s*\d+\.\s+/.test(l));
    const isList     = !hasCode && listLines.length >= 2;
    const secKw      = /\b(attack|exploit|vulnerability|malware|phishing|injection|xss|csrf|ddos|ransomware|pentest|hacking|defense)\b/i;
    const isSecurity = secKw.test(text);

    // Quick heuristic for raw emails
    const isEmail = text.toLowerCase().includes('subject:') && text.toLowerCase().includes('recipient:');

    // Build topic from first sentence
    const clean = text
        .replace(/^\s*(certainly|sure|of course|here is|here are|below is|absolutely)[!,.]?\s*/i, '')
        .trim();
    const topic = clean.split(/[.!?\n]/)[0].trim().replace(/[*#`]/g, '').slice(0, 60) || 'NEURAL_STREAM';

    // Markdown → safe HTML (no styled divs — just semantic tags)
    const toHtml = (s) => s
        .replace(/\`\`\`[\s\S]*?\`\`\`/g, '')           // strip code fences (go to code field)
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm,  '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g,    '<code>$1</code>')
        .replace(/^\s*[-*+]\s+(.*)$/gm, '• $1')
        .trim()
        .replace(/\n/g, '<br>');

    // Detect language for the code field
    const lang = hasCode ? (codeBlocks[0].lang || 'py') : '';

    return JSON.stringify({
        type:       hasCode ? 'coding' : (isEmail ? 'email' : (isSecurity ? 'security' : (isList ? 'list' : 'general'))),
        topic,
        content:    toHtml(clean),
        code:       hasCode ? codeBlocks[0].code : '',
        lang,
        items:      isList  ? listLines.map(l => l.replace(/^\s*\d+\.\s+/, '').trim()) : [],
        risk_level: isSecurity ? 'Medium' : 'None',
        prevention: isSecurity ? 'Follow security best practices.' : 'N/A',
        recipient:  '',
        subject:    ''
    });
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
const generateResponse = async (history) => {
    try {
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