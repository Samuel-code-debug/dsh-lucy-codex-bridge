import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Owned connections may be reused while idle; never attach to the desktop's live thread.
export class CodexRpc {
  constructor(command, cwd) {
    this.pending = new Map();
    this.listeners = new Set();
    this.nextId = 0;
    this.closed = false;
    this.diagnostics = '';
    this.child = spawn(command, ['app-server', '--stdio'], {
      cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
    });
    this.child.stderr.on('data', chunk => {
      this.diagnostics = (this.diagnostics + chunk.toString()).slice(-4000);
    });
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.method && message.id !== undefined) {
        // Discussion mode never auto-approves commands, changes, permissions or tools.
        let result;
        if (message.method === 'item/permissions/requestApproval') result = { permissions: {}, scope: 'turn' };
        else if (/requestApproval$/.test(message.method)) result = { decision: 'decline' };
        else if (message.method === 'item/tool/call') result = {
          contentItems: [{ type: 'inputText', text: 'Bridge discussion mode: tools are unavailable.' }], success: false,
        };
        this.send(result ? { id: message.id, result } : {
          id: message.id, error: { code: -32601, message: 'This bridge supports discussion only; interactive requests are unavailable.' },
        });
        return;
      }
      if (message.id !== undefined) {
        const waiting = this.pending.get(message.id);
        if (!waiting) return;
        this.pending.delete(message.id);
        clearTimeout(waiting.timer);
        if (message.error) waiting.reject(new Error(message.error.message || JSON.stringify(message.error)));
        else waiting.resolve(message.result);
      } else {
        for (const listener of this.listeners) listener(message);
      }
    });
    this.child.on('error', error => this.fail(error));
    this.child.on('exit', (code, signal) => this.fail(new Error(`Codex App Server exited (${code ?? signal}).`)));
    this.child.stdin.on('error', error => this.fail(error));
  }
  send(message) {
    if (!this.closed) this.child.stdin.write(JSON.stringify(message) + '\n');
  }
  request(method, params = {}, timeout = 30000) {
    if (this.closed) return Promise.reject(new Error('Codex connection closed.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ id, method, params });
    });
  }
  async initialize() {
    const result = await this.request('initialize', {
      clientInfo: { name: 'lucy_codex_bridge', title: 'DeepSeek ↔ 砾子', version: '0.2.1' },
    });
    this.send({ method: 'initialized', params: {} });
    return result;
  }
  fail(error) {
    if (this.closed) return;
    this.closed = true;
    for (const waiting of this.pending.values()) {
      clearTimeout(waiting.timer); waiting.reject(error);
    }
    this.pending.clear();
    for (const listener of this.listeners) listener({ method: 'bridge/closed', params: { error } });
    this.listeners.clear();
  }
  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    this.fail(new Error('Codex connection stopped.'));
    this.child.stdin.end();
    await new Promise(resolve => {
      const timer = setTimeout(() => { this.child.kill(); resolve(); }, 1200);
      this.child.once('exit', () => { clearTimeout(timer); resolve(); });
    });
    this.lines.close();
  }
}

