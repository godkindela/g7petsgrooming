# 开发重点与实现原则

## 1) 输出决策稳定性
- 使用 `detectPreferMarkdown()` 集中处理输出协商，避免分散判断导致行为不一致。
- 所有 HTML/Markdown 响应统一返回 `Vary: Accept, User-Agent`，避免 CDN 缓存串内容。

## 2) 模块清晰拆分
- `detectPreferMarkdown()`：输出协商
- `renderHTML()`：浏览器 SSR 视图
- `renderMarkdown()`：单页双语 Markdown
- `renderAiAggregate()`：站点聚合 AI 视图

## 3) SEO 与 AI 同时优化
- HTML 保证语义结构和完整 SEO 头部。
- Markdown 强制结构化：Summary/Services/FAQ/NAP，便于 LLM 抽取。

## 4) 数据驱动优先
- 页面与业务内容全部来自 D1。
- 对旧字段做兼容映射与 fallback，降低迁移风险。

## 5) 运维与验收可执行
- README 内置 curl 验收命令。
- 部署流程按：登录校验 -> 资源绑定 -> 迁移 -> deploy。
