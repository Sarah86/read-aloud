export async function generateSpeech({
  text,
  voice,
  speed,
  apiKey,
}: {
  text: string;
  voice: string;
  speed: number;
  apiKey: string;
}): Promise<ArrayBuffer> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, 4096),
      voice,
      speed,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.arrayBuffer();
}
