import Groq from "groq-sdk";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = string | null;

export async function callGroqAPI(
  apiKey: string,
  messages: Message[],
): Promise<GroqResponse> {
  if (!apiKey) {
    console.error("Groq API key is missing!");
    throw new Error("API key is required");
  }

  try {
    const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });

    const chatCompletion = await client.chat.completions.create({
      model: "deepseek-r1-distill-llama-70b",
      messages: messages,
      temperature: 0.5,
    });
    return (
      chatCompletion.choices[0]?.message?.content?.split("</think>")[1] ?? null
    );
  } catch (error) {
    throw error;
  }
}
