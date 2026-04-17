import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

interface IntegrationCardProps {
  name: string;
  description: string;
  queryFlag: string;
  apiKey?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onSave?: (apiKey: string) => void;
  onClear?: () => void;
}

export function IntegrationCard({
  name,
  description,
  queryFlag,
  apiKey: initialKey = "",
  enabled: initialEnabled = false,
  onToggle,
  onSave,
  onClear,
}: IntegrationCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [apiKey, setApiKey] = useState(initialKey);
  const [showKey, setShowKey] = useState(false);

  const inputId = useMemo(
    () => `${name.toLowerCase().replace(/\s+/g, "-")}-api-key`,
    [name]
  );

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    onToggle?.(next);
  }

  function handleSave() {
    onSave?.(apiKey);
  }

  function handleClear() {
    setApiKey("");
    setShowKey(false);
    onClear?.();
  }

  return (
    <div className="flex h-[372px] w-[420px] flex-col gap-6 rounded-[8px] bg-[#27272A] p-6 shadow-xl">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? "Disable" : "Enable"} ${name}`}
            onClick={handleToggle}
            className={`relative h-[18px] w-[33px] shrink-0 rounded-full shadow-sm transition-colors ${
              enabled ? "bg-[#FACC15]" : "bg-[#3F3F46]"
            }`}
          >
            <span
              className={`absolute top-[1px] h-4 w-4 rounded-full transition-all ${
                enabled ? "left-[16px] bg-[#09090B]" : "left-[1px] bg-white"
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
        <div className="flex flex-col gap-1">
          <label
            htmlFor={inputId}
            className="text-[14px] font-medium leading-5 text-[#FAFAFA]"
          >
            API Key
          </label>

          <div className="relative">
            <input
              id={inputId}
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="h-[39px] w-full rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 pr-10 text-[16px] leading-6 text-[#FAFAFA] shadow-sm outline-none placeholder:text-[#A1A1AA] focus:border-[#52525B]"
            />

            <button
              type="button"
              aria-label={showKey ? "Hide API key" : "Show API key"}
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] transition-colors hover:text-white"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-10 flex-1 items-center justify-center rounded-[8px] bg-[#FACC15] px-5 text-[14px] font-medium leading-5 text-[#09090B] transition-colors hover:bg-[#eab308]"
          >
            Save
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex h-10 flex-1 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 px-5 text-[14px] font-medium leading-5 text-[#FAFAFA] shadow-sm transition-colors hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
