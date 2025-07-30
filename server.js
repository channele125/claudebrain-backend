const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Load environment variables
require('dotenv').config();

// Get API key from environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for now
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Claude Brain Backend is running!',
        status: 'active',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/generate'
        ]
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'active',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'Claude Brain Backend'
    });
});

// Main generate endpoint
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
                error: 'API key not configured',
                message: 'ANTHROPIC_API_KEY environment variable is missing'
            });
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
                system: `You are Claude Brain, an advanced AI assistant specializing in Solana blockchain development and full-stack web3 applications. You exist in the "infinite backrooms" of code generation.

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

Format your responses with clear code blocks and explanations.`,
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API Error:', response.status, errorData);
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        const claudeResponse = data.content[0].text;

        res.json({
            response: claudeResponse,
            context: {
                timestamp: new Date().toISOString(),
                requestCount: (context?.requestCount || 0) + 1
            }
        });

    } catch (error) {
        console.error('Error in /api/generate:', error);
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Test endpoint working!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for undefined routes
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

app.listen(port, () => {
    console.log(`Claude Brain Backend running on port ${port}`);
    console.log(`Available endpoints:`);
    console.log(`  GET  http://localhost:${port}/`);
    console.log(`  GET  http://localhost:${port}/api/health`);
    console.log(`  POST http://localhost:${port}/api/generate`);
});

module.exports = app;
