# FactCanvas

**Turn any topic into a stunning factual infographic.**

FactCanvas is an AI-powered web app that transforms a user-provided topic into a beautiful, source-backed infographic with key stats, fact sections, timelines, comparisons, charts, and citations — all in seconds.

---

## Features

- **AI-Powered Research** — Uses Gemini AI to synthesize factual, structured content
- **Schema-Based Rendering** — Strict JSON schema ensures reliable, beautiful output
- **Premium UI** — Two themes: Editorial Light and Midnight Data
- **Source Citations** — Every fact section includes traceable source references
- **Confidence Score** — Transparent reliability indicator for generated content
- **PNG Export** — High-resolution 2x PNG export for presentations and social sharing
- **Demo Mode** — Runs with rich mock data if no API key is configured

---

## Quick Start (Replit)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run

```bash
npm run dev
```

This starts:
- **Express backend** on `http://localhost:3001`
- **Vite dev server** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For live AI | Your Google AI Studio key |
| `AI_PROVIDER` | No | AI provider (defaults to `gemini`) |
| `PORT` | No | Server port (defaults to `3001`) |
| `NODE_ENV` | No | `development` or `production` |

---

## Demo Mode

If `GEMINI_API_KEY` is not configured, the app automatically runs in **demo mode**:

- Pre-generated infographics are served for popular topics (Renewable Energy, Artificial Intelligence, Space Exploration)
- A generic placeholder infographic is shown for unknown topics
- A note appears in the subtitle indicating demo mode
- No API calls are made

To enable live AI generation, simply add your `GEMINI_API_KEY` to `.env` and restart.

---

## How Export Works

The **Share** button in the top bar exports the infographic canvas as a PNG:

1. Captures the infographic component using `html-to-image`
2. Renders at 2x pixel density for sharp output
3. Downloads as `factcanvas-{topic}-{timestamp}.png`
4. Suitable for presentations, social media, and print

---

## Project Structure

```
/
├── index.html              # Vite entry HTML
├── vite.config.ts          # Vite + proxy config
├── tailwind.config.js      # Tailwind theme
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies & scripts
├── .env.example            # Environment template
│
├── client/src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Root app with state management
│   ├── index.css           # Global styles + Tailwind
│   ├── types/
│   │   └── infographic.ts  # TypeScript types
│   ├── lib/
│   │   ├── api.ts          # Frontend API calls
│   │   └── export.ts       # PNG export utility
│   └── components/
│       ├── LandingPage.tsx       # Hero, input, chips
│       ├── LoadingScreen.tsx     # Animated generation state
│       ├── InfographicPage.tsx   # Page wrapper with toolbar
│       ├── InfographicCanvas.tsx # Main infographic renderer
│       ├── StatCard.tsx          # Key statistic card
│       ├── FactSectionCard.tsx   # Fact section with accent bar
│       ├── TimelineBlock.tsx     # Vertical timeline
│       ├── ComparisonBlock.tsx   # Side-by-side comparisons
│       ├── ChartBlock.tsx        # Bar/Line/Donut charts (Recharts)
│       ├── SourceList.tsx        # Citations list
│       └── ConfidenceFooter.tsx  # Score + date footer
│
└── server/
    ├── index.ts            # Express app + server startup
    ├── routes.ts           # API route handlers
    ├── ai.ts               # Gemini AI integration
    ├── schema.ts           # Zod validation schema
    └── mockData.ts         # Demo mode rich mock data
```

---

## API Reference

### `POST /api/generate`

Generate an infographic for a topic.

**Request:**
```json
{ "topic": "Renewable Energy" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Renewable Energy",
    "subtitle": "Powering the Planet's Clean Future",
    "summary": "...",
    "theme": "editorial-light",
    "keyStats": [...],
    "factSections": [...],
    "timeline": [...],
    "comparisons": [...],
    "charts": [...],
    "sources": [...],
    "confidenceScore": 0.92,
    "lastResearched": "2026-03-19"
  }
}
```

### `GET /api/health`

Check server status and API key configuration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Export | html-to-image |
| Icons | Lucide React |
| Backend | Express + TypeScript |
| AI | Google Gemini 1.5 Flash |
| Validation | Zod |

---

## Production Build

```bash
npm run build   # Builds client to dist/client/
npm start       # Starts Express serving built client
```

---

## License

MIT
