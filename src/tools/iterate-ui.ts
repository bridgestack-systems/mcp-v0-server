import { z } from "zod";
import { iterateUI } from "../v0-bridge-client.js";

export const iterateUISchema = z.object({
  chatId: z.string().describe("Existing v0.dev chat ID from a previous generate_ui call"),
  feedback: z.string().describe("Feedback or refinement instructions for the UI"),
});

export type IterateUIInput = z.infer<typeof iterateUISchema>;

export async function handleIterateUI(input: IterateUIInput): Promise<string> {
  const result = await iterateUI(input.chatId, input.feedback);

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
        preview: f.content.slice(0, 200) + (f.content.length > 200 ? "..." : ""),
      })),
      messages: result.messages.map((m) => m.content.slice(0, 500)),
    },
    null,
    2
  );
}
