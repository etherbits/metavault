import type { ReactNode } from "react";
import { clampRating, formatRating, StarRating } from "@/components/StarRating";

interface PersonalRatingControlProps {
  value: number | null;
  disabled?: boolean;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  valueLabel?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function PersonalRatingControl({
  value,
  disabled = false,
  onChange,
  size = "md",
  valueLabel,
  className,
  ariaLabel = "Personal rating",
}: PersonalRatingControlProps) {
  return (
    <StarRating
      value={value}
      ariaLabel={ariaLabel}
      disabled={disabled}
      onChange={onChange}
      size={size}
      valueLabel={valueLabel}
      className={className}
    />
  );
}

export const clampPersonalRating = clampRating;
export const formatPersonalRating = formatRating;
