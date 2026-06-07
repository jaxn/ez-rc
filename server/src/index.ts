/**
 * HTTP + WebSocket bootstrap.
 *  - Serves the built client (client/dist) in production.
 *  - Exposes /healthz and /replay/:code (JSONL event log for analysis).
 *  - Hosts the WebSocket relay at /ws.
 */

import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import { readSession } from "./eventLog.js";
import { generateSessionCode, normalizeCode } from "./sessions.js";
import { handleConnection } from "./relay.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

const app = express();

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

/** Mint a fresh session code without joining (handy for the "create" button). */
app.get("/api/new-session", (_req, res) => {
  res.json({ sessionCode: generateSessionCode() });
});

/** Replay a session's durable event log, in order, for later analysis. */
app.get("/replay/:code", async (req, res) => {
  const entries = await readSession(normalizeCode(req.params.code));
  res.json({ sessionCode: normalizeCode(req.params.code), count: entries.length, entries });
});

// Serve the built PWA (no-op in dev, where Vite serves the client).
app.use(express.static(CLIENT_DIST));
app.get("*", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) res.status(404).send("Client build not found. Run `npm run build`.");
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => handleConnection(socket));

server.listen(PORT, () => {
  console.log(`ez-rc server listening on http://localhost:${PORT} (ws: /ws)`);
});
