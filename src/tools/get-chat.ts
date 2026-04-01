import { z } from "zod";
import { getChat } from "../v0-bridge-client.js";

export const getChatSchema = z.object({
  chatId: z.string().describe("v0.dev chat ID to retrieve files and preview URL from"),
});

export type GetChatInput = z.infer<typeof getChatSchema>;

export async function handleGetChat(input: GetChatInput): Promise<string> {
  const result = await getChat(input.chatId);

  if (result.error) {
    return JSON.stringify({ error: result.error }, null, 2);
  }

  return JSON.stringify(
    {
      chatId: result.chatId,
      previewUrl: result.previewUrl,
      fileCount: result.files.length,
      files: result.files.map((f) => ({
        path: f.path,
        size: f.content.length,
        preview: f.content.slice(0, 300) + (f.content.length > 300 ? "..." : ""),
      })),
    },
    null,
    2
  );
}
