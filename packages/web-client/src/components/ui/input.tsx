import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm leading-5 text-[#FAFAFA] shadow-sm outline-none placeholder:text-[#A1A1AA] focus:border-[#52525B] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
