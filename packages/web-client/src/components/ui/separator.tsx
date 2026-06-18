import type * as React from "react";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  const separatorClassName = cn(
    "shrink-0 bg-[#3F3F46]",
    orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
    className
  );

  return <div role="none" className={separatorClassName} {...props} />;
}

export { Separator };
