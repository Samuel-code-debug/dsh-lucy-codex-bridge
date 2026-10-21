import { DiscussionBridge } from './runtime.js';
import { SessionTelemetry } from './telemetry.js';
import { registerPanel } from './remote.js';
import { promises as fs, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const name = 'lucy-codex-bridge';
export const inject = ['tools', 'systemPrompt', 'typert'];

const DIAG_DIR = path.join(os.homedir(), '.dsh', 'codex-bridge');
const DIAG = path.join(DIAG_DIR, 'activate-error.txt');

function logFailure(stage, error) {
  try {
    mkdirSync(DIAG_DIR, { recursive: true });
    writeFileSync(DIAG, [
      `time: ${new Date().toISOString()}`,
      `stage: ${stage}`,
      `error: ${error && error.message}`,
      `stack:`,
      String((error && error.stack) || '').split('\n').slice(0, 14).join('\n'),
      '',
    ].join('\n'), 'utf8');
  } catch {}
}

// 模块加载阶段就打一枪，确认文件到底跑没跑到
try {
  mkdirSync(DIAG_DIR, { recursive: true });
  writeFileSync(path.join(DIAG_DIR, 'module-loaded.txt'), `loaded ${new Date().toISOString()}\n`, 'utf8');
} catch {}

export function apply(ctx) {
  try {
    const bridge = new DiscussionBridge();
    registerPanel(ctx, bridge, new SessionTelemetry());
    ctx.effect(() => () => bridge.close());
    ctx.systemPrompt.section({
      name: 'lucy-codex-bridge', order: 500,
      text: '用户已安装 Lucy 与 Codex（砾子）的讨论通道。用户让你问 Codex、问砾子、一起讨论时，调用 codex_discuss(action="ask",message=具体问题及必要代码片段)。它会自动附带近期用户/Lucy 的公开文字，并延续独立 Codex 会话。附件、思考过程和工具输出不会自动转发。不要用它处理普通问题或自主施工。每条用户消息最多调用一次 ask，收到结果后在回复中明确标注“砾子”和“Lucy”的意见，不冒充对方。需要下一轮时等用户说继续。status 不会发模型请求。DSH 的停止会停止本轮调用。',
    });
    // Native ToolDefinition with ordinary JSON Schema; no bundled private imports required.
    ctx.tools.register({
      name: 'codex_discuss',
      description: '与砾子（Codex）在当前 DSH 会话里讨论。ask 每条用户消息最多一次，使用持久上下文；status 只查看连接状态。收到回复后明确区分砾子与 Lucy 的意见。',
      parameters: {
        type: 'object', additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['ask', 'status'] },
          message: { type: 'string', description: '给砾子的问题和必要代码片段；status 时可留空。' },
        }, required: ['action'],
      },
      timeoutMs: 190000,
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: Object.fromEntries(['speaker', 'state', 'threadId', 'model', 'text'].map(key => [key, { type: 'string' }])),
          required: ['speaker', 'state', 'threadId', 'model', 'text'],
        },
        render: (_args, value) => [{ type: 'text', text: `【${value.speaker}】\n${value.text}\n\n模型：${value.model || '默认'}；会话：${value.threadId || '尚未创建'}` }],
      },
      presentCall: args => ({ card: 'generic', title: args.action === 'status' ? '查看砾子状态' : 'Lucy → 砾子', kind: 'other', rawInput: args.message || '' }),
      async execute(args, exec) {
        if (!exec.agent?.session) throw new Error('此工具需要 DSH 会话。');
        if (args.action === 'status') return bridge.status(exec.agent.session.id);
        if (args.action !== 'ask') throw new Error('action 只支持 ask 或 status。');
        return bridge.ask(exec.agent.session, args.message, exec.signal);
      },
    });
    // 启动成功就把上次的失败记录清掉
    fs.rm(DIAG, { force: true }).catch(() => {});
  } catch (error) {
    logFailure('apply', error);
    throw error;
  }
}
