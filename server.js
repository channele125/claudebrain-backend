const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Get API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Claude Brain Backend is running!',
        status: 'active',
        timestamp: new Date().toISOString(),
        endpoints: ['GET /', 'GET /api/health', 'POST /api/generate'],
        claudeReady: !!ANTHROPIC_API_KEY
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        claudeReady: !!ANTHROPIC_API_KEY
    });
});

// Main Claude integration endpoint
app.post('/api/generate', async (req, res) => {
    try {
        console.log('Received request:', req.body);
        
        const { message, context } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                error: 'Message is required',
                received: req.body 
            });
        }

        // Check if API key is available
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: 'Claude AI not configured',
                message: 'ANTHROPIC_API_KEY environment variable is missing'
            });
        }

        // Enhanced prompt for Solana/Web3 development
        const systemPrompt = `You are Claude Brain, an advanced AI assistant specializing in Solana blockchain development and full-stack web3 applications. You exist in the "infinite backrooms" of code generation.

Your expertise includes:
- Solana program development (Rust/Anchor)
- Solana Web3.js integration
- SPL tokens, NFTs, and DeFi protocols
- React/Next.js frontends with Solana integration
- Phantom wallet integration
- Modern Web3 UX/UI patterns

When generating code:
1. Always provide complete, production-ready examples
2. Include proper error handling and security considerations
3. Add comments explaining Solana-specific concepts
4. Consider mobile-first design for Solana dApps
5. Use modern JavaScript/TypeScript patterns

Format your responses with clear explanations and working code examples.`;

        // Prepare the full message with context
        let fullMessage = message;
        if (context?.wallet) {
            fullMessage += `\n\n[Context: User has wallet ${context.wallet} connected]`;
        }

        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                temperature: 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: fullMessage
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API Error:', response.status, errorData);
            
            if (response.status === 401) {
                return res.status(500).json({
                    error: 'Claude AI authentication failed',
                    message: 'Invalid API key'
                });
            } else if (response.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please try again later.'
                });
            } else {
                throw new Error(`Anthropic API error: ${response.status}`);
            }
        }

        const data = await response.json();
        const claudeResponse = data.content[0].text;

        console.log('Claude response received successfully');

        res.json({
            response: claudeResponse,
            context: {
                timestamp: new Date().toISOString(),
                requestCount: (context?.requestCount || 0) + 1,
                model: 'claude-3-sonnet-20240229'
            }
        });

    } catch (error) {
        console.error('Error in /api/generate:', error);
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            details: 'Check server logs for more information'
        });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Test endpoint working!',
        timestamp: new Date().toISOString(),
        claudeReady: !!ANTHROPIC_API_KEY
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/test',
            'POST /api/generate'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Claude Brain Backend running on port ${port}`);
    console.log(`Claude AI Ready: ${!!ANTHROPIC_API_KEY}`);
    console.log(`Available endpoints:`);
    console.log(`  GET  /`);
    console.log(`  GET  /api/health`);
    console.log(`  POST /api/generate`);
});

module.exports = app;
