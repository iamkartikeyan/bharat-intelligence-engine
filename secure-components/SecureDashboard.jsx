// ==================== SECURE INTELLIGENCE DASHBOARD ====================
// Fixed version addressing all identified security vulnerabilities

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import CryptoJS from 'crypto-js';

// ==================== SECURITY UTILITIES ====================

/**
 * Secure configuration management
 * API keys should be stored server-side and accessed via proxy endpoints
 */
class SecureConfig {
    constructor() {
        // ✅ FIXED: No API keys in client-side code
        this.apiEndpoints = {
            news: '/api/news/search',           // Proxy endpoint
            gnews: '/api/gnews/search',         // Proxy endpoint  
            currents: '/api/currents/latest',   // Proxy endpoint
            geocode: '/api/geo/geocode'         // Proxy endpoint
        };
        
        // Security headers for API requests
        this.secureHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
        };
    }
}

/**
 * Input validation and sanitization utilities
 */
class SecurityValidator {
    static sanitizeText(text) {
        if (typeof text !== 'string') return '';
        
        // Remove potential XSS vectors
        return text
            .replace(/[<>'"]/g, '') // Remove HTML/JS characters
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim()
            .substring(0, 1000); // Limit length
    }

    static validateCoordinates(lat, lon) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates format');
        }
        
        if (latitude < -90 || latitude > 90) {
            throw new Error('Latitude must be between -90 and 90');
        }
        
        if (longitude < -180 || longitude > 180) {
            throw new Error('Longitude must be between -180 and 180');
        }
        
        return { lat: latitude, lon: longitude };
    }

    static validateCountryName(country) {
        const validCountries = [
            'India', 'China', 'Pakistan', 'USA', 'Russia', 'Japan', 
            'United Kingdom', 'France', 'Germany', 'Australia'
        ];
        
        const sanitized = this.sanitizeText(country);
        if (!validCountries.includes(sanitized)) {
            throw new Error('Invalid country name');
        }
        
        return sanitized;
    }

    static validateSearchQuery(query) {
        if (typeof query !== 'string') return '';
        
        // Sanitize and limit search queries
        const sanitized = this.sanitizeText(query);
        
        // Additional search-specific validation
        const blacklistedPatterns = [
            /script/gi,
            /javascript/gi,
            /<.*>/gi,
            /eval\(/gi,
            /function\(/gi
        ];
        
        for (const pattern of blacklistedPatterns) {
            if (pattern.test(sanitized)) {
                throw new Error('Invalid search query detected');
            }
        }
        
        return sanitized.substring(0, 200); // Limit search query length
    }
}

/**
 * Secure storage with encryption
 */
class SecureStorage {
    constructor() {
        this.encryptionKey = this.generateEncryptionKey();
        this.maxAge = 60 * 60 * 1000; // 1 hour
    }

    generateEncryptionKey() {
        // Generate a session-based encryption key
        // In production, this should come from a secure source
        const sessionId = sessionStorage.getItem('session_id') || this.generateSessionId();
        return CryptoJS.SHA256(sessionId).toString();
    }

    generateSessionId() {
        const sessionId = CryptoJS.lib.WordArray.random(128/8).toString();
        sessionStorage.setItem('session_id', sessionId);
        return sessionId;
    }

    // ✅ FIXED: Secure localStorage with encryption and validation
    secureSet(key, data, options = {}) {
        try {
            const payload = {
                data: data,
                timestamp: Date.now(),
                expires: Date.now() + (options.maxAge || this.maxAge),
                version: '1.0'
            };

            // Encrypt sensitive data
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(payload),
                this.encryptionKey
            ).toString();

            localStorage.setItem(`secure_${key}`, encrypted);
            return true;
        } catch (error) {
            console.warn('Secure storage failed:', error.message);
            return false;
        }
    }

    // ✅ FIXED: Secure localStorage retrieval with validation
    secureGet(key) {
        try {
            const encrypted = localStorage.getItem(`secure_${key}`);
            if (!encrypted) return null;

            // Decrypt data
            const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedString) {
                // Decryption failed, remove corrupted data
                localStorage.removeItem(`secure_${key}`);
                return null;
            }

            const payload = JSON.parse(decryptedString);

            // Validate structure
            if (!payload.timestamp || !payload.data) {
                localStorage.removeItem(`secure_${key}`);
                return null;
            }

            // Check expiration
            if (Date.now() > payload.expires) {
                localStorage.removeItem(`secure_${key}`);
                return null;
            }

            return payload.data;
        } catch (error) {
            console.warn('Secure storage retrieval failed:', error.message);
            localStorage.removeItem(`secure_${key}`);
            return null;
        }
    }

    // Clean expired entries
    cleanup() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('secure_')) {
                this.secureGet(key.replace('secure_', '')); // This will remove expired entries
            }
        });
    }
}

/**
 * Secure API client with proper error handling
 */
class SecureApiClient {
    constructor() {
        this.config = new SecureConfig();
        this.storage = new SecureStorage();
        this.requestQueue = new Map();
    }

    // ✅ FIXED: Secure API requests through proxy endpoints
    async secureRequest(endpoint, options = {}) {
        const requestId = this.generateRequestId();
        
        try {
            // Rate limiting check
            if (this.isRateLimited(endpoint)) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            const requestOptions = {
                method: options.method || 'GET',
                headers: {
                    ...this.config.secureHeaders,
                    ...options.headers
                },
                signal: AbortSignal.timeout(10000), // 10 second timeout
                credentials: 'same-origin' // Prevent CSRF
            };

            if (options.body) {
                requestOptions.body = JSON.stringify(options.body);
            }

            // Log request for monitoring
            this.logRequest(endpoint, requestOptions);

            const response = await fetch(endpoint, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Validate content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response content type');
            }

            const data = await response.json();
            
            // Validate response structure
            if (!this.validateResponse(data)) {
                throw new Error('Invalid response structure');
            }

            return data;
        } catch (error) {
            console.error(`API request failed [${requestId}]:`, error.message);
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isRateLimited(endpoint) {
        const now = Date.now();
        const key = `rate_${endpoint}`;
        const requests = this.requestQueue.get(key) || [];
        
        // Remove requests older than 1 minute
        const recentRequests = requests.filter(time => now - time < 60000);
        
        // Limit to 10 requests per minute per endpoint
        if (recentRequests.length >= 10) {
            return true;
        }
        
        recentRequests.push(now);
        this.requestQueue.set(key, recentRequests);
        return false;
    }

    validateResponse(data) {
        // Basic response validation
        if (!data || typeof data !== 'object') return false;
        
        // Check for common response patterns
        const validPatterns = ['articles', 'data', 'results', 'news', 'items'];
        return validPatterns.some(pattern => data.hasOwnProperty(pattern));
    }

    logRequest(endpoint, options) {
        // Log requests for security monitoring (production: send to security service)
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔒 Secure API Request: ${endpoint}`, {
                method: options.method,
                timestamp: new Date().toISOString(),
                headers: Object.keys(options.headers)
            });
        }
    }
}

/**
 * ✅ FIXED: Secure News Aggregator
 */
class SecureNewsAggregator {
    constructor() {
        this.apiClient = new SecureApiClient();
        this.storage = new SecureStorage();
        this.cacheKey = "news_cache";
        
        // Security patterns for content filtering
        this.securityFilters = {
            maliciousPatterns: [
                /<script/gi,
                /javascript:/gi,
                /onclick=/gi,
                /onerror=/gi,
                /onload=/gi
            ],
            allowedDomains: [
                'newsapi.org',
                'gnews.io',
                'api.currentsapi.services'
            ]
        };
    }

    async fetchAllNews() {
        try {
            // Try cache first
            const cached = this.storage.secureGet(this.cacheKey);
            if (cached && this.validateCachedNews(cached)) {
                return cached;
            }

            // Fetch from secure proxy endpoints
            let articles = [];

            try {
                const response = await this.apiClient.secureRequest('/api/news/aggregated', {
                    method: 'POST',
                    body: {
                        categories: ['geopolitics', 'defense', 'economy', 'domestic'],
                        limit: 50
                    }
                });
                
                articles = response.articles || [];
            } catch (error) {
                console.warn('News API failed, using fallback:', error.message);
                articles = this.getSecureFallbackNews();
            }

            // Process and sanitize articles
            const processedArticles = this.processSecureArticles(articles);
            
            // Cache securely
            this.storage.secureSet(this.cacheKey, processedArticles, { maxAge: 3600000 });
            
            return processedArticles;
        } catch (error) {
            console.error('Secure news fetch failed:', error.message);
            return this.getSecureFallbackNews();
        }
    }

    processSecureArticles(articles) {
        return articles
            .map(article => this.sanitizeArticle(article))
            .filter(article => this.validateArticle(article))
            .slice(0, 100); // Limit number of articles
    }

    sanitizeArticle(article) {
        return {
            id: this.generateSecureId(),
            title: SecurityValidator.sanitizeText(article.title || ''),
            description: SecurityValidator.sanitizeText(article.description || ''),
            source: SecurityValidator.sanitizeText(article.source || 'Unknown'),
            publishedAt: this.validateDate(article.publishedAt),
            category: this.categorizeSecurely(article),
            priority: this.calculatePriority(article),
            sentiment: this.analyzeSentimentSecurely(article)
        };
    }

    validateArticle(article) {
        // Validate article structure and content
        if (!article.title || !article.source) return false;
        
        // Check for malicious content
        const content = `${article.title} ${article.description}`.toLowerCase();
        
        for (const pattern of this.securityFilters.maliciousPatterns) {
            if (pattern.test(content)) {
                console.warn('Malicious content detected and filtered');
                return false;
            }
        }
        
        return true;
    }

    validateCachedNews(cached) {
        return Array.isArray(cached) && cached.length > 0 && cached.every(article => 
            article.title && article.source && article.publishedAt
        );
    }

    generateSecureId() {
        return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    validateDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return new Date().toISOString();
        
        // Ensure date is not in the future or too old
        const now = Date.now();
        const articleTime = date.getTime();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (articleTime > now || articleTime < (now - maxAge)) {
            return new Date().toISOString();
        }
        
        return date.toISOString();
    }

    categorizeSecurely(article) {
        const categories = {
            defense: ['military', 'defense', 'army', 'navy', 'security'],
            economic: ['economy', 'gdp', 'trade', 'market', 'financial'],
            geopolitics: ['border', 'diplomatic', 'international', 'treaty'],
            domestic: ['government', 'parliament', 'election', 'domestic']
        };

        const content = `${article.title} ${article.description}`.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    calculatePriority(article) {
        const highPriorityKeywords = ['urgent', 'breaking', 'crisis', 'emergency'];
        const mediumPriorityKeywords = ['important', 'significant', 'major'];
        
        const content = `${article.title} ${article.description}`.toLowerCase();
        
        if (highPriorityKeywords.some(keyword => content.includes(keyword))) {
            return 'HIGH';
        }
        if (mediumPriorityKeywords.some(keyword => content.includes(keyword))) {
            return 'MEDIUM';
        }
        return 'LOW';
    }

    analyzeSentimentSecurely(article) {
        const positiveWords = ['success', 'growth', 'progress', 'agreement', 'positive'];
        const negativeWords = ['crisis', 'conflict', 'decline', 'threat', 'negative'];
        
        const content = `${article.title} ${article.description}`.toLowerCase();
        
        let score = 0;
        positiveWords.forEach(word => {
            if (content.includes(word)) score += 0.1;
        });
        negativeWords.forEach(word => {
            if (content.includes(word)) score -= 0.1;
        });
        
        return Math.max(-1, Math.min(1, score));
    }

    getSecureFallbackNews() {
        return [
            {
                id: 'fallback_1',
                title: 'Intelligence Dashboard Active',
                description: 'System operational with secure data feeds.',
                source: 'System',
                publishedAt: new Date().toISOString(),
                category: 'general',
                priority: 'LOW',
                sentiment: 0
            }
        ];
    }
}

/**
 * ✅ FIXED: Secure Query Executor (prevents injection)
 */
class SecureQueryExecutor {
    constructor() {
        this.allowedRelations = ['TRADE', 'ALLIANCE', 'BORDER', 'CONFLICT'];
        this.allowedCountries = [
            'India', 'China', 'Pakistan', 'USA', 'Russia', 'Japan',
            'United Kingdom', 'France', 'Germany', 'Australia'
        ];
    }

    // ✅ FIXED: Parameterized queries prevent injection
    runSecureNeo4jQuery(plan) {
        try {
            // Validate and sanitize inputs
            const relation = this.validateRelation(plan.relation);
            const country = this.validateCountry(plan.countries?.[0]);

            // Use parameterized query structure
            const query = {
                cypher: 'MATCH (c1:Country)-[r:$relation]->(c2:Country) WHERE c1.name = $country RETURN c2',
                parameters: {
                    relation: relation,
                    country: country
                }
            };

            return {
                query: query,
                message: `Finding ${relation.toLowerCase()} relationships for ${country}`,
                isSecure: true
            };
        } catch (error) {
            console.error('Query validation failed:', error.message);
            return {
                error: 'Invalid query parameters',
                isSecure: false
            };
        }
    }

    validateRelation(relation) {
        const sanitized = SecurityValidator.sanitizeText(relation || '').toUpperCase();
        if (!this.allowedRelations.includes(sanitized)) {
            throw new Error(`Invalid relation: ${relation}`);
        }
        return sanitized;
    }

    validateCountry(country) {
        const sanitized = SecurityValidator.validateCountryName(country || 'India');
        if (!this.allowedCountries.includes(sanitized)) {
            throw new Error(`Invalid country: ${country}`);
        }
        return sanitized;
    }
}

/**
 * ✅ FIXED: Secure Geocoding Service
 */
class SecureGeoService {
    constructor() {
        this.apiClient = new SecureApiClient();
        this.storage = new SecureStorage();
        this.rateLimiter = new Map();
    }

    async secureGeocode(locationName) {
        try {
            // Validate and sanitize input
            const sanitizedLocation = SecurityValidator.sanitizeText(locationName);
            if (!sanitizedLocation || sanitizedLocation.length < 2) {
                throw new Error('Invalid location name');
            }

            // Check cache first
            const cacheKey = `geo_${sanitizedLocation}`;
            const cached = this.storage.secureGet(cacheKey);
            if (cached) return cached;

            // Rate limiting
            if (this.isRateLimited(sanitizedLocation)) {
                throw new Error('Rate limit exceeded for geocoding requests');
            }

            // Use secure proxy endpoint
            const response = await this.apiClient.secureRequest('/api/geo/geocode', {
                method: 'POST',
                body: { location: sanitizedLocation }
            });

            const result = this.validateGeoResult(response);
            
            // Cache result securely
            this.storage.secureSet(cacheKey, result, { maxAge: 86400000 }); // 24 hours
            
            return result;
        } catch (error) {
            console.error('Secure geocoding failed:', error.message);
            throw error;
        }
    }

    validateGeoResult(result) {
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid geocoding response');
        }

        const { lat, lon, display_name } = result;
        
        // Validate coordinates
        const coordinates = SecurityValidator.validateCoordinates(lat, lon);
        
        return {
            lat: coordinates.lat,
            lon: coordinates.lon,
            display_name: SecurityValidator.sanitizeText(display_name || ''),
            timestamp: Date.now()
        };
    }

    isRateLimited(location) {
        const now = Date.now();
        const key = `geo_rate_${location}`;
        const lastRequest = this.rateLimiter.get(key) || 0;
        
        // Limit to 1 request per 5 seconds per location
        if (now - lastRequest < 5000) {
            return true;
        }
        
        this.rateLimiter.set(key, now);
        return false;
    }
}

// Export secure components
export {
    SecureNewsAggregator,
    SecureQueryExecutor,
    SecureGeoService,
    SecurityValidator,
    SecureStorage,
    SecureApiClient
};
