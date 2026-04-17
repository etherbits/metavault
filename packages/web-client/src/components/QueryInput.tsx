import { Search } from "lucide-react";
import { useState } from "react";

interface QueryInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
}

export function QueryInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search tag:action,comedy",
}: QueryInputProps) {
  const [internal, setInternal] = useState("");
  const controlled = value !== undefined;
  const inputValue = controlled ? value : internal;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!controlled) setInternal(v);
    onChange?.(v);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onSearch?.(inputValue);
    }
  }

  return (
    <div className="relative w-full">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none"
      />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full
          bg-[#1a1a1a]
          border border-[#2a2a2a]
          rounded-lg
          pl-9 pr-4 py-2.5
          text-sm text-white
          placeholder:text-[#555]
          outline-none
          focus:border-[#3a3a3a]
          transition-colors
        "
      />
    </div>
  );
}
