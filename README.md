# Lucy × Codex：DSH 协作桥接 0.2.1

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

在 DSH 中把 Lucy 当前会话的公开内容带入 Codex 持久线程，查看双方公开回复、token 用量和账户额度。此仓库提供源码和 Windows 本机安装脚本。

在 DSH 的原会话中调用本机 Codex App Server，并在右侧「协作」面板查看双方公开消息、token 用量和账户额度。当前实现针对 Windows 上的 DSH 0.2.1-rc.2 与桌面附带的 Codex App Server；其它版本尚未确认兼容。

## 使用

1. 安装 [Node.js 22 或更新版本](https://nodejs.org/)，克隆或下载本仓库，在项目目录运行 `node install.mjs`，再完全退出并重开 DSH（包括托盘）。
2. 在会话右上角点击 **⇄ 协作**。也可从原生右侧面板选择协作页签。
3. 在主聊天里对 Lucy 说：「问 Codex：……，然后说说你的看法。」
4. 下一条「继续讨论……」延续该 DSH 会话绑定的 Codex 上下文。面板和 DSH 原停止按钮均可停止正在进行的 Codex 调用。

面板不另开输入框，也不会自动发起讨论。每条用户消息最多调用一次 ask，180 秒超时。讨论会使用双方模型额度；查看消息、读取用量和刷新额度不发起模型生成请求。

## 面板数据

- **消息**：发起讨论的用户消息、Lucy 提问、Codex 回答和 Lucy 后续公开回复。处理中逐步显示 Codex 返回的正文。不展示思考过程。
- **Lucy 最近协作轮**：DSH 记录的整个相关 turn（可包含多次模型请求）；展开可看 Lucy 原会话累计。
- **Codex 最近请求**：App Server 返回的最近一次请求；展开可看绑定 Codex 会话累计。与 Lucy 整轮统计范围不同。
- **输入**包含缓存命中，推理 token 已包含在输出中，不能再次相加。缺失数据为 `—`，不猜成 0。DSH 输入归一化按当前 DeepSeek 适配器的定义处理。
- **账户**：Lucy 显示宿主账户充值/赠送余额；Codex 显示账户配额窗口剩余百分比。均为账户共享数据，不是当前聊天独享额度，也不根据 token 推算金额。读取失败明确显示不可获取。
- 面板本地快照在讨论中每 0.8 秒更新，空闲时每 5 秒更新；窗口不可见时暂停读取。账户信息在打开面板/手动刷新时读取，缓存 60 秒；新 Codex 配额通知也会更新显示。
- 面板默认显示最近 100 条，可加载到 2000 条；完整公开消息仍在 DSH 原会话。旧版未保存的 Codex 用量不会伪造，下一轮收到事件后才有数据。

## 上下文和连接

每个 DSH Session 独立绑定一个持久 Codex Thread，重启后继续。它不是 Codex 桌面原聊天的克隆，不会自动获得桌面聊天历史。

首轮最多附带最近 6000 字符的用户/Lucy 公开文字，后续仅同步新增文字。附件、工具输出和思考过程不自动转发；必要内容由 Lucy 放入提问。旧绑定线程已经收到的上下文不会因升级被清空。

成功调用后的连接空闲 5 分钟内复用，最多保留 4 个连接（包括额度读取连接）。中断、失败和卸载都会关闭相应进程；失败不静默换新会话。UI 展示连接、恢复上下文、等待回复、回复中等状态以及耗时。减少上下文与复用连接只减少可控开销，不保证服务端回复时间。

讨论使用只读沙箱、拒绝交互审批。仅在桥接线程中关闭 shell、网页搜索及配置中列出的 MCP/插件；不更改用户全局 Codex 配置。插件不给双方自动施工或无限互聊的授权。

## 配置和存储

使用本机 Codex 已有登录。插件不读取、复制或保存认证令牌，不要求 API Key。

可选配置 `%USERPROFILE%/.dsh/codex-bridge/settings.json`：

```json
{
  "maxContextChars": 6000
}
```

还支持 `codexCommand`（可执行文件绝对路径）、`model`、`effort`、`instructions`（讨论附加指令，最多 8000 字符）。未填时沿用 Codex 模型配置并自动发现 Windows 桌面附带的 Codex。更改配置后重启 DSH。

绑定、最近用量和运行状态位于 `%USERPROFILE%/.dsh/codex-bridge/sessions/`，真实 Codex 历史由 Codex 自己持久保存。面板从 DSH 公开事件增量整理记录，不建立第二套聊天数据库。前后端走宿主原生 Typert 通道和 Session 查找，不启动额外 HTTP 服务。

## 安装和卸载

安装脚本将运行文件复制到 `%USERPROFILE%/Documents/Codex/plugins/dsh-lucy-codex-bridge`，在 DSH desktop profile 添加 `link:` 依赖和 bundle，原 profile package.json 保存时间戳备份。遇到其它同名目录或并发配置改动会停止，避免覆盖。

卸载运行 `node install.mjs --uninstall`，然后重启 DSH。仅移除本插件的依赖和 bundle，保留文件、绑定和历史；不会用旧配置覆盖其它插件变更。

源码以 MIT 许可证发布，详见 [LICENSE](LICENSE)。当前已验证的环境是 Windows 上的 DSH 0.2.1-rc.2 与其附带的 Codex App Server；其它 DSH 版本、操作系统和 Codex 安装方式尚未确认兼容。安装脚本会备份 DSH profile 配置，并在发现意外同名目录或并发修改时停止。升级前建议先备份该 profile。

## 0.2.1 启动修复

0.2.0 错用了 `conversation.session.header.corner` 单一插槽，它已由 DSH 原生侧栏按钮占用，会使前端插件进入 failed 并阻止桌面启动。0.2.1 将按钮放进 `conversation.session.header.utilities` 列表插槽，保留原生侧栏按钮。

同时用 `remote.$mount` 挂载前端 Remote namespace，并提供前端要求的 strict 参数 codec。只向 Typert 注册描述不会生成可调用的 `remote.lucyCodex` 服务。

本机开发诊断脚本依赖特定 DSH 安装路径和构建，因此未包含在公开仓库中。

保留 Lucy 添加的后端 `module-loaded.txt` / `activate-error.txt` 诊断；前端激活异常另以 `[lucy-codex-bridge] Client activation failed` 写入浏览器控制台，方便启动报告保留具体原因。
