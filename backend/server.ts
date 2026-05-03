import { generateSpeech } from "../shared/tts";

const ENV_API_KEY = process.env.OPENAI_API_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
  port: 3001,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/config") {
      return new Response(
        JSON.stringify({ requiresApiKey: !ENV_API_KEY }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname === "/tts") {
      try {
        const { text, voice = "nova", speed = 1.0, apiKey } = await req.json();
        const key = ENV_API_KEY || apiKey;

        if (!key) {
          return new Response(JSON.stringify({ error: "No API key configured" }), {
            status: 401,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        if (!text?.trim()) {
          return new Response(JSON.stringify({ error: "No text provided" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        const audioBuffer = await generateSpeech({ text, voice, speed, apiKey: key });

        return new Response(audioBuffer, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.byteLength.toString(),
          },
        });
      } catch (e) {
        console.error("OpenAI error:", e);
        return new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("🎙️  TTS server running at http://localhost:3001");
