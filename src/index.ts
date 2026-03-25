import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import "dotenv/config";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => c.json({ message: "Rewind API" }));

const port = parseInt(process.env.PORT || "3000");
console.log(`Server running on port ${port}`);
serve({ fetch: app.fetch, port });

export default app;
