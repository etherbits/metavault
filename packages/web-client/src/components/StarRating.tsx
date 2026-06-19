import { Star } from "lucide-react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

const STAR_COUNT = 5;
const RATING_MAX = 10;
const STAR_KEYS = Array.from(
  { length: STAR_COUNT },
  (_, index) => `star-${index + 1}`
);

type StarRatingSize = "sm" | "md";

interface StarRatingProps {
  value: number | null;
  ariaLabel: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
  size?: StarRatingSize;
  valueLabel?: ReactNode;
  className?: string;
}

const sizeConfig = {
  sm: {
    button: "h-5 w-[78px]",
    row: "h-full w-[78px] gap-0.5",
    icon: 14,
  },
  md: {
    button: "h-6 w-[108px]",
    row: "h-full w-[108px] gap-0.5",
    icon: 20,
  },
} as const;

export function StarRating({
  value,
  ariaLabel,
  disabled = false,
  onChange,
  size = "md",
  valueLabel,
  className,
}: StarRatingProps) {
  const config = sizeConfig[size];
  const normalizedValue = normalizeRating(value);
  const displayedValue = snapToHalfStar(normalizedValue);
  const fillWidth = `${(displayedValue / RATING_MAX) * 100}%`;
  const editable = Boolean(onChange);
  const interactive = Boolean(onChange) && !disabled;
  const starLayers = (
    <>
      <span
        className={cn(
          "pointer-events-none flex items-center text-[#71717A]",
          config.row
        )}
      >
        {STAR_KEYS.map((key) => (
          <Star
            key={key}
            size={config.icon}
            className="block shrink-0 fill-transparent"
          />
        ))}
      </span>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex overflow-hidden text-[#FACC16]"
        style={{ width: fillWidth }}
        aria-hidden="true"
      >
        <span className={cn("flex items-center", config.row)}>
          {STAR_KEYS.map((key) => (
            <Star
              key={key}
              size={config.icon}
              className="block shrink-0 fill-current"
            />
          ))}
        </span>
      </span>
    </>
  );

  function updateFromPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!onChange) return;
    event.preventDefault();
    event.stopPropagation();
    if (!interactive) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;

    const ratio = (event.clientX - bounds.left) / bounds.width;
    onChange?.(clampRating(Math.ceil(ratio * RATING_MAX)));
  }

  function updateFromKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!onChange) return;
    event.stopPropagation();
    if (!interactive) return;

    const nextByKey: Partial<Record<string, number>> = {
      ArrowRight: normalizedValue + 1,
      ArrowUp: normalizedValue + 1,
      ArrowLeft: normalizedValue - 1,
      ArrowDown: normalizedValue - 1,
      Home: 1,
      End: RATING_MAX,
    };
    const next = nextByKey[event.key];
    if (next === undefined) return;

    event.preventDefault();
    onChange?.(clampRating(next));
  }

  if (!editable) {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <span
          role="img"
          aria-label={ariaLabel}
          className={cn(
            "relative inline-flex items-center justify-center overflow-hidden rounded-[4px] text-[#FACC16] leading-none align-middle",
            config.button
          )}
        >
          {starLayers}
        </span>
        {valueLabel}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button
        type="button"
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={RATING_MAX}
        aria-valuenow={normalizedValue}
        aria-valuetext={formatRating(value)}
        aria-disabled={!interactive}
        disabled={disabled}
        onPointerDown={updateFromPointer}
        onKeyDown={updateFromKey}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-[4px] text-[#FACC16] leading-none outline-none transition-opacity align-middle focus-visible:ring-2 focus-visible:ring-[#FACC16]/50 disabled:cursor-wait disabled:opacity-70",
          "cursor-pointer",
          config.button
        )}
      >
        {starLayers}
      </button>
      {valueLabel}
    </div>
  );
}

export function clampRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(1, Math.min(RATING_MAX, value));
}

export function formatRating(value: number | null) {
  if (value === null) return "0 / 10";
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} / 10`;
}

function normalizeRating(value: number | null) {
  return value === null ? 0 : clampRating(value);
}

function snapToHalfStar(value: number) {
  return Math.round(value);
}
