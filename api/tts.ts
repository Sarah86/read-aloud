import { generateSpeech } from "../shared/tts";

export const config = { runtime: "edge" };

export async function POST(req: Request): Promise<Response> {
  const { text, voice = "nova", speed = 1.0, apiKey } = await req.json();
  const key = process.env.OPENAI_API_KEY || apiKey;

  if (!key) {
    return Response.json({ error: "No API key configured" }, { status: 401 });
  }
  if (!text?.trim()) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const audioBuffer = await generateSpeech({ text, voice, speed, apiKey: key });
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (e) {
    console.error("OpenAI error:", e);
    return Response.json({ error: "OpenAI API error" }, { status: 502 });
  }
}
