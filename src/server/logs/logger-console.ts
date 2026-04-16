/**
 * 仅控制台；供 Edge Middleware 使用（不可 fs 落盘）。
 */
import { createLogger } from "./log-handlers-base";

export type { LogMessage } from "./log-handlers-base";

export const logger = createLogger((line) => {
    console.log(line);
});
