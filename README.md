# SortLab — Sorting Algorithm Benchmark Studio

A modern, high-performance web studio for running, measuring, analyzing, and visualizing sorting algorithms in the browser using Web Workers, interactive 2D/3D visualizations, and theoretical Big-O curve fitting.

![SortLab Preview](/public/sort_lab_icon.png)

## Features

- **Non-Blocking Web Worker Engine**: High-resolution `performance.now()` precision benchmarking off the main thread with real-time progress and pause/resume support.
- **8 Sorting Algorithms**: Quick Sort, Merge Sort, Heap Sort, Tim Sort, Radix Sort, Bubble Sort, Insertion Sort, Selection Sort.
- **Dynamic Data Distributions**:
  - *Random*: Uniform distribution.
  - *Nearly Sorted*: 90% sorted with 10% random swaps.
  - *Reversed*: Strictly descending order (worst-case for simple pivots).
  - *Few Unique*: High-frequency duplicate distribution.
  - *Custom Mode*: Direct numerical input and testing for arrays of 2–64 elements.
- **Interactive Execution Plots**: Recharts line plot showing Execution Time ($ms$) vs Array Size ($N$) with log/linear scale switches, theoretical Big-O overlays, and high-res PNG export.
- **Step-Through 2D & 3D Visualizer**:
  - Replay individual sorting steps with comparison/write highlight states.
  - 3D interactive Three.js bar chart with drag-to-rotate orbital camera.
  - Granular step controls, scrub sliders, and playback speed adjustments.
- **Empirical Verdict & Metrics**:
  - Automatic detection of the winning algorithm and runner-up for any distribution.
  - Fitted empirical growth exponent ($t \sim N^b$).
  - Full metrics grid (comparisons, swaps, heap delta, stability, in-place behavior, exact TypeScript source code).
  - CSV export for measured data points.
- **Benchmark Comparison**: Side-by-side run comparison with speed delta tables and dual execution charts.
- **Global Leaderboard**: Community benchmark ranking by measured throughput ($\text{elements} / \text{ms}$).
- **AI Assistant**: Embedded conversational assistant specializing in algorithm complexity, sorting behavior, and benchmark interpretation.
- **Cloud Sync & Local Fallback**: Authenticated cloud storage via Supabase with automatic `localStorage` recovery for offline/guest use.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router)
- **State & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with Cyberpunk / Dark Glassmorphism aesthetics
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **Visuals & 3D**: [Three.js](https://threejs.org/), [Recharts](https://recharts.org/), [Motion](https://motion.dev/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`)
- **Runtime & Bundler**: [Bun](https://bun.sh) / [Node.js](https://nodejs.org), [Vite 8](https://vitejs.dev/) & [Nitro](https://nitro.unjs.io/)

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/) or [Bun](https://bun.sh/)
- A Supabase project (for authentication, leaderboard, and cloud run saving)

### Installation

```bash
# Clone the repository
git clone https://github.com/Achyut-sai/speed-sort-lab.git
cd speed-sort-lab

# Install dependencies
npm install
# or
bun install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"

# Server-Side Supabase Keys (for SSR & admin actions)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# AI Assistant (Optional)
OPENAI_API_KEY="your-openai-or-compatible-api-key"
AI_BASE_URL="https://api.openai.com/v1" # optional, defaults to OpenAI
AI_MODEL="gpt-4o-mini"                 # optional, defaults to gpt-4o-mini
```

### Database Setup

Apply the SQL migrations located in `supabase/migrations/` to your Supabase project:
1. `supabase/migrations/20260821065709_bae81b98-6ff4-4189-8d66-7dc8bb2b29de.sql` (Profiles, runs, metrics, RLS)
2. `supabase/migrations/20260821065737_4af68413-1854-4ce9-ac58-743139c0a431.sql` (Security hardening)
3. `supabase/migrations/20260911151515_eb75f8cb-f8c0-410c-a243-59d99d209fd8.sql` (Chat threads and messages)

### Development

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run preview
# or
bun run build
bun run preview
```

---

## License

MIT