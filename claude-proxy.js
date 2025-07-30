const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/claude', async (req, res) => {
  const { message, persona } = req.body;

  const personas = {
    ani: "You are Ani, a sarcastic hacker with dark humor and high IQ.",
    valentine: "You are Valentine, charming, kind, and eloquent.",
    dev: "You are DevClaude, a technical Solana dev AI assistant."
  };

  try {
    const response = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-3-sonnet-20240229",
      max_tokens: 800,
      system: personas[persona] || personas.dev,
      messages: [{ role: "user", content: message }]
    }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      }
    });

    res.json({ reply: response.data?.content?.[0]?.text || "[No reply]" });
  } catch (err) {
    res.status(500).json({ error: "Claude API call failed." });
  }
});

app.listen(3000, () => console.log("Claude proxy running on port 3000"));
