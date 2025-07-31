const express = require('express');
const cors = require('cors');
const https = require('https');

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

// Helper function to make HTTPS requests (instead of fetch)
function makeApiRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, rawData: data });
                } catch (error) {
                    resolve({ status: res.statusCode, data: null, rawData: data });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Claude Brain Backend is running!',
        status: 'active',
        timestamp: new Date().toISOString(),
        endpoints: ['GET /', 'GET /api/health', 'POST /api/generate'],
        claudeReady: !!ANTHROPIC_API_KEY,
        nodeVersion: process.version
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        claudeReady: !!ANTHROPIC_API_KEY,
        nodeVersion: process.version
    });
});

// Main Claude integration endpoint
app.post('/api/generate', async (req, res) => {
    try {
        console.log('=== NEW REQUEST ===');
        console.log('Received request body:', JSON.stringify(req.body, null, 2));
        
        const { message, context } = req.body;
        
        if (!message) {
            console.log('ERROR: No message provided');
            return res.status(400).json({ 
                error: 'Message is required',
                received: req.body 
            });
        }

        // Check if API key is available
        if (!ANTHROPIC_API_KEY) {
            console.log('ERROR: No API key configured');
            return res.status(500).json({
                error: 'Claude AI not configured',
                message: 'ANTHROPIC_API_KEY environment variable is missing'
            });
        }

        console.log('API key available:', ANTHROPIC_API_KEY ? 'YES' : 'NO');
        console.log('API key length:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0);
        console.log('API key starts with:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 20) + '...' : 'N/A');
        console.log('Processing message:', message.substring(0, 100) + '...');

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

        // Prepare request data
        const requestBody = JSON.stringify({
            model: 'claude-opus-4-20250514',
            max_tokens: 4000,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: fullMessage
                }
            ]
        });

        // Configure HTTPS request options
        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        console.log('Making request to Anthropic API...');
        
        // Make API request
        const apiResponse = await makeApiRequest(options, requestBody);
        
        console.log('API Response status:', apiResponse.status);
        
        if (apiResponse.status !== 200) {
            console.error('API Error:', apiResponse.status, apiResponse.rawData);
            
            if (apiResponse.status === 401) {
                return res.status(500).json({
                    error: 'Claude AI authentication failed',
                    message: 'Invalid API key'
                });
            } else if (apiResponse.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please try again later.'
                });
            } else {
                return res.status(500).json({
                    error: 'Anthropic API error',
                    message: `API returned status ${apiResponse.status}`,
                    details: apiResponse.rawData
                });
            }
        }

        if (!apiResponse.data || !apiResponse.data.content) {
            console.error('Invalid API response:', apiResponse.data);
            return res.status(500).json({
                error: 'Invalid response from Claude API',
                details: 'No content in response'
            });
        }

        const claudeResponse = apiResponse.data.content[0].text;
        console.log('Claude response received, length:', claudeResponse.length);

        res.json({
            response: claudeResponse,
            context: {
                timestamp: new Date().toISOString(),
                requestCount: (context?.requestCount || 0) + 1,
                model: 'claude-opus-4-20250514'
            }
        });

        console.log('=== REQUEST COMPLETED SUCCESSFULLY ===');

    } catch (error) {
        console.error('=== ERROR IN /api/generate ===');
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
        
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
        claudeReady: !!ANTHROPIC_API_KEY,
        nodeVersion: process.version
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
    console.error('=== UNHANDLED ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Claude Brain Backend running on port ${port}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Claude AI Ready: ${!!ANTHROPIC_API_KEY}`);
    console.log(`Available endpoints:`);
    console.log(`  GET  /`);
    console.log(`  GET  /api/health`);
    console.log(`  POST /api/generate`);
});

module.exports = app;
