require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://claudebrain.com', 'http://localhost:5500']
}));
app.use(express.json());

const API_KEY = process.env.CLAUDE_API_KEY;

// Original /ask route
app.post('/ask', async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'Empty prompt not allowed' });
  }

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const completion = response.data?.content?.[0]?.text || '[No response from Claude]';
    res.json({ completion });

  } catch (error) {
    console.error('Claude API error:', error.message);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});

// ✅ NEW /api/message route (duplicate logic)
app.post('/api/message', async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'Empty prompt not allowed' });
  }

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const completion = response.data?.content?.[0]?.text || '[No response from Claude]';
    res.json({ completion });

  } catch (error) {
    console.error('Claude API error:', error.message);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});

app.listen(port, () => {
  console.log(`ClaudeBrain backend running on port ${port}`);
});
