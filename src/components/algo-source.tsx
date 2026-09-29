import { useMemo } from "react";
import { Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAlgorithmSource, SWAP_HELPER } from "@/lib/sorting/source";
import type { AlgorithmMeta } from "@/lib/sorting/types";

interface Props {
  meta: AlgorithmMeta;
}

export function AlgoSource({ meta }: Props) {
  const code = useMemo(() => getAlgorithmSource(meta.sourceSymbol), [meta.sourceSymbol]);
  const usesSwap = code.includes("swap(");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]">
          <Code2 className="h-3.5 w-3.5" /> Source
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" /> {meta.name} — TypeScript implementation
          </DialogTitle>
          <DialogDescription>
            {meta.time} time · {meta.space} space · {meta.stable ? "stable" : "unstable"} ·{" "}
            {meta.inPlace ? "in-place" : "out-of-place"}. This is the exact instrumented code the
            benchmark worker executes.
          </DialogDescription>
        </DialogHeader>
        <pre className="glass-soft max-h-[55vh] overflow-auto rounded-xl p-4 font-mono text-[11px] leading-relaxed text-foreground">
          <code>
            {usesSwap ? `${SWAP_HELPER}\n\n` : ""}
            {code}
          </code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}
