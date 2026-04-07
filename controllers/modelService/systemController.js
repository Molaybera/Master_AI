/**
 * systemController.js
 * Path: controllers/modelService/systemController.js
 *
 * Calls terminal_agent.py via child_process for all file system operations.
 * Maintains stateful cwd (current working directory) per user session.
 */

const path        = require('path');
const { execFile } = require('child_process');
const User        = require('../../models/User');

function isInsideBase(targetPath, basePath) {
    const rel = path.relative(basePath, targetPath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
}

// ─── Python bridge ────────────────────────────────────────────────────────────
/**
 * callPython — sends a payload to terminal_agent.py via stdin, returns parsed JSON.
 */
function callPython(payload) {
    return new Promise((resolve, reject) => {
        const agentPath = path.join(__dirname, 'terminal_agent.py');

        const proc = execFile(
            'python',
            [agentPath],
            { timeout: 35000 },
            (err, stdout, stderr) => {
                if (err) {
                    // Timeout or crash — stderr may have a useful message
                    return reject(new Error(stderr || err.message));
                }
                try {
                    const result = JSON.parse(stdout.trim());
                    resolve(result);
                } catch (_) {
                    reject(new Error(`Python agent returned non-JSON: ${stdout.slice(0, 200)}`));
                }
            }
        );

        // Send payload via stdin (safer than argv for large code content)
        proc.stdin.write(JSON.stringify(payload));
        proc.stdin.end();
    });
}

// ─── Main controller ──────────────────────────────────────────────────────────
const executeSystemCommand = async (req, res) => {
    try {
        const { action, targetPath, destPath, content, forceDelete } = req.body;
        const userId = req.session.userId;

        // 1. Authenticate and verify workspace exists
        const user = await User.findById(userId);
        if (!user || !user.workspacePath) {
            return res.status(403).json({
                success: false,
                message: 'No Workspace Directory configured. Please set your sandbox path in Profile Settings.'
            });
        }

        const base = path.resolve(user.workspacePath).replace(/\\/g, '/');

        // ── SECURITY: Block C drive entirely ──────────────────────────────
        if (/^[cC]:/.test(base)) {
            return res.status(403).json({
                success: false,
                message: 'SECURITY BLOCK: Workspace cannot be on the C: drive. Please use D:, E:, etc.'
            });
        }

        // 2. Resolve stateful cwd from session (defaults to workspace root)
        if (!req.session.cwd || !isInsideBase(req.session.cwd, base)) {
            req.session.cwd = base;
        }
        const cwd = req.session.cwd;

        // CD is intentionally disabled per product behavior.
        if (action === 'cd') {
            return res.status(400).json({
                success: false,
                message: 'Change directory is disabled.',
                actionDisabled: true
            });
        }

        if (action === 'edit_file') {
            return res.status(400).json({
                success: false,
                message: 'Edit/Rewrite is disabled. Use create_file to write full file content.',
                actionDisabled: true
            });
        }

        // 3. Build Python payload
        const payload = {
            action:      action,
            cwd:         cwd.replace(/\\/g, '/'),
            base:        base,
            path:        (targetPath || '').replace(/\\/g, '/'),
            dest:        (destPath   || '').replace(/\\/g, '/'),
            code:        content     || '',
            forceDelete: forceDelete || false
        };

        // 4. Call Python agent
        const result = await callPython(payload);

        if (!result.success) {
            return res.status(result.requiresConfirmation ? 409 : 400).json({
                success: false,
                message: result.message || 'Agent returned failure.',
                requiresConfirmation: !!result.requiresConfirmation,
                isNotEmpty: !!result.isNotEmpty,
                warning: !!result.warning,
                actionDisabled: !!result.actionDisabled,
                data: result.data || null
            });
        }

        // 6. Ensure all paths use forward slashes for consistency
        const normalizedCwd = req.session.cwd.replace(/\\/g, '/');
        const normalizedBase = base.replace(/\\/g, '/');
        const displayCwd = normalizedCwd.replace(normalizedBase, '').replace(/^[\/\\]/, '') || '.';
        
        return res.status(200).json({
            success:  true,
            message:  result.message,
            data:     result.data   || null,
            newCwd:   result.newCwd ? result.newCwd.replace(/\\/g, '/') : null,
            currentCwd: normalizedCwd,
            displayCwd: displayCwd
        });

    } catch (error) {
        console.error('[SYSTEM AGENT ERROR]:', error);

        // Friendly error messages
        let msg = error.message || 'Unknown error';
        if (msg.includes('ENOENT') || msg.includes('not found'))
            msg = 'File or directory not found.';
        else if (msg.includes('EACCES') || msg.includes('EPERM') || msg.includes('Permission'))
            msg = 'Permission denied.';
        else if (msg.includes('EEXIST'))
            msg = 'File or folder already exists.';
        else if (msg.includes('python') && msg.includes('not found'))
            msg = 'Python is not installed or not in PATH. Please install Python 3.';

        return res.status(500).json({ success: false, message: msg });
    }
};

// ─── Get current directory ────────────────────────────────────────────────────
/**
 * getCwd — returns the user's current working directory.
 * Called by the frontend on page load to show the breadcrumb.
 */
const getCwd = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user   = await User.findById(userId);

        if (!user || !user.workspacePath) {
            return res.status(403).json({ success: false, message: 'No workspace configured.' });
        }

        const base = path.resolve(user.workspacePath).replace(/\\/g, '/');

        if (!req.session.cwd || req.session.cwd === base || !isInsideBase(req.session.cwd, base)) {
            req.session.cwd = base;
        }

        const displayCwd = req.session.cwd.replace(base, '').replace(/^[/\\]/, '') || '.';

        return res.status(200).json({
            success:    true,
            currentCwd: req.session.cwd,
            displayCwd,
            base
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Reset cwd to workspace root ─────────────────────────────────────────────
const resetCwd = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user || !user.workspacePath) {
            return res.status(403).json({ success: false, message: 'No workspace configured.' });
        }
        req.session.cwd = path.resolve(user.workspacePath).replace(/\\/g, '/');
        return res.status(200).json({
            success:    true,
            currentCwd: req.session.cwd,
            displayCwd: '.',
            message:    'Reset to workspace root.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { executeSystemCommand, getCwd, resetCwd };