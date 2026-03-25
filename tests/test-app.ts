import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoute } from "../src/routes/health";

// Minimal app for testing — no server.listen(), no dotenv side effects
const app = new Hono();
app.use("*", cors());
app.route("/", healthRoute);

export default app;
