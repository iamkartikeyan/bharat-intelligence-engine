/**
 * Backend Proxy Server Implementation
 * This should be deployed as a separate backend service
 * to keep API keys secure and handle authentication
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const crypto = require('crypto');

const app = express();

// ==================== SECURITY MIDDLEWARE ====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.newsapi.org', 'https://gnews.io'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// Rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 API requests per minute
    message: { error: 'API rate limit exceeded' }
});

app.use(globalLimiter);
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ==================== SECURE API CONFIGURATION ====================

class SecureAPIConfig {
    constructor() {
        // ✅ SECURE: API keys stored as environment variables
        this.newsApiKey = process.env.NEWS_API_KEY;
        this.gnewsKey = process.env.GNEWS_API_KEY;
        this.currentsKey = process.env.CURRENTS_API_KEY;
        
        if (!this.newsApiKey || !this.gnewsKey || !this.currentsKey) {
            throw new Error('Missing required API keys in environment variables');
        }
    }
}

const config = new SecureAPIConfig();

// ==================== INPUT VALIDATION ====================

class InputValidator {
    static validateNewsQuery(req, res, next) {
        const { categories, limit, query } = req.body;

        // Validate categories
        const allowedCategories = ['defense', 'economic', 'geopolitics', 'domestic', 'general'];
        if (categories && !Array.isArray(categories)) {
            return res.status(400).json({ error: 'Categories must be an array' });
        }
        
        if (categories && !categories.every(cat => allowedCategories.includes(cat))) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Validate limit
        if (limit && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
            return res.status(400).json({ error: 'Limit must be between 1 and 100' });
        }

        // Validate search query
        if (query) {
            if (typeof query !== 'string' || query.length > 200) {
                return res.status(400).json({ error: 'Invalid query format' });
            }
            
            // Sanitize query
            req.body.query = validator.escape(query.trim());
        }

        next();
    }

    static validateGeocodeQuery(req, res, next) {
        const { location } = req.body;

        if (!location || typeof location !== 'string') {
            return res.status(400).json({ error: 'Location is required' });
        }

        if (location.length < 2 || location.length > 100) {
            return res.status(400).json({ error: 'Location must be between 2 and 100 characters' });
        }

        // Sanitize location
        req.body.location = validator.escape(location.trim());
        next();
    }
}

// ==================== SECURE API ENDPOINTS ====================

// News aggregation endpoint
app.post('/api/news/aggregated', InputValidator.validateNewsQuery, async (req, res) => {
    try {
        const { categories = ['general'], limit = 20, query } = req.body;

        let articles = [];

        // Try NewsAPI first
        try {
            const newsApiResponse = await fetchNewsAPI(query || 'geopolitics defense economy', limit);
            articles = [...articles, ...newsApiResponse];
        } catch (error) {
            console.warn('NewsAPI failed:', error.message);
        }

        // Try GNews as backup
        if (articles.length < 10) {
            try {
                const gnewsResponse = await fetchGNews(query || 'international politics', limit);
                articles = [...articles, ...gnewsResponse];
            } catch (error) {
                console.warn('GNews failed:', error.message);
            }
        }

        // Filter and process articles
        const processedArticles = articles
            .filter(article => article && article.title)
            .map(article => ({
                title: validator.escape(article.title || ''),
                description: validator.escape(article.description || ''),
                source: validator.escape(article.source || 'Unknown'),
                publishedAt: new Date(article.publishedAt || Date.now()).toISOString(),
                url: validator.isURL(article.url || '') ? article.url : null
            }))
            .filter(article => article.title && article.source)
            .slice(0, limit);

        res.json({ 
            articles: processedArticles,
            count: processedArticles.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('News aggregation error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch news',
            timestamp: new Date().toISOString()
        });
    }
});

// Secure geocoding endpoint
app.post('/api/geo/geocode', InputValidator.validateGeocodeQuery, async (req, res) => {
    try {
        const { location } = req.body;

        // Use Nominatim API (free and more secure than exposing API keys)
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
        
        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'IntelligenceDashboard/1.0 (Security Demo)'
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

        const data = await response.json();

        if (!data.length) {
            return res.status(404).json({ error: 'Location not found' });
        }

        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: 'Invalid coordinates received' });
        }

        res.json({
            lat: lat,
            lon: lon,
            display_name: validator.escape(result.display_name || ''),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(500).json({ 
            error: 'Geocoding failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== SECURE API FUNCTIONS ====================

async function fetchNewsAPI(query, limit) {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=${limit}&apiKey=${config.newsApiKey}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'IntelligenceDashboard/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`NewsAPI HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'error') {
        throw new Error(`NewsAPI Error: ${data.message}`);
    }

    return data.articles || [];
}

async function fetchGNews(query, limit) {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&token=${config.gnewsKey}`;
    
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`GNews HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
        throw new Error(`GNews Error: ${data.errors[0]}`);
    }

    return data.articles || [];
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ==================== ANTHROPIC API PROXY ====================
// This proxy solves CORS issues by making the request server-side
// API keys are kept secure in environment variables

class AnthropicConfig {
    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        this.version = process.env.ANTHROPIC_API_VERSION || '2023-06-01';
        this.baseUrl = 'https://api.anthropic.com';
        
        if (!this.apiKey) {
            console.warn('⚠️ ANTHROPIC_API_KEY not set. Anthropic features will not work.');
        }
    }
}

const anthropicConfig = new AnthropicConfig();

// Anthropic chat endpoint proxy
app.post('/api/anthropic/chat', async (req, res) => {
    try {
        if (!anthropicConfig.apiKey) {
            return res.status(503).json({ 
                error: 'Anthropic API key not configured',
                message: 'Set ANTHROPIC_API_KEY environment variable'
            });
        }

        const { messages, model = 'claude-3-haiku-20240307', max_tokens = 1024 } = req.body;

        // Validate input
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        // Make request to Anthropic API server-side (bypasses CORS)
        const response = await fetch(`${anthropicConfig.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicConfig.apiKey,
                'anthropic-version': anthropicConfig.version
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API error:', response.status, errorData);
            return res.status(response.status).json({ 
                error: 'Anthropic API request failed',
                details: errorData
            });
        }

        const data = await response.json();
        
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Anthropic proxy error:', error.message);
        res.status(500).json({ 
            error: 'Failed to communicate with Anthropic API',
            message: error.message
        });
    }
});

// Anthropic models list endpoint
app.get('/api/anthropic/models', (req, res) => {
    // Return available models (static list - actual availability check would require API call)
    res.json({
        models: [
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest response' },
            { id: 'claude-2.1', name: 'Claude 2.1', description: 'Previous generation' },
            { id: 'claude-instant', name: 'Claude Instant', description: 'Fast, cost-effective' }
        ],
        timestamp: new Date().toISOString()
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🔒 Secure Intelligence Dashboard API running on port ${PORT}`);
    console.log(`🛡️ Security features enabled:`);
    console.log(`   - Rate limiting: ✅`);
    console.log(`   - Input validation: ✅`);
    console.log(`   - API key protection: ✅`);
    console.log(`   - CORS configured: ✅`);
    console.log(`   - Security headers: ✅`);
});

module.exports = app;
