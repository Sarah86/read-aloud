export const config = { runtime: "edge" };

export function GET(): Response {
  return Response.json({ requiresApiKey: !process.env.OPENAI_API_KEY });
}
