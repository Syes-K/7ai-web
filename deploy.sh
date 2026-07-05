#!/usr/bin/env bash
# 阿里云部署组：制品已在「构建阶段」完成 npm install / npm run build，
# 本脚本仅在目标机上解压后执行 PM2 启动或重载。
#
# 示例：
#   tar zxvf /home/admin/app/package.tgz -C /home/admin/app/
#   sh /home/admin/app/deploy.sh restart
#
# 可选环境变量：
#   PORT       监听端口，默认 8080
#   NODE_ENV   默认 production
#   PM2_NAME   PM2 应用名，默认 7ai-web

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-8080}"
PM2_NAME="${PM2_NAME:-7ai-web}"

require_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "错误: 未找到 node 或 npm，请先安装 Node.js（建议 20 LTS）。" >&2
    exit 1
  fi
}

start_pm2() {
  require_node
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "错误: 未找到 pm2。请先: npm install -g pm2" >&2
    exit 1
  fi
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 reload "$PM2_NAME" --update-env
  else
    pm2 start npm --name "$PM2_NAME" -- start
  fi
  pm2 save
}

stop_pm2() {
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 stop "$PM2_NAME"
  else
    echo "提示: PM2 中无进程 $PM2_NAME，跳过 stop"
  fi
}

case "${1:-restart}" in
  start | restart)
    start_pm2
    ;;
  stop)
    stop_pm2
    ;;
  status)
    if command -v pm2 >/dev/null 2>&1; then
      pm2 status "$PM2_NAME" || true
    else
      echo "未安装 pm2，无法查看状态"
    fi
    ;;
  *)
    echo "用法: $0 {start|restart|stop|status}" >&2
    echo "  start|restart  启动或重载 PM2（默认 restart）" >&2
    echo "  stop            停止 PM2 进程" >&2
    echo "  status          PM2 状态" >&2
    echo "说明: 依赖安装与 next build 请在阿里云构建阶段完成；制品需含 node_modules 与 .next。" >&2
    exit 1
    ;;
esac
