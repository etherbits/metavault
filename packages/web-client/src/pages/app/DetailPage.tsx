import { CalendarDays, Clapperboard, Sparkles, Star } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import BatmanPoster from "@/assets/download.jpeg";
import { StatusBadge, getStatusBadgeTone } from "@/components/Badges";
import { PersonalRatingControl } from "@/components/PersonalRatingControl";
import { Button } from "@/components/ui/button";
import { ContentNodesSection } from "@/features/content-nodes/ContentNodesSection";
import {
  useLibraryEntry,
  useUpdateLibraryEntryPersonalRating,
} from "@/features/library/hooks";
import type { MediaItem } from "@/features/library/types";
import { cn } from "@/lib/utils";

export function DetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const itemQuery = useLibraryEntry(itemId ?? null);

  if (itemQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FAFAFA]" />
      </div>
    );
  }

  const item = itemQuery.data;
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
  const updatePersonalRating = useUpdateLibraryEntryPersonalRating();
  const [optimisticPersonalRating, setOptimisticPersonalRating] = useState<{
    id: string;
    value: number;
  } | null>(null);
  const displayedPersonalRating =
    optimisticPersonalRating?.id === item.id
      ? optimisticPersonalRating.value
      : item.personalRating;
  const status = item.status ?? "On Hold";
  const statusTone = getStatusBadgeTone(status);

  function updateRating(personalRating: number) {
    setOptimisticPersonalRating({ id: item.id, value: personalRating });
    updatePersonalRating.mutate(
      {
        id: item.id,
        personalRating,
      },
      {
        onError: () =>
          setOptimisticPersonalRating((current) =>
            current?.id === item.id ? null : current
          ),
      }
    );
  }

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

      <div className="flex flex-col gap-8 xl:flex-row xl:gap-10 ">
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

          <div className="flex flex-col gap-8">
            <InfoPill
              icon={<Clapperboard size={24} />}
              label="Content Type"
              value={item.type}
            />
            <InfoPill
              icon={<CalendarDays size={24} />}
              label="Release Date"
              value={item.releasedAt}
            />
            <div className="inline-flex h-10 w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
              <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                <Star size={24} />
                Public Rating
              </span>
              <span className="inline-flex h-full items-center px-3">
                <span className="text-[18px] font-medium leading-[27px] text-[#D4D4D8]">
                  {item.rating}
                </span>
              </span>
            </div>

            <div className="inline-flex h-10 w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
              <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                <Sparkles size={24} />
                Personal Rating
              </span>
              <span className="inline-flex h-full items-center px-3">
                <PersonalRatingControl
                  value={displayedPersonalRating}
                  onChange={updateRating}
                  disabled={updatePersonalRating.isPending}
                />
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              {item.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex h-[35px] items-center rounded-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]"
                >
                  {tag.value}
                </span>
              ))}
            </div>
          </div>
        </section>

        <ContentNodesSection libraryEntryId={item.id} />
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
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
