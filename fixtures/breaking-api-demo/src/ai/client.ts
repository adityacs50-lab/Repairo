export interface ChatCompletionsInput {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  max_output_tokens?: number;
}

export class OpenAIClient {
  chat = {
    completions: {
      create: async (params: ChatCompletionsInput) => {
        return { id: "chatcmpl-123", choices: [] };
      },
    },
  };
}

const openai = new OpenAIClient();

export async function generateCompletion(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_output_tokens: 500,
  });

  return response;
}
