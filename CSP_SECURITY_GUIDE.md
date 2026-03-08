# 🛡️ Content Security Policy & Production Security Guide

## 🎯 Executive Summary

This guide provides comprehensive Content Security Policy (CSP) recommendations and production security practices for the Bharat Intelligence Engine dashboard, ensuring protection against XSS, injection attacks, and data breaches.

## 🔒 Content Security Policy Configuration

### Recommended CSP Header

```http
Content-Security-Policy: 
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: http:;
    connect-src 'self' https://newsapi.org https://api.worldbank.org wss: ws:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
```

### Production-Ready CSP (Stricter)

```http
Content-Security-Policy: 
    default-src 'self';
    script-src 'self' 'sha256-[HASH_OF_INLINE_SCRIPTS]';
    style-src 'self' 'sha256-[HASH_OF_INLINE_STYLES]';
    font-src 'self';
    img-src 'self' data: https:;
    connect-src 'self' https://your-backend-api.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    block-all-mixed-content;
```

## 🚀 Implementation Methods

### 1. Express.js Server Implementation

```javascript
// In your secure-api-server.js
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
    `);
    next();
});
```

### 2. HTML Meta Tag (Development Only)

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    connect-src 'self' https://newsapi.org https://api.worldbank.org;
    img-src 'self' data: https:;
">
```

## 🔧 Security Headers Package

Create a comprehensive security headers configuration:

```javascript
// security-headers.js
const securityHeaders = {
    'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
        block-all-mixed-content;
    `,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
};

module.exports = securityHeaders;
```

## ⚠️ CSP Directive Explanations

### Critical Directives

| Directive | Purpose | Recommendation |
|-----------|---------|----------------|
| `default-src 'self'` | Fallback for all resource types | Always include |
| `script-src` | JavaScript execution policy | Use hashes in production |
| `style-src` | CSS loading policy | Avoid 'unsafe-inline' in production |
| `connect-src` | AJAX/WebSocket connections | Whitelist specific APIs only |
| `object-src 'none'` | Disable plugins (Flash, etc.) | Always include |
| `base-uri 'self'` | Prevent base tag hijacking | Always include |

### Resource-Specific Directives

```http
# For Three.js and D3.js libraries
script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com;

# For Google Fonts
font-src 'self' https://fonts.gstatic.com;
style-src 'self' https://fonts.googleapis.com;

# For API connections (replace with your backend)
connect-src 'self' https://your-api-server.com;

# For images from various sources
img-src 'self' data: https:;
```

## 🎨 Inline Script & Style Handling

### 1. Move Inline Scripts to External Files

```javascript
// dashboard-init.js
document.addEventListener('DOMContentLoaded', function() {
    const dashboard = new IntelligenceDashboard();
    dashboard.initialize();
});
```

### 2. Use Nonce for Dynamic Scripts

```html
<!-- Server-generated nonce -->
<script nonce="random-nonce-value">
    // Dynamic script content
</script>
```

### 3. Calculate SHA256 Hashes

```bash
# Calculate hash for inline scripts
echo -n "your-inline-script-content" | openssl dgst -sha256 -binary | openssl base64
```

## 🛠️ CSP Testing & Monitoring

### 1. Report-Only Mode

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### 2. CSP Violation Reporting

```javascript
// Add to your server
app.post('/csp-report', express.json(), (req, res) => {
    console.log('CSP Violation:', req.body);
    // Log to monitoring service
    res.status(204).send();
});
```

### 3. Browser Console Monitoring

```javascript
// Check for CSP violations in browser console
window.addEventListener('securitypolicyviolation', function(event) {
    console.error('CSP Violation:', {
        directive: event.violatedDirective,
        blocked: event.blockedURI,
        line: event.lineNumber,
        source: event.sourceFile
    });
});
```

## 🏭 Production Deployment Checklist

### ✅ Before Going Live

- [ ] Remove all `'unsafe-inline'` and `'unsafe-eval'`
- [ ] Use specific hashes for inline scripts
- [ ] Whitelist only necessary external domains
- [ ] Enable CSP reporting endpoint
- [ ] Test with CSP report-only mode first
- [ ] Configure HTTPS-only connections
- [ ] Set up monitoring for CSP violations
- [ ] Regular security header audits

### 📊 Security Monitoring

```javascript
// CSP monitoring dashboard
const cspMetrics = {
    violations: 0,
    blockedScripts: 0,
    blockedStyles: 0,
    reportTime: Date.now()
};

// Track violations
window.addEventListener('securitypolicyviolation', (event) => {
    cspMetrics.violations++;
    if (event.violatedDirective === 'script-src') cspMetrics.blockedScripts++;
    if (event.violatedDirective === 'style-src') cspMetrics.blockedStyles++;
    
    // Send to analytics
    sendSecurityMetrics(cspMetrics);
});
```

## 🔍 Browser Compatibility

| Browser | CSP Support | Notes |
|---------|-------------|-------|
| Chrome 25+ | Full | Best support |
| Firefox 23+ | Full | Good support |
| Safari 7+ | Partial | Some limitations |
| IE 10+ | Partial | Limited support |
| Edge 12+ | Full | Modern support |

## 🚨 Common CSP Issues & Solutions

### Issue 1: Three.js/D3.js Loading Failures

```http
# Solution: Whitelist CDNs
script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com;
```

### Issue 2: Inline Event Handlers

```javascript
// ❌ Bad: Inline handlers
<button onclick="handleClick()">

// ✅ Good: Event listeners
document.getElementById('button').addEventListener('click', handleClick);
```

### Issue 3: eval() Usage in Libraries

```http
# If libraries require eval (avoid if possible)
script-src 'self' 'unsafe-eval';

# Better: Use libraries that don't require eval
script-src 'self';
```

## 🎯 Next Steps

1. **Implement CSP Headers**: Add to your Express.js server
2. **Test in Development**: Use browser dev tools to monitor violations
3. **Gradual Tightening**: Start permissive, gradually restrict
4. **Monitor Production**: Set up violation reporting and monitoring
5. **Regular Audits**: Review and update CSP policies regularly

---

**📝 Note**: This CSP configuration balances security with the functionality requirements of the Intelligence Dashboard. Adjust based on your specific needs and gradually tighten restrictions as you move toward production.
