import type { AlgorithmKey, Counters } from "./types";

/** Pure, instrumented sorting implementations. Each sorts `a` in place (or returns a sorted array). */

function swap(a: Int32Array, i: number, j: number, c: Counters) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
  c.swaps++;
}

export function bubbleSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      c.comparisons++;
      if (a[j] > a[j + 1]) {
        swap(a, j, j + 1, c);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}

export function selectionSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      c.comparisons++;
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) swap(a, i, min, c);
  }
  return a;
}

export function insertionSort(a: Int32Array, c: Counters, lo = 0, hi = a.length - 1): Int32Array {
  for (let i = lo + 1; i <= hi; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= lo) {
      c.comparisons++;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      c.swaps++;
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}

export function quickSort(a: Int32Array, c: Counters): Int32Array {
  const stack: number[] = [0, a.length - 1];
  while (stack.length) {
    const hi = stack.pop()!;
    const lo = stack.pop()!;
    if (lo >= hi) continue;
    const mid = (lo + hi) >> 1;
    // median-of-three pivot
    c.comparisons += 3;
    if (a[mid] < a[lo]) swap(a, mid, lo, c);
    if (a[hi] < a[lo]) swap(a, hi, lo, c);
    if (a[hi] < a[mid]) swap(a, hi, mid, c);
    const pivot = a[mid];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (a[i] < pivot) {
        c.comparisons++;
        i++;
      }
      c.comparisons++;
      while (a[j] > pivot) {
        c.comparisons++;
        j--;
      }
      c.comparisons++;
      if (i <= j) {
        swap(a, i, j, c);
        i++;
        j--;
      }
    }
    stack.push(lo, j, i, hi);
  }
  return a;
}

function merge(a: Int32Array, buf: Int32Array, lo: number, mid: number, hi: number, c: Counters) {
  let i = lo;
  let j = mid + 1;
  let k = lo;
  while (i <= mid && j <= hi) {
    c.comparisons++;
    if (a[i] <= a[j]) buf[k++] = a[i++];
    else {
      buf[k++] = a[j++];
      c.swaps++;
    }
  }
  while (i <= mid) buf[k++] = a[i++];
  while (j <= hi) buf[k++] = a[j++];
  for (let x = lo; x <= hi; x++) a[x] = buf[x];
}

export function mergeSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  const buf = new Int32Array(n);
  for (let width = 1; width < n; width *= 2) {
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width - 1;
      const hi = Math.min(lo + 2 * width - 1, n - 1);
      merge(a, buf, lo, mid, hi, c);
    }
  }
  return a;
}

export function heapSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  const sift = (root: number, end: number) => {
    while (true) {
      const l = 2 * root + 1;
      if (l > end) break;
      let child = l;
      if (l + 1 <= end) {
        c.comparisons++;
        if (a[l] < a[l + 1]) child = l + 1;
      }
      c.comparisons++;
      if (a[root] < a[child]) {
        swap(a, root, child, c);
        root = child;
      } else break;
    }
  };
  for (let i = (n - 2) >> 1; i >= 0; i--) sift(i, n - 1);
  for (let end = n - 1; end > 0; end--) {
    swap(a, 0, end, c);
    sift(0, end - 1);
  }
  return a;
}

export function radixSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  if (n < 2) return a;
  let min = a[0];
  let max = a[0];
  for (let i = 1; i < n; i++) {
    c.comparisons += 2;
    if (a[i] < min) min = a[i];
    if (a[i] > max) max = a[i];
  }
  const offset = min < 0 ? -min : 0;
  const maxVal = max + offset;
  const RADIX = 256;
  let out: Int32Array<ArrayBufferLike> = new Int32Array(n);
  let src: Int32Array<ArrayBufferLike> = a;
  for (let shift = 0; maxVal >> shift > 0; shift += 8) {
    const count = new Int32Array(RADIX);
    for (let i = 0; i < n; i++) count[((src[i] + offset) >> shift) & 255]++;
    for (let i = 1; i < RADIX; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) {
      out[--count[((src[i] + offset) >> shift) & 255]] = src[i];
      c.swaps++;
    }
    const tmp = src;
    src = out;
    out = tmp;
  }
  if (src !== a) for (let i = 0; i < n; i++) a[i] = src[i];
  return a;
}

/** Simplified Tim Sort: insertion sort on runs of 32, then bottom-up merges. */
export function timSort(a: Int32Array, c: Counters): Int32Array {
  const n = a.length;
  const RUN = 32;
  for (let lo = 0; lo < n; lo += RUN) {
    insertionSort(a, c, lo, Math.min(lo + RUN - 1, n - 1));
  }
  const buf = new Int32Array(n);
  for (let width = RUN; width < n; width *= 2) {
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width - 1;
      const hi = Math.min(lo + 2 * width - 1, n - 1);
      merge(a, buf, lo, mid, hi, c);
    }
  }
  return a;
}

export const SORTERS: Record<AlgorithmKey, (a: Int32Array, c: Counters) => Int32Array> = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: (a, c) => insertionSort(a, c),
  quick: quickSort,
  merge: mergeSort,
  heap: heapSort,
  radix: radixSort,
  tim: timSort,
};
