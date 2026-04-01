/**
 * HTTP client for the v0-bridge service.
 * Wraps POST /generate, POST /iterate, GET /chat/:id/files.
 */

const V0_BRIDGE_URL = process.env.V0_BRIDGE_URL || "http://localhost:3100";

export interface V0File {
  path: string;
  content: string;
}

export interface V0Message {
  role: string;
  content: string;
}

export interface V0Result {
  chatId: string;
  previewUrl: string;
  files: V0File[];
  messages: V0Message[];
  error?: string;
}

export async function generateUI(
  prompt: string,
  system?: string,
  context?: string,
  timeout: number = 120000
): Promise<V0Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${V0_BRIDGE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, system, context }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        chatId: "",
        previewUrl: "",
        files: [],
        messages: [],
        error: `v0-bridge returned ${resp.status}: ${text.slice(0, 500)}`,
      };
    }

    return (await resp.json()) as V0Result;
  } catch (err: any) {
    return {
      chatId: "",
      previewUrl: "",
      files: [],
      messages: [],
      error: err.name === "AbortError" ? "Request timed out" : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function iterateUI(
  chatId: string,
  feedback: string,
  timeout: number = 120000
): Promise<V0Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${V0_BRIDGE_URL}/iterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, feedback }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        chatId,
        previewUrl: "",
        files: [],
        messages: [],
        error: `v0-bridge returned ${resp.status}: ${text.slice(0, 500)}`,
      };
    }

    return (await resp.json()) as V0Result;
  } catch (err: any) {
    return {
      chatId,
      previewUrl: "",
      files: [],
      messages: [],
      error: err.name === "AbortError" ? "Request timed out" : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getChat(chatId: string): Promise<V0Result> {
  try {
    const resp = await fetch(`${V0_BRIDGE_URL}/chat/${chatId}/files`);
    if (!resp.ok) {
      return {
        chatId,
        previewUrl: `https://v0.dev/chat/${chatId}`,
        files: [],
        messages: [],
        error: `v0-bridge returned ${resp.status}`,
      };
    }

    const data = (await resp.json()) as { files: V0File[] };
    return {
      chatId,
      previewUrl: `https://v0.dev/chat/${chatId}`,
      files: data.files || [],
      messages: [],
    };
  } catch (err: any) {
    return {
      chatId,
      previewUrl: `https://v0.dev/chat/${chatId}`,
      files: [],
      messages: [],
      error: err.message,
    };
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const resp = await fetch(`${V0_BRIDGE_URL}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}
