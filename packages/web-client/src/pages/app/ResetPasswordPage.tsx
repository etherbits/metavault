import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router";
import { PasswordResetFlow } from "@/components/PasswordResetFlow";
import { useAuthSession } from "@/features/auth/hooks";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const profile = session.data;

  return (
    <div className="flex min-h-[calc(100dvh-72px)] w-full flex-col">
      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <KeyRound size={28} className="shrink-0 text-[#A1A1AA]" />
          <h1 className="truncate text-[30px] font-semibold leading-[30px] tracking-[-0.03em] text-[#D4D4D8]">
            Reset password
          </h1>
        </div>
      </header>

      <div className="flex flex-1 justify-center pt-12 sm:pt-20 xl:pt-[94px]">
        <div className="flex w-full max-w-[360px] flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold leading-6 text-[#E5E5E5]">
              Account password
            </h2>
            <p className="mt-3 text-sm leading-5 text-[#A3A3A3]">
              Reset your password in three quick steps.
            </p>
          </div>

          {profile?.email ? (
            <PasswordResetFlow
              initialEmail={profile.email}
              lockEmail
              cancelLabel="Back to settings"
              onCancel={() => navigate("/app/settings")}
            />
          ) : (
            <p className="text-sm leading-5 text-[#A3A3A3]">
              Loading your account email...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
