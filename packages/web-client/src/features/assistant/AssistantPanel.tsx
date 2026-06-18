import {
  ArrowUp,
  Check,
  ChevronDown,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ASSISTANT_MESSAGE_MAX_LENGTH } from "../../../../server/assistant/assistant.schema";

interface AssistantPanelProps {
  draft: string;
  sessions: AssistantSession[];
  activeSessionId: string;
  isSending?: boolean;
  errorMessage?: string | null;
  fullscreen?: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onToggleFullscreen: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
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
  fullscreen = false,
  onSelectSession,
  onNewSession,
  onToggleFullscreen,
  onDraftChange,
  onSubmit,
  onClose,
}: AssistantPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSessionIdRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );
  const messages = activeSession?.messages ?? [];
  const draftLength = draft.length;

  useLayoutEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!activeSession || !scrollContainer) return;

    const sessionChanged = lastSessionIdRef.current !== activeSession.id;
    lastSessionIdRef.current = activeSession.id;

    if (sessionChanged) {
      stickToBottomRef.current = true;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      return;
    }

    if (!stickToBottomRef.current) return;

    const frameId = requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeSession]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDraftKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const handleMessagesScroll = () => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const distanceFromBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;

    stickToBottomRef.current = distanceFromBottom < 80;
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close assistant chat"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-[linear-gradient(135deg,rgba(24,24,27,0.04)_0%,rgba(24,24,27,0.08)_20%,rgba(24,24,27,0.16)_42%,rgba(24,24,27,0.34)_66%,rgba(24,24,27,0.56)_84%,rgba(24,24,27,0.76)_100%)] backdrop-blur-[1px]"
      />

      <section
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden rounded-[8px] border border-[#27272A] bg-[#18181B] shadow-[0px_24px_60px_rgba(0,0,0,0.42)]",
          fullscreen
            ? "inset-3 sm:inset-6"
            : "bottom-4 right-4 h-[min(560px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[540px] sm:bottom-12 sm:right-12 sm:h-[min(560px,calc(100dvh-6rem))]"
        )}
      >
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

          <Button
            type="button"
            variant="surface"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-8 w-8"
            aria-label={
              fullscreen
                ? "Exit fullscreen assistant chat"
                : "Fullscreen assistant chat"
            }
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>

          <Button
            type="button"
            variant="surface"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close assistant chat"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleMessagesScroll}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5",
              fullscreen && "mx-auto w-full max-w-[960px]"
            )}
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
                    <div
                      className={cn(
                        "assistant-markdown rounded-[8px] bg-[#27272A] px-3 py-2 text-[15px] leading-6 text-[#F4F4F5] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                        fullscreen ? "max-w-[70%]" : "max-w-[82%]"
                      )}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={cn(
                      "assistant-markdown text-[15px] leading-6 text-[#D4D4D8]",
                      fullscreen ? "max-w-[78%]" : "max-w-[92%]"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
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
            <div
              className={cn(
                "relative",
                fullscreen && "mx-auto w-full max-w-[960px]"
              )}
            >
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                maxLength={ASSISTANT_MESSAGE_MAX_LENGTH}
                className={cn(
                  "resize-none pr-28",
                  fullscreen ? "h-[128px]" : "h-[104px]"
                )}
                placeholder="Could you give me a recommendation, based on the current results"
              />

              <span
                className={cn(
                  "pointer-events-none absolute bottom-3.5 right-12 text-[12px] leading-8 text-[#71717A]",
                  draftLength > ASSISTANT_MESSAGE_MAX_LENGTH * 0.9 &&
                    "text-[#A1A1AA]"
                )}
              >
                {draftLength}/{ASSISTANT_MESSAGE_MAX_LENGTH}
              </span>

              <Button
                type="button"
                variant="brand"
                size="icon"
                onClick={onSubmit}
                disabled={isSending || draft.trim().length === 0}
                className="absolute bottom-3.5 right-3.5 h-8 w-8 rounded-[8px] border border-[#FDE047]/20 bg-[#B99A20] text-[#09090B] shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-all hover:bg-[#FACC15] hover:shadow-[0_10px_22px_rgba(250,204,21,0.18)] disabled:border-transparent disabled:bg-[#3F3F46] disabled:text-[#71717A] disabled:shadow-none"
                aria-label="Send assistant message"
              >
                <ArrowUp size={16} strokeWidth={2.4} />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
