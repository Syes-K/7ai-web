# Nginx 与 Next.js（阿里云 ECS）

本文档整理在本项目中使用 **Nginx 作为反向代理**、把公网 **80/443** 转到本机 **Next.js（如 PM2 + `next start`）** 时的常见配置与排错要点。应用监听端口以 `**PORT=8080`** 为例，可按 `deploy.sh` / 环境变量实际值修改。

---

## 1. 角色分工


| 组件                             | 作用                                                 |
| ------------------------------ | -------------------------------------------------- |
| **Nginx**                      | 监听 **80**（及可选 **443**），对外提供 HTTP/HTTPS，反向代理到本机应用端口 |
| **Next.js**（`npm start` / PM2） | 监听 `**PORT`**（如 **8080**），不直接对公网暴露也可               |


浏览器访问 `http://域名` → 默认连 **TCP 80** → **Nginx** → `proxy_pass` 到 `http://127.0.0.1:8080`。

---

## 2. 安装与启停（Alibaba Cloud Linux / CentOS 系示例）

```bash
# 安装（包名因发行版可能为 nginx 或需启用 epel）
yum install -y nginx
# 或：dnf install -y nginx

# 开机自启并启动
systemctl enable nginx
systemctl start nginx

# 状态
systemctl status nginx
```

**说明**：若执行 `nginx -s reload` 或 `systemctl reload nginx` 时提示 **PID 无效** 或 **unit is not active**，说明 **Nginx 进程未在运行**，应先 `**systemctl start nginx`**，再改配置后 `**systemctl reload nginx**`。

校验配置语法：

```bash
nginx -t
```

---

## 3. 配置文件位置（常见）

- 主配置：`/etc/nginx/nginx.conf`
- 站点片段：`/etc/nginx/conf.d/*.conf`（`include` 由主配置引入）

修改后执行：

```bash
nginx -t && systemctl reload nginx
```

---

## 4. 反向代理示例（HTTP / HTTPS → Next.js :8080）

在 `**/etc/nginx/conf.d/**` 下新建例如 `**next.conf**`（`server_name`、证书路径请替换为你的域名与实际文件位置）。

### 4.1 共用片段（`location`）

后端为 **HTTP**（`next start`），`X-Forwarded-Proto` 在 HTTPS 的 server 里设为 `**https`**，便于 Next.js 识别原始协议。

### 4.2 仅 HTTP（80）— 内网或临时调试

```nginx
server {
    listen 80;
    server_name 7ai.club www.7ai.culb;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 4.3 HTTP 跳转 HTTPS + HTTPS 反代（推荐生产）

证书可使用 **Let’s Encrypt**（如 certbot）、**阿里云 SSL 证书** 等；下面路径为常见 PEM 放置方式，**以你服务器上真实路径为准**。

```nginx
# HTTP：统一跳转到 HTTPS（若仍需 80 直接反代，可删掉本 server，改用 4.2）
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 7ai.club www.7ai.culb;

    ssl_certificate     /etc/pki/nginx/fullchain.pem;
    ssl_certificate_key /etc/pki/nginx/privkey.pem;
    # 可选：ssl_session_cache shared:SSL:10m;
    # 可选：ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- `**proxy_pass**` 端口必须与 **Next.js** 的 `**PORT`**（如 8080）、PM2 环境一致。
- **HTTPS** 需在安全组放行 **TCP 443**。
- `**X-Forwarded-Proto https`**：告诉应用当前用户经 TLS 访问（与仅 HTTP 反代时用 `$scheme` 不同）。

Let’s Encrypt 常见路径示例（**勿照抄，以 `certbot` 实际输出为准**）：

- `ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;`

检查本机应用是否已监听：

```bash
ss -tlnp | grep 8080
curl -I http://127.0.0.1:8080
```

检查经 Nginx（HTTP / HTTPS）：

```bash
curl -I http://127.0.0.1
curl -Ik https://127.0.0.1
```

若期望看到 **Next.js** 响应头（如 `X-Powered-By: Next.js`），说明反代正常。

---

## 5. 阿里云安全组

- 入方向放行 **TCP 80**（HTTP），HTTPS 需 **TCP 443**。
- **仅放行 ICMP** 只能 ping，**不能**访问网页；需单独 **TCP** 规则。

详见仓库内 `**aliyun-deploy.md`** 中安全组说明。

---

## 6. 常见问题


| 现象                                                                                      | 可能原因                                                                                           | 处理                                            |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `curl 127.0.0.1:80` → **Connection refused**                                            | Nginx 未启动或未监听 80                                                                               | `systemctl start nginx`；`ss -tlnp | grep :80` |
| `nginx -s reload` → **invalid PID**                                                     | 无正在运行的 master 进程                                                                               | 先 `systemctl start nginx`                     |
| `systemctl reload nginx` → **not active**                                               | 服务未运行                                                                                          | `systemctl start nginx`                       |
| 外网域名打不开，本机 `curl 127.0.0.1` 正常                                                          | 安全组未放行 80/443，或 DNS 未指到本机公网 IP                                                                 | 查安全组与解析                                       |
| 502 Bad Gateway                                                                         | 后端 Next 未启动或端口与 `proxy_pass` 不一致                                                               | 检查 PM2、`PORT`、`proxy_pass`                    |
| `.logs/common-error.*.log` 出现 `**Module did not self-register`**（`better_sqlite3.node`） | **原生模块与当前系统/Node 不一致**：例如在 macOS/Windows 上装好 `node_modules` 再整包拷到 Linux，或 ECS 上 Node 版本与编译时不一致 | 见下文 **6.1**                                   |


### 6.1 `better-sqlite3`：`Module did not self-register`

本项目会话/聊天库使用 `**better-sqlite3`**（C++ 原生扩展）。`.node` 文件必须与 **运行时的操作系统、CPU 架构、Node 主版本（ABI）** 一致，否则会报上述错误，接口如 `/api/chat/sessions` 会失败。

**推荐做法（在阿里云 ECS 本机为 Linux 时）：**

1. **不要在本地 Mac/Windows 打好 `node_modules` 再上传到 Linux**；应在服务器上安装依赖，或在 CI 用 **linux + 与线上一致的 Node 版本** 构建制品。
2. 已上传错误制品时，在应用目录执行（与线上一致的 Node）：

```bash
cd /home/admin/app/7ai-web   # 按实际路径
node -v                      # 记下主版本，与构建/开发约定一致
rm -rf node_modules/better-sqlite3
npm install                  # 或 npm ci
# 若仍异常：
npm rebuild better-sqlite3
```

1. 重新执行 `**npm run build**`（若构建也在本机完成），再 `**deploy.sh restart**`。

---

## 7. 证书与续期（简要）

- **Let’s Encrypt**：可用 **certbot** 申请；续期后若证书路径不变，一般无需改 Nginx；若使用 `certbot --nginx`，会自动维护 server 块中的证书路径。
- **阿里云证书**：下载 Nginx 格式 PEM，上传到服务器后在 `**ssl_certificate` / `ssl_certificate_key`** 中指向对应文件。

详见上文 **第 4.3 节**。

---

## 8. 与本仓库脚本的关系

- `**deploy.sh`**：负责 PM2 启动/重载 **Next.js**，不修改 Nginx。
- 发布新代码后通常只需 `**deploy.sh restart`**；若仅改了 Nginx 配置，则 `**nginx -t && systemctl reload nginx**`。

---

文档随部署环境变化时请自行更新域名、端口与证书路径。