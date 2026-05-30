import { ChevronUp, Home } from "lucide-react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";
import type {
  SourceIntegrationSettings,
  SourceIntegrationType,
} from "@/features/source-integrations/contracts";
import {
  useSourceIntegrations,
  useUpdateSourceIntegration,
} from "@/features/source-integrations/hooks";
import { ApiError } from "@/shared/api/client";

const SOURCE_INTEGRATION_CARDS: Array<{
  type: SourceIntegrationType;
  name: string;
  description: string;
}> = [
  {
    type: "tmdb",
    name: "TMDB",
    description:
      "The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries.",
  },
  {
    type: "anilist",
    name: "AniList",
    description:
      "AniList enriches anime and manga entries with structured metadata.",
  },
  {
    type: "igdb",
    name: "IGDB",
    description:
      "IGDB keeps game metadata aligned with your game library entries.",
  },
  {
    type: "openlibrary",
    name: "OpenLibrary",
    description:
      "OpenLibrary enriches book entries with open catalog metadata.",
  },
];

export function IntegrationsPage() {
  const sourceIntegrations = useSourceIntegrations();
  const updateSourceIntegration = useUpdateSourceIntegration();
  const sourceSettings = sourceIntegrations.data ?? [];
  const activeCount = sourceSettings.filter((item) => item.is_active).length;

  function getSourceSettings(type: SourceIntegrationType) {
    return sourceSettings.find((item) => item.integration_type === type);
  }

  function getApiKey(settings: SourceIntegrationSettings | undefined) {
    return typeof settings?.config.apiKey === "string"
      ? settings.config.apiKey
      : "";
  }

  function saveSourceIntegration({
    type,
    apiKey,
    enabled,
  }: {
    type: SourceIntegrationType;
    apiKey: string;
    enabled: boolean;
  }) {
    updateSourceIntegration.mutate({
      type,
      body: {
        is_active: enabled,
        config: apiKey ? { apiKey } : {},
      },
    });
  }

  function getSaveError(type: SourceIntegrationType) {
    if (!updateSourceIntegration.isError) return null;
    if (updateSourceIntegration.variables?.type !== type) return null;

    const error = updateSourceIntegration.error;
    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return "Unable to save integration";
  }

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
        count={`${activeCount}/${SOURCE_INTEGRATION_CARDS.length} Integrations active`}
        error={
          sourceIntegrations.isError
            ? sourceIntegrations.error instanceof Error
              ? sourceIntegrations.error.message
              : "Unable to load source integrations"
            : null
        }
      >
        {SOURCE_INTEGRATION_CARDS.map((card) => {
          const settings = getSourceSettings(card.type);
          const isSaving =
            updateSourceIntegration.isPending &&
            updateSourceIntegration.variables?.type === card.type;

          return (
            <IntegrationCard
              key={card.type}
              name={card.name}
              description={card.description}
              queryFlag={`#enrich:add:${card.type}`}
              apiKey={getApiKey(settings)}
              enabled={settings?.is_active ?? false}
              isLoading={sourceIntegrations.isPending}
              isSaving={isSaving}
              errorMessage={getSaveError(card.type)}
              onToggle={({ apiKey, enabled }) =>
                saveSourceIntegration({ type: card.type, apiKey, enabled })
              }
              onSave={({ apiKey, enabled }) =>
                saveSourceIntegration({ type: card.type, apiKey, enabled })
              }
              onClear={() =>
                saveSourceIntegration({
                  type: card.type,
                  apiKey: "",
                  enabled: false,
                })
              }
            />
          );
        })}
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
          onSave={(settings) => console.log("save ai key", settings.apiKey)}
          onClear={() => console.log("clear ai")}
        />
      </IntegrationSection>
    </div>
  );
}

function IntegrationSection({
  title,
  count,
  error,
  children,
}: {
  title: string;
  count: string;
  error?: string | null;
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

      {error ? (
        <div className="rounded-[8px] border border-[#7F1D1D] bg-[#450A0A]/40 px-4 py-3 text-[14px] leading-5 text-[#FCA5A5]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
