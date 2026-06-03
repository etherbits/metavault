import { ChevronUp, Home } from "lucide-react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";
import type { AiIntegrationType } from "@/features/ai-integrations/contracts";
import {
  useAiIntegrations,
  useUpdateAiIntegration,
} from "@/features/ai-integrations/hooks";
import type { SourceIntegrationType } from "@/features/source-integrations/contracts";
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

// TODO: these should come from API
const AI_INTEGRATION_CARDS: Array<{
  type: AiIntegrationType;
  name: string;
  description: string;
}> = [
  {
    type: "openai_compatible",
    name: "OpenAI Compatible",
    description:
      "Configure an OpenAI-compatible chat endpoint for the floating assistant, including OpenAI and LM Studio servers.",
  },
];

const EMPTY_CONFIG: Record<string, unknown> = {};
const EMPTY_CONFIG_FIELDS: never[] = [];

export function IntegrationsPage() {
  const sourceIntegrations = useSourceIntegrations();
  const updateSourceIntegration = useUpdateSourceIntegration();
  const aiIntegrations = useAiIntegrations();
  const updateAiIntegration = useUpdateAiIntegration();
  const sourceSettings = sourceIntegrations.data ?? [];
  const aiSettings = aiIntegrations.data ?? [];
  const activeCount = sourceSettings.filter((item) => item.is_active).length;
  const activeAiCount = aiSettings.filter((item) => item.is_active).length;

  function getSourceSettings(type: SourceIntegrationType) {
    return sourceSettings.find((item) => item.integration_type === type);
  }

  function getAiSettings(type: AiIntegrationType) {
    return aiSettings.find((item) => item.integration_type === type);
  }

  function saveSourceIntegration({
    type,
    config,
    enabled,
  }: {
    type: SourceIntegrationType;
    config: Record<string, string>;
    enabled: boolean;
  }) {
    updateSourceIntegration.mutate({
      type,
      body: {
        is_active: enabled,
        config: removeEmptyConfigValues(config),
      },
    });
  }

  function saveAiIntegration({
    type,
    config,
    enabled,
  }: {
    type: AiIntegrationType;
    config: Record<string, string>;
    enabled: boolean;
  }) {
    const cleanedConfig = removeEmptyConfigValues(config);

    updateAiIntegration.mutate({
      type,
      body: enabled
        ? {
            is_active: true,
            config: {
              baseUrl: cleanedConfig.baseUrl,
              apiKey: cleanedConfig.apiKey,
              model: cleanedConfig.model,
            },
          }
        : { is_active: false },
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

  function getAiSaveError(type: AiIntegrationType) {
    if (!updateAiIntegration.isError) return null;
    if (updateAiIntegration.variables?.type !== type) return null;

    const error = updateAiIntegration.error;
    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return "Unable to save AI integration";
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
              config={settings?.config ?? EMPTY_CONFIG}
              configFields={settings?.config_fields ?? EMPTY_CONFIG_FIELDS}
              enabled={settings?.is_active ?? false}
              isLoading={sourceIntegrations.isPending}
              isSaving={isSaving}
              errorMessage={getSaveError(card.type)}
              onToggle={({ config, enabled }) =>
                saveSourceIntegration({ type: card.type, config, enabled })
              }
              onSave={({ config, enabled }) =>
                saveSourceIntegration({ type: card.type, config, enabled })
              }
              onClear={() =>
                saveSourceIntegration({
                  type: card.type,
                  config: {},
                  enabled: false,
                })
              }
            />
          );
        })}
      </IntegrationSection>

      <IntegrationSection
        title="AI Integrations"
        count={`${activeAiCount}/${AI_INTEGRATION_CARDS.length} Integrations active`}
        error={
          aiIntegrations.isError
            ? aiIntegrations.error instanceof Error
              ? aiIntegrations.error.message
              : "Unable to load AI integrations"
            : null
        }
      >
        {AI_INTEGRATION_CARDS.map((card) => {
          const settings = getAiSettings(card.type);
          const isSaving =
            updateAiIntegration.isPending &&
            updateAiIntegration.variables?.type === card.type;

          return (
            <IntegrationCard
              key={card.type}
              name={card.name}
              typeLabel="AI Integration"
              description={card.description}
              config={settings?.config ?? EMPTY_CONFIG}
              configFields={settings?.config_fields ?? EMPTY_CONFIG_FIELDS}
              enabled={settings?.is_active ?? false}
              isLoading={aiIntegrations.isPending}
              isSaving={isSaving}
              errorMessage={getAiSaveError(card.type)}
              onToggle={({ config, enabled }) =>
                saveAiIntegration({ type: card.type, config, enabled })
              }
              onSave={({ config, enabled }) =>
                saveAiIntegration({ type: card.type, config, enabled })
              }
              onClear={() =>
                saveAiIntegration({
                  type: card.type,
                  config: {},
                  enabled: false,
                })
              }
            />
          );
        })}
      </IntegrationSection>
    </div>
  );
}

function removeEmptyConfigValues(config: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value.trim().length > 0)
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
