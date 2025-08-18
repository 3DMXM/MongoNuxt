# MongoDB 管理器

一个基于 Nuxt 3 和 Nuxt UI 构建的现代化 MongoDB 数据库管理工具。

## 功能特性

- 通过连接字符串连接到 MongoDB 数据库
- 数据库、集合、索引 的 新增、删除、编辑、重命名 操作
- 查看和预览文档内容
- 支持浅色/深色主题切换
- 适配桌面和移动设备
- 基于 Nuxt UI 的美观界面
- 一键复制文档到剪贴板
- 实时刷新数据库内容
- 完善的错误提示和加载状态

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

### 使用 Docker（基于 pm2-runtime）

本项目自带 `Dockerfile`，镜像使用多阶段构建：在构建阶段安装依赖并执行 `npm run build`，在生产阶段仅复制构建产物（`./.output`）和生产依赖，并通过 `pm2-runtime pm2ecosystem.config.cjs` 启动服务（`pm2ecosystem.config.cjs` 指向 `./.output/server/index.mjs`）。

建议的构建与运行命令（PowerShell）：

```powershell
# 在项目根目录构建镜像
docker build -t mongo-nuxt:latest .

# 运行容器（将容器内 4659 端口映射到宿主机 4659）
docker run -d --name mongo-nuxt -p 4659:4659 mongo-nuxt:latest

# 查看日志
docker logs -f mongo-nuxt
```

如果想把容器端口映射到宿主机的 80 端口：

```powershell
docker run -d --name mongo-nuxt -p 80:4659 mongo-nuxt:latest
```

简短说明与注意事项：
- `pm2ecosystem.config.cjs` 中配置的 `script` 默认为 `./.output/server/index.mjs`，且已在仓库中设置端口 `4659`；如需改端口，请编辑 `pm2ecosystem.config.cjs` 或在容器运行时使用环境变量覆盖（如果你实现了读取环境变量）。
- 当前 `Dockerfile` 会在生产阶段以非 root 用户运行进程，且只安装 production 依赖以减小镜像体积。
- 若要保证可重复构建，建议在源码仓库提交 `package-lock.json` 并在 Dockerfile 中使用 `npm ci`。

可选的 `docker-compose.yml` 示例：

```yaml
version: '3.8'
services:
   app:
      image: mongo-nuxt:latest
      build: .
      ports:
         - "4659:4659"
      environment:
         - NODE_ENV=production
         # - MONGO_URI=mongodb://mongo:27017
      restart: unless-stopped

   # 可选：本地 MongoDB 服务示例
   # mongo:
   #   image: mongo:6
   #   volumes:
   #     - mongo-data:/data/db

#volumes:
#  mongo-data:
```

故障排查：
- 构建失败时请检查构建日志，确认项目依赖是否完整；若仓库没有 `package-lock.json`，镜像构建会使用 `npm install`。提交 lockfile 后可改回使用 `npm ci` 来加快并稳定构建。
- 若容器启动但无法访问页面，检查容器日志与 pm2 日志，确认 `.output` 构建成功且监听端口为 4659。

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

