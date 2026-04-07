import pino from "pino";

const isDev = Bun.env.NODE_ENV !== "production";

export const logger = pino(
	isDev
		? {
				level: "debug",
				transport: { target: "pino-pretty", options: { colorize: true } },
			}
		: { level: "info" },
	isDev ? undefined : pino.destination(1)
);
