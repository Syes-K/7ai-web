import { ConsolePageLoader } from "./ConsolePageLoader";

/**
 * 控制台入口：由客户端 Loader 关闭 SSR，整页按 CSR 方案挂载占位。
 */
export default function ConsolePage() {
  return <ConsolePageLoader />;
}
