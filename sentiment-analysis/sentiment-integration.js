/**
 * =============================================================================
 * Sentiment Integration – Bharat Intelligence Engine
 * Drop this into bharat-intelligence-engine.html (or import in React)
 * =============================================================================
 *
 * Usage:
 *   // Single article
 *   const result = await SentimentIntegration.analyse('India-US defence deal signed');
 *   // → { score: 0.78, label: 'positive', confidence: 0.92, ... }
 *
 *   // Batch (news feed)
 *   const enriched = await SentimentIntegration.enrichFeed(newsArticles);
 *
 *   // Country-level aggregate
 *   const country = await SentimentIntegration.countryMood('India', headlines);
 * =============================================================================
 */

// ─── Config ────────────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
    // ⚠️ SECURITY: In production use a backend proxy.
    //   Set window.HF_TOKEN before loading, or call SentimentIntegration.setToken()
    token: (typeof window !== 'undefined' && window.HF_TOKEN) || 'hf_YOUR_TOKEN_HERE',

    // Which HF model to use by default
    // Options: 'geopolitical' | 'english' | 'multilingual' | 'financial' | 'indic'
    defaultModel: 'geopolitical',

    // Free-tier guard
    maxBatchSize: 8,
    concurrency: 2,

    // Scores below |threshold| are labelled neutral
    neutralThreshold: 0.10,
};

// ─── Colour / badge helpers used in the UI ────────────────────────────────────

function sentimentColor(score) {
    if (score > 0.1)  return '#00c853';   // green
    if (score < -0.1) return '#ff1744';   // red
    return '#ffd600';                      // yellow for neutral
}

function sentimentBadge(label) {
    const map = {
        positive: { icon: '▲', bg: 'rgba(0,200,83,0.15)',  border: '#00c853' },
        negative: { icon: '▼', bg: 'rgba(255,23,68,0.15)', border: '#ff1744' },
        neutral:  { icon: '●', bg: 'rgba(255,214,0,0.12)', border: '#ffd600' },
    };
    return map[label] || map.neutral;
}

/** Converts -1..1 score to a 0–100 confidence bar percentage */
function scoreToBar(score) {
    return Math.round(((score + 1) / 2) * 100);
}

// ─── Core integration object ──────────────────────────────────────────────────

const SentimentIntegration = (() => {
    // Re-uses the full module if loaded, else falls back silently
    const HFS = (typeof HuggingFaceSentiment !== 'undefined') ? HuggingFaceSentiment : null;

    if (HFS) HFS.setApiToken(SENTIMENT_CONFIG.token);

    // Minimal inline keyword fallback in case the full module isn't loaded
    function _localFallback(text) {
        const pos = ['peace','deal','growth','agreement','success','cooperation','development','boost'];
        const neg = ['war','attack','conflict','crisis','tension','sanction','threat','violence'];
        const lower = (text || '').toLowerCase();
        let s = 0;
        pos.forEach(w => { if (lower.includes(w)) s += 1; });
        neg.forEach(w => { if (lower.includes(w)) s -= 1; });
        const score = Math.max(-1, Math.min(1, s / 4));
        return {
            score: parseFloat(score.toFixed(4)),
            label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
            confidence: 0.4,
            source: 'local-fallback',
            text,
        };
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    return {
        /**
         * Analyse a single text.
         * @param {string} text
         * @param {string} [model] - HF model key
         * @returns {Promise<object>} result with .score, .label, .confidence
         */
        async analyse(text, model = SENTIMENT_CONFIG.defaultModel) {
            if (!HFS) return _localFallback(text);
            return HFS.analyseSentiment(text, { model });
        },

        /**
         * Enrich an array of news articles with .sentiment field.
         * @param {object[]} articles - each must have at least a .title
         * @returns {Promise<object[]>}
         */
        async enrichFeed(articles) {
            if (!HFS) {
                return articles.map(a => ({
                    ...a,
                    sentiment: _localFallback(a.title || a.description || ''),
                }));
            }
            return HFS.enrichNewsSentiment(articles);
        },

        /**
         * Aggregate sentiment for a country from a list of headlines.
         * @param {string} country  - Country name used for filtering
         * @param {string[]} headlines
         * @returns {Promise<object>} aggregate result
         */
        async countryMood(country, headlines) {
            const relevant = headlines.filter(h =>
                h && h.toLowerCase().includes(country.toLowerCase())
            );
            const texts = relevant.length > 0 ? relevant : headlines.slice(0, 10);

            const results = HFS
                ? await HFS.analyseBatch(texts, { model: SENTIMENT_CONFIG.defaultModel, batchSize: SENTIMENT_CONFIG.maxBatchSize })
                : texts.map(_localFallback);

            return HFS
                ? HFS.aggregateSentiment(results)
                : {
                    score: results.reduce((s, r) => s + r.score, 0) / results.length,
                    label: 'neutral',
                    distribution: { positive: 0, negative: 0, neutral: texts.length },
                    count: texts.length,
                };
        },

        /** Runtime token setter (call after user authenticates) */
        setToken(token) {
            SENTIMENT_CONFIG.token = token;
            if (HFS) HFS.setApiToken(token);
        },

        /** Get cache and rate-limit stats */
        stats() {
            return HFS ? HFS.getStats() : { cache: { size: 0 }, rateLimit: {} };
        },

        // Expose UI helpers
        sentimentColor,
        sentimentBadge,
        scoreToBar,
    };
})();

// ─── React hook wrapper (optional – paste inside a .jsx file) ─────────────────

/*
const { useState, useEffect, useCallback, useRef } = React;

function useSentiment(text, { model = 'geopolitical', enabled = true } = {}) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cache = useRef(new Map());

    const run = useCallback(async (inputText) => {
        if (!inputText || !enabled) return;

        const cacheKey = `${model}:${inputText.slice(0, 100)}`;
        if (cache.current.has(cacheKey)) {
            setResult(cache.current.get(cacheKey));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await SentimentIntegration.analyse(inputText, model);
            cache.current.set(cacheKey, res);
            setResult(res);
        } catch (err) {
            setError(err.message);
            setResult(SentimentIntegration.stats()); // fallback
        } finally {
            setLoading(false);
        }
    }, [model, enabled]);

    useEffect(() => { run(text); }, [text, run]);

    return { result, loading, error };
}

function useBatchSentiment(articles, { model = 'geopolitical' } = {}) {
    const [enriched, setEnriched] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!articles?.length) return;
        setLoading(true);
        SentimentIntegration.enrichFeed(articles)
            .then(setEnriched)
            .finally(() => setLoading(false));
    }, [articles]);

    return { enriched, loading };
}
*/

// ─── Plain-JS integration examples for bharat-intelligence-engine.html ────────

/*
// ── Example 1: Enrich the mock news feed ─────────────────────────────────────
async function enrichMockNews() {
    const enriched = await SentimentIntegration.enrichFeed(mockNews);
    enriched.forEach(article => {
        const s = article.sentiment;
        const badge = SentimentIntegration.sentimentBadge(s.label);
        console.log(`${badge.icon} [${s.score.toFixed(2)}] ${article.title}`);
    });
    return enriched;
}

// ── Example 2: Country mood board ────────────────────────────────────────────
async function buildMoodBoard() {
    const headlines = mockNews.map(n => n.title);
    const countries = ['India', 'China', 'Pakistan', 'USA'];

    const moods = await Promise.all(
        countries.map(async c => ({
            country: c,
            mood: await SentimentIntegration.countryMood(c, headlines),
        }))
    );

    moods.forEach(({ country, mood }) => {
        const bar = SentimentIntegration.scoreToBar(mood.score);
        console.log(`${country}: ${mood.label} (${mood.score}) [${bar}%]`);
    });
}

// ── Example 3: Real-time headline analysis ────────────────────────────────────
async function analyseHeadline(headline) {
    const result = await SentimentIntegration.analyse(headline, 'geopolitical');
    return {
        ...result,
        color: SentimentIntegration.sentimentColor(result.score),
        badge: SentimentIntegration.sentimentBadge(result.label),
        bar: SentimentIntegration.scoreToBar(result.score),
    };
}
*/

// Expose globally for use in bharat-intelligence-engine.html
if (typeof window !== 'undefined') {
    window.SentimentIntegration = SentimentIntegration;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SentimentIntegration;
}
