import { useState } from "react";

interface NotePanelProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function NotePanel({
  initialValue = "",
  onChange,
  placeholder = "Notes...",
}: NotePanelProps) {
  const [value, setValue] = useState(initialValue);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    onChange?.(e.target.value);
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[#888] text-xs font-semibold uppercase tracking-wider">
        NOTE
      </h4>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={5}
        className="
          w-full
          bg-[#141414]
          border border-[#222]
          rounded-lg
          px-3 py-2.5
          text-sm text-white
          placeholder:text-[#444]
          resize-none
          outline-none
          focus:border-[#333]
          transition-colors
        "
      />
    </div>
  );
}
