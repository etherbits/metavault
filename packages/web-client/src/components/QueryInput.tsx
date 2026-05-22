import { Search } from "lucide-react";
import { useState, type Ref } from "react";
import { Input } from "@/components/ui/input";

interface QueryInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

export function QueryInput({
  value,
  onChange,
  onSearch,
  placeholder = "Query your library with EZQ",
  disabled = false,
  inputRef,
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
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#A1A1AA]"
      />

      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10"
      />
    </div>
  );
}
