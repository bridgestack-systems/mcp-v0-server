/**
 * v0 Bridge — HTTP wrapper around the v0 SDK.
 *
 * Python agents POST to this service to generate UI via v0.dev.
 * Runs on port 3100 (configurable via V0_BRIDGE_PORT).
 *
 * Endpoints:
 *   POST /generate       — create a new UI generation
 *   POST /iterate        — send follow-up feedback to refine
 *   GET  /chat/:id       — get chat details + files
 *   GET  /chat/:id/files — download version files
 *   GET  /health         — health check
 */

import express from "express";
import { createClient } from "v0-sdk";

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.V0_BRIDGE_PORT || 3100;
const API_KEY = process.env.V0_API_KEY;

if (!API_KEY) {
  console.error("V0_API_KEY environment variable is required");
  process.exit(1);
}

const v0 = createClient({ apiKey: API_KEY });

/**
 * POST /generate
 * Body: { prompt, system?, context? }
 */
app.post("/generate", async (req, res) => {
  try {
    const { prompt, system, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    console.log(`[generate] ${prompt.substring(0, 100)}...`);

    // Create a chat with the prompt
    const chat = await v0.chats.create({
      prompt: fullPrompt,
      ...(system && { systemPrompt: system }),
    });

    const chatId = chat.id || chat.chatId;
    console.log(`[generate] Chat created: ${chatId}`);

    // Get the latest version files
    let files = [];
    try {
      const versions = await v0.chats.findVersions(chatId);
      if (versions && versions.length > 0) {
        const latestVersion = versions[versions.length - 1];
        const downloaded = await v0.chats.downloadVersion(chatId, latestVersion.id || latestVersion.versionId);
        if (downloaded) {
          files = Object.entries(downloaded).map(([path, content]) => ({
            path,
            content: typeof content === "string" ? content : JSON.stringify(content),
          }));
        }
      }
    } catch (fileErr) {
      console.log(`[generate] Could not fetch files: ${fileErr.message}`);
    }

    // Get messages
    let messages = [];
    try {
      const msgs = await v0.chats.findMessages(chatId);
      if (msgs) {
        messages = msgs
          .filter((m) => m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content || m.text || "" }));
      }
    } catch (msgErr) {
      console.log(`[generate] Could not fetch messages: ${msgErr.message}`);
    }

    const result = {
      chatId,
      previewUrl: `https://v0.dev/chat/${chatId}`,
      files,
      messages,
    };

    console.log(`[generate] Done: chatId=${chatId}, files=${files.length}`);
    res.json(result);
  } catch (err) {
    console.error("[generate] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /iterate
 * Body: { chatId, feedback }
 */
app.post("/iterate", async (req, res) => {
  try {
    const { chatId, feedback } = req.body;
    if (!chatId || !feedback) {
      return res.status(400).json({ error: "chatId and feedback are required" });
    }

    console.log(`[iterate] chatId=${chatId}: ${feedback.substring(0, 100)}...`);

    // Send follow-up message
    await v0.chats.sendMessage(chatId, { content: feedback });

    // Get updated files
    let files = [];
    try {
      const versions = await v0.chats.findVersions(chatId);
      if (versions && versions.length > 0) {
        const latest = versions[versions.length - 1];
        const downloaded = await v0.chats.downloadVersion(chatId, latest.id || latest.versionId);
        if (downloaded) {
          files = Object.entries(downloaded).map(([path, content]) => ({
            path,
            content: typeof content === "string" ? content : JSON.stringify(content),
          }));
        }
      }
    } catch (fileErr) {
      console.log(`[iterate] Could not fetch files: ${fileErr.message}`);
    }

    // Get latest messages
    let messages = [];
    try {
      const msgs = await v0.chats.findMessages(chatId);
      if (msgs) {
        messages = msgs
          .filter((m) => m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content || m.text || "" }));
      }
    } catch (msgErr) {
      console.log(`[iterate] Could not fetch messages: ${msgErr.message}`);
    }

    console.log(`[iterate] Done: chatId=${chatId}, files=${files.length}`);
    res.json({ chatId, previewUrl: `https://v0.dev/chat/${chatId}`, files, messages });
  } catch (err) {
    console.error("[iterate] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /chat/:chatId
 */
app.get("/chat/:chatId", async (req, res) => {
  try {
    const chat = await v0.chats.getById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /chat/:chatId/files
 */
app.get("/chat/:chatId/files", async (req, res) => {
  try {
    const versions = await v0.chats.findVersions(req.params.chatId);
    if (!versions || versions.length === 0) {
      return res.json({ files: [] });
    }
    const latest = versions[versions.length - 1];
    const downloaded = await v0.chats.downloadVersion(
      req.params.chatId,
      latest.id || latest.versionId
    );
    const files = downloaded
      ? Object.entries(downloaded).map(([path, content]) => ({
          path,
          content: typeof content === "string" ? content : JSON.stringify(content),
        }))
      : [];
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "v0-bridge", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`v0-bridge listening on port ${PORT}`);
});
