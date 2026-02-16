# g7pets Cloudflare Worker 重构需求

## 目标
- 统一实现 SSR HTML + AI 友好 Markdown 双输出。
- 浏览器用户看到完整 SEO 页面，AI/爬虫可直接获取结构化中英双语内容。
- 全站内容从 D1 读取，图片由 R2 承载。

## 功能范围
- 页面路由：`/`, `/services`, `/gallery`, `/pricing`, `/faq`, `/contact`, `/ai`
- Markdown 路由：`/index.md`, `/services.md`, `/gallery.md`, `/pricing.md`, `/faq.md`, `/contact.md`, `/ai.md`
- 协商策略：后缀、query、Accept、UA（可由 `MD_FOR_BOTS` 控制）
- SEO：`title`、`meta description`、`canonical`、OpenGraph、JSON-LD
- 基础设施：`robots.txt`、`sitemap.xml`（包含 HTML + Markdown）
- NAP 全站输出（含双语）

## 数据要求
- D1 表：`pages`, `services`, `faq`, `gallery_images`
- 支持双语字段（EN/ZH）
- 中文缺失时回退英文

## 交付要求
- Worker 源码
- Wrangler 配置样例
- D1 迁移 SQL
- README（部署、测试、验收）
