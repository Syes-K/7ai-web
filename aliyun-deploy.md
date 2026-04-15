# 阿里云 ECS 部署与启动（Next.js）

本文档整理在本仓库（Next.js 16 + App Router）在 **阿里云 ECS** 上从压缩包到长期运行的常见步骤与踩坑说明。路径以 **`/home/admin/app`** 为例，可按实际目录替换。

---

## 1. 服务器环境

- **Node.js**：建议 **20.x LTS**（与本地开发一致即可），需同时有 **`node` / `npm`**。
- **系统**：常见为 Alibaba Cloud Linux / CentOS / Ubuntu。

若执行 `which node`、`which npm` 无结果，先安装 Node，再部署应用。示例（任选其一，以官方文档为准）：

- **Debian / Ubuntu**：使用 [NodeSource](https://github.com/nodesource/distributions) 等提供的 `setup_20.x` 脚本后 `apt-get install nodejs`。
- **Alibaba Cloud Linux / CentOS（yum/dnf）**：同样可用 NodeSource 的 RPM 安装脚本，或 **nvm**（用户级多版本）。

安装完成后确认：

```bash
node -v
npm -v
```

---

## 2. 部署包与目录约定

若流水线将产物打成 **`package.tgz`** 并放到 **`/home/admin/app/`**：

```bash
cd /home/admin/app
tar -xzf package.tgz
```

解压后请 **`cd` 到包含 `package.json` 的项目根目录**（若多一层子目录，以实际为准）。

**不要**把 `package.tgz` 本身当成可执行文件；必须先解压再安装依赖、构建。

---

## 3. 安装依赖

本仓库 **`@tailwindcss/postcss` / `tailwindcss` / `geist` 等已在 `dependencies` 中**，生产环境可使用仅安装生产依赖：

```bash
rm -rf node_modules .next
npm ci --omit=dev
```

若无 `package-lock.json` 或需兼容旧流程：

```bash
npm install --omit=dev
```

**说明**：

- **`better-sqlite3`** 为原生模块，**必须在目标 ECS 上执行安装**（与本地同架构、同 glibc），勿把本机 `node_modules` 整包拷到异构系统。
- 若构建阶段报缺 **`typescript`**，可改为先全量安装再构建：`npm ci`，或把 `typescript` 挪入 `dependencies`（按需）。

---

## 4. 环境变量

应用所需密钥与配置请通过 **环境变量** 或 **`.env.production`** 提供（勿将含真实密钥的 `.env.local` 提交仓库）。

可参考仓库根目录 **`.env.example`**，在服务器上创建 **`.env.production`** 或导出变量，例如：

```bash
export NODE_ENV=production
export PORT=8080
# 按 .env.example 与实际业务补充 ZHIPU_API_KEY、DEEPSEEK_API_KEY 等
```

具体变量名以项目代码与 `src/lib/config` 为准。

---

## 5. 构建

```bash
npm run build
```

本仓库 **`package.json` 已为 `build` / `lint` 设置 `NODE_OPTIONS=--max-old-space-size=4096`**，根目录 **`.npmrc`** 也配置了 `node-options`，用于缓解 **Node 堆内存不足（OOM）**。若 CI/构建机仍 OOM，可：

- 提高流水线/ECS **可用内存**；
- 在运行 `npm run build` 前 **`export NODE_OPTIONS=--max-old-space-size=8192`**（需小于机器物理内存）。

字体已使用 **`geist` 包（本地 woff2）**，构建 **无需访问 Google Fonts**，适合内网或受限网络。

---

## 6. 启动

```bash
export NODE_ENV=production
export PORT=8080   # 或与 Nginx/SLB 约定端口
npm start
```

默认 **`next start`** 监听 `PORT`（未设置时多为 `3000`）。

### 使用 PM2 常驻（推荐）

```bash
npm install -g pm2
cd /path/to/project   # 含 package.json 的目录
PORT=8080 pm2 start npm --name "home" -- start
pm2 save
pm2 startup          # 按提示配置开机自启（可选）
```

### 仓库内 `deploy.sh`（部署组仅启停）

若 **依赖安装与 `npm run build` 已在阿里云「构建阶段」完成**，部署组只需解压制品并用 PM2 拉起或重载进程。

**`deploy.sh` 只做**：`start` / `restart`（默认）→ PM2 启动或 `reload`；`stop`；`status`。**不在此脚本中执行 `npm install` / `npm run build`。**

**前提**：制品包解压后目录内已包含 **`node_modules`** 与 **`.next`**（或与你们流水线约定一致的构建产物），且服务器已 **`npm install -g pm2`**。

阿里云「部署脚本」示例：

```bash
tar zxvf /home/admin/app/package.tgz -C /home/admin/app/7ai-web
sh /home/admin/app/7ai-web/deploy.sh restart
```

常用环境变量：

| 变量 | 说明 |
|------|------|
| `PORT` | 监听端口，默认 `8080` |
| `PM2_NAME` | PM2 进程名，默认 `home-next` |

子命令：`start`、`restart`（与 `start` 相同语义）、`stop`、`status`。详见 **`deploy.sh` 文件头注释**。

---

## 8. 反向代理（可选）

生产环境通常在前面挂 **Nginx**，将 `proxy_pass` 指到 `127.0.0.1:8080`（或你设置的 `PORT`），并配置 HTTPS、超时与 `Host` 头。具体以运维规范为准。

---

## 9. 常见问题简表

| 现象 | 处理方向 |
|------|----------|
| `npm: command not found` | 未安装 Node/npm，见第 1 节。 |
| `JavaScript heap out of memory` | 加大 `NODE_OPTIONS` 与/或机器内存；确认使用本仓库自带的 `build` 脚本或 `.npmrc`。 |
| `Cannot find module '@tailwindcss/postcss'` | 使用 **`npm ci` 且带上与本仓库一致的 `package-lock.json`**；勿省略 lock；清理后重装 `rm -rf node_modules .next && npm ci --omit=dev`。 |
| 构建时访问 **fonts.gstatic.com** 失败 | 本仓库已改用 **`geist` 本地字体**，请拉取最新代码并重新安装依赖、构建。 |
| `better-sqlite3` 安装/运行异常 | 在 ECS 本机 **`npm ci`/`npm rebuild better-sqlite3`**，保证与系统架构一致。 |
| Git `push` 超时或 HTTPS 问题 | 可改用 **`git@github.com:...` SSH**，并配置本机 SSH 公钥到 GitHub；勿在全局 `gitconfig` 用 `insteadOf` 把 SSH 强行改回 HTTPS。 |

---

## 10. 最小命令清单（示例）

```bash
cd /home/admin/app
tar -xzf package.tgz && cd <含 package.json 的目录>
rm -rf node_modules .next
npm ci --omit=dev
export NODE_ENV=production
export PORT=8080
npm run build
npm start
```

使用 PM2 时，将最后一步替换为 `pm2 start npm --name "home" -- start` 并设置相同环境变量即可。

---

文档与仓库行为不一致时，以 **`package.json` 脚本与代码** 为准；修订部署流程后建议同步更新本文档。
