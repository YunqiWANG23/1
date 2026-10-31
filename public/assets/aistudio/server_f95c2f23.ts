import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { generateGame } from "./gameGenerator";
import { verifyAndFix, BROKEN_GAME } from "./verifier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "60mb" })); // photos/video come in as base64

  app.post("/api/generate-game", async (req, res) => {
    try {
      // body: { media: [{mimeType, base64}], event: {...}, approvedIds?: string[] }
      const result = await generateGame(req.body);
      res.json(result);
    } catch (e: any) {
      console.error("Error in /api/generate-game:", e);
      res.status(500).json({ error: e.message || "Failed to generate game" });
    }
  });

  // body: { game, usable_objects, mock? }
  app.post("/api/verify", async (req, res) => {
    try {
      res.json(
        await verifyAndFix(req.body.game, req.body.usable_objects, {
          mock: req.body.mock,
        })
      );
    } catch (e: any) {
      console.error("Error in /api/verify:", e);
      res.status(500).json({ error: e.message || "Failed to verify game" });
    }
  });

  // the planted broken level for the demo
  app.get("/api/broken-game", (_req, res) => res.json(BROKEN_GAME));

  // Short-lived ephemeral token for browser Live API session (key stays on server)
  app.post("/api/live-token", async (_req, res) => {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" },
        },
      });
      const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: expire,
          newSessionExpireTime: expire,
          httpOptions: {
            apiVersion: "v1alpha",
            headers: { "User-Agent": "aistudio-build" },
          },
        },
      });
      res.json({ token: token.name });
    } catch (e: any) {
      console.error("Error in /api/live-token:", e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
