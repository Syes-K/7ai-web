export type LogMessage = {
    event: string;
    type: "info" | "error" | "warn" | "debug";
    datetime: number;
} & Record<string, unknown>;

export function createLogger(emitLine: (line: string) => void) {
    function loggerMessage(message: LogMessage) {
        const line = `[${message.event}] =>${JSON.stringify(message)}`;
        emitLine(line);
    }

    return {
        info: (event: string, msg: Record<string, unknown>) => {
            loggerMessage({
                event,
                type: "info",
                datetime: Date.now(),
                ...msg,
            });
        },
        error: (event: string, msg: Record<string, unknown>) => {
            loggerMessage({
                event,
                type: "error",
                datetime: Date.now(),
                ...msg,
            });
        },
        warn: (event: string, msg: Record<string, unknown>) => {
            loggerMessage({
                event,
                type: "warn",
                datetime: Date.now(),
                ...msg,
            });
        },
        debug: (event: string, msg: Record<string, unknown>) => {
            loggerMessage({
                event,
                type: "debug",
                datetime: Date.now(),
                ...msg,
            });
        },
    };
}

export type AppLogger = ReturnType<typeof createLogger>;
