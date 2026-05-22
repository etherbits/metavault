import { ChevronUp, Home } from "lucide-react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";

export function IntegrationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
      <div className="flex items-center gap-3">
        <Home size={28} className="text-[#A1A1AA]" />
        <h1 className="text-2xl font-semibold leading-none text-[#D4D4D8] sm:text-[30px]">
          Home
        </h1>
      </div>

      <IntegrationSection
        title="Source Integrations"
        count="2/3 Integrations active"
      >
        <IntegrationCard
          name="TMDB"
          description="The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries."
          queryFlag="source_integration:enrich"
          enabled={false}
          onSave={(key) => console.log("save tmdb key", key)}
          onClear={() => console.log("clear tmdb")}
        />
        <IntegrationCard
          name="AniList"
          description="AniList enriches anime and manga entries with structured metadata."
          queryFlag="source_integration:enrich"
          enabled
          onSave={(key) => console.log("save anilist key", key)}
          onClear={() => console.log("clear anilist")}
        />
        <IntegrationCard
          name="IGDB"
          description="IGDB keeps game metadata aligned with your game library entries."
          queryFlag="source_integration:enrich"
          enabled
          onSave={(key) => console.log("save igdb key", key)}
          onClear={() => console.log("clear igdb")}
        />
      </IntegrationSection>

      <IntegrationSection
        title="AI Integrations"
        count="1/1 Integrations active"
      >
        <IntegrationCard
          name="AI Floating Chat"
          description="Use the assistant overlay to summarize result sets and help write structured queries."
          queryFlag="source_integration:enrich"
          enabled
          onSave={(key) => console.log("save ai key", key)}
          onClear={() => console.log("clear ai")}
        />
      </IntegrationSection>
    </div>
  );
}

function IntegrationSection({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-medium leading-[29px] text-[#D4D4D8]">
            {title}
          </h2>
          <span className="text-[16px] leading-6 text-[#A1A1AA]">{count}</span>
        </div>

        <Button
          type="button"
          variant="surface"
          size="icon-lg"
          aria-label={`Collapse ${title}`}
        >
          <ChevronUp size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
