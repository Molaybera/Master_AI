#!/usr/bin/env python3
"""
terminal_agent.py
Path: controllers/modelService/terminal_agent.py

Stateful file system agent called by systemController.js via child_process.
Receives a JSON payload via stdin, executes the action, prints JSON result to stdout.
"""

import sys
import json
import os
import shutil
import subprocess
import traceback
import webbrowser
from pathlib import Path

def run(data):
    action  = data.get('action', '')
    cwd     = data.get('cwd', '')       # absolute current working directory
    base    = data.get('base', '')      # absolute workspace root (sandbox boundary)
    path_in = data.get('path', '')      # relative target path
    dest_in = data.get('dest', '')      # relative destination path
    code    = data.get('code', '')      # file content for create/edit
    force_delete = data.get('forceDelete', False)  # force delete for folders with contents

    if isinstance(path_in, str):
        path_in = path_in.strip().strip('"\'').rstrip('.,;')
    if isinstance(dest_in, str):
        dest_in = dest_in.strip().strip('"\'').rstrip('.,;')

    # ── SECURITY: normalise base dir ──────────────────────────────────────────
    base = os.path.normpath(base)
    if not cwd or not os.path.isdir(cwd):
        cwd = base

    def safe_abs(rel):
        """Resolve a relative path against cwd, block escaping the base."""
        if not rel or rel.strip() == '':
            return None
        if rel == '.':
            return cwd
        
        # Join with cwd and normalize
        target = os.path.normpath(os.path.join(cwd, rel))
        target = os.path.abspath(target)
        base_norm = os.path.abspath(base)
        
        # Simple containment check using relpath
        try:
            rel_path = os.path.relpath(target, base_norm)
            if rel_path.startswith('..'):
                raise PermissionError(f"Security: path escapes workspace.")
        except ValueError:
            raise PermissionError(f"Security: path escapes workspace.")
        
        return target

    def find_vscode_exe():
        """Best-effort VS Code binary discovery on Windows."""
        candidates = [
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Microsoft VS Code', 'Code.exe'),
            os.path.join(os.environ.get('ProgramFiles', ''), 'Microsoft VS Code', 'Code.exe'),
            os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Microsoft VS Code', 'Code.exe'),
        ]
        for c in candidates:
            if c and os.path.isfile(c):
                return c
        return None

    def file_uri(p):
        return Path(p).resolve().as_uri()

    # ── ACTION ROUTER ─────────────────────────────────────────────────────────

    # ── CD ────────────────────────────────────────────────────────────────────
    if action == 'cd':
        return {'success': False, 'message': 'Change directory is disabled.', 'actionDisabled': True}

    # ── CREATE FOLDER ─────────────────────────────────────────────────────────
    elif action == 'create_folder':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No folder path specified.'}
        os.makedirs(target, exist_ok=True)
        return {'success': True, 'message': f"Created folder: {path_in}"}

    # ── CREATE FILE ───────────────────────────────────────────────────────────
    elif action == 'create_file':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No file path specified.'}
        parent_dir = os.path.dirname(target)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            f.write(code)
        return {'success': True, 'message': f"Created file: {path_in}"}

    # ── EDIT FILE ─────────────────────────────────────────────────────────────
    elif action == 'edit_file':
        return {'success': False, 'message': 'Edit/Rewrite is disabled.', 'actionDisabled': True}

    # ── OPEN FILE/FOLDER IN SYSTEM ───────────────────────────────────────────
    elif action == 'open_path':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No path specified for open.'}
        if not os.path.exists(target):
            return {'success': False, 'message': f"Path not found: '{path_in}'"}

        try:
            if os.path.isdir(target):
                if os.name == 'nt':
                    os.startfile(target)
                    return {
                        'success': True,
                        'message': f"Opened folder: {path_in}",
                        'data': {'openedWith': 'explorer', 'target': target}
                    }
                else:
                    opener = 'open' if sys.platform == 'darwin' else 'xdg-open'
                    p = subprocess.Popen([opener, target])
                    return {
                        'success': True,
                        'message': f"Opened folder: {path_in}",
                        'data': {'openedWith': opener, 'pid': p.pid, 'target': target}
                    }

            ext = os.path.splitext(target)[1].lower()
            code_exts = {'.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.md', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.xml', '.yml', '.yaml', '.sql', '.sh'}

            if os.name == 'nt':
                if ext in code_exts:
                    vscode_exe = find_vscode_exe()
                    if vscode_exe:
                        p = subprocess.Popen([vscode_exe, target])
                        return {
                            'success': True,
                            'message': f"Opened in VS Code: {path_in}",
                            'data': {'openedWith': 'vscode', 'pid': p.pid, 'target': target}
                        }
                    try:
                        p = subprocess.Popen(['code', target])
                        return {
                            'success': True,
                            'message': f"Opened in VS Code: {path_in}",
                            'data': {'openedWith': 'code-cli', 'pid': p.pid, 'target': target}
                        }
                    except FileNotFoundError:
                        os.startfile(target)
                        return {
                            'success': True,
                            'message': f"Opened file (default app): {path_in}",
                            'data': {'openedWith': 'default', 'target': target}
                        }
                if ext == '.txt':
                    p = subprocess.Popen(['notepad.exe', target])
                    return {
                        'success': True,
                        'message': f"Opened in Notepad: {path_in}",
                        'data': {'openedWith': 'notepad', 'pid': p.pid, 'target': target}
                    }
                if ext == '.pdf':
                    opened = webbrowser.open_new_tab(file_uri(target))
                    if not opened:
                        os.startfile(target)
                        return {
                            'success': True,
                            'message': f"Opened PDF: {path_in}",
                            'data': {'openedWith': 'default', 'target': target}
                        }
                    return {
                        'success': True,
                        'message': f"Opened PDF in browser: {path_in}",
                        'data': {'openedWith': 'browser', 'target': target}
                    }

                os.startfile(target)
                return {
                    'success': True,
                    'message': f"Opened file: {path_in}",
                    'data': {'openedWith': 'default', 'target': target}
                }

            opener = 'open' if sys.platform == 'darwin' else 'xdg-open'
            p = subprocess.Popen([opener, target])
            return {
                'success': True,
                'message': f"Opened path: {path_in}",
                'data': {'openedWith': opener, 'pid': p.pid, 'target': target}
            }
        except Exception as e:
            return {'success': False, 'message': f"Open failed: {str(e)}"}

    # ── READ FILE OR LIST DIRECTORY ───────────────────────────────────────────
    elif action == 'read_file':
        target = safe_abs(path_in) if path_in and path_in != '.' else cwd
        if not target:
            target = cwd
        if not os.path.exists(target):
            return {'success': False, 'message': f"Path not found: '{path_in}'"}

        if os.path.isdir(target):
            entries = sorted(os.listdir(target))
            if not entries:
                listing = '  (Empty directory)'
            else:
                lines = []
                for e in entries:
                    full_e = os.path.join(target, e)
                    icon = '📁' if os.path.isdir(full_e) else '📄'
                    size = ''
                    if os.path.isfile(full_e):
                        b = os.path.getsize(full_e)
                        size = f"  ({b:,} bytes)" if b < 1024 else f"  ({b/1024:.1f} KB)"
                    lines.append(f"  {icon} {e}{size}")
                listing = '\n'.join(lines)
            rel = os.path.relpath(target, base)
            header = f"[Directory: {rel}]  —  {len(entries)} item(s)\n"
            return {'success': True,
                    'message': f"Listed: {path_in or '.'}",
                    'data': {'content': header + listing}}
        else:
            with open(target, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            return {'success': True,
                    'message': f"Read file: {path_in}",
                    'data': {'content': content}}

    # ── DELETE FILE ───────────────────────────────────────────────────────────
    elif action == 'delete_file':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No file path specified.'}
        if not os.path.isfile(target):
            return {'success': False, 'message': f"File not found: '{path_in}'"}
        os.remove(target)
        return {'success': True, 'message': f"Deleted file: {path_in}"}

    # ── DELETE FOLDER ─────────────────────────────────────────────────────────
    elif action == 'delete_folder':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No folder path specified.'}
        if not os.path.isdir(target):
            return {'success': False, 'message': f"Folder not found: {path_in}"}
        
        entries = os.listdir(target)
        if entries and not force_delete:
            # Return warning - do NOT delete yet, ask for confirmation
            file_list = ', '.join(entries[:5]) + ('...' if len(entries) > 5 else '')
            return {
                'success': False,
                'message': f"WARNING: Folder '{path_in}' contains {len(entries)} item(s): {file_list}. If you allow, ALL items will be PERMANENTLY DELETED.",
                'requiresConfirmation': True,
                'isNotEmpty': True
            }
        else:
            # Delete folder and all contents
            shutil.rmtree(target)
            if entries:
                return {'success': True, 'message': f"Deleted folder '{path_in}' with {len(entries)} item(s) inside"}
            else:
                return {'success': True, 'message': f"Deleted empty folder: {path_in}"}
    # ── RENAME FILE ───────────────────────────────────────────────────────────
    elif action == 'rename_file':
        src = safe_abs(path_in)
        dst = safe_abs(dest_in)
        if not src:
            return {'success': False, 'message': 'No source path specified.'}
        if not dst:
            return {'success': False, 'message': 'No destination name specified.'}
        if not os.path.isfile(src):
            return {'success': False, 'message': f"File not found: '{path_in}'"}
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.rename(src, dst)
        return {'success': True, 'message': f"Renamed: {path_in} → {dest_in}"}

    # ── RENAME FOLDER ─────────────────────────────────────────────────────────
    elif action == 'rename_folder':
        src = safe_abs(path_in)
        dst = safe_abs(dest_in)
        if not src:
            return {'success': False, 'message': 'No source path specified.'}
        if not dst:
            return {'success': False, 'message': 'No destination name specified.'}
        if not os.path.isdir(src):
            return {'success': False, 'message': f"Folder not found: '{path_in}'"}
        os.rename(src, dst)
        return {'success': True, 'message': f"Renamed: {path_in} → {dest_in}"}

    # ── MOVE FILE ─────────────────────────────────────────────────────────────
    elif action == 'move_file':
        src = safe_abs(path_in)
        dst = safe_abs(dest_in)
        if not src:
            return {'success': False, 'message': 'No source path specified.'}
        if not dst:
            return {'success': False, 'message': 'No destination path specified.'}
        if not os.path.exists(src):
            return {'success': False, 'message': f"Source not found: '{path_in}'"}
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
        return {'success': True, 'message': f"Moved: {path_in} → {dest_in}"}

    # ── COPY FILE ─────────────────────────────────────────────────────────────
    elif action == 'copy_file':
        src = safe_abs(path_in)
        dst = safe_abs(dest_in)
        if not src:
            return {'success': False, 'message': 'No source path specified.'}
        if not dst:
            return {'success': False, 'message': 'No destination path specified.'}
        if not os.path.isfile(src):
            return {'success': False, 'message': f"File not found: '{path_in}'"}
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        return {'success': True, 'message': f"Copied: {path_in} → {dest_in}"}

    # ── RUN FILE ──────────────────────────────────────────────────────────────
    elif action == 'run_file':
        target = safe_abs(path_in)
        if not target:
            return {'success': False, 'message': 'No file path specified.'}
        if not os.path.isfile(target):
            return {'success': False, 'message': f"File not found: '{path_in}'"}
        ext = os.path.splitext(target)[1].lower()
        runner_map = {
            '.py':   ['python', target],
            '.js':   ['node',   target],
            '.ts':   ['ts-node',target],
            '.sh':   ['bash',   target],
            '.rb':   ['ruby',   target],
        }
        cmd = runner_map.get(ext)
        if not cmd:
            return {'success': False, 'message': f"Cannot run file type '{ext}'. Supported: .py .js .ts .sh .rb"}
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=cwd
            )
            output = proc.stdout or ''
            errors = proc.stderr or ''
            combined = output
            if errors:
                combined += f"\n--- STDERR ---\n{errors}"
            return {
                'success': proc.returncode == 0,
                'message': f"Ran {path_in} (exit code {proc.returncode})",
                'data': {'content': combined or '(No output)'}
            }
        except subprocess.TimeoutExpired:
            return {'success': False, 'message': 'Execution timed out after 30 seconds.'}

    else:
        return {'success': False, 'message': f"Unknown action: '{action}'"}


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        result = run(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'message': str(e),
            'trace': traceback.format_exc()
        }))