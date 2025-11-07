import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log("API Key prefix:", process.env.OPENAI_API_KEY?.slice(0, 10));

/* ------------------- EXISTING: Robot Command Generator ------------------- */
app.post("/chatgpt", async (req, res) => {
  const { prompt } = req.body;
  console.log("➡️ User prompt:", prompt);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            You are an interpreter that translates natural language instructions into robot commands.

            Always output a **valid JSON object only**, never text outside JSON.
            Format:

            {
              "commands": [
                  { "action": "move", "direction": "forward", "steps": 2 },
                  { "action": "rotate", "direction": "right" },
                  { "action": "pick" },
                  { "action": "release" }
              ]
            }
          `
        },
        { role: "user", content: prompt }
      ],
      temperature: 0
    });

    let reply = completion.choices[0].message.content.trim();
    console.log("⬅️ Raw ChatGPT reply:", reply);

    try {
      const jsonReply = JSON.parse(reply);
      res.json(jsonReply);
    } catch (parseErr) {
      console.error("❌ Parse error:", parseErr);
      res.json({ commands: [] });
    }
  } catch (err) {
    console.error("❌ ChatGPT error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- NEW: Interactive Chat Assistant ------------------- */
app.post("/assistant", async (req, res) => {
  const { messages } = req.body; // expects [{role: "user", content: "..."}] etc.
  console.log("💬 Assistant conversation:", messages);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            You are ChatGPT (GPT-5), a helpful, knowledgeable assistant that interacts naturally with the user.
            Maintain context of this conversation while it's active, but do not persist data once the session ends.
          `
        },
        ...messages
      ],
      temperature: 0.7
    });

    const reply = completion.choices[0].message;
    console.log("🤖 Assistant reply:", reply.content);
    res.json(reply);
  } catch (err) {
    console.error("❌ Assistant error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- Server Start ------------------- */
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
