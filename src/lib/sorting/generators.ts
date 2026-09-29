import type { DistributionKey } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateArray(size: number, dist: DistributionKey, seed = 1337): Int32Array {
  const rand = mulberry32(seed + size);
  const arr = new Int32Array(size);

  switch (dist) {
    case "random":
      for (let i = 0; i < size; i++) arr[i] = Math.floor(rand() * size * 10);
      return arr;
    case "reversed":
      for (let i = 0; i < size; i++) arr[i] = size - i;
      return arr;
    case "duplicates": {
      const unique = Math.max(2, Math.floor(Math.sqrt(size) / 2));
      for (let i = 0; i < size; i++) arr[i] = Math.floor(rand() * unique);
      return arr;
    }
    case "nearly":
    default: {
      for (let i = 0; i < size; i++) arr[i] = i;
      const swaps = Math.max(1, Math.floor(size * 0.05));
      for (let s = 0; s < swaps; s++) {
        const a = Math.floor(rand() * size);
        const b = Math.floor(rand() * size);
        const tmp = arr[a];
        arr[a] = arr[b];
        arr[b] = tmp;
      }
      return arr;
    }
  }
}
