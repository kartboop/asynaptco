import { Elysia } from "elysia";

const BASE_URL = process.env.BASE_URL!;
const API_KEY = process.env.API_KEY!;
const MODEL = process.env.MODEL!;
const PROVIDER = process.env.PROVIDER!;
const AGENT_API_URL = process.env.AGENT_API_URL || "http://127.0.0.1:8000";

const app = new Elysia()
  // ── Landing page ──
  .get("/", () => Bun.file("index.html"))
  .get("/index.html", () => Bun.file("index.html"))
  .get("/home.html", () => Bun.file("home.html"))
  .get("/try-it.html", () => Bun.file("try-it.html"))
  .get("/asynaptco-launcher.html", () => Bun.file("asynaptco-launcher.html"))
  .get("/logo.svg", () => Bun.file("logo.svg"))

  // ── API: Chat completions (OpenAI-compatible) ──
  .post("/api/chat/completions", async ({ request }) => {
    const body = await request.json();
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        ...body,
        model: MODEL,
      }),
    });
    // Stream the response back
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
      },
    });
  })

  // ── API: Agent proxy (to Python FastAPI) ──
  .all("/api/agent/*", async ({ request, path }) => {
    const target = `${AGENT_API_URL}${path}${request.url.includes("?") ? "?" + request.url.split("?")[1] : ""}`;
    const headers = new Headers();
    request.headers.forEach((v, k) => {
      if (!["host", "connection"].includes(k.toLowerCase())) {
        headers.set(k, v);
      }
    });
    let body: BodyInit | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.arrayBuffer();
    }
    const res = await fetch(target, { method: request.method, headers, body });
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  })

  // ── API: Health check ──
  .get("/api/health", () => ({
    status: "ok",
    provider: PROVIDER,
    model: MODEL,
    agent_api: AGENT_API_URL,
  }))

  // ── Serve React app static files from src/ ──
  .get("/app", () => Bun.file("src/index.html"))
  .get("/frontend.tsx", () => Bun.file("src/frontend.tsx"))
  .get("/App.tsx", () => Bun.file("src/App.tsx"))
  .get("/APITester.tsx", () => Bun.file("src/APITester.tsx"))
  .get("/index.css", () => Bun.file("src/index.css"))
  .get("/react.svg", () => Bun.file("src/react.svg"))
  .get("/src/logo.svg", () => Bun.file("src/logo.svg"))

  .listen(3000);

console.log(`🚀 Server running at http://localhost:${app.server?.port}`);
