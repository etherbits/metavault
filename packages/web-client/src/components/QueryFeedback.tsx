import { motion } from "motion/react";

interface CanonicalQueryPreviewProps {
  query?: string;
  error?: string | null;
}

export function CanonicalQueryPreview({
  query = "",
  error = null,
}: CanonicalQueryPreviewProps) {
  if (query !== "") {
    return (
      <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#27272A] bg-[#18181B]/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <span className="shrink-0 text-[12px] font-medium uppercase leading-5 tracking-[0.08em] text-[#71717A]">
          Canonical
        </span>
        <code className="min-w-0 flex-1 break-words font-mono text-[13px] leading-5 text-[#D4D4D8]">
          {query}
        </code>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#7F1D1D]/70 bg-[#450A0A]/20 px-3 py-2">
        <span className="shrink-0 text-[12px] font-medium uppercase leading-5 tracking-[0.08em] text-[#FCA5A5]">
          Canonical
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-5 text-[#F87171]">
          {error}
        </p>
      </div>
    );
  }

  return null;
}

interface QueryExecutionStateProps {
  isExecuting: boolean;
  resultCount: number;
  error?: string | null;
  loadingLabel?: string;
  emptyLabel?: string;
}

export function QueryExecutionState({
  isExecuting,
  resultCount,
  error = null,
  loadingLabel = "Executing query...",
  emptyLabel = "No results found",
}: QueryExecutionStateProps) {
  if (isExecuting) {
    return (
      <div className="flex items-center gap-2 text-[14px] leading-5 text-[#A1A1AA]">
        <motion.span
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="h-4 w-4 rounded-full border border-[#3F3F46] border-t-[#FACC15]"
        />
        {loadingLabel}
      </div>
    );
  }

  if (resultCount === 0) {
    return error ? (
      <p className="w-fit max-w-[358px] text-[14px] leading-5 text-[#F87171]">
        {error}
      </p>
    ) : (
      <p className="text-[14px] leading-5 text-[#A1A1AA]">{emptyLabel}</p>
    );
  }

  return (
    <p className="text-[14px] leading-5 text-[#A1A1AA]">
      Retrieved {resultCount} {resultCount === 1 ? "result" : "results"}
    </p>
  );
}
