# Resume Generator

一个基于 JSON 数据源和 Vite 的通用简历生成器。它可以本地编辑、预览和导出简历，也可以构建为可直接部署到 Vercel 等静态托管平台的单文件 Demo。

## Quick start

```bash
npm install
npm run init
npm run dev
```

开发服务器默认使用 `http://localhost:60090`。真实简历保存在被忽略的 `data/` 目录中；可提交的脱敏模板位于 `data-example/`。

## Build and deploy

```bash
npm run build
```

构建结果为 `dist/index.html`，CSS、JavaScript 和 `data-example/` 模板数据都会内联到单个 HTML 文件中。Vercel 项目请将 Root Directory 设置为本目录，Build Command 设置为 `npm run build`，Output Directory 设置为 `dist`。

静态页面首次访问时加载 `data-example/`；访客后续的编辑、版本和排版设置只保存在自己的浏览器 IndexedDB/localStorage 中，不会上传到服务器。

## Features

- JSON 编辑器：实时预览、格式化、导入、导出和恢复模板
- 无限层级简历版本树：新建、复制、重命名、拖拽排序和叶子删除
- A4 分页预览、主题和排版调整
- 浏览器内导出 A4 PDF 或连续长图
- Vite 单文件构建，适合静态部署

## Privacy boundary

公开仓库只包含 `data-example/` 脱敏模板。真实 `data/`、构建产物、历史材料、个人附件和本地工具文件不应提交。

## License

代码以 MIT License 发布。模板中的个人信息、简历文字和第三方素材仅用于演示，发布前请替换并确认授权。
