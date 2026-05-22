import {
  CalendarDays,
  Clapperboard,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Type,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router";
import BatmanPoster from "@/assets/download.jpeg";
import { StatusBadge, getStatusBadgeTone } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { useLibraryEntries } from "@/features/library/hooks";
import type { MediaItem } from "@/features/library/types";
import { cn } from "@/lib/utils";

export function DetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const libraryQuery = useLibraryEntries();

  if (libraryQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FAFAFA]" />
      </div>
    );
  }

  const item = libraryQuery.data?.find((entry) => entry.id === itemId);
  if (!item) {
    return <Navigate to="/app/query" replace />;
  }

  return <DetailPageContent item={item} onBack={() => navigate(-1)} />;
}

function DetailPageContent({
  item,
  onBack,
}: {
  item: MediaItem;
  onBack: () => void;
}) {
  const numericRating = Number.parseFloat(item.rating.replace(/[^\d.]/g, ""));
  const personalRating = Number.isFinite(numericRating)
    ? Math.max(0, Math.min(5, numericRating / 2))
    : 4.5;
  const fullStars = Math.floor(personalRating);
  const hasHalfStar = personalRating - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));
  const status = item.status ?? "On Hold";
  const statusTone = getStatusBadgeTone(status);

  return (
    <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Clapperboard size={28} className="shrink-0 text-[#A1A1AA]" />
          <h1 className="truncate text-2xl font-semibold leading-none text-[#D4D4D8] sm:text-[30px]">
            {item.title}
          </h1>
        </div>

        <Button
          type="button"
          variant="surface"
          onClick={onBack}
          className="h-9 px-3 text-sm"
        >
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
        <section className="flex w-full max-w-[320px] flex-col gap-8 self-center sm:max-w-[400px] xl:self-auto">
          <div className="relative aspect-[2/3] max-h-[600px] w-full overflow-hidden rounded-[4px] shadow-[4px_0px_16px_rgba(164,37,36,0.18)]">
            <img
              src={item.posterUrl ?? BatmanPoster}
              alt={item.title}
              className="h-full w-full object-cover"
            />

            <StatusBadge
              status={status}
              className={cn(
                "absolute left-3 top-3 h-[35px] gap-3 rounded-[4px] bg-[#27272A]/60 px-3 text-[18px] font-medium leading-[27px] backdrop-blur-[4px] [&_svg]:size-5",
                statusTone.text,
                statusTone.border
              )}
            />
          </div>

          <div className="flex flex-col gap-4">
            <InfoPill
              icon={<Clapperboard size={24} />}
              label="Content Type"
              value={item.type}
            />
            <InfoPill
              icon={<CalendarDays size={24} />}
              label="Release Date"
              value={item.date}
            />
            <InfoPill
              icon={<Star size={24} />}
              label="Public Rating"
              value={item.rating}
            />

            <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
              <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                <Sparkles size={24} />
                Personal Rating
              </span>
              <div className="inline-flex items-center gap-0.5 px-3">
                {Array.from(
                  { length: fullStars },
                  (_, slot) => `full-${slot + 1}`
                ).map((key) => (
                  <Star
                    key={key}
                    size={20}
                    className="fill-[#FACC15] text-[#FACC15]"
                  />
                ))}
                {hasHalfStar ? (
                  <Star
                    size={20}
                    className="fill-[#FACC15]/50 text-[#FACC15]"
                  />
                ) : null}
                {Array.from(
                  { length: emptyStars },
                  (_, slot) => `empty-${slot + 1}`
                ).map((key) => (
                  <Star key={key} size={20} className="text-[#FACC15]" />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-[35px] items-center rounded-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-6 pt-2 xl:pt-10">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[20px] font-semibold leading-6 text-[#FAFAFA]">
              Content Nodes
            </h2>

            <Button
              type="button"
              variant="surface"
              className="h-9 w-fit px-3 text-sm"
            >
              <Plus size={16} />
              Add New
            </Button>
          </div>

          <div className="flex w-full flex-col gap-3">
            {[`${item.title}: Blu-ray 2160p`, `${item.title}: 1080P`].map(
              (nodeTitle) => (
                <div
                  key={nodeTitle}
                  className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                >
                  <div className="flex h-[41px] min-w-0 w-full items-center gap-1.5 rounded-[8px] bg-[#27272A] px-3 text-left sm:flex-1">
                    <GripVertical
                      size={20}
                      className="shrink-0 text-[#A1A1AA]"
                    />
                    <span className="truncate text-[18px] font-semibold leading-[27px] text-[#D4D4D8]">
                      {nodeTitle}
                    </span>
                  </div>

                  <NodeActions />
                </div>
              )
            )}

            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="flex h-[41px] min-w-[250px] flex-1 items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-3 text-[#71717A]">
                <Type size={16} />
                <span className="text-[18px] font-semibold leading-[27px]">
                  Movie name
                </span>
              </div>
              <div className="flex h-10 min-w-[250px] flex-1 items-center gap-2 rounded-[6px] border border-[#3F3F46] bg-[#27272A] px-3 text-[#71717A]">
                <Link2 size={16} />
                <span className="truncate text-[16px] leading-6">
                  http://sample.link
                </span>
              </div>
              <IconButton label="Save node">
                <Save size={16} />
              </IconButton>
              <IconButton label="Delete node" danger>
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
      <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
        {icon}
        {label}
      </span>
      <span className="px-3 text-[18px] font-medium leading-[27px] text-[#D4D4D8]">
        {value}
      </span>
    </div>
  );
}

function NodeActions() {
  return (
    <div className="ml-auto flex items-center gap-2 sm:ml-0">
      <IconButton label="Link node">
        <Link2 size={16} />
      </IconButton>
      <IconButton label="Edit node">
        <Pencil size={16} />
      </IconButton>
      <IconButton label="Delete node" danger>
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  danger,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={danger ? "danger-surface" : "surface"}
      size="icon"
      aria-label={label}
      className="h-10 w-10"
    >
      {children}
    </Button>
  );
}
