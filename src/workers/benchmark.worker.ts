/// <reference lib="webworker" />
import { SORTERS } from "@/lib/sorting/algorithms";
import { generateArray } from "@/lib/sorting/generators";
import type { BenchmarkConfig, Counters, WorkerRequest, WorkerResponse } from "@/lib/sorting/types";

let paused = false;
let cancelled = false;

const post = (msg: WorkerResponse) => self.postMessage(msg);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitWhilePaused() {
  while (paused && !cancelled) await sleep(80);
}

/** Safety cap: quadratic algorithms above this size take too long to be useful. */
const QUADRATIC_CAP = 20000;

/**
 * Real heap sampling. `performance.memory` is a Chromium extension and is
 * absent elsewhere, in which case callers fall back to the theoretical model.
 */
function usedHeap(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return typeof mem?.usedJSHeapSize === "number" ? mem.usedJSHeapSize : null;
}

function sampleSnapshot(arr: Int32Array, buckets = 120): number[] {
  const out: number[] = [];
  const stride = Math.max(1, Math.floor(arr.length / buckets));
  for (let i = 0; i < arr.length && out.length < buckets; i += stride) out.push(arr[i]);
  return out;
}

async function run(config: BenchmarkConfig) {
  const custom = config.customValues && config.customValues.length ? config.customValues : null;
  const sizes: number[] = [];
  if (custom) {
    sizes.push(custom.length);
  } else {
    for (let n = config.step; n <= config.maxSize; n += config.step) sizes.push(n);
    if (sizes.length === 0) sizes.push(config.maxSize);
  }

  const total = sizes.length * config.algorithms.length;
  let done = 0;

  for (const size of sizes) {
    for (const algo of config.algorithms) {
      await waitWhilePaused();
      if (cancelled) return;

      const isQuadratic = algo === "bubble" || algo === "selection" || algo === "insertion";
      if (!custom && isQuadratic && size > QUADRATIC_CAP) {
        done++;
        post({ type: "point", point: { algorithm: algo, size, ms: NaN, comparisons: 0, swaps: 0 }, progress: done / total });
        continue;
      }

      let totalMs = 0;
      let heapBytes = 0;
      const counters: Counters = { comparisons: 0, swaps: 0 };

      for (let r = 0; r < config.repeats; r++) {
        const base = custom ?? generateArray(size, config.distribution, 1337 + r);
        const arr = Int32Array.from(base);
        const c: Counters = { comparisons: 0, swaps: 0 };
        const heapBefore = usedHeap();
        const t0 = performance.now();
        SORTERS[algo](arr, c);
        const t1 = performance.now();
        const heapAfter = usedHeap();
        totalMs += t1 - t0;
        if (heapBefore !== null && heapAfter !== null) {
          heapBytes = Math.max(heapBytes, Math.max(0, heapAfter - heapBefore));
        }
        counters.comparisons = c.comparisons;
        counters.swaps = c.swaps;
        if (r === config.repeats - 1) {
          post({ type: "frame", algorithm: algo, size, snapshot: sampleSnapshot(arr) });
        }
        await sleep(0);
        if (cancelled) return;
      }

      done++;
      post({
        type: "point",
        point: {
          algorithm: algo,
          size,
          ms: totalMs / config.repeats,
          comparisons: counters.comparisons,
          swaps: counters.swaps,
          heapBytes,
        },
        progress: done / total,
      });
    }
  }
  post({ type: "done" });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "run") {
    paused = false;
    cancelled = false;
    try {
      await run(msg.config);
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  } else if (msg.type === "pause") paused = true;
  else if (msg.type === "resume") paused = false;
  else if (msg.type === "cancel") {
    cancelled = true;
    paused = false;
  }
};
