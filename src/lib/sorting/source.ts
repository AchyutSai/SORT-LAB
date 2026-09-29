import rawSource from "./algorithms.ts?raw";

/**
 * Extracts the exact source text of an exported function from the real
 * implementation file, so the viewer can never drift from what is benchmarked.
 */
export function getAlgorithmSource(symbol: string): string {
  const marker = `export function ${symbol}(`;
  const start = rawSource.indexOf(marker);
  if (start === -1) return `// ${symbol} not found in algorithms.ts`;

  let depth = 0;
  let seenBrace = false;
  let end = start;
  for (let i = start; i < rawSource.length; i++) {
    const ch = rawSource[i];
    if (ch === "{") {
      depth++;
      seenBrace = true;
    } else if (ch === "}") {
      depth--;
      if (seenBrace && depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return rawSource.slice(start, end);
}

/** Shared helpers referenced by several algorithms. */
export const SWAP_HELPER = `function swap(a: Int32Array, i: number, j: number, c: Counters) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
  c.swaps++;
}`;
