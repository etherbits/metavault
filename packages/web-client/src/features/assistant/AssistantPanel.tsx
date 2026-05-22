import { ArrowUp, ChevronDown, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AssistantPanelProps {
  draft: string;
  onDraftChange: (value: string) => void;
}

export function AssistantPanel({ draft, onDraftChange }: AssistantPanelProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#18181B]/[0.82] backdrop-blur-[1px]" />

      <section className="fixed bottom-12 right-4 z-50 flex h-[500px] w-[calc(100vw-2rem)] max-w-[500px] flex-col gap-5 rounded-[8px] bg-[#18181B] px-5 pb-5 pt-3 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] sm:right-12">
        <div className="flex h-8 min-w-0 items-center gap-3">
          <h3 className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-6 text-[#E4E4E7]">
            Metavault Assistant Chat
          </h3>

          <Button
            type="button"
            variant="surface"
            className="h-8 w-[166px] justify-between px-2 py-1 text-xs"
          >
            <span className="truncate">Could you describe the...</span>
            <ChevronDown size={16} className="text-[#A1A1AA]" />
          </Button>

          <Button
            type="button"
            variant="surface"
            size="icon"
            className="h-8 w-8"
          >
            <MessageSquarePlus size={16} />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-1 flex-col gap-5 px-2">
            <p className="text-[16px] leading-6 text-[#D4D4D8]">
              How can I help?
            </p>

            <div className="flex justify-end">
              <div className="rounded-[6px] bg-[#27272A] px-3 py-2 text-[16px] leading-6 text-[#E4E4E7]">
                Could you describe the current results?
              </div>
            </div>

            <p className="text-[16px] leading-6 text-[#D4D4D8]">
              It seems like you have 150 identical entries of the movie "The
              Batman". It might be caused by data duplication on the server
              side.
            </p>
          </div>

          <div className="relative">
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              className="h-[100px] pr-12"
              placeholder="Could you give me a recommendation, based on the current results"
            />

            <Button
              type="button"
              variant="brand"
              size="icon"
              className="absolute bottom-2 right-2 h-9 w-9"
            >
              <ArrowUp size={20} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
