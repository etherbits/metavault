import {
  type LucideIcon,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { type Ref, useState } from "react";
import { Input } from "@/components/ui/input";

type QueryInputAction = "search" | "create" | "update" | "delete";

interface QueryInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  inputRef?: Ref<HTMLInputElement>;
  action?: QueryInputAction;
}

const iconByAction: Record<QueryInputAction, LucideIcon> = {
  search: Search,
  create: Plus,
  update: PencilLine,
  delete: Trash2,
};

export function QueryInput({
  value,
  onChange,
  onSearch,
  placeholder = "Query your library with EZQ",
  disabled = false,
  readOnly = false,
  tabIndex,
  inputRef,
  action = "search",
}: QueryInputProps) {
  const [internal, setInternal] = useState("");
  const controlled = value !== undefined;
  const inputValue = controlled ? value : internal;
  const Icon = iconByAction[action];

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
      <Icon
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
        readOnly={readOnly}
        tabIndex={tabIndex}
        className="pl-10"
      />
    </div>
  );
}
