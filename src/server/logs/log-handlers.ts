import { appendLogFileLine } from "./log-file-append";
import { createLogger, type LogMessage } from "./log-handlers-base";

export type { LogMessage };

export const logger = createLogger((line) => {
    console.log(line);
    void appendLogFileLine(line).catch((err: unknown) => {
        console.error("[logger] write file failed:", err);
    });
});
