export type LogMessage = {
    event: string;
    type: "info" | "error" | "warn" | "debug";
    datetime: number;
} & Record<string, unknown>;

export const logger = {
    info: (event: string, message: Record<string, unknown>) => {
        const logMessage: LogMessage = {
            event,
            type: "info",
            datetime: Date.now(),
            ...message,
        };
        loggerMessage(logMessage);
    },
    error: (event: string, message: Record<string, unknown>) => {
        const logMessage: LogMessage = {
            event,
            type: "error",
            datetime: Date.now(),
            ...message,
        };
        loggerMessage(logMessage);
    },
    warn: (event: string, message: Record<string, unknown>) => {
        const logMessage: LogMessage = {
            event,
            type: "warn",
            datetime: Date.now(),
            ...message,
        };
        loggerMessage(logMessage);
    },
    debug: (event: string, message: Record<string, unknown>) => {
        const logMessage: LogMessage = {
            event,
            type: "debug",
            datetime: Date.now(),
            ...message,
        };
        loggerMessage(logMessage);
    },
}

function loggerMessage(message: LogMessage) {
    console.log(`[${message.event}] =>${JSON.stringify(message)}`);
}