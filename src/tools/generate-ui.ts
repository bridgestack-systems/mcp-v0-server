import { z } from "zod";
import { generateUI } from "../v0-bridge-client.js";

export const generateUISchema = z.object({
  prompt: z.string().describe("UI design prompt — describe the interface you want to generate"),
  system: z.string().optional().describe("System instructions for v0.dev (e.g. 'Use Tailwind CSS, dark theme')"),
  context: z.string().optional().describe("Project context: requirements, feature list, brand colors"),
  brand_colors: z.string().optional().describe("Brand colors to use (e.g. 'primary: #635BFF, secondary: #0A2540')"),
});

export type GenerateUIInput = z.infer<typeof generateUISchema>;

export async function handleGenerateUI(input: GenerateUIInput): Promise<string> {
  let context = input.context || "";
  if (input.brand_colors) {
    context += `\n\nBrand colors: ${input.brand_colors}`;
  }

  const result = await generateUI(input.prompt, input.system, context);

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
