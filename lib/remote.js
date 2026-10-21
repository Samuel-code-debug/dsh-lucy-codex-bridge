import { promises as fs } from 'node:fs';
import path from 'node:path';
// Native Typert descriptors use the host's authenticated Session lookup and resource checks.
const json = { mode: 'src-json' };
export function descriptors() {
  return ['snapshot', 'stop', 'quota'].map(method => ({
    id: `dsh-lucy-codex-bridge#lucyCodex/${method}`,
    service: 'lucyCodexController', namespace: 'lucyCodex', method,
    invocation: { kind: 'direct' },
    parameters: [
      { name: 'session', wire: 'sessionId', source: 'lookup', lookup: 'session', codec: json },
      { name: 'options', wire: 'options', source: 'json', codec: json, acceptsUndefined: true },
    ],
    result: json,
  }));
}
export function registerPanel(ctx, bridge, telemetry) {
  let balanceCache = null, balanceFlight = null;
  async function balance(options) {
    if (balanceCache && Date.now() - balanceCache.checkedAt < 60000) return balanceCache;
    if (balanceFlight) return balanceFlight;
    balanceFlight = (async () => {
      try {
        let version = process.env.DSH_CLIENT_VERSION;
        if (!version && process.resourcesPath) {
          const pkg = JSON.parse(await fs.readFile(path.join(process.resourcesPath, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-web-app', 'package.json'), 'utf8'));
          version = pkg.version;
        }
        const account = ctx.get('deepseekAccount');
        if (!account || !version) throw new Error('此宿主暂未提供账户余额接口。');
        const value = await account.getBalance({ version, locale: typeof options?.locale === 'string' ? options.locale.slice(0,32) : 'zh-CN', timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60 });
        balanceCache = { checkedAt: Date.now(), status: value?.status === 'ready' ? 'ready' : 'unavailable', value: value?.status === 'ready' ? value.value : [], bonusWallets: value?.status === 'ready' ? value.bonusWallets : [] };
      } catch (error) { balanceCache = { checkedAt: Date.now(), status: 'unavailable', error: error.message }; }
      return balanceCache;
    })().finally(() => { balanceFlight = null; });
    return balanceFlight;
  }
  const controller = {
    ctx,
    async snapshot(session, options = {}) {
      const limit = Math.max(100, Math.min(2000, Number(options?.limit) || 100));
      return { ...(await bridge.snapshot(session.id)), ...telemetry.read(session, limit) };
    },
    async stop(session) { return bridge.stop(session.id); },
    async quota(_session, options) { const [codex, dsh] = await Promise.all([bridge.quota(), balance(options)]); return { codex, dsh }; },
  };
  controller.typertRemote = Object.freeze({ service: controller, serviceKey: 'lucyCodexController', namespace: 'lucyCodex' });
  ctx.effect(() => ctx.reflect.provide('lucyCodexController', controller));
  ctx.typert.register({ package: 'dsh-lucy-codex-bridge-panel', face: 'host', schemas: [], invocations: descriptors(), model: { services: [], events: [], objects: [] } });
}
