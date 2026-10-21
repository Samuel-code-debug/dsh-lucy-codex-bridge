window.__ModuleLoader__.load({
  id: 'dsh-lucy-codex-bridge',
  factory: function (require) {
    const React = require('react');
    const z = require('zod').z;
    const h = React.createElement;
    const ID = 'lucy-codex-cooperation';
    const json = { mode: 'src-json' };
    const codec = (name, create) => ({ mode: 'strict', typeSymbol: 'dsh-lucy-codex-bridge#' + name, create });
    const descriptors = ['snapshot', 'stop', 'quota'].map(method => ({
      id: 'dsh-lucy-codex-bridge#lucyCodex/' + method,
      service: 'lucyCodexController', namespace: 'lucyCodex', method, invocation: { kind: 'direct' },
      parameters: [
        { name: 'session', wire: 'sessionId', source: 'lookup', lookup: 'session', codec: codec('sessionId', () => z.string().min(1)) },
        { name: 'options', wire: 'options', source: 'json', codec: codec('options', () => z.object({ limit: z.number().int().min(100).max(2000).optional(), locale: z.string().max(32).optional() })), acceptsUndefined: true },
      ], result: json,
    }));
    const CSS = `
.lc-panel{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#17191d);color:var(--dsw-alias-label-primary,#eceef2);font:13px/1.6 system-ui,sans-serif}
.lc-panel *{box-sizing:border-box}.lc-top{padding:18px 16px 12px;border-bottom:1px solid #80808025}.lc-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.lc-heading h2{font-size:17px;margin:0;font-weight:650}.lc-sub{opacity:.58;font-size:11px}.lc-accounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.lc-account{background:#8080800c;border:1px solid #80808025;border-radius:10px;padding:9px 10px;min-width:0}.lc-name{font-size:12px;font-weight:650;display:flex;align-items:center;gap:6px}.lc-dot{width:6px;height:6px;border-radius:50%;background:#5da5fa}.lc-dot.codex{background:#a58bf5}.lc-amount{font-size:12px;margin-top:5px}.lc-meter{height:3px;background:#80808026;border-radius:9px;overflow:hidden;margin:4px 0}.lc-meter>span{display:block;height:100%;background:#a58bf5}.lc-controls{display:flex;gap:6px;align-items:center}.lc-btn{border:1px solid #80808035;border-radius:7px;background:transparent;color:inherit;padding:4px 9px;font:inherit;font-size:11px;cursor:pointer}.lc-btn:hover{background:#80808020}.lc-btn:disabled{opacity:.4;cursor:default}.lc-btn.stop{color:#ef8989;border-color:#ef898955}.lc-scroll{overflow:auto;flex:1;min-height:0;padding:14px 14px 8px;overscroll-behavior:contain}.lc-msg{margin:0 0 14px}.lc-msghead{display:flex;justify-content:space-between;gap:10px;font-size:11px;opacity:.7;margin-bottom:5px}.lc-bubble{border:1px solid #80808022;border-radius:10px;padding:10px 12px;white-space:pre-wrap;overflow-wrap:anywhere;background:#80808009;user-select:text}.lc-msg.codex .lc-bubble{border-left:2px solid #a58bf5;background:#a58bf509}.lc-msg.lucy .lc-bubble{border-left:2px solid #5da5fa}.lc-msg.user .lc-bubble{font-size:12px;opacity:.7}.lc-msg.error .lc-bubble{border-color:#d8676755;color:#ef8989}.lc-empty{padding:36px 12px;color:var(--dsw-alias-label-secondary,#aaa);text-align:center}.lc-empty strong{display:block;font-weight:500;margin:14px 0 5px;color:var(--dsw-alias-label-primary,#eee)}.lc-empty p{font-size:12px;line-height:1.8}.lc-foot{border-top:1px solid #80808025;padding:10px 14px 12px;background:#80808006}.lc-status{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;margin-bottom:7px}.lc-live{color:#a58bf5}.lc-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lc-stat{padding:7px 9px;border-radius:7px;background:#8080800b}.lc-number{font-variant-numeric:tabular-nums;font-size:15px;font-weight:600}.lc-detail{font-size:11px;opacity:.65}.lc-panel details{margin-top:7px;font-size:11px}.lc-panel summary{cursor:pointer;opacity:.65}.lc-warn{font-size:11px;color:#e4a274;padding:5px 0;overflow-wrap:anywhere}.lc-load{display:block;margin:0 auto 14px}.lc-open{background:transparent;border:1px solid #80808030;border-radius:7px;color:inherit;padding:4px 9px;font:inherit;font-size:12px;cursor:pointer}
`;
    const number = value => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : '—';
    const seconds = value => typeof value === 'number' ? (value / 1000).toFixed(1) + ' 秒' : '—';
    const time = value => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const phases = { connecting: '连接 Codex', resuming: '恢复上下文', waiting: '等待回复', replying: '正在回复', stopping: '正在停止' };
    function Icon() { return h('span', { 'aria-hidden': true, style: { fontSize: 23 } }, '⇄'); }
    function Quota({ value }) {
      if (!value || value.status !== 'ready') return h('div', { className: 'lc-amount lc-sub' }, value ? '额度暂不可获取' : '正在读取额度…');
      const buckets = Object.entries(value.buckets || {});
      if (!buckets.length) return h('div', { className: 'lc-sub' }, '暂无配额信息');
      return buckets.map(([id, bucket]) => h('div', { key: id }, buckets.length > 1 && h('div', { className: 'lc-sub' }, bucket.limitName || id), ...['primary','secondary'].map(key => {
        const q = bucket[key]; if (!q) return null;
        const left = typeof q.usedPercent === 'number' ? Math.max(0, Math.min(100, 100 - q.usedPercent)) : null;
        const mins = q.windowDurationMins;
        const label = mins === 10080 ? '周' : mins && mins % 60 === 0 ? (mins / 60) + '小时' : mins ? mins + '分钟' : '窗口';
        return h('div', { key, className: 'lc-amount', title: q.resetsAt ? '重置：' + new Date(q.resetsAt * 1000).toLocaleString() : '' }, label + '剩余 ' + (left === null ? '—' : left + '%'), h('div', { className: 'lc-meter' }, h('span', { style: { width: (left || 0) + '%' } })));
      })));
    }
    function Balance({ value }) {
      if (!value || value.status !== 'ready') return h('div', { className: 'lc-amount lc-sub' }, value ? '余额暂不可获取' : '正在读取余额…');
      const format = wallets => (wallets || []).map(w => (w.currency === 'CNY' ? '¥' : w.currency === 'USD' ? '$' : w.currency + ' ') + w.balance).join(' + ') || '—';
      return h(React.Fragment, null, h('div', { className: 'lc-amount' }, '充值 ' + format(value.value)), h('div', { className: 'lc-amount' }, '赠送 ' + format(value.bonusWallets)));
    }
    function Usage({ title, value }) {
      return h('div', { className: 'lc-stat' }, h('div', { className: 'lc-sub' }, title), h('div', { className: 'lc-number' }, number(value?.total)), h('div', { className: 'lc-detail' }, '输入 ' + number(value?.input) + ' · 输出 ' + number(value?.output)), h('div', { className: 'lc-detail' }, '缓存命中 ' + number(value?.cached)));
    }
    function Panel({ sessionId, __ctx: ctx }) {
      const [data, setData] = React.useState(null), [quotas, setQuotas] = React.useState(null), [error, setError] = React.useState('');
      const [limit, setLimit] = React.useState(100), [quotaBusy, setQuotaBusy] = React.useState(false);
      const scroll = React.useRef(null), stick = React.useRef(true), alive = React.useRef(true);
      React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
      const refreshQuota = React.useCallback(async () => {
        setQuotaBusy(true);
        try {
          const r = await ctx.remote.lucyCodex.quota(sessionId, { locale: navigator.language });
          if (!r.ok) throw r.error;
          if (alive.current) setQuotas(r.value);
        } catch (e) { if (alive.current) setError(e.message || String(e)); }
        finally { if (alive.current) setQuotaBusy(false); }
      }, [sessionId]);
      React.useEffect(() => {
        let closed = false, timer;
        setData(null); setError('');
        async function poll() {
          if (closed) return;
          let wait = 5000;
          try {
            if (!document.hidden) {
              const r = await ctx.remote.lucyCodex.snapshot(sessionId, { limit });
              if (!r.ok) throw r.error;
              if (!closed) { setData(r.value); setError(''); }
              if (r.value.active) wait = 800;
            }
          } catch (e) { if (!closed) setError(e.message || String(e)); }
          if (!closed) timer = setTimeout(poll, wait);
        }
        poll(); return () => { closed = true; clearTimeout(timer); };
      }, [sessionId, limit]);
      React.useEffect(() => { setQuotas(null); refreshQuota(); }, [refreshQuota]);
      React.useEffect(() => { if (stick.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [data?.messages?.length, data?.active?.text]);
      const stop = async () => {
        try { const r = await ctx.remote.lucyCodex.stop(sessionId, {}); if (!r.ok) throw r.error; }
        catch (e) { setError(e.message || String(e)); }
      };
      const active = data?.active, last = data?.lastRun;
      const status = active ? phases[active.phase] || active.phase : last?.status === 'failed' ? '上轮失败' : last?.status === 'stopped' ? '已停止' : '等待下一次讨论';
      return h('section', { className: 'lc-panel', 'aria-label': 'DeepSeek 与 Codex 协作面板' },
        h('header', { className: 'lc-top' }, h('div', { className: 'lc-heading' }, h('div', null, h('h2', null, '协作'), h('div', { className: 'lc-sub' }, 'DeepSeek × Codex · 当前会话')), h('button', { className: 'lc-btn', onClick: refreshQuota, disabled: quotaBusy }, quotaBusy ? '读取中' : '刷新额度')),
          h('div', { className: 'lc-accounts' }, h('div', { className: 'lc-account' }, h('div', { className: 'lc-name' }, h('i', { className: 'lc-dot' }), 'DeepSeek'), h(Balance, { value: quotas?.dsh })), h('div', { className: 'lc-account' }, h('div', { className: 'lc-name' }, h('i', { className: 'lc-dot codex' }), 'Codex'), h(Quota, { value: data?.quota?.checkedAt > (quotas?.codex?.checkedAt || 0) ? data.quota : quotas?.codex }))),
          h('div', { className: 'lc-sub', style: { marginTop: 6 } }, '账户额度由全部会话共享 · 鼠标悬停看重置时间')),
        h('main', { className: 'lc-scroll', ref: scroll, onScroll: () => { const e = scroll.current; stick.current = e.scrollHeight - e.scrollTop - e.clientHeight < 60; } },
          error && h('div', { className: 'lc-warn', role: 'alert' }, error),
          data && data.totalMessages > data.messages.length && h('button', { className: 'lc-btn lc-load', disabled: limit >= 2000, onClick: () => setLimit(n => n + 100) }, limit >= 2000 ? '面板最多显示最近 2000 条，完整记录在原会话' : '加载更早消息'),
          !data?.messages?.length && !active && h('div', { className: 'lc-empty' }, h(Icon), h('strong', null, '让两个视角一起讨论'), h('p', null, '在主聊天里对 DeepSeek 说：', h('br'), '“问 Codex：……然后说说你的看法。”'), h('p', { className: 'lc-sub' }, '这里显示双方公开对话，不显示思考过程。')),
          ...(data?.messages || []).map(m => h('article', { key: m.id, className: 'lc-msg ' + (m.kind === 'error' ? 'error' : m.speaker === 'Codex' ? 'codex' : m.speaker === 'DeepSeek' ? 'lucy' : 'user') }, h('div', { className: 'lc-msghead' }, h('span', null, m.speaker + (m.kind === 'question' ? ' → Codex' : '')), h('time', null, time(m.time))), h('div', { className: 'lc-bubble' }, m.text))),
          active?.text && h('article', { className: 'lc-msg codex' }, h('div', { className: 'lc-msghead' }, 'Codex · 回复中'), h('div', { className: 'lc-bubble' }, active.text))),
        h('footer', { className: 'lc-foot' }, h('div', { className: 'lc-status' }, h('span', { className: active ? 'lc-live' : '' }, (active ? '● ' : '○ ') + status), h('div', { className: 'lc-controls' }, h('span', { className: 'lc-sub' }, seconds(active?.elapsedMs ?? last?.durationMs)), active && h('button', { className: 'lc-btn stop', onClick: stop, disabled: active.phase === 'stopping' }, '停止'))),
          last?.error && !active && h('div', { className: 'lc-warn' }, last.error),
          h('div', { className: 'lc-stats' }, h(Usage, { title: 'DeepSeek · 最近协作轮 token', value: data?.deepseek?.round }), h(Usage, { title: 'Codex · 最近请求 token', value: data?.usage?.last })),
          h('details', null, h('summary', null, '会话累计与连接详情'), h('div', { className: 'lc-stats' }, h(Usage, { title: 'DeepSeek 原会话累计', value: data?.deepseek?.total }), h(Usage, { title: 'Codex 绑定会话累计', value: data?.usage?.total })),
            h('div', { className: 'lc-detail' }, '输入包含缓存，推理包含在输出内，不再相加。未收到的数据显示 —。'),
            h('div', { className: 'lc-detail' }, '模型：' + (data?.deepseek?.model || '—') + ' / ' + (data?.model || '—')),
            h('div', { className: 'lc-detail' }, '准备 ' + seconds(last?.readyMs) + ' · 首字 ' + seconds(last?.firstTokenMs)),
            h('div', { className: 'lc-detail' }, 'turn/start 确认 ' + seconds(last?.startAckMs) + ' · 确认后首个 delta ' + seconds(last?.firstDeltaAfterAckMs)),
            h('div', { className: 'lc-detail' }, '首条通知 ' + seconds(last?.firstNoticeMs) + ' · 确认前通知数 ' + number(last?.noticeCount)),
            h('div', { className: 'lc-detail', style: { overflowWrap: 'anywhere' } }, 'Codex 会话：' + (data?.threadId || '尚未创建')))));
    }
    async function apply(ctx) {
      await ctx.remote.$mount({ package: 'dsh-lucy-codex-bridge-panel', descriptors });
      ctx.effect(() => { const style = document.createElement('style'); style.dataset.plugin = ID; style.textContent = CSS; document.head.appendChild(style); return () => style.remove(); });
      ctx.effect(() => ctx.sidebarRightTabs.register({ id: ID, kind: ID, title: () => '协作', guide: [{ id: 'cooperation', order: 30, title: () => 'DeepSeek × Codex', description: () => '查看双方对话、token 与账户额度', icon: Icon }] }));
      ctx.inject(['remote.lucyCodex'], scoped => {
        scoped.effect(() => scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({ name: 'sidebar.right.pane.tab', key: ID, inject: sessionId => ({ sessionId }) }, props => h(Panel, { ...props, key: props.sessionId, __ctx: scoped }))));
        scoped.effect(() => scoped.slots.inject('sidebar.right.pane.tab.title', () => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: ID }, () => h('span', null, '⇄ 协作'))));
      });
      ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({ name: 'conversation.session.header.utilities', id: ID, order: 30 }, () => h('button', { className: 'lc-open', title: '打开协作面板', onClick: () => ctx.sidebarRight.openTab(ID) }, '⇄ 协作'))));
    }
    return { name: 'lucy-codex-bridge-client', apply: async ctx => {
      try { await apply(ctx); }
      catch (error) { console.error('[lucy-codex-bridge] Client activation failed: ' + (error?.message || String(error))); throw error; }
    }, inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'remote'] };
  },
});

