# 🤗 Hugging Face Sentiment Analysis — Complete Guide

## Models Recommended for Bharat Intelligence Engine

| Model Key | HF Model ID | Best For | Accuracy | Speed |
|-----------|-------------|----------|----------|-------|
| `geopolitical` | `yiyanghkust/finbert-tone` | Formal news, policy, diplomatic text | ★★★★★ | Medium |
| `english` | `cardiffnlp/twitter-roberta-base-sentiment-latest` | News headlines, social media | ★★★★☆ | Fast |
| `multilingual` | `nlptown/bert-base-multilingual-uncased-sentiment` | Hindi, Bengali, Tamil, Urdu + 100 langs | ★★★★☆ | Medium |
| `financial` | `ProsusAI/finbert` | GDP, trade, economic indicators | ★★★★★ | Medium |
| `indic` | `ai4bharat/indic-bert` | Devanagari / Indic scripts | ★★★☆☆ | Slow* |
| `fast` | `distilbert-base-uncased-finetuned-sst-2-english` | Quick fallback, high-volume | ★★★☆☆ | Very fast |

> \* `indic-bert` is not fine-tuned for sentiment natively — use `multilingual` as the practical Indic alternative.

---

## 🆓 Free Tier Limits & Handling

| Limit | Value | Our Handling |
|-------|-------|-------------|
| Requests per minute | ~30 | `RateLimiter` class holds at 25/min |
| Monthly tokens | ~30,000 | Caching avoids duplicate calls |
| Max input tokens | 512 | All inputs auto-truncated to 512 chars |
| Model cold-start | 503 + `estimated_time` | Auto-retries after `estimated_time` seconds |
| Rate-limit header | 429 + `Retry-After` | Reads header and waits exactly that long |

**Cost estimate for your dashboard:**
- 100 articles/hour × 24h = 2,400 req/day → well within free tier
- Enable caching (TTL = 1h) to cut this ~60–70%

---

## 🚀 Quick Start

### Step 1 — Get a free HF token

1. Sign up at <https://huggingface.co>
2. Go to **Settings → Access Tokens → New token** (role: *read*)
3. Copy the token (starts with `hf_…`)

### Step 2 — Load the scripts

Add these two script tags to `bharat-intelligence-engine.html` **before** the React Babel script:

```html
<!-- Load the HF sentiment module BEFORE the React script -->
<script src="sentiment-analysis/huggingface-sentiment.js"></script>
<script src="sentiment-analysis/sentiment-integration.js"></script>

<!-- Set your token (replace at runtime; use backend proxy in production) -->
<script>
    window.HF_TOKEN = 'hf_YOUR_TOKEN_HERE'; // ← replace this
</script>
```

### Step 3 — Use in your dashboard

```javascript
// Single headline
const result = await SentimentIntegration.analyse(
    'India-US sign landmark defence cooperation agreement'
);
// → { score: 0.82, label: 'positive', confidence: 0.94, source: 'huggingface' }

// Enrich entire news feed (batch, cached)
const enrichedNews = await SentimentIntegration.enrichFeed(mockNews);

// Country mood aggregate
const indiaMood = await SentimentIntegration.countryMood('India', headlines);
// → { score: 0.31, label: 'positive', distribution: { positive:8, neutral:3, negative:1 }, count: 12 }
```

---

## 📐 Output Format

Every function returns an object of this shape:

```js
{
    score: 0.74,          // Float -1.0 (very negative) to +1.0 (very positive)
    label: 'positive',    // 'positive' | 'negative' | 'neutral'
    confidence: 0.91,     // 0.0 – 1.0; how sure the model is
    source: 'huggingface',// 'huggingface' | 'keyword-fallback' | 'local-fallback'
    model: 'geopolitical',// which model key was used
    text: '...',          // original input text
    fromCache: true,      // present when result came from cache
    apiError: 'TIMEOUT',  // present only when fallback was triggered
    rawLabels: [...]      // raw HF probability array (advanced use)
}
```

---

## ⚠️ Error Codes & What They Mean

| Code | Trigger | Action taken |
|------|---------|--------------|
| `MODEL_LOADING` | HTTP 503 | Wait `estimated_time` seconds, retry up to 3× |
| `RATE_LIMIT` | HTTP 429 | Wait `Retry-After` seconds, retry up to 3× |
| `TIMEOUT` | No response in 15s | Retry up to 3× with exponential back-off |
| `HTTP_ERROR` | Any other 4xx/5xx | Exponential back-off retry, then fallback |
| `INVALID_RESPONSE` | Non-array JSON | Immediate fallback to keyword analysis |
| `NETWORK_ERROR` | `fetch` throws | Immediate fallback to keyword analysis |

On any unrecoverable error the module silently falls back to the keyword-based analyser, so **the UI never breaks**.

---

## 🔄 Caching Strategy

```
Request → Normalise text → Hash(model + text[:200]) → Cache hit? → Return cached result
                                                    ↓ miss
                                              Rate limiter check
                                                    ↓
                                              HF API call
                                                    ↓
                                         Normalise response → Store in LRU cache
```

- **LRU eviction**: oldest entry removed when cache exceeds 500 items
- **TTL**: entries expire after 1 hour (configurable via `HF_CONFIG.cacheTTLMs`)
- **Cache bypass**: pass `{ forceFresh: true }` to `analyseSentiment()`
- **Stats**: `SentimentIntegration.stats()` shows current cache size and remaining rate budget

---

## 🌍 Indian Language Support

### Practical approach

```javascript
// Auto-detects Devanagari / Bengali / Tamil scripts
const hasIndic = /[\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF]/.test(text);
const model = hasIndic ? 'multilingual' : 'geopolitical';

const result = await SentimentIntegration.analyse(text, model);
```

### `enrichNewsSentiment()` does this automatically

The `enrichNewsSentiment()` function already checks all article texts for Indic Unicode ranges and switches to the `multilingual` model when detected.

### Supported Indic languages via `nlptown/bert-base-multilingual-uncased-sentiment`

Hindi, Bengali, Punjabi, Gujarati, Marathi, Urdu, Tamil (romanised), Telugu (romanised) — works best with Latin transliterations for South Indian languages.

---

## 🎯 Best Models for Geopolitical Text

### 1. `yiyanghkust/finbert-tone` ← **Recommended default**
- Trained on financial news and analyst reports → formal, factual text
- Labels: `Positive` / `Negative` / `Neutral`
- Works well for policy statements, diplomatic announcements, economic data

### 2. `cardiffnlp/twitter-roberta-base-sentiment-latest`
- Best for news headlines (trained on ~58M tweets + news)
- Handles colloquial tone, abbreviations, hashtags
- Labels: `positive` / `negative` / `neutral` with probabilities

### 3. `ProsusAI/finbert`
- Pure financial sentiment (earnings reports, market news)
- Use this for the **Economics Dashboard** section

### 4. Emerging option: `Vranda_K/geopolitical-sentiment-analysis`
- Community fine-tune specifically on geopolitical text
- Lower confidence scores — validate before production use

---

## 🔬 How to Fine-Tune on Your Own Data Later

### Step 1 — Prepare your dataset

```python
# dataset.jsonl  (one JSON object per line)
{"text": "India signs IMEC corridor agreement", "label": "positive"}
{"text": "Border skirmish reported near LAC",   "label": "negative"}
{"text": "RBI keeps repo rate unchanged",        "label": "neutral"}
```

### Step 2 — Fine-tune with the HF Trainer API

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset

MODEL = "yiyanghkust/finbert-tone"   # start from this checkpoint

tokenizer = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForSequenceClassification.from_pretrained(MODEL, num_labels=3)

dataset = load_dataset("json", data_files="dataset.jsonl", split="train")

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

dataset = dataset.map(tokenize, batched=True)

label_map = {"positive": 0, "negative": 1, "neutral": 2}
dataset = dataset.map(lambda x: {"labels": label_map[x["label"]]})

args = TrainingArguments(
    output_dir="./geopolitical-sentiment-v1",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    push_to_hub=True,           # uploads to your HF profile
    hub_model_id="your-name/geopolitical-sentiment-v1",
)

trainer = Trainer(model=model, args=args, train_dataset=dataset)
trainer.train()
trainer.push_to_hub()
```

### Step 3 — Use your fine-tuned model

```javascript
// Add to HF_CONFIG.models in huggingface-sentiment.js
models: {
    ...existing models,
    custom: 'your-huggingface-username/geopolitical-sentiment-v1',
}

// Then use it
const result = await SentimentIntegration.analyse(headline, 'custom');
```

> **Minimum training data**: ~500 labelled examples per class (1,500 total) gives meaningful improvement over the base model.

---

## 🔒 Security Notes

| Issue | Risk | Fix |
|-------|------|-----|
| `window.HF_TOKEN` exposure | Token visible in DevTools | Use backend proxy (see below) |
| Direct API calls from browser | Token in network tab | Route through `secure-api-server.js` |
| Storing token in localStorage | Persists across sessions | Never store tokens client-side |

### Backend proxy call (recommended for production)

```javascript
// In secure-api-server.js — add this route
app.post('/api/sentiment', limiter, validateInput, async (req, res) => {
    const { texts, model = 'geopolitical' } = req.body;
    const modelName = ALLOWED_MODELS[model];          // whitelist
    if (!modelName) return res.status(400).json({ error: 'Invalid model' });

    const hfRes = await fetch(
        `https://api-inference.huggingface.co/models/${modelName}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HF_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: texts }),
        }
    );
    const data = await hfRes.json();
    res.json(data);
});

// Frontend then calls your proxy, not HF directly
// Update HF_CONFIG.baseURL = 'http://localhost:3001/api/sentiment'
```

---

## 📊 Integration into the Existing Dashboard

### Patch `NewsFeed` component

In `bharat-intelligence-engine.html`, find the `loadNews` function inside `NewsFeed` and add:

```javascript
const loadNews = async () => {
    setLoading(true);
    try {
        let articles = await newsAggregator.fetchAllNews();

        // ✨ Add HF sentiment enrichment
        if (typeof SentimentIntegration !== 'undefined') {
            articles = await SentimentIntegration.enrichFeed(articles);
        }

        setNews(articles);
    } catch (err) {
        setError(err.message);
        setNews(mockNews);
    } finally {
        setLoading(false);
    }
};
```

### Sentiment badge component (Babel/React inline)

```jsx
const SentimentBadge = ({ sentiment }) => {
    if (!sentiment) return null;
    const { score, label, confidence } = sentiment;
    const badge = SentimentIntegration.sentimentBadge(label);
    const color = SentimentIntegration.sentimentColor(score);

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '12px',
            background: badge.bg, border: `1px solid ${badge.border}`,
            fontSize: '11px', fontWeight: 600, color,
        }}>
            {badge.icon} {label.toUpperCase()}
            <span style={{ opacity: 0.7, fontSize: '10px' }}>
                {Math.round(confidence * 100)}%
            </span>
        </span>
    );
};
```

### Country mood board in Globe component

```javascript
// In the Globe useEffect, after markers are placed:
async function addMoodLayer(countryData) {
    const headlines = (await newsAggregator.fetchAllNews()).map(a => a.title);

    for (const country of countryData) {
        const mood = await SentimentIntegration.countryMood(country.name, headlines);
        const glowColor = SentimentIntegration.sentimentColor(mood.score);
        // Apply glowColor to the country's Three.js mesh material
        country.mesh.material.emissive.setStyle(glowColor);
        country.mesh.material.emissiveIntensity = Math.abs(mood.score) * 0.5;
    }
}
```
