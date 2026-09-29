import { generateArray } from "./generators";
import type { AlgorithmKey, DistributionKey } from "./types";

export interface SortStep {
  /** Array state after this operation. */
  array: number[];
  /** Indices being compared at this step. */
  compare: [number, number] | null;
  /** Indices written/swapped at this step. */
  write: number[] | null;
  /** Indices already locked into their final position. */
  sorted: number[];
  comparisons: number;
  swaps: number;
  note: string;
}

const MAX_STEPS = 6000;

class Recorder {
  steps: SortStep[] = [];
  comparisons = 0;
  swaps = 0;
  sorted = new Set<number>();

  constructor(private a: number[]) {}

  private push(compare: [number, number] | null, write: number[] | null, note: string) {
    if (this.steps.length >= MAX_STEPS) return;
    this.steps.push({
      array: [...this.a],
      compare,
      write,
      sorted: [...this.sorted],
      comparisons: this.comparisons,
      swaps: this.swaps,
      note,
    });
  }

  cmp(i: number, j: number, note: string) {
    this.comparisons++;
    this.push([i, j], null, note);
  }

  swap(i: number, j: number, note: string) {
    const t = this.a[i];
    this.a[i] = this.a[j];
    this.a[j] = t;
    this.swaps++;
    this.push(null, [i, j], note);
  }

  set(i: number, value: number, note: string) {
    this.a[i] = value;
    this.swaps++;
    this.push(null, [i], note);
  }

  lock(i: number, note: string) {
    this.sorted.add(i);
    this.push(null, null, note);
  }

  finish() {
    for (let i = 0; i < this.a.length; i++) this.sorted.add(i);
    this.push(null, null, "Sorted");
    return this.steps;
  }
}

function bubble(a: number[], r: Recorder) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      r.cmp(j, j + 1, `Compare a[${j}] and a[${j + 1}]`);
      if (a[j] > a[j + 1]) {
        r.swap(j, j + 1, `Swap a[${j}] ↔ a[${j + 1}]`);
        swapped = true;
      }
    }
    r.lock(n - 1 - i, `a[${n - 1 - i}] is final`);
    if (!swapped) break;
  }
}

function selection(a: number[], r: Recorder) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      r.cmp(j, min, `Compare a[${j}] with current minimum a[${min}]`);
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) r.swap(i, min, `Move minimum into position ${i}`);
    r.lock(i, `a[${i}] is final`);
  }
}

function insertion(a: number[], r: Recorder) {
  const n = a.length;
  r.lock(0, "First element is trivially sorted");
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      r.cmp(j, i, `Compare a[${j}] with key ${key}`);
      if (a[j] <= key) break;
      r.set(j + 1, a[j], `Shift a[${j}] right`);
      j--;
    }
    r.set(j + 1, key, `Insert key ${key} at ${j + 1}`);
    r.lock(i, `Prefix up to ${i} is sorted`);
  }
}

function quick(a: number[], r: Recorder) {
  const stack: number[] = [0, a.length - 1];
  while (stack.length) {
    const hi = stack.pop()!;
    const lo = stack.pop()!;
    if (lo >= hi) {
      if (lo === hi) r.lock(lo, `a[${lo}] is final`);
      continue;
    }
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      r.cmp(j, hi, `Compare a[${j}] with pivot ${pivot}`);
      if (a[j] < pivot) {
        if (i !== j) r.swap(i, j, `Move a[${j}] into the < pivot region`);
        i++;
      }
    }
    r.swap(i, hi, `Place pivot ${pivot} at ${i}`);
    r.lock(i, `Pivot index ${i} is final`);
    stack.push(lo, i - 1, i + 1, hi);
  }
}

function mergeSteps(a: number[], r: Recorder) {
  const n = a.length;
  const buf = new Array<number>(n);
  for (let width = 1; width < n; width *= 2) {
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width - 1;
      const hi = Math.min(lo + 2 * width - 1, n - 1);
      let i = lo;
      let j = mid + 1;
      let k = lo;
      while (i <= mid && j <= hi) {
        r.cmp(i, j, `Merge: compare a[${i}] and a[${j}]`);
        buf[k++] = a[i] <= a[j] ? a[i++] : a[j++];
      }
      while (i <= mid) buf[k++] = a[i++];
      while (j <= hi) buf[k++] = a[j++];
      for (let x = lo; x <= hi; x++) r.set(x, buf[x], `Write merged value into a[${x}]`);
    }
  }
}

function heap(a: number[], r: Recorder) {
  const n = a.length;
  const sift = (root: number, end: number) => {
    while (true) {
      const l = 2 * root + 1;
      if (l > end) break;
      let child = l;
      if (l + 1 <= end) {
        r.cmp(l, l + 1, `Pick larger child of ${root}`);
        if (a[l] < a[l + 1]) child = l + 1;
      }
      r.cmp(root, child, `Compare parent ${root} with child ${child}`);
      if (a[root] < a[child]) {
        r.swap(root, child, `Sift down ${root} → ${child}`);
        root = child;
      } else break;
    }
  };
  for (let i = (n - 2) >> 1; i >= 0; i--) sift(i, n - 1);
  for (let end = n - 1; end > 0; end--) {
    r.swap(0, end, `Move max to position ${end}`);
    r.lock(end, `a[${end}] is final`);
    sift(0, end - 1);
  }
}

function radix(a: number[], r: Recorder) {
  const n = a.length;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const count = new Array<number>(10).fill(0);
    for (let i = 0; i < n; i++) count[Math.floor(a[i] / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    const out = new Array<number>(n);
    for (let i = n - 1; i >= 0; i--) out[--count[Math.floor(a[i] / exp) % 10]] = a[i];
    for (let i = 0; i < n; i++) r.set(i, out[i], `Digit pass ${exp}: place value at a[${i}]`);
  }
}

const RUNNERS: Record<AlgorithmKey, (a: number[], r: Recorder) => void> = {
  bubble,
  selection,
  insertion,
  quick,
  merge: mergeSteps,
  heap,
  radix,
  tim: insertion,
};

export function recordSteps(
  algorithm: AlgorithmKey,
  size: number,
  distribution: DistributionKey,
  seed = 42,
): SortStep[] {
  const source = Array.from(generateArray(size, distribution, seed)).map(
    (v) => (Math.abs(v) % 98) + 2,
  );
  const arr = [...source];
  const rec = new Recorder(arr);
  rec.steps.push({
    array: [...arr],
    compare: null,
    write: null,
    sorted: [],
    comparisons: 0,
    swaps: 0,
    note: "Initial array",
  });
  RUNNERS[algorithm](arr, rec);
  return rec.finish();
}
