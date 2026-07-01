import {
  Archive,
  Blocks,
  Bot,
  CheckCircle2,
  Database,
  FileDown,
  HatGlasses,
  Library,
  type LucideIcon,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  motion,
  type TargetAndTransition,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  type CSSProperties,
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

const command = "/c Dune type:Book status:Planning";
const canonicalQuery = "/create title:Dune type:Book status:Planning";
const restingTilt = {
  x: 4,
  y: -6,
};
const revealEase = [0.22, 1, 0.36, 1] as const;
const chipClassName =
  "inline-flex w-fit items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-[#18181B]/95 px-3 py-2 text-sm font-medium text-[#D4D4D8] shadow-[0_10px_24px_rgba(0,0,0,0.16)]";
const cardClassName =
  "rounded-[8px] border border-[#3F3F46] bg-[#18181B]/95 shadow-[0_18px_38px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]";
const iconTileClassName =
  "shrink-0 rounded-[8px] border border-[#3F3F46] bg-[#09090B] text-[#FACC16]";

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

const heroHighlights = [
  { label: "Own your data", icon: Library },
  { label: "Feel secure", icon: HatGlasses },
  { label: "Extend as desired", icon: Blocks },
];

const commandFlows = [
  {
    command: "/c Dune type:Book status:Planning",
    title: "Add a title without opening a form",
    body: "Type what you know. It creates the entry and leaves you on the query page.",
    icon: Library,
  },
  {
    command: "/s In_Progress tag:space",
    title: "Search the way you remember things",
    body: "Use status, tags, ratings, collections, or a plain title in the same input.",
    icon: Search,
  },
  {
    command: "/u Severance > status:Finished",
    title: "Update progress quickly",
    body: "Move something from planning to watching, finished, dropped, or whatever state fits.",
    icon: CheckCircle2,
  },
  {
    command: "/d Old draft",
    title: "Clean up with a clear target",
    body: "Use the same filters you search with when you need to remove entries.",
    icon: Archive,
  },
];

const archiveFeatures = [
  {
    title: "Fill in missing details",
    body: "Pull posters, release years, public ratings, and tags from catalogue sources.",
    icon: Sparkles,
  },
  {
    title: "Rate on your own scale",
    body: "Personal ratings stay separate from public scores, so recommendations can reflect your taste.",
    icon: Tags,
  },
  {
    title: "Move your data",
    body: "Export the library as a zip and import it again without rebuilding the archive manually.",
    icon: FileDown,
  },
  {
    title: "Ask with context",
    body: "Ask your personal AI assistant about the query and results currently on screen. Get recommendations.",
    icon: Bot,
  },
];

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative isolate overflow-hidden bg-[#18181B] text-[#FAFAFA]">
      <LandingGridBackground reduceMotion={reduceMotion} />
      <HeroScreen reduceMotion={reduceMotion} />
      <CommandScreen reduceMotion={reduceMotion} />
      <ArchiveScreen reduceMotion={reduceMotion} />
    </main>
  );
}

function LandingGridBackground({
  reduceMotion,
}: {
  reduceMotion: boolean | null;
}) {
  const pulseMask =
    "radial-gradient(circle at 64% 18%, transparent 0px, transparent var(--pulse-inner), rgba(0,0,0,0.42) var(--pulse-soft-inner), black var(--pulse-core), rgba(0,0,0,0.42) var(--pulse-soft-outer), transparent var(--pulse-outer))";
  const pulseStart = {
    opacity: 0,
    "--pulse-inner": "18px",
    "--pulse-soft-inner": "84px",
    "--pulse-core": "152px",
    "--pulse-soft-outer": "222px",
    "--pulse-outer": "300px",
  } as TargetAndTransition;
  const pulseAnimation = reduceMotion
    ? ({ opacity: 0.06 } satisfies TargetAndTransition)
    : ({
        opacity: [0, 0.26, 0.18, 0],
        "--pulse-inner": ["18px", "1600px"],
        "--pulse-soft-inner": ["84px", "1780px"],
        "--pulse-core": ["152px", "1960px"],
        "--pulse-soft-outer": ["222px", "2140px"],
        "--pulse-outer": ["300px", "2320px"],
      } as TargetAndTransition);
  const pulseGridStyle = {
    backgroundImage:
      "linear-gradient(rgba(250,204,22,0.96) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,22,0.96) 1px, transparent 1px)",
    backgroundPosition: "center top",
    backgroundSize: "56px 56px",
    filter: "drop-shadow(0 0 12px rgba(250,204,22,0.38))",
    maskImage: reduceMotion
      ? "radial-gradient(circle at 64% 18%, black 0px, transparent 520px)"
      : pulseMask,
    WebkitMaskImage: reduceMotion
      ? "radial-gradient(circle at 64% 18%, black 0px, transparent 520px)"
      : pulseMask,
    "--pulse-inner": "24px",
    "--pulse-soft-inner": "66px",
    "--pulse-core": "122px",
    "--pulse-soft-outer": "178px",
    "--pulse-outer": "236px",
  } as CSSProperties &
    Record<
      | "--pulse-core"
      | "--pulse-inner"
      | "--pulse-outer"
      | "--pulse-soft-inner"
      | "--pulse-soft-outer",
      string
    >;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(113,113,122,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.18) 1px, transparent 1px)",
          backgroundPosition: "center top",
          backgroundSize: "56px 56px",
          opacity: 0.18,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 7%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 7%, black 92%, transparent 100%)",
        }}
      />

      <motion.div
        className="absolute inset-0"
        initial={reduceMotion ? false : pulseStart}
        animate={pulseAnimation}
        transition={
          reduceMotion
            ? undefined
            : {
                opacity: {
                  duration: 7.6,
                  ease: "linear",
                  repeat: Infinity,
                  repeatDelay: 0.35,
                  times: [0, 0.24, 0.72, 1],
                },
                "--pulse-core": {
                  duration: 7.6,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: Infinity,
                  repeatDelay: 0.35,
                },
                "--pulse-inner": {
                  duration: 7.6,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: Infinity,
                  repeatDelay: 0.35,
                },
                "--pulse-outer": {
                  duration: 7.6,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: Infinity,
                  repeatDelay: 0.35,
                },
                "--pulse-soft-inner": {
                  duration: 7.6,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: Infinity,
                  repeatDelay: 0.35,
                },
                "--pulse-soft-outer": {
                  duration: 7.6,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: Infinity,
                  repeatDelay: 0.35,
                },
              }
        }
        style={pulseGridStyle}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,transparent_0%,rgba(24,24,27,0.08)_42%,rgba(9,9,11,0.38)_100%)]" />
    </div>
  );
}

function HeroScreen({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <section
      className="relative z-10 flex min-h-dvh overflow-hidden px-4 sm:px-8 lg:h-dvh"
      data-landing-screen="hero"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#3F3F46]" />
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[1728px] items-center justify-between px-4 py-5 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-[8px] text-[#E4E4E7] outline-none focus-visible:ring-2 focus-visible:ring-[#FACC16]/70"
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
          <Button
            asChild
            variant="brand"
            className="h-9 px-3 max-[430px]:hidden"
          >
            <Link to="/register">Create account</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto grid min-h-dvh w-full max-w-[1728px] items-start gap-3 pt-[72px] pb-6 sm:gap-16 sm:pt-24 sm:pb-10 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(620px,0.86fr)_minmax(0,1.14fr)] lg:pt-36 lg:pb-24 xl:gap-20 xl:pt-60 xl:pb-36 2xl:grid-cols-[minmax(650px,0.84fr)_minmax(943px,1fr)] 2xl:gap-24 [@media_(min-width:1024px)_and_(max-height:800px)]:grid-cols-[minmax(520px,0.8fr)_minmax(0,1.2fr)] [@media_(min-width:1024px)_and_(max-height:800px)]:pt-32 [@media_(min-width:1024px)_and_(max-height:800px)]:pb-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-[780px] flex-col gap-4 sm:gap-8 lg:self-start"
        >
          <div className="flex flex-wrap items-center gap-2">
            {heroHighlights.map((highlight) => (
              <HeroChip
                key={highlight.label}
                icon={highlight.icon}
                label={highlight.label}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <h1 className="max-w-[760px] text-[32px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[66px] sm:leading-[1] lg:text-[70px] xl:text-[78px] [@media_(min-width:1024px)_and_(max-height:800px)]:text-[60px]">
              Build one library for every kind of media.
            </h1>
            <p className="max-w-[700px] text-[15px] leading-6 text-[#D4D4D8] sm:text-[20px] sm:leading-9">
              Add any media to one central place. Create entries, filter, rate,
              and export when you need to. No lock-in.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-10 px-4">
              <Link to="/register">
                <Library size={16} />
                Create a vault
              </Link>
            </Button>
            <Button asChild variant="surface" className="h-10 px-4">
              <Link to="/login">
                <Search size={16} />
                Open your vault
              </Link>
            </Button>
          </div>
        </motion.div>

        <VaultFlowVisual reduceMotion={reduceMotion} />
      </div>
    </section>
  );
}

function HeroChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className={chipClassName}>
      <Icon size={16} className="text-[#FACC16]" />
      {label}
    </span>
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
  }, [reduceMotion]);

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
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.58,
        delay: reduceMotion ? 0 : 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative mx-auto w-full min-w-0 max-w-[943px] lg:mx-0 lg:translate-y-8 lg:self-center lg:justify-self-end xl:translate-y-0 [@media_(min-width:1024px)_and_(max-height:800px)]:max-w-[650px] [@media_(min-width:1024px)_and_(max-height:800px)]:translate-y-0"
    >
      <div className="absolute inset-x-12 top-10 h-56 rounded-full bg-[#FACC16]/10 blur-3xl" />
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
            <Database size={16} className="text-[#FACC16]" />
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
            tabIndex={-1}
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
    </motion.div>
  );
}

function CommandScreen({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <section
      className="relative z-10 flex min-h-dvh items-center overflow-hidden border-[#3F3F46]/70 border-t bg-[#09090B]/35 px-4 py-10 sm:px-8 lg:h-dvh lg:py-0"
      data-landing-screen="commands"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.42, once: false }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid w-full max-w-[1488px] items-center gap-6 sm:gap-14 lg:grid-cols-[0.86fr_1.14fr]"
      >
        <div className="flex max-w-[560px] flex-col gap-3 sm:gap-5">
          <span className="text-sm font-semibold text-[#FACC16]">
            Query, then act
          </span>
          <h2 className="text-[34px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[58px]">
            One line for the usual library work.
          </h2>
          <p className="text-[15px] leading-7 text-[#D4D4D8] sm:text-[17px] sm:leading-8">
            Add something, always have it accessible, update the status, or
            clean it up from the same place. Short commands keep common actions
            close.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          {commandFlows.map((flow, index) => (
            <CommandFlowCard
              key={flow.command}
              flow={flow}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function CommandFlowCard({
  flow,
  index,
  reduceMotion,
}: {
  flow: (typeof commandFlows)[number];
  index: number;
  reduceMotion: boolean | null;
}) {
  const Icon = flow.icon;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.5, once: false }}
      transition={{
        duration: 0.45,
        delay: index * 0.08,
        ease: revealEase,
      }}
      className={`flex min-h-[168px] flex-col justify-between gap-5 p-4 sm:p-5 ${cardClassName}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`grid h-9 w-9 place-items-center ${iconTileClassName}`}
          >
            <Icon size={18} />
          </span>
          <code className="min-w-0 max-w-full truncate rounded-[6px] border border-[#3F3F46] bg-[#09090B] px-2 py-1 font-mono text-[12px] leading-5 text-[#D4D4D8]">
            {flow.command}
          </code>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-[18px] font-semibold leading-6 text-[#FAFAFA]">
            {flow.title}
          </h3>
          <p className="text-[14px] leading-6 text-[#A1A1AA]">{flow.body}</p>
        </div>
      </div>
    </motion.article>
  );
}

function ArchiveScreen({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <section
      className="relative z-10 flex min-h-dvh items-center overflow-hidden border-[#3F3F46]/70 border-t px-4 py-10 sm:px-8 lg:h-dvh lg:py-0"
      data-landing-screen="archive"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.42, once: false }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid w-full max-w-[1488px] items-center gap-5 sm:gap-14 lg:grid-cols-[1fr_0.78fr]"
      >
        <div className="order-2 grid gap-2 sm:grid-cols-2 sm:gap-4 lg:order-1">
          {archiveFeatures.map((feature, index) => (
            <ArchiveFeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>

        <div className="order-1 flex max-w-[520px] flex-col gap-2 sm:gap-6 lg:order-2 lg:ml-auto">
          <span className="text-sm font-semibold text-[#FACC16]">
            Your archive
          </span>
          <h2 className="text-[29px] font-semibold leading-[1.04] text-[#FAFAFA] sm:text-[58px]">
            Keep your notes separate from catalogue data.
          </h2>
          <p className="text-[14px] leading-6 text-[#D4D4D8] sm:text-[17px] sm:leading-8">
            Your ratings, collections, and progress stay yours. Posters, release
            dates, tags, and public scores can come from catalogue data without
            muddying the parts you curate yourself.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function ArchiveFeatureCard({
  feature,
  index,
  reduceMotion,
}: {
  feature: (typeof archiveFeatures)[number];
  index: number;
  reduceMotion: boolean | null;
}) {
  const Icon = feature.icon;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.45, once: false }}
      transition={{
        duration: 0.45,
        delay: index * 0.07,
        ease: revealEase,
      }}
      className={`flex min-h-[132px] gap-4 p-4 sm:min-h-[170px] sm:flex-col sm:justify-between sm:p-5 ${cardClassName}`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 ${iconTileClassName}`}
      >
        <Icon size={18} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-[17px] font-semibold leading-6 text-[#F4F4F5] sm:text-[21px] sm:leading-7">
          {feature.title}
        </h2>
        <p className="text-[14px] leading-6 text-[#A1A1AA]">{feature.body}</p>
      </div>
    </motion.article>
  );
}
