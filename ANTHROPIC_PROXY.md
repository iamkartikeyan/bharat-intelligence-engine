# Anthropic API Proxy - Solution for CORS Error

## Problem Explanation

The error occurs because:

```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'null' 
has been blocked by CORS policy: Response to preflight request doesn't pass 
access control check: No 'Access-Control-Allow-Origin' header is present
```

### Why This Happens:

1. **Browser Same-Origin Policy (SOP)**: Browsers block requests from one origin to another unless the target server explicitly allows it via CORS headers
2. **Anthropic API doesn't support CORS**: `api.anthropic.com` does NOT include CORS headers because:
   - API keys would be exposed in client-side code
   - It's designed for server-to-server communication, not browser-to-server
3. **Origin 'null'**: When you open an HTML file directly (`file:///path/to/file.html`), browsers treat the origin as `null`

## Solution Implemented

I've added a backend proxy to your existing `secure-backend/secure-api-server.js`:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   Browser       │ ──►  │  Your Backend   │ ──►  │  Anthropic API     │
│  (bharat.html)  │      │  (proxy)        │      │  (api.anthropic.com)│
└─────────────────┘      └──────────────────┘      └─────────────────────┘
       ✓ CORS OK              Server-side               No CORS needed
    (same origin)          (no browser limits)
```

### Changes Made:

1. **secure-backend/secure-api-server.js** - Added:
   - `/api/anthropic/chat` - Proxy endpoint for chat completions
   - `/api/anthropic/models` - Get available models
   - `AnthropicConfig` class to manage API key securely

2. **bharat-intelligence-engine.html** - Added:
   - `AnthropicClient` class that calls `/api/anthropic/chat` instead of direct API

## How to Run

### 1. Set Environment Variables

```bash
# In your terminal, set the Anthropic API key
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export ANTHROPIC_API_VERSION="2023-06-01"
```

### 2. Start the Backend Server

```bash
cd /Users/kartikeyansahani/hackathon28march/secure-backend
node secure-api-server.js
```

The server will start on port 3001 (or PORT environment variable).

### 3. Serve the Frontend

You need to serve the HTML file through a local server (not file://):

```bash
# Using Python
cd /Users/kartikeyansahani/hackathon28march
python3 -m http.server 3000

# OR using npx
npx serve -p 3000
```

### 4. Open in Browser

Navigate to: `http://localhost:3000/bharat-intelligence-engine.html`

## Usage

Now you can use Anthropic's Claude API through your proxy:

```javascript
// Example: Send a message
const response = await anthropicClient.sendMessage([
    { role: 'user', content: 'Hello, how are you?' }
]);

// Get available models
const models = await anthropicClient.getModels();
```

## Security Benefits

✅ API key is stored in environment variables, not in client code
✅ Server-side requests bypass CORS restrictions
✅ Rate limiting protects against abuse
✅ Input validation on all requests
✅ No API key exposure in browser

## Quick Test

Test the proxy directly:

```bash
curl -X POST http://localhost:3001/api/anthropic/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "claude-3-haiku-20240307"
  }'
```

You should get a response from Claude (if API key is set).

## Error: "Anthropic API key not configured"

If you see this error, make sure you've set the environment variable:

```bash
# Verify it's set (Linux/macOS)
echo $ANTHROPIC_API_KEY

# If not set, export it
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

