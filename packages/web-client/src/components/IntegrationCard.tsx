import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SourceIntegrationSettings } from "@/features/source-integrations/contracts";

type ConfigField = SourceIntegrationSettings["config_fields"][number];

interface IntegrationCardProps {
  name: string;
  description: string;
  queryFlag: string;
  config?: Record<string, unknown>;
  configFields?: ConfigField[];
  enabled?: boolean;
  isSaving?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  onToggle?: (settings: {
    config: Record<string, string>;
    enabled: boolean;
  }) => void;
  onSave?: (settings: {
    config: Record<string, string>;
    enabled: boolean;
  }) => void;
  onClear?: () => void;
}

export function IntegrationCard({
  name,
  description,
  queryFlag,
  config: initialConfig = {},
  configFields = [],
  enabled: initialEnabled = false,
  isSaving = false,
  isLoading = false,
  errorMessage = null,
  onToggle,
  onSave,
  onClear,
}: IntegrationCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [config, setConfig] = useState<Record<string, string>>(() =>
    normalizeConfig(initialConfig)
  );
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>(
    {}
  );

  const fieldIdPrefix = useMemo(
    () => `${name.toLowerCase().replace(/\s+/g, "-")}-config`,
    [name]
  );

  useEffect(() => {
    setConfig(normalizeConfig(initialConfig));
  }, [initialConfig]);

  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    onToggle?.({ config, enabled: next });
  }

  function handleSave() {
    onSave?.({ config, enabled });
  }

  function handleClear() {
    setConfig({});
    setVisibleSecrets({});
    onClear?.();
  }

  function setConfigValue(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex min-h-[372px] w-full flex-col gap-6 rounded-[8px] bg-[#27272A] p-6 shadow-xl sm:max-w-[420px]">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? "Disable" : "Enable"} ${name}`}
            onClick={handleToggle}
            disabled={isLoading || isSaving}
            className={`relative inline-flex h-[18px] w-[33px] shrink-0 items-center rounded-[12px] border-0 p-0 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors focus-visible:outline-none ${
              enabled ? "bg-[#FACC15]" : "bg-[#3F3F46]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span
              className={`absolute left-[1px] top-[1px] h-4 w-4 rounded-full transition-transform ${
                enabled
                  ? "translate-x-[15px] bg-[#09090B]"
                  : "translate-x-0 bg-white"
              }`}
            />
          </button>

          <h3 className="text-[20px] font-semibold leading-6 text-[#E4E4E7]">
            {name} Source Integration
          </h3>
        </div>

        <p className="text-[16px] leading-6 text-[#D4D4D8]">
          {description} Query flag to trigger:{" "}
          <span className="text-[#FAFAFA]">{queryFlag}</span>
        </p>
      </div>

      <div className="flex flex-col justify-end gap-4">
        {configFields.map((field) => {
          const inputId = `${fieldIdPrefix}-${field.key}`;
          const value = config[field.key] ?? "";
          const isSecretVisible = Boolean(visibleSecrets[field.key]);

          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label
                htmlFor={inputId}
                className="text-[14px] font-medium leading-5 text-[#FAFAFA]"
              >
                {field.label}
              </label>

              <div className="relative">
                <input
                  id={inputId}
                  type={field.secret && !isSecretVisible ? "password" : "text"}
                  value={value}
                  onChange={(event) =>
                    setConfigValue(field.key, event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  placeholder={
                    field.placeholder ?? `Enter ${field.label.toLowerCase()}`
                  }
                  className="h-[39px] w-full rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 pr-10 text-[16px] leading-6 text-[#FAFAFA] shadow-sm outline-none placeholder:text-[#A1A1AA] focus:border-[#52525B] disabled:cursor-not-allowed disabled:opacity-60"
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
                      setVisibleSecrets((prev) => ({
                        ...prev,
                        [field.key]: !prev[field.key],
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

        {errorMessage ? (
          <p className="text-[13px] leading-5 text-[#FCA5A5]">{errorMessage}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="brand"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="h-10 flex-1 rounded-[8px] px-5 text-[14px] leading-5"
          >
            {isLoading ? "Loading" : isSaving ? "Saving" : "Save"}
          </Button>

          <Button
            type="button"
            variant="surface"
            onClick={handleClear}
            disabled={isLoading || isSaving}
            className="h-10 flex-1 rounded-[8px] px-5 text-[14px] leading-5"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

function normalizeConfig(config: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      typeof value === "string" ? value : "",
    ])
  );
}
