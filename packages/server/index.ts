import express from "express";
import { sql } from "./db/index";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";

const app = express();
const port = 8080;

app.use(express.json());
app.use(loggerMiddleware);

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/health", (req, res) => {
	console.log("API URL:", process.env.BUN_PUBLIC_API_URL);
	res.json({ status: "ok", uptime: process.uptime() });
});

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.get("/users", async (req, res) => {
	const users = await sql`SELECT id, username, email, created_at FROM users`;
	req.log.debug({ count: users.length }, "fetched users");
	res.json(users);
});

app.listen(port, () => {
	logger.info({ port }, "Server started");
});

export type Test = { a: "b" };
