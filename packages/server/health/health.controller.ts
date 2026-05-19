import { Router } from "express";

export const healthRouter = Router().get("/", (_, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
