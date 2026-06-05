import { ChevronUp, Eye, EyeOff, Home, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AiIntegrationProfile,
  AiIntegrationsResponse,
} from "@/features/ai-integrations/contracts";
import {
  useActivateAiIntegrationProfile,
  useCreateAiIntegrationProfile,
  useDeleteAiIntegrationProfile,
  useAiIntegrations,
  useUpdateAiIntegrationProfile,
} from "@/features/ai-integrations/hooks";
import type { SourceIntegrationType } from "@/features/source-integrations/contracts";
import {
  useSourceIntegrations,
  useUpdateSourceIntegration,
} from "@/features/source-integrations/hooks";
import { cn } from "@/lib/utils";
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

const EMPTY_CONFIG: Record<string, unknown> = {};
const EMPTY_CONFIG_FIELDS: never[] = [];

const DEFAULT_AI_PROFILE = {
  name: "OpenAI-compatible model",
  config: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "",
  },
};

export function IntegrationsPage() {
  const sourceIntegrations = useSourceIntegrations();
  const updateSourceIntegration = useUpdateSourceIntegration();
  const aiIntegrations = useAiIntegrations();
  const createAiIntegration = useCreateAiIntegrationProfile();
  const updateAiIntegration = useUpdateAiIntegrationProfile();
  const activateAiIntegration = useActivateAiIntegrationProfile();
  const deleteAiIntegration = useDeleteAiIntegrationProfile();
  const sourceSettings = sourceIntegrations.data ?? [];
  const aiSettings = aiIntegrations.data?.integrations ?? [];
  const aiConfigFields = aiIntegrations.data?.config_fields ?? [];
  const activeCount = sourceSettings.filter((item) => item.is_active).length;
  const activeAiCount = aiSettings.filter((item) => item.is_active).length;

  function getSourceSettings(type: SourceIntegrationType) {
    return sourceSettings.find((item) => item.integration_type === type);
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

  function getSaveError(type: SourceIntegrationType) {
    if (!updateSourceIntegration.isError) return null;
    if (updateSourceIntegration.variables?.type !== type) return null;

    const error = updateSourceIntegration.error;
    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return "Unable to save integration";
  }

  function getAiError() {
    const error =
      createAiIntegration.error ??
      updateAiIntegration.error ??
      activateAiIntegration.error ??
      deleteAiIntegration.error;

    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return null;
  }

  function createAiProfile() {
    createAiIntegration.mutate({
      name: DEFAULT_AI_PROFILE.name,
      integration_type: "openai_compatible",
      config: DEFAULT_AI_PROFILE.config,
    });
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
        count={`${activeAiCount}/${aiSettings.length} selected for assistant`}
        error={
          aiIntegrations.isError
            ? aiIntegrations.error instanceof Error
              ? aiIntegrations.error.message
              : "Unable to load AI integrations"
            : null
        }
      >
        <AiIntegrationsManager
          data={aiIntegrations.data}
          isLoading={aiIntegrations.isPending}
          isSaving={
            createAiIntegration.isPending ||
            updateAiIntegration.isPending ||
            activateAiIntegration.isPending ||
            deleteAiIntegration.isPending
          }
          errorMessage={getAiError()}
          onCreate={createAiProfile}
          onSave={(profile, form) =>
            updateAiIntegration.mutate({
              id: profile.id,
              body: {
                name: form.name,
                config: {
                  baseUrl: form.config.baseUrl,
                  apiKey: form.config.apiKey,
                  model: form.config.model,
                },
              },
            })
          }
          onSelect={(id) => activateAiIntegration.mutate(id)}
          onDelete={(id) => deleteAiIntegration.mutate(id)}
          configFields={aiConfigFields}
        />
      </IntegrationSection>
    </div>
  );
}

type AiProfileForm = {
  name: string;
  config: Record<string, string>;
};

function AiIntegrationsManager({
  data,
  configFields,
  isLoading,
  isSaving,
  errorMessage,
  onCreate,
  onSave,
  onSelect,
  onDelete,
}: {
  data?: AiIntegrationsResponse;
  configFields: AiIntegrationsResponse["config_fields"];
  isLoading: boolean;
  isSaving: boolean;
  errorMessage?: string | null;
  onCreate: () => void;
  onSave: (profile: AiIntegrationProfile, form: AiProfileForm) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const integrations = data?.integrations ?? [];
  const activeIntegration = integrations.find((item) => item.is_active);

  return (
    <div className="col-span-full flex w-full flex-col gap-6 rounded-[8px] border border-[#27272A] bg-[#18181B]/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-[720px] flex-col gap-2">
          <h3 className="text-[20px] font-semibold leading-6 text-[#E4E4E7]">
            Assistant model
          </h3>
          <p className="text-[15px] leading-6 text-[#A1A1AA]">
            Save local and OpenAI-compatible endpoints, then choose the one
            Metavault uses for assistant chat and future recommendations.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-[340px]">
          <Label htmlFor="active-ai-integration">Active model</Label>
          <select
            id="active-ai-integration"
            value={activeIntegration?.id ?? ""}
            onChange={(event) => {
              if (event.target.value) {
                onSelect(event.target.value);
              }
            }}
            disabled={isLoading || isSaving || integrations.length === 0}
            className="h-10 w-full rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-3 text-[14px] leading-5 text-[#FAFAFA] outline-none focus:border-[#52525B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              {integrations.length === 0 ? "No models saved" : "Select one"}
            </option>
            {integrations.map((integration) => (
              <option key={integration.id} value={integration.id}>
                {integration.name} ({integration.config.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="surface"
          onClick={onCreate}
          disabled={isLoading || isSaving}
          className="h-9 px-3 text-[14px]"
        >
          <Plus size={16} />
          Add OpenAI-compatible model
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-[8px] border border-[#7F1D1D] bg-[#450A0A]/40 px-4 py-3 text-[14px] leading-5 text-[#FCA5A5]">
          {errorMessage}
        </div>
      ) : null}

      {integrations.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-[#3F3F46] px-4 py-6 text-center text-[14px] leading-5 text-[#A1A1AA]">
          Add an OpenAI-compatible model to start switching assistant models.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {integrations.map((profile) => (
            <AiIntegrationProfileCard
              key={profile.id}
              profile={profile}
              configFields={configFields}
              isLoading={isLoading}
              isSaving={isSaving}
              onSave={onSave}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AiIntegrationProfileCard({
  profile,
  configFields,
  isLoading,
  isSaving,
  onSave,
  onSelect,
  onDelete,
}: {
  profile: AiIntegrationProfile;
  configFields: AiIntegrationsResponse["config_fields"];
  isLoading: boolean;
  isSaving: boolean;
  onSave: (profile: AiIntegrationProfile, form: AiProfileForm) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [config, setConfig] = useState<Record<string, string>>(() =>
    normalizeAiConfig(profile.config, configFields)
  );
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>(
    {}
  );
  const fieldIdPrefix = useMemo(() => `ai-profile-${profile.id}`, [profile.id]);

  useEffect(() => {
    setName(profile.name);
    setConfig(normalizeAiConfig(profile.config, configFields));
  }, [profile, configFields]);

  return (
    <div className="flex flex-col gap-5 rounded-[8px] bg-[#27272A] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              profile.is_active ? "bg-[#FACC15]" : "bg-[#71717A]"
            }`}
          />
          <p className="text-[13px] font-medium uppercase leading-5 tracking-[0.08em] text-[#A1A1AA]">
            {profile.is_active ? "Selected" : "Saved model"}
          </p>
        </div>

        {!profile.is_active ? (
          <Button
            type="button"
            variant="surface"
            onClick={() => onSelect(profile.id)}
            disabled={isLoading || isSaving}
            className="h-8 px-3 text-[13px]"
          >
            Use for assistant
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${fieldIdPrefix}-name`}>Model name</Label>
          <Input
            id={`${fieldIdPrefix}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLoading || isSaving}
            placeholder="Local, GPT mini, GPT strong..."
          />
        </div>

        {configFields.map((field) => {
          const inputId = `${fieldIdPrefix}-${field.key}`;
          const value = config[field.key] ?? "";
          const isSecretVisible = Boolean(visibleSecrets[field.key]);

          return (
            <div key={field.key} className="flex flex-col gap-1">
              <Label htmlFor={inputId}>{field.label}</Label>
              <div className="relative">
                <Input
                  id={inputId}
                  type={field.secret && !isSecretVisible ? "password" : "text"}
                  value={value}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  disabled={isLoading || isSaving}
                  placeholder={
                    field.placeholder ?? `Enter ${field.label.toLowerCase()}`
                  }
                  className={field.secret ? "pr-10" : undefined}
                />

                {field.secret ? (
                  <button
                    type="button"
                    aria-label={
                      isSecretVisible
                        ? `Hide ${field.label}`
                        : `Show ${field.label}`
                    }
                    onClick={() =>
                      setVisibleSecrets((previous) => ({
                        ...previous,
                        [field.key]: !previous[field.key],
                      }))
                    }
                    disabled={isLoading || isSaving}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSecretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="brand"
          onClick={() => onSave(profile, { name, config })}
          disabled={isLoading || isSaving}
          className="h-10 flex-1 rounded-[8px] px-5 text-[14px]"
        >
          Save
        </Button>
        <Button
          type="button"
          variant="surface"
          onClick={() => onDelete(profile.id)}
          disabled={isLoading || isSaving}
          className="h-10 flex-1 rounded-[8px] px-5 text-[14px]"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function normalizeAiConfig(
  config: Record<string, unknown>,
  fields: AiIntegrationsResponse["config_fields"]
) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = config[field.key];
      return [
        field.key,
        typeof value === "string" ? value : (field.defaultValue ?? ""),
      ];
    })
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
  const [collapsed, setCollapsed] = useState(false);

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
          onClick={() => setCollapsed((previous) => !previous)}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        >
          <ChevronUp
            size={16}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      {!collapsed && error ? (
        <div className="rounded-[8px] border border-[#7F1D1D] bg-[#450A0A]/40 px-4 py-3 text-[14px] leading-5 text-[#FCA5A5]">
          {error}
        </div>
      ) : null}

      {!collapsed ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
