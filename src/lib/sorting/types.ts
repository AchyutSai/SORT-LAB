export type AlgorithmKey =
  | "quick"
  | "merge"
  | "heap"
  | "bubble"
  | "insertion"
  | "selection"
  | "radix"
  | "tim";

export type DistributionKey = "random" | "nearly" | "reversed" | "duplicates";

export interface Counters {
  comparisons: number;
  swaps: number;
}

export interface AlgorithmMeta {
  key: AlgorithmKey;
  name: string;
  time: string;
  space: string;
  family: "quadratic" | "linearithmic" | "linear";
  /** Preserves the relative order of equal keys. */
  stable: boolean;
  /** Sorts within the input buffer, using only O(1)–O(log n) auxiliary space. */
  inPlace: boolean;
  /** Exported symbol in src/lib/sorting/algorithms.ts backing this entry. */
  sourceSymbol: string;
}

export const ALGORITHMS: AlgorithmMeta[] = [
  { key: "quick", name: "Quick Sort", time: "O(n log n)", space: "O(log n)", family: "linearithmic", stable: false, inPlace: true, sourceSymbol: "quickSort" },
  { key: "merge", name: "Merge Sort", time: "O(n log n)", space: "O(n)", family: "linearithmic", stable: true, inPlace: false, sourceSymbol: "mergeSort" },
  { key: "heap", name: "Heap Sort", time: "O(n log n)", space: "O(1)", family: "linearithmic", stable: false, inPlace: true, sourceSymbol: "heapSort" },
  { key: "tim", name: "Tim Sort", time: "O(n log n)", space: "O(n)", family: "linearithmic", stable: true, inPlace: false, sourceSymbol: "timSort" },
  { key: "radix", name: "Radix Sort", time: "O(nk)", space: "O(n + k)", family: "linear", stable: true, inPlace: false, sourceSymbol: "radixSort" },
  { key: "bubble", name: "Bubble Sort", time: "O(n²)", space: "O(1)", family: "quadratic", stable: true, inPlace: true, sourceSymbol: "bubbleSort" },
  { key: "insertion", name: "Insertion Sort", time: "O(n²)", space: "O(1)", family: "quadratic", stable: true, inPlace: true, sourceSymbol: "insertionSort" },
  { key: "selection", name: "Selection Sort", time: "O(n²)", space: "O(1)", family: "quadratic", stable: false, inPlace: true, sourceSymbol: "selectionSort" },
];

export const DISTRIBUTIONS: { key: DistributionKey; name: string; hint: string }[] = [
  { key: "random", name: "Random", hint: "Uniform distribution" },
  { key: "nearly", name: "Nearly Sorted", hint: "90% ordered, 10% swaps" },
  { key: "reversed", name: "Reversed", hint: "Strictly descending" },
  { key: "duplicates", name: "Few Unique", hint: "High duplicate frequency" },
];

export interface BenchmarkPoint {
  algorithm: AlgorithmKey;
  size: number;
  ms: number;
  comparisons: number;
  swaps: number;
  /** Measured JS heap delta in bytes when the runtime exposes it, else 0. */
  heapBytes?: number;
}

export interface BenchmarkConfig {
  algorithms: AlgorithmKey[];
  distribution: DistributionKey;
  maxSize: number;
  step: number;
  repeats: number;
  /** When provided, the benchmark sorts exactly these values instead of generated data. */
  customValues?: number[];
}

export type WorkerRequest =
  | { type: "run"; config: BenchmarkConfig }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "point"; point: BenchmarkPoint; progress: number }
  | { type: "frame"; algorithm: AlgorithmKey; size: number; snapshot: number[] }
  | { type: "done" }
  | { type: "error"; message: string };
