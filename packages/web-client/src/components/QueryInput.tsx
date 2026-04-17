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
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
      />

      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-[36px] w-full rounded-[8px] border border-[#52525B] bg-[#27272A] pl-10 pr-3 text-[14px] leading-5 text-[#A1A1AA] outline-none shadow-[0px_1px_2px_rgba(0,0,0,0.05)] placeholder:text-[#A1A1AA] focus:border-[#52525B]"
      />
    </div>
  );
}
