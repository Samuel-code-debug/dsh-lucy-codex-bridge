export function textContent(content) {
  return Array.isArray(content) ? content.filter(x => x.type === 'text' && typeof x.text === 'string').map(x => x.text).join('\n') : '';
}

const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
export function dshUsage(usage) {
  if (!usage) return null;
  const fresh = valid(usage.inputTokens), cached = valid(usage.cacheReadTokens), written = valid(usage.cacheWriteTokens);
  return {
    input: fresh === null ? null : fresh + (cached || 0) + (written || 0),
    fresh, cached, cacheWrite: written, output: valid(usage.outputTokens),
    total: valid(usage.totalTokens), reasoning: null,
  };
}
export function codexUsage(usage) {
  if (!usage) return null;
  return {
    input: valid(usage.inputTokens), cached: valid(usage.cachedInputTokens),
    cacheWrite: valid(usage.cacheWriteInputTokens), output: valid(usage.outputTokens),
    total: valid(usage.totalTokens), reasoning: valid(usage.reasoningOutputTokens),
    fresh: valid(usage.inputTokens) === null || valid(usage.cachedInputTokens) === null ? null : Math.max(0, usage.inputTokens - usage.cachedInputTokens),
  };
}
function sum(a, b) {
  if (!b) return a;
  if (!a) return { ...b };
  return Object.fromEntries(Object.keys(b).map(k => [k, a[k] === null && b[k] === null ? null : (a[k] || 0) + (b[k] || 0)]));
}
// Fold committed public events once, never forward reasoning blocks or raw tool output.
export class SessionTelemetry {
  caches = new WeakMap();
  read(session, limit = 100) {
    const events = session.snapshotEvents();
    let c = this.caches.get(session);
    if (!c || c.cursor > events.length) {
      c = { cursor: 0, timeline: [], calls: new Set(), inDiscussion: false, user: null, total: null, last: null, round: null, roundTurn: null, usageCount: 0, model: '' };
      this.caches.set(session, c);
    }
    for (; c.cursor < events.length; c.cursor++) {
      const e = events[c.cursor], d = e.data || {};
      if (e.type === 'user/message') {
        c.user = { id: `event-${e.seq}`, speaker: '用户', text: textContent(d.content), time: e.time };
        c.inDiscussion = false;
      }
      if (e.type === 'tool/call' && d.name === 'codex_discuss') {
        let args; try { args = typeof d.arguments === 'string' ? JSON.parse(d.arguments) : d.arguments; } catch { continue; }
        if (args?.action !== 'ask') continue;
        if (!c.inDiscussion && c.user?.text) c.timeline.push(c.user);
        c.inDiscussion = true;
        c.roundTurn = d.turn;
        c.calls.add(d.callId);
        c.timeline.push({ id: `call-${d.callId}`, speaker: 'DeepSeek', text: args.message || '', time: e.time, kind: 'question' });
      }
      if (e.type === 'tool/result' && c.calls.has(d.message?.toolCallId)) {
        const text = textContent(d.message.content).replace(/^【Codex \/ 砾子】\n/, '').replace(/\n\n模型：[^\n]*；会话：[^\n]*$/, '');
        c.timeline.push({ id: `result-${d.message.toolCallId}`, speaker: 'Codex', text, time: e.time, kind: d.message.isError ? 'error' : 'answer' });
      }
      if (e.type === 'assistant/message') {
        const usage = dshUsage(d.usage);
        if (usage) {
          c.total = sum(c.total, usage); c.last = usage; c.usageCount++;
          if (c.usageTurn !== d.turn) { c.usageTurn = d.turn; c.currentTurnUsage = null; }
          c.currentTurnUsage = sum(c.currentTurnUsage, usage);
        }
        c.model = d.message?.source?.model || c.model;
        const text = textContent(d.message?.content);
        if (c.inDiscussion && text) c.timeline.push({ id: `event-${e.seq}`, speaker: 'DeepSeek', text, time: e.time, kind: 'answer' });
      }
      if (c.roundTurn === d.turn && c.usageTurn === d.turn) c.round = c.currentTurnUsage;
    }
    return {
      messages: c.timeline.slice(-limit), totalMessages: c.timeline.length,
      deepseek: { model: c.model, last: c.last, round: c.round, total: c.total, usageCount: c.usageCount },
    };
  }
}

