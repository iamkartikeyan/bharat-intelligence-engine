/**
 * =============================================================================
 * Hugging Face Sentiment Analysis Module
 * Bharat Intelligence Engine - Intelligence Dashboard
 * =============================================================================
 *
 * Models supported:
 *  - distilbert-base-uncased-finetuned-sst-2-english  (English, fast)
 *  - nlptown/bert-base-multilingual-uncased-sentiment (Multilingual, 1-5 stars)
 *  - cardiffnlp/twitter-roberta-base-sentiment-latest (Social/news text)
 *  - ai4bharat/indic-bert                             (Indian languages)
 *  - ProsusAI/finbert                                 (Financial/economic text)
 *  - yiyanghkust/finbert-tone                         (Geopolitical/finance tone)
 *
 * Free tier: ~30,000 tokens/month, ~30 req/min
 * =============================================================================
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const HF_CONFIG = {
    // Store your token in an environment variable – never hard-code it!
    // Backend: process.env.HF_API_TOKEN
    // Frontend (dev only): set window.HF_TOKEN before loading this script
    apiToken: (typeof process !== 'undefined' && process.env && process.env.HF_API_TOKEN)
        || (typeof window !== 'undefined' && window.HF_TOKEN)
        || 'hf_YOUR_TOKEN_HERE',          // ← Replace for quick testing only

    baseURL: 'https://api-inference.huggingface.co/models',

    models: {
        // Primary: English news & social text
        english: 'cardiffnlp/twitter-roberta-base-sentiment-latest',

        // Better for formal / geopolitical English
        geopolitical: 'yiyanghkust/finbert-tone',

        // Multilingual (supports Hindi, Bengali, Tamil, etc.)
        multilingual: 'nlptown/bert-base-multilingual-uncased-sentiment',

        // Economic & financial news
        financial: 'ProsusAI/finbert',

        // Lightweight fallback
        fast: 'distilbert-base-uncased-finetuned-sst-2-english',

        // Indian languages (Devanagari / Indic scripts)
        indic: 'ai4bharat/indic-bert',
    },

    // Request settings
    timeoutMs: 15_000,
    maxRetries: 3,
    retryDelayMs: 1_500,   // base delay; doubles on each retry
    modelWarmupMs: 20_000, // wait time after a 503 "model loading"
    rateWindowMs: 60_000,  // sliding window for local rate tracking
    maxReqPerWindow: 25,   // stay under the ~30 req/min free limit

    // Cache settings
    cacheMaxSize: 500,      // max number of cached results
    cacheTTLMs: 60 * 60 * 1_000, // 1 hour
};

// ─── In-memory LRU Cache ──────────────────────────────────────────────────────

class SentimentCache {
    constructor(maxSize = HF_CONFIG.cacheMaxSize, ttlMs = HF_CONFIG.cacheTTLMs) {
        this.store = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    /** Deterministic key: model + normalised text */
    _key(text, model) {
        return `${model}::${text.trim().toLowerCase().slice(0, 200)}`;
    }

    get(text, model) {
        const key = this._key(text, model);
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.ts > this.ttlMs) {
            this.store.delete(key);
            return null;
        }
        // LRU: move to end
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.value;
    }

    set(text, model, value) {
        const key = this._key(text, model);
        if (this.store.size >= this.maxSize) {
            // Evict oldest (first inserted)
            const firstKey = this.store.keys().next().value;
            this.store.delete(firstKey);
        }
        this.store.set(key, { value, ts: Date.now() });
    }

    stats() {
        return { size: this.store.size, maxSize: this.maxSize };
    }

    clear() {
        this.store.clear();
    }
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
    constructor(maxReq = HF_CONFIG.maxReqPerWindow, windowMs = HF_CONFIG.rateWindowMs) {
        this.maxReq = maxReq;
        this.windowMs = windowMs;
        this.timestamps = [];
    }

    /** Returns how many ms to wait (0 = proceed immediately) */
    check() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        if (this.timestamps.length >= this.maxReq) {
            const oldest = this.timestamps[0];
            return this.windowMs - (now - oldest) + 100; // +100ms buffer
        }
        return 0;
    }

    record() {
        this.timestamps.push(Date.now());
    }

    remaining() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        return this.maxReq - this.timestamps.length;
    }
}

// ─── Keyword-based Fallback ────────────────────────────────────────────────────

const GEOPOLITICAL_LEXICON = {
    positive: [
        'agreement', 'treaty', 'peace', 'cooperation', 'alliance', 'growth',
        'development', 'progress', 'success', 'deal', 'partnership', 'boost',
        'recovery', 'stability', 'resolution', 'breakthrough', 'reform',
        'prosperity', 'ceasefire', 'diplomatic', 'aid', 'relief', 'investment',
        'विकास', 'शांति', 'सहयोग', 'समझौता', 'प्रगति', // Hindi
    ],
    negative: [
        'war', 'conflict', 'attack', 'crisis', 'collapse', 'sanction', 'tension',
        'threat', 'violence', 'terrorism', 'coup', 'invasion', 'protest', 'riot',
        'shortage', 'recession', 'casualty', 'deaths', 'strike', 'blockade',
        'missile', 'nuclear', 'explosion', 'assassination', 'genocide',
        'युद्ध', 'संकट', 'हमला', 'हिंसा', 'आतंक', // Hindi
    ],
    intensifiers: ['major', 'severe', 'critical', 'significant', 'massive', 'unprecedented'],
    diminishers: ['minor', 'slight', 'limited', 'small', 'partial'],
};

function keywordSentiment(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);

    let score = 0;
    let posCount = 0;
    let negCount = 0;

    words.forEach((word, idx) => {
        const prevWord = idx > 0 ? words[idx - 1] : '';
        const isNegated = ['not', 'no', 'never', 'without', 'against'].includes(prevWord);
        const isIntensified = GEOPOLITICAL_LEXICON.intensifiers.includes(prevWord);
        const isDiminished = GEOPOLITICAL_LEXICON.diminishers.includes(prevWord);

        let multiplier = 1;
        if (isIntensified) multiplier = 1.5;
        if (isDiminished) multiplier = 0.5;

        if (GEOPOLITICAL_LEXICON.positive.some(kw => word.includes(kw))) {
            const delta = (isNegated ? -1 : 1) * multiplier;
            score += delta;
            posCount++;
        }
        if (GEOPOLITICAL_LEXICON.negative.some(kw => word.includes(kw))) {
            const delta = (isNegated ? 1 : -1) * multiplier;
            score += delta;
            negCount++;
        }
    });

    const total = posCount + negCount || 1;
    const normalised = Math.max(-1, Math.min(1, score / Math.sqrt(total)));

    return {
        score: parseFloat(normalised.toFixed(4)),
        label: normalised > 0.1 ? 'positive' : normalised < -0.1 ? 'negative' : 'neutral',
        confidence: Math.min(1, Math.abs(normalised) + 0.3),
        source: 'keyword-fallback',
        breakdown: { posCount, negCount, rawScore: score },
    };
}

// ─── Response Normaliser ──────────────────────────────────────────────────────

/**
 * Different HF models return different label formats.
 * This normalises all of them to { score: -1..1, label, confidence }.
 */
function normaliseHFResponse(rawResponse, modelKey) {
    // rawResponse is always an array of [{ label, score }, ...]
    const results = Array.isArray(rawResponse[0]) ? rawResponse[0] : rawResponse;

    // Map label strings → numeric
    const labelMap = {
        // distilbert / roberta
        'POSITIVE': 1, 'NEGATIVE': -1, 'NEUTRAL': 0,
        'positive': 1, 'negative': -1, 'neutral': 0,
        // finbert-tone
        'Positive': 1, 'Negative': -1, 'Neutral': 0,
        // nlptown 1-5 stars
        '1 star': -1, '2 stars': -0.5, '3 stars': 0, '4 stars': 0.5, '5 stars': 1,
        // cardiffnlp labels
        'LABEL_0': -1, 'LABEL_1': 0, 'LABEL_2': 1,
    };

    // Weighted sum across all classes
    let weightedScore = 0;
    let maxConfidence = 0;
    let topLabel = results[0]?.label;

    results.forEach(item => {
        const numericVal = labelMap[item.label] ?? 0;
        weightedScore += numericVal * item.score;
        if (item.score > maxConfidence) {
            maxConfidence = item.score;
            topLabel = item.label;
        }
    });

    // Normalise topLabel to our standard
    const normLabel =
        [1, 0.5].includes(labelMap[topLabel]) ? 'positive' :
        [-1, -0.5].includes(labelMap[topLabel]) ? 'negative' :
        'neutral';

    return {
        score: parseFloat(Math.max(-1, Math.min(1, weightedScore)).toFixed(4)),
        label: normLabel,
        confidence: parseFloat(maxConfidence.toFixed(4)),
        rawLabels: results,
        source: 'huggingface',
        model: modelKey,
    };
}

// ─── Core API Call ─────────────────────────────────────────────────────────────

const cache = new SentimentCache();
const rateLimiter = new RateLimiter();

async function callHFAPI(inputs, modelKey = 'english', retryCount = 0) {
    const modelName = HF_CONFIG.models[modelKey] || HF_CONFIG.models.english;
    const url = `${HF_CONFIG.baseURL}/${modelName}`;

    // ── Rate limiting ──────────────────────────────────────────────────────────
    const waitMs = rateLimiter.check();
    if (waitMs > 0) {
        console.warn(`[HF] Rate limit: waiting ${waitMs}ms (${rateLimiter.remaining()} req remaining)`);
        await sleep(waitMs);
    }

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HF_CONFIG.timeoutMs);

    try {
        rateLimiter.record();

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_CONFIG.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs,
                options: { wait_for_model: true, use_cache: true },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // ── 503: Model warming up ──────────────────────────────────────────────
        if (res.status === 503) {
            const body = await res.json().catch(() => ({}));
            const estimatedTime = (body.estimated_time || 20) * 1000;
            console.warn(`[HF] Model warming up. Waiting ${Math.round(estimatedTime / 1000)}s…`);
            if (retryCount < HF_CONFIG.maxRetries) {
                await sleep(Math.min(estimatedTime, HF_CONFIG.modelWarmupMs));
                return callHFAPI(inputs, modelKey, retryCount + 1);
            }
            throw new HFError('MODEL_LOADING', 'Model is still loading after maximum retries', 503);
        }

        // ── 429: Rate limited by HF ────────────────────────────────────────────
        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000;
            console.warn(`[HF] Rate limited by server. Retry after ${retryAfter / 1000}s`);
            if (retryCount < HF_CONFIG.maxRetries) {
                await sleep(retryAfter);
                return callHFAPI(inputs, modelKey, retryCount + 1);
            }
            throw new HFError('RATE_LIMIT', 'Rate limited – all retries exhausted', 429);
        }

        // ── Other HTTP errors ──────────────────────────────────────────────────
        if (!res.ok) {
            const errText = await res.text().catch(() => 'unknown error');
            if (retryCount < HF_CONFIG.maxRetries) {
                const delay = HF_CONFIG.retryDelayMs * Math.pow(2, retryCount);
                console.warn(`[HF] HTTP ${res.status}. Retrying in ${delay}ms…`);
                await sleep(delay);
                return callHFAPI(inputs, modelKey, retryCount + 1);
            }
            throw new HFError('HTTP_ERROR', `HTTP ${res.status}: ${errText}`, res.status);
        }

        // ── Parse & validate ───────────────────────────────────────────────────
        const data = await res.json();

        if (!Array.isArray(data)) {
            throw new HFError('INVALID_RESPONSE', 'Unexpected response shape from HF API');
        }

        return data;

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            if (retryCount < HF_CONFIG.maxRetries) {
                console.warn(`[HF] Timeout on attempt ${retryCount + 1}. Retrying…`);
                return callHFAPI(inputs, modelKey, retryCount + 1);
            }
            throw new HFError('TIMEOUT', `Request timed out after ${HF_CONFIG.timeoutMs}ms`);
        }

        if (err instanceof HFError) throw err;

        throw new HFError('NETWORK_ERROR', err.message);
    }
}

// ─── Custom Error Class ───────────────────────────────────────────────────────

class HFError extends Error {
    constructor(code, message, statusCode = 0) {
        super(message);
        this.name = 'HFError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

// ─── Public: Single Text Analysis ─────────────────────────────────────────────

/**
 * Analyse sentiment of a single text.
 *
 * @param {string} text          - Text to analyse (headline or snippet)
 * @param {object} [opts]
 * @param {string} [opts.model]  - Model key from HF_CONFIG.models
 * @param {boolean} [opts.forceFresh] - Bypass cache
 * @returns {Promise<SentimentResult>}
 */
async function analyseSentiment(text, { model = 'english', forceFresh = false } = {}) {
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
        return { ...keywordSentiment(text || ''), text };
    }

    const truncated = text.trim().slice(0, 512); // HF token limit

    // ── Cache hit ──────────────────────────────────────────────────────────────
    if (!forceFresh) {
        const cached = cache.get(truncated, model);
        if (cached) return { ...cached, text, fromCache: true };
    }

    try {
        const raw = await callHFAPI(truncated, model);
        const result = { ...normaliseHFResponse(raw, model), text };
        cache.set(truncated, model, result);
        return result;
    } catch (err) {
        console.error(`[HF] API failed (${err.code}): ${err.message}. Using keyword fallback.`);
        return { ...keywordSentiment(truncated), text, apiError: err.code };
    }
}

// ─── Public: Batch Processing ─────────────────────────────────────────────────

/**
 * Analyse multiple texts efficiently.
 * - Checks cache first; only calls API for misses.
 * - Groups API calls into batches respecting rate limits.
 * - Falls back per-item to keyword analysis on failure.
 *
 * @param {string[]} texts        - Array of texts (headlines / snippets)
 * @param {object}   [opts]
 * @param {string}   [opts.model] - Model key
 * @param {number}   [opts.batchSize] - How many texts per API call (default 8)
 * @param {number}   [opts.concurrency] - Concurrent batches (default 2)
 * @returns {Promise<SentimentResult[]>}
 */
async function analyseBatch(texts, { model = 'english', batchSize = 8, concurrency = 2 } = {}) {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    const results = new Array(texts.length);
    const misses = []; // { index, text }

    // ── 1. Serve from cache where possible ────────────────────────────────────
    texts.forEach((text, i) => {
        if (!text || text.trim().length < 3) {
            results[i] = { ...keywordSentiment(text || ''), text };
            return;
        }
        const truncated = text.trim().slice(0, 512);
        const cached = cache.get(truncated, model);
        if (cached) {
            results[i] = { ...cached, text, fromCache: true };
        } else {
            misses.push({ index: i, text: truncated });
        }
    });

    if (misses.length === 0) return results;

    // ── 2. Chunk into batches ─────────────────────────────────────────────────
    const batches = [];
    for (let i = 0; i < misses.length; i += batchSize) {
        batches.push(misses.slice(i, i + batchSize));
    }

    // ── 3. Process batches with limited concurrency ────────────────────────────
    for (let i = 0; i < batches.length; i += concurrency) {
        const chunk = batches.slice(i, i + concurrency);

        await Promise.all(
            chunk.map(async (batch) => {
                const batchTexts = batch.map(item => item.text);

                try {
                    const raw = await callHFAPI(batchTexts, model);

                    // HF returns one result per input in a nested array
                    batch.forEach((item, j) => {
                        const rawItem = Array.isArray(raw[j]) ? raw[j] : raw;
                        const result = { ...normaliseHFResponse(rawItem, model), text: item.text };
                        cache.set(item.text, model, result);
                        results[item.index] = result;
                    });

                } catch (err) {
                    console.error(`[HF] Batch failed (${err.code}). Falling back per-item.`);
                    batch.forEach(item => {
                        results[item.index] = { ...keywordSentiment(item.text), text: item.text, apiError: err.code };
                    });
                }
            })
        );

        // Small inter-chunk pause to respect rate limits
        if (i + concurrency < batches.length) await sleep(300);
    }

    return results;
}

// ─── Public: News Article Enrichment ─────────────────────────────────────────

/**
 * Enriches an array of news articles with sentiment data.
 * Selects model automatically based on detected language.
 *
 * @param {Array<{title: string, description?: string, [key: string]: any}>} articles
 * @returns {Promise<Array>} - Articles with { sentiment: SentimentResult } added
 */
async function enrichNewsSentiment(articles) {
    if (!Array.isArray(articles) || articles.length === 0) return [];

    // Build input texts: title + first 100 chars of description
    const texts = articles.map(a => {
        const base = a.title || '';
        const desc = a.description ? ` ${a.description.slice(0, 100)}` : '';
        return (base + desc).trim();
    });

    // Detect whether we need multilingual support
    const hasIndicText = texts.some(t => /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]/.test(t));
    const model = hasIndicText ? 'multilingual' : 'geopolitical';

    const sentiments = await analyseBatch(texts, { model, batchSize: 8 });

    return articles.map((article, i) => ({
        ...article,
        sentiment: sentiments[i] || keywordSentiment(texts[i]),
    }));
}

// ─── Public: Aggregate Sentiment Score ────────────────────────────────────────

/**
 * Computes an aggregate sentiment for a collection of results.
 * Weights high-confidence scores more heavily.
 *
 * @param {SentimentResult[]} results
 * @returns {{ score: number, label: string, distribution: object, count: number }}
 */
function aggregateSentiment(results) {
    if (!results.length) return { score: 0, label: 'neutral', distribution: {}, count: 0 };

    let weightedSum = 0;
    let totalWeight = 0;
    const dist = { positive: 0, negative: 0, neutral: 0 };

    results.forEach(r => {
        const w = r.confidence || 0.5;
        weightedSum += (r.score || 0) * w;
        totalWeight += w;
        dist[r.label || 'neutral'] = (dist[r.label || 'neutral'] || 0) + 1;
    });

    const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const label = avg > 0.1 ? 'positive' : avg < -0.1 ? 'negative' : 'neutral';

    return {
        score: parseFloat(avg.toFixed(4)),
        label,
        distribution: dist,
        count: results.length,
        dominantEmotion: Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0],
    };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Returns current cache and rate-limiter stats */
function getStats() {
    return {
        cache: cache.stats(),
        rateLimit: {
            remaining: rateLimiter.remaining(),
            windowMs: HF_CONFIG.rateWindowMs,
        },
    };
}

/** Set / rotate the API token at runtime (e.g. after user login) */
function setApiToken(token) {
    if (!token || typeof token !== 'string') throw new Error('Invalid token');
    HF_CONFIG.apiToken = token;
}

// ─── Export ────────────────────────────────────────────────────────────────────

const HuggingFaceSentiment = {
    // Core functions
    analyseSentiment,
    analyseBatch,
    enrichNewsSentiment,
    aggregateSentiment,

    // Utilities
    keywordSentiment,   // also usable standalone
    getStats,
    setApiToken,
    clearCache: () => cache.clear(),

    // Config reference
    MODELS: HF_CONFIG.models,
};

// ── Browser global + Node module export ───────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HuggingFaceSentiment;
} else if (typeof window !== 'undefined') {
    window.HuggingFaceSentiment = HuggingFaceSentiment;
}
