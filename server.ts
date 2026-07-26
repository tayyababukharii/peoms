import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for poem generation via Gemini
  app.post("/api/generate-poem", async (req, res) => {
    try {
      const { topic, mood, characterName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        // Signal client to use procedural fallback
        return res.json({ success: false, fallback: true, reason: "No GEMINI_API_KEY configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Write a delightful, rhyming, child-friendly 8-line poem (2 stanzas) suitable for children ages 5 to 10.
Topic: ${topic}
Mood: ${mood}
Main Character Name: ${characterName || 'Little Friend'}

Requirements:
- First line should introduce a title in format "Title: [Title Here]"
- Followed by two 4-line rhyming stanzas.
- Keep the rhyme rhythm catchy, joyful, and bouncy.
- Do NOT include any markdown code blocks, intros, or conversational chat.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        let title = `${characterName || 'Little Friend'}’s ${topic} Poem`;
        let content = responseText;

        // Parse title if generated in expected format
        const titleMatch = responseText.match(/^Title:\s*(.+)/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/[*#]/g, '').trim();
          content = responseText.replace(/^Title:\s*.+\n*/i, '').trim();
        }

        return res.json({
          success: true,
          title,
          content,
        });
      }

      return res.json({ success: false, fallback: true, reason: "Empty Gemini response" });
    } catch (error: any) {
      console.warn("Gemini poem generation fallback:", error?.message);
      return res.json({ success: false, fallback: true, reason: error?.message || "Generation error" });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Magical Poem Maker server running on http://localhost:${PORT}`);
  });
}

startServer();
