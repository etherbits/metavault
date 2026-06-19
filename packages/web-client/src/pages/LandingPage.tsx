import {
  Archive,
  Bot,
  CheckCircle2,
  Database,
  FileDown,
  FileUp,
  Keyboard,
  Library,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { Link } from "react-router";
import { MediaCard } from "@/components/MediaCard";
import { MetaIcon } from "@/components/MetaIcon";
import {
  CanonicalQueryPreview,
  QueryExecutionState,
} from "@/components/QueryFeedback";
import { QueryInput } from "@/components/QueryInput";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/features/library/types";

const command = "/c title:Dune type:Book status:Planning";
const canonicalQuery = "/create title:Dune type:Book status:Planning";
const restingTilt = {
  x: 4,
  y: -6,
};

const landingItems: MediaItem[] = [
  {
    id: "landing-dune",
    title: "Dune",
    type: "Book",
    status: "Planning",
    releasedAt: "1965",
    rating: "8.7",
    adult: false,
    personalRating: null,
    posterUrl: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    tags: [
      { id: "landing-dune-space", value: "space opera", weight: "major" },
      { id: "landing-dune-politics", value: "politics", weight: "major" },
    ],
  },
  {
    id: "landing-severance",
    title: "Severance",
    type: "TV Show",
    status: "In Progress",
    releasedAt: "2022",
    rating: "8.7",
    adult: false,
    personalRating: null,
    posterUrl:
      "https://image.tmdb.org/t/p/original/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
    tags: [
      { id: "landing-severance-mystery", value: "mystery", weight: "major" },
      {
        id: "landing-severance-workplace",
        value: "workplace",
        weight: "major",
      },
    ],
  },
];

const commandFlows = [
  {
    command: "/c title:Dune type:Book status:Planning",
    title: "Create entries from a single line",
    body: "Add books, shows, games, and films with the fields you already know.",
    icon: Library,
  },
  {
    command: "/s status:In_Progress tag:space",
    title: "Search what is already in the library",
    body: "Run focused searches from the same input used for creation.",
    icon: Search,
  },
  {
    command: "/u title:Severance > status:Finished",
    title: "Update entries without leaving the keyboard",
    body: "Change status and other supported fields once an entry is in your vault.",
    icon: CheckCircle2,
  },
  {
    command: "/d title:Old draft",
    title: "Remove entries deliberately",
    body: "Clean up the library through the query flow instead of hunting through menus.",
    icon: Archive,
  },
];

const archiveFeatures = [
  {
    title: "Metadata enrichment",
    body: "Configured sources can fill in posters, dates, ratings, and tags for entries.",
    icon: Sparkles,
  },
  {
    title: "Statuses and collections",
    body: "Home groups entries by progress, recency, and custom collections.",
    icon: Tags,
  },
  {
    title: "Import and export",
    body: "Move a library archive out as a zip and bring it back in later.",
    icon: FileDown,
  },
  {
    title: "Assistant with visible context",
    body: "The assistant can use the current query and visible result set on the Query page.",
    icon: Bot,
  },
];

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="bg-[#18181B] text-[#FAFAFA]">
      <HeroScreen reduceMotion={reduceMotion} />
      <CommandScreen />
      <ArchiveScreen />
    </main>
  );
}

function HeroScreen({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <section
      className="relative flex min-h-dvh overflow-hidden px-4 sm:px-8 lg:h-dvh"
      data-landing-screen="hero"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#3F3F46]" />
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[1728px] items-center justify-between px-4 py-5 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-[8px] text-[#E4E4E7] outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/70"
          aria-label="Metavault home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#27272A]">
            <MetaIcon className="h-8 w-8" />
          </span>
          <span className="text-[16px] font-semibold">MetaVault</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Public actions">
          <Button asChild variant="ghost" className="text-[#D4D4D8]">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild variant="brand" className="h-9 px-3">
            <Link to="/register">Create account</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto grid min-h-dvh w-full max-w-[1728px] items-start gap-3 pt-[72px] pb-6 sm:gap-16 sm:pt-24 sm:pb-10 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(620px,0.86fr)_minmax(0,1.14fr)] lg:pt-36 lg:pb-24 xl:gap-20 xl:pt-60 xl:pb-36 2xl:grid-cols-[minmax(650px,0.84fr)_minmax(943px,1fr)] 2xl:gap-24 [@media_(min-width:1024px)_and_(max-height:800px)]:grid-cols-[minmax(520px,0.8fr)_minmax(0,1.2fr)] [@media_(min-width:1024px)_and_(max-height:800px)]:pt-32 [@media_(min-width:1024px)_and_(max-height:800px)]:pb-12">
        <div className="flex max-w-[780px] flex-col gap-4 sm:gap-8 lg:self-start">
          <div className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 py-2 text-sm font-medium text-[#D4D4D8] shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
            <Keyboard size={16} className="text-[#FACC15]" />
            Keyboard-first media tracking
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <h1 className="max-w-[760px] text-[32px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[66px] sm:leading-[1] lg:text-[70px] xl:text-[78px] [@media_(min-width:1024px)_and_(max-height:800px)]:text-[60px]">
              Command your personal media vault.
            </h1>
            <p className="max-w-[700px] text-[15px] leading-6 text-[#D4D4D8] sm:text-[20px] sm:leading-9">
              Metavault turns the things you mean to watch, read, and play into
              a searchable library you can shape from one fast command line.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-10 px-4">
              <Link to="/register">
                <Library size={16} />
                Create your vault
              </Link>
            </Button>
            <Button asChild variant="surface" className="h-10 px-4">
              <Link to="/login">
                <Search size={16} />
                Open existing vault
              </Link>
            </Button>
          </div>
        </div>

        <VaultFlowVisual reduceMotion={reduceMotion} />
      </div>
    </section>
  );
}

function VaultFlowVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [enableTilt, setEnableTilt] = useState(false);
  const [typedCommand, setTypedCommand] = useState(reduceMotion ? command : "");
  const [stage, setStage] = useState<"typing" | "loading" | "results">(
    reduceMotion ? "results" : "typing"
  );
  const getRestingTilt = useCallback(
    () => (reduceMotion || !enableTilt ? { x: 0, y: 0 } : restingTilt),
    [enableTilt, reduceMotion]
  );
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, {
    stiffness: 170,
    damping: 22,
    mass: 0.5,
  });
  const springRotateY = useSpring(rotateY, {
    stiffness: 170,
    damping: 22,
    mass: 0.5,
  });

  useLayoutEffect(() => {
    const updateTiltMode = () => {
      setEnableTilt(window.matchMedia("(min-width: 1024px)").matches);
    };

    updateTiltMode();
    window.addEventListener("resize", updateTiltMode);

    return () => window.removeEventListener("resize", updateTiltMode);
  }, []);

  useEffect(() => {
    const tilt = getRestingTilt();
    rotateX.set(tilt.x);
    rotateY.set(tilt.y);
  }, [getRestingTilt, rotateX, rotateY]);

  useEffect(() => {
    const tilt = getRestingTilt();
    rotateX.set(tilt.x);
    rotateY.set(tilt.y);

    if (reduceMotion) {
      setTypedCommand(command);
      setStage("results");
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    setTypedCommand("");
    setStage("typing");

    command.split("").forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) {
            setTypedCommand(command.slice(0, index + 1));
          }
        }, 34 * index)
      );
    });

    const loadingDelay = command.length * 34 + 260;
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) {
          setStage("loading");
        }
      }, loadingDelay)
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) {
          setStage("results");
        }
      }, loadingDelay + 940)
    );

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [getRestingTilt, reduceMotion, rotateX, rotateY]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    if (reduceMotion || !enableTilt) {
      return;
    }

    const tilt = getRestingTilt();
    rotateX.set(tilt.x + y * -7);
    rotateY.set(tilt.y + x * 9);
  }

  function handlePointerLeave() {
    const tilt = getRestingTilt();
    rotateX.set(tilt.x);
    rotateY.set(tilt.y);
  }

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[943px] lg:mx-0 lg:translate-y-8 lg:self-center lg:justify-self-end xl:translate-y-6 [@media_(min-width:1024px)_and_(max-height:800px)]:max-w-[650px] [@media_(min-width:1024px)_and_(max-height:800px)]:translate-y-0">
      <div className="absolute inset-x-12 top-10 h-56 rounded-full bg-[#FACC15]/10 blur-3xl" />
      <motion.div
        aria-hidden="true"
        className="relative isolate w-full origin-center overflow-hidden rounded-[12px] border border-[#3F3F46] bg-[#09090B] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.42)] transform-gpu sm:p-[30px] [@media_(min-width:1024px)_and_(max-height:800px)]:p-5"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformPerspective: 1200,
        }}
      >
        <div className="relative z-10 flex items-center justify-between border-[#3F3F46] border-b pb-3 sm:pb-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[#D4D4D8]">
            <Database size={16} className="text-[#FACC15]" />
            Query console
          </div>
          <span className="rounded-[6px] border border-[#3F3F46] bg-white/5 px-2 py-1 text-[12px] font-semibold text-[#A1A1AA]">
            EZQ
          </span>
        </div>

        <div className="relative z-10 mt-3 sm:mt-[25px] [@media_(min-width:1024px)_and_(max-height:800px)]:mt-4">
          <QueryInput
            value={typedCommand}
            action="create"
            readOnly
            placeholder="Query your library with EZQ"
          />
        </div>

        <div className="relative z-10 mt-3">
          <CanonicalQueryPreview
            query={stage === "typing" ? "/create" : canonicalQuery}
          />
        </div>

        <div className="relative z-10 mt-3 max-w-full rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-3 sm:mt-[30px] sm:w-fit sm:p-5 [@media_(min-width:1024px)_and_(max-height:800px)]:mt-4 [@media_(min-width:1024px)_and_(max-height:800px)]:p-4">
          <div className="mb-3 flex items-center justify-between sm:mb-5">
            <span className="text-sm font-semibold text-[#E4E4E7]">
              Query results
            </span>
            <span className="rounded-[6px] border border-[#3F3F46] bg-white/5 px-2 py-1 text-[12px] font-semibold text-[#A1A1AA]">
              {landingItems.length} entries
            </span>
          </div>

          <QueryExecutionState
            isExecuting={stage === "loading"}
            resultCount={stage === "results" ? landingItems.length : 0}
            emptyLabel="Awaiting query"
          />

          <div className="mt-3 grid w-fit max-w-full justify-center gap-3 sm:grid-cols-[repeat(2,minmax(0,413px))] sm:justify-start sm:gap-[15px] [@media_(min-width:1024px)_and_(max-height:800px)]:grid-cols-[repeat(2,minmax(0,285px))] [@media_(min-width:1024px)_and_(max-height:800px)]:gap-3">
            {landingItems.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 18 }}
                animate={
                  stage === "results"
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                transition={{
                  duration: 0.42,
                  delay: index * 0.12,
                  ease: "easeOut",
                }}
                className={index > 0 ? "hidden w-full sm:block" : "w-full"}
              >
                <MediaCard item={entry} variant="compact" showActions={false} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CommandScreen() {
  return (
    <section
      className="flex min-h-dvh items-center overflow-hidden border-[#3F3F46]/70 border-t bg-[#09090B]/35 px-4 py-10 sm:px-8 lg:h-dvh lg:py-0"
      data-landing-screen="commands"
    >
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.42, once: false }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid w-full max-w-[1488px] items-center gap-6 sm:gap-14 lg:grid-cols-[0.86fr_1.14fr]"
      >
        <div className="flex max-w-[560px] flex-col gap-3 sm:gap-5">
          <span className="text-sm font-semibold text-[#FACC15]">
            Command your library
          </span>
          <h2 className="text-[34px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[58px]">
            The input is the interface.
          </h2>
          <p className="text-[15px] leading-7 text-[#D4D4D8] sm:text-[17px] sm:leading-8">
            EZQ is the working surface for creating, searching, updating, and
            deleting library entries. When a command is valid, Metavault shows
            the canonical version so the action is explicit before it changes
            the library.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          {commandFlows.map((flow, index) => {
            const Icon = flow.icon;
            return (
              <motion.article
                key={flow.command}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5, once: false }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-col justify-between gap-2 rounded-[8px] border border-[#3F3F46] bg-[#27272A] p-2.5 shadow-[0_18px_32px_rgba(0,0,0,0.18)] sm:min-h-[152px] sm:gap-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FACC15]">
                    <Icon size={18} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[17px] font-semibold leading-5 text-[#FAFAFA] sm:text-[20px] sm:leading-7">
                      {flow.title}
                    </h3>
                    <p className="text-[13px] leading-[18px] text-[#A1A1AA] sm:text-[15px] sm:leading-6">
                      {flow.body}
                    </p>
                  </div>
                </div>
                <code className="w-fit max-w-full break-words rounded-[6px] bg-[#18181B] px-2 py-1 font-mono text-[13px] leading-5 text-[#FAFAFA]">
                  {flow.command}
                </code>
              </motion.article>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

function ArchiveScreen() {
  return (
    <section
      className="flex min-h-dvh items-center overflow-hidden border-[#3F3F46]/70 border-t px-4 py-10 sm:px-8 lg:h-dvh lg:py-0"
      data-landing-screen="archive"
    >
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.42, once: false }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid w-full max-w-[1488px] items-center gap-5 sm:gap-14 lg:grid-cols-[1fr_0.78fr]"
      >
        <div className="order-2 grid gap-2 sm:grid-cols-2 sm:gap-4 lg:order-1">
          {archiveFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.45, once: false }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex min-h-[96px] flex-col justify-between rounded-[8px] border border-[#3F3F46] bg-[#27272A] p-3 shadow-[0_18px_32px_rgba(0,0,0,0.18)] sm:min-h-[245px] sm:p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FACC15] sm:h-10 sm:w-10">
                  <Icon size={18} />
                </div>
                <div className="mt-2 flex flex-col gap-1 sm:mt-8 sm:gap-3">
                  <h2 className="text-[16px] font-semibold leading-5 text-[#F4F4F5] sm:text-[22px] sm:leading-7">
                    {feature.title}
                  </h2>
                  <p className="text-[13px] leading-4 text-[#A1A1AA] sm:text-[15px] sm:leading-6">
                    {feature.body}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="order-1 flex max-w-[520px] flex-col gap-2 sm:gap-6 lg:order-2 lg:ml-auto">
          <span className="text-sm font-semibold text-[#FACC15]">
            Keep the archive alive
          </span>
          <h2 className="text-[29px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[58px]">
            Organize what you collect, then take it with you.
          </h2>
          <p className="text-[14px] leading-6 text-[#D4D4D8] sm:text-[17px] sm:leading-8">
            Metavault stays close to the actual library: statuses for progress,
            collections for taste, enrichment for missing details, and archive
            import/export when you want control over the data.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button asChild variant="brand" className="h-10 px-4">
              <Link to="/register">
                <FileUp size={16} />
                Start collecting
              </Link>
            </Button>
            <Button asChild variant="surface" className="h-10 px-4">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
