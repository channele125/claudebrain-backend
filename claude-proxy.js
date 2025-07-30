const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 👋 Welcome message on GET /
app.get('/', (req, res) => {
  res.send('🤖 ClaudeBrain API is live. Use POST /ask to talk to Claude!');
});

app.post('/ask', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    const claudeReply = response.data.content[0]?.text || '(No reply)';
    res.json({ reply: claudeReply });
  } catch (error) {
    console.error('❌ Error communicating with Claude:', error.message);
    res.status(500).json({ error: 'Claude API request failed.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Claude proxy running on port ${port}`);
});
