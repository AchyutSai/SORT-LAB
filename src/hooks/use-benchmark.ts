import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AlgorithmKey,
  BenchmarkConfig,
  BenchmarkPoint,
  WorkerResponse,
} from "@/lib/sorting/types";

export type RunStatus = "idle" | "running" | "paused" | "done" | "error";

export function useBenchmark() {
  const workerRef = useRef<Worker | null>(null);
  const [points, setPoints] = useState<BenchmarkPoint[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [frame, setFrame] = useState<{ algorithm: AlgorithmKey; size: number; snapshot: number[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../workers/benchmark.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "point") {
        setPoints((p) => [...p, msg.point]);
        setProgress(msg.progress);
      } else if (msg.type === "frame") {
        setFrame({ algorithm: msg.algorithm, size: msg.size, snapshot: msg.snapshot });
      } else if (msg.type === "done") {
        setStatus("done");
        setProgress(1);
      } else if (msg.type === "error") {
        setError(msg.message);
        setStatus("error");
      }
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const start = useCallback(
    (config: BenchmarkConfig) => {
      setPoints([]);
      setProgress(0);
      setError(null);
      setStatus("running");
      ensureWorker().postMessage({ type: "run", config });
    },
    [ensureWorker],
  );

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: "pause" });
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: "resume" });
    setStatus("running");
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setPoints([]);
    setProgress(0);
    setFrame(null);
    setError(null);
    setStatus("idle");
  }, []);

  const loadPoints = useCallback((next: BenchmarkPoint[]) => {
    setPoints(next);
    setStatus("done");
    setProgress(1);
    setError(null);
  }, []);

  return { points, status, progress, frame, error, start, pause, resume, reset, loadPoints };
}
