import type { BenchmarkPoint, DistributionKey, AlgorithmKey } from "@/lib/sorting/types";

const KEY = "sortlab:last-run";

export interface LocalRun {
  savedAt: number;
  distribution: DistributionKey;
  maxSize: number;
  step: number;
  repeats: number;
  selected: AlgorithmKey[];
  points: BenchmarkPoint[];
}

export function saveLocalRun(run: LocalRun) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    /* storage full or unavailable */
  }
}

export function loadLocalRun(): LocalRun | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalRun;
    if (!Array.isArray(parsed.points)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalRun() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
