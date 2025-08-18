# MongoDB 管理器

一个基于 Nuxt 3 和 Nuxt UI 构建的现代化 MongoDB 数据库管理工具。

## 功能特性

- 🔗 **数据库连接** - 通过连接字符串连接到 MongoDB 数据库
- 📊 **数据库浏览** - 浏览数据库和集合列表
- 📄 **文档查看** - 查看和预览文档内容
- 🌙 **深色模式** - 支持浅色/深色主题切换
- 📱 **响应式设计** - 适配桌面和移动设备
- 🎨 **现代化 UI** - 基于 Nuxt UI 的美观界面
- 📋 **文档复制** - 一键复制文档到剪贴板
- 🔄 **实时刷新** - 实时刷新数据库内容
- 🚨 **错误处理** - 完善的错误提示和加载状态

## 技术栈

- **前端框架**: Nuxt 3
- **UI 组件库**: Nuxt UI (基于 Tailwind CSS) + Element Plus
- **状态管理**: Pinia
- **数据库**: MongoDB (使用官方 mongodb 驱动)
- **开发语言**: TypeScript

## 快速开始

### 安装依赖

```powershell
yarn install
```

### 启动开发服务器

```powershell
yarn dev
```

应用将在 `http://localhost:3000` (或其他可用端口) 启动。

### 构建生产版本

```powershell
yarn build
```

## 使用方法

1. **连接数据库**
   - 在连接面板中输入 MongoDB 连接字符串
   - 支持快速连接本地数据库选项
   - 点击"连接数据库"按钮

2. **浏览数据库**
   - 连接成功后，左侧面板将显示数据库列表
   - 点击数据库名称查看其集合

3. **查看文档**
   - 选择集合后，右侧面板将显示文档列表
   - 支持 JSON 格式化显示
   - 可以复制文档内容到剪贴板

## 项目结构

```
├── app/
│   ├── components/          # Vue 组件
│   │   ├── ConnectionForm.vue
│   │   ├── DatabaseList.vue
│   │   ├── CollectionList.vue
│   │   └── DocumentPreview.vue
│   ├── pages/               # 页面路由
│   │   └── index.vue
│   └── app.vue              # 根组件
├── server/
│   ├── api/mongo/           # MongoDB API 路由
│   └── utils/               # 服务器工具函数
├── stores/                  # Pinia 状态管理
├── assets/                  # 静态资源
└── nuxt.config.ts           # Nuxt 配置文件
```

## API 接口

### POST `/api/mongo/connect`
连接到 MongoDB 数据库

### GET `/api/mongo/list`
获取数据库列表

### GET `/api/mongo/collections`
获取指定数据库的集合列表

### POST `/api/mongo/find`
查询集合中的文档

## 开发说明

- 使用 TypeScript 进行类型检查
- 组件采用 Composition API 语法
- 遵循 Vue 3 和 Nuxt 3 最佳实践
- 使用 Tailwind CSS 进行样式管理
- 支持深色模式切换
- 响应式设计，适配各种屏幕尺寸

## 许可证

MIT License

## 构建与部署

生产构建：

```powershell
npm run build
npm run preview # 本地预览构建后的应用
```

常见部署目标：Vercel、Cloudflare Pages（或 Workers）、Netlify、以及自托管（使用 node 或 docker 运行 Nitro）。

Docker 简单示例（可选）：

```dockerfile
# Dockerfile (示例)
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

注意：不同部署平台对 Nitro 的适配方式不同，参见 Nuxt 官方部署文档以获得平台最佳实践。

## 测试与质量保证

- 建议添加简单的端到端或集成测试来覆盖关键 API（例如使用 Playwright / Vitest / Supertest）。

## 可选扩展（建议）

- 集成 mongoose 或 TypeScript 类型化的 ODM
- RBAC 权限系统
- 作业任务/定时同步（如定期备份 Mongo 数据）
- 仪表盘与统计页面

## 贡献

欢迎贡献：提交 issue、提 PR 或提出功能建议。请在贡献前先描述你的方案与预期行为。

## 许可

本项目使用 MIT 许可证（如需其他许可，请在仓库中添加 LICENSE 文件）。

