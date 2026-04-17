import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface IntegrationCardProps {
  name: string;
  description: string;
  queryFlag: string;
  apiKey?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onSave?: (apiKey: string) => void;
  onClear?: () => void;
  prependLabel?: string;
  appendLabel?: string;
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

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    onToggle?.(next);
  }

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-white font-semibold text-sm">{name}</h3>
          <p className="text-[#666] text-xs leading-relaxed">{description}</p>
        </div>
        {/* Toggle */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-9 h-5 rounded-full relative shrink-0 transition-colors mt-0.5 ${
            enabled ? "bg-[#F5B800]" : "bg-[#333]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Query flag */}
      <div className="text-xs text-[#666]">
        Query flag to trigger:{" "}
        <code className="text-[#aaa] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-[11px]">
          {queryFlag}
        </code>
      </div>

      {/* API Key input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="api-key"
          className="text-xs font-medium text-[#666] uppercase tracking-wider"
        >
          API KEY
        </label>

        <input id="api-key" type="text" className="..." />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#444] outline-none focus:border-[#3a3a3a] transition-colors pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Prepend/Append labels */}
      <div className="flex items-center gap-2 text-xs text-[#555]">
        <span>Prepend</span>
        <span className="mx-1 text-[#333]">|</span>
        <span>Append</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave?.(apiKey)}
          className="bg-[#F5B800] hover:bg-[#e0a900] text-black text-xs font-semibold px-4 py-1.5 rounded-md transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClear}
          className="bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[#888] hover:text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
