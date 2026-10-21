import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STATE_DIR = path.join(os.homedir(), '.dsh', 'codex-bridge');

export async function discoverCodex(explicit) {
  if (explicit) { await fs.access(explicit); return explicit; }
  const root = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'OpenAI', 'Codex', 'bin');
  let dirs = [];
  try { dirs = await fs.readdir(root, { withFileTypes: true }); } catch {}
  const candidates = [];
  for (const dir of dirs.filter(item => item.isDirectory())) {
    const command = path.join(root, dir.name, 'codex.exe');
    try { candidates.push({ command, time: (await fs.stat(command)).mtimeMs }); } catch {}
  }
  candidates.sort((a, b) => b.time - a.time);
  if (candidates.length) return candidates[0].command;
  throw new Error('未找到 Codex。请在 ~/.dsh/codex-bridge/settings.json 填写 codexCommand 的绝对路径。');
}
