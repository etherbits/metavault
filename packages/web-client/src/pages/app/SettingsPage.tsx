import { Save, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-[#A1A1AA]" />
          <h1 className="text-2xl font-semibold leading-none text-[#D4D4D8] sm:text-[30px]">
            Settings
          </h1>
        </div>

        <Button
          type="button"
          variant="brand-muted"
          className="h-9 min-h-[36px] px-3 text-sm"
        >
          <Save size={16} />
          Save
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-[548px] flex-col gap-12 lg:translate-x-[119px]">
        <section className="flex flex-col gap-8">
          <h3 className="text-[20px] font-semibold leading-6 text-[#E5E5E5]">
            Account Settings
          </h3>

          <Button
            type="button"
            variant="danger-surface"
            className="h-9 w-fit px-3 text-sm"
          >
            <Trash2 size={16} />
            Permanently delete account
          </Button>
        </section>
      </div>
    </div>
  );
}
