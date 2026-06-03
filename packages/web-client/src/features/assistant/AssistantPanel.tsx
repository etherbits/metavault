import { ArrowUp, Check, ChevronDown, MessageSquarePlus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssistantPanelProps {
  draft: string;
  sessions: AssistantSession[];
  activeSessionId: string;
  isSending?: boolean;
  errorMessage?: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AssistantSession = {
  id: string;
  title: string;
  messages: AssistantMessage[];
};

export function AssistantPanel({
  draft,
  sessions,
  activeSessionId,
  isSending = false,
  errorMessage = null,
  onSelectSession,
  onNewSession,
  onDraftChange,
  onSubmit,
}: AssistantPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#18181B]/[0.82] backdrop-blur-[1px]" />

      <section className="fixed bottom-12 right-4 z-50 flex h-[560px] w-[calc(100vw-2rem)] max-w-[540px] flex-col overflow-hidden rounded-[8px] border border-[#27272A] bg-[#18181B] shadow-[0px_24px_60px_rgba(0,0,0,0.42)] sm:right-12">
        <div className="flex min-h-14 min-w-0 items-center gap-3 border-b border-[#27272A] px-5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[18px] font-semibold leading-6 text-[#F4F4F5]">
              Metavault Assistant
            </h3>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                type="button"
                variant="surface"
                className="h-8 w-[190px] justify-between px-2 text-xs"
              >
                <span className="truncate">
                  {activeSession?.title ?? "New chat"}
                </span>
                <ChevronDown size={16} className="text-[#A1A1AA]" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-[70] flex w-[240px] flex-col gap-1 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-1 shadow-[0px_20px_45px_rgba(0,0,0,0.45)]"
              >
                {sessions.map((session) => (
                  <DropdownMenu.Item
                    key={session.id}
                    onSelect={() => onSelectSession(session.id)}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-[13px] leading-5 text-[#D4D4D8] outline-none hover:bg-white/10 focus:bg-white/10",
                      session.id === activeSessionId && "text-[#FAFAFA]"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {session.title}
                    </span>
                    {session.id === activeSessionId ? (
                      <Check size={14} className="text-[#FACC15]" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Button
            type="button"
            variant="surface"
            size="icon"
            onClick={onNewSession}
            className="h-8 w-8"
            aria-label="New assistant chat"
          >
            <MessageSquarePlus size={16} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
          >
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-[16px] leading-6 text-[#D4D4D8]">
                  How can I help?
                </p>
              </div>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-[8px] bg-[#27272A] px-3 py-2 text-[15px] leading-6 text-[#F4F4F5] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className="max-w-[92%] whitespace-pre-wrap text-[15px] leading-6 text-[#D4D4D8]"
                  >
                    {message.content}
                  </div>
                )
              )
            )}

            {isSending ? (
              <p className="text-[14px] leading-5 text-[#A1A1AA]">
                Thinking...
              </p>
            ) : null}

            {errorMessage ? (
              <p className="text-[14px] leading-5 text-[#FCA5A5]">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[#27272A] p-4">
            <div className="relative">
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                className="h-[104px] pr-12"
                placeholder="Could you give me a recommendation, based on the current results"
              />

              <Button
                type="button"
                variant="brand"
                size="icon"
                onClick={onSubmit}
                disabled={isSending || draft.trim().length === 0}
                className="absolute bottom-2 right-2 h-9 w-9"
              >
                <ArrowUp size={20} />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
