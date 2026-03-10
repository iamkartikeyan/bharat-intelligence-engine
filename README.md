# 🇮🇳 Bharat Intelligence Engine

> **A cinematic-grade, real-time geopolitical intelligence dashboard built for India's strategic analysts, researchers, and policy enthusiasts.**

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Tech](https://img.shields.io/badge/stack-React%20%7C%20D3.js%20%7C%20Three.js%20%7C%20Leaflet-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 🚀 Live Demo

Open `hack.html` directly in any modern browser — **no build step, no server needed.**

```bash
# Option 1: Just open the file
open hack.html

# Option 2: Serve locally
python3 -m http.server 8765
# Then visit http://localhost:8765/hack.html
```

---

## 🎯 What Is This?

Bharat Intelligence Engine is a **single-file intelligence platform** that visualizes India's geopolitical, economic, military, and technological position on the world stage. Think of it as a cinematic command center — dark UI, live data, interactive 3D globe, and AI-powered insights — all in one `hack.html` file.

---

## 🧭 Modules

| Module | Icon | Description |
|---|---|---|
| **Dashboard** | 🌐 | Main overview — live news ticker, alerts, cross-domain insights, intelligence stream |
| **Intelligence Graph** | 🔗 | D3.js force-directed graph — 35+ nodes across Geo, Econ, Defense, Tech, Climate, Society |
| **Knowledge Graph** | 🕸️ | Entity relationship web — countries, orgs, events, indicators |
| **Geopolitics** | 🏴 | Tactical map (Leaflet) — conflict zones, military bases, trade routes, alliance web |
| **Economics** | 📊 | India's economic indicators, trade flows, GDP charts |
| **Defense Intel** | 🛡️ | Military assets, defense budget, active conflict tracker |
| **Technology** | 💻 | ISRO, AI Mission, semiconductor, 5G, cyber threats |
| **Climate** | 🌱 | Himalayan glaciers, monsoon patterns, solar mission, water security |
| **Society** | 👥 | Demographics, NEP education, diaspora, healthcare |
| **AI Suite** | 🤖 | AI-powered briefings and scenario analysis |
| **Geo Compare** | ⚖️ | **35-metric comparison of 15 nations** — bars, radar, trend charts (2015–2024) |
| **Achievements** | 🏆 | Gamification — unlock intel badges by exploring modules |
| **Settings** | ⚙️ | API keys, theme, preferences |

---

## ⚖️ Geo Compare — Highlight Feature

The **Geopolitical Intelligence Comparison Matrix** lets you compare up to 6 nations across **35 metrics in 7 categories**:

- 🏦 **Economic Power** — GDP, Growth Rate, Per Capita, Inflation, Unemployment, Foreign Reserves
- 📦 **Trade & Investment** — Exports, FDI Inflows, Trade Balance, Remittances, Ease of Business
- 🛡️ **Military & Defense** — Spending, Nuclear Warheads, Active Troops, Global Firepower Index
- ⚡ **Energy & Resources** — Production, Renewables %, Oil Production, Energy Security Score
- 👤 **Society & Human Capital** — HDI, Population, Life Expectancy, Literacy Rate, Internet Users
- 💡 **Technology & Innovation** — R&D Spending, Patent Applications, Startup Ecosystem
- 🌍 **Geopolitical Influence** — UN Voting Alignment, Diplomatic Missions, Soft Power Index

**15 Nations:** India · USA · China · Russia · Japan · Germany · UK · France · Brazil · South Korea · Australia · Pakistan · Bangladesh · Saudi Arabia · Israel

**Visualizations:** Animated bar charts · Radar chart · Trend lines with time slider (2015–2024 + Play mode)

**Presets:** G20 · QUAD · BRICS · Neighbors · Rivals

---

## 🌐 3D Globe

Powered by **Three.js** — interactive rotating Earth with:
- Country risk heatmap layers (Risk / GDP / Military / Trade / Cyber)
- Click any country for a popup with diplomatic relationship, risk level, and live events
- India-centric mode
- Orbital arcs showing strategic connections

---

## 🗺️ Tactical Map

Powered by **Leaflet.js** with multi-layer intelligence overlays:
- Conflict zones · Military bases · Trade routes · Weather · Heatmap
- 7 tabs: Tactical Map · Conflict Sim · Alliance Web · Risk Meter · Maritime · Intel Feed · Timeline

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (via Babel standalone — no build) |
| Graph Viz | D3.js v7 force simulation |
| 3D Globe | Three.js |
| Maps | Leaflet.js |
| Fonts | Space Grotesk · JetBrains Mono · Rajdhani · Inter |
| Data | World Bank · IMF · SIPRI · UNDP · Global Firepower (2015–2024) |

---

## 🔑 API Keys (Optional)

The dashboard works fully offline with built-in static data. For live news feeds, add your keys in the `<script>` section at the top of `hack.html`:

```javascript
window.GNEWS_API_KEY     = 'YOUR_GNEWS_API_KEY';
window.CURRENTS_API_KEY  = 'YOUR_CURRENTS_API_KEY';
window.NEWS_API_KEY      = 'YOUR_NEWS_API_KEY';
window.HF_TOKEN          = 'YOUR_HF_TOKEN';
window.GEMINI_API_KEY    = 'YOUR_GEMINI_API_KEY';
```

---

## 📁 Project Structure

```
hackathon28march/
├── hack.html                  # 🔥 The entire app — one file
├── README.md
├── optimized-components/      # Modular React component experiments
├── secure-backend/            # Express API server (optional)
├── secure-components/         # Secure dashboard variants
└── sentiment-analysis/        # HuggingFace sentiment pipeline
```

---

## 🏆 Built For

**Hackathon** — India's strategic intelligence visualized as a cinematic command center.  
Designed to make India's geopolitical position undeniable, beautiful, and interactive.

---

## 📜 License

MIT — Free to use, modify, and deploy.

---

<div align="center">
  <strong>🇮🇳 Jai Hind · Built with intelligence, for intelligence</strong>
</div>
