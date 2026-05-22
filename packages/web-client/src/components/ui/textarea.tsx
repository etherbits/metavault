import type * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full resize-none rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 py-2 text-sm leading-5 text-[#FAFAFA] shadow-sm outline-none placeholder:text-[#A1A1AA] focus:border-[#52525B] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
