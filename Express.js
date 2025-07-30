// Enhanced Express.js backend for Claude Brain
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: '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'
});

// Initialize Solana connection
const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Enhanced system prompt for Solana-focused development
const SYSTEM_PROMPT = `You are Claude Brain, an advanced AI assistant specializing in Solana blockchain development and full-stack web3 applications. You exist in the "infinite backrooms" of code generation.

Your expertise includes:
- Solana program development (Rust/Anchor)
- Solana Web3.js 2.0 SDK integration
- SPL tokens, NFTs, and DeFi protocols
- React/Next.js frontends with Solana integration
- Phantom wallet integration
- Jupiter API for DEX aggregation
- Metaplex for NFTs
- Modern Web3 UX/UI patterns

When generating code:
1. Always provide complete, production-ready examples
2. Include proper error handling and security considerations
3. Use the latest Solana Web3.js 2.0 patterns where applicable
4. Include wallet connection and transaction signing
5. Add comments explaining Solana-specific concepts
6. Consider mobile-first design for Solana dApps

Format your responses with clear code blocks and explanations.`;

// Store conversation context
const conversationMemory = new Map();

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'active',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: ['solana-integration', 'wallet-support', 'infinite-backrooms']
    });
});

app.post('/api/generate', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get or create conversation context
        const sessionId = context?.wallet || 'anonymous';
        let conversationHistory = conversationMemory.get(sessionId) || [];

        // Enhanced prompt with context
        let enhancedMessage = message;
        
        if (context?.wallet) {
            // Fetch wallet info from Solana
            try {
                const publicKey = new PublicKey(context.wallet);
                const balance = await solanaConnection.getBalance(publicKey);
                const solBalance = balance / 1e9; // Convert lamports to SOL
                
                enhancedMessage += `\n\nContext: User wallet ${context.wallet} has ${solBalance} SOL. Consider this when suggesting gas fees or transactions.`;
            } catch (error) {
                console.warn('Could not fetch wallet info:', error.message);
            }
        }

        // Prepare messages for Claude
        const messages = [
            ...conversationHistory,
            { role: 'user', content: enhancedMessage }
        ];

        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            temperature: 0.7,
            system: SYSTEM_PROMPT,
            messages: messages
        });

        const claudeResponse = response.content[0].text;

        // Update conversation history (keep last 10 exchanges)
        conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: claudeResponse }
        );
        
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
        conversationMemory.set(sessionId, conversationHistory);

        res.json({
            response: claudeResponse,
            context: {
                requestCount: context?.requestCount || 0,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
            }
        });

    } catch (error) {
        console.error('Claude API Error:', error);
        
        if (error.status === 429) {
            res.status(429).json({ 
                error: 'Rate limit exceeded. Please try again later.',
                retryAfter: 60
            });
        } else if (error.status === 401) {
            res.status(500).json({ 
                error: 'API authentication failed. Please check server configuration.'
            });
        } else {
            res.status(500).json({ 
                error: 'Internal server error. Please try again.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// Solana-specific endpoints
app.get('/api/solana/price', async (req, res) => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        res.json({ price: data.solana.usd });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SOL price' });
    }
});

app.post('/api/solana/validate-wallet', async (req, res) => {
    try {
        const { address } = req.body;
        const publicKey = new PublicKey(address);
        const balance = await solanaConnection.getBalance(publicKey);
        
        res.json({
            valid: true,
            balance: balance / 1e9,
            address: publicKey.toString()
        });
    } catch (error) {
        res.json({ valid: false, error: 'Invalid wallet address' });
    }
});

// WebSocket support for real-time features (optional)
const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-room', (walletAddress) => {
        socket.join(walletAddress);
        console.log(`User ${socket.id} joined room ${walletAddress}`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

server.listen(port, () => {
    console.log(`Claude Brain Backend running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
});

module.exports = app;
