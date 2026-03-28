import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import "dotenv/config";
import { healthRoute } from "./routes/health";
import { captureRoute } from "./routes/capture";
import { itemsRoute } from "./routes/items";
import { libraryRoute } from "./routes/library";
import { startEnrichmentQueue } from "./lib/enrichment-queue";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/", healthRoute);
app.route("/", captureRoute);
app.route("/", itemsRoute);
app.route("/", libraryRoute);

const port = parseInt(process.env.PORT || "3000");
console.log(`Server running on port ${port}`);
serve({ fetch: app.fetch, port });
startEnrichmentQueue();

export default app;
