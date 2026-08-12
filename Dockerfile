# 图书馆研发工作台 - 后端容器镜像（适配 Koyeb / Render / Fly.io / 任意容器平台）
# 零依赖纯 Node.js，使用官方 LTS 精简镜像
FROM node:18-alpine

# 工作目录
WORKDIR /app

# 先拷贝依赖清单（利用层缓存；本项目零依赖，npm install 近乎空跑）
COPY package.json ./
RUN npm install --omit=dev || true

# 拷贝全部源码（前端 public/ + server.js + 配置）
COPY . .

# Koyeb / 容器平台会把监听端口通过环境变量 $PORT 注入；
# server.js 已支持：有 /data 卷则数据存 /data，否则存当前目录
EXPOSE 3000
ENV PORT=3000

# 启动命令（与 package.json 的 start 一致）
CMD ["node", "server.js"]
