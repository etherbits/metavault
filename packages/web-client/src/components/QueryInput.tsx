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
    <div className="relative w-full font-['Geist']">
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none"
      />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full
          bg-[#09090B]
          border border-[#27272A]
          rounded-xl
          pl-10 pr-4 py-3
          text-sm text-[#F4F4F5]
          placeholder:text-[#52525B]
          outline-none
          focus:border-[#FACC15]
          focus:ring-1 focus:ring-[#FACC15]/20
          transition-all
          shadow-inner
        "
      />
    </div>
  );
}
