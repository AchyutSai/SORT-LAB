# SORTING ALGORITHM BENCHMARK

create a web app for sorting algorithms benchmark  # Role & Goal

You are a Principal Software Engineer and UI/UX Designer. Build a complete, production-grade **Sorting Algorithm Benchmark Web App** that allows users to run, compare, measure, and plot execution times of various sorting algorithms against custom array sizes, distributions, and configurations.

---

## 1. Tech Stack Requirements

* **Frontend:** React (TypeScript), Tailwind CSS, Lucide Icons.

* **Charting:** Chart.js or Recharts (for dynamic $O(n \log n)$ vs $O(n^2)$ interactive plots).

* **Worker Threads:** Web Workers (execute sorting algorithms off the main thread to prevent UI freezing during large array benchmarks).

* **Database & Backend (BaaS):** Supabase or Firebase (PostgreSQL-backed for user profiles, saved benchmark runs, and global leaderboards).

* **Styling/Animations:** Framer Motion with Tailwind CSS for glassmorphism and ambient glow effects.

---

## 2. UI/UX & Visual Design Specs

* **Aesthetic Theme:** Modern Cyberpunk / Dark Glassmorphism.

  * *Background:* Ambient floating canvas particles, deep slate (`#0B0F17`) background with subtle neon radial gradients (Cyan `#00f2fe` and Violet `#4facfe`).

  * *Glass Panels:* `backdrop-blur-md`, subtle border glow, dark semi-transparent cards (`rgba(15, 23, 42, 0.75)`).

* **Dashboard Layout:**

  * **Header:** App title, global execution controls, theme toggle, and database sync status indicator.

  * **Sidebar / Control Panel:** 

    * Algorithm Selector (Checkbox grid: Quick Sort, Merge Sort, Heap Sort, Bubble Sort, Insertion Sort, Selection Sort, Radix Sort, Tim Sort).

    * Array Configuration Controls:

      * Input Size Slider ($N = 100$ to $N = 100,000$).

      * Step Size / Test Increments (e.g., test every 1,000 elements).

      * Data Distribution selector: *Random*, *Nearly Sorted*, *Reversed*, *Few Unique Elements*.

    * Benchmark Execution Buttons: "Run Benchmark", "Pause", "Reset".

  * **Main Display Area:**

    * **Interactive Execution Plot:** Line chart displaying Array Size ($N$) on the X-axis and Time in Milliseconds ($ms$) on the Y-axis. Toggleable log/linear scales.

    * **Live Visualizer (Canvas):** Real-time array sorting animation lane showing real-time array state during benchmarking runs.

    * **Analytics Metrics Grid:** Display Big-O complexities (Time & Space), Peak Memory Consumption, Array Swaps count, and Comparisons count.

---

## 3. Core Engine & Technical Specifications

### A. Non-Blocking Benchmarking (Web Workers)

* Write pure TypeScript implementations for the following algorithms:

  * $O(n^2)$: Bubble Sort, Selection Sort, Insertion Sort.

  * $O(n \log n)$: Quick Sort, Merge Sort, Heap Sort.

  * Non-Comparison: Radix Sort.

* Run algorithm iterations inside **Web Workers** using high-resolution timestamps (`performance.now()`).

* Calculate mean execution times over multiple runs (e.g., average of 3 runs per step) to eliminate micro-benchmarking anomalies.

### B. Dynamic Data Distribution Generators

Provide utility functions to seed arrays:

1. `Random`: Uniform distribution.

2. `Nearly Sorted`: 90% sorted with 10% random swaps.

3. `Reversed`: Strictly descending arrays.

4. `Duplicates`: Array with high frequency of identical values.

---

## 4. Database Setup & Persistence (Supabase / PostgreSQL)

Design and set up a Supabase client schema:

```sql

-- Benchmark Results Storage

CREATE TABLE benchmark_runs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    run_name VARCHAR(100) NOT NULL,

    array_distribution VARCHAR(50) NOT NULL,

    max_input_size INT NOT NULL,

    step_size INT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);

CREATE TABLE benchmark_metrics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    run_id UUID REFERENCES benchmark_runs(id) ON DELETE CASCADE,

    algorithm_name VARCHAR(50) NOT NULL,

    input_size INT NOT NULL,

    execution_time_ms FLOAT NOT NULL,

    comparisons BIGINT,

    swaps BIGINT

);
```

## Development

You need [Bun](https://bun.sh) installed.

```sh
git clone https://github.com/Achyut-sai/speed-sort-lab.git
cd speed-sort-lab
bun install
bun run dev
```