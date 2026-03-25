import { Context, Next } from "hono";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== process.env.API_KEY) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  await next();
}
