# 使用官方 Node.js LTS 镜像作为基础
FROM docker.aoe.top/library/node:lts-alpine AS builder

# 安装 PM2 并创建工作目录
RUN npm install -g pm2

# 创建工作目录
WORKDIR /app

# 复制 所有文件
COPY . ./

# 设置 Yarn 包管理器版本，安装依赖，构建应用，清理开发依赖
RUN corepack enable && \
    corepack prepare yarn@1.22.22 --activate && \
    yarn install --frozen-lockfile --production=false && \
    yarn run build && \
    yarn install --frozen-lockfile --production=true && \
    yarn cache clean



# 暴露端口
EXPOSE 4659

# 设置环境变量
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=4659

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4659/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["pm2-runtime", "start", "pm2ecosystem.config.cjs"]