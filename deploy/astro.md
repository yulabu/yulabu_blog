# 前台 Astro 群岛架构部署（2026-09 重构后）

frontend/home 已从 Vue 3 SPA 迁移为 Astro 7 群岛架构（混合渲染：静态预渲染 + 文章/专栏页 SSR）。
admin 与 server 不变。本文记录 home 的构建产物形态、pm2/nginx 配置与上线/回滚步骤。

## 一、产物形态

```
frontend/home/dist/
├── client/     # 静态资源：预渲染页面 HTML、/_astro/* 带哈希资源、public/ 拷贝（cursor、og-image.jpg 等）
└── server/entry.mjs   # SSR 入口（@astrojs/node standalone 模式）
```

渲染分工：
- 构建时预渲染（纯静态）：`/`、`/archive`、`/about`、`/friends`、`/columns`、`/diary`、404 除外
- 按需 SSR（prerender = false）：`/post/[id]`、`/columns/[id]`、`/404`
  - 服务端 fetch 本机后端拼完整 HTML（per-post og:title / og:image / canonical）
  - 后端不可达或文章不存在 → Astro.rewrite('/404')

SSR 取数环境变量：`API_BASE_URL`（默认 `http://127.0.0.1:3000/api`）。
standalone 产物**不自动读 .env**，必须由 pm2 环境变量注入。

## 二、pm2 配置

新增进程 `blog-web`（与 blog-server 并存）：

```bash
cd /var/www/yulabu_blog/frontend/home
pm2 start dist/server/entry.mjs --name blog-web \
  --max-memory-restart 300M \
  --update-env
pm2 save
```

环境变量（写入 pm2 env，或用 ecosystem 文件）：

```
HOST=127.0.0.1
PORT=4321
API_BASE_URL=http://127.0.0.1:3000/api
```

注意：
- HOST 必须是 127.0.0.1（只对内，nginx 反代）；PORT 4321 与现有 3000 不冲突
- `--max-memory-restart 300M` 兜底（服务器仅 1G 内存，上线后用 `free -h` 观察）
- pm2 save 固化进程列表，重启机器后随 pm2-root.service 自动拉起

## 三、nginx 改造（yulabu 站点）

原「全静态 + try_files /index.html」改为「静态优先 → 未命中反代 SSR」：

```nginx
server {
    # ... server_name / 证书 / gzip 等保持不变 ...

    root /var/www/yulabu_blog/frontend/home/dist/client;

    # /api、/uploads 反代 127.0.0.1:3000 —— 不变

    # 带哈希的静态资源：强缓存（Astro 已加 immutable 头，这里双保险）
    location /_astro/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 先找静态文件（预渲染页面），找不到交给 SSR
    location / {
        try_files $uri $uri/ @ssr;
    }

    location @ssr {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

要点：
- 旧配置的 `try_files ... /index.html`（SPA History 路由兜底）**必须移除**，否则所有路径都会命中 index.html
- yulabu 与 blog.yulabu.cn 共用该 server 块（server_name 不变）
- admin 站点不动
- 改完：`sudo nginx -t && sudo systemctl reload nginx`

## 四、上线步骤

```bash
# 0. 本地验证通过后提交，服务器拉取
cd /var/www/yulabu_blog && git pull

# 1. 构建前台（服务器上直接 build；内存峰值与 vite build 同量级）
cd frontend/home && npm install && npm run build

# 2. 启动/重启 SSR 进程
pm2 restart blog-web || pm2 start dist/server/entry.mjs --name blog-web --max-memory-restart 300M --update-env

# 3. nginx 切流量（首次上线才需要；改前备份 /etc/nginx/sites-available/yulabu）
sudo nginx -t && sudo systemctl reload nginx

# 4. 验证
curl -s https://blog.yulabu.cn/ | grep -o '<title>[^<]*</title>'          # 首页静态
curl -s https://blog.yulabu.cn/post/<真实id> | grep -E 'og:title|og:image' # 文章 SSR + per-post OG
curl -s -o /dev/null -w '%{http_code}\n' https://blog.yulabu.cn/post/999999  # 应为 404
free -h && pm2 monit                                                        # 内存观察
pm2 logs blog-web --err
```

## 五、回滚（10 分钟内）

```bash
# 1. nginx 恢复旧静态配置（改前务必备份），reload —— 流量立即回到纯静态
sudo cp /etc/nginx/sites-available/yulabu.bak /etc/nginx/sites-available/yulabu
sudo nginx -t && sudo systemctl reload nginx

# 2. 停 SSR 进程（可选，回滚期间不耗内存）
pm2 delete blog-web

# 3. 代码回退到迁移前 tag 并重建旧 SPA
cd /var/www/yulabu_blog && git checkout <迁移前tag>
cd frontend/home && npm install && npm run build
```

上线前先打 tag：`git tag pre-astro-migration && git push origin pre-astro-migration`

## 六、日常变更

- 仅前台代码变更：git pull → `cd frontend/home && npm run build` → `pm2 restart blog-web`（SSR 包变更需重启；纯静态产物不重启也会生效，但统一重启最稳）
- 发新文章/改文章：**无需任何构建与重启**（文章页是 SSR 实时渲染）
- admin / server 变更流程不变
